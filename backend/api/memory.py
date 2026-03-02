"""Memory Feature API — Activate, manage, and query butler memory"""
import os
import json
import stripe
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import asyncssh

from models.database import get_db
from models.customer import Customer
from models.addon import CustomerAddon
from models.vm import VM

router = APIRouter()
security = HTTPBearer()

BUTLR_MEMORY_OPENAI_KEY = os.getenv("BUTLR_MEMORY_OPENAI_KEY", "")
STRIPE_PRICE_ID_MEMORY = os.getenv("STRIPE_PRICE_ID_MEMORY", "")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


# ============== MEMORY CATEGORIZATION ==============

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "food": [
        "food", "eat", "drink", "beer", "wine", "coffee", "tea", "cook", "recipe",
        "restaurant", "pizza", "sushi", "vegan", "vegetarian", "meal", "breakfast",
        "lunch", "dinner", "snack", "hungry", "favorite food",
        "essen", "trinken", "bier", "kaffee", "kochen", "rezept", "lieblings",
    ],
    "work": [
        "work", "job", "office", "meeting", "project", "deadline", "boss", "colleague",
        "salary", "career", "promotion", "client", "company", "startup", "business",
        "arbeit", "büro", "termin", "gehalt", "firma", "beruf", "chef",
    ],
    "people": [
        "friend", "family", "mother", "father", "sister", "brother", "wife", "husband",
        "girlfriend", "boyfriend", "partner", "child", "son", "daughter", "colleague",
        "freund", "familie", "mutter", "vater", "schwester", "bruder", "frau", "mann",
        "kind", "sohn", "tochter", "name is", "heißt", "called",
    ],
    "places": [
        "live", "city", "country", "move", "travel", "trip", "vacation", "visit",
        "home", "apartment", "house", "address", "location", "from",
        "wohne", "stadt", "land", "reise", "urlaub", "umzug", "zuhause",
    ],
    "health": [
        "health", "doctor", "medicine", "sick", "pain", "exercise", "gym", "sleep",
        "weight", "diet", "mental", "therapy", "anxiety", "depression", "allergy",
        "allergic", "intolerant", "intolerance", "condition", "symptom", "diagnos",
        "gesundheit", "arzt", "medizin", "krank", "sport", "schlaf", "fitness",
        "allergie", "allergisch",
    ],
    "hobbies": [
        "hobby", "game", "play", "music", "movie", "book", "read", "sport", "watch",
        "guitar", "piano", "paint", "draw", "photography", "garden", "diy",
        "spiel", "musik", "film", "buch", "lesen", "malen", "foto", "garten",
    ],
    "preferences": [
        "like", "love", "hate", "prefer", "favorite", "dislike", "enjoy", "want",
        "best", "worst", "rather", "opinion", "think about",
        "mag", "liebe", "hasse", "bevorzuge", "lieblings", "meinung",
    ],
    "routines": [
        "routine", "every day", "morning", "evening", "always", "usually", "habit",
        "schedule", "wake up", "go to bed", "daily", "weekly", "regular",
        "routine", "jeden tag", "morgens", "abends", "immer", "gewohnheit",
    ],
    "events": [
        "birthday", "anniversary", "wedding", "party", "event", "holiday", "christmas",
        "new year", "appointment", "date", "celebration", "remind",
        "geburtstag", "hochzeit", "feier", "termin", "feiertag", "weihnachten",
    ],
    "projects": [
        "project", "build", "create", "develop", "code", "app", "website", "bot",
        "automate", "deploy", "server", "database", "api", "feature", "launch",
        "projekt", "bauen", "erstellen", "entwickeln", "programmieren",
    ],
    "personal": [
        "my name", "i am", "age", "born", "birthday", "personality", "introvert",
        "extrovert", "language", "speak", "nationality", "zodiac", "pet", "cat",
        "dog", "animal", "identity", "gender", "religion",
        "ich bin", "alter", "geboren", "sprache", "spreche", "haustier", "katze",
        "hund", "tier",
    ],
}


