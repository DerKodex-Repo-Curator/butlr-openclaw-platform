"""Encryption utilities for API keys"""
from cryptography.fernet import Fernet
import os
from base64 import urlsafe_b64encode
import hashlib

# Get encryption key from environment or generate one
ENCRYPTION_KEY = os.getenv("API_KEY_ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    raise RuntimeError("API_KEY_ENCRYPTION_KEY must be set. Generate with: python -c 'import secrets; print(secrets.token_hex(32))'")
else:
    # Convert hex to base64 if needed
    if len(ENCRYPTION_KEY) == 64:  # 32 bytes in hex
        ENCRYPTION_KEY = urlsafe_b64encode(bytes.fromhex(ENCRYPTION_KEY)).decode()

cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key for storage"""
    return cipher.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an API key for use"""
    return cipher.decrypt(encrypted_key.encode()).decode()

def validate_api_key_format(provider: str, api_key: str) -> bool:
    """Basic validation of API key format"""
    if provider == "openai":
        return api_key.startswith("sk-") and len(api_key) > 20
    elif provider == "anthropic":
        return api_key.startswith("sk-ant-") and len(api_key) > 20
    elif provider == "google":
        return api_key.startswith("AIza") and len(api_key) > 20
    return False