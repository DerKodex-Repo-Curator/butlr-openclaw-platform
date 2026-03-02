"""Subscription model for tracking billing"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from datetime import datetime
from .database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    
    # Stripe
    stripe_subscription_id = Column(String, unique=True, index=True)
    stripe_customer_id = Column(String, index=True)
    stripe_price_id = Column(String)
    
    # Owner
    customer_id = Column(Integer, ForeignKey("customers.id"))
    
    # Status
    status = Column(String)  # active, trialing, past_due, canceled, unpaid
    
    # Billing
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    cancel_at_period_end = Column(String, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    canceled_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Subscription {self.stripe_subscription_id}>"