def categorize_memory(text: str) -> str:
    """Categorize a memory text using keyword matching. Returns the best-fit category."""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    
    for category, keywords in CATEGORY_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword in text_lower:
                # Longer keyword matches are worth more
                score += len(keyword)
        if score > 0:
            scores[category] = score
    
    if not scores:
        return "general"
    
    # Return category with highest score
    return max(scores, key=scores.get)


# ============== HELPERS ==============

async def get_authenticated_customer(
    credentials: HTTPAuthorizationCredentials,
    db: AsyncSession
) -> Customer:
    """Verify token and return customer"""
    from api.auth import decode_token
    try:
        payload = decode_token(credentials.credentials)
        customer_id = payload.get("customer_id")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if not customer_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    customer = await db.get(Customer, int(customer_id))
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return customer


async def get_customer_vm_ip(customer: Customer, db: AsyncSession) -> str:
    """Get the VM IP for a customer"""
    if customer.vm_ip:
        return customer.vm_ip
    
    if customer.vm_id:
        result = await db.execute(
            select(VM).where(VM.id == int(customer.vm_id))
        )
        vm = result.scalar_one_or_none()
        if vm and vm.ip_address:
            return vm.ip_address
    
    raise HTTPException(status_code=400, detail="No VM found for this customer")


async def ssh_command(vm_ip: str, command: str, timeout: int = 30) -> str:
    """Execute a command on a customer VM via SSH"""
    try:
        async with asyncssh.connect(
            vm_ip,
            username="root",
            known_hosts=None,
            client_keys=["/root/.ssh/butlr_rsa"],
            connect_timeout=10,
        ) as conn:
            result = await asyncio.wait_for(
                conn.run(command, check=False),
                timeout=timeout
            )
            return result.stdout or ""
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VM connection failed: {str(e)[:200]}")


async def get_memory_addon(customer_id: int, db: AsyncSession) -> Optional[CustomerAddon]:
    """Get the memory addon for a customer"""
    result = await db.execute(
        select(CustomerAddon).where(
            CustomerAddon.customer_id == customer_id,
            CustomerAddon.addon_type == "memory"
        )
    )
    return result.scalar_one_or_none()


import asyncio


# ============== ENDPOINTS ==============

