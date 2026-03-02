#!/usr/bin/env python3
"""Send remaining test emails"""
import asyncio
from services.email import EmailService

async def send_remaining():
    """Send the emails that failed due to rate limit"""
    email_service = EmailService()
    
    # VM Error Email
    print("📧 Sending VM Error Email...")
    success = await email_service.send_vm_error_email(
        to_email="lenny.enderle@gmx.de",
        error_message="Test error: Could not connect to Hetzner API (simulated)"
    )
    print(f"   VM Error Email: {'✅ Sent' if success else '❌ Failed'}")
    
    await asyncio.sleep(1)  # Rate limit
    
    # Subscription Cancelled Email
    print("\n📧 Sending Subscription Cancelled Email...")
    success = await email_service.send_subscription_cancelled_email(
        to_email="lenny.enderle@gmx.de",
        bot_username="TestButlrBot"
    )
    print(f"   Subscription Cancelled Email: {'✅ Sent' if success else '❌ Failed'}")
    
    print("\n✨ Remaining emails sent!")

if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(send_remaining())