"""Dashboard API - Combined endpoint for Portal"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import jwt
import os
import asyncssh

from models.database import get_db
from models.customer import Customer
from api.notifications import notify_vm_restart
from models.bot_pool import TelegramBot
from models.onboarding import CustomerConfig

router = APIRouter()
security = HTTPBearer(auto_error=False)

# JWT config - must match auth.py
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters")
JWT_ALGORITHM = "HS256"

# Response models
class UserResponse(BaseModel):
    id: str
    email: str
    stripe_customer_id: Optional[str] = None
    created_at: str

class BotResponse(BaseModel):
    id: str
    name: str
    status: str  # online, offline, starting, stopping
    telegram_username: Optional[str] = None
    created_at: str
    last_active: Optional[str] = None

class VMResponse(BaseModel):
    ip: str
    status: str  # running, stopped, provisioning
    uptime: str
    health: str  # healthy, degraded, unhealthy
    cpu_usage: Optional[int] = None
    memory_usage: Optional[int] = None

class UsageResponse(BaseModel):
    api_calls_today: int
    api_calls_month: int
    messages_processed: int
    uptime_percentage: float

class SubscriptionResponse(BaseModel):
    id: str
    plan: str  # trial, pro, enterprise
    status: str  # active, canceled, past_due, trialing
    current_period_end: str
    trial_end: Optional[str] = None
    amount: int
    currency: str

class DashboardResponse(BaseModel):
    user: UserResponse
    bot: BotResponse
    vm: VMResponse
    usage: UsageResponse
    subscription: SubscriptionResponse


async def get_current_customer(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Customer:
    """Extract customer from JWT token (header or cookie)"""
    # Try Authorization header first, then cookie
    token = None
    if credentials:
        token = credentials.credentials
    else:
        # Try to get token from cookie
        token = request.cookies.get("butlr_session")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        customer_id = payload.get("customer_id") or payload.get("sub")
        
        if not customer_id:
            raise HTTPException(status_code=401, detail="Invalid token: no customer_id")
        
        result = await db.execute(
            select(Customer).where(Customer.id == int(customer_id))
        )
        customer = result.scalar_one_or_none()
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return customer
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


def calculate_uptime(created_at: datetime) -> str:
    """Calculate uptime string from creation date"""
    if not created_at:
        return "0d 0h"
    delta = datetime.utcnow() - created_at
    days = delta.days
    hours = delta.seconds // 3600
    minutes = (delta.seconds % 3600) // 60
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"


async def check_vm_status(vm_ip: str) -> dict:
    """Check if Clawdbot is running on the VM and get real metrics"""
    if not vm_ip or vm_ip == "Not assigned":
        return {"running": False, "cpu": 0, "memory": 0, "uptime": "0m"}

    try:
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=5
        ) as conn:
            # Check if clawdbot service is running (systemd)
            result = await conn.run("systemctl is-active clawdbot 2>/dev/null || echo inactive", check=False)
            clawdbot_running = result.stdout.strip() == "active"

            # Get real CPU usage
            cpu = 0
            try:
                cpu_result = await conn.run(
                    "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1",
                    check=False
                )
                cpu_str = cpu_result.stdout.strip()
                if cpu_str:
                    cpu = int(float(cpu_str))
            except Exception:
                cpu = 15 if clawdbot_running else 0

            # Get real memory usage
            memory = 0
            try:
                mem_result = await conn.run(
                    "free | grep Mem | awk '{printf \"%.0f\", $3/$2 * 100.0}'",
                    check=False
                )
                mem_str = mem_result.stdout.strip()
                if mem_str:
                    memory = int(float(mem_str))
            except Exception:
                memory = 35 if clawdbot_running else 0

            # Get real system uptime
            uptime = "0m"
            try:
                uptime_result = await conn.run("uptime -p", check=False)
                if uptime_result.stdout:
                    uptime = uptime_result.stdout.strip().replace("up ", "")
            except Exception:
                uptime = "unknown"

            # Count messages from logs
            messages = 0
            try:
                msg_result = await conn.run(
                    "grep -c 'embedded run start' /tmp/clawdbot/clawdbot-$(date +%Y-%m-%d).log 2>/dev/null || echo 0",
                    check=False
                )
                messages = int(msg_result.stdout.strip() or "0")
            except:
                messages = 0

            return {"running": clawdbot_running, "cpu": cpu, "memory": memory, "uptime": uptime, "messages": messages}
    except Exception as e:
        print(f"VM check failed for {vm_ip}: {e}")
        return {"running": False, "cpu": 0, "memory": 0, "uptime": "0m"}


# ===================
# /dashboard endpoint
# ===================
@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get combined dashboard data for the authenticated customer"""

    # Get bot for this customer (use first() in case of multiple)
    bot_result = await db.execute(
        select(TelegramBot)
        .where(TelegramBot.customer_id == customer.id)
        .order_by(TelegramBot.created_at.desc())
    )
    bot = bot_result.scalars().first()

    # Get customer config for bot name
    config_result = await db.execute(
        select(CustomerConfig).where(CustomerConfig.customer_id == customer.id)
    )
    config = config_result.scalar_one_or_none()

    # Check actual VM status
    vm_check = await check_vm_status(customer.vm_ip)

    # Update last_health_check if bot is running
    if vm_check["running"] and bot:
        bot.last_health_check = datetime.utcnow()
        await db.commit()

    # Build user response
    user = UserResponse(
        id=str(customer.id),
        email=customer.email,
        stripe_customer_id=customer.stripe_customer_id,
        created_at=customer.created_at.isoformat() if customer.created_at else datetime.utcnow().isoformat()
    )

    # Determine bot name - prefer config.bot_name, then bot.custom_name, then bot.bot_name
    bot_name = "Your Butler"
    if config and config.bot_name:
        bot_name = config.bot_name
    elif bot and bot.custom_name:
        bot_name = bot.custom_name
    elif bot and bot.bot_name:
        bot_name = bot.bot_name

    # Build bot response - use actual VM status
    bot_status = "online" if vm_check["running"] else "offline"
    if customer.vm_status == "creating":
        bot_status = "starting"

    bot_response = BotResponse(
        id=str(bot.id) if bot else "0",
        name=bot_name,
        status=bot_status,
        telegram_username=bot.bot_username if bot else customer.telegram_bot_username,
        created_at=bot.created_at.isoformat() if bot and bot.created_at else datetime.utcnow().isoformat(),
        last_active=bot.last_health_check.isoformat() if bot and bot.last_health_check else None
    )
    
    # Build VM response with actual status
    vm_status = "running" if vm_check["running"] else "stopped"
    if customer.vm_status == "creating":
        vm_status = "provisioning"

    vm_response = VMResponse(
        ip=customer.vm_ip or "Not assigned",
        status=vm_status,
        uptime=vm_check.get("uptime", "0m") if vm_check["running"] else "0m",
        health="healthy" if vm_check["running"] else "degraded",
        cpu_usage=vm_check["cpu"],
        memory_usage=vm_check["memory"]
    )
    
    # Build usage response from DB
    from datetime import date as date_type
    today = date_type.today()
    first_of_month = today.replace(day=1)
    
    try:
        today_usage = await db.execute(text(
            "SELECT COALESCE(SUM(messages), 0), COALESCE(SUM(requests), 0), COALESCE(SUM(total_tokens), 0) "
            "FROM usage_tracking WHERE customer_id = :cid AND date = :d"
        ), {"cid": customer.id, "d": today})
        today_row = today_usage.fetchone()
        
        month_usage = await db.execute(text(
            "SELECT COALESCE(SUM(messages), 0), COALESCE(SUM(requests), 0), COALESCE(SUM(total_tokens), 0) "
            "FROM usage_tracking WHERE customer_id = :cid AND date >= :d"
        ), {"cid": customer.id, "d": first_of_month})
        month_row = month_usage.fetchone()
        
        msgs_today = today_row[0] if today_row else 0
        calls_today = today_row[1] if today_row else 0
        msgs_month = month_row[0] if month_row else 0
        calls_month = month_row[1] if month_row else 0
    except Exception:
        msgs_today = 0
        calls_today = 0
        msgs_month = 0
        calls_month = 0
    
    usage = UsageResponse(
        api_calls_today=calls_today,
        api_calls_month=calls_month,
        messages_processed=msgs_today,
        uptime_percentage=99.9 if vm_check["running"] else 0
    )
    
    # Build subscription response - try to get from Stripe first
    subscription = None
    if customer.stripe_subscription_id:
        try:
            from services.stripe_service import StripeService
            stripe_sub = await StripeService.get_subscription_details(customer.stripe_subscription_id)
            if stripe_sub:
                subscription = SubscriptionResponse(
                    id=stripe_sub["id"],
                    plan=stripe_sub.get("plan", "pro"),
                    status=stripe_sub["status"],
                    current_period_end=stripe_sub["current_period_end"],
                    trial_end=stripe_sub.get("trial_end"),
                    amount=stripe_sub.get("amount", 4900) // 100,  # Convert cents to euros
                    currency=stripe_sub.get("currency", "EUR")
                )
        except Exception as e:
            print(f"Failed to get Stripe subscription: {e}")

    # Fallback to local data
    if not subscription:
        plan = "trial" if customer.status == "trial" else "pro"
        sub_status = "trialing" if customer.status == "trial" else "active"
        if customer.status == "cancelled":
            sub_status = "canceled"

        subscription = SubscriptionResponse(
            id=customer.stripe_subscription_id or "sub_trial",
            plan=plan,
            status=sub_status,
            current_period_end=(customer.trial_ends_at or datetime.utcnow() + timedelta(days=30)).isoformat(),
            trial_end=customer.trial_ends_at.isoformat() if customer.trial_ends_at else None,
            amount=49,
            currency="EUR"
        )
    
    return DashboardResponse(
        user=user,
        bot=bot_response,
        vm=vm_response,
        usage=usage,
        subscription=subscription
    )


