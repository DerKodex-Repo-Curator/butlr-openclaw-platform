"""Updated webhook handling for new pricing tiers"""
import os

# This section would be added to handle_checkout_completed function
async def handle_checkout_completed_with_tiers(
    data: dict,
    db: AsyncSession,
    background_tasks: BackgroundTasks
):
    """Handle successful checkout - provision VM with tier detection"""
    customer_id = data.get("customer")
    subscription_id = data.get("subscription")
    customer_email = data.get("customer_email")
    
    # Get the price ID from line items
    price_id = None
    if "line_items" in data:
        # For checkout.session.completed, we need to fetch the session with line_items
        import stripe
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        session = stripe.checkout.Session.retrieve(
            data["id"],
            expand=['line_items']
        )
        if session.line_items and session.line_items.data:
            price_id = session.line_items.data[0].price.id
    
    print(f"✅ Checkout completed for {customer_email} with price {price_id}")
    
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
    
    # Determine plan tier based on price ID
    price_to_tier = {
        os.getenv("STRIPE_PRICE_ID_BYOK"): "byok",
        os.getenv("STRIPE_PRICE_ID_UNLIMITED"): "unlimited",
        os.getenv("STRIPE_PRICE_ID_LEGACY", os.getenv("STRIPE_PRICE_ID")): "legacy"
    }
    
    plan_tier = price_to_tier.get(price_id, "legacy")
    
    # Update customer
    customer.stripe_customer_id = customer_id
    customer.stripe_subscription_id = subscription_id
    customer.status = CustomerStatus.TRIAL
    customer.plan_tier = plan_tier
    
    await db.commit()
    
    # Send different welcome emails based on tier
    from services.email import EmailService
    email_service = EmailService()
    
    if plan_tier == "byok":
        await email_service.send_byok_welcome(customer.email, customer.name)
    elif plan_tier == "unlimited":
        await email_service.send_unlimited_welcome(customer.email, customer.name)
    
    print(f"🚀 Customer {customer.id} subscribed to {plan_tier} tier")

# Add this to webhooks.py imports:
# from models.pricing import PricingTier

# Replace the existing handle_checkout_completed with handle_checkout_completed_with_tiers