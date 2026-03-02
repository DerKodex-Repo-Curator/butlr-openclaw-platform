#!/usr/bin/env python3
"""Email Testing with Rate Limiting"""
import asyncio
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.email import EmailService


async def test_with_rate_limit():
    """Test emails with 0.5 second delay to respect Resend's rate limit"""
    
    test_email = "lenny.enderle@gmx.de"
    email_service = EmailService()
    
    print("🧪 RATE-LIMITED EMAIL TEST (0.5s delay between emails)")
    print("=" * 50)
    
    tests = [
        ("Welcome Email", lambda: email_service.send_welcome_email(
            to_email=test_email,
            bot_username="TestButlrBot",
            portal_url="https://butlr.cloud/portal"
        )),
        ("Health Alert - High Memory", lambda: email_service.send_health_alert_email(
            to_email=test_email,
            bot_username="TestButlrBot",
            alert_type="high_memory",
            details="Memory usage: 87% (1.74GB/2GB)\nTop processes: clawdbot (1.2GB)",
            portal_url="https://butlr.cloud/portal"
        )),
        ("Usage Report - Weekly", lambda: email_service.send_usage_report_email(
            to_email=test_email,
            bot_username="TestButlrBot",
            period="weekly",
            stats={
                'messages_sent': 234,
                'tasks_completed': 18,
                'files_processed': 42,
                'active_days': 6,
                'most_used_feature': 'Web Search'
            },
            portal_url="https://butlr.cloud/portal"
        ))
    ]
    
    for name, test_func in tests:
        print(f"\n📧 Testing: {name}")
        try:
            success = await test_func()
            print(f"   Result: {'✅ Sent' if success else '❌ Failed'}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        # Rate limit: 0.5 seconds between requests
        await asyncio.sleep(0.5)
    
    print("\n" + "=" * 50)
    print("✅ Rate-limited test complete!")


if __name__ == "__main__":
    # Load .env if it exists
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    
    asyncio.run(test_with_rate_limit())