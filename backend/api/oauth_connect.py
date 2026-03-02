"""
OAuth Connect — Connect ChatGPT Plus/Pro or Claude Pro/Max subscriptions to customer VMs.

This is SEPARATE from oauth.py (which handles Google login for butlr.cloud accounts).
This module handles connecting AI provider subscriptions to customer bot VMs.
"""
import os
import json
import time
import hashlib
import secrets
import base64
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
import httpx
import asyncssh
import jwt

from models.database import get_db
from models.customer import Customer

router = APIRouter()

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://butlr.cloud")
SSH_KEY_PATH = os.getenv("BUTLR_SSH_KEY", "/root/.ssh/butlr_rsa")

# JWT config (must match dashboard.py / auth.py)
JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"

# OpenAI OAuth
OPENAI_CLIENT_ID = os.getenv("OPENAI_CLIENT_ID", "")
OPENAI_AUTHORIZE_URL = "https://auth.openai.com/oauth/authorize"
OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token"
OPENAI_REDIRECT_URI = f"{FRONTEND_URL}/auth/openai/callback"
OPENAI_SCOPE = "openid profile email offline_access"
OPENAI_DEFAULT_MODEL = "openai-codex/gpt-5.2-codex"

# Anthropic
ANTHROPIC_SETUP_TOKEN_PREFIX = "sk-ant-oat01-"
ANTHROPIC_MIN_TOKEN_LENGTH = 50
ANTHROPIC_DEFAULT_MODEL = "anthropic/claude-opus-4-6"

# ─────────────────────────────────────────────
# In-memory OAuth session store (state → session data)
# TTL: 10 minutes. Cleaned up on access.
# For production at scale, use Redis.
# ─────────────────────────────────────────────

_oauth_sessions: dict[str, dict] = {}
_SESSION_TTL = 600  # 10 minutes


def _cleanup_expired_sessions():
    """Remove expired OAuth sessions"""
    now = time.time()
    expired = [k for k, v in _oauth_sessions.items() if v.get("expires_at", 0) < now]
    for k in expired:
        del _oauth_sessions[k]


# ─────────────────────────────────────────────
# PKCE helpers
# ─────────────────────────────────────────────

def _generate_pkce():
    """Generate PKCE verifier and S256 challenge"""
    verifier = secrets.token_urlsafe(32)  # 43 chars base64url
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode("ascii")).digest()
    ).rstrip(b"=").decode("ascii")
    return verifier, challenge


def _decode_jwt_payload(token: str) -> dict | None:
    """Decode JWT payload without verification (for extracting claims)"""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        # Add padding
        payload = parts[1]
        payload += "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception:
        return None


# ─────────────────────────────────────────────
# Auth helper (same pattern as dashboard.py)
# ─────────────────────────────────────────────

async def get_current_customer_id(request: Request) -> int:
    """Extract customer_id from JWT token (header or cookie)"""
    token = None
    
    # Try Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    
    # Try cookie
    if not token:
        token = request.cookies.get("butlr_session")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        customer_id = payload.get("customer_id")
        if isinstance(customer_id, str):
            customer_id = int(customer_id)
        if not customer_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return customer_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─────────────────────────────────────────────
# OpenAI OAuth Endpoints
# ─────────────────────────────────────────────

