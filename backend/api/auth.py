from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import os
import secrets
import httpx
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.database import get_db
from models.customer import Customer, CustomerStatus

router = APIRouter(prefix="/auth", tags=["auth"])

# Cookie configuration
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", ".butlr.cloud")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 1 week


def set_auth_cookie(response: Response, token: str):
    """Set httpOnly auth cookie on response"""
    response.set_cookie(
        key="butlr_session",
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        domain=COOKIE_DOMAIN if COOKIE_SECURE else None
    )

# Rate limiter - uses app.state.limiter from main.py
limiter = Limiter(key_func=get_remote_address)

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week
MAGIC_LINK_EXPIRATION_MINUTES = 30

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

# In-memory store for magic link tokens (use Redis in production)
magic_tokens = {}

class MagicLinkRequest(BaseModel):
    email: str

class VerifyRequest(BaseModel):
    token: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = None

class LoginRequest(BaseModel):
    email: str
    password: str


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt(customer_id: int, email: str) -> str:
    payload = {
        "sub": str(customer_id),
        "customer_id": str(customer_id),  # Added for backwards compatibility
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def send_magic_link_email(email: str, token: str):
    """Send magic link email via Resend"""
    if not RESEND_API_KEY:
        print("Warning: RESEND_API_KEY not set, skipping email")
        return False
    
    magic_link = f"https://butlr.cloud/login?token={token}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": "Butlr <noreply@butlr.cloud>",
                "to": [email],
                "subject": "Your Butlr Login Link",
                "html": f"""
                <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0a0f1a; border-radius: 16px;">
                    <h1 style="color: #ffffff;">🦞 Welcome back to Butlr!</h1>
                    <p style="color: #9ca3af;">Click the button below to log in to your dashboard:</p>
                    <a href="{magic_link}" style="display: inline-block; background: linear-gradient(90deg, #f43f5e, #fb7185); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
                        Log In to Butlr
                    </a>
                    <p style="color: #6b7280; font-size: 14px;">This link expires in 30 minutes.</p>
                    <p style="color: #4b5563; font-size: 12px;">If you didn't request this, you can ignore this email.</p>
                </div>
                """
            }
        )
        return response.status_code == 200


async def send_verification_email(email: str, token: str) -> bool:
    """Send email verification link via Resend"""
    if not RESEND_API_KEY:
        print("Warning: RESEND_API_KEY not set, skipping verification email")
        return False

    verify_link = f"https://butlr.cloud/verify-email?token={token}"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": "Butlr <noreply@butlr.cloud>",
                "to": [email],
                "subject": "Verify your Butlr email",
                "html": f"""
                <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0a0f1a; border-radius: 16px;">
                    <h1 style="color: #ffffff;">Verify your email</h1>
                    <p style="color: #9ca3af;">Please verify your email address to complete your Butlr registration.</p>
                    <a href="{verify_link}" style="display: inline-block; background: linear-gradient(90deg, #f43f5e, #fb7185); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">
                        Verify Email
                    </a>
                    <p style="color: #6b7280; font-size: 14px;">This link expires in 24 hours.</p>
                    <p style="color: #4b5563; font-size: 12px;">If you didn't create this account, you can ignore this email.</p>
                </div>
                """
            }
        )
        return response.status_code == 200


