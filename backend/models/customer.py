"""Customer model"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from .database import Base

class CustomerStatus(str, enum.Enum):
    PENDING = "pending"          # Just signed up
    TRIAL = "trial"              # In trial period
    ACTIVE = "active"            # Paying customer
    CANCELLED = "cancelled"      # Cancelled subscription
    SUSPENDED = "suspended"      # Payment failed / suspended

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    
    # Stripe
    stripe_customer_id = Column(String, unique=True, nullable=True)
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    
    # Status
    status = Column(String, default=CustomerStatus.PENDING)
    plan_tier = Column(String(20), default="legacy")
    
    # Password (for email/password auth)
    password_hash = Column(String, nullable=True)

    # Email verification
    email_verified = Column(Boolean, default=False)
    email_verification_token = Column(String, nullable=True)
    email_verification_sent_at = Column(DateTime, nullable=True)

    # Telegram
    telegram_bot_token = Column(String, nullable=True)  # Encrypted - for user's own bot
    telegram_bot_username = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)  # Customer's chat ID
    uses_own_bot = Column(Boolean, default=False)  # True if user created their own bot
    proxy_token = Column(String, nullable=True)  # Token for LLM proxy authentication
    
    # VM
    vm_id = Column(String, nullable=True)             # Hetzner VM ID
    vm_ip = Column(String, nullable=True)             # VM IP address
    vm_status = Column(String, default="none")        # none, creating, running, stopped, error
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    trial_ends_at = Column(DateTime, nullable=True)
    
    # Settings
    is_admin = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Customer {self.email}>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "status": self.status,
            "plan_tier": self.plan_tier,
            "telegram_bot_username": self.telegram_bot_username,
            "vm_ip": self.vm_ip,
            "vm_status": self.vm_status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "trial_ends_at": self.trial_ends_at.isoformat() if self.trial_ends_at else None,
        }
