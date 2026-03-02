"""
Skills Marketplace API
Install/uninstall OpenClaw skills on customer VMs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from pydantic import BaseModel
import asyncssh
import asyncio
import os

from models.database import get_db
from models.customer import Customer
from api.notifications import notify_skill_installed
from api.dashboard import get_current_customer

# SSH key for connecting to customer VMs
SSH_KEY_PATH = os.path.expanduser("~/.ssh/butlr_rsa")

router = APIRouter()


def get_icon_url(domain: str) -> str:
    """Generate reliable icon URL from domain using Google's favicon service"""
    return f"https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://{domain}&size=128"


# Curated skills catalog - ONLY verified ClawdHub skills
# All slugs have been verified via `clawdhub search` to actually install
SKILLS_CATALOG = {
    "productivity": {
        "name": "Productivity",
        "emoji": "📋",
        "description": "Task management, notes, and organization",
        "skills": [
            {"slug": "linear", "name": "Linear", "description": "Create and manage Linear issues, projects, and cycles", "domain": "linear.app", "popular": True},
            {"slug": "notion", "name": "Notion", "description": "Search, create, and update Notion pages and databases", "domain": "notion.so", "popular": True},
            {"slug": "todoist", "name": "Todoist", "description": "Manage tasks and projects in Todoist", "domain": "todoist.com", "popular": True},
            {"slug": "calendar", "name": "Google Calendar", "description": "Create events, check schedule, manage calendars", "domain": "calendar.google.com", "popular": True},
            {"slug": "obsidian", "name": "Obsidian", "description": "Read and write to your Obsidian vault", "domain": "obsidian.md", "popular": True},
            {"slug": "trello", "name": "Trello", "description": "Manage Trello boards, lists, and cards", "domain": "trello.com", "popular": False},
            {"slug": "airtable", "name": "Airtable", "description": "Read and write to Airtable bases", "domain": "airtable.com", "popular": True},
            {"slug": "asana", "name": "Asana", "description": "Manage Asana tasks and projects", "domain": "asana.com", "popular": False},
            {"slug": "clickup", "name": "ClickUp", "description": "Manage ClickUp tasks and spaces", "domain": "clickup.com", "popular": False}
        ]
    },
    "communication": {
        "name": "Communication",
        "emoji": "💬",
        "description": "Chat, email, and social media",
        "skills": [
            {"slug": "slack-api", "name": "Slack", "description": "Send messages, read channels, manage Slack workspace", "domain": "slack.com", "popular": True},
            {"slug": "gmail", "name": "Gmail", "description": "Read, search, and send emails via Gmail", "domain": "gmail.com", "popular": True},
            {"slug": "discord", "name": "Discord", "description": "Send messages and manage Discord servers", "domain": "discord.com", "popular": True},
            {"slug": "twitter", "name": "Twitter/X", "description": "Post tweets, read timeline, manage Twitter account", "domain": "x.com", "popular": True},
            {"slug": "telegram", "name": "Telegram", "description": "Telegram Bot API workflows and commands", "domain": "telegram.org", "popular": True},
            {"slug": "linkedin", "name": "LinkedIn", "description": "Post updates and manage LinkedIn", "domain": "linkedin.com", "popular": False},
            {"slug": "instagram", "name": "Instagram", "description": "Instagram content and marketing", "domain": "instagram.com", "popular": True},
            {"slug": "reddit", "name": "Reddit", "description": "Browse and post on Reddit", "domain": "reddit.com", "popular": False},
            {"slug": "mastodon-scout", "name": "Mastodon", "description": "Post to Mastodon/Fediverse", "domain": "mastodon.social", "popular": False},
            {"slug": "sendgrid-skills", "name": "SendGrid", "description": "Send transactional emails", "domain": "sendgrid.com", "popular": False}
        ]
    },
    "development": {
        "name": "Development",
        "emoji": "💻",
        "description": "Code, Git, and developer tools",
        "skills": [
            {"slug": "github", "name": "GitHub", "description": "Manage repos, issues, PRs, and GitHub Actions", "domain": "github.com", "popular": True},
            {"slug": "glab-cli", "name": "GitLab", "description": "Manage GitLab projects, issues, and pipelines", "domain": "gitlab.com", "popular": False},
            {"slug": "vercel", "name": "Vercel", "description": "Deploy and manage Vercel projects", "domain": "vercel.com", "popular": True},
            {"slug": "docker-essentials", "name": "Docker", "description": "Manage Docker containers and images", "domain": "docker.com", "popular": True},
            {"slug": "docker-compose-gen", "name": "Docker Compose", "description": "Generate Docker Compose files", "domain": "docker.com", "popular": False},
            {"slug": "k8s-gen", "name": "Kubernetes", "description": "Generate K8s manifests and configs", "domain": "kubernetes.io", "popular": False},
            {"slug": "jira", "name": "Jira", "description": "Manage Jira issues and projects", "domain": "atlassian.com", "popular": True},
            {"slug": "npm-search", "name": "NPM", "description": "Search and get info about NPM packages", "domain": "npmjs.com", "popular": False},
            {"slug": "terraform-gen", "name": "Terraform", "description": "Generate Terraform configurations", "domain": "terraform.io", "popular": False},
            {"slug": "aws-infra", "name": "AWS", "description": "AWS infrastructure management", "domain": "aws.amazon.com", "popular": True}
        ]
    },
    "ai": {
        "name": "AI & LLMs",
        "emoji": "🤖",
        "description": "AI models, image generation, and ML tools",
        "skills": [
            {"slug": "gpt", "name": "OpenAI GPT", "description": "Access GPT models for generation", "domain": "openai.com", "popular": True},
            {"slug": "perplexity", "name": "Perplexity", "description": "AI-powered search and research", "domain": "perplexity.ai", "popular": True},
            {"slug": "elevenlabs-voices", "name": "ElevenLabs", "description": "Text-to-speech with realistic voices", "domain": "elevenlabs.io", "popular": True},
            {"slug": "elevenlabs-agents", "name": "ElevenLabs Agents", "description": "ElevenLabs AI agents", "domain": "elevenlabs.io", "popular": False},
            {"slug": "gemini-yt-video-transcript", "name": "Gemini YouTube", "description": "YouTube transcripts via Gemini", "domain": "google.com", "popular": False}
        ]
    },
    "search": {
        "name": "Search & Research",
        "emoji": "🔍",
        "description": "Web search, scraping, and data retrieval",
        "skills": [
            {"slug": "brave-search", "name": "Brave Search", "description": "Privacy-focused web search", "domain": "search.brave.com", "popular": True},
            {"slug": "tavily", "name": "Tavily", "description": "AI-optimized search for research", "domain": "tavily.com", "popular": True},
            {"slug": "exa", "name": "Exa", "description": "Neural search engine", "domain": "exa.ai", "popular": False},
            {"slug": "firecrawl-search", "name": "Firecrawl", "description": "Crawl and scrape websites", "domain": "firecrawl.dev", "popular": True},
            {"slug": "ddg-search", "name": "DuckDuckGo", "description": "Private web search", "domain": "duckduckgo.com", "popular": False},
            {"slug": "google-search", "name": "Google Search", "description": "Google web search", "domain": "google.com", "popular": True}
        ]
    },
    "data": {
        "name": "Data & Analytics",
        "emoji": "📊",
        "description": "Databases, analytics, and data tools",
        "skills": [
            {"slug": "postgres", "name": "PostgreSQL", "description": "Query PostgreSQL databases", "domain": "postgresql.org", "popular": True},
            {"slug": "supabase", "name": "Supabase", "description": "Manage Supabase projects", "domain": "supabase.com", "popular": True},
            {"slug": "redis", "name": "Redis", "description": "Manage Redis data", "domain": "redis.io", "popular": False},
            {"slug": "neondb-skill", "name": "Neon", "description": "Serverless Postgres with Neon", "domain": "neon.tech", "popular": False},
            {"slug": "database-operations", "name": "Database Ops", "description": "General database operations", "domain": "database.com", "popular": False}
        ]
    },
    "finance": {
        "name": "Finance",
        "emoji": "💰",
        "description": "Payments, accounting, and financial tools",
        "skills": [
            {"slug": "stripe", "name": "Stripe", "description": "Manage Stripe payments", "domain": "stripe.com", "popular": True},
            {"slug": "stripe-api", "name": "Stripe API", "description": "Full Stripe API access", "domain": "stripe.com", "popular": False},
            {"slug": "quickbooks", "name": "QuickBooks", "description": "Manage accounting", "domain": "quickbooks.intuit.com", "popular": True},
            {"slug": "exchange-rates", "name": "Exchange Rates", "description": "Currency conversion", "domain": "xe.com", "popular": False},
            {"slug": "crypto-price", "name": "Crypto Prices", "description": "Check cryptocurrency prices", "domain": "coinmarketcap.com", "popular": False}
        ]
    },
    "media": {
        "name": "Media & Content",
        "emoji": "🎬",
        "description": "Video, audio, and content creation",
        "skills": [
            {"slug": "youtube-watcher", "name": "YouTube", "description": "Search videos and get transcripts", "domain": "youtube.com", "popular": True},
            {"slug": "youtube-transcript", "name": "YouTube Transcript", "description": "Get YouTube video transcripts", "domain": "youtube.com", "popular": False},
            {"slug": "spotify", "name": "Spotify", "description": "Search music and playlists", "domain": "spotify.com", "popular": True},
            {"slug": "tiktok", "name": "TikTok", "description": "TikTok content", "domain": "tiktok.com", "popular": True},
            {"slug": "upload-post", "name": "Multi-Platform Post", "description": "Post to TikTok, Instagram, YouTube, X, LinkedIn, and more", "domain": "upload-post.com", "popular": True}
        ]
    },
    "crm": {
        "name": "CRM & Sales",
        "emoji": "🤝",
        "description": "Customer relationship and sales tools",
        "skills": [
            {"slug": "hubspot", "name": "HubSpot", "description": "HubSpot CRM integration", "domain": "hubspot.com", "popular": True},
            {"slug": "hubspot-api", "name": "HubSpot API", "description": "Full HubSpot API access", "domain": "hubspot.com", "popular": False},
            {"slug": "salesforce", "name": "Salesforce", "description": "Salesforce CRM", "domain": "salesforce.com", "popular": True},
            {"slug": "salesforce-api", "name": "Salesforce API", "description": "Full Salesforce API access", "domain": "salesforce.com", "popular": False},
            {"slug": "pipedrive", "name": "Pipedrive", "description": "Sales pipeline management", "domain": "pipedrive.com", "popular": False}
        ]
    },
    "smart-home": {
        "name": "Smart Home",
        "emoji": "🏠",
        "description": "Home automation and IoT",
        "skills": [
            {"slug": "home-assistant", "name": "Home Assistant", "description": "Control smart home devices", "domain": "home-assistant.io", "popular": True},
            {"slug": "homeassistant", "name": "Home Assistant Alt", "description": "Alternative Home Assistant skill", "domain": "home-assistant.io", "popular": False},
            {"slug": "google-home", "name": "Google Home", "description": "Google Home/Nest control", "domain": "home.google.com", "popular": False},
            {"slug": "homey", "name": "Homey", "description": "Homey home automation", "domain": "homey.app", "popular": False}
        ]
    },
    "utilities": {
        "name": "Utilities",
        "emoji": "🛠️",
        "description": "Useful everyday tools",
        "skills": [
            {"slug": "weather", "name": "Weather", "description": "Get weather forecasts", "domain": "weather.com", "popular": True},
            {"slug": "weather-pollen", "name": "Weather & Pollen", "description": "Weather with pollen info", "domain": "weather.com", "popular": False},
            {"slug": "audit-fix", "name": "NPM Audit Fix", "description": "Fix npm security vulnerabilities", "domain": "npmjs.com", "popular": False},
            {"slug": "gitflow", "name": "GitFlow", "description": "Git workflow automation", "domain": "git-scm.com", "popular": False}
        ]
    }
}