@router.post("/magic-link")
@limiter.limit("3/minute")
async def request_magic_link(request: Request, magic_request: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """Request a magic link for passwordless login"""
    result = await db.execute(select(Customer).where(Customer.email == magic_request.email))
    customer = result.scalar_one_or_none()
    
    if not customer:
        # Don't reveal if email exists, but also don't send email
        return {"message": "If this email is registered, you will receive a login link."}
    
    # Generate magic token
    token = secrets.token_urlsafe(32)
    magic_tokens[token] = {
        "customer_id": customer.id,
        "email": customer.email,
        "expires": datetime.utcnow() + timedelta(minutes=MAGIC_LINK_EXPIRATION_MINUTES)
    }
    
    # Send email
    email_sent = await send_magic_link_email(customer.email, token)
    if not email_sent:
        print(f"Magic link for {customer.email}: https://butlr.cloud/portal/login?token={token}")
    
    return {"message": "If this email is registered, you will receive a login link."}

@router.post("/verify-magic")
async def verify_magic_link(request: VerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verify magic link token and return JWT"""
    token_data = magic_tokens.get(request.token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    if datetime.utcnow() > token_data["expires"]:
        del magic_tokens[request.token]
        raise HTTPException(status_code=401, detail="Token expired")
    
    # Get customer
    result = await db.execute(select(Customer).where(Customer.id == token_data["customer_id"]))
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Remove used token
    del magic_tokens[request.token]
    
    # Create JWT
    jwt_token = create_jwt(customer.id, customer.email)
    
    return {
        "token": jwt_token,
        "user": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "status": customer.status,
            "bot_username": customer.telegram_bot_username,
        }
    }

@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request, register_request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with email and password"""
    # Check if email already exists
    result = await db.execute(select(Customer).where(Customer.email == register_request.email))
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password length
    if len(register_request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Generate email verification token
    verification_token = secrets.token_urlsafe(32)

    # Create new customer with hashed password
    customer = Customer(
        email=register_request.email,
        name=register_request.name,
        password_hash=hash_password(register_request.password),
        status="pending",
        email_verified=False,
        email_verification_token=verification_token,
        email_verification_sent_at=datetime.utcnow()
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)

    # Send verification email (non-blocking)
    email_sent = await send_verification_email(customer.email, verification_token)
    if not email_sent:
        print(f"Verification link for {customer.email}: https://butlr.cloud/verify-email?token={verification_token}")

    # Create JWT (user can login but with unverified email)
    token = create_jwt(customer.id, customer.email)

    return {
        "token": token,
        "email_verification_sent": True,
        "message": "Account created. Please verify your email.",
        "user": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "status": customer.status,
            "email_verified": False,
        }
    }


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, login_request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password"""
    result = await db.execute(select(Customer).where(Customer.email == login_request.email))
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if customer has a password set
    if not customer.password_hash:
        raise HTTPException(
            status_code=401,
            detail="No password set. Please use the magic link to login, or set a password."
        )

    # Verify password
    if not verify_password(login_request.password, customer.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create JWT
    token = create_jwt(customer.id, customer.email)

    # Set httpOnly cookie
    set_auth_cookie(response, token)

    return {
        "token": token,  # Still return token for backwards compatibility
        "user": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "status": customer.status,
            "bot_username": customer.telegram_bot_username,
            "vm_ip": customer.vm_ip,
        }
    }


@router.post("/verify")
async def verify_token(request: VerifyRequest):
    """Verify a JWT token"""
    try:
        payload = jwt.decode(request.token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {
            "valid": True,
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/logout")
async def logout(response: Response):
    """Logout - clear auth cookie"""
    response.delete_cookie(
        key="butlr_session",
        domain=COOKIE_DOMAIN if COOKIE_SECURE else None,
        samesite="lax"
    )
    return {"success": True, "message": "Logged out successfully"}


# =====================
# Email Verification
# =====================

class ResendVerificationRequest(BaseModel):
    email: str


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify email address from verification link"""
    if not token:
        raise HTTPException(status_code=400, detail="Token is required")

    # Find customer by verification token
    result = await db.execute(
        select(Customer).where(Customer.email_verification_token == token)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    # Check if token is expired (24 hours)
    if customer.email_verification_sent_at:
        token_age = datetime.utcnow() - customer.email_verification_sent_at
        if token_age > timedelta(hours=24):
            raise HTTPException(status_code=400, detail="Verification token expired. Please request a new one.")

    # Mark email as verified
    customer.email_verified = True
    customer.email_verification_token = None
    customer.email_verification_sent_at = None
    await db.commit()

    # Create JWT for auto-login
    jwt_token = create_jwt(customer.id, customer.email)

    return {
        "success": True,
        "message": "Email verified successfully",
        "token": jwt_token,
        "user": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "status": customer.status,
        }
    }


@router.post("/resend-verification")
@limiter.limit("2/minute")
async def resend_verification(request: Request, resend_request: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    """Resend email verification link"""
    result = await db.execute(
        select(Customer).where(Customer.email == resend_request.email)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        # Don't reveal if email exists
        return {"message": "If this email is registered, you will receive a verification link."}

    if customer.email_verified:
        return {"message": "Email already verified. Please login."}

    # Generate new verification token
    token = secrets.token_urlsafe(32)
    customer.email_verification_token = token
    customer.email_verification_sent_at = datetime.utcnow()
    await db.commit()

    # Send verification email
    email_sent = await send_verification_email(customer.email, token)
    if not email_sent:
        print(f"Verification link for {customer.email}: https://butlr.cloud/verify-email?token={token}")

    return {"message": "If this email is registered, you will receive a verification link."}


class StripeLoginRequest(BaseModel):
    customer_id: str  # Stripe customer ID


@router.post("/stripe-login")
async def stripe_login(request: StripeLoginRequest, db: AsyncSession = Depends(get_db)):
    """Login via Stripe customer ID (for post-checkout auto-login)"""
    result = await db.execute(
        select(Customer).where(Customer.stripe_customer_id == request.customer_id)
    )
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if customer.status != CustomerStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Account not active")

    # Create JWT token
    jwt_token = create_jwt(customer.id, customer.email)

    return {
        "token": jwt_token,
        "user": {
            "id": customer.id,
            "email": customer.email,
            "name": customer.name,
            "status": customer.status.value if hasattr(customer.status, "value") else customer.status,
            "bot_username": customer.telegram_bot_username,
        }
    }


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token"""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