# ===================
# /bot/* endpoints
# ===================
@router.get("/bot/status", response_model=BotResponse)
async def get_bot_status(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get bot status for the authenticated customer"""
    bot_result = await db.execute(
        select(TelegramBot)
        .where(TelegramBot.customer_id == customer.id)
        .order_by(TelegramBot.created_at.desc())
    )
    bot = bot_result.scalars().first()
    
    # Check actual VM status
    vm_check = await check_vm_status(customer.vm_ip)
    
    if not bot:
        return BotResponse(
            id="0",
            name="Your Butler",
            status="offline",
            telegram_username=customer.telegram_bot_username,
            created_at=datetime.utcnow().isoformat(),
            last_active=None
        )
    
    return BotResponse(
        id=str(bot.id),
        name=bot.custom_name or bot.bot_name,
        status="online" if vm_check["running"] else "offline",
        telegram_username=bot.bot_username,
        created_at=bot.created_at.isoformat() if bot.created_at else datetime.utcnow().isoformat(),
        last_active=bot.last_health_check.isoformat() if bot.last_health_check else None
    )


@router.post("/bot/restart")
async def restart_bot(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Restart bot for the authenticated customer"""
    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")
    
    try:
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=10
        ) as conn:
            await conn.run("systemctl restart clawdbot", check=True)
        # Notify customer
        try:
            await notify_vm_restart(customer.telegram_bot_token, customer.telegram_chat_id)
        except Exception:
            pass
        return {"success": True, "message": "Bot restart initiated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Restart failed: {e}")


