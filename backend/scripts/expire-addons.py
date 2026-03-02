#!/usr/bin/env python3
"""Expire cancelled memory addons after their active_until date.
Run via cron every hour: 0 * * * * /usr/bin/python3 /root/butlr-backend/scripts/expire-addons.py
"""
import os
import sys
import asyncio
import json
from datetime import datetime

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
import asyncssh

DB_DSN = os.environ["DATABASE_URL"]
SSH_KEY = os.getenv("BUTLR_SSH_KEY", "/root/.ssh/butlr_rsa")


async def disable_memory_on_vm(vm_ip: str) -> bool:
    """SSH into VM, disable mem0 plugin, restart gateway."""
    try:
        async with asyncssh.connect(
            vm_ip, username="root", known_hosts=None,
            client_keys=[SSH_KEY], connect_timeout=10
        ) as conn:
            result = await asyncio.wait_for(conn.run("""
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    config = json.load(f)
mem0 = config.get('plugins',{}).get('entries',{}).get('openclaw-mem0',{})
mem0['enabled'] = False
config['plugins']['entries']['openclaw-mem0'] = mem0
with open('/root/.openclaw/openclaw.json','w') as f:
    json.dump(config, f, indent=2)
print('DISABLED')
"
for svc in clawdbot openclaw-gateway openclaw; do
    if systemctl is-active "$svc" >/dev/null 2>&1; then
        systemctl restart "$svc"
        break
    fi
done
openclaw gateway restart 2>/dev/null || true
echo "VM_DISABLED_OK"
""", check=False), timeout=30)
            return "VM_DISABLED_OK" in (result.stdout or "")
    except Exception as e:
        print(f"  ❌ SSH failed for {vm_ip}: {e}")
        return False


async def main():
    now = datetime.utcnow()
    print(f"🕐 Addon expiry check at {now.isoformat()}")
    
    conn = await asyncpg.connect(DB_DSN)
    try:
        # Find all addons that are "cancelling" and past their active_until
        rows = await conn.fetch("""
            SELECT ca.id, ca.customer_id, ca.addon_type, ca.active_until,
                   c.vm_ip, c.email
            FROM customer_addons ca
            JOIN customers c ON c.id = ca.customer_id
            WHERE ca.status = 'cancelling'
              AND ca.active_until IS NOT NULL
              AND ca.active_until <= $1
        """, now)
        
        if not rows:
            print("  ✅ No expired addons")
            return
        
        print(f"  Found {len(rows)} expired addon(s)")
        
        for row in rows:
            addon_id = row["id"]
            customer_id = row["customer_id"]
            addon_type = row["addon_type"]
            vm_ip = row["vm_ip"]
            email = row["email"]
            
            print(f"  → Expiring {addon_type} for customer {customer_id} ({email}), VM {vm_ip}")
            
            if addon_type == "memory" and vm_ip:
                success = await disable_memory_on_vm(vm_ip)
                if success:
                    print(f"    ✅ Memory disabled on VM {vm_ip}")
                else:
                    print(f"    ⚠️ Could not disable on VM, marking cancelled anyway")
            
            # Update DB status
            await conn.execute("""
                UPDATE customer_addons 
                SET status = 'cancelled'
                WHERE id = $1
            """, addon_id)
            print(f"    ✅ Addon {addon_id} → cancelled")
    
    finally:
        await conn.close()
    
    print("🏁 Done")


if __name__ == "__main__":
    asyncio.run(main())

