"""Usage Analytics API for Butlr"""
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional
import asyncssh

from models.database import get_db
from models.customer import Customer, CustomerStatus

router = APIRouter()

async def get_clawdbot_usage(vm_ip: str) -> Dict:
    """Get usage statistics from a Clawdbot instance"""
    usage = {
        "messages_today": 0,
        "messages_month": 0,
        "api_calls_today": 0,
        "api_calls_month": 0,
        "tokens_used_today": 0,
        "tokens_used_month": 0,
        "active_sessions": 0,
        "total_sessions": 0,
        "last_active": None,
        "error": None
    }
    
    try:
        ssh_key = "/root/.ssh/butlr_rsa"
        
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None,
            connect_timeout=10
        ) as conn:
            # Try to get Clawdbot stats (if API is available)
            stats_cmd = await conn.run("clawdbot stats --json 2>/dev/null || echo '{}'", check=False)
            
            if stats_cmd.stdout and stats_cmd.stdout.strip() != "{}":
                try:
                    import json
                    stats = json.loads(stats_cmd.stdout)
                    
                    # Map Clawdbot stats to our format
                    usage["active_sessions"] = stats.get("active_sessions", 0)
                    usage["total_sessions"] = stats.get("total_sessions", 0)
                    
                    # Get today's stats from logs
                    today = datetime.utcnow().strftime("%Y-%m-%d")
                    today_logs = await conn.run(f"grep '{today}' /root/.clawdbot/logs/gateway.log 2>/dev/null | wc -l", check=False)
                    if today_logs.stdout:
                        usage["messages_today"] = int(today_logs.stdout.strip()) // 2  # Rough estimate
                    
                except Exception as e:
                    usage["error"] = f"Failed to parse stats: {str(e)}"
            
            # Check last activity from PM2
            pm2_info = await conn.run("pm2 info clawdbot --json 2>/dev/null", check=False)
            if pm2_info.stdout:
                try:
                    import json
                    info = json.loads(pm2_info.stdout)
                    if info and len(info) > 0:
                        # Get created time as last active (for now)
                        created_at = info[0].get("pm2_env", {}).get("created_at")
                        if created_at:
                            usage["last_active"] = datetime.fromtimestamp(created_at / 1000).isoformat()
                except:
                    pass
                    
    except asyncio.TimeoutError:
        usage["error"] = "Connection timeout"
    except Exception as e:
        usage["error"] = str(e)
    
    return usage