@router.get("/oauth-connect/openai/start")
async def openai_oauth_start(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Start OpenAI Codex OAuth flow (dashboard use only).
    Generates PKCE challenge, stores session state, returns auth URL.
    """
    customer_id = await get_current_customer_id(request)

    # Verify customer exists and has a VM (dashboard flow only)
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="VM not provisioned yet. Complete onboarding first.")

    # Generate PKCE
    verifier, challenge = _generate_pkce()
    state = secrets.token_hex(16)

    # Store session
    _cleanup_expired_sessions()
    _oauth_sessions[state] = {
        "customer_id": customer_id,
        "verifier": verifier,
        "created_at": time.time(),
        "expires_at": time.time() + _SESSION_TTL,
    }
    
    # Build authorize URL
    from urllib.parse import urlencode
    params = {
        "response_type": "code",
        "client_id": OPENAI_CLIENT_ID,
        "redirect_uri": OPENAI_REDIRECT_URI,
        "scope": OPENAI_SCOPE,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
        "id_token_add_organizations": "true",
        "codex_cli_simplified_flow": "true",
    }
    auth_url = f"{OPENAI_AUTHORIZE_URL}?{urlencode(params)}"
    
    return {"auth_url": auth_url, "state": state}


@router.get("/auth/openai/callback")
async def openai_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    OpenAI OAuth callback. Exchanges code for tokens and deploys to VM.
    """
    _cleanup_expired_sessions()
    
    # Look up session
    session = _oauth_sessions.pop(state, None)
    if not session:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Invalid+or+expired+session"
        )
    
    customer_id = session["customer_id"]
    verifier = session["verifier"]
    
    # Exchange code for tokens
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                OPENAI_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "client_id": OPENAI_CLIENT_ID,
                    "code": code,
                    "code_verifier": verifier,
                    "redirect_uri": OPENAI_REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        
        if resp.status_code != 200:
            print(f"[oauth-connect] OpenAI token exchange failed: {resp.status_code} {resp.text}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Token+exchange+failed"
            )
        
        token_data = resp.json()
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)
        
        if not access_token or not refresh_token:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Missing+tokens"
            )
        
    except Exception as e:
        print(f"[oauth-connect] OpenAI token exchange error: {e}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Connection+failed"
        )
    
    # Extract accountId from JWT
    payload = _decode_jwt_payload(access_token)
    account_id = None
    if payload:
        auth_claim = payload.get("https://api.openai.com/auth", {})
        account_id = auth_claim.get("chatgpt_account_id")
    
    if not account_id:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Could+not+extract+account"
        )
    
    # Extract email for display
    profile_claim = payload.get("https://api.openai.com/profile", {})
    email = profile_claim.get("email", "")
    plan_type = payload.get("https://api.openai.com/auth", {}).get("chatgpt_plan_type", "unknown")
    
    # Store credentials
    credentials = {
        "access": access_token,
        "refresh": refresh_token,
        "expires": int(time.time() * 1000) + (expires_in * 1000),
        "accountId": account_id,
    }
    
    # Update customer record
    customer = await db.get(Customer, customer_id)
    if not customer:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Customer+not+found"
        )
    
    customer.auth_method = "oauth_openai"
    customer.auth_provider = "openai-codex"
    await db.commit()
    
    # Deploy to VM (dashboard flow only — VM must exist)
    if not customer.vm_ip:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=VM+not+provisioned"
        )

    try:
        await deploy_oauth_to_vm(
            customer_id=customer_id,
            provider="openai-codex",
            credentials=credentials,
            default_model=OPENAI_DEFAULT_MODEL,
            db=db,
        )
        print(f"[oauth-connect] ✅ OpenAI OAuth connected + deployed for customer {customer_id} ({email}, plan: {plan_type})")
    except Exception as e:
        print(f"[oauth-connect] Deploy to VM failed: {e}")
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/settings?oauth=error&message=Deploy+failed"
        )

    return RedirectResponse(url=f"{FRONTEND_URL}/dashboard/settings?oauth=success&provider=openai")


# ─────────────────────────────────────────────
# Anthropic Setup Token Endpoint
# ─────────────────────────────────────────────

class AnthropicConnectRequest(BaseModel):
    setup_token: str


