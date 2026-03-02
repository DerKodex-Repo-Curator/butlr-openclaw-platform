"""Bot Pool Service - Manage pre-created Telegram bots"""
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

import sys
sys.path.append('..')
from models.bot_pool import TelegramBot


class BotPoolService:
    """Service for managing the Telegram bot pool"""
    
    TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_available_bot(self) -> Optional[TelegramBot]:
        """Get the next available (unassigned) bot from the pool"""
        result = await self.db.execute(
            select(TelegramBot)
            .where(TelegramBot.is_assigned == False)
            .where(TelegramBot.is_active == True)
            .order_by(TelegramBot.id)
            .limit(1)
        )
        return result.scalar_one_or_none()
    
    async def assign_bot_to_customer(
        self, 
        customer_id: int, 
        custom_name: Optional[str] = None
    ) -> Optional[TelegramBot]:
        """Assign an available bot to a customer"""
        bot = await self.get_available_bot()
        
        if not bot:
            return None  # No bots available!
        
        # Update bot assignment
        bot.is_assigned = True
        bot.customer_id = customer_id
        bot.assigned_at = datetime.utcnow()
        
        if custom_name:
            bot.custom_name = custom_name
            # Update bot name via Telegram API
            await self._set_bot_name(bot.bot_token, custom_name)
        
        await self.db.commit()
        await self.db.refresh(bot)
        
        return bot
    
    async def release_bot(self, bot_id: int) -> bool:
        """Release a bot back to the pool (when customer cancels)"""
        result = await self.db.execute(
            select(TelegramBot).where(TelegramBot.id == bot_id)
        )
        bot = result.scalar_one_or_none()

        if not bot:
            return False

        # Reset bot
        bot.is_assigned = False
        bot.customer_id = None
        bot.assigned_at = None
        bot.custom_name = None
        bot.custom_description = None

        # Reset bot name to default
        await self._set_bot_name(bot.bot_token, "Butlr Assistant")

        await self.db.commit()
        return True

    async def release_bot_with_cleanup(self, bot_id: int) -> bool:
        """Release a bot with full cleanup - used when subscription is cancelled"""
        result = await self.db.execute(
            select(TelegramBot).where(TelegramBot.id == bot_id)
        )
        bot = result.scalar_one_or_none()

        if not bot:
            return False

        try:
            # 1. Delete webhook (disconnects bot from VM)
            await self._delete_webhook(bot.bot_token)

            # 2. Clear pending updates
            await self._clear_updates(bot.bot_token)

            # 3. Reset bot name to default
            await self._set_bot_name(bot.bot_token, "Butlr Assistant")

            # 4. Reset bot description
            await self._set_bot_description(bot.bot_token, "Available Butlr Assistant")

            # 5. Wipe workspace on VM (remove old customer's data)
            try:
                from sqlalchemy import select as sa_select
                from models.customer import Customer
                result = await self.db.execute(
                    sa_select(Customer).where(Customer.id == bot.customer_id)
                )
                old_customer = result.scalar_one_or_none()
                if old_customer and old_customer.vm_ip:
                    import asyncssh
                    async with asyncssh.connect(old_customer.vm_ip, username='root', client_keys=['/root/.ssh/butlr_rsa'], known_hosts=None) as conn:
                        # Stop the bot
                        await conn.run("systemctl stop clawdbot 2>/dev/null || true", check=False)
                        # Wipe workspace (chat history, memory, sessions)
                        await conn.run("rm -rf /root/butlr-workspace/* /root/.openclaw/agents/main/agent/sessions 2>/dev/null || true", check=False)
                        print(f"Workspace wiped on VM {old_customer.vm_ip}")
            except Exception as e2:
                print(f"Error wiping workspace: {e2}")

        except Exception as e:
            print(f"Error during bot cleanup API calls: {e}")
            # Continue with DB cleanup even if API calls fail

        # 6. Clear customer's bot reference
        if bot.customer_id:
            try:
                from sqlalchemy import select as sa_select
                from models.customer import Customer
                result = await self.db.execute(
                    sa_select(Customer).where(Customer.id == bot.customer_id)
                )
                old_cust = result.scalar_one_or_none()
                if old_cust:
                    old_cust.telegram_bot_token = None
                    old_cust.telegram_bot_username = None
                    old_cust.telegram_chat_id = None
            except Exception as e:
                print(f"Error clearing customer bot fields: {e}")

        # 7. Reset bot pool record
        bot.is_assigned = False
        bot.customer_id = None
        bot.assigned_at = None
        bot.custom_name = None
        bot.custom_description = None

        await self.db.commit()
        return True

    async def _delete_webhook(self, token: str) -> bool:
        """Delete webhook from Telegram bot"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TELEGRAM_API.format(token=token, method="deleteWebhook"),
                    json={"drop_pending_updates": True}
                )
                return response.json().get("ok", False)
        except Exception as e:
            print(f"Error deleting webhook: {e}")
            return False

    async def _clear_updates(self, token: str) -> bool:
        """Clear pending updates from Telegram bot"""
        try:
            async with httpx.AsyncClient() as client:
                # Get updates with a high offset to clear them
                response = await client.post(
                    self.TELEGRAM_API.format(token=token, method="getUpdates"),
                    json={"offset": -1, "limit": 1}
                )
                return response.json().get("ok", False)
        except Exception as e:
            print(f"Error clearing updates: {e}")
            return False
    
    async def add_bot_to_pool(
        self, 
        bot_token: str, 
        bot_username: str
    ) -> TelegramBot:
        """Add a new bot to the pool"""
        bot = TelegramBot(
            bot_token=bot_token,
            bot_username=bot_username,
            bot_name="Butlr Assistant"
        )
        self.db.add(bot)
        await self.db.commit()
        await self.db.refresh(bot)
        return bot
    
    async def get_pool_stats(self) -> Dict[str, int]:
        """Get statistics about the bot pool"""
        total = await self.db.execute(
            select(TelegramBot).where(TelegramBot.is_active == True)
        )
        total_count = len(total.scalars().all())
        
        assigned = await self.db.execute(
            select(TelegramBot)
            .where(TelegramBot.is_assigned == True)
            .where(TelegramBot.is_active == True)
        )
        assigned_count = len(assigned.scalars().all())
        
        return {
            "total": total_count,
            "assigned": assigned_count,
            "available": total_count - assigned_count
        }
    
    async def get_customer_bot(self, customer_id: int) -> Optional[TelegramBot]:
        """Get the bot assigned to a customer"""
        result = await self.db.execute(
            select(TelegramBot).where(TelegramBot.customer_id == customer_id)
        )
        return result.scalar_one_or_none()
    
    # Telegram API helpers
    async def _set_bot_name(self, token: str, name: str) -> bool:
        """Set bot display name via Telegram API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TELEGRAM_API.format(token=token, method="setMyName"),
                    json={"name": name}
                )
                return response.json().get("ok", False)
        except Exception as e:
            print(f"Error setting bot name: {e}")
            return False
    
    async def _set_bot_description(self, token: str, description: str) -> bool:
        """Set bot description via Telegram API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TELEGRAM_API.format(token=token, method="setMyDescription"),
                    json={"description": description}
                )
                return response.json().get("ok", False)
        except Exception as e:
            print(f"Error setting bot description: {e}")
            return False
    
    async def _get_bot_info(self, token: str) -> Optional[Dict[str, Any]]:
        """Get bot info from Telegram API"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.TELEGRAM_API.format(token=token, method="getMe")
                )
                data = response.json()
                if data.get("ok"):
                    return data.get("result")
                return None
        except Exception as e:
            print(f"Error getting bot info: {e}")
            return None
    
    async def validate_and_add_bot(self, token: str) -> Optional[TelegramBot]:
        """Validate a bot token and add to pool"""
        info = await self._get_bot_info(token)
        if not info:
            return None
        
        username = info.get("username")
        if not username:
            return None
        
        return await self.add_bot_to_pool(token, username)
