"""Checkout API endpoint for creating Stripe sessions with tier selection"""
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from models.database import get_db
from models.customer import Customer, CustomerStatus

router = APIRouter()

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class CheckoutRequest(BaseModel):
    email: str
    tier: str  # 'byok' only
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CheckoutRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a Stripe checkout session for selected tier"""
    
    # Validate tier
    if request.tier != 'byok':
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    # Map tier to price ID
    price_mapping = {
        'byok': os.getenv("STRIPE_PRICE_ID_BYOK"),
        'unlimited': os.getenv("STRIPE_PRICE_ID_UNLIMITED")
    }
    
    price_id = price_mapping.get(request.tier)
    if not price_id:
        raise HTTPException(status_code=500, detail="Price ID not configured")
    
    # Check if customer already exists
    result = await db.execute(
        select(Customer).where(Customer.email == request.email)
    )
    existing_customer = result.scalar_one_or_none()
    
    if existing_customer and existing_customer.status == CustomerStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Customer already has an active subscription")
    
    # Create or update customer
    if existing_customer:
        customer = existing_customer
        customer.plan_tier = request.tier
    else:
        customer = Customer(
            email=request.email,
            status=CustomerStatus.PENDING,
            plan_tier=request.tier
        )
        db.add(customer)
    
    await db.commit()
    await db.refresh(customer)
    
    # Create Stripe checkout session
    try:
        # Set URLs
        base_url = os.getenv("FRONTEND_URL", "https://portal.butlr.cloud")
        success_url = request.success_url or f"{base_url}/setup?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = request.cancel_url or f"{base_url}/pricing"
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=request.email,
            metadata={
                'customer_id': str(customer.id),
                'tier': request.tier
            },
            subscription_data={
                'trial_period_days': None,  # No trials - BYOK only
                'metadata': {
                    'tier': request.tier
                }
            }
        )
        
        # Store session ID for verification
        customer.stripe_customer_id = session.customer
        await db.commit()
        
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id
        )
        
    except stripe.error.StripeError as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create checkout session")