class SkillInstallRequest(BaseModel):
    skill_slug: str


class SkillInstallResponse(BaseModel):
    success: bool
    message: str
    skill_slug: str


def transform_skill(skill: dict) -> dict:
    """Transform skill data to include icon URL from domain"""
    return {
        "slug": skill["slug"],
        "name": skill["name"],
        "description": skill["description"],
        "icon": get_icon_url(skill["domain"]),
        "popular": skill.get("popular", False)
    }


@router.get("/skills/catalog")
async def get_skills_catalog(
    category: Optional[str] = None,
    search: Optional[str] = None,
    popular_only: bool = False
):
    """Get the skills catalog, optionally filtered by category or search term"""
    result = {}

    for cat_key, cat_data in SKILLS_CATALOG.items():
        # Filter by category if specified
        if category and cat_key != category:
            continue

        skills = cat_data["skills"]

        # Filter popular only
        if popular_only:
            skills = [s for s in skills if s.get("popular", False)]

        # Filter by search term
        if search:
            search_lower = search.lower()
            skills = [
                s for s in skills
                if search_lower in s["name"].lower()
                or search_lower in s["description"].lower()
                or search_lower in s["slug"].lower()
            ]

        if skills:  # Only include categories with matching skills
            # Transform skills to include icon URLs
            transformed_skills = [transform_skill(s) for s in skills]
            result[cat_key] = {
                "name": cat_data["name"],
                "emoji": cat_data["emoji"],
                "description": cat_data["description"],
                "skills": transformed_skills
            }

    return {
        "categories": result,
        "total_skills": sum(len(c["skills"]) for c in result.values())
    }


