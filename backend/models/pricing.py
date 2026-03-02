"""Pricing and API Key models"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, JSON, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class PricingTier(Base):
    __tablename__ = "pricing_tiers"
    
    id = Column(Integer, primary_key=True)
    tier_name = Column(String(50), unique=True, nullable=False)
    price_cents = Column(Integer, nullable=False)
    stripe_price_id = Column(String(100))
    features = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserApiKey(Base):
    __tablename__ = "user_api_keys"
    
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"))
    provider = Column(String(50), nullable=False)
    encrypted_api_key = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    customer = relationship("Customer", backref="api_keys")

class UsageTracking(Base):
    __tablename__ = "usage_tracking"
    
    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"))
    date = Column(Date, nullable=False)
    provider = Column(String(50))
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    requests = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint for daily aggregation
    __table_args__ = (
        UniqueConstraint('customer_id', 'date', 'provider', name='_customer_date_provider_uc'),
    )
    
    # Relationship
    customer = relationship("Customer", backref="usage_records")