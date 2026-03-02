"""Bot Pool API endpoints"""
import os
from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from models.database import get_db
from services.bot_pool import BotPoolService

router = APIRouter()

# Admin API key authentication
API_KEY_HEADER = APIKeyHeader(name="X-Admin-API-Key", auto_error=False)


async def verify_admin_key(api_key: str = Security(API_KEY_HEADER)):
    """Verify admin API key for sensitive bot pool operations"""
    expected = os.getenv("ADMIN_API_KEY")
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_API_KEY not configured")
    if not api_key or api_key != expected:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    return api_key


class AddBotRequest(BaseModel):
    bot_token: str


class AssignBotRequest(BaseModel):
    customer_id: int
    custom_name: Optional[str] = None


class BotResponse(BaseModel):
    id: int
    bot_username: str
    bot_name: str
    is_assigned: bool
    customer_id: Optional[int]
    custom_name: Optional[str]

    class Config:
        from_attributes = True


class PoolStatsResponse(BaseModel):
    total: int
    assigned: int
    available: int


# Endpoints
@router.get("/stats", response_model=PoolStatsResponse)
async def get_pool_stats(db: AsyncSession = Depends(get_db)):
    """Get bot pool statistics"""
    service = BotPoolService(db)
    stats = await service.get_pool_stats()
    return stats


@router.post("/add", response_model=BotResponse, dependencies=[Depends(verify_admin_key)])
async def add_bot_to_pool(request: AddBotRequest, db: AsyncSession = Depends(get_db)):
    """Add a new bot to the pool (validates with Telegram API). Requires admin API key."""
    service = BotPoolService(db)
    bot = await service.validate_and_add_bot(request.bot_token)

    if not bot:
        raise HTTPException(status_code=400, detail="Invalid bot token")

    return bot


@router.post("/assign", response_model=BotResponse, dependencies=[Depends(verify_admin_key)])
async def assign_bot(request: AssignBotRequest, db: AsyncSession = Depends(get_db)):
    """Assign an available bot to a customer. Requires admin API key."""
    service = BotPoolService(db)
    bot = await service.assign_bot_to_customer(
        request.customer_id,
        request.custom_name
    )

    if not bot:
        raise HTTPException(status_code=404, detail="No bots available in pool")

    return bot


@router.post("/release/{bot_id}", dependencies=[Depends(verify_admin_key)])
async def release_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    """Release a bot back to the pool. Requires admin API key."""
    service = BotPoolService(db)
    success = await service.release_bot(bot_id)

    if not success:
        raise HTTPException(status_code=404, detail="Bot not found")

    return {"success": True, "message": "Bot released back to pool"}


@router.get("/customer/{customer_id}", response_model=BotResponse)
async def get_customer_bot(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get the bot assigned to a customer"""
    service = BotPoolService(db)
    bot = await service.get_customer_bot(customer_id)
    
    if not bot:
        raise HTTPException(status_code=404, detail="No bot assigned to this customer")
    
    return bot


@router.post("/bulk-add", dependencies=[Depends(verify_admin_key)])
async def bulk_add_bots(tokens: List[str], db: AsyncSession = Depends(get_db)):
    """Add multiple bots to the pool. Requires admin API key."""
    service = BotPoolService(db)
    results = {"added": [], "failed": []}

    for token in tokens:
        bot = await service.validate_and_add_bot(token)
        if bot:
            results["added"].append(bot.bot_username)
        else:
            results["failed"].append(token[:20] + "...")

    return results