@router.get("/skills/installed/{customer_id}")
async def get_installed_skills(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Get list of installed skills on customer's VM"""
    # Verify customer owns this account
    if current_customer.id != customer_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get customer with VM info
    customer = await db.get(Customer, customer_id)

    if not customer or not customer.vm_ip:
        return {"installed": [], "error": "No VM found"}

    try:
        # Connect to VM and check installed skills
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[SSH_KEY_PATH],
            known_hosts=None,
            connect_timeout=10
        ) as conn:
            # Check butlr-workspace skills directory
            result = await conn.run(
                "ls -1 /root/butlr-workspace/skills/ 2>/dev/null || echo ''",
                check=False
            )

            installed_dirs = [
                d.strip() for d in result.stdout.strip().split('\n')
                if d.strip() and d.strip() != ''
            ]

            # Also check for SKILL.md files to confirm valid skills
            installed_skills = []
            for skill_dir in installed_dirs:
                check = await conn.run(
                    f"test -f /root/butlr-workspace/skills/{skill_dir}/SKILL.md && echo 'yes' || echo 'no'",
                    check=False
                )
                if check.stdout.strip() == 'yes':
                    installed_skills.append(skill_dir)

            return {"installed": installed_skills}

    except Exception as e:
        return {"installed": [], "error": str(e)}


