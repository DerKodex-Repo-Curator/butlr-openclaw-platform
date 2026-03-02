"""Customer Add-on model for tracking paid features like Memory"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from .database import Base


class CustomerAddon(Base):
    __tablename__ = "customer_addons"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    addon_type = Column(String, nullable=False)  # 'memory', future: 'voice', 'multichannel'
    status = Column(String, default="active")  # active, paused, cancelling, cancelled
    stripe_subscription_item_id = Column(String, nullable=True)
    price_cents = Column(Integer, default=1000)  # €10.00
    currency = Column(String(3), default="eur")
    activated_at = Column(DateTime, default=datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)
    active_until = Column(DateTime, nullable=True)  # End of paid period after cancellation
    addon_metadata = Column("metadata", JSONB, default={})

    def __repr__(self):
        return f"<CustomerAddon {self.addon_type} for customer {self.customer_id}>"
