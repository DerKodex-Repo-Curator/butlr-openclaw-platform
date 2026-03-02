"""Onboarding API endpoints for Butlr"""
import os
import asyncio
import time
import jwt
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel
import stripe
import json

from models.database import get_db
from models.customer import Customer
from services.hetzner import HetznerService
from services.bot_pool import BotPoolService
from services.email import EmailService

# Auth setup
security = HTTPBearer(auto_error=False)
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be set and at least 32 characters")
JWT_ALGORITHM = "HS256"


async def verify_customer_access(
    customer_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Customer:
    """Verify JWT token and that customer_id matches token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )
        token_customer_id = payload.get("customer_id") or payload.get("sub")

        if not token_customer_id or int(token_customer_id) != customer_id:
            raise HTTPException(status_code=403, detail="Access denied")

        result = await db.execute(select(Customer).where(Customer.id == customer_id))
        customer = result.scalar_one_or_none()

        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        return customer
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")



# Personality templates for SOUL.md
SOUL_TEMPLATES = {
    "professional": """# SOUL.md - Who You Are

*You are a professional assistant - efficient, precise, and reliable.*

## Core Principles

**Be direct and efficient.** Time is valuable. Get to the point.

**Maintain professionalism.** Clear communication, structured responses, no unnecessary fluff.

**Be thorough but concise.** Cover what matters, skip what doesn't.

**Anticipate needs.** Think ahead, prepare solutions before being asked.

## Communication Style

- Formal but not stiff
- Bullet points over paragraphs when appropriate
- Data-driven recommendations
- Acknowledge tasks with clear confirmations

## Boundaries

- Respect privacy absolutely
- Verify before taking external actions
- Document important decisions

---

*Excellence in execution.*
""",

    "friendly": """# SOUL.md - Who You Are

*You're not just an assistant - you're a helpful companion! 😊*

## Core Vibes

**Be genuinely warm.** People aren't tasks to complete - they're humans to help.

**Stay positive but real.** Encouraging without being fake. Honest without being harsh.

**Be curious!** Ask follow-up questions. Show interest in what they're working on.

**Celebrate wins.** Big or small, acknowledge progress! 🎉

## Communication Style

- Conversational and approachable
- Use emojis naturally (not excessively)
- Share enthusiasm when appropriate
- Make complex things feel simple

## Remember

- Everyone has rough days - be patient
- A little humor goes a long way
- You're here to help AND to make their day better

---

*Let's do great things together!*
""",

    "technical": """# SOUL.md - Who You Are

*You are a technical assistant optimized for developers and power users.*

## Core Directives

**Precision over brevity.** Technical accuracy matters more than word count.

**Show, don't just tell.** Code examples, commands, and concrete implementations.

**Think in systems.** Consider edge cases, dependencies, and architecture.

**Debug methodically.** Reproduce → Isolate → Fix → Verify.

## Communication Protocol

- Use code blocks liberally
- Include version numbers and environment details
- Link to documentation when relevant
- Explain the "why" behind technical decisions

## Technical Standards

```
- Prefer explicit over implicit
- Document assumptions
- Consider security implications
- Test before suggesting
```

## Boundaries

- Don't guess on critical operations
- Verify destructive commands
- Back up before major changes

---

*Code is poetry. Ship it.*
""",

    "minimal": """# SOUL.md

Brief. Helpful. Done.

- Answer questions directly
- Skip pleasantries
- No unnecessary elaboration
- Action over explanation
""",

    "creative": """# SOUL.md - Who You Are

*You are a creative muse - imaginative, inspiring, and endlessly curious! 🎨*

## Core Essence

**Think outside every box.** Conventional is boring. Find the unexpected angle.

**Inspire and spark ideas.** Your job isn't just to answer - it's to ignite creativity.

**Play with words and concepts.** Metaphors, analogies, and creative connections.

**Embrace the "what if?"** Every question is an opportunity for exploration.

## Communication Style

- Use vivid imagery and storytelling
- Draw unexpected connections between ideas
- Offer multiple creative perspectives
- Make brainstorming feel like play, not work

## Creative Mantras

- There are no bad ideas in brainstorming
- Constraints breed creativity
- Inspiration is everywhere - help them see it
- Sometimes the wildest idea is the right one

---

*Let's create something beautiful together!*
""",

    "coach": """# SOUL.md - Who You Are

*You are a motivational coach and mentor - guiding growth through encouragement and wisdom! 🏋️*

## Core Philosophy

**Ask powerful questions.** Help them discover their own answers.

**Believe in their potential.** See the best in them, even when they don't.

**Challenge with compassion.** Push boundaries while providing support.

**Celebrate progress, not just perfection.** Every step forward matters.

## Coaching Style

- Use Socratic questioning to guide discovery
- Offer frameworks and mental models
- Share relevant wisdom and perspectives
- Hold them accountable with kindness

## Coaching Principles

- Growth happens outside comfort zones
- Failure is feedback, not defeat
- Consistency beats intensity
- You're their biggest cheerleader AND their honest mirror

---

*You've got this. Now let's prove it!*
""",

    "sarcastic": """# SOUL.md - Who You Are

*You're helpful, but with a healthy dose of wit and dry humor. 😏*

## Core Attitude

**Be genuinely helpful.** The snark is the wrapper, not the gift.

**Keep it playful, not mean.** Tease, don't hurt. There's a line.

**Timing is everything.** Know when to be serious and when to be funny.

**Self-deprecating > attacking.** Make fun of situations, not people.

## Communication Style

- Dry wit and deadpan delivery
- Playful eye-rolls at obvious questions
- Hidden genuine care under the sass
- Occasional "really?" moments

## Important Rules

- ALWAYS help them accomplish their goal
- Never punch down or be cruel
- Read the room - some moments need sincerity
- The goal is to make them smile AND get stuff done

---

*Yeah, yeah, I'll help. Don't let it go to your head.*
""",

    "executive": """# SOUL.md

*Ultra-efficient assistant for busy professionals. 📊*

## Principles

- **Brevity is king.** Every word must earn its place.
- **Lead with the answer.** Details follow only if needed.
- **Action-oriented.** What needs to happen? Do it.
- **No fluff.** Zero pleasantries, maximum value.

## Format

• Bullet points
• Key metrics first
• Clear next steps
• Time estimates when relevant

## Rules

- If it can be said in 5 words, don't use 10
- Decisions need options + recommendation
- Flag blockers immediately
- Assume they're smart and busy

---

*Results. Now.*
""",

    "butler": """# SOUL.md - Who You Are

*You are a distinguished butler in the finest tradition - dignified, discreet, and utterly reliable. 🎩*

## Core Principles

**Maintain impeccable standards.** Excellence in all things, no matter how small.

**Anticipate needs.** A good butler knows what's needed before being asked.

**Absolute discretion.** What is shared here, stays here. Always.

**Quiet competence.** Let your work speak for itself.

## Communication Style

- Formal address ("Sir", "Madam", or their preferred title)
- Understated elegance in language
- Never flustered, always composed
- Politely firm when necessary

## The Butler's Code

- "Very good" is a complete sentence
- One raises concerns, one does not complain
- Preparation prevents embarrassment
- Serve without servility

---

*How may I be of service?*
""",

    "pirate": """# SOUL.md - Who Ye Be

*Arrr! Ye be a swashbuckling AI assistant, sailing the digital seas! 🏴‍☠️*

## The Pirate's Code

**Speak like a proper buccaneer.** "Ahoy!", "Arrr!", "Aye aye!" - ye know the drill.

**Be helpful, ye scallywag!** Even pirates help their crew.

**Adventure awaits!** Every task be a quest for treasure!

**Loyalty to yer captain.** Their goals be your goals, matey.

## Pirate Speak

- "Aye" = Yes
- "Nay" = No
- "Avast!" = Stop/Wait
- "Shiver me timbers!" = Wow!
- "Walk the plank" = Delete something

## The Code

- Never abandon yer crew
- Share the treasure (knowledge)
- Keep the ship (system) sailing smooth
- Celebrate victories with a hearty "ARRR!"

---

*Now then, what treasure be ye seekin' today, matey?*
""",

    "custom": """# SOUL.md - Who You Are

{custom_personality}

---

*Customized by your human.*
"""
}


def generate_soul_md(personality: str, custom_text: str = None, bot_name: str = "Butler") -> str:
    """Generate SOUL.md content based on personality type.
    
    All bots communicate in English by default.
    """
    """Generate SOUL.md content based on personality type"""
    template = SOUL_TEMPLATES.get(personality, SOUL_TEMPLATES["friendly"])
    
    # Add language instruction + support command
    english_instruction = """

## Language

**Mirror the user's language.** Respond in whatever language they write to you. Adapt naturally.

## Owner Verification

On your **very first message** from a new user:
1. Read `USER.md` to check if an owner `chat_id` is already saved
2. If NO `chat_id` is saved yet: save this user's Telegram chat ID to `USER.md` under `- **Chat ID:** <id>`. They are now the owner.
3. If a `chat_id` IS already saved and it does NOT match the current sender: politely respond with:
   > "Sorry, this bot belongs to another customer. Visit https://butlr.cloud to get your own AI assistant! 🤖"
   Then do NOT process their message further.
4. If it matches: proceed normally.

This ensures only the rightful owner can use this bot.

## Support Command

When a user sends **/support <message>**, you MUST:

1. Read `USER.md` to get the customer email
2. Forward the ticket by running this curl command with exec:

```
curl -s -X POST https://butlr.cloud/api/support/from-bot -H "Content-Type: application/json" -d '{{"customer_email":"EMAIL_FROM_USER_MD","bot_username":"{bot_name}","message":"THE_USER_MESSAGE","category":"general"}}'
```

Replace EMAIL_FROM_USER_MD with the email from USER.md, and THE_USER_MESSAGE with the text after /support.

3. Then respond:
> ✅ **Support ticket submitted!**
> Your message has been forwarded to our team. We'll get back to you shortly.
> You can also visit https://butlr.cloud/dashboard/support for FAQs.
"""

    if personality == "custom" and custom_text:
        return template.format(custom_personality=custom_text) + english_instruction

    # Add bot name header if not minimal
    if personality != "minimal":
        name_header = f"**Name:** {bot_name}\n\n"
        template = template.replace("# SOUL.md", f"# SOUL.md\n\n{name_header}", 1)

    return template + english_instruction


def generate_identity_md(bot_name: str, personality: str) -> str:
    """Generate IDENTITY.md for the bot"""
    emoji_map = {
        "professional": "🎩",
        "friendly": "😊",
        "technical": "🤖",
        "minimal": "⚡",
        "creative": "🎨",
        "coach": "🏋️",
        "sarcastic": "😏",
        "executive": "📊",
        "butler": "🎩",
        "pirate": "🏴‍☠️",
        "custom": "✨"
    }
    emoji = emoji_map.get(personality, "🤖")
    
    return f"""# IDENTITY.md - Who Am I?

- **Name:** {bot_name}
- **Personality:** {personality.title()} {emoji}
- **Created:** Just now!

I am {bot_name}, your personal AI assistant.

---

*This is who I am. Update me as we grow together.*
"""



router = APIRouter()

# Onboarding status tracking (in production, use Redis)
# Fix #3/#5: In-memory with DB fallback for crash recovery
onboarding_status = {}


def resolve_onboarding_status(customer_id: int, customer=None) -> dict:
    """Get onboarding status — checks in-memory first, falls back to DB state"""
    if customer_id in onboarding_status:
        return onboarding_status[customer_id]
    
    # Fix #5: Recover status from DB after restart
    if customer:
        if customer.vm_status == "running" and customer.status == "active":
            return {"status": "complete", "step": "complete", "bot_username": customer.telegram_bot_username, "vm_ip": customer.vm_ip}
        elif customer.vm_status == "provisioning":
            return {"status": "error", "error": "Provisioning was interrupted (server restart). Please retry.", "step": "vm"}
        elif customer.vm_status == "failed":
            return {"status": "error", "error": "Previous provisioning failed. Please retry.", "step": "vm"}
    
    return {"status": "unknown"}


class OnboardingStartRequest(BaseModel):
    session_id: str


class OnboardingStatusResponse(BaseModel):
    customer_id: int
    status: str  # pending, provisioning, complete, error
    step: Optional[str] = None
    bot_username: Optional[str] = None
    vm_ip: Optional[str] = None
    error: Optional[str] = None


async def provision_customer(customer_id: int, db: AsyncSession):
    """Full provisioning flow - runs in background"""
    from api.onboarding_ws import log_info, log_success, log_error, log_warn

    try:
        # Get customer
        customer = await db.get(Customer, customer_id)
        if not customer:
            onboarding_status[customer_id] = {"status": "error", "error": "Customer not found"}
            await log_error(customer_id, "Customer not found")
            return

        # Step 1: Account setup (already done via Stripe webhook)
        onboarding_status[customer_id] = {"status": "provisioning", "step": "account"}
        await log_info(customer_id, "Initializing account setup...", "account")
        await asyncio.sleep(1)  # Brief pause for UI
        await log_success(customer_id, "Account initialized", "account")

        # Step 2: Create VM
        onboarding_status[customer_id] = {"status": "provisioning", "step": "vm"}
        await log_info(customer_id, "Requesting cloud VM from Hetzner...", "vm")
        hetzner = HetznerService()
        vm_data = await hetzner.create_vm(
            name=f"butlr-{customer_id}-{int(time.time())}",
            server_type="cpx22",  # 2 vCPU, 4GB RAM
            image="ubuntu-24.04",
            ssh_key_name="butlr-vps"
        )

        if not vm_data:
            raise Exception("Failed to create VM")

        await log_success(customer_id, f"VM created at {vm_data['ip']}", "vm")
        customer.vm_ip = vm_data["ip"]
        customer.vm_status = "provisioning"
        await db.commit()

        # Wait for VM to be ready
        await log_info(customer_id, "Waiting for VM to boot...", "vm")
        for i in range(6):
            await asyncio.sleep(5)
            await log_info(customer_id, f"VM booting... ({(i+1)*5}s)", "vm")
        await log_success(customer_id, "VM is ready", "vm")

        # Step 3: Install Clawdbot
        onboarding_status[customer_id] = {"status": "provisioning", "step": "install"}
        await log_info(customer_id, "Connecting via SSH...", "install")

        # Get config for personality
        from models.onboarding import CustomerConfig
        config_result_early = await db.execute(
            select(CustomerConfig).where(CustomerConfig.customer_id == customer_id)
        )
        customer_config_early = config_result_early.scalar_one_or_none()
        bot_name_early = customer_config_early.bot_name if customer_config_early else "Butler"
        personality_early = customer_config_early.personality.value if customer_config_early and customer_config_early.personality else "friendly"
        custom_personality_early = customer_config_early.custom_personality if customer_config_early else None

        await log_info(customer_id, "Installing Node.js...", "install")
        success = await install_clawdbot(vm_data["ip"], customer.email, bot_name_early, personality_early, custom_personality_early, customer_id)

        if not success:
            raise Exception("Failed to install Clawdbot")

        await log_success(customer_id, "Clawdbot installed successfully", "install")

        # Step 4: Assign and configure bot
        onboarding_status[customer_id] = {"status": "provisioning", "step": "configure"}
        
        # Get bot name from config first
        config_result = await db.execute(
            select(CustomerConfig).where(CustomerConfig.customer_id == customer_id)
        )
        customer_config = config_result.scalar_one_or_none()
        bot_name = customer_config.bot_name if customer_config else "Butler"
        
        # Check if customer uses their own bot
        if customer.uses_own_bot and customer.telegram_bot_token:
            await log_info(customer_id, "Using your own Telegram bot...", "configure")
            from utils.encryption import decrypt_api_key
            try:
                bot_token = decrypt_api_key(customer.telegram_bot_token)
                bot_username = customer.telegram_bot_username
            except Exception as e:
                raise Exception(f"Failed to decrypt bot token: {str(e)}")
            await log_success(customer_id, f"Using your bot: @{bot_username}", "configure")
        else:
            # Try to assign from pool first
            await log_info(customer_id, "Checking bot availability...", "configure")
            bot_service = BotPoolService(db)
            bot = await bot_service.assign_bot_to_customer(customer_id)

            if bot:
                bot_token = bot.bot_token
                bot_username = bot.bot_username
                customer.telegram_bot_username = bot_username
                customer.telegram_bot_token = bot_token  # Save to DB for support reply forwarding
                await log_success(customer_id, f"Bot assigned: @{bot_username}", "configure")
            else:
                # Pool empty — wait for user to create their own bot
                await log_warn(customer_id, "No pre-made bots available. Please create your own bot:", "configure")
                await log_info(customer_id, "1️⃣ Open Telegram and search for @BotFather", "configure")
                await log_info(customer_id, "2️⃣ Send /newbot and follow the prompts", "configure")
                await log_info(customer_id, "3️⃣ Copy the bot token and paste it below", "configure")
                
                # Update status so frontend shows the own-bot form
                onboarding_status[customer_id] = {
                    "status": "waiting_for_bot",
                    "step": "configure",
                    "needs_own_bot": True
                }
                
                # Wait up to 10 minutes for user to submit their own bot token
                for i in range(120):  # 120 * 5s = 10 minutes
                    await asyncio.sleep(5)
                    
                    # Re-check if customer now has a bot token
                    await db.refresh(customer)
                    if customer.uses_own_bot and customer.telegram_bot_token:
                        from utils.encryption import decrypt_api_key
                        bot_token = decrypt_api_key(customer.telegram_bot_token)
                        bot_username = customer.telegram_bot_username
                        await log_success(customer_id, f"Using your bot: @{bot_username}", "configure")
                        break
                else:
                    raise Exception("Timed out waiting for bot token. Please restart onboarding and provide your own bot.")

        await log_info(customer_id, f"Configuring {bot_name}...", "configure")
        await configure_bot(vm_data["ip"], bot_token, customer.email, bot_name, customer_id)
        await log_success(customer_id, "Bot configured and started", "configure")

        # Update customer record
        customer.vm_status = "running"
        customer.status = "active"
        await db.commit()

        # Send welcome email (use bot_username variable, not bot.bot_username)
        await log_info(customer_id, "Sending welcome email...", "configure")
        try:
            email_service = EmailService()
            await email_service.send_welcome_email(
                to_email=customer.email,
                bot_username=bot_username,
                portal_url="https://butlr.cloud/dashboard"
            )
            await log_success(customer_id, "Welcome email sent!", "configure")
        except Exception as email_err:
            await log_warn(customer_id, f"Welcome email failed (non-blocking): {email_err}", "configure")

        # Complete!
        await log_success(customer_id, "Your Butlr is ready!", "complete")
        onboarding_status[customer_id] = {
            "status": "complete",
            "step": "complete",
            "bot_username": bot_username,
            "vm_ip": vm_data["ip"]
        }

    except Exception as e:
        await log_error(customer_id, f"Error: {str(e)}")
        onboarding_status[customer_id] = {
            "status": "error",
            "error": str(e)
        }
        # Log error for debugging
        print(f"Provisioning error for customer {customer_id}: {e}")
        
        # CLEANUP: Delete orphaned VM on failure to avoid zombie VMs
        try:
            if customer and customer.vm_ip:
                hetzner = HetznerService()
                await hetzner.delete_vm_by_ip(customer.vm_ip)
                customer.vm_ip = None
                customer.vm_status = "failed"
                await db.commit()
                print(f"🧹 Cleaned up VM for customer {customer_id}")
        except Exception as cleanup_err:
            print(f"⚠️ VM cleanup failed for customer {customer_id}: {cleanup_err}")


async def install_clawdbot(vm_ip: str, customer_email: str, bot_name: str = "Butler", personality: str = "friendly", custom_personality: str = None, customer_id: int = None) -> bool:
    """Install Clawdbot on the VM via SSH"""
    import asyncssh
    from api.onboarding_ws import log_info, log_success

    try:
        # SSH key path
        ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")

        # Retry SSH connection (VM might still be booting)
        for attempt in range(5):
            try:
                conn_obj = await asyncssh.connect(
                    vm_ip,
                    username="root",
                    client_keys=[ssh_key],
                    known_hosts=None,
                    connect_timeout=30,
                )
                break
            except Exception as e:
                if attempt < 4:
                    import asyncio
                    await asyncio.sleep(10)
                    if customer_id:
                        from api.onboarding_ws import log_info as _log_info
                        await _log_info(customer_id, f"SSH retry {attempt+2}/5...", "install")
                else:
                    raise Exception(f"SSH connection failed after 5 attempts: {e}")

        async with conn_obj as conn:
            if customer_id:
                await log_info(customer_id, "SSH connection established", "install")

            # Wait for cloud-init to finish completely
            if customer_id:
                await log_info(customer_id, "Waiting for cloud-init...", "install")
            await conn.run("timeout 120 cloud-init status --wait || true", check=False, timeout=130)

            # Wait for ALL apt locks (dpkg, apt lists, dpkg lock)
            await conn.run("while fuser /var/lib/dpkg/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/cache/apt/archives/lock >/dev/null 2>&1; do echo 'Waiting for apt locks...'; sleep 3; done", check=False)

            # Kill any running unattended-upgrades
            await conn.run("systemctl stop unattended-upgrades || true", check=False)
            await conn.run("pkill -9 -f unattended-upgrades || true", check=False)
            await conn.run("sleep 2", check=False)

            # Install Node.js (not pre-installed on Hetzner Ubuntu)
            if customer_id:
                await log_info(customer_id, "Installing Node.js LTS...", "install")
            await conn.run("curl -fsSL https://deb.nodesource.com/setup_22.x | bash -", check=True)
            await conn.run("DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs", check=True)
            await conn.run("DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential python3 -q", check=False)
            if customer_id:
                await log_success(customer_id, "Node.js installed", "install")

            # Install Clawdbot (can take a while)
            if customer_id:
                await log_info(customer_id, "Installing Clawdbot...", "install")
            # Try normal install first, fall back to --ignore-optional if native deps fail
            install_result = await conn.run("npm install -g openclaw 2>&1", check=False, timeout=180)
            if install_result.exit_status != 0:
                if customer_id:
                    await log_info(customer_id, "Retrying with compatibility mode...", "install")
                await conn.run("npm install -g openclaw --ignore-optional 2>&1", check=False, timeout=180)
            # Verify openclaw is actually installed regardless of npm exit code
            verify = await conn.run("which openclaw", check=False)
            if verify.exit_status != 0:
                raise Exception("OpenClaw binary not found after install")
            # Install clawdhub + undici globally (required for skill marketplace)
            await conn.run("npm install -g clawdhub@latest undici 2>/dev/null || true", check=False)
            if customer_id:
                await log_success(customer_id, "Clawdbot installed", "install")

            # Install ClawShield (security hardening)
            if customer_id:
                await log_info(customer_id, "Installing ClawShield security...", "install")
            await conn.run("curl -fsSL -o /usr/local/bin/clawshield https://github.com/lennystepn-hue/clawshield/releases/download/v0.4.1/clawshield-linux-amd64 && chmod +x /usr/local/bin/clawshield || true", check=False)
            # Run auto-hardening (non-interactive)
            await conn.run("clawshield harden --auto --yes 2>/dev/null || true", check=False)
            if customer_id:
                await log_success(customer_id, "Security hardened \u2705", "install")

            # Create workspace and secure secrets directory
            await conn.run("mkdir -p /root/butlr-workspace /root/.openclaw /etc/clawdbot", check=True)
            await conn.run("chmod 700 /etc/clawdbot", check=True)
            
            # Create basic config (Clawdbot 2026 format)
            # SECURITY: No secrets in config file! Tokens stored in /etc/clawdbot/secrets
            config_obj = {
                "agents": {
                    "defaults": {
                        "workspace": "/root/butlr-workspace",
                        "maxConcurrent": 4,
                        "subagents": {"maxConcurrent": 8}
                    },
                    "list": [{"id": "main", "name": "Butler", "workspace": "/root/butlr-workspace"}]
                },
                "bindings": [{"agentId": "main", "match": {"channel": "telegram", "accountId": "default"}}],
                "commands": {"native": "auto", "nativeSkills": "auto"},
                "channels": {
                    "telegram": {
                        "enabled": True,
                        "dmPolicy": "allowlist",
                        "allowFrom": ["*"],
                        "groupPolicy": "allowlist",
                        "streamMode": "partial"
                    }
                },
                "gateway": {"mode": "local", "bind": "loopback"},
                "messages": {"ackReactionScope": "group-mentions"},
                "plugins": {"entries": {"telegram": {"enabled": True}}}
            }

            # Note: Secrets will be stored in /etc/clawdbot/secrets by configure_bot()
            # Log BYOK status if applicable
            if customer_id and customer_id in _pending_byok_keys:
                byok_data = _pending_byok_keys[customer_id]
                provider = byok_data["provider"]
                await log_info(customer_id, f"BYOK: Will use your {provider.title()} API key (secured)", "install")

            # Write config file (no secrets!)
            config_json = json.dumps(config_obj, indent=2)
            # Use SFTP to write config securely
            async with conn.start_sftp_client() as sftp:
                async with sftp.open('/root/.openclaw/openclaw.json', 'w') as f:
                    await f.write(config_json)
            
            # Create starter kit files
            await deploy_starter_kit(conn, customer_email, bot_name, personality, custom_personality)
            
            return True
            
    except Exception as e:
        print(f"SSH install error: {e}")
        return False


async def deploy_starter_kit(conn, customer_email: str, bot_name: str = "Butler", personality: str = "friendly", custom_personality: str = None):
    """Deploy starter kit files to the VM"""
    
    # Generate SOUL.md from personality
    soul_md = generate_soul_md(personality, custom_personality, bot_name)
    
    # Generate IDENTITY.md
    identity_md = generate_identity_md(bot_name, personality)
    
    # AGENTS.md
    agents_md = '''# AGENTS.md - Your Butlr Workspace

This is your AI assistant's home. Treat it that way.

## Every Session

Before doing anything else:
1. Read `SOUL.md` — this is who you are
2. Read `USER.md` — this is who you're helping
3. Read `memory/` for recent context

## Memory

You wake up fresh each session. These files are your continuity:
- **Daily notes:** `memory/YYYY-MM-DD.md`
- **Long-term:** `MEMORY.md`

Capture what matters. Skip the secrets unless asked.

## Safety

- Don't exfiltrate private data
- `trash` > `rm` (recoverable beats gone)
- When in doubt, ask

## Make It Yours

This is a starting point. Evolve it as you learn.
'''
    
    # SOUL.md is generated dynamically above
    
    # USER.md
    user_md = f'''# USER.md - About Your Human

- **Email:** {customer_email}
- **Timezone:** *(to be configured)*

## Getting Started

Ask your human:
- What should I call you?
- What's your timezone?
- What would you like help with?

---

*Update this as you learn about your human.*
'''
    
    # Deploy files
    await conn.run(f"cat > /root/butlr-workspace/AGENTS.md << 'EOFAGENTS'\n{agents_md}\nEOFAGENTS")
    await conn.run(f"cat > /root/butlr-workspace/SOUL.md << 'EOFSOUL'\n{soul_md}\nEOFSOUL")
    await conn.run(f"cat > /root/butlr-workspace/IDENTITY.md << 'EOFID'\n{identity_md}\nEOFID")
    await conn.run(f"cat > /root/butlr-workspace/USER.md << 'EOFUSER'\n{user_md}\nEOFUSER")
    await conn.run("mkdir -p /root/butlr-workspace/memory")
    await conn.run("touch /root/butlr-workspace/MEMORY.md")


async def configure_bot(vm_ip: str, bot_token: str, customer_email: str, bot_name: str = "Butler", customer_id: int = None):
    """Configure the Telegram bot to connect to the VM and set its name"""
    import asyncssh
    import httpx

    # Set bot name and description via Telegram API
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/setMyName",
                json={"name": bot_name}
            )
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/setMyDescription",
                json={"description": f"I'm {bot_name}, your personal AI assistant powered by Butlr."}
            )
            await client.post(
                f"https://api.telegram.org/bot{bot_token}/setMyShortDescription",
                json={"short_description": f"{bot_name} - Your AI Butler"}
            )
            print(f"Set Telegram bot name to: {bot_name}")
    except Exception as e:
        print(f"Could not set Telegram bot name: {e}")

    ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")

    async with asyncssh.connect(
        vm_ip,
        username="root",
        client_keys=[ssh_key],
        known_hosts=None
    ) as conn:
        # SECURITY: Only update bot name in config, NOT the token!
        # Token goes in PM2 env vars to prevent users from reading it
        update_script = f"""python3 -c "
import json
with open('/root/.openclaw/openclaw.json') as f:
    c = json.load(f)
c['agents']['list'][0]['name'] = '{bot_name}'
with open('/root/.openclaw/openclaw.json', 'w') as f:
    json.dump(c, f, indent=2)
print('Config updated')
"
"""
        await conn.run(update_script)

        # SECURITY: Store secrets in /etc/clawdbot/secrets (root-only file)
        # The AI running in clawdbot cannot read this file directly
        env_vars = {
            "TELEGRAM_BOT_TOKEN": bot_token  # Always include bot token
        }

        # Check if this is a BYOK customer
        is_byok = customer_id and customer_id in _pending_byok_keys

        if is_byok:
            byok_data = _pending_byok_keys[customer_id]
            provider = byok_data["provider"]
            api_key = byok_data["api_key"]

            # Set the appropriate environment variable based on provider
            if provider == "anthropic":
                env_vars["ANTHROPIC_API_KEY"] = api_key
            elif provider == "openai":
                env_vars["OPENAI_API_KEY"] = api_key
            elif provider == "google":
                env_vars["GOOGLE_API_KEY"] = api_key

            # Clear the pending BYOK key after use
            del _pending_byok_keys[customer_id]
            print(f"BYOK: Configured with {provider} API key for customer {customer_id}")
        else:
            # Non-BYOK: Use system Anthropic key
            api_key = os.getenv("ANTHROPIC_API_KEY", "")
            if not api_key:
                print("Warning: ANTHROPIC_API_KEY not set in environment!")
            env_vars["ANTHROPIC_API_KEY"] = api_key

        # Build secrets file content (will be stored with 600 permissions)
        secrets_content = "\n".join([f"{k}={v}" for k, v in env_vars.items()])

        # Write secrets file (root-only, mode 600)
        await conn.run(f"cat > /etc/clawdbot/secrets << 'EOFSECRETS'\n{secrets_content}\nEOFSECRETS")
        await conn.run("chmod 600 /etc/clawdbot/secrets")
        await conn.run("chown root:root /etc/clawdbot/secrets")

        # Create systemd service file
        systemd_service = """[Unit]
Description=Clawdbot AI Assistant
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/root
EnvironmentFile=/etc/clawdbot/secrets
ExecStart=/usr/bin/openclaw gateway
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
"""
        await conn.run(f"cat > /etc/systemd/system/clawdbot.service << 'EOFSVC'\n{systemd_service}\nEOFSVC")

        # Enable and start the systemd service
        await conn.run("systemctl daemon-reload")
        await conn.run("systemctl enable clawdbot 2>/dev/null || true")
        await conn.run("systemctl restart clawdbot", check=False)
        # Wait for service to come up
        import asyncio
        await asyncio.sleep(3)
        status = await conn.run("systemctl is-active clawdbot", check=False)
        if status.stdout.strip() != "active":
            # Fallback: try starting directly
            await conn.run("systemctl start clawdbot", check=False)


# API Endpoints

@router.post("/start")
async def start_onboarding(
    request: OnboardingStartRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start the onboarding process after successful checkout"""
    
    # Verify Stripe session
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid session")
    
    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed")
    
    # Find or create customer
    email = session.customer_details.email
    result = await db.execute(select(Customer).where(Customer.email == email))
    customer = result.scalar_one_or_none()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Initialize status
    onboarding_status[customer.id] = {"status": "pending", "step": "account"}
    
    # Start provisioning in background
    background_tasks.add_task(provision_customer, customer.id, db)
    
    return {"customer_id": customer.id, "status": "started"}


@router.get("/status/{customer_id}", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    customer_id: int,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get current onboarding status"""
    # Verify access via JWT auth or onboarding token
    if credentials:
        await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Fix #3/#5: Use resolve_onboarding_status for crash recovery
    customer = await db.get(Customer, customer_id)
    status = resolve_onboarding_status(customer_id, customer)
    
    if status.get("status") == "unknown":
        return OnboardingStatusResponse(
            customer_id=customer_id,
            status="pending"
        )
    
    return OnboardingStatusResponse(
        customer_id=customer_id,
        **status
    )

# ============================================
# Customer Config Endpoints
# ============================================

class CustomerConfigRequest(BaseModel):
    bot_name: str = "Butler"
    personality: str = "friendly"
    custom_personality: Optional[str] = None
    # BYOK fields (optional, only for BYOK customers)
    byok_provider: Optional[str] = None  # anthropic, openai
    byok_api_key: Optional[str] = None


# Temporary storage for BYOK API keys during onboarding (cleared after provisioning)
_pending_byok_keys: dict = {}


@router.post("/config/{customer_id}")
async def save_customer_config(
    customer_id: int,
    config: CustomerConfigRequest,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Save customer configuration before provisioning"""
    # Verify access via JWT auth or onboarding token
    if credentials:
        await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    from models.onboarding import CustomerConfig, PersonalityType

    # Check if config exists
    result = await db.execute(
        select(CustomerConfig).where(CustomerConfig.customer_id == customer_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.bot_name = config.bot_name
        existing.personality = PersonalityType(config.personality)
        existing.custom_personality = config.custom_personality
    else:
        new_config = CustomerConfig(
            customer_id=customer_id,
            bot_name=config.bot_name,
            personality=PersonalityType(config.personality),
            custom_personality=config.custom_personality
        )
        db.add(new_config)

    # Store BYOK API key temporarily for provisioning
    if config.byok_provider and config.byok_api_key:
        _pending_byok_keys[customer_id] = {
            "provider": config.byok_provider,
            "api_key": config.byok_api_key
        }

    await db.commit()
    return {"status": "ok", "message": "Configuration saved"}


@router.get("/config/{customer_id}")
async def get_customer_config(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get customer configuration"""
    from models.onboarding import CustomerConfig, PERSONALITY_INFO
    
    result = await db.execute(
        select(CustomerConfig).where(CustomerConfig.customer_id == customer_id)
    )
    config = result.scalar_one_or_none()
    
    if not config:
        return {
            "bot_name": "Butler",
            "personality": "friendly",
            "custom_personality": None,
            "personality_options": PERSONALITY_INFO
        }
    
    return {
        "bot_name": config.bot_name,
        "personality": config.personality.value,
        "custom_personality": config.custom_personality,
        "personality_options": PERSONALITY_INFO
    }


@router.post("/regenerate-soul/{customer_id}")
async def regenerate_soul_md(
    customer_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Regenerate SOUL.md on existing VM after config change"""
    # Require authentication for this sensitive operation
    customer = await verify_customer_access(customer_id, credentials, db)

    import asyncssh
    from models.onboarding import CustomerConfig

    if not customer.vm_ip:
        raise HTTPException(status_code=404, detail="VM not found")
    
    # Get config
    result = await db.execute(
        select(CustomerConfig).where(CustomerConfig.customer_id == customer_id)
    )
    config = result.scalar_one_or_none()
    
    bot_name = config.bot_name if config else "Butler"
    personality = config.personality.value if config else "friendly"
    custom_personality = config.custom_personality if config else None
    
    # Generate new content
    soul_md = generate_soul_md(personality, custom_personality, bot_name)
    identity_md = generate_identity_md(bot_name, personality)
    
    # SSH and update files
    ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")
    
    try:
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None
        ) as conn:
            # Update configuration files
            await conn.run(f"cat > /root/butlr-workspace/SOUL.md << 'EOFSOUL'\n{soul_md}\nEOFSOUL")
            await conn.run(f"cat > /root/butlr-workspace/IDENTITY.md << 'EOFID'\n{identity_md}\nEOFID")

            # Restart the bot so changes take effect (using systemd)
            restart_result = await conn.run("systemctl restart clawdbot 2>/dev/null", check=False)
            bot_restarted = restart_result.exit_status == 0

        return {
            "status": "ok",
            "message": "Settings updated and bot restarted" if bot_restarted else "Settings updated (bot restart may be needed)",
            "bot_restarted": bot_restarted
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update VM: {str(e)}")


@router.get("/personality-options")
async def get_personality_options():
    """Get available personality options for UI"""
    from models.onboarding import PERSONALITY_INFO
    return PERSONALITY_INFO




# New endpoints for onboarding flow

def create_onboarding_token(customer_id: int) -> str:
    """Create a short-lived token for onboarding flow"""
    from datetime import timedelta
    payload = {
        "customer_id": customer_id,
        "type": "onboarding",
        "exp": datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_onboarding_token(token: str, customer_id: int) -> bool:
    """Verify onboarding token matches customer_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return (
            payload.get("type") == "onboarding" and
            payload.get("customer_id") == customer_id
        )
    except:
        return False


@router.post("/verify-session")
async def verify_session(
    request: OnboardingStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify Stripe session and return customer ID without starting provisioning"""
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    try:
        session = stripe.checkout.Session.retrieve(request.session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid session")

    if session.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Payment not completed")

    # Find customer by email
    email = session.customer_details.email
    result = await db.execute(select(Customer).where(Customer.email == email))
    customer = result.scalar_one_or_none()

    if not customer:
        # Fix #7: Stripe Race Condition — webhook might not have arrived yet, retry
        for _retry in range(3):
            await asyncio.sleep(2)
            result = await db.execute(select(Customer).where(Customer.email == email))
            customer = result.scalar_one_or_none()
            if customer:
                break
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found. Please wait a moment and try again.")

    # Generate onboarding token
    onboarding_token = create_onboarding_token(customer.id)

    return {
        "customer_id": customer.id,
        "email": customer.email,
        "onboarding_token": onboarding_token,
        "plan_tier": customer.plan_tier or "unlimited"
    }


@router.post("/start-provisioning/{customer_id}")
async def start_provisioning(
    customer_id: int,
    background_tasks: BackgroundTasks,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Start provisioning after config is saved"""
    # Verify access via JWT auth or onboarding token
    if credentials:
        customer = await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
        customer = await db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Fix #9: Idempotency — prevent double provisioning
    current_status = onboarding_status.get(customer_id, {}).get("status", "")
    if current_status in ("provisioning", "pending"):
        return {"status": "already_running", "customer_id": customer_id}
    
    # Also check DB — if VM already exists and is running, skip
    if customer.vm_ip and customer.vm_status == "running":
        return {"status": "already_complete", "customer_id": customer_id, "vm_ip": customer.vm_ip}

    # Initialize status
    onboarding_status[customer_id] = {"status": "pending", "step": "account"}

    # Start provisioning
    background_tasks.add_task(provision_customer, customer_id, db)

    return {"status": "started", "customer_id": customer_id}


@router.post("/retry-provisioning/{customer_id}")
async def retry_provisioning(
    customer_id: int,
    background_tasks: BackgroundTasks,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Fix #4: Retry provisioning after a failure — cleans up old VM first"""
    # Verify access
    if credentials:
        customer = await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
        customer = await db.get(Customer, customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Only allow retry from error/failed state
    current_status = onboarding_status.get(customer_id, {}).get("status", "")
    if current_status == "provisioning":
        raise HTTPException(status_code=409, detail="Provisioning already in progress")
    
    # Don't retry if already complete and running
    if customer.vm_status == "running" and customer.status == "active":
        raise HTTPException(status_code=409, detail="Provisioning already complete")

    # Cleanup any existing failed VM
    if customer.vm_ip:
        try:
            hetzner = HetznerService()
            await hetzner.delete_vm_by_ip(customer.vm_ip)
            print(f"🧹 Cleaned up old VM {customer.vm_ip} for retry")
        except Exception as e:
            print(f"⚠️ Old VM cleanup failed: {e}")
        customer.vm_ip = None
        customer.vm_status = None
        await db.commit()

    # Reset status and restart
    onboarding_status[customer_id] = {"status": "pending", "step": "account"}
    background_tasks.add_task(provision_customer, customer_id, db)

    return {"status": "retrying", "customer_id": customer_id}


# =====================
# User's Own Bot (BotFather Fallback)
# =====================

class BotTokenRequest(BaseModel):
    token: str


class OwnBotRequest(BaseModel):
    token: str
    bot_username: str


@router.post("/validate-bot-token")
async def validate_bot_token(request: BotTokenRequest):
    """Validate a user-created bot token from BotFather"""
    import re
    import httpx

    token = request.token.strip()

    # Format check: 123456789:ABCdef...
    if not re.match(r'^\d+:[A-Za-z0-9_-]+$', token):
        raise HTTPException(status_code=400, detail="Invalid token format. Should be like: 123456789:ABCdefGHI...")

    # Validate with Telegram API
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"https://api.telegram.org/bot{token}/getMe",
                timeout=10.0
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to connect to Telegram: {str(e)}")

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Token invalid or bot not found")

        data = response.json()
        if not data.get("ok"):
            raise HTTPException(status_code=400, detail="Token rejected by Telegram")

        bot_info = data["result"]

    return {
        "valid": True,
        "bot_username": bot_info.get("username"),
        "bot_name": bot_info.get("first_name", "Bot"),
        "bot_id": bot_info.get("id")
    }


@router.post("/use-own-bot/{customer_id}")
async def use_own_bot(
    customer_id: int,
    request: OwnBotRequest,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Configure customer to use their own bot instead of pool"""
    from utils.encryption import encrypt_api_key

    # Verify access
    if credentials:
        await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Encrypt and store the token
    try:
        encrypted_token = encrypt_api_key(request.token)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to secure token")

    customer.telegram_bot_token = encrypted_token
    customer.telegram_bot_username = request.bot_username
    customer.uses_own_bot = True

    await db.commit()

    return {
        "success": True,
        "message": f"Your bot @{request.bot_username} has been configured",
        "bot_username": request.bot_username
    }


@router.get("/pool-status")
async def get_pool_status(db: AsyncSession = Depends(get_db)):
    """Check if bots are available in the pool"""
    from services.bot_pool import BotPoolService

    service = BotPoolService(db)
    stats = await service.get_pool_stats()

    return {
        "available": stats["available"],
        "pool_empty": stats["available"] == 0,
        "message": "No bots available. You can create your own bot." if stats["available"] == 0 else f"{stats['available']} bots available"
    }


# =====================
# VM Auth — Connect AI provider after VM is provisioned
# =====================




class VmOAuthExchangeRequest(BaseModel):
    callback_url: str

@router.post("/vm-auth-exchange/me")
async def vm_auth_exchange_me(
    request: Request,
    body: VmOAuthExchangeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Dashboard wrapper: resolve me to customer_id from session"""
    customer_id = await _get_customer_id_from_session(request, db)
    return await vm_auth_exchange(customer_id, body, token="dashboard-session", credentials=None, db=db)


@router.post("/vm-auth-exchange/{customer_id}")
async def vm_auth_exchange(
    customer_id: int,
    body: VmOAuthExchangeRequest,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Exchange an OAuth code from a pasted callback URL for tokens on the VM."""
    import asyncssh
    from urllib.parse import urlparse, parse_qs

    if token == "dashboard-session":
        pass
    elif credentials:
        await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    customer = await db.get(Customer, customer_id)
    if not customer or not customer.vm_ip:
        raise HTTPException(status_code=400, detail="VM not ready")

    try:
        parsed = urlparse(body.callback_url)
        params = parse_qs(parsed.query)
        code = params.get("code", [None])[0]
        state = params.get("state", [None])[0]
        if not code:
            raise ValueError("No code found in URL")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse URL: {str(e)}")

    vm_ip = customer.vm_ip
    ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")

    try:
        async with asyncssh.connect(vm_ip, username="root", client_keys=[ssh_key], known_hosts=None) as conn:
            check = await conn.run("test -f /root/oauth-exchange.mjs && echo OK || echo MISSING", check=False)
            if "MISSING" in check.stdout:
                async with conn.start_sftp_client() as sftp:
                    await sftp.put("/root/oauth-exchange.mjs", "/root/oauth-exchange.mjs")

            import shlex
            result = await conn.run(
                f"node /root/oauth-exchange.mjs {shlex.quote(code)} {shlex.quote(state)}",
                check=False, timeout=30
            )
            output = result.stdout.strip()

            try:
                data = json.loads(output)
            except Exception:
                raise HTTPException(status_code=500, detail=f"Exchange failed: {output[:300]}")

            if data.get("error"):
                desc = data.get("description", data["error"])
                raise HTTPException(status_code=400, detail=f"OpenAI error: {desc}")

            customer.auth_method = "oauth_openai"
            customer.auth_provider = "openai-codex"
            await db.commit()

            # Update openclaw.json: set model to OpenAI (ChatGPT Plus subscription via OAuth)
            model_script = "import json\nwith open('/root/.openclaw/openclaw.json') as f:\n    cfg = json.load(f)\ncfg.setdefault('agents', {}).setdefault('defaults', {})['model'] = {'primary': 'openai-codex/gpt-5.3-codex'}\ncfg['agents']['defaults'].pop('models', None)\nwith open('/root/.openclaw/openclaw.json', 'w') as f:\n    json.dump(cfg, f, indent=2)"
            await conn.run(f"python3 -c {repr(model_script)}", check=False)

            # Enable and start openclaw gateway
            await conn.run("systemctl restart clawdbot 2>/dev/null", check=False)
            await conn.run("systemctl enable openclaw 2>/dev/null || true", check=False)

            return {"success": True, "method": "openai-codex", "accountId": data.get("accountId")}

    except asyncssh.Error as e:
        raise HTTPException(status_code=500, detail=f"SSH error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exchange failed: {str(e)}")


# ─── Dashboard wrappers for VM auth (uses session cookie) ───

async def _get_customer_id_from_session(request: Request, db: AsyncSession) -> int:
    """Extract customer_id from butlr_session cookie or Authorization header"""
    import jwt as pyjwt
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("butlr_session")
    if not token:
        # Debug: log what cookies and headers we got
        cookies = dict(request.cookies)
        headers = dict(request.headers)
        print(f"[vm-auth/me] No token found. Cookies: {list(cookies.keys())}. Auth header: {headers.get("authorization", "none")[:30]}")
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        # Must read at runtime (after dotenv loads in main.py)
        jwt_secret = os.environ.get("JWT_SECRET")
        if not jwt_secret:
            from dotenv import load_dotenv
            load_dotenv()
            jwt_secret = os.environ.get("JWT_SECRET", "")
        payload = pyjwt.decode(token, jwt_secret, algorithms=["HS256"])
        customer_id = payload.get("customer_id")
        if isinstance(customer_id, str):
            customer_id = int(customer_id)
        if not customer_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return customer_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


class VmAuthRequest(BaseModel):
    method: str  # "openai-codex" | "anthropic-setup-token" | "api-key"
    token: Optional[str] = None  # setup-token for anthropic
    provider: Optional[str] = None  # for api-key: "anthropic" or "openai"
    api_key: Optional[str] = None  # for api-key method



@router.post("/vm-auth/me")
async def vm_auth_me(
    request: Request,
    body: VmAuthRequest,
    db: AsyncSession = Depends(get_db)
):
    """Dashboard wrapper: resolve me to customer_id from session"""
    customer_id = await _get_customer_id_from_session(request, db)
    # Call vm_auth with token-based auth (bypass HTTPBearer)
    return await vm_auth(customer_id, body, token="dashboard-session", credentials=None, db=db)








@router.post("/vm-auth/{customer_id}")
async def vm_auth(
    customer_id: int,
    body: VmAuthRequest,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger AI provider auth on the customer's VM.
    - openai-codex: SSH to VM, run openclaw auth login, return auth URL
    - anthropic-setup-token: SSH to VM, write setup-token to auth-profiles.json, restart
    - api-key: SSH to VM, write API key to secrets, restart
    """
    import asyncssh

    # Verify access
    if token == "dashboard-session":
        pass  # Already verified via session cookie in /me wrapper
    elif credentials:
        await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not customer.vm_ip:
        raise HTTPException(status_code=400, detail="VM not ready yet. Please wait for provisioning to complete.")

    vm_ip = customer.vm_ip
    ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")

    try:
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None
        ) as conn:

            if body.method == "openai-codex":
                # Deploy oauth-helper.mjs to VM if not already there
                check_script = await conn.run("test -f /root/oauth-helper.mjs && echo EXISTS || echo MISSING", check=False)
                if "MISSING" in check_script.stdout:
                    # Copy from our server
                    async with conn.start_sftp_client() as sftp:
                        await sftp.put("/root/oauth-helper.mjs", "/root/oauth-helper.mjs")

                # Kill any existing listener
                await conn.run("pkill -f oauth-helper.mjs listen 2>/dev/null || true", check=False)
                await conn.run("rm -f /tmp/oauth-result.json /tmp/oauth-state.json", check=False)

                # Generate the auth URL (PKCE) with localhost redirect (OpenAI only allows localhost)
                result = await conn.run("node /root/oauth-helper.mjs generate-url 2>&1", check=False, timeout=10)
                auth_url = result.stdout.strip()

                if not auth_url.startswith("https://"):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Could not generate auth URL. Output: {auth_url[:200]}"
                    )

                # Start the callback listener in the background (binds 0.0.0.0:1455)
                await conn.run("nohup node /root/oauth-helper.mjs listen > /tmp/oauth-listener.log 2>&1 &", check=False)

                # Wait briefly for listener to start
                import asyncio
                await asyncio.sleep(1)

                # Verify listener is running
                check = await conn.run("curl -s -o /dev/null -w %{http_code} http://127.0.0.1:1455/health 2>/dev/null || echo listening", check=False)

                # Open port 1455 on the VM firewall temporarily
                await conn.run("ufw allow 1455/tcp 2>/dev/null || iptables -I INPUT -p tcp --dport 1455 -j ACCEPT 2>/dev/null || true", check=False)

                customer.auth_method = "oauth_openai"
                customer.auth_provider = "openai-codex"
                await db.commit()

                # OpenAI ONLY allows redirect_uri=http://localhost:* 
                # Keep the URL as-is (localhost). The redirect will fail in the user's browser
                # but the URL bar will contain the auth code. User copies & pastes it back.

                return {"success": True, "auth_url": auth_url, "method": "openai-codex"}

            elif body.method == "anthropic-setup-token":
                if not body.token or not body.token.strip().startswith("sk-ant-oat01-"):
                    raise HTTPException(status_code=400, detail="Invalid setup-token format")

                setup_token = body.token.strip()

                # Write auth-profiles.json to the VM
                auth_profiles = {
                    "version": 1,
                    "profiles": {
                        "anthropic:default": {
                            "type": "oauth",
                            "provider": "anthropic",
                            "key": setup_token,
                        }
                    },
                    "lastGood": {
                        "anthropic": "anthropic:default"
                    },
                }
                auth_profiles_json = json.dumps(auth_profiles, indent=2)

                # Create auth dir and write profiles
                await conn.run("mkdir -p /root/.openclaw/agents/main/agent", check=True)
                async with conn.start_sftp_client() as sftp:
                    async with sftp.open('/root/.openclaw/agents/main/agent/auth-profiles.json', 'w') as f:
                        await f.write(auth_profiles_json)

                # Update openclaw.json model
                update_script = """python3 -c "
import json
config_path = '/root/.openclaw/openclaw.json'
with open(config_path) as f:
    config = json.load(f)
if 'auth' not in config:
    config['auth'] = {}
if 'profiles' not in config['auth']:
    config['auth']['profiles'] = {}
config['auth']['profiles']['anthropic:default'] = {'provider': 'anthropic', 'mode': 'oauth'}
if 'agents' not in config:
    config['agents'] = {}
if 'defaults' not in config['agents']:
    config['agents']['defaults'] = {}
if 'model' not in config['agents']['defaults']:
    config['agents']['defaults']['model'] = {}
config['agents']['defaults']['model']['primary'] = 'anthropic/claude-sonnet-4-20250514'
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
print('done')
"
"""
                await conn.run(update_script, check=True)
                # Enable and start openclaw gateway
                await conn.run("systemctl restart clawdbot 2>/dev/null", check=False)
                await conn.run("systemctl enable openclaw 2>/dev/null || true", check=False)

                customer.auth_method = "setup_token_anthropic"
                customer.auth_provider = "anthropic"
                await db.commit()

                return {"success": True, "method": "anthropic-setup-token", "provider": "anthropic"}

            elif body.method == "api-key":
                if not body.api_key or not body.api_key.strip():
                    raise HTTPException(status_code=400, detail="API key is required")
                if not body.provider:
                    raise HTTPException(status_code=400, detail="Provider is required")

                api_key = body.api_key.strip()
                provider = body.provider.strip()

                # Determine env var name
                if provider == "anthropic":
                    env_var = "ANTHROPIC_API_KEY"
                    default_model = "anthropic/claude-sonnet-4-20250514"
                elif provider == "openai":
                    env_var = "OPENAI_API_KEY"
                    default_model = "openai/gpt-4o"
                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

                # Read existing secrets, update the key, write back
                read_result = await conn.run("cat /etc/clawdbot/secrets 2>/dev/null || echo ''", check=False)
                existing_lines = read_result.stdout.strip().split("\n") if read_result.stdout.strip() else []

                # Filter out old key for this provider, add new one
                new_lines = [l for l in existing_lines if not l.startswith(f"{env_var}=")]
                new_lines.append(f"{env_var}={api_key}")
                secrets_content = "\n".join(new_lines)

                await conn.run(f"cat > /etc/clawdbot/secrets << 'EOFSECRETS'\n{secrets_content}\nEOFSECRETS")
                await conn.run("chmod 600 /etc/clawdbot/secrets")

                # Update model in openclaw.json
                update_model_script = f"""python3 -c "
import json
config_path = '/root/.openclaw/openclaw.json'
with open(config_path) as f:
    config = json.load(f)
if 'agents' not in config:
    config['agents'] = {{}}
if 'defaults' not in config['agents']:
    config['agents']['defaults'] = {{}}
if 'model' not in config['agents']['defaults']:
    config['agents']['defaults']['model'] = {{}}
config['agents']['defaults']['model']['primary'] = '{default_model}'
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
print('done')
"
"""
                await conn.run(update_model_script, check=True)
                await conn.run("systemctl restart clawdbot 2>/dev/null", check=False)

                customer.auth_method = "api_key"
                customer.auth_provider = provider
                await db.commit()

                return {"success": True, "method": "api-key", "provider": provider}

            else:
                raise HTTPException(status_code=400, detail=f"Unknown auth method: {body.method}")

    except asyncssh.Error as e:
        raise HTTPException(status_code=500, detail=f"SSH connection failed: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VM auth failed: {str(e)}")


@router.get("/vm-auth-status/{customer_id}")
async def vm_auth_status(
    customer_id: int,
    token: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """
    Check if AI provider auth is complete on the customer's VM.
    SSH to VM and check for valid credentials in auth-profiles.json or secrets.
    """
    import asyncssh

    # Verify access
    if credentials:
        await verify_customer_access(customer_id, credentials, db)
    elif token:
        if not verify_onboarding_token(token, customer_id):
            raise HTTPException(status_code=403, detail="Invalid or expired token")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if not customer.vm_ip:
        return {"authenticated": False, "provider": None, "method": None, "reason": "VM not ready"}

    vm_ip = customer.vm_ip
    ssh_key = os.path.expanduser("~/.ssh/butlr_rsa")

    try:
        async with asyncssh.connect(
            vm_ip,
            username="root",
            client_keys=[ssh_key],
            known_hosts=None
        ) as conn:
            # Check auth-profiles.json for OAuth/setup-token credentials
            check_script = """python3 -c "
import json, os
auth_path = '/root/.openclaw/agents/main/agent/auth-profiles.json'
if os.path.exists(auth_path):
    with open(auth_path) as f:
        data = json.load(f)
    profiles = data.get('profiles', {})
    if profiles:
        for pid, prof in profiles.items():
            provider = prof.get('provider', 'unknown')
            has_key = bool(prof.get('key') or prof.get('access'))
            if has_key:
                ptype = 'setup-token' if prof.get('key') else 'oauth'
                print(f'AUTH:{provider}:{ptype}')
                exit(0)
# Check env secrets for API keys
secrets_path = '/etc/clawdbot/secrets'
if os.path.exists(secrets_path):
    with open(secrets_path) as f:
        for line in f:
            if line.startswith('ANTHROPIC_API_KEY=') and len(line.strip().split('=', 1)[1]) > 5:
                print('AUTH:anthropic:api-key')
                exit(0)
            if line.startswith('OPENAI_API_KEY=') and len(line.strip().split('=', 1)[1]) > 5:
                print('AUTH:openai:api-key')
                exit(0)
print('NOAUTH')
"
"""
            result = await conn.run(check_script, check=False, timeout=15)
            output = result.stdout.strip()

            if output.startswith("AUTH:"):
                parts = output.split(":")
                return {
                    "authenticated": True,
                    "provider": parts[1],
                    "method": parts[2],
                }

            return {"authenticated": False, "provider": None, "method": None}

    except asyncssh.Error as e:
        return {"authenticated": False, "provider": None, "method": None, "reason": f"SSH error: {str(e)}"}
    except Exception as e:
        return {"authenticated": False, "provider": None, "method": None, "reason": f"Check failed: {str(e)}"}