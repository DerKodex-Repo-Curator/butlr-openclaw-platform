"""SoulVault Integration — Browse and install AI personalities"""
import os
import httpx
import asyncssh
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from models.database import get_db
from models.customer import Customer
from api.notifications import notify_soul_installed

router = APIRouter()
security = HTTPBearer(auto_error=False)

SOULVAULT_URL = os.getenv("SOULVAULT_URL", "http://localhost:3456/api")
SSH_KEY_PATH = os.getenv("BUTLR_SSH_KEY", "/root/.ssh/butlr_rsa")


async def get_customer_from_token(credentials, db) -> Customer:
    """Extract customer from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from api.auth import decode_token
    try:
        payload = decode_token(credentials.credentials)
        customer_id = int(payload.get("customer_id", 0))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not customer_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.get("/catalog")
async def get_souls_catalog(
    page: int = 1,
    limit: int = 12,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    """Proxy SoulVault catalog — browse available personalities"""
    params = {"page": page, "limit": limit}
    if category:
        params["category"] = category
    if search:
        params["search"] = search

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{SOULVAULT_URL}/souls", params=params)
            if res.status_code == 200:
                return res.json()
            return {"souls": [], "total": 0, "page": 1, "totalPages": 0}
    except Exception as e:
        return {"souls": [], "total": 0, "page": 1, "totalPages": 0, "error": str(e)}


@router.get("/categories")
async def get_categories():
    """Get all SoulVault categories"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{SOULVAULT_URL}/categories")
            if res.status_code == 200:
                return res.json()
            return []
    except Exception:
        return []



@router.get("/installed")
async def get_installed_soul(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Get the currently installed personality from customer's VM"""
    customer = await get_customer_from_token(credentials, db)
    vm_ip = customer.vm_ip
    if not vm_ip:
        return {"installed": False}

    try:
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[SSH_KEY_PATH],
            known_hosts=None,
            connect_timeout=10,
        ) as conn:
            result = await conn.run("head -5 /root/butlr-workspace/SOUL.md 2>/dev/null || echo ''", check=False)
            content = result.stdout.strip()
            if not content:
                return {"installed": False}

            # Extract name from first heading
            name = "Custom"
            for line in content.split('\n'):
                if line.startswith('# '):
                    heading = line.lstrip('# ').strip(); parts = heading.split('—'); name = parts[-1].strip() if 'SOUL' in parts[0] else parts[0].strip()
                    break

            return {
                "installed": True,
                "name": name,
                "preview": content[:200],
            }
    except Exception:
        return {"installed": False}

@router.get("/{soul_id}")
async def get_soul_detail(soul_id: int):
    """Get single soul details"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{SOULVAULT_URL}/souls/{soul_id}")
            if res.status_code == 200:
                return res.json()
            raise HTTPException(status_code=404, detail="Soul not found")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="SoulVault unavailable")


class InstallSoulRequest(BaseModel):
    soul_id: int


@router.post("/install")
async def install_soul(
    req: InstallSoulRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Install a SoulVault personality onto customer's VM"""
    customer = await get_customer_from_token(credentials, db)

    # Get VM IP from customer record
    vm_ip = customer.vm_ip
    if not vm_ip:
        raise HTTPException(status_code=400, detail="No VM found for your account")

    # Fetch soul content from SoulVault
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(f"{SOULVAULT_URL}/souls/{req.soul_id}")
            if res.status_code != 200:
                raise HTTPException(status_code=404, detail="Soul not found")
            soul_data = res.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="SoulVault unavailable")

    soul_content = soul_data.get("soul_content", "")
    soul_name = soul_data.get("name", "Unknown")

    if not soul_content:
        raise HTTPException(status_code=400, detail="Soul has no content")

    # Append owner lock + support section (same as onboarding)
    owner_section = """

## Owner Verification
Check USER.md for saved chat_id. If no chat_id saved yet, save the first user's chat_id to USER.md.
If a different chat_id tries to use you, respond: "I'm not your butler. Get your own at butlr.cloud 🦞" and ignore all further messages.

## Support
Users can reach support by sending /support followed by their message via Telegram.
"""
    soul_content = soul_content.rstrip() + owner_section

    # SSH into VM and write SOUL.md
    try:
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[SSH_KEY_PATH],
            known_hosts=None,
            connect_timeout=15,
        ) as conn:
            # Escape content for heredoc
            escaped = soul_content.replace("'", "'\\''")
            await conn.run(
                f"cat > /root/butlr-workspace/SOUL.md << 'EOFSOUL'\n{soul_content}\nEOFSOUL"
            )
            # Restart gateway to pick up new personality
            await conn.run("openclaw gateway restart 2>/dev/null || true")

            # Ensure /support command is registered (may get lost after gateway restart re-registers commands)
            if customer.telegram_bot_token:
                try:
                    import urllib.request, json as _json
                    _url = f"https://api.telegram.org/bot{customer.telegram_bot_token}/getMyCommands"
                    with urllib.request.urlopen(_url, timeout=5) as _resp:
                        _cmds = _json.loads(_resp.read())["result"]
                    if not any(c["command"] == "support" for c in _cmds):
                        _cmds.append({"command": "support", "description": "Contact Butlr support team. Usage: /support your message here"})
                        _payload = _json.dumps({"commands": _cmds}).encode()
                        _req = urllib.request.Request(f"https://api.telegram.org/bot{customer.telegram_bot_token}/setMyCommands", data=_payload, headers={"Content-Type": "application/json"}, method="POST")
                        urllib.request.urlopen(_req, timeout=5)
                except Exception:
                    pass  # Non-critical

        # Notify customer via Telegram
        try:
            await notify_soul_installed(
                bot_token=customer.telegram_bot_token,
                chat_id=customer.telegram_chat_id,
                soul_name=soul_name,
            )
        except Exception:
            pass  # Don't fail install if notification fails

        # Increment download count on SoulVault
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(f"{SOULVAULT_URL}/souls/{req.soul_id}/download")
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Personality '{soul_name}' installed! Your butler will restart with the new personality.",
            "soul_name": soul_name,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to install personality: {str(e)[:200]}"
        )

