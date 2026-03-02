"""
Butlr Backend API
FastAPI application for customer management, VM orchestration, and billing
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

# Rate limiting setup
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

from api import customers, vms, webhooks, bot_pool, onboarding, dashboard, auth, oauth, oauth_connect, health, usage, pricing, checkout, onboarding_ws, skills, llm_proxy, support, souls, security, updates, memory
from models.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Butlr Backend...")
    await init_db()
    yield
    # Shutdown
    print("👋 Shutting down Butlr Backend...")

app = FastAPI(
    title="Butlr API",
    description="Backend API for Butlr - AI Assistant as a Service",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Session middleware for OAuth (Authlib requires sessions)
from starlette.middleware.sessions import SessionMiddleware
SESSION_SECRET = os.getenv("SESSION_SECRET") or os.getenv("JWT_SECRET")
if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET or JWT_SECRET must be set")
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://localhost:3004"
        ).split(",")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# All API routes under /api prefix for consistency
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(vms.router, prefix="/api/vms", tags=["VMs"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(bot_pool.router, prefix="/api/bot-pool", tags=["Bot Pool"])
app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])
app.include_router(checkout.router, prefix="/api/checkout", tags=["Checkout"])

# Portal Dashboard routes - under /api for nginx routing
# Routes: /api/dashboard, /api/bot/*, /api/billing/*, /api/settings
app.include_router(dashboard.router, prefix="/api", tags=["Portal Dashboard"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(oauth.router, prefix="/api", tags=["OAuth"])
app.include_router(health.router, prefix="/api/health", tags=["Health Monitoring"])
app.include_router(usage.router, prefix="/api/usage", tags=["Usage Analytics"])
app.include_router(skills.router, prefix="/api", tags=["Skills Marketplace"])
app.include_router(souls.router, prefix="/api/souls", tags=["SoulVault"])
app.include_router(security.router, prefix="/api/security", tags=["ClawShield Security"])
app.include_router(llm_proxy.router, prefix="/api/llm", tags=["LLM Proxy"])
app.include_router(support.router, prefix="/api/support", tags=["Support"])
app.include_router(oauth_connect.router, prefix="/api", tags=["OAuth Connect"])
app.include_router(updates.router, prefix="/api", tags=["Product Updates"])
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])

# WebSocket routes (no /api prefix for direct ws:// connections)
app.include_router(onboarding_ws.router, prefix="/api", tags=["Onboarding WebSocket"])

@app.get("/")
async def root():
    return {
        "name": "Butlr API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
