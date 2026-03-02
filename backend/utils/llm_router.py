"""Multi-LLM Router for handling different providers and plans"""
import os
from typing import Dict, Optional, Tuple
from datetime import date
import httpx
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.pricing import UserApiKey, UsageTracking
from models.customer import Customer
from utils.encryption import decrypt_api_key

class LLMRouter:
    """Routes LLM requests based on customer plan and provider preference"""
    
    def __init__(self):
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.daily_limit = int(os.getenv("DAILY_TOKEN_LIMIT_UNLIMITED", "150000"))
        
    async def route_request(
        self, 
        customer: Customer, 
        prompt: str,
        db: AsyncSession,
        provider: Optional[str] = None,
        max_tokens: int = 1000
    ) -> Tuple[str, Dict]:
        """Route request based on customer plan"""
        
        if customer.plan_tier == "byok":
            return await self._handle_byok_request(customer, prompt, db, provider, max_tokens)
        elif customer.plan_tier == "unlimited":
            return await self._handle_unlimited_request(customer, prompt, db, max_tokens)
        else:
            raise ValueError(f"Unknown plan tier: {customer.plan_tier}")
    
    async def _handle_byok_request(
        self, 
        customer: Customer, 
        prompt: str,
        db: AsyncSession,
        provider: Optional[str],
        max_tokens: int
    ) -> Tuple[str, Dict]:
        """Handle BYOK customer request"""
        
        # Get customer's API keys
        result = await db.execute(
            select(UserApiKey).where(
                UserApiKey.customer_id == customer.id,
                UserApiKey.is_active == True
            )
        )
        api_keys = result.scalars().all()
        
        if not api_keys:
            raise ValueError("No API keys configured. Please add an API key.")
        
        # Select provider
        if provider:
            key_obj = next((k for k in api_keys if k.provider == provider), None)
            if not key_obj:
                raise ValueError(f"No API key found for provider: {provider}")
        else:
            # Use first available key
            key_obj = api_keys[0]
            provider = key_obj.provider
        
        # Decrypt API key
        api_key = decrypt_api_key(key_obj.encrypted_api_key)
        
        # Make request based on provider
        if provider == "openai":
            response, usage = await self._call_openai(api_key, prompt, max_tokens)
        elif provider == "anthropic":
            response, usage = await self._call_anthropic(api_key, prompt, max_tokens)
        elif provider == "google":
            response, usage = await self._call_google(api_key, prompt, max_tokens)
        else:
            raise ValueError(f"Unknown provider: {provider}")
        
        # Track usage
        await self._track_usage(customer.id, provider, usage, db)
        
        return response, {"provider": provider, "usage": usage}
    
    async def _handle_unlimited_request(
        self, 
        customer: Customer, 
        prompt: str,
        db: AsyncSession,
        max_tokens: int
    ) -> Tuple[str, Dict]:
        """Handle unlimited plan customer request"""
        
        # Check daily limit
        today_usage = await self._get_today_usage(customer.id, db)
        if today_usage >= self.daily_limit:
            raise ValueError(f"Daily token limit exceeded ({self.daily_limit} tokens)")
        
        # Use our Anthropic key
        response, usage = await self._call_anthropic(self.anthropic_key, prompt, max_tokens)
        
        # Track usage
        await self._track_usage(customer.id, "anthropic", usage, db)
        
        return response, {"provider": "anthropic", "usage": usage}
    
    async def _call_openai(self, api_key: str, prompt: str, max_tokens: int) -> Tuple[str, Dict]:
        """Call OpenAI API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4-turbo-preview",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens
                }
            )
            response.raise_for_status()
            data = response.json()
            
            usage = data.get("usage", {})
            return data["choices"][0]["message"]["content"], {
                "input_tokens": usage.get("prompt_tokens", 0),
                "output_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0)
            }
    
    async def _call_anthropic(self, api_key: str, prompt: str, max_tokens: int) -> Tuple[str, Dict]:
        """Call Anthropic API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens
                }
            )
            response.raise_for_status()
            data = response.json()
            
            usage = data.get("usage", {})
            return data["content"][0]["text"], {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0),
                "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
            }
    
    async def _call_google(self, api_key: str, prompt: str, max_tokens: int) -> Tuple[str, Dict]:
        """Call Google AI API (Gemini)"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": max_tokens}
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Google doesn't provide token counts in response
            # Estimate: 1 token ≈ 4 characters
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            input_tokens = len(prompt) // 4
            output_tokens = len(text) // 4
            
            return text, {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            }
    
    async def _track_usage(
        self, 
        customer_id: int, 
        provider: str, 
        usage: Dict,
        db: AsyncSession
    ):
        """Track token usage in database"""
        today = date.today()
        
        # Check if record exists
        result = await db.execute(
            select(UsageTracking).where(
                UsageTracking.customer_id == customer_id,
                UsageTracking.date == today,
                UsageTracking.provider == provider
            )
        )
        record = result.scalar_one_or_none()
        
        if record:
            # Update existing
            record.input_tokens += usage.get("input_tokens", 0)
            record.output_tokens += usage.get("output_tokens", 0)
            record.total_tokens += usage.get("total_tokens", 0)
            record.requests += 1
        else:
            # Create new
            record = UsageTracking(
                customer_id=customer_id,
                date=today,
                provider=provider,
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                total_tokens=usage.get("total_tokens", 0),
                requests=1
            )
            db.add(record)
        
        await db.commit()
    
    async def _get_today_usage(self, customer_id: int, db: AsyncSession) -> int:
        """Get today's total token usage"""
        today = date.today()
        
        result = await db.execute(
            select(UsageTracking).where(
                UsageTracking.customer_id == customer_id,
                UsageTracking.date == today
            )
        )
        records = result.scalars().all()
        
        return sum(record.total_tokens for record in records)