@router.get("/")
async def get_all_usage_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get usage statistics for all customers"""
    
    # Get all active customers
    result = await db.execute(
        select(Customer).where(
            Customer.status.in_([CustomerStatus.ACTIVE, CustomerStatus.TRIAL])
        )
    )
    customers = result.scalars().all()
    
    # Collect usage for each customer
    usage_tasks = []
    for customer in customers:
        if customer.vm_ip:
            usage_tasks.append(asyncio.create_task(get_clawdbot_usage(customer.vm_ip)))
        else:
            usage_tasks.append(asyncio.create_task(asyncio.sleep(0)))  # Placeholder
    
    usage_results = await asyncio.gather(*usage_tasks, return_exceptions=True)
    
    # Combine results
    customer_usage = []
    total_messages = 0
    total_api_calls = 0
    active_users = 0
    
    for i, customer in enumerate(customers):
        usage_data = {}
        
        if customer.vm_ip and i < len(usage_results):
            if isinstance(usage_results[i], dict):
                usage_data = usage_results[i]
            else:
                usage_data = {"error": "Failed to get usage"}
        
        # Count active users (used in last 24h)
        if usage_data.get("last_active"):
            try:
                last_active = datetime.fromisoformat(usage_data["last_active"])
                if datetime.utcnow() - last_active < timedelta(hours=24):
                    active_users += 1
            except:
                pass
        
        total_messages += usage_data.get("messages_today", 0)
        total_api_calls += usage_data.get("api_calls_today", 0)
        
        customer_usage.append({
            "customer_id": customer.id,
            "customer_email": customer.email,
            "bot_username": customer.telegram_bot_username,
            "status": customer.status,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "usage": usage_data
        })
    
    # Calculate summary
    return {
        "summary": {
            "total_customers": len(customers),
            "active_customers": active_users,
            "messages_today": total_messages,
            "api_calls_today": total_api_calls,
            "revenue_mrr": len([c for c in customers if c.status == CustomerStatus.ACTIVE]) * 39,  # Assuming $39/mo
        },
        "customers": customer_usage
    }


@router.get("/customer/{customer_id}")
async def get_customer_usage(
    customer_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get usage statistics for a specific customer"""
    
    result = await db.execute(
        select(Customer).where(Customer.id == customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Calculate subscription details
    days_since_created = (datetime.utcnow() - customer.created_at).days if customer.created_at else 0
    is_trial = customer.status == CustomerStatus.TRIAL
    trial_days_left = 0
    
    if is_trial and customer.trial_ends_at:
        trial_days_left = max(0, (customer.trial_ends_at - datetime.utcnow()).days)
    
    # Get usage from DB (today)
    today = date.today()
    today_result = await db.execute(text(
        "SELECT COALESCE(SUM(messages), 0), COALESCE(SUM(requests), 0), "
        "COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0), COALESCE(SUM(total_tokens), 0) "
        "FROM usage_tracking WHERE customer_id = :cid AND date = :d"
    ), {"cid": customer_id, "d": today})
    today_row = today_result.fetchone()
    
    # Get usage from DB (this month)
    first_of_month = today.replace(day=1)
    month_result = await db.execute(text(
        "SELECT COALESCE(SUM(messages), 0), COALESCE(SUM(requests), 0), "
        "COALESCE(SUM(input_tokens), 0), COALESCE(SUM(output_tokens), 0), COALESCE(SUM(total_tokens), 0) "
        "FROM usage_tracking WHERE customer_id = :cid AND date >= :d"
    ), {"cid": customer_id, "d": first_of_month})
    month_row = month_result.fetchone()
    
    # Get last 30 days breakdown
    thirty_days_ago = today - timedelta(days=30)
    daily_result = await db.execute(text(
        "SELECT date, SUM(messages) as messages, SUM(requests) as requests, SUM(total_tokens) as tokens "
        "FROM usage_tracking WHERE customer_id = :cid AND date >= :d "
        "GROUP BY date ORDER BY date"
    ), {"cid": customer_id, "d": thirty_days_ago})
    daily_rows = daily_result.fetchall()
    
    usage_data = {
        "messages_today": today_row[0] if today_row else 0,
        "messages_month": month_row[0] if month_row else 0,
        "api_calls_today": today_row[1] if today_row else 0,
        "api_calls_month": month_row[1] if month_row else 0,
        "tokens_used_today": today_row[4] if today_row else 0,
        "tokens_used_month": month_row[4] if month_row else 0,
        "input_tokens_today": today_row[2] if today_row else 0,
        "output_tokens_today": today_row[3] if today_row else 0,
        "daily_breakdown": [
            {
                "date": str(row[0]),
                "messages": row[1] or 0,
                "requests": row[2] or 0,
                "tokens": row[3] or 0,
            }
            for row in daily_rows
        ],
        "active_sessions": 0,
        "total_sessions": 0,
        "last_active": None,
        "error": None,
    }
    
    return {
        "customer": {
            "id": customer.id,
            "email": customer.email,
            "bot_username": customer.telegram_bot_username,
            "status": customer.status,
            "created_at": customer.created_at.isoformat() if customer.created_at else None,
            "days_active": days_since_created,
            "is_trial": is_trial,
            "trial_days_left": trial_days_left
        },
        "usage": usage_data
    }


@router.get("/trends")
async def get_usage_trends(
    days: int = Query(30, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db)
):
    """Get usage trends over time"""
    
    # This would ideally query from a time-series database
    # For now, return mock data structure
    
    trends = []
    today = date.today()
    
    for i in range(days):
        trend_date = today - timedelta(days=i)
        trends.append({
            "date": trend_date.isoformat(),
            "messages": 0,  # Would be populated from logs
            "api_calls": 0,
            "active_users": 0,
            "new_signups": 0
        })
    
    return {
        "period": f"Last {days} days",
        "trends": list(reversed(trends))  # Chronological order
    }


@router.post("/record-event")
async def record_usage_event(
    customer_id: int,
    event_type: str,
    metadata: Optional[Dict] = None,
    db: AsyncSession = Depends(get_db)
):
    """Record a usage event (for future implementation with proper analytics DB)"""
    
    # TODO: Implement with proper time-series database (InfluxDB, TimescaleDB, etc.)
    # For now, just acknowledge
    
    return {
        "success": True,
        "message": "Event recorded (placeholder - implement with analytics DB)"
    }