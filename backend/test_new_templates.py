#!/usr/bin/env python3
"""Test new unified email templates"""
import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.email import EmailService


async def test_new_templates():
    """Test the new unified email templates"""
    
    # Load .env if it exists
    if os.path.exists('.env'):
        with open('.env') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    
    email_service = EmailService()
    test_email = "lenny.enderle@gmx.de"
    
    print("🎨 TESTING NEW UNIFIED EMAIL TEMPLATES")
    print("=" * 50)
    
    tests = [
        {
            "name": "Trial Ending (3 days) - New Design",
            "func": lambda: email_service.send_trial_ending_email(
                to_email=test_email,
                days_left=3,
                portal_url="https://butlr.cloud/portal"
            )
        },
        {
            "name": "VM Error - New Design",
            "func": lambda: email_service.send_vm_error_email(
                to_email=test_email,
                error_message="Failed to allocate VM: Insufficient resources in region DE"
            )
        },
        {
            "name": "Subscription Cancelled - New Design",
            "func": lambda: email_service.send_subscription_cancelled_email(
                to_email=test_email,
                bot_username="TestButlrBot"
            )
        },
        {
            "name": "Payment Failed - New Design",
            "func": lambda: email_service.send_payment_failed_email(
                to_email=test_email,
                bot_username="TestButlrBot"
            )
        },
        {
            "name": "Health Alert (High Memory) - New Design",
            "func": lambda: email_service.send_health_alert_email(
                to_email=test_email,
                bot_username="TestButlrBot",
                alert_type="high_memory",
                details="Memory usage: 87% (1.74GB/2GB)\nTop processes: clawdbot (1.2GB), postgres (340MB)",
                portal_url="https://butlr.cloud/portal"
            )
        },
        {
            "name": "Usage Report (Weekly) - New Design",
            "func": lambda: email_service.send_usage_report_email(
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
            )
        }
    ]
    
    for test in tests:
        print(f"\n📧 Testing: {test['name']}")
        try:
            success = await test['func']()
            print(f"   Result: {'✅ Sent successfully!' if success else '❌ Failed to send'}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        # Wait 0.6 seconds between emails to respect rate limit
        await asyncio.sleep(0.6)
    
    print("\n" + "=" * 50)
    print("✨ All templates now use unified design system!")
    print("🎨 Features:")
    print("   • Consistent dark theme across all emails")
    print("   • Responsive design with mobile support")
    print("   • Beautiful gradients and modern styling")
    print("   • Reusable components (buttons, alerts, stats)")
    print("   • Professional yet friendly tone")


if __name__ == "__main__":
    asyncio.run(test_new_templates())