@router.patch("/bot/name")
async def update_bot_name(
    name: str,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Update bot display name"""
    bot_result = await db.execute(
        select(TelegramBot)
        .where(TelegramBot.customer_id == customer.id)
        .order_by(TelegramBot.created_at.desc())
    )
    bot = bot_result.scalars().first()

    if bot:
        bot.custom_name = name
        await db.commit()

    return {"success": True, "name": name}


# ===================
# /vm/* endpoints
# ===================
@router.post("/vm/restart")
async def restart_vm(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Restart the customer's VM (reboot)"""
    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    try:
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=10
        ) as conn:
            # Reboot the VM
            await conn.run("reboot", check=False)
        # Notify customer (before reboot kills the connection)
        try:
            import httpx as _httpx
            _msg = chr(128260) + " VM Restarting - Your butler is rebooting. Back in 1-2 minutes!"
            async with _httpx.AsyncClient(timeout=5.0) as _c:
                await _c.post(
                    f"https://api.telegram.org/bot{customer.telegram_bot_token}/sendMessage",
                    json={"chat_id": customer.telegram_chat_id, "text": _msg}
                )
        except Exception:
            pass
        return {"success": True, "message": "VM restart initiated. It may take 1-2 minutes to come back online."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VM restart failed: {e}")


@router.get("/vm/status")
async def get_vm_status(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed VM status"""
    if not customer.vm_ip:
        return {
            "ip": "Not assigned",
            "status": "none",
            "uptime": "0m",
            "health": "unhealthy",
            "cpu_usage": 0,
            "memory_usage": 0,
            "disk_usage": 0,
        }

    vm_check = await check_vm_status(customer.vm_ip)

    # Get real uptime from VM
    uptime_str = "0m"
    disk_usage = 0
    try:
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=5
        ) as conn:
            # Get actual system uptime
            uptime_result = await conn.run("uptime -p", check=False)
            if uptime_result.stdout:
                uptime_str = uptime_result.stdout.strip().replace("up ", "")

            # Get disk usage
            disk_result = await conn.run("df -h / | tail -1 | awk '{print $5}' | tr -d '%'", check=False)
            if disk_result.stdout:
                disk_usage = int(disk_result.stdout.strip())
    except Exception as e:
        print(f"Failed to get VM details: {e}")
        uptime_str = "unknown"

    return {
        "ip": customer.vm_ip,
        "status": "running" if vm_check["running"] else "stopped",
        "uptime": uptime_str,
        "health": "healthy" if vm_check["running"] else "degraded",
        "cpu_usage": vm_check["cpu"],
        "memory_usage": vm_check["memory"],
        "disk_usage": disk_usage,
    }


# ===================
# /vm/metrics - Historical metrics for charts
# ===================
@router.get("/vm/metrics")
async def get_vm_metrics(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db),
    hours: int = 24
):
    """Get historical VM metrics for charts"""
    from sqlalchemy import text

    # Limit to max 24 hours
    hours = min(hours, 24)

    result = await db.execute(
        text("""
            SELECT cpu_usage, memory_usage, disk_usage, bot_running, recorded_at
            FROM vm_metrics
            WHERE customer_id = :customer_id
              AND recorded_at > NOW() - INTERVAL ':hours hours'
            ORDER BY recorded_at ASC
        """.replace(':hours', str(hours))),
        {"customer_id": customer.id}
    )
    rows = result.fetchall()

    metrics = []
    for row in rows:
        metrics.append({
            "cpu": round(row.cpu_usage or 0, 1),
            "memory": round(row.memory_usage or 0, 1),
            "disk": round(row.disk_usage or 0, 1),
            "bot_running": row.bot_running,
            "time": row.recorded_at.isoformat() if row.recorded_at else None
        })

    return {"metrics": metrics, "hours": hours}


# ===================
# /billing/* endpoints
# ===================
@router.get("/billing/portal")
async def get_billing_portal(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get Stripe billing portal URL"""
    from services.stripe_service import StripeService

    if not customer.stripe_customer_id:
        raise HTTPException(status_code=404, detail="No billing account found")

    result = await StripeService.create_billing_portal_session(
        customer.stripe_customer_id,
        return_url="https://butlr.cloud/dashboard/billing"
    )

    return {"url": result.get("url") if isinstance(result, dict) else result}


@router.get("/billing/subscription")
async def get_subscription(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get current subscription details from Stripe"""
    from services.stripe_service import StripeService

    if not customer.stripe_subscription_id:
        # Return trial info if no subscription
        return {
            "plan": "trial",
            "status": "trialing",
            "amount": 0,
            "currency": "EUR",
            "current_period_start": customer.created_at.isoformat() if customer.created_at else datetime.utcnow().isoformat(),
            "current_period_end": (customer.trial_ends_at or datetime.utcnow() + timedelta(days=7)).isoformat(),
            "trial_end": (customer.trial_ends_at or datetime.utcnow() + timedelta(days=7)).isoformat(),
            "cancel_at_period_end": False,
            "payment_method": None,
        }

    try:
        sub_details = await StripeService.get_subscription_details(customer.stripe_subscription_id)
        if not sub_details:
            # Fallback to basic info from database
            return {
                "plan": "pro",
                "status": customer.status or "active",
                "amount": 49,
                "currency": "EUR",
                "current_period_start": customer.created_at.isoformat() if customer.created_at else datetime.utcnow().isoformat(),
                "current_period_end": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "trial_end": customer.trial_ends_at.isoformat() if customer.trial_ends_at else None,
                "cancel_at_period_end": False,
                "payment_method": None,
            }
        return sub_details
    except Exception as e:
        print(f"Stripe subscription error: {e}")
        # Return fallback data on error
        return {
            "plan": "pro",
            "status": customer.status or "active",
            "amount": 49,
            "currency": "EUR",
            "current_period_start": customer.created_at.isoformat() if customer.created_at else datetime.utcnow().isoformat(),
            "current_period_end": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "trial_end": customer.trial_ends_at.isoformat() if customer.trial_ends_at else None,
            "cancel_at_period_end": False,
            "payment_method": None,
        }


@router.get("/billing/invoices")
async def get_invoices(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get customer invoices from Stripe"""
    from services.stripe_service import StripeService

    if not customer.stripe_customer_id:
        return {"invoices": []}

    invoices = await StripeService.get_invoices(customer.stripe_customer_id)
    return {"invoices": invoices}


@router.post("/billing/cancel")
async def cancel_subscription(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Cancel subscription at end of billing period"""
    from services.stripe_service import StripeService

    if not customer.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription")

    success = await StripeService.cancel_subscription(
        customer.stripe_subscription_id,
        at_period_end=True
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

    return {"success": True, "message": "Subscription will be cancelled at the end of the billing period"}


# ===================
# /settings endpoint
# ===================
@router.get("/settings")
async def get_settings(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get user settings"""
    bot_result = await db.execute(
        select(TelegramBot)
        .where(TelegramBot.customer_id == customer.id)
        .order_by(TelegramBot.created_at.desc())
    )
    bot = bot_result.scalars().first()
    
    return {
        "bot_name": bot.custom_name or bot.bot_name if bot else "Your Butler",
        "notifications": {
            "email_alerts": True,
            "weekly_reports": True,
            "billing_reminders": True,
            "maintenance_alerts": True
        }
    }


@router.patch("/settings")
async def update_settings(
    settings: dict,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Update user settings"""
    # TODO: Actually save settings
    return {"success": True, **settings}


class SetPasswordRequest(BaseModel):
    current_password: Optional[str] = None  # Required if user already has a password
    new_password: str


# Simple in-memory rate limiting for password changes
_password_change_attempts: dict = {}


@router.post("/settings/password")
async def set_password(
    request: SetPasswordRequest,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Set or change password for the account"""
    import bcrypt
    import time

    # Rate limiting: max 5 attempts per hour per customer
    customer_key = f"pw_{customer.id}"
    now = time.time()

    # Clean old entries
    _password_change_attempts[customer_key] = [
        t for t in _password_change_attempts.get(customer_key, [])
        if now - t < 3600  # 1 hour window
    ]

    if len(_password_change_attempts.get(customer_key, [])) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many password change attempts. Please try again later."
        )

    # Validate new password strength
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if request.new_password.lower() in ['password', '12345678', 'qwerty123']:
        raise HTTPException(status_code=400, detail="Password is too common. Please choose a stronger password.")

    # If user already has a password, require current password
    if customer.password_hash:
        if not request.current_password:
            raise HTTPException(status_code=400, detail="Current password is required to change password")

        if not bcrypt.checkpw(request.current_password.encode('utf-8'), customer.password_hash.encode('utf-8')):
            # Record failed attempt
            _password_change_attempts.setdefault(customer_key, []).append(now)
            raise HTTPException(status_code=401, detail="Current password is incorrect")

    # Record successful attempt (for rate limiting)
    _password_change_attempts.setdefault(customer_key, []).append(now)

    # Hash the new password
    password_hash = bcrypt.hashpw(request.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Update customer
    customer.password_hash = password_hash
    await db.commit()

    return {"success": True, "message": "Password updated successfully"}


# ===================
# BYOK API Key endpoints
# ===================
class BYOKApiKeyRequest(BaseModel):
    provider: str  # anthropic, openai, google
    api_key: str


@router.get("/byok/status")
async def get_byok_status(
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Get BYOK status and configured providers"""
    is_byok = customer.plan_tier == "byok"

    configured_providers = []
    if is_byok and customer.vm_ip:
        try:
            ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
            async with asyncssh.connect(
                customer.vm_ip,
                username="root",
                client_keys=[ssh_key],
                known_hosts=None,
                connect_timeout=10
            ) as conn:
                # Check /etc/clawdbot/secrets for configured API keys
                result = await conn.run("cat /etc/clawdbot/secrets 2>/dev/null || echo ''", check=False)
                secrets = (result.stdout or "").strip()
                for sline in secrets.splitlines():
                    if "=" not in sline:
                        continue
                    skey, sval = sline.split("=", 1)
                    skey = skey.strip()
                    sval = sval.strip()
                    if skey == "ANTHROPIC_API_KEY" and len(sval) > 5:
                        configured_providers.append("anthropic")
                    elif skey == "OPENAI_API_KEY" and len(sval) > 5:
                        configured_providers.append("openai")
                    elif skey == "GOOGLE_API_KEY" and len(sval) > 5:
                        configured_providers.append("google")
                # Also check auth-profiles.json for OAuth connections
                auth_result = await conn.run("cat /root/.openclaw/agents/main/agent/auth-profiles.json 2>/dev/null || echo '{}'", check=False)
                try:
                    import json
                    auth_profiles = json.loads(auth_result.stdout or "{}")
                    for pid, pdata in auth_profiles.get("profiles", {}).items():
                        prov = pdata.get("provider", "")
                        if prov and prov not in configured_providers:
                            if prov.startswith("openai"):
                                if "openai" not in configured_providers:
                                    configured_providers.append("openai")
                            elif prov == "anthropic":
                                if "anthropic" not in configured_providers:
                                    configured_providers.append("anthropic")
                except Exception:
                    pass
        except Exception as e:
            print(f"Failed to check BYOK status: {e}")

    return {
        "is_byok": is_byok,
        "plan_tier": customer.plan_tier,
        "configured_providers": configured_providers,
        "available_providers": ["anthropic", "openai", "google"]
    }


@router.post("/byok/api-key")
async def set_byok_api_key(
    request: BYOKApiKeyRequest,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Set API key for BYOK customer - syncs to VM"""
    # Check if customer is on BYOK plan
    if customer.plan_tier != "byok":
        raise HTTPException(status_code=403, detail="API key configuration only available for BYOK plan")

    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned yet")

    # Validate provider
    provider = request.provider.lower()
    if provider not in ["anthropic", "openai", "google"]:
        raise HTTPException(status_code=400, detail="Invalid provider. Use: anthropic, openai, or google")

    # Validate API key format
    api_key = request.api_key.strip()
    if not api_key:
        raise HTTPException(status_code=400, detail="API key cannot be empty")

    if provider == "anthropic" and not api_key.startswith("sk-ant-"):
        raise HTTPException(status_code=400, detail="Invalid Anthropic API key format. Should start with 'sk-ant-'")

    if provider == "openai" and not api_key.startswith("sk-"):
        raise HTTPException(status_code=400, detail="Invalid OpenAI API key format. Should start with 'sk-'")

    # Map provider to env var and model
    env_var_map = {
        "anthropic": ("ANTHROPIC_API_KEY", "anthropic/claude-sonnet-4-20250514"),
        "openai": ("OPENAI_API_KEY", "openai/gpt-4o"),
        "google": ("GOOGLE_API_KEY", "google/gemini-2.0-flash"),
    }
    env_var, default_model = env_var_map[provider]

    try:
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=15,
        ) as conn:
            import json

            # 1. Update /etc/clawdbot/secrets with the new API key
            # Read current secrets, update/add the key, write back
            result = await conn.run("cat /etc/clawdbot/secrets 2>/dev/null || echo ''", check=False)
            secrets = {}
            for sline in (result.stdout or "").strip().splitlines():
                if "=" in sline:
                    k, v = sline.split("=", 1)
                    secrets[k.strip()] = v.strip()
            secrets[env_var] = api_key

            secrets_content = "\n".join(f"{k}={v}" for k, v in secrets.items())
            await conn.run(f"cat > /etc/clawdbot/secrets << 'EOFSECRETS'\n{secrets_content}\nEOFSECRETS")
            await conn.run("chmod 600 /etc/clawdbot/secrets")

            # 2. Update model in openclaw.json to match provider
            result = await conn.run("cat /root/.openclaw/openclaw.json 2>/dev/null || echo '{}'", check=False)
            config = json.loads(result.stdout or "{}")
            config.setdefault("agents", {}).setdefault("defaults", {}).setdefault("model", {})
            config["agents"]["defaults"]["model"]["primary"] = default_model
            config_json = json.dumps(config, indent=2)
            async with conn.start_sftp_client() as sftp:
                async with sftp.open("/root/.openclaw/openclaw.json", "w") as f:
                    await f.write(config_json)

            # 3. Update auth_method in DB
            customer.auth_method = "api_key"
            customer.auth_provider = provider
            await db.commit()

            # 4. Restart bot
            await conn.run("systemctl restart clawdbot", check=False)

        return {
            "success": True,
            "message": f"{provider.title()} API key configured. Model set to {default_model}. Bot restarting.",
            "provider": provider,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to configure API key: {str(e)}")


@router.delete("/byok/api-key/{provider}")
async def delete_byok_api_key(
    provider: str,
    customer: Customer = Depends(get_current_customer),
    db: AsyncSession = Depends(get_db)
):
    """Remove API key for a provider"""
    if customer.plan_tier != "byok":
        raise HTTPException(status_code=403, detail="Only available for BYOK plan")

    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="No VM assigned")

    provider = provider.lower()
    if provider not in ["anthropic", "openai", "google"]:
        raise HTTPException(status_code=400, detail="Invalid provider")

    env_var_map = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY", "google": "GOOGLE_API_KEY"}
    env_var = env_var_map.get(provider)
    if not env_var:
        raise HTTPException(status_code=400, detail="Invalid provider")

    try:
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=15,
        ) as conn:
            # Remove the API key from secrets
            result = await conn.run("cat /etc/clawdbot/secrets 2>/dev/null || echo ''", check=False)
            new_lines = [l for l in (result.stdout or "").strip().splitlines() if not l.strip().startswith(f"{env_var}=")]
            secrets_content = "\n".join(new_lines)
            await conn.run(f"cat > /etc/clawdbot/secrets << 'EOFSECRETS'\n{secrets_content}\nEOFSECRETS")
            await conn.run("chmod 600 /etc/clawdbot/secrets")

            # Restart
            await conn.run("systemctl restart clawdbot", check=False)

        return {"success": True, "message": f"{provider.title()} API key removed"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove API key: {str(e)}")