@router.post("/skills/install/{customer_id}")
async def install_skill(
    customer_id: int,
    request: SkillInstallRequest,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Install a skill on customer's VM"""
    # Verify customer owns this account
    if current_customer.id != customer_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    skill_slug = request.skill_slug

    # Validate skill exists in catalog
    skill_found = False
    for cat_data in SKILLS_CATALOG.values():
        for skill in cat_data["skills"]:
            if skill["slug"] == skill_slug:
                skill_found = True
                break
        if skill_found:
            break

    if not skill_found:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_slug}' not found in catalog")

    # Get customer with VM info
    customer = await db.get(Customer, customer_id)

    if not customer or not customer.vm_ip:
        raise HTTPException(status_code=404, detail="No VM found for this customer")

    try:
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[SSH_KEY_PATH],
            known_hosts=None,
            connect_timeout=30
        ) as conn:
            # Ensure clawdhub + undici are installed (Node 24 dropped undici from globals)
            await conn.run(
                "npm install -g clawdhub@latest undici 2>&1",
                check=False, timeout=120
            )

            # Run clawdhub install in the workspace directory
            result = await conn.run(
                f"cd /root/butlr-workspace && clawdhub install {skill_slug} 2>&1",
                check=False,
                timeout=120  # 2 minute timeout for installation
            )

            if result.exit_status != 0:
                return SkillInstallResponse(
                    success=False,
                    message=f"Installation failed: {result.stdout or result.stderr}",
                    skill_slug=skill_slug
                )

            # Restart OpenClaw gateway to load new skill
            await conn.run("openclaw gateway restart 2>/dev/null || true", check=False)

            # Notify customer via Telegram
            try:
                await notify_skill_installed(
                    bot_token=customer.telegram_bot_token,
                    chat_id=customer.telegram_chat_id,
                    skill_name=skill_slug,
                )
            except Exception:
                pass

            return SkillInstallResponse(
                success=True,
                message=f"Successfully installed {skill_slug}",
                skill_slug=skill_slug
            )

    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Installation timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/skills/uninstall/{customer_id}/{skill_slug}")
async def uninstall_skill(
    customer_id: int,
    skill_slug: str,
    db: AsyncSession = Depends(get_db),
    current_customer: Customer = Depends(get_current_customer)
):
    """Uninstall a skill from customer's VM"""
    # Verify customer owns this account
    if current_customer.id != customer_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get customer with VM info
    customer = await db.get(Customer, customer_id)

    if not customer or not customer.vm_ip:
        raise HTTPException(status_code=404, detail="No VM found for this customer")

    try:
        async with asyncssh.connect(
            customer.vm_ip,
            username="root",
            client_keys=[SSH_KEY_PATH],
            known_hosts=None,
            connect_timeout=30
        ) as conn:
            # Remove skill directory
            result = await conn.run(
                f"rm -rf /root/butlr-workspace/skills/{skill_slug}",
                check=False
            )

            if result.exit_status != 0:
                return {
                    "success": False,
                    "message": f"Failed to uninstall: {result.stderr}",
                    "skill_slug": skill_slug
                }

            # Restart OpenClaw gateway to unload skill
            await conn.run("openclaw gateway restart 2>/dev/null || true", check=False)

            return {
                "success": True,
                "message": f"Successfully uninstalled {skill_slug}",
                "skill_slug": skill_slug
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
