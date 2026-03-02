"""Support Ticket System - Relay between user bots and admin via Support Bot"""
import os
import httpx
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel

from models.database import get_db
from models.customer import Customer

router = APIRouter()
security = HTTPBearer(auto_error=False)

# Support Bot config
SUPPORT_BOT_TOKEN = os.getenv('SUPPORT_BOT_TOKEN', '')
ADMIN_CHAT_ID = os.getenv('SUPPORT_ADMIN_CHAT_ID', '')
SUPPORT_API_BASE = "https://api.telegram.org/bot"

# In-memory ticket tracking (maps support message_id -> user info for replies)
_active_tickets: dict = {}


class SupportRequest(BaseModel):
    message: str
    category: Optional[str] = 'general'


async def send_support_notification(
    customer_email: str,
    customer_id: int,
    bot_username: str,
    plan_tier: str,
    message: str,
    category: str = 'general',
    user_telegram_id: Optional[str] = None,
    user_telegram_username: Optional[str] = None
) -> dict:
    """Send a support ticket to admin via Support Bot"""
    if not SUPPORT_BOT_TOKEN or not ADMIN_CHAT_ID:
        return {"success": False, "error": "Support bot not configured"}

    category_emoji = {
        'general': '\U0001f4ac',
        'billing': '\U0001f4b3',
        'technical': '\U0001f527',
        'bug': '\U0001f41b',
        'feature': '\U0001f4a1',
        'account': '\U0001f464'
    }.get(category, '\U0001f4ac')

    timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
    cid = customer_id

    lines = [
        f"{category_emoji} <b>Support Ticket</b>",
        "\u2501" * 20,
        f"\U0001f464 <b>Customer:</b> {customer_email}",
        f"\U0001f194 <b>ID:</b> #{cid}",
        f"\U0001f916 <b>Bot:</b> @{bot_username}",
        f"\U0001f4cb <b>Plan:</b> {plan_tier.upper()}",
    ]

    if user_telegram_username:
        lines.append(f"\U0001f4f1 <b>Telegram:</b> @{user_telegram_username}")

    lines.extend([
        f"\U0001f3f7\ufe0f <b>Category:</b> {category.title()}",
        f"\U0001f550 <b>Time:</b> {timestamp}",
        "\u2501" * 20,
        "",
        f"\U0001f4dd <b>Message:</b>",
        message,
        "",
        "<i>Reply to this message to respond to the customer.</i>"
    ])

    ticket_text = "\n".join(lines)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{SUPPORT_API_BASE}{SUPPORT_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": ADMIN_CHAT_ID,
                    "text": ticket_text,
                    "parse_mode": "HTML"
                },
                timeout=10.0
            )
            data = response.json()

            if data.get("ok"):
                msg_id = data["result"]["message_id"]
                _active_tickets[msg_id] = {
                    "customer_id": customer_id,
                    "customer_email": customer_email,
                    "bot_username": bot_username,
                    "user_telegram_id": user_telegram_id,
                    "user_telegram_username": user_telegram_username,
                    "created_at": timestamp
                }
                return {"success": True, "ticket_id": msg_id}
            else:
                return {"success": False, "error": data.get("description", "Unknown error")}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============== API ENDPOINTS ==============