@router.post("/oauth-connect/anthropic/connect")
async def anthropic_connect(
    request: Request,
    body: AnthropicConnectRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Connect Anthropic Claude Pro/Max via setup-token (dashboard use only).
    Validates token format and deploys to customer VM.
    """
    customer_id = await get_current_customer_id(request)

    # Verify customer exists and has a VM (dashboard flow only)
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="VM not provisioned yet. Complete onboarding first.")
    
    # Validate token format
    token = body.setup_token.strip()
    if not token.startswith(ANTHROPIC_SETUP_TOKEN_PREFIX):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid token format. Expected token starting with {ANTHROPIC_SETUP_TOKEN_PREFIX}"
        )
    if len(token) < ANTHROPIC_MIN_TOKEN_LENGTH:
        raise HTTPException(status_code=400, detail="Token looks too short. Paste the full setup-token.")
    
    # Quick validation: try a simple API call with the token
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://api.anthropic.com/v1/models",
                headers={
                    "x-api-key": token,
                    "anthropic-version": "2023-06-01",
                },
            )
        # 200 or 403 with specific message means token is structurally valid
        # 401 means definitely invalid
        if resp.status_code == 401:
            raise HTTPException(status_code=400, detail="Token appears to be invalid or expired. Please regenerate with `claude setup-token`.")
    except httpx.TimeoutException:
        pass  # Timeout is OK, token might still be valid
    except HTTPException:
        raise
    except Exception:
        pass  # Network issues shouldn't block deployment
    
    # Store credentials
    credentials = {
        "type": "oauth",
        "provider": "anthropic",
        "key": token,
    }
    
    # Update customer record
    customer.auth_method = "setup_token_anthropic"
    customer.auth_provider = "anthropic"
    await db.commit()
    
    # Deploy to VM (dashboard flow only — VM must exist)
    try:
        await deploy_oauth_to_vm(
            customer_id=customer_id,
            provider="anthropic",
            credentials=credentials,
            default_model=ANTHROPIC_DEFAULT_MODEL,
            db=db,
            is_setup_token=True,
        )
        print(f"[oauth-connect] ✅ Anthropic setup-token connected + deployed for customer {customer_id}")
    except Exception as e:
        print(f"[oauth-connect] Anthropic deploy failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to deploy to VM: {str(e)}")
    
    return {"success": True, "message": "Anthropic connected successfully", "provider": "anthropic"}


# ─────────────────────────────────────────────
# Connection Status Endpoint
# ─────────────────────────────────────────────

@router.get("/oauth-connect/status")
async def get_connection_status(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Get current AI connection status for the customer"""
    customer_id = await get_current_customer_id(request)
    customer = await db.get(Customer, customer_id)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    auth_method = getattr(customer, 'auth_method', 'api_key') or 'api_key'
    auth_provider = getattr(customer, 'auth_provider', None)
    
    # Map auth method to display info
    connection_info = {
        "api_key": {
            "method": "api_key",
            "provider": auth_provider or "unknown",
            "label": "API Key",
            "description": "Connected via API key",
            "model": "anthropic/claude-sonnet-4-20250514" if auth_provider != "openai" else "openai/gpt-4o",
        },
        "oauth_openai": {
            "method": "oauth_openai",
            "provider": "openai-codex",
            "label": "ChatGPT Plus/Pro",
            "description": "Connected via OpenAI OAuth",
            "model": OPENAI_DEFAULT_MODEL,
        },
        "setup_token_anthropic": {
            "method": "setup_token_anthropic",
            "provider": "anthropic",
            "label": "Claude Pro/Max",
            "description": "Connected via Anthropic setup-token",
            "model": ANTHROPIC_DEFAULT_MODEL,
        },
        "oauth_anthropic": {
            "method": "oauth_anthropic",
            "provider": "anthropic",
            "label": "Claude Pro/Max",
            "description": "Connected via Anthropic OAuth",
            "model": ANTHROPIC_DEFAULT_MODEL,
        },
    }
    
    info = connection_info.get(auth_method, connection_info["api_key"])
    info["connected"] = True
    info["vm_ip"] = customer.vm_ip
    info["has_vm"] = bool(customer.vm_ip)
    
    return info


# ─────────────────────────────────────────────
# Disconnect Endpoint
# ─────────────────────────────────────────────

@router.post("/oauth-connect/disconnect")
async def disconnect_provider(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Disconnect current AI provider (resets to no auth)"""
    customer_id = await get_current_customer_id(request)
    customer = await db.get(Customer, customer_id)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer.auth_method = None
    customer.auth_provider = None
    await db.commit()
    
    return {"success": True, "message": "Disconnected. You can connect a new provider."}


# ─────────────────────────────────────────────
# VM Deployment
# ─────────────────────────────────────────────

async def deploy_oauth_to_vm(
    customer_id: int,
    provider: str,
    credentials: dict,
    default_model: str,
    db: AsyncSession,
    is_setup_token: bool = False,
):
    """
    Deploy OAuth/setup-token credentials to a customer VM.
    
    1. SSH to VM
    2. Write auth-profiles.json
    3. Update openclaw.json (auth profile + model)
    4. Restart clawdbot service
    """
    # Get customer VM IP
    customer = await db.get(Customer, customer_id)
    if not customer or not customer.vm_ip:
        raise Exception(f"No VM found for customer {customer_id}")
    
    vm_ip = customer.vm_ip
    ssh_key = SSH_KEY_PATH
    
    # Build auth-profiles.json content
    profile_id = f"{provider}:default"
    
    if is_setup_token:
        # Anthropic setup-token format
        auth_profiles = {
            "version": 1,
            "profiles": {
                profile_id: {
                    "type": "oauth",
                    "provider": provider,
                    "key": credentials.get("key", ""),
                }
            },
            "lastGood": {
                provider: profile_id
            },
        }
    else:
        # OAuth token format (OpenAI Codex)
        auth_profiles = {
            "version": 1,
            "profiles": {
                profile_id: {
                    "type": "oauth",
                    "provider": provider,
                    "access": credentials.get("access", ""),
                    "refresh": credentials.get("refresh", ""),
                    "expires": credentials.get("expires", 0),
                    "accountId": credentials.get("accountId", ""),
                }
            },
            "lastGood": {
                provider: profile_id
            },
        }
    
    # Build openclaw.json update script
    auth_profiles_json = json.dumps(auth_profiles, indent=2)
    
    # Provider mode
    auth_mode = "oauth"
    
    # Model parts
    model_provider = default_model.split("/")[0] if "/" in default_model else provider
    
    update_config_script = f"""python3 -c "
import json, os

# Write auth-profiles.json
auth_dir = '/root/.openclaw/agents/main/agent'
os.makedirs(auth_dir, exist_ok=True)

profiles = {json.dumps(auth_profiles)}
with open(os.path.join(auth_dir, 'auth-profiles.json'), 'w') as f:
    json.dump(profiles, f, indent=2)
print('auth-profiles.json written')

# Update openclaw.json
config_path = '/root/.openclaw/openclaw.json'
with open(config_path) as f:
    config = json.load(f)

# Set auth profile
if 'auth' not in config:
    config['auth'] = {{}}
if 'profiles' not in config['auth']:
    config['auth']['profiles'] = {{}}

config['auth']['profiles']['{profile_id}'] = {{
    'provider': '{provider}',
    'mode': '{auth_mode}'
}}

# Set default model
if 'agents' not in config:
    config['agents'] = {{}}
if 'defaults' not in config['agents']:
    config['agents']['defaults'] = {{}}
if 'model' not in config['agents']['defaults']:
    config['agents']['defaults']['model'] = {{}}

config['agents']['defaults']['model']['primary'] = '{default_model}'

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
print('openclaw.json updated')
print('Model set to: {default_model}')
"
"""
    
    # Connect and deploy
    async with asyncssh.connect(
        vm_ip,
        username="root",
        client_keys=[ssh_key],
        known_hosts=None,
    ) as conn:
        # Run the update script
        result = await conn.run(update_config_script, check=False)
        if result.exit_status != 0:
            raise Exception(f"Config update failed: {result.stderr}")
        print(f"[oauth-connect] Config deployed: {result.stdout.strip()}")
        
        # Restart clawdbot service
        restart_result = await conn.run("systemctl restart clawdbot", check=False)
        if restart_result.exit_status != 0:
            print(f"[oauth-connect] Warning: clawdbot restart returned {restart_result.exit_status}: {restart_result.stderr}")
        else:
            print(f"[oauth-connect] clawdbot restarted successfully")
        
        # Verify service is running
        await asyncssh.sleep(2)
        status_result = await conn.run("systemctl is-active clawdbot", check=False)
        if status_result.stdout.strip() != "active":
            print(f"[oauth-connect] Warning: clawdbot not active after restart")




# ─────────────────────────────────────────────
# Model Management + VM Status
# ─────────────────────────────────────────────

AVAILABLE_MODELS = {
    "openai-codex": [
        {"id": "openai-codex/gpt-5.2-codex", "name": "GPT-5.2 Codex", "description": "Most intelligent coding model (default)"},
        {"id": "openai-codex/gpt-5.1-codex", "name": "GPT-5.1 Codex", "description": "Agentic coding, configurable reasoning"},
        {"id": "openai-codex/gpt-5.1-codex-mini", "name": "GPT-5.1 Codex Mini", "description": "Cost-effective coding"},
        {"id": "openai-codex/gpt-5-codex", "name": "GPT-5 Codex", "description": "Previous Codex generation"},
    ],
    "anthropic": [
        {"id": "anthropic/claude-opus-4-6", "name": "Claude Opus 4.6", "description": "Most capable, best coding (default)"},
        {"id": "anthropic/claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "description": "Opus-level coding, Sonnet price"},
        {"id": "anthropic/claude-opus-4-20250514", "name": "Claude Opus 4", "description": "Previous flagship"},
        {"id": "anthropic/claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "description": "Best balance"},
        {"id": "anthropic/claude-haiku-3.5-20241022", "name": "Claude Haiku 3.5", "description": "Fast & cheap"},
    ],
    "openai": [
        {"id": "openai/gpt-5.2", "name": "GPT-5.2", "description": "Best for coding & agentic tasks (default)"},
        {"id": "openai/gpt-5.1", "name": "GPT-5.1", "description": "Configurable reasoning effort"},
        {"id": "openai/gpt-5", "name": "GPT-5", "description": "Intelligent reasoning model"},
        {"id": "openai/gpt-5-mini", "name": "GPT-5 Mini", "description": "Fast, cost-efficient"},
        {"id": "openai/gpt-5-nano", "name": "GPT-5 Nano", "description": "Fastest, cheapest"},
        {"id": "openai/o3", "name": "o3", "description": "Complex reasoning (succeeded by GPT-5)"},
        {"id": "openai/o3-mini", "name": "o3 Mini", "description": "Efficient reasoning"},
    ],
    "google": [
        {"id": "google/gemini-3-pro-preview", "name": "Gemini 3 Pro", "description": "Most powerful, frontier model (default)"},
        {"id": "google/gemini-3-flash-preview", "name": "Gemini 3 Flash", "description": "Frontier + speed"},
        {"id": "google/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Best for coding"},
        {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Hybrid reasoning"},
        {"id": "google/gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash-Lite", "description": "Cost-effective"},
        {"id": "google/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "description": "Budget option"},
    ],
}


@router.get("/oauth-connect/vm-status")
async def get_vm_connection_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get actual connection status from the VM (not just DB)"""
    customer_id = await get_current_customer_id(request)
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    vm_ip = customer.vm_ip
    if not vm_ip:
        return {"connected": False, "method": None, "provider": None, "model": None, "has_vm": False}

    try:
        async with asyncssh.connect(
            vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=10,
        ) as conn:
            # Read auth-profiles to see what's actually configured
            auth_result = await conn.run(
                "cat /root/.openclaw/agents/main/agent/auth-profiles.json 2>/dev/null || echo '{}'",
                check=False,
            )
            # Read config for model
            config_result = await conn.run(
                "python3 -c \"import json; d=json.load(open('/root/.openclaw/openclaw.json')); print(json.dumps({'model': d.get('agents',{}).get('defaults',{}).get('model',{}).get('primary','unknown')}))\" 2>/dev/null || echo '{\"model\":\"unknown\"}'",
                check=False,
            )

            auth_profiles = json.loads(auth_result.stdout.strip() or "{}")
            config_data = json.loads(config_result.stdout.strip() or "{}")

            profiles = auth_profiles.get("profiles", {})
            last_good = auth_profiles.get("lastGood", {})
            current_model = config_data.get("model", "unknown")

            # Determine actual connection method
            method = None
            provider = None
            label = "Not connected"
            description = "No AI provider configured"

            if profiles:
                # Find the active profile
                for provider_key, profile_id in last_good.items():
                    if profile_id in profiles:
                        profile = profiles[profile_id]
                        provider = profile.get("provider", provider_key)

                        if profile.get("key"):
                            method = "setup_token_anthropic"
                            label = "Claude Pro/Max"
                            description = "Connected via setup token"
                        elif profile.get("access") or profile.get("refresh"):
                            if "anthropic" in provider:
                                method = "oauth_anthropic"
                                label = "Claude Pro/Max"
                                description = "Connected via Anthropic OAuth"
                            else:
                                method = "oauth_openai"
                                label = "ChatGPT Plus/Pro"
                                description = "Connected via OpenAI OAuth"
                        break

            # Sync DB if needed
            db_method = getattr(customer, 'auth_method', None)
            if method and db_method != method:
                customer.auth_method = method
                customer.auth_provider = provider
                await db.commit()

            # Get available models for this provider
            provider_key = provider or "openai"
            models = AVAILABLE_MODELS.get(provider_key, AVAILABLE_MODELS.get("openai", []))

            return {
                "connected": bool(method),
                "method": method,
                "provider": provider,
                "label": label,
                "description": description,
                "model": current_model,
                "available_models": models,
                "has_vm": True,
                "vm_ip": vm_ip,
            }

    except Exception as e:
        return {
            "connected": False,
            "method": None,
            "provider": None,
            "model": None,
            "has_vm": True,
            "vm_ip": vm_ip,
            "error": f"VM unreachable: {str(e)[:100]}",
        }


class ChangeModelRequest(BaseModel):
    model: str


@router.post("/oauth-connect/change-model")
async def change_model(
    body: ChangeModelRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Change the AI model on the customer VM"""
    customer_id = await get_current_customer_id(request)
    customer = await db.get(Customer, customer_id)
    if not customer or not customer.vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    new_model = body.model.strip()
    if not new_model or "/" not in new_model:
        raise HTTPException(status_code=400, detail="Invalid model format (expected provider/model)")

    try:
        async with asyncssh.connect(
            customer.vm_ip, username="root", client_keys=[SSH_KEY_PATH],
            known_hosts=None, connect_timeout=10,
        ) as conn:
            # Update the model in openclaw.json
            script = f"""python3 -c "
import json
config_path = '/root/.openclaw/openclaw.json'
with open(config_path) as f:
    config = json.load(f)

config.setdefault('agents', {{}}).setdefault('defaults', {{}}).setdefault('model', {{}})
config['agents']['defaults']['model']['primary'] = '{new_model}'

with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
print('OK')
"
"""
            result = await conn.run(script, check=False, timeout=10)
            if "OK" not in (result.stdout or ""):
                raise HTTPException(status_code=500, detail="Failed to update model config")

            # Restart the bot
            await conn.run("systemctl restart clawdbot", check=False, timeout=15)

            return {"success": True, "model": new_model, "message": f"Model changed to {new_model}. Bot restarting..."}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])
