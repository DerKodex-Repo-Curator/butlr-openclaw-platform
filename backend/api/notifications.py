"""Telegram Activity Notifications for Butlr customers"""
import httpx
import io
from typing import Optional

TELEGRAM_API = "https://api.telegram.org/bot{token}"


async def send_activity(
    bot_token: str,
    chat_id: str,
    title: str,
    message: str,
    emoji: str = "🦞",
    avatar_url: Optional[str] = None,
):
    """Send an activity notification to the customer via their Telegram bot"""
    if not bot_token or not chat_id:
        return False

    api = TELEGRAM_API.format(token=bot_token)

    # Build the notification text
    text = f"{emoji} <b>{title}</b>\n\n{message}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if avatar_url:
                # Send photo with caption
                res = await client.post(
                    f"{api}/sendPhoto",
                    data={
                        "chat_id": chat_id,
                        "caption": text,
                        "parse_mode": "HTML",
                    },
                    files={"photo": ("avatar.png", await _download_image(client, avatar_url), "image/png")},
                )
            else:
                # Send text only
                res = await client.post(
                    f"{api}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": "HTML",
                    },
                )
            return res.status_code == 200
    except Exception:
        return False


async def _download_image(client: httpx.AsyncClient, url: str) -> bytes:
    """Download an image from URL"""
    res = await client.get(url, timeout=5.0)
    return res.content


# ─── Specific notification helpers ───────────────────────

async def notify_soul_installed(bot_token: str, chat_id: str, soul_name: str):
    """Notify customer that a new personality was installed"""
    avatar_url = f"https://api.dicebear.com/9.x/bottts-neutral/png?seed={soul_name}&size=256&backgroundColor=f43f5e"
    await send_activity(
        bot_token=bot_token,
        chat_id=chat_id,
        title="New Personality Installed",
        message=f"Your butler is now <b>{soul_name}</b>.\n\nThe new personality is active — try sending a message!",
        emoji="🎭",
        avatar_url=avatar_url,
    )


async def notify_vm_restart(bot_token: str, chat_id: str):
    """Notify customer that their VM was restarted"""
    await send_activity(
        bot_token=bot_token,
        chat_id=chat_id,
        title="Butler Restarted",
        message="Your butler has been restarted and is ready to go.",
        emoji="🔄",
    )


async def notify_skill_installed(bot_token: str, chat_id: str, skill_name: str):
    """Notify customer that a skill was installed"""
    await send_activity(
        bot_token=bot_token,
        chat_id=chat_id,
        title="Skill Installed",
        message=f"<b>{skill_name}</b> has been installed on your butler.\n\nYour butler can now use this skill!",
        emoji="🧩",
    )


async def notify_vm_created(bot_token: str, chat_id: str):
    """Notify customer that their VM is ready"""
    await send_activity(
        bot_token=bot_token,
        chat_id=chat_id,
        title="Your Butler is Ready!",
        message="Your personal AI butler has been set up and is waiting for you.\n\nJust send a message to get started! 🦞",
        emoji="🎉",
    )