@router.post("/submit/{customer_id}")
async def submit_support_ticket(
    customer_id: int,
    request: SupportRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Submit a support ticket from the dashboard"""
    customer = None

    # If customer_id is 0 or missing, extract from JWT token
    if customer_id == 0 and credentials:
        try:
            from api.auth import decode_token
            payload = decode_token(credentials.credentials)
            token_cid = payload.get("customer_id")
            if token_cid:
                customer_id = int(token_cid)
        except Exception:
            pass

    # Try to verify access with credentials
    if credentials:
        try:
            from api.onboarding import verify_customer_access
            customer = await verify_customer_access(customer_id, credentials, db)
        except Exception:
            pass

    # Fallback: look up customer by ID
    if not customer and customer_id > 0:
        customer = await db.get(Customer, customer_id)

    # Last resort: extract from JWT even if customer_id wasn't 0
    if not customer and credentials:
        try:
            from api.auth import decode_token
            payload = decode_token(credentials.credentials)
            token_cid = payload.get("customer_id")
            if token_cid:
                customer = await db.get(Customer, int(token_cid))
        except Exception:
            pass

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if len(request.message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 characters)")

    result = await send_support_notification(
        customer_email=customer.email,
        customer_id=customer.id,
        bot_username=customer.telegram_bot_username or "unknown",
        plan_tier=customer.plan_tier or "unknown",
        message=request.message,
        category=request.category
    )

    if result["success"]:
        # Persist ticket to DB
        try:
            await db.execute(text(
                "INSERT INTO support_tickets (customer_id, category, subject, message, status, source) "
                "VALUES (:cid, :cat, :subj, :msg, 'open', 'dashboard')"
            ), {"cid": customer_id, "cat": request.category, "subj": "", "msg": request.message})
            await db.commit()
        except Exception:
            pass  # Non-critical - ticket was already sent to Telegram
        return {
            "success": True,
            "message": "Support ticket submitted! We'll get back to you shortly.",
            "ticket_id": result.get("ticket_id")
        }
    else:
        raise HTTPException(
            status_code=500,
            detail="Failed to submit ticket. Please try again or email support@butlr.cloud"
        )


@router.post("/from-bot")
async def support_from_bot(request: Request, db: AsyncSession = Depends(get_db)):
    """Internal endpoint: called by user bots when /support command is used"""
    data = await request.json()

    # Try to save chat_id to DB if we have bot_username + user_telegram_id
    bot_username = data.get("bot_username", "").lstrip("@")
    user_tg_id = data.get("user_telegram_id")
    if bot_username and user_tg_id:
        try:
            result_q = await db.execute(
                select(Customer).where(Customer.telegram_bot_username == bot_username)
            )
            cust = result_q.scalar_one_or_none()
            if cust and not cust.telegram_chat_id:
                cust.telegram_chat_id = str(user_tg_id)
                await db.commit()
        except Exception:
            pass

    # Also try to fill in customer_id and plan from DB
    customer_id = data.get("customer_id", 0)
    plan_tier = data.get("plan_tier", "unknown")
    customer_email = data.get("customer_email", "unknown")
    if bot_username and (customer_id == 0 or plan_tier == "unknown" or customer_email == "unknown"):
        try:
            result_q = await db.execute(
                select(Customer).where(Customer.telegram_bot_username == bot_username)
            )
            cust = result_q.scalar_one_or_none()
            if cust:
                if customer_id == 0:
                    customer_id = cust.id
                if plan_tier == "unknown":
                    plan_tier = cust.plan_tier or "unknown"
                if customer_email == "unknown":
                    customer_email = cust.email or "unknown"
        except Exception:
            pass

    msg_text = data.get("message", "")
    cat = data.get("category", "general")
    result = await send_support_notification(
        customer_email=customer_email,
        customer_id=customer_id,
        bot_username=data.get("bot_username", "unknown"),
        plan_tier=plan_tier,
        message=msg_text,
        category=cat,
        user_telegram_id=data.get("user_telegram_id"),
        user_telegram_username=data.get("user_telegram_username")
    )
    # Persist ticket to DB
    if result.get("success") and customer_id:
        try:
            await db.execute(text(
                "INSERT INTO support_tickets (customer_id, category, subject, message, status, source) "
                "VALUES (:cid, :cat, '', :msg, 'open', 'telegram')"
            ), {"cid": customer_id, "cat": cat, "msg": msg_text})
            await db.commit()
        except Exception:
            pass
    return result


@router.get("/status")
async def support_status():
    """Check if support system is configured"""
    return {
        "configured": bool(SUPPORT_BOT_TOKEN and ADMIN_CHAT_ID),
        "active_tickets": len(_active_tickets)
    }




# ============== TICKET HISTORY ==============

@router.get("/tickets/me")
async def get_my_tickets(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get ticket history for the logged-in customer"""
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

    result = await db.execute(text(
        "SELECT id, category, subject, message, status, source, created_at "
        "FROM support_tickets WHERE customer_id = :cid "
        "ORDER BY created_at DESC LIMIT 20"
    ), {"cid": customer_id})

    tickets = []
    for row in result.fetchall():
        tickets.append({
            "id": row[0],
            "category": row[1],
            "subject": row[2],
            "message": row[3][:200] + ("..." if len(row[3]) > 200 else ""),
            "status": row[4],
            "source": row[5],
            "created_at": row[6].isoformat() if row[6] else None,
        })

    return {"tickets": tickets, "total": len(tickets)}


# ============== WEBHOOK: Reply forwarding ==============

@router.post("/webhook")
async def support_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Telegram webhook for Support Bot - forwards admin replies to customers"""
    try:
        update = await request.json()
    except Exception:
        return {"ok": True}

    message = update.get("message", {})
    reply_to = message.get("reply_to_message")

    # Only process replies to existing ticket messages
    if not reply_to:
        return {"ok": True}

    reply_msg_id = reply_to.get("message_id")
    admin_text = message.get("text", "")

    if not admin_text or not reply_msg_id:
        return {"ok": True}

    # Check if this reply is to a known ticket
    ticket_info = _active_tickets.get(reply_msg_id)

    if not ticket_info:
        # Try to parse customer info from the original message text
        original_text = reply_to.get("text", "")
        if "Bot:" not in original_text:
            return {"ok": True}

        # Extract bot username and customer info from the ticket text
        import re
        bot_match = re.search(r"Bot:\s*@(\w+)", original_text)
        email_match = re.search(r"Customer:\s*(\S+)", original_text)
        id_match = re.search(r"ID:\s*#(\d+)", original_text)

        if not bot_match:
            return {"ok": True}

        ticket_info = {
            "bot_username": bot_match.group(1),
            "customer_email": email_match.group(1) if email_match else "unknown",
            "customer_id": int(id_match.group(1)) if id_match else None,
            "user_telegram_id": None,
        }

    # Find the customer's bot token from DB
    bot_username = ticket_info.get("bot_username", "")
    if not bot_username:
        return {"ok": True}

    # Clean bot username (remove @ if present)
    bot_username = bot_username.lstrip("@")

    # Look up the customer by bot username to get their bot token
    result = await db.execute(
        select(Customer).where(Customer.telegram_bot_username == bot_username)
    )
    customer = result.scalar_one_or_none()

    if not customer or not customer.telegram_bot_token:
        # Try without exact match (case insensitive)
        result = await db.execute(
            select(Customer).where(Customer.telegram_bot_username.ilike(bot_username))
        )
        customer = result.scalar_one_or_none()

    if not customer or not customer.telegram_bot_token:
        # Can't forward - no bot token
        # Notify admin
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPPORT_API_BASE}{SUPPORT_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": message["chat"]["id"],
                    "text": "\u26a0\ufe0f Could not forward reply - customer bot token not found in DB.",
                    "reply_to_message_id": message["message_id"]
                },
                timeout=10.0
            )
        return {"ok": True}

    # Find the user's telegram chat_id
    user_chat_id = ticket_info.get("user_telegram_id")

    if not user_chat_id:
        # Use the customer's telegram_chat_id from DB
        user_chat_id = customer.telegram_chat_id

    if not user_chat_id:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPPORT_API_BASE}{SUPPORT_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": message["chat"]["id"],
                    "text": "\u26a0\ufe0f Could not forward reply - customer chat ID not found. The customer needs to message their bot first.",
                    "reply_to_message_id": message["message_id"]
                },
                timeout=10.0
            )
        return {"ok": True}

    # Forward the reply to the customer via their bot
    support_reply = f"\U0001f4e9 <b>Butlr Support:</b>\n\n{admin_text}"

    try:
        async with httpx.AsyncClient() as client:
            fwd_response = await client.post(
                f"{SUPPORT_API_BASE}{customer.telegram_bot_token}/sendMessage",
                json={
                    "chat_id": user_chat_id,
                    "text": support_reply,
                    "parse_mode": "HTML"
                },
                timeout=10.0
            )
            fwd_data = fwd_response.json()

            if fwd_data.get("ok"):
                # Confirm to admin
                await client.post(
                    f"{SUPPORT_API_BASE}{SUPPORT_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": message["chat"]["id"],
                        "text": "\u2705 Reply sent to customer!",
                        "reply_to_message_id": message["message_id"]
                    },
                    timeout=10.0
                )
            else:
                await client.post(
                    f"{SUPPORT_API_BASE}{SUPPORT_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": message["chat"]["id"],
                        "text": f"\u274c Failed to send: {fwd_data.get('description', 'Unknown error')}",
                        "reply_to_message_id": message["message_id"]
                    },
                    timeout=10.0
                )
    except Exception as e:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SUPPORT_API_BASE}{SUPPORT_BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": message["chat"]["id"],
                    "text": f"\u274c Error forwarding reply: {str(e)[:200]}",
                    "reply_to_message_id": message["message_id"]
                },
                timeout=10.0
            )

    return {"ok": True}
