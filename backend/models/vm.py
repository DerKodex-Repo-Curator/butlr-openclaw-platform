"""VM model for tracking Hetzner instances"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from datetime import datetime
from .database import Base

class VM(Base):
    __tablename__ = "vms"

    id = Column(Integer, primary_key=True, index=True)
    
    # Hetzner
    hetzner_id = Column(String, unique=True, index=True)
    name = Column(String)
    ip_address = Column(String)
    server_type = Column(String, default="cx22")  # Hetzner server type
    location = Column(String, default="nbg1")     # Datacenter location
    
    # Owner
    customer_id = Column(Integer, ForeignKey("customers.id"))
    
    # Status
    status = Column(String, default="creating")   # creating, running, stopped, error, deleted
    
    # Clawdbot config
    clawdbot_version = Column(String, nullable=True)
    clawdbot_status = Column(String, default="not_installed")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_health_check = Column(DateTime, nullable=True)
    
    # Metadata
    metadata_ = Column("metadata", JSON, default={})
    
    def __repr__(self):
        return f"<VM {self.name} ({self.ip_address})>"
