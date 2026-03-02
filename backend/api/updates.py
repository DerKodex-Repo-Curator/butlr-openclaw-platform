"""Product Updates / Changelog API for Butlr.cloud"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/updates", tags=["updates"])


class UpdateEntry(BaseModel):
    id: str
    date: str
    tag: str  # "new" | "improved" | "fixed" | "design"
    title: str
    description: str
    icon: str  # emoji


# Static changelog — add new entries at the top
UPDATES: List[dict] = [
    {
        "id": "2026-02-23-changelog",
        "date": "2026-02-23",
        "tag": "new",
        "title": "Changelog Page",
        "description": "Dedicated changelog page in the sidebar replacing the notification dropdown.",
        "icon": "📋",
    },
    {
        "id": "2026-02-23-heatmap",
        "date": "2026-02-23",
        "tag": "new",
        "title": "Activity Heatmap",
        "description": "Full year activity grid on Usage Stats — GitHub-style contribution heatmap with hover tooltips.",
        "icon": "📊",
    },
    {
        "id": "2026-02-23-skeleton",
        "date": "2026-02-23",
        "tag": "design",
        "title": "Skeleton Loading",
        "description": "Replaced all loading spinners with smooth skeleton placeholders across every page.",
        "icon": "✨",
    },
    {
        "id": "2026-02-23-tokens",
        "date": "2026-02-23",
        "tag": "new",
        "title": "Token Usage Tracking",
        "description": "Input tokens, output tokens, and total token stats now visible on Usage Stats.",
        "icon": "🪙",
    },
    {
        "id": "2026-02-23-memory-cancel",
        "date": "2026-02-23",
        "tag": "improved",
        "title": "Graceful Memory Cancellation",
        "description": "Memory stays active until end of billing period after deactivation. No more instant cutoff.",
        "icon": "🧠",
    },
    {
        "id": "2026-02-23-memory-reactivate",
        "date": "2026-02-23",
        "tag": "fixed",
        "title": "Memory Re-Activation",
        "description": "Re-enabling memory after deactivation now works instantly without full reinstall.",
        "icon": "🔧",
    },
    {
        "id": "2026-02-23-usage-collector",
        "date": "2026-02-23",
        "tag": "new",
        "title": "Usage Data Collection",
        "description": "Automated usage tracking — messages, API calls, tokens, and sessions collected every 15 minutes.",
        "icon": "📈",
    },
    {
        "id": "2026-02-23-nebula",
        "date": "2026-02-23",
        "tag": "design",
        "title": "Nebula Backgrounds",
        "description": "Dashboard and sidebar now feature animated nebula canvas backgrounds with stars.",
        "icon": "🌌",
    },
    {
        "id": "2026-02-23-support-fix",
        "date": "2026-02-23",
        "tag": "fixed",
        "title": "Support Ticket Fixes",
        "description": "Fixed ticket submission, history loading, and reply forwarding from support team.",
        "icon": "🎫",
    },
    {
        "id": "2026-02-23-memory-dashboard",
        "date": "2026-02-23",
        "tag": "improved",
        "title": "Memory Page Redesign",
        "description": "New memory page with category filters, search, and auto-categorization in 12 categories.",
        "icon": "🧠",
    },
    {
        "id": "2026-02-22-soulvault",
        "date": "2026-02-22",
        "tag": "new",
        "title": "SoulVault — 978 AI Personalities",
        "description": "Browse and install from 978 unique AI personalities across 14 categories. Each soul comes with a unique robot avatar.",
        "icon": "🤖",
    },
    {
        "id": "2026-02-22-onboarding",
        "date": "2026-02-22",
        "tag": "improved",
        "title": "Redesigned Onboarding",
        "description": "New 5-step guided setup with SoulVault integration. Your selected soul auto-installs after connecting your AI provider.",
        "icon": "🎯",
    },
    {
        "id": "2026-02-22-models",
        "date": "2026-02-22",
        "tag": "new",
        "title": "22 AI Models — Latest Generation",
        "description": "Claude Opus 4.6, GPT-5.2, Gemini 3 Pro and more. Switch models instantly from your dashboard.",
        "icon": "🧠",
    },
    {
        "id": "2026-02-22-security",
        "date": "2026-02-22",
        "tag": "new",
        "title": "Security Dashboard",
        "description": "ClawShield integration with vulnerability scanning, one-click hardening, and skill security analysis.",
        "icon": "🛡️",
    },
    {
        "id": "2026-02-22-settings",
        "date": "2026-02-22",
        "tag": "improved",
        "title": "Settings & AI Connection",
        "description": "Redesigned settings with live VM status, model selector dropdown, and auto-sync with your running bot.",
        "icon": "⚙️",
    },
    {
        "id": "2026-02-22-landing",
        "date": "2026-02-22",
        "tag": "design",
        "title": "New Landing Page",
        "description": "Animated space universe background with stars, nebulae, shooting stars, and mouse parallax effect.",
        "icon": "🌌",
    },
    {
        "id": "2026-02-22-bugfixes",
        "date": "2026-02-22",
        "tag": "fixed",
        "title": "14 Bug Fixes",
        "description": "Fixed provisioning reliability, JWT authentication, VM status sync, soul installation flow, and more.",
        "icon": "🔧",
    },
]


@router.get("")
async def get_updates(limit: int = 50):
    """Get product updates / changelog"""
    return {
        "updates": UPDATES[:limit],
        "total": len(UPDATES),
    }


@router.get("/latest")
async def get_latest_update():
    """Get the most recent update (for badge count etc.)"""
    if not UPDATES:
        return {"latest": None, "count": 0}
    return {
        "latest": UPDATES[0],
        "count": len(UPDATES),
        "latest_date": UPDATES[0]["date"],
    }
