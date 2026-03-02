#!/usr/bin/env python3
"""
Butlr Usage Collector
Runs on the management server, SSHes into customer VMs,
parses OpenClaw session logs, and updates the usage_tracking DB.
"""
import asyncio
import json
import os
import sys
from datetime import datetime, date, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import asyncssh
import asyncpg

DB_DSN = os.environ["DATABASE_URL"]
SSH_KEY = os.getenv("BUTLR_SSH_KEY", "/root/.ssh/butlr_rsa")
SESSION_GLOB = "/root/.openclaw/agents/*/sessions/*.jsonl"


async def get_active_customers(pool: asyncpg.Pool) -> list[dict]:
    """Get all active customers with VMs"""
    rows = await pool.fetch("""
        SELECT id, email, vm_ip, telegram_bot_username
        FROM customers
        WHERE status IN ('active', 'trial') AND vm_ip IS NOT NULL
    """)
    return [dict(r) for r in rows]


async def collect_vm_usage(vm_ip: str, target_date: date) -> dict:
    """SSH into a VM and parse OpenClaw session logs for a given date"""
    stats = {
        "messages": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
        "requests": 0,
        "sessions": 0,
        "providers": {},
    }

    target_str = target_date.isoformat()

    try:
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[SSH_KEY],
            known_hosts=None,
            connect_timeout=10,
        ) as conn:
            # Find all session files
            result = await conn.run(
                f"find /root/.openclaw/agents -name '*.jsonl' -newermt '{target_str}' 2>/dev/null",
                check=False,
                timeout=10,
            )
            files = [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]

            if not files:
                return stats

            # Parse each file — extract usage from message entries matching target_date
            for fpath in files:
                cat_result = await conn.run(f"cat '{fpath}' 2>/dev/null", check=False, timeout=15)
                if not cat_result.stdout:
                    continue

                session_counted = False
                for line in cat_result.stdout.strip().split("\n"):
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # Only count message entries with usage
                    if entry.get("type") != "message":
                        continue

                    msg = entry.get("message", {})
                    ts = entry.get("timestamp", "")

                    # Check if this message is from our target date
                    if not ts.startswith(target_str):
                        continue

                    role = msg.get("role", "")
                    usage = msg.get("usage", {})

                    # Count user messages as "messages" (1 user message = 1 conversation turn)
                    if role == "user":
                        stats["messages"] += 1

                    # Count assistant responses with tokens as "requests" (actual API calls)
                    inp = usage.get("input", 0) or 0
                    out = usage.get("output", 0) or 0
                    total = usage.get("totalTokens", 0) or (inp + out)

                    if total > 0:
                        stats["requests"] += 1
                        stats["input_tokens"] += inp
                        stats["output_tokens"] += out
                        stats["total_tokens"] += total

                    # Track provider
                    provider = msg.get("provider", msg.get("model", "unknown"))
                    if provider:
                        p = provider.split("/")[0] if "/" in provider else provider
                        stats["providers"][p] = stats["providers"].get(p, 0) + 1

                    if not session_counted:
                        stats["sessions"] += 1
                        session_counted = True

    except asyncio.TimeoutError:
        print(f"  ⏰ Timeout connecting to {vm_ip}")
    except Exception as e:
        print(f"  ❌ Error for {vm_ip}: {e}")

    return stats


async def upsert_usage(pool: asyncpg.Pool, customer_id: int, target_date: date, provider: str, stats: dict):
    """Upsert usage data into usage_tracking table"""
    await pool.execute("""
        INSERT INTO usage_tracking (customer_id, date, provider, input_tokens, output_tokens, total_tokens, requests, messages, sessions)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (customer_id, date, provider)
        DO UPDATE SET
            input_tokens = EXCLUDED.input_tokens,
            output_tokens = EXCLUDED.output_tokens,
            total_tokens = EXCLUDED.total_tokens,
            requests = EXCLUDED.requests,
            messages = EXCLUDED.messages,
            sessions = EXCLUDED.sessions
    """, customer_id, target_date, provider,
        stats.get("input_tokens", 0),
        stats.get("output_tokens", 0),
        stats.get("total_tokens", 0),
        stats.get("requests", 0),
        stats.get("messages", 0),
        stats.get("sessions", 0),
    )


async def main():
    # Collect for today and yesterday (in case we missed)
    today = date.today()
    dates_to_collect = [today, today - timedelta(days=1)]

    if len(sys.argv) > 1 and sys.argv[1] == "--date":
        dates_to_collect = [date.fromisoformat(sys.argv[2])]

    pool = await asyncpg.create_pool(DB_DSN, min_size=1, max_size=3)

    try:
        customers = await get_active_customers(pool)
        print(f"📊 Collecting usage for {len(customers)} customers...")

        for target_date in dates_to_collect:
            print(f"\n📅 Date: {target_date}")

            for cust in customers:
                vm_ip = cust["vm_ip"]
                cid = cust["id"]
                bot = cust.get("telegram_bot_username", "?")

                print(f"  🔍 Customer #{cid} (@{bot}) — {vm_ip}")
                stats = await collect_vm_usage(vm_ip, target_date)

                if stats["requests"] > 0:
                    await upsert_usage(pool, cid, target_date, "openclaw", stats)
                    print(f"    ✅ {stats['requests']} requests, {stats['total_tokens']} tokens, {stats['messages']} messages")
                else:
                    print(f"    ⚪ No usage")

        print(f"\n✅ Collection complete!")
    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(main())
