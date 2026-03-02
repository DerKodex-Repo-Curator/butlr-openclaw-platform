"""Stripe Billing Service"""
import stripe
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    """Service for Stripe billing operations"""
    
    # Product/Price IDs (set in Stripe Dashboard)
    PRICE_ID = os.getenv("STRIPE_PRICE_ID", "price_xxxxx")  # €49/month
    
    @staticmethod
    async def create_customer(email: str, name: Optional[str] = None) -> Dict[str, Any]:
        """Create a Stripe customer"""
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={"source": "butlr"}
        )
        return {
            "id": customer.id,
            "email": customer.email,
        }
    
    @staticmethod
    async def create_checkout_session(
        customer_email: str,
        success_url: str,
        cancel_url: str,
        customer_id: Optional[str] = None,
        trial_days: int = 7,
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription
        
        Returns:
            Dict with checkout URL
        """
        params = {
            "mode": "subscription",
            "payment_method_types": ["card"],
            "line_items": [{
                "price": StripeService.PRICE_ID,
                "quantity": 1,
            }],
            "success_url": success_url,
            "cancel_url": cancel_url,
            "subscription_data": {
                "trial_period_days": trial_days,
            },
            "metadata": {"source": "butlr"},
        }
        
        if customer_id:
            params["customer"] = customer_id
        else:
            params["customer_email"] = customer_email
        
        session = stripe.checkout.Session.create(**params)
        
        return {
            "id": session.id,
            "url": session.url,
        }
    
    @staticmethod
    async def get_subscription(subscription_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription details"""
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": sub.id,
                "status": sub.status,
                "customer": sub.customer,
                "current_period_start": datetime.fromtimestamp(sub.current_period_start),
                "current_period_end": datetime.fromtimestamp(sub.current_period_end),
                "cancel_at_period_end": sub.cancel_at_period_end,
                "trial_end": datetime.fromtimestamp(sub.trial_end) if sub.trial_end else None,
            }
        except stripe.error.StripeError:
            return None
    
    @staticmethod
    async def cancel_subscription(subscription_id: str, at_period_end: bool = True) -> bool:
        """Cancel a subscription"""
        try:
            if at_period_end:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                stripe.Subscription.delete(subscription_id)
            return True
        except stripe.error.StripeError:
            return False
    
    @staticmethod
    async def create_billing_portal_session(
        customer_id: str,
        return_url: str
    ) -> Dict[str, Any]:
        """Create a billing portal session for customer self-service"""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {
            "url": session.url,
        }
    
    @staticmethod
    def construct_webhook_event(payload: bytes, sig_header: str) -> stripe.Event:
        """Construct and verify webhook event"""
        webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        return stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    
    @staticmethod
    async def get_customer(customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer details"""
        try:
            customer = stripe.Customer.retrieve(customer_id)
            return {
                "id": customer.id,
                "email": customer.email,
                "name": customer.name,
            }
        except stripe.error.StripeError:
            return None

    @staticmethod
    async def get_subscription_details(subscription_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed subscription info including payment method"""
        try:
            sub = stripe.Subscription.retrieve(
                subscription_id,
                expand=["default_payment_method", "items.data.price.product"]
            )

            # Get items from subscription - use dict access for compatibility
            items_data = sub.get("items", {}).get("data", []) if isinstance(sub, dict) else getattr(sub, "items", {}).get("data", [])

            # Get plan name from product
            plan_name = "pro"
            amount = 4900  # Default amount in cents
            if items_data:
                first_item = items_data[0]
                price = first_item.get("price", {}) if isinstance(first_item, dict) else getattr(first_item, "price", None)
                if price:
                    amount = price.get("unit_amount", 4900) if isinstance(price, dict) else getattr(price, "unit_amount", 4900)
                    product = price.get("product", {}) if isinstance(price, dict) else getattr(price, "product", None)
                    if product:
                        product_name = product.get("name", "pro") if isinstance(product, dict) else getattr(product, "name", "pro")
                        if product_name:
                            plan_name = product_name.lower()

            # Get payment method details
            payment_method = None
            default_pm = sub.get("default_payment_method") if isinstance(sub, dict) else getattr(sub, "default_payment_method", None)
            if default_pm:
                card = default_pm.get("card") if isinstance(default_pm, dict) else getattr(default_pm, "card", None)
                if card:
                    payment_method = {
                        "type": "card",
                        "brand": card.get("brand") if isinstance(card, dict) else getattr(card, "brand", ""),
                        "last4": card.get("last4") if isinstance(card, dict) else getattr(card, "last4", ""),
                        "exp_month": card.get("exp_month") if isinstance(card, dict) else getattr(card, "exp_month", 0),
                        "exp_year": card.get("exp_year") if isinstance(card, dict) else getattr(card, "exp_year", 0),
                    }

            # Get subscription fields - use dict access for compatibility
            sub_id = sub.get("id") if isinstance(sub, dict) else getattr(sub, "id", subscription_id)
            status = sub.get("status") if isinstance(sub, dict) else getattr(sub, "status", "active")
            currency = sub.get("currency", "eur") if isinstance(sub, dict) else getattr(sub, "currency", "eur")
            period_start = sub.get("current_period_start") if isinstance(sub, dict) else getattr(sub, "current_period_start", None)
            period_end = sub.get("current_period_end") if isinstance(sub, dict) else getattr(sub, "current_period_end", None)
            cancel_at_end = sub.get("cancel_at_period_end", False) if isinstance(sub, dict) else getattr(sub, "cancel_at_period_end", False)
            trial_end = sub.get("trial_end") if isinstance(sub, dict) else getattr(sub, "trial_end", None)

            return {
                "id": sub_id,
                "plan": plan_name,
                "status": status,
                "amount": amount // 100 if amount else 49,  # Convert cents to euros
                "currency": currency.upper() if currency else "EUR",
                "current_period_start": datetime.fromtimestamp(period_start).isoformat() if period_start else None,
                "current_period_end": datetime.fromtimestamp(period_end).isoformat() if period_end else None,
                "cancel_at_period_end": cancel_at_end,
                "trial_end": datetime.fromtimestamp(trial_end).isoformat() if trial_end else None,
                "payment_method": payment_method,
            }
        except stripe.error.StripeError as e:
            print(f"Stripe error getting subscription: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error getting subscription details: {e}")
            return None

    @staticmethod
    async def get_invoices(customer_id: str, limit: int = 10) -> list:
        """Get customer invoices"""
        try:
            invoices = stripe.Invoice.list(customer=customer_id, limit=limit)
            return [
                {
                    "id": inv.number or inv.id,
                    "date": datetime.fromtimestamp(inv.created).isoformat(),
                    "amount": inv.amount_paid,
                    "currency": inv.currency.upper(),
                    "status": inv.status,
                    "pdf_url": inv.invoice_pdf,
                }
                for inv in invoices.data
            ]
        except stripe.error.StripeError as e:
            print(f"Stripe error getting invoices: {e}")
            return []
