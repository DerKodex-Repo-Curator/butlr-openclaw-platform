"""Pricing and plan management API endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date

from models.database import get_db
from models.customer import Customer
from models.pricing import PricingTier, UserApiKey, UsageTracking
from api.dashboard import get_current_customer
from utils.encryption import encrypt_api_key, decrypt_api_key
from pydantic import BaseModel

router = APIRouter()

# Pydantic Models
class ApiKeyCreate(BaseModel):
    provider: str  # openai, anthropic, google
    api_key: str

class ApiKeyResponse(BaseModel):
    id: int
    provider: str
    is_active: bool
    created_at: str

class UsageResponse(BaseModel):
    date: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    requests: int
    provider: Optional[str] = None

class PricingTierResponse(BaseModel):
    tier_name: str
    price_cents: int
    features: dict

@router.get("/tiers", response_model=List[PricingTierResponse])
async def get_pricing_tiers(db: AsyncSession = Depends(get_db)):
    """Get all active pricing tiers"""
    result = await db.execute(
        select(PricingTier).where(PricingTier.is_active == True)
    )
    tiers = result.scalars().all()
    return [
        PricingTierResponse(
            tier_name=tier.tier_name,
            price_cents=tier.price_cents,
            features=tier.features or {}
        )
        for tier in tiers
        if tier.tier_name != "legacy"  # Hide legacy tier from public
    ]

@router.post("/api-keys", response_model=ApiKeyResponse)
async def add_api_key(
    key_data: ApiKeyCreate,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Add an API key for BYOK customers"""
    # Check if customer is on BYOK plan
    if current_customer.plan_tier != "byok":
        raise HTTPException(status_code=403, detail="API keys only available for BYOK plan")
    
    # Validate provider
    if key_data.provider not in ["openai", "anthropic", "google"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    # TODO: Validate API key with provider
    # For now, just encrypt and store
    
    encrypted_key = encrypt_api_key(key_data.api_key)
    
    # Check if key exists for this provider
    existing = await db.execute(
        select(UserApiKey).where(
            UserApiKey.customer_id == current_customer.id,
            UserApiKey.provider == key_data.provider
        )
    )
    existing_key = existing.scalar_one_or_none()
    
    if existing_key:
        # Update existing
        existing_key.encrypted_api_key = encrypted_key
        existing_key.is_active = True
        await db.commit()
        return ApiKeyResponse(
            id=existing_key.id,
            provider=existing_key.provider,
            is_active=existing_key.is_active,
            created_at=existing_key.created_at.isoformat()
        )
    else:
        # Create new
        new_key = UserApiKey(
            customer_id=current_customer.id,
            provider=key_data.provider,
            encrypted_api_key=encrypted_key
        )
        db.add(new_key)
        await db.commit()
        await db.refresh(new_key)
        
        return ApiKeyResponse(
            id=new_key.id,
            provider=new_key.provider,
            is_active=new_key.is_active,
            created_at=new_key.created_at.isoformat()
        )

@router.get("/api-keys", response_model=List[ApiKeyResponse])
async def list_api_keys(
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """List all API keys for the current customer"""
    result = await db.execute(
        select(UserApiKey).where(UserApiKey.customer_id == current_customer.id)
    )
    keys = result.scalars().all()
    
    return [
        ApiKeyResponse(
            id=key.id,
            provider=key.provider,
            is_active=key.is_active,
            created_at=key.created_at.isoformat()
        )
        for key in keys
    ]

@router.delete("/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Delete an API key"""
    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.id == key_id,
            UserApiKey.customer_id == current_customer.id
        )
    )
    key = result.scalar_one_or_none()
    
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    await db.delete(key)
    await db.commit()
    
    return {"success": True}

@router.get("/usage", response_model=List[UsageResponse])
async def get_usage(
    days: int = 7,
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get usage statistics for the current customer"""
    # Get usage for last N days
    from datetime import datetime, timedelta
    
    start_date = date.today() - timedelta(days=days-1)
    
    result = await db.execute(
        select(UsageTracking).where(
            UsageTracking.customer_id == current_customer.id,
            UsageTracking.date >= start_date
        ).order_by(UsageTracking.date.desc())
    )
    usage_records = result.scalars().all()
    
    return [
        UsageResponse(
            date=record.date.isoformat(),
            input_tokens=record.input_tokens,
            output_tokens=record.output_tokens,
            total_tokens=record.total_tokens,
            requests=record.requests,
            provider=record.provider
        )
        for record in usage_records
    ]

@router.get("/usage/today")
async def get_today_usage(
    current_customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get today's usage for rate limiting"""
    today = date.today()
    
    result = await db.execute(
        select(UsageTracking).where(
            UsageTracking.customer_id == current_customer.id,
            UsageTracking.date == today
        )
    )
    usage_records = result.scalars().all()
    
    total_tokens = sum(record.total_tokens for record in usage_records)
    total_requests = sum(record.requests for record in usage_records)
    
    # Get limit based on plan
    daily_limit = None
    if current_customer.plan_tier == "unlimited":
        daily_limit = 150000
    
    return {
        "date": today.isoformat(),
        "total_tokens": total_tokens,
        "total_requests": total_requests,
        "daily_limit": daily_limit,
        "percentage_used": (total_tokens / daily_limit * 100) if daily_limit else None
    }