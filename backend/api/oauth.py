"""OAuth2 Login endpoints (Google, etc.)"""
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from authlib.integrations.starlette_client import OAuth, OAuthError
from starlette.config import Config

from models.database import get_db
from models.customer import Customer

router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

# OAuth setup
config = Config(environ=os.environ)
oauth = OAuth(config)

# Google OAuth2 configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://butlr.cloud")

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )


# JWT config - must match auth.py
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week


def create_jwt(customer_id: int, email: str) -> str:
    """Create JWT token for customer"""
    import jwt
    payload = {
        "sub": str(customer_id),
        "customer_id": str(customer_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.get("/google")
async def google_login(request: Request):
    """Initiate Google OAuth2 login flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Generate callback URL
    redirect_uri = str(request.url_for('google_callback'))

    # For production, ensure HTTPS
    if "localhost" not in redirect_uri and "http://" in redirect_uri:
        redirect_uri = redirect_uri.replace("http://", "https://")

    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth2 callback"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as e:
        # Redirect to frontend with error
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=oauth_failed&message={str(e)}"
        )

    # Get user info from token
    userinfo = token.get('userinfo')
    if not userinfo:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=no_userinfo"
        )

    email = userinfo.get('email')
    name = userinfo.get('name')

    if not email:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=no_email"
        )

    # Find or create customer
    result = await db.execute(select(Customer).where(Customer.email == email))
    customer = result.scalar_one_or_none()

    if not customer:
        # Create new customer with Google
        customer = Customer(
            email=email,
            name=name,
            email_verified=True,  # Google verified the email
            status="pending"
        )
        db.add(customer)
        await db.commit()
        await db.refresh(customer)

    else:
        # Update existing customer - mark email as verified if from Google
        if hasattr(customer, 'email_verified'):
            customer.email_verified = True
        if name and not customer.name:
            customer.name = name
        await db.commit()

    # Create JWT
    jwt_token = create_jwt(customer.id, customer.email)

    # Redirect to frontend with token
    # Option 1: Set httpOnly cookie (more secure)
    response = RedirectResponse(url=f"{FRONTEND_URL}/portal/dashboard")
    response.set_cookie(
        key="butlr_session",
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 1 week
        domain=".butlr.cloud" if "butlr.cloud" in FRONTEND_URL else None
    )

    return response


@router.get("/status")
async def oauth_status():
    """Check OAuth provider availability"""
    return {
        "google": bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET),
        "providers": ["google"] if GOOGLE_CLIENT_ID else []
    }
