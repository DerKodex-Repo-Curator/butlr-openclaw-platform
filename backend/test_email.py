#!/usr/bin/env python3
"""Test Email Script for Butlr"""
import asyncio
import sys
from services.email import EmailService

async def test_emails():
    """Send test emails to Lenny"""
    email_service = EmailService()
    
    # Welcome Email
    print("📧 Sending Welcome Email...")
    success = await email_service.send_welcome_email(
        to_email="lenny.enderle@gmx.de",
        bot_username="TestButlrBot",
        portal_url="https://butlr.cloud/portal"
    )
    print(f"   Welcome Email: {'✅ Sent' if success else '❌ Failed'}")
    await asyncio.sleep(1)  # Rate limit delay
    
    # Payment Failed Email
    print("\n📧 Sending Payment Failed Email...")
    success = await email_service.send_payment_failed_email(
        to_email="lenny.enderle@gmx.de",
        bot_username="TestButlrBot"
    )
    print(f"   Payment Failed Email: {'✅ Sent' if success else '❌ Failed'}")
    await asyncio.sleep(1)  # Rate limit delay
    
    # VM Error Email
    print("\n📧 Sending VM Error Email...")
    success = await email_service.send_vm_error_email(
        to_email="lenny.enderle@gmx.de",
        error_message="Test error: Could not connect to Hetzner API (simulated)"
    )
    print(f"   VM Error Email: {'✅ Sent' if success else '❌ Failed'}")
    await asyncio.sleep(1)  # Rate limit delay
    
    # Subscription Cancelled Email
    print("\n📧 Sending Subscription Cancelled Email...")
    success = await email_service.send_subscription_cancelled_email(
        to_email="lenny.enderle@gmx.de",
        bot_username="TestButlrBot"
    )
    print(f"   Subscription Cancelled Email: {'✅ Sent' if success else '❌ Failed'}")
    
    print("\n✨ All test emails sent to lenny.enderle@gmx.de")

if __name__ == "__main__":
    # Load environment variables
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run the test
    asyncio.run(test_emails())