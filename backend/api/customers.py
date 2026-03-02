"""Customer API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta

from models.database import get_db
from models.customer import Customer, CustomerStatus
from services.stripe_service import StripeService

router = APIRouter()

# Pydantic schemas
class CustomerCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class CustomerResponse(BaseModel):
    stripe_customer_id: Optional[str] = None
    id: int
    email: str
    name: Optional[str]
    status: str
    telegram_bot_username: Optional[str]
    vm_ip: Optional[str]
    vm_status: str
    created_at: datetime
    trial_ends_at: Optional[datetime]

    class Config:
        from_attributes = True

class CheckoutRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    success_url: str = "https://butlr.cloud/success"
    cancel_url: str = "https://butlr.cloud/pricing"

class CheckoutResponse(BaseModel):
    checkout_url: str
    customer_id: int

# Endpoints
@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List all customers (admin only)"""
    result = await db.execute(
        select(Customer).offset(skip).limit(limit)
    )
    customers = result.scalars().all()
    return customers

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific customer"""
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@router.post("/", response_model=CustomerResponse)
async def create_customer(
    data: CustomerCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new customer"""
    # Check if exists
    result = await db.execute(
        select(Customer).where(Customer.email == data.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Customer with this email already exists"
        )
    
    # Create Stripe customer
    stripe_customer = await StripeService.create_customer(data.email, data.name)
    
    # Create customer
    customer = Customer(
        email=data.email,
        name=data.name,
        status=CustomerStatus.PENDING,
        stripe_customer_id=stripe_customer["id"],
        trial_ends_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    
    return customer

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe checkout session for a new or existing customer"""
    # Check if customer exists
    result = await db.execute(
        select(Customer).where(Customer.email == data.email)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        # Create new customer
        stripe_customer = await StripeService.create_customer(data.email, data.name)
        customer = Customer(
            email=data.email,
            name=data.name,
            status=CustomerStatus.PENDING,
            stripe_customer_id=stripe_customer["id"],
            trial_ends_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)
    
    # Create checkout session
    checkout = await StripeService.create_checkout_session(
        customer_email=data.email,
        customer_id=customer.stripe_customer_id,
        success_url=data.success_url,
        cancel_url=data.cancel_url,
        trial_days=7
    )
    
    return CheckoutResponse(
        checkout_url=checkout["url"],
        customer_id=customer.id
    )

@router.get("/{customer_id}/billing-portal")
async def get_billing_portal(
    customer_id: int,
    return_url: str = "https://butlr.cloud/dashboard",
    db: AsyncSession = Depends(get_db)
):
    """Get a billing portal URL for customer self-service"""
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if not customer.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Customer has no Stripe account")
    
    portal = await StripeService.create_billing_portal_session(
        customer.stripe_customer_id,
        return_url
    )
    
    return {"url": portal["url"]}

@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a customer (admin only)"""
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Cancel subscription if active
    if customer.stripe_subscription_id:
        await StripeService.cancel_subscription(
            customer.stripe_subscription_id,
            at_period_end=False
        )
    
    # TODO: Delete VM if exists
    
    await db.delete(customer)
    await db.commit()
    
    return {"status": "deleted"}
