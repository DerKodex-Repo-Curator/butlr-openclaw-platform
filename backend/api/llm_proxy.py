"""LLM Proxy - Routes customer API requests through our server

This keeps the actual API keys secure on our server.
Customer VMs only have an auth token to access this proxy.
"""
import os
import time
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from models.database import get_db
from models.customer import Customer

router = APIRouter()

# The actual API key (only on this server)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ANTHROPIC_API_URL = "https://api.anthropic.com"

# Simple in-memory rate limiting
rate_limits: dict = {}  # customer_id -> {count, reset_time}
RATE_LIMIT_REQUESTS = 100  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds


async def verify_proxy_token(request: Request, db: AsyncSession) -> Customer:
    """Verify the proxy token and return the customer

    Token can be in:
    - X-Butlr-Token header (preferred)
    - x-api-key header (for Anthropic SDK compatibility)

    Format: customer_id:secret (e.g., "26:abc123...")
    """
    token = request.headers.get("X-Butlr-Token") or request.headers.get("x-api-key")

    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")

    # Token format: customer_id:secret
    # For now, we use a simple format. In production, use signed tokens.
    try:
        parts = token.split(":")
        if len(parts) != 2:
            raise ValueError("Invalid token format")

        customer_id = int(parts[0])
        secret = parts[1]

        # Verify customer exists and token matches
        result = await db.execute(
            select(Customer).where(Customer.id == customer_id)
        )
        customer = result.scalar_one_or_none()

        if not customer:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Verify the secret matches (stored in customer.proxy_token)
        if not customer.proxy_token or customer.proxy_token != secret:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Check rate limit
        check_rate_limit(customer_id)

        return customer

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token format")


def check_rate_limit(customer_id: int):
    """Simple rate limiting per customer"""
    now = time.time()

    if customer_id not in rate_limits:
        rate_limits[customer_id] = {"count": 0, "reset_time": now + RATE_LIMIT_WINDOW}

    limit_data = rate_limits[customer_id]

    # Reset if window expired
    if now > limit_data["reset_time"]:
        limit_data["count"] = 0
        limit_data["reset_time"] = now + RATE_LIMIT_WINDOW

    # Check limit
    if limit_data["count"] >= RATE_LIMIT_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Try again in {int(limit_data['reset_time'] - now)} seconds"
        )

    limit_data["count"] += 1


@router.api_route("/v1/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_anthropic(
    path: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Proxy requests to Anthropic API

    This endpoint accepts requests meant for Anthropic's API,
    adds the real API key, and forwards them.
    """
    # Verify customer token
    customer = await verify_proxy_token(request, db)

    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="API key not configured")

    # Get request body
    body = await request.body()

    # Build headers for Anthropic
    anthropic_headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": request.headers.get("anthropic-version", "2023-06-01"),
        "content-type": request.headers.get("content-type", "application/json"),
    }

    # Check if streaming is requested
    is_streaming = False
    if body:
        try:
            import json
            body_json = json.loads(body)
            is_streaming = body_json.get("stream", False)
        except:
            pass

    # Forward to Anthropic
    target_url = f"{ANTHROPIC_API_URL}/v1/{path}"

    async with httpx.AsyncClient(timeout=300.0) as client:
        if is_streaming:
            # Handle streaming response
            async def stream_response():
                async with client.stream(
                    method=request.method,
                    url=target_url,
                    headers=anthropic_headers,
                    content=body
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield error_body
                        return

                    async for chunk in response.aiter_bytes():
                        yield chunk

            return StreamingResponse(
                stream_response(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
        else:
            # Non-streaming request
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=anthropic_headers,
                content=body
            )

            # Track usage (async, don't block response)
            try:
                if response.status_code == 200:
                    import json
                    resp_data = response.json()
                    usage = resp_data.get("usage", {})
                    input_tokens = usage.get("input_tokens", 0)
                    output_tokens = usage.get("output_tokens", 0)

                    # Log usage (could be stored in DB for billing)
                    await db.execute(text("""
                        INSERT INTO usage_tracking (customer_id, input_tokens, output_tokens, recorded_at)
                        VALUES (:customer_id, :input_tokens, :output_tokens, NOW())
                        ON CONFLICT DO NOTHING
                    """), {
                        "customer_id": customer.id,
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens
                    })
                    await db.commit()
            except:
                pass  # Don't fail on usage tracking errors

            return response.json()


@router.get("/health")
async def proxy_health():
    """Health check for the proxy"""
    return {
        "status": "ok",
        "api_key_configured": bool(ANTHROPIC_API_KEY)
    }