@router.get("/status")
async def memory_status(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get memory status and stats for the authenticated customer"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status == "cancelled":
        return {
            "active": False,
            "status": "inactive",
            "memories_count": 0,
            "categories": 0,
            "activated_at": None,
            "active_until": None,
            "last_memory": None
        }
    
    # Query VM for memory stats
    stats = {"memories_count": 0, "categories": 0, "last_memory": None}
    
    if addon.status in ("active", "paused", "cancelling"):
        try:
            vm_ip = await get_customer_vm_ip(customer, db)
            user_id = f"customer-{customer.id}"
            count_cmd = (
                'curl -s -X POST http://localhost:6333/collections/memories/points/count '
                '-H "Content-Type: application/json" '
                '-d \'{"filter":{"must":[{"key":"userId","match":{"value":"' + user_id + '"}}]}}\' '
                '2>/dev/null || echo \'{}\''
            )
            raw = await ssh_command(vm_ip, count_cmd)
            try:
                data = json.loads(raw)
                stats["memories_count"] = data.get("result", {}).get("count", 0)
            except json.JSONDecodeError:
                pass
        except Exception:
            pass
    
    # If we have memories, get category count by fetching a sample
    if stats["memories_count"] > 0:
        try:
            user_id = f"customer-{customer.id}"
            sample_cmd = (
                'curl -s -X POST http://localhost:6333/collections/memories/points/scroll '
                '-H "Content-Type: application/json" '
                '-d \'{"filter":{"must":[{"key":"userId","match":{"value":"' + user_id + '"}}]},'
                '"limit":100,"with_payload":true,"with_vector":false}\''
            )
            sample_raw = await ssh_command(vm_ip, sample_cmd, timeout=10)
            sample_data = json.loads(sample_raw.strip())
            categories_seen = set()
            for point in sample_data.get("result", {}).get("points", []):
                payload = point.get("payload", {})
                text = payload.get("data", payload.get("memory", ""))
                cat = payload.get("category") or categorize_memory(text)
                categories_seen.add(cat)
            stats["categories"] = len(categories_seen)
        except Exception:
            pass
    
    return {
        "active": addon.status in ("active", "cancelling"),
        "status": addon.status,
        "memories_count": stats["memories_count"],
        "categories": stats["categories"],
        "activated_at": addon.activated_at.isoformat() if addon.activated_at else None,
        "active_until": addon.active_until.isoformat() if addon.active_until else None,
        "last_memory": stats["last_memory"]
    }


@router.post("/activate")
async def activate_memory(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Activate memory on customer's VM"""
    customer = await get_authenticated_customer(credentials, db)
    
    # Check if already active
    addon = await get_memory_addon(customer.id, db)
    if addon and addon.status == "active":
        return {"success": True, "message": "Memory is already active"}
    
    if not BUTLR_MEMORY_OPENAI_KEY:
        raise HTTPException(status_code=500, detail="Memory service not configured")
    
    # Get VM IP early — needed for both re-activate and fresh install
    vm_ip = await get_customer_vm_ip(customer, db)
    
    # ─── Fast re-activate path: if addon exists (was cancelled/paused) and infra is already there ───
    if addon and addon.status in ("cancelled", "paused"):
        try:
            reactivate_script = """
set -e
# Check if Qdrant and extension are already installed
QDRANT_OK=0
curl -sf http://localhost:6333/healthz >/dev/null 2>&1 && QDRANT_OK=1

EXT_OK=0
[ -d /root/.openclaw/extensions/openclaw-mem0 ] && EXT_OK=1

if [ "$QDRANT_OK" = "1" ] && [ "$EXT_OK" = "1" ]; then
    # Just re-enable the plugin
    python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    config = json.load(f)
mem0 = config.get('plugins',{}).get('entries',{}).get('openclaw-mem0',{})
mem0['enabled'] = True
config['plugins']['entries']['openclaw-mem0'] = mem0
with open('/root/.openclaw/openclaw.json','w') as f:
    json.dump(config, f, indent=2)
print('ENABLED')
"
    # Restart gateway
    for svc in clawdbot openclaw-gateway openclaw; do
        if systemctl is-active "$svc" >/dev/null 2>&1; then
            systemctl restart "$svc"
            break
        fi
    done
    openclaw gateway restart 2>/dev/null || true
    echo "MEMORY_REACTIVATED_OK"
else
    echo "NEEDS_FULL_INSTALL"
fi
"""
            reactivate_result = await ssh_command(vm_ip, reactivate_script, timeout=30)
            
            if "MEMORY_REACTIVATED_OK" in reactivate_result:
                # Fast path succeeded — handle Stripe + update DB
                stripe_sub_item_id = None
                if STRIPE_PRICE_ID_MEMORY and customer.stripe_subscription_id:
                    try:
                        sub_item = stripe.SubscriptionItem.create(
                            subscription=customer.stripe_subscription_id,
                            price=STRIPE_PRICE_ID_MEMORY,
                            quantity=1,
                            metadata={"addon_type": "memory", "customer_id": str(customer.id)},
                        )
                        stripe_sub_item_id = sub_item.id
                        print(f"💳 Stripe memory addon re-created: {sub_item.id} for customer {customer.id}")
                    except stripe.StripeError as e:
                        print(f"⚠️ Stripe error on re-activate: {e}")
                
                addon.status = "active"
                addon.activated_at = datetime.utcnow()
                addon.cancelled_at = None
                if stripe_sub_item_id:
                    addon.stripe_subscription_item_id = stripe_sub_item_id
                await db.commit()
                print(f"🧠 Memory RE-activated (fast path) for customer {customer.id}")
                return {
                    "success": True,
                    "message": "Memory activated! Your butler will start remembering from now on.",
                    "activated_at": addon.activated_at.isoformat()
                }
            # else: fall through to full install
        except Exception as e:
            print(f"⚠️ Re-activate fast path failed: {e}, falling back to full install")
    
    # ─── Stripe: Add memory subscription item ───
    stripe_sub_item_id = None
    if STRIPE_PRICE_ID_MEMORY and customer.stripe_subscription_id:
        try:
            # Add the memory add-on as a new item to the existing subscription
            sub_item = stripe.SubscriptionItem.create(
                subscription=customer.stripe_subscription_id,
                price=STRIPE_PRICE_ID_MEMORY,
                quantity=1,
                metadata={"addon_type": "memory", "customer_id": str(customer.id)},
            )
            stripe_sub_item_id = sub_item.id
            print(f"💳 Stripe memory addon created: {sub_item.id} for customer {customer.id}")
        except stripe.StripeError as e:
            print(f"⚠️ Stripe error adding memory addon: {e}")
            # Don't block activation if Stripe fails — we can reconcile later
    
    # Full automated install: Docker + Qdrant + mem0 extension + config + graceful restart
    mem0_plugin_config = json.dumps({
        "enabled": True,
        "config": {
            "mode": "open-source",
            "userId": f"customer-{customer.id}",
            "autoCapture": True,
            "autoRecall": True,
            "oss": {
                "embedder": {
                    "provider": "openai",
                    "config": {
                        "model": "text-embedding-3-small",
                        "api_key": BUTLR_MEMORY_OPENAI_KEY
                    }
                },
                "vectorStore": {
                    "provider": "qdrant",
                    "config": {"host": "localhost", "port": 6333}
                },
                "llm": {
                    "provider": "openai",
                    "config": {
                        "model": "gpt-4o-mini",
                        "api_key": BUTLR_MEMORY_OPENAI_KEY
                    }
                }
            }
        }
    })
    mem0_config_escaped = mem0_plugin_config.replace("'", "'\\''")
    
    install_script = f"""
set -e

# 1. Install Docker if missing
if ! command -v docker &>/dev/null; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io
    systemctl start docker
    systemctl enable docker 2>/dev/null
fi

# 2. Start Qdrant if not running
if ! docker ps --format '{{{{.Names}}}}' 2>/dev/null | grep -q '^qdrant$'; then
    docker rm -f qdrant 2>/dev/null || true
    docker run -d --name qdrant \
        --restart=unless-stopped \
        -p 6333:6333 \
        -v qdrant_data:/qdrant/storage \
        qdrant/qdrant:latest
    # Wait for Qdrant to be ready (up to 30s)
    for i in $(seq 1 30); do
        curl -s http://localhost:6333/healthz >/dev/null 2>&1 && break
        sleep 1
    done
fi

# Verify Qdrant is up
curl -sf http://localhost:6333/healthz >/dev/null || {{ echo "QDRANT_NOT_READY"; exit 1; }}

# 3. Install openclaw-mem0 extension to the correct path
if [ ! -d /root/.openclaw/extensions/openclaw-mem0 ]; then
    cd /usr/lib/node_modules/openclaw && npm install @mem0/openclaw-mem0 2>/dev/null
    mkdir -p /root/.openclaw/extensions
    cp -r /usr/lib/node_modules/openclaw/node_modules/@mem0/openclaw-mem0 /root/.openclaw/extensions/openclaw-mem0
    cd /root/.openclaw/extensions/openclaw-mem0 && npm install 2>/dev/null
fi

# 4. Configure openclaw.json: plugin config + slots + installs
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    config = json.load(f)
if 'plugins' not in config:
    config['plugins'] = {{'entries': {{}}}}
if 'entries' not in config['plugins']:
    config['plugins']['entries'] = {{}}
# Plugin config
config['plugins']['entries']['openclaw-mem0'] = json.loads('{mem0_config_escaped}')
# Set memory slot to openclaw-mem0
config['plugins']['slots'] = {{'memory': 'openclaw-mem0'}}
# Install record
config['plugins']['installs'] = {{
    'openclaw-mem0': {{
        'source': 'npm',
        'spec': '@mem0/openclaw-mem0',
        'installPath': '/root/.openclaw/extensions/openclaw-mem0',
        'version': '0.1.0'
    }}
}}
with open('/root/.openclaw/openclaw.json', 'w') as f:
    json.dump(config, f, indent=2)
print('CONFIG_OK')
"

# 5. Add OPENAI_API_KEY to the gateway service env (mem0 needs it at runtime)
SECRETS_FILE=""
for f in /etc/clawdbot/secrets /etc/openclaw/secrets /etc/butlr/secrets; do
    [ -f "$f" ] && SECRETS_FILE="$f" && break
done

if [ -n "$SECRETS_FILE" ]; then
    if ! grep -q '^OPENAI_API_KEY=' "$SECRETS_FILE" 2>/dev/null; then
        echo 'OPENAI_API_KEY={BUTLR_MEMORY_OPENAI_KEY}' >> "$SECRETS_FILE"
    fi
fi

# 6. Restart the gateway service (try known service names)
systemctl daemon-reload 2>/dev/null
for svc in clawdbot openclaw-gateway openclaw; do
    if systemctl is-active "$svc" >/dev/null 2>&1; then
        systemctl restart "$svc"
        break
    fi
done

# Also try openclaw CLI restart as fallback
openclaw gateway restart 2>/dev/null || true

echo "MEMORY_INSTALLED_OK"
"""
    
    try:
        result = await ssh_command(vm_ip, install_script, timeout=120)
        
        if "MEMORY_INSTALLED_OK" not in result:
            raise HTTPException(status_code=500, detail="Memory installation failed on VM")
        
        # Create or update addon record
        if addon:
            addon.status = "active"
            addon.activated_at = datetime.utcnow()
            addon.cancelled_at = None
            if stripe_sub_item_id:
                addon.stripe_subscription_item_id = stripe_sub_item_id
        else:
            addon = CustomerAddon(
                customer_id=customer.id,
                addon_type="memory",
                status="active",
                activated_at=datetime.utcnow(),
                stripe_subscription_item_id=stripe_sub_item_id
            )
            db.add(addon)
        
        await db.commit()
        
        print(f"🧠 Memory activated for customer {customer.id} ({customer.email})")
        
        return {
            "success": True,
            "message": "Memory activated! Your butler will start remembering from now on.",
            "activated_at": addon.activated_at.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Activation failed: {str(e)[:200]}")


@router.post("/deactivate")
async def deactivate_memory(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Cancel memory — keeps it active until end of paid period, then auto-disables."""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status in ("cancelled", "cancelling"):
        raise HTTPException(status_code=400, detail="Memory is not active")
    
    # ─── Stripe: Cancel at period end (not immediate) ───
    active_until = None
    if addon.stripe_subscription_item_id:
        try:
            # Get the subscription to find the current period end
            sub = stripe.Subscription.retrieve(customer.stripe_subscription_id)
            period_end = sub.current_period_end  # Unix timestamp
            active_until = datetime.utcfromtimestamp(period_end)
            
            # Delete the subscription item at period end by setting proration to none
            stripe.SubscriptionItem.delete(
                addon.stripe_subscription_item_id,
                proration_behavior="none",
                clear_usage=True,
            )
            print(f"💳 Stripe memory addon cancelled (active until {active_until}) for customer {customer.id}")
        except stripe.StripeError as e:
            print(f"⚠️ Stripe error cancelling memory addon: {e}")
            # Fallback: give them 30 days from now
            from datetime import timedelta
            active_until = datetime.utcnow() + timedelta(days=30)
    else:
        # No Stripe item (e.g. test customer) — keep active for 30 days
        from datetime import timedelta
        active_until = datetime.utcnow() + timedelta(days=30)
    
    # DON'T disable memory on VM yet — it stays active until period ends
    addon.status = "cancelling"
    addon.cancelled_at = datetime.utcnow()
    addon.active_until = active_until
    await db.commit()
    
    # Format the date nicely
    until_str = active_until.strftime("%B %d, %Y") if active_until else "the end of your billing period"
    
    return {
        "success": True,
        "message": f"Memory will be deactivated on {until_str}. Your butler keeps remembering until then.",
        "active_until": active_until.isoformat() if active_until else None
    }


@router.post("/pause")
async def pause_memory(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Pause memory capture/recall without deactivating"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status != "active":
        raise HTTPException(status_code=400, detail="Memory is not active")
    
    vm_ip = await get_customer_vm_ip(customer, db)
    
    await ssh_command(vm_ip, """
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    config = json.load(f)
mem0 = config.get('plugins',{}).get('entries',{}).get('openclaw-mem0',{})
mem0['enabled'] = False
config['plugins']['entries']['openclaw-mem0'] = mem0
with open('/root/.openclaw/openclaw.json','w') as f:
    json.dump(config, f, indent=2)
print('PAUSED')
"
openclaw gateway restart 2>/dev/null
echo "OK"
""")
    
    addon.status = "paused"
    await db.commit()
    
    return {"success": True, "message": "Memory paused. Your butler will stop learning but keeps all memories."}


@router.post("/resume")
async def resume_memory(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Resume paused memory"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status != "paused":
        raise HTTPException(status_code=400, detail="Memory is not paused")
    
    vm_ip = await get_customer_vm_ip(customer, db)
    
    await ssh_command(vm_ip, """
python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    config = json.load(f)
mem0 = config.get('plugins',{}).get('entries',{}).get('openclaw-mem0',{})
mem0['enabled'] = True
config['plugins']['entries']['openclaw-mem0'] = mem0
with open('/root/.openclaw/openclaw.json','w') as f:
    json.dump(config, f, indent=2)
print('RESUMED')
"
openclaw gateway restart 2>/dev/null
echo "OK"
""")
    
    addon.status = "active"
    await db.commit()
    
    return {"success": True, "message": "Memory resumed! Your butler is learning again."}


@router.get("/list")
async def list_memories(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """List all stored memories with pagination"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status == "cancelled":
        return {"memories": [], "total": 0, "page": page}
    
    vm_ip = await get_customer_vm_ip(customer, db)
    
    try:
        # Query Qdrant directly via REST API (no Python SDK needed on VM)
        user_id = f"customer-{customer.id}"

        # Get total count with user filter
        count_cmd = (
            'curl -s -X POST http://localhost:6333/collections/memories/points/count '
            '-H "Content-Type: application/json" '
            '-d \'{"filter":{"must":[{"key":"userId","match":{"value":"' + user_id + '"}}]}}\''
        )
        count_raw = await ssh_command(vm_ip, count_cmd, timeout=10)

        total = 0
        try:
            count_data = json.loads(count_raw.strip())
            total = count_data.get("result", {}).get("count", 0)
        except (json.JSONDecodeError, ValueError):
            pass

        # Scroll points with filter, payload only (no vectors)
        offset_val = (page - 1) * limit
        scroll_cmd = (
            'curl -s -X POST http://localhost:6333/collections/memories/points/scroll '
            '-H "Content-Type: application/json" '
            '-d \'{"filter":{"must":[{"key":"userId","match":{"value":"' + user_id + '"}}]},'
            '"limit":' + str(limit) + ',"with_payload":true,"with_vector":false}\''
        )
        scroll_raw = await ssh_command(vm_ip, scroll_cmd, timeout=15)

        memories = []
        try:
            scroll_data = json.loads(scroll_raw.strip())
            for point in scroll_data.get("result", {}).get("points", []):
                payload = point.get("payload", {})
                text = payload.get("data", payload.get("memory", ""))
                # Use stored category if present, otherwise auto-categorize
                category = payload.get("category") or categorize_memory(text)
                memories.append({
                    "id": str(point.get("id", "")),
                    "text": text,
                    "category": category,
                    "created_at": payload.get("createdAt", payload.get("created_at", "")),
                })
        except (json.JSONDecodeError, ValueError):
            pass

        return {
            "memories": memories,
            "total": total,
            "page": page
        }

    except Exception:
        return {"memories": [], "total": 0, "page": page}


@router.delete("/{memory_id}")
async def delete_memory(
    memory_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Delete a single memory"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status == "cancelled":
        raise HTTPException(status_code=400, detail="Memory is not active")
    
    vm_ip = await get_customer_vm_ip(customer, db)
    
    delete_cmd = (
        f'curl -s -X POST http://localhost:6333/collections/memories/points/delete '
        f'-H "Content-Type: application/json" '
        f'-d \'{{"points": ["{memory_id}"]}}\''
    )
    await ssh_command(vm_ip, delete_cmd)
    
    return {"success": True, "deleted": memory_id}


@router.delete("/all")
async def delete_all_memories(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Delete ALL memories (Forget Everything)"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status == "cancelled":
        raise HTTPException(status_code=400, detail="Memory is not active")
    
    vm_ip = await get_customer_vm_ip(customer, db)
    
    user_id = f"customer-{customer.id}"
    delete_all_cmd = (
        'curl -s -X POST http://localhost:6333/collections/memories/points/delete '
        '-H "Content-Type: application/json" '
        '-d \'{"filter":{"must":[{"key":"userId","match":{"value":"' + user_id + '"}}]}}\''
    )
    await ssh_command(vm_ip, delete_all_cmd)
    
    return {"success": True, "message": "All memories deleted."}


@router.get("/export")
async def export_memories(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Export all memories as JSON (GDPR data portability)"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status == "cancelled":
        raise HTTPException(status_code=400, detail="Memory is not active")
    
    vm_ip = await get_customer_vm_ip(customer, db)
    
    user_id = f"customer-{customer.id}"
    scroll_cmd = (
        'curl -s -X POST http://localhost:6333/collections/memories/points/scroll '
        '-H "Content-Type: application/json" '
        '-d \'{"filter":{"must":[{"key":"userId","match":{"value":"' + user_id + '"}}]},'
        '"limit":1000,"with_payload":true,"with_vector":false}\''
    )
    raw = await ssh_command(vm_ip, scroll_cmd, timeout=30)
    
    memories = []
    try:
        scroll_data = json.loads(raw.strip())
        for point in scroll_data.get("result", {}).get("points", []):
            payload = point.get("payload", {})
            text = payload.get("data", payload.get("memory", ""))
            category = payload.get("category") or categorize_memory(text)
            memories.append({
                "id": str(point.get("id", "")),
                "text": text,
                "category": category,
                "created_at": payload.get("createdAt", payload.get("created_at", "")),
            })
    except (json.JSONDecodeError, ValueError):
        pass
    
    export_data = {
        "memories": memories,
        "exported_at": datetime.utcnow().isoformat(),
        "customer_id": customer.id
    }
    
    return JSONResponse(
        content=export_data,
        headers={
            "Content-Disposition": f"attachment; filename=butlr-memories-{customer.id}.json"
        }
    )


# ============== BILLING INTEGRATION ==============

@router.get("/billing-info")
async def get_memory_billing_info(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get memory addon billing info for the billing page"""
    customer = await get_authenticated_customer(credentials, db)
    addon = await get_memory_addon(customer.id, db)
    
    if not addon or addon.status == "cancelled":
        return {
            "active": False,
            "addon_type": "memory",
            "name": "Memory",
            "description": "Persistent AI memory — your butler remembers everything",
            "price_cents": 1000,
            "currency": "eur",
            "status": "inactive",
        }
    
    return {
        "active": addon.status == "active",
        "addon_type": "memory",
        "name": "Memory",
        "description": "Persistent AI memory — your butler remembers everything",
        "price_cents": addon.price_cents or 1000,
        "currency": addon.currency or "eur",
        "status": addon.status,
        "activated_at": addon.activated_at.isoformat() if addon.activated_at else None,
        "stripe_item_id": addon.stripe_subscription_item_id,
    }
