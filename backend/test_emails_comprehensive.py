#!/usr/bin/env python3
"""Comprehensive Email Testing with Error Handling"""
import asyncio
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.email import EmailService


async def test_email_with_error_handling():
    """Test all email templates with error handling"""
    
    # Test configuration
    test_email = "lenny.enderle@gmx.de"
    bot_username = "TestButlrBot"
    portal_url = "https://butlr.cloud/portal"
    
    # Save current API key
    original_api_key = os.getenv("RESEND_API_KEY")
    
    print("🧪 COMPREHENSIVE EMAIL TESTING")
    print("=" * 50)
    
    email_service = EmailService()
    
    # Test 1: Welcome Email
    print("\n📧 Test 1: Welcome Email")
    try:
        success = await email_service.send_welcome_email(
            to_email=test_email,
            bot_username=bot_username,
            portal_url=portal_url
        )
        print(f"   Result: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 2: Trial Ending Email (3 days)
    print("\n⏰ Test 2: Trial Ending Email")
    try:
        success = await email_service.send_trial_ending_email(
            to_email=test_email,
            days_left=3,
            portal_url=portal_url
        )
        print(f"   Result: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 3: VM Error Email
    print("\n⚠️ Test 3: VM Error Email")
    try:
        success = await email_service.send_vm_error_email(
            to_email=test_email,
            error_message="Failed to allocate VM: Insufficient resources in region DE"
        )
        print(f"   Result: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 4: Subscription Cancelled Email
    print("\n😢 Test 4: Subscription Cancelled Email")
    try:
        success = await email_service.send_subscription_cancelled_email(
            to_email=test_email,
            bot_username=bot_username
        )
        print(f"   Result: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 5: Payment Failed Email
    print("\n💳 Test 5: Payment Failed Email")
    try:
        success = await email_service.send_payment_failed_email(
            to_email=test_email,
            bot_username=bot_username
        )
        print(f"   Result: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 6: Health Alert Emails (all types)
    print("\n🏥 Test 6: Health Alert Emails")
    health_alerts = [
        ('down', 'Connection timeout after 30 seconds\nLast seen: 2024-01-30 14:23 UTC'),
        ('slow_response', 'Average response time: 8.3s (threshold: 2s)\nAffected endpoints: /api/chat, /api/tasks'),
        ('high_memory', 'Memory usage: 87% (1.74GB/2GB)\nTop processes: clawdbot (1.2GB), postgres (340MB)'),
        ('restarted', 'Automatic restart due to high memory usage\nUptime before restart: 14 days 3 hours')
    ]
    
    for alert_type, details in health_alerts:
        print(f"\n   Testing {alert_type} alert...")
        try:
            success = await email_service.send_health_alert_email(
                to_email=test_email,
                bot_username=bot_username,
                alert_type=alert_type,
                details=details,
                portal_url=portal_url
            )
            print(f"   {alert_type}: {'✅ Sent' if success else '❌ Failed'}")
        except Exception as e:
            print(f"   {alert_type}: ❌ Exception: {e}")
    
    # Test 7: Usage Report Emails
    print("\n📊 Test 7: Usage Report Emails")
    
    # Weekly report
    print("\n   Testing weekly report...")
    try:
        weekly_stats = {
            'messages_sent': 234,
            'tasks_completed': 18,
            'files_processed': 42,
            'active_days': 6,
            'most_used_feature': 'Web Search',
            'total_tokens': 125000
        }
        success = await email_service.send_usage_report_email(
            to_email=test_email,
            bot_username=bot_username,
            period='weekly',
            stats=weekly_stats,
            portal_url=portal_url
        )
        print(f"   Weekly report: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   Weekly report: ❌ Exception: {e}")
    
    # Monthly report
    print("\n   Testing monthly report...")
    try:
        monthly_stats = {
            'messages_sent': 1847,
            'tasks_completed': 89,
            'files_processed': 156,
            'active_days': 24,
            'most_used_feature': 'Task Automation',
            'total_tokens': 580000
        }
        success = await email_service.send_usage_report_email(
            to_email=test_email,
            bot_username=bot_username,
            period='monthly',
            stats=monthly_stats,
            portal_url=portal_url
        )
        print(f"   Monthly report: {'✅ Sent' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   Monthly report: ❌ Exception: {e}")
    
    # Test 8: Error Handling - No API Key
    print("\n🔒 Test 8: Error Handling - Missing API Key")
    os.environ.pop('RESEND_API_KEY', None)
    email_service_no_key = EmailService()
    
    try:
        success = await email_service_no_key.send_welcome_email(
            to_email=test_email,
            bot_username=bot_username,
            portal_url=portal_url
        )
        print(f"   Result: {'✅ Handled gracefully' if not success else '❌ Should have failed'}")
    except Exception as e:
        print(f"   ❌ Unhandled exception: {e}")
    
    # Test 9: Error Handling - Invalid Email
    print("\n📧 Test 9: Error Handling - Invalid Email")
    os.environ['RESEND_API_KEY'] = original_api_key if original_api_key else ""
    email_service_restored = EmailService()
    
    try:
        success = await email_service_restored.send_welcome_email(
            to_email="not-an-email",
            bot_username=bot_username,
            portal_url=portal_url
        )
        print(f"   Result: {'✅ API rejected invalid email' if not success else '❌ API accepted invalid email'}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # Test 10: Edge Cases
    print("\n🔬 Test 10: Edge Cases")
    
    # Empty stats
    print("\n   Testing usage report with empty stats...")
    try:
        success = await email_service.send_usage_report_email(
            to_email=test_email,
            bot_username=bot_username,
            period='weekly',
            stats={},  # Empty stats
            portal_url=portal_url
        )
        print(f"   Empty stats: {'✅ Handled' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   Empty stats: ❌ Exception: {e}")
    
    # Unknown alert type
    print("\n   Testing unknown health alert type...")
    try:
        success = await email_service.send_health_alert_email(
            to_email=test_email,
            bot_username=bot_username,
            alert_type='unknown_type',
            details='This is an unknown alert type',
            portal_url=portal_url
        )
        print(f"   Unknown alert: {'✅ Handled with default' if success else '❌ Failed'}")
    except Exception as e:
        print(f"   Unknown alert: ❌ Exception: {e}")
    
    # Restore original API key
    if original_api_key:
        os.environ['RESEND_API_KEY'] = original_api_key
    
    print("\n" + "=" * 50)
    print("✅ Email testing complete!")
    print(f"📅 Tested on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    asyncio.run(test_email_with_error_handling())