"""Bot Pool model for managing pre-created Telegram bots"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from datetime import datetime
from .database import Base

# Import encryption utilities
try:
    from utils.encryption import encrypt_api_key, decrypt_api_key
    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False


class TelegramBot(Base):
    __tablename__ = "telegram_bots"

    id = Column(Integer, primary_key=True, index=True)

    # Bot info - encrypted token storage
    # Note: For new records, use bot_token_encrypted. Legacy bot_token is kept for migration.
    _bot_token_encrypted = Column("bot_token_encrypted", String, nullable=True)
    _bot_token_legacy = Column("bot_token", String, unique=True, nullable=True)  # Legacy unencrypted
    bot_username = Column(String, unique=True, nullable=False)  # e.g., Butlr001Bot
    bot_name = Column(String, default="Butlr Assistant")        # Display name

    @property
    def bot_token(self) -> str:
        """Get decrypted bot token"""
        # Prefer encrypted token if available
        if self._bot_token_encrypted and ENCRYPTION_AVAILABLE:
            try:
                return decrypt_api_key(self._bot_token_encrypted)
            except Exception:
                pass
        # Fall back to legacy unencrypted token
        return self._bot_token_legacy

    @bot_token.setter
    def bot_token(self, value: str):
        """Set and encrypt bot token"""
        if ENCRYPTION_AVAILABLE and value:
            self._bot_token_encrypted = encrypt_api_key(value)
            self._bot_token_legacy = None  # Clear legacy on new set
        else:
            self._bot_token_legacy = value
    
    # Assignment
    is_assigned = Column(Boolean, default=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    
    # Customization (after assignment)
    custom_name = Column(String, nullable=True)      # Customer's custom name
    custom_description = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_health_check = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        status = "assigned" if self.is_assigned else "available"
        return f"<TelegramBot @{self.bot_username} ({status})>"
