"""Webhook endpoints for Stripe and other integrations"""
from fastapi import APIRouter, Request, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import stripe
import time

from models.database import get_db
from models.customer import Customer, CustomerStatus
from models.subscription import Subscription
from services.stripe_service import StripeService
from services.hetzner import HetznerService
from services.email import EmailService

router = APIRouter()

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Stripe webhook events
    
    Events handled:
    - checkout.session.completed: New subscription
    - customer.subscription.updated: Status changes
    - customer.subscription.deleted: Cancellation
    - invoice.payment_failed: Payment issues
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = StripeService.construct_webhook_event(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event["type"]
    data = event["data"]["object"]
    
    print(f"📩 Stripe webhook: {event_type}")
    
    # Handle events
    if event_type == "checkout.session.completed":
        await handle_checkout_completed(data, db, background_tasks)
    
    elif event_type == "customer.subscription.updated":
        await handle_subscription_updated(data, db)
    
    elif event_type == "customer.subscription.deleted":
        await handle_subscription_deleted(data, db, background_tasks)
    
    elif event_type == "invoice.payment_failed":
        await handle_payment_failed(data, db)
    
    elif event_type == "invoice.payment_succeeded":
        await handle_payment_succeeded(data, db)
    
    return {"status": "ok"}

async def handle_checkout_completed(
    data: dict,
    db: AsyncSession,
    background_tasks: BackgroundTasks
):
    """Handle successful checkout - provision VM with tier detection"""
    customer_id = data.get("customer")
    subscription_id = data.get("subscription")
    customer_email = data.get("customer_email")
    
    # Get tier from metadata
    tier = data.get("metadata", {}).get("tier", "legacy")
    
    print(f"✅ Checkout completed for {customer_email}")
    
    # Find customer by Stripe ID or email
    result = await db.execute(
        select(Customer).where(
            (Customer.stripe_customer_id == customer_id) | 
            (Customer.email == customer_email)
        )
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        print(f"⚠️ Customer not found: {customer_email}")
        return
    
    # Update customer
    customer.stripe_customer_id = customer_id
    customer.stripe_subscription_id = subscription_id
    customer.status = CustomerStatus.TRIAL
    if tier:
        customer.plan_tier = tier
    
    await db.commit()
    
    # Track subscription in subscriptions table
    if subscription_id:
        try:
            existing = await db.execute(
                select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
            )
            sub = existing.scalar_one_or_none()
            if not sub:
                sub = Subscription(
                    stripe_subscription_id=subscription_id,
                    stripe_customer_id=customer_id,
                    customer_id=customer.id,
                    status="active",
                )
                db.add(sub)
            else:
                sub.status = "active"
                sub.customer_id = customer.id
            await db.commit()
            print(f"📊 Subscription {subscription_id} tracked in DB")
        except Exception as e:
            print(f"⚠️ Subscription tracking failed: {e}")
    
    # Provision VM in background
    # Disabled - VM provisioning happens in onboarding
    # background_tasks.add_task(provision_customer_vm, customer.id)
    
    print(f"🚀 Starting VM provisioning for customer {customer.id}")

async def handle_subscription_updated(data: dict, db: AsyncSession):
    """Handle subscription status changes"""
    subscription_id = data.get("id")
    status = data.get("status")
    
    print(f"📝 Subscription {subscription_id} updated to {status}")
    
    result = await db.execute(
        select(Customer).where(Customer.stripe_subscription_id == subscription_id)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        return
    
    # Map Stripe status to our status
    status_map = {
        "active": CustomerStatus.ACTIVE,
        "trialing": CustomerStatus.TRIAL,
        "past_due": CustomerStatus.ACTIVE,  # Keep active but flag
        "canceled": CustomerStatus.CANCELLED,
        "unpaid": CustomerStatus.SUSPENDED,
    }
    
    customer.status = status_map.get(status, customer.status)
    await db.commit()
    
    # Track in subscriptions table
    try:
        existing = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        sub = existing.scalar_one_or_none()
        if sub:
            sub.status = status
            sub.updated_at = datetime.utcnow()
            if data.get("current_period_start"):
                sub.current_period_start = datetime.fromtimestamp(data["current_period_start"])
            if data.get("current_period_end"):
                sub.current_period_end = datetime.fromtimestamp(data["current_period_end"])
            sub.cancel_at_period_end = str(data.get("cancel_at_period_end", False))
            await db.commit()
            print(f"📊 Subscription {subscription_id} updated to {status}")
    except Exception as e:
        print(f"⚠️ Subscription tracking failed: {e}")

async def handle_subscription_deleted(
    data: dict,
    db: AsyncSession,
    background_tasks: BackgroundTasks
):
    """Handle subscription cancellation - release bot and delete VM"""
    from services.bot_pool import BotPoolService

    subscription_id = data.get("id")

    print(f"❌ Subscription {subscription_id} deleted")

    # Track cancellation in subscriptions table
    try:
        sub_result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == subscription_id)
        )
        sub = sub_result.scalar_one_or_none()
        if sub:
            sub.status = "canceled"
            sub.canceled_at = datetime.utcnow()
            sub.updated_at = datetime.utcnow()
            await db.commit()
            print(f"📊 Subscription {subscription_id} marked canceled")
    except Exception as e:
        print(f"⚠️ Subscription cancel tracking failed: {e}")

    result = await db.execute(
        select(Customer).where(Customer.stripe_subscription_id == subscription_id)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        return

    # CRITICAL: Release bot back to pool with cleanup
    bot_service = BotPoolService(db)
    bot = await bot_service.get_customer_bot(customer.id)
    if bot:
        print(f"🔄 Releasing bot @{bot.bot_username} back to pool")
        await bot_service.release_bot_with_cleanup(bot.id)

    # Clear customer's telegram bot reference
    customer.telegram_bot_username = None
    customer.status = CustomerStatus.CANCELLED
    await db.commit()

    # Send cancellation email
    email_service = EmailService()
    await email_service.send_subscription_cancelled_email(
        to_email=customer.email,
        bot_username="YourButlr"  # Generic since bot is now released
    )

    # Delete VM in background
    if customer.vm_id:
        background_tasks.add_task(delete_customer_vm, customer.id, customer.vm_id)

async def handle_payment_failed(data: dict, db: AsyncSession):
    """Handle failed payment"""
    customer_id = data.get("customer")
    
    print(f"💳 Payment failed for customer {customer_id}")
    
    result = await db.execute(
        select(Customer).where(Customer.stripe_customer_id == customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if customer:
        # Send payment failed email
        email_service = EmailService()
        await email_service.send_payment_failed_email(
            to_email=customer.email,
            bot_username=customer.telegram_bot_username or "YourButlr"
        )

async def handle_payment_succeeded(data: dict, db: AsyncSession):
    """Handle successful payment"""
    customer_id = data.get("customer")
    
    print(f"💰 Payment succeeded for customer {customer_id}")
    
    result = await db.execute(
        select(Customer).where(Customer.stripe_customer_id == customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if customer and customer.status == CustomerStatus.TRIAL:
        customer.status = CustomerStatus.ACTIVE
        await db.commit()

# Background tasks
async def provision_customer_vm(customer_id: int):
    """Background task to provision a VM for a new customer"""
    from models.database import async_session
    
    async with async_session() as db:
        result = await db.execute(
            select(Customer).where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()
        
        if not customer:
            return
        
        try:
            hetzner = HetznerService()
            vm_name = f"butlr-{customer.id}-{int(time.time())}"
            
            print(f"🔧 Provisioning VM {vm_name}...")
            
            hetzner_vm = await hetzner.create_vm(
                name=vm_name,
                server_type="cx23",
                location="nbg1",
            )
            
            customer.vm_id = str(hetzner_vm["id"])
            customer.vm_ip = hetzner_vm.get("ip_address")
            customer.vm_status = "running"
            
            await db.commit()
            
            print(f"✅ VM provisioned: {customer.vm_ip}")
            
            # TODO: Setup Clawdbot on VM
            # TODO: Create Telegram bot
            # TODO: Send welcome email
            
        except Exception as e:
            print(f"❌ VM provisioning failed: {e}")
            customer.vm_status = "error"
            await db.commit()
            
            # Send error email
            email_service = EmailService()
            await email_service.send_vm_error_email(
                to_email=customer.email,
                error_message=str(e)
            )

async def delete_customer_vm(customer_id: int, vm_id: str):
    """Background task to delete a customer's VM"""
    from models.database import async_session
    
    async with async_session() as db:
        try:
            hetzner = HetznerService()
            success = await hetzner.delete_vm(int(vm_id))
            
            if success:
                result = await db.execute(
                    select(Customer).where(Customer.id == customer_id)
                )
                customer = result.scalar_one_or_none()
                if customer:
                    customer.vm_id = None
                    customer.vm_ip = None
                    customer.vm_status = "none"
                    await db.commit()
                
                print(f"✅ VM {vm_id} deleted for customer {customer_id}")
        except Exception as e:
            print(f"❌ VM deletion failed: {e}")
