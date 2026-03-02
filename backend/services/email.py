"""Email Service for Butlr - using Resend"""
import os
from typing import Optional
import httpx
from .email_templates import get_base_template, button_primary, button_secondary, alert_box, stat_card, feature_list


class EmailService:
    def __init__(self):
        self.api_key = os.getenv("RESEND_API_KEY")
        self.from_email = "Butlr <hello@butlr.cloud>"
        self.base_url = "https://api.resend.com"
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html: str,
        text: Optional[str] = None
    ) -> bool:
        """Send an email via Resend API"""
        if not self.api_key:
            print("Warning: RESEND_API_KEY not set, skipping email")
            return False
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/emails",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": self.from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html,
                    "text": text or ""
                }
            )
            
            if response.status_code == 200:
                return True
            else:
                print(f"Email error: {response.text}")
                return False
    
    async def send_welcome_email(
        self,
        to_email: str,
        bot_username: str,
        portal_url: str
    ) -> bool:
        """Send welcome email with bot link"""
        
        subject = "🎉 Your Butlr is ready!"
        
        html = f'''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050508; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050508; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #22d3ee, #10b981); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 28px; color: black; font-weight: bold;">B</span>
              </div>
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">
                Your Butlr is ready! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding-bottom: 30px;">
              <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 18px; line-height: 1.6; text-align: center;">
                Your personal AI assistant is set up and waiting for you. 
                Start chatting now to see what Butlr can do!
              </p>
            </td>
          </tr>
          
          <!-- Bot Card -->
          <tr>
            <td style="padding-bottom: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(16,185,129,0.1)); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px;">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width: 60px;">
                          <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #22d3ee, #10b981); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                            <span style="color: black; font-weight: bold; font-size: 20px;">B</span>
                          </div>
                        </td>
                        <td>
                          <p style="margin: 0; color: white; font-size: 18px; font-weight: 600;">@{bot_username}</p>
                          <p style="margin: 4px 0 0; color: #10b981; font-size: 14px;">● Online and ready</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <a href="https://t.me/{bot_username}" style="display: block; background: linear-gradient(90deg, #22d3ee, #10b981); color: black; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center;">
                      Open in Telegram →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- What Butlr Can Do -->
          <tr>
            <td style="padding-bottom: 30px;">
              <h2 style="margin: 0 0 16px; color: white; font-size: 20px; font-weight: 600;">
                What your Butlr can do:
              </h2>
              <table width="100%" cellpadding="0" cellspacing="8">
                <tr>
                  <td width="50%" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">🌐 Browse the web</p>
                  </td>
                  <td width="50%" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">📁 Manage files</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">📅 Schedule tasks</p>
                  </td>
                  <td width="50%" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                    <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">⚡ Automate work</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Tips -->
          <tr>
            <td style="padding-bottom: 30px;">
              <h2 style="margin: 0 0 16px; color: white; font-size: 20px; font-weight: 600;">
                Quick tips to get started:
              </h2>
              <ol style="margin: 0; padding: 0 0 0 20px; color: rgba(255,255,255,0.6); font-size: 15px; line-height: 2;">
                <li>Say "Hi" to your Butlr to introduce yourself</li>
                <li>Ask it to research something for you</li>
                <li>Try: "Set a reminder for tomorrow at 9am"</li>
                <li>Ask it to help organize your tasks</li>
              </ol>
            </td>
          </tr>
          
          <!-- Portal Link -->
          <tr>
            <td style="padding-bottom: 30px;">
              <a href="{portal_url}" style="display: block; background: rgba(255,255,255,0.1); color: white; text-decoration: none; padding: 16px 24px; border-radius: 12px; font-size: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1);">
                View your Dashboard →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px;">
              <p style="margin: 0; color: rgba(255,255,255,0.4); font-size: 13px; text-align: center;">
                Questions? Just reply to this email or ask your Butlr!
              </p>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.3); font-size: 12px; text-align: center;">
                Butlr · An AI that actually does things
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
'''
        
        text = f'''
Your Butlr is ready! 🎉

Your personal AI assistant is set up and waiting for you.

Open Telegram: https://t.me/{bot_username}

What your Butlr can do:
- Browse the web
- Manage files  
- Schedule tasks
- Automate work

Quick tips to get started:
1. Say "Hi" to introduce yourself
2. Ask it to research something
3. Try: "Set a reminder for tomorrow at 9am"
4. Ask it to help organize your tasks

Dashboard: {portal_url}

Questions? Just reply to this email!

- Butlr Team
'''
        
        return await self.send_email(to_email, subject, html, text)
    
    async def send_trial_ending_email(
        self,
        to_email: str,
        days_left: int,
        portal_url: str
    ) -> bool:
        """Send trial ending reminder"""
        
        subject = f"⏰ Your Butlr trial ends in {days_left} days"
        
        content = f'''
            <h1 style="margin: 0 0 20px; color: white; font-size: 32px; text-align: center; font-weight: 600;">
                Your trial ends in {days_left} days ⏰
            </h1>
            
            <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 18px; line-height: 1.6; text-align: center;">
                Don't lose access to your Butlr! Your subscription will start automatically 
                after the trial, or you can cancel anytime.
            </p>
            
            <!-- Trial Info Box -->
            {alert_box(f'''
                <h3 style="margin: 0 0 12px; color: #f59e0b; font-size: 18px;">🔔 What happens next?</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: rgba(255,255,255,0.8); line-height: 1.8;">
                    <li>Trial ends in <strong>{days_left} days</strong></li>
                    <li>Monthly subscription starts automatically</li>
                    <li>Cancel anytime - no questions asked</li>
                    <li>All your data and settings will be preserved</li>
                </ul>
            ''', "#f59e0b")}
            
            <!-- Current Usage Stats -->
            <h3 style="margin: 30px 0 20px; color: white; font-size: 20px; text-align: center;">
                Your Butlr has been busy! 📊
            </h3>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 30px;">
                {stat_card("147", "Tasks Completed", "#a855f7")}
                {stat_card("2.3k", "Messages", "#22d3ee")}
            </div>
            
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 40px 0 20px;">
                {button_primary("Continue to Billing →", f"{portal_url}/billing")}
                <p style="margin: 20px 0 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                    or <a href="{portal_url}/cancel" style="color: #ef4444; text-decoration: underline;">cancel subscription</a>
                </p>
            </div>
        '''
        
        html = get_base_template(content)
        
        text = f'''Your Butlr trial ends in {days_left} days

Don't lose access to your Butlr! Your subscription will start automatically after the trial, or you can cancel anytime.

What happens next:
• Trial ends in {days_left} days
• Monthly subscription starts automatically
• Cancel anytime - no questions asked
• All your data and settings will be preserved

Continue to Billing: {portal_url}/billing

- Butlr Team'''
        
        return await self.send_email(to_email, subject, html, text)
    
    async def send_vm_error_email(
        self,
        to_email: str,
        error_message: str
    ) -> bool:
        """Send email when VM provisioning fails"""
        
        subject = "⚠️ Issue with your Butlr setup"
        
        content = f'''
            <!-- Error Icon -->
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: rgba(239,68,68,0.1); border: 2px solid #ef4444; border-radius: 50%; line-height: 80px; font-size: 40px;">
                    ⚠️
                </div>
            </div>
            
            <h1 style="margin: 0 0 20px; color: #ef4444; font-size: 32px; text-align: center; font-weight: 600;">
                We hit a snag setting up your Butlr
            </h1>
            
            <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 18px; line-height: 1.6; text-align: center;">
                Don't worry! Our team has been notified and is working on it. 
                <strong>Your subscription won't be charged</strong> until everything is working perfectly.
            </p>
            
            <!-- Error Details -->
            {alert_box(f'''
                <h3 style="margin: 0 0 8px; color: white; font-size: 16px;">🔍 Error details:</h3>
                <code style="display: block; margin: 0; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; color: #ef4444; font-family: monospace; font-size: 14px; word-break: break-all;">
                    {error_message}
                </code>
            ''', "#ef4444")}
            
            <!-- What we're doing -->
            <div style="background: rgba(34,211,238,0.05); border: 1px solid rgba(34,211,238,0.1); border-radius: 12px; padding: 24px; margin: 30px 0;">
                <h3 style="margin: 0 0 16px; color: #22d3ee; font-size: 18px;">🛠️ What we're doing:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: rgba(255,255,255,0.8); line-height: 1.8;">
                    <li>Our engineering team has been automatically notified</li>
                    <li>We're investigating the issue right now</li>
                    <li>You'll receive an email as soon as it's resolved</li>
                    <li>Expected resolution time: <strong>within 2 hours</strong></li>
                </ul>
            </div>
            
            <!-- CTA -->
            <div style="text-align: center; margin: 40px 0;">
                {button_primary("Check Status →", "https://butlr.cloud/portal")}
                {button_secondary("Contact Support", "mailto:support@butlr.cloud")}
            </div>
            
            <p style="margin: 20px 0 0; color: rgba(255,255,255,0.5); font-size: 14px; text-align: center;">
                Reference ID: <code style="color: #22d3ee;">{error_message[:8]}</code>
            </p>
        '''
        
        html = get_base_template(content, "Need help? Reply to this email and we'll assist you immediately!")
        
        text = f'''Issue with your Butlr setup

We hit a snag setting up your Butlr. Don't worry! Our team has been notified and is working on it.

Error details:
{error_message}

Your subscription won't be charged until everything is working perfectly.

What we're doing:
• Our engineering team has been automatically notified
• We're investigating the issue right now
• You'll receive an email as soon as it's resolved
• Expected resolution time: within 2 hours

Check Status: https://butlr.cloud/portal

Need help? Reply to this email!

- Butlr Team'''
        
        text = f'''Issue with your Butlr setup

We hit a snag setting up your Butlr. Don't worry! Our team has been notified and is working on it.

Error: {error_message}

Your subscription won't be charged until everything is working perfectly.

We'll email you as soon as your Butlr is ready.

- Butlr Team'''
        
        return await self.send_email(to_email, subject, html, text)
    
    async def send_subscription_cancelled_email(
        self,
        to_email: str,
        bot_username: str
    ) -> bool:
        """Send email when subscription is cancelled"""
        
        subject = "Your Butlr subscription has been cancelled"
        
        content = f'''
            <!-- Sad Icon -->
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); border-radius: 50%; line-height: 80px; font-size: 40px;">
                    😢
                </div>
            </div>
            
            <h1 style="margin: 0 0 20px; color: white; font-size: 32px; text-align: center; font-weight: 600;">
                We're sad to see you go
            </h1>
            
            <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 18px; line-height: 1.6; text-align: center;">
                Your Butlr subscription has been cancelled. 
                <strong style="color: #ef4444;">@{bot_username}</strong> will stop working within 24 hours.
            </p>
            
            <!-- Important Info -->
            {alert_box('''
                <h3 style="margin: 0 0 16px; color: white; font-size: 18px;">⏰ Before you go:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: rgba(255,255,255,0.8); line-height: 1.8;">
                    <li><strong>Export your data</strong> - Save any important conversations</li>
                    <li><strong>24 hours remaining</strong> - Your bot is still active</li>
                    <li><strong>30 day grace period</strong> - Data deleted after this</li>
                    <li><strong>Easy reactivation</strong> - All settings preserved</li>
                </ul>
            ''', "#f59e0b")}
            
            <!-- Feedback Request -->
            <div style="background: linear-gradient(135deg, rgba(139,92,246,0.05), rgba(236,72,153,0.05)); border: 1px solid rgba(139,92,246,0.1); border-radius: 12px; padding: 24px; margin: 30px 0; text-align: center;">
                <h3 style="margin: 0 0 12px; color: #a78bfa; font-size: 18px;">💭 Help us improve</h3>
                <p style="margin: 0 0 20px; color: rgba(255,255,255,0.7); font-size: 15px;">
                    We'd love to know why you're leaving. Your feedback helps us build a better Butlr.
                </p>
                {button_secondary("Share Feedback", "https://butlr.cloud/feedback")}
            </div>
            
            <!-- Reactivation Option -->
            <div style="text-align: center; margin: 40px 0;">
                <p style="margin: 0 0 20px; color: rgba(255,255,255,0.6); font-size: 16px;">
                    Changed your mind? You can reactivate anytime.
                </p>
                {button_primary("Reactivate Subscription →", "https://butlr.cloud/portal")}
            </div>
            
            <!-- Personal Touch -->
            <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 40px; padding-top: 30px; text-align: center;">
                <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 14px; font-style: italic;">
                    "Thanks for giving Butlr a try. We hope to see you again!" 
                </p>
                <p style="margin: 10px 0 0; color: rgba(255,255,255,0.4); font-size: 13px;">
                    - The Butlr Team 🤖
                </p>
            </div>
        '''
        
        html = get_base_template(content, "We're always here if you need us. Just reply to this email!")
        
        text = f'''We're sad to see you go 😢

Your Butlr subscription has been cancelled. @{bot_username} will stop working within 24 hours.

Before you go:
• Export your data - Save any important conversations
• 24 hours remaining - Your bot is still active
• 30 day grace period - Data deleted after this
• Easy reactivation - All settings preserved

We'd love your feedback: https://butlr.cloud/feedback

Changed your mind? Reactivate anytime: https://butlr.cloud/portal

Thanks for trying Butlr!

- The Butlr Team'''
        
        return await self.send_email(to_email, subject, html, text)
    
    async def send_payment_failed_email(
        self,
        to_email: str,
        bot_username: str
    ) -> bool:
        """Send email when payment fails"""
        
        subject = "⚠️ Payment issue with your Butlr subscription"
        
        content = f'''
            <!-- Warning Icon -->
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: rgba(245,158,11,0.1); border: 2px solid #f59e0b; border-radius: 50%; line-height: 80px; font-size: 40px;">
                    💳
                </div>
            </div>
            
            <h1 style="margin: 0 0 20px; color: #f59e0b; font-size: 32px; text-align: center; font-weight: 600;">
                Payment issue detected
            </h1>
            
            <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 18px; line-height: 1.6; text-align: center;">
                We couldn't process your payment for Butlr. To keep 
                <strong style="color: #22d3ee;">@{bot_username}</strong> running, 
                please update your payment method.
            </p>
            
            <!-- Timeline Alert -->
            {alert_box('''
                <h3 style="margin: 0 0 16px; color: #f59e0b; font-size: 18px;">⏱️ Timeline:</h3>
                <div style="position: relative; padding-left: 30px;">
                    <div style="position: absolute; left: 10px; top: 30px; bottom: 10px; width: 2px; background: rgba(245,158,11,0.3);"></div>
                    
                    <div style="position: relative; margin-bottom: 16px;">
                        <div style="position: absolute; left: -25px; width: 12px; height: 12px; background: #f59e0b; border-radius: 50%;"></div>
                        <strong style="color: white;">Now</strong> - Payment failed
                    </div>
                    
                    <div style="position: relative; margin-bottom: 16px;">
                        <div style="position: absolute; left: -25px; width: 12px; height: 12px; background: rgba(245,158,11,0.5); border-radius: 50%;"></div>
                        <strong style="color: white;">In 3 days</strong> - Automatic retry
                    </div>
                    
                    <div style="position: relative; margin-bottom: 16px;">
                        <div style="position: absolute; left: -25px; width: 12px; height: 12px; background: rgba(239,68,68,0.5); border-radius: 50%;"></div>
                        <strong style="color: white;">After 7 days</strong> - Bot paused ⚠️
                    </div>
                    
                    <div style="position: relative;">
                        <div style="position: absolute; left: -25px; width: 12px; height: 12px; background: #ef4444; border-radius: 50%;"></div>
                        <strong style="color: white;">After 30 days</strong> - Data deleted ❌
                    </div>
                </div>
            ''', "#f59e0b")}
            
            <!-- Quick Fix CTA -->
            <div style="text-align: center; margin: 40px 0;">
                <p style="margin: 0 0 20px; color: rgba(255,255,255,0.6); font-size: 16px;">
                    Fix this in less than 2 minutes:
                </p>
                {button_primary("Update Payment Method →", "https://butlr.cloud/portal/billing")}
            </div>
            
            <!-- Common Issues -->
            <div style="background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.1); border-radius: 12px; padding: 20px; margin: 30px 0;">
                <h4 style="margin: 0 0 12px; color: #3b82f6; font-size: 16px;">💡 Common reasons:</h4>
                <ul style="margin: 0; padding: 0 0 0 20px; color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.6;">
                    <li>Expired card</li>
                    <li>Insufficient funds</li>
                    <li>Bank declined the transaction</li>
                    <li>Card limit reached</li>
                </ul>
            </div>
            
            <p style="margin: 20px 0 0; color: rgba(255,255,255,0.5); font-size: 14px; text-align: center;">
                Having trouble? We're here to help! Just reply to this email.
            </p>
        '''
        
        html = get_base_template(content, "Need assistance? Reply to this email and we'll help resolve the payment issue.")
        
        text = f'''Payment issue with your Butlr subscription

We couldn't process your payment. To keep @{bot_username} running, please update your payment method.

Timeline:
• Now - Payment failed
• In 3 days - Automatic retry
• After 7 days - Bot paused ⚠️
• After 30 days - Data deleted ❌

Update payment method: https://butlr.cloud/portal/billing

Common reasons:
• Expired card
• Insufficient funds
• Bank declined the transaction
• Card limit reached

Having issues? Reply to this email.

- Butlr Team'''
        
        text = f'''Payment issue with your Butlr subscription

We couldn't process your payment. To keep @{bot_username} running, please update your payment method.

What happens next:
- We'll retry in 3 days
- After 7 days, your bot will be paused
- After 30 days, your bot will be deleted

Update payment method: https://butlr.cloud/portal/billing

Having issues? Reply to this email.

- Butlr Team'''
        
        return await self.send_email(to_email, subject, html, text)
    
    async def send_health_alert_email(
        self,
        to_email: str,
        bot_username: str,
        alert_type: str,  # 'down', 'slow_response', 'high_memory', etc.
        details: str,
        portal_url: str
    ) -> bool:
        """Send health monitoring alert"""
        
        alert_configs = {
            'down': {
                'subject': '🔴 Your Butlr is offline',
                'color': '#ef4444',
                'icon': '🔴',
                'message': 'Your Butlr appears to be offline and not responding.'
            },
            'slow_response': {
                'subject': '⚠️ Your Butlr is responding slowly',
                'color': '#f59e0b',
                'icon': '⚠️',
                'message': 'Your Butlr is experiencing slow response times.'
            },
            'high_memory': {
                'subject': '⚠️ Your Butlr is using high memory',
                'color': '#f59e0b',
                'icon': '💾',
                'message': 'Your Butlr is using more memory than usual.'
            },
            'restarted': {
                'subject': '✅ Your Butlr has been restarted',
                'color': '#10b981',
                'icon': '✅',
                'message': 'Your Butlr was automatically restarted to resolve an issue.'
            }
        }
        
        config = alert_configs.get(alert_type, {
            'subject': '⚠️ Butlr health alert',
            'color': '#f59e0b',
            'icon': '⚠️',
            'message': 'There is a health alert for your Butlr.'
        })
        
        content = f'''
            <!-- Alert Icon -->
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: {config['color']}20; border: 2px solid {config['color']}; border-radius: 50%; line-height: 80px; font-size: 40px;">
                    {config['icon']}
                </div>
            </div>
            
            <h1 style="margin: 0 0 20px; color: white; font-size: 32px; text-align: center; font-weight: 600;">
                {config['subject'].replace(config['icon'], '').strip()}
            </h1>
            
            <p style="margin: 0 0 30px; color: rgba(255,255,255,0.7); font-size: 18px; line-height: 1.6; text-align: center;">
                {config['message']}
            </p>
            
            <!-- Details Box -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin: 0 0 30px;">
                <h3 style="margin: 0 0 12px; color: white; font-size: 16px;">🔍 Details:</h3>
                <pre style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px; white-space: pre-wrap; font-family: 'SF Mono', Consolas, monospace; line-height: 1.5;">{details}</pre>
            </div>
            
            <!-- Status Info based on alert type -->
            {"" if alert_type != "down" else alert_box('''
                <h4 style="margin: 0 0 12px; color: white; font-size: 16px;">🚨 Immediate Action Required</h4>
                <p style="margin: 0 0 12px; color: rgba(255,255,255,0.8); font-size: 14px;">
                    Your Butlr is not responding. We're attempting automatic recovery.
                </p>
                <ul style="margin: 0; padding: 0 0 0 20px; color: rgba(255,255,255,0.7); font-size: 14px;">
                    <li>Check your internet connection</li>
                    <li>Try messaging your bot</li>
                    <li>View health dashboard for more info</li>
                </ul>
            ''', "#ef4444")}
            
            {"" if alert_type != "high_memory" else alert_box('''
                <h4 style="margin: 0 0 12px; color: white; font-size: 16px;">💡 What this means:</h4>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    High memory usage can slow down responses. We may restart your Butlr automatically if needed.
                </p>
            ''', "#f59e0b")}
            
            {"" if alert_type != "restarted" else alert_box('''
                <h4 style="margin: 0 0 12px; color: white; font-size: 16px;">✅ All good now!</h4>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    Your Butlr has been successfully restarted and is working normally again. No action needed!
                </p>
            ''', "#10b981")}
            
            <!-- CTA Buttons -->
            <div style="text-align: center; margin: 40px 0;">
                {button_primary("Check Butlr →", f"https://t.me/{bot_username}")}
                {button_secondary("Health Dashboard →", f"{portal_url}/health")}
            </div>
            
            <p style="margin: 20px 0 0; color: rgba(255,255,255,0.5); font-size: 14px; text-align: center;">
                Alert generated at: <code style="color: #22d3ee;">{details.split()[0] if details else "Now"}</code>
            </p>
        '''
        
        html = get_base_template(content, "This is an automated health monitoring alert from Butlr.")
        
        text = f'''{config['subject']}

{config['message']}

Details:
{details}

Check your Butlr: https://t.me/{bot_username}
View Health Dashboard: {portal_url}/health

This is an automated health monitoring alert.
'''
        
        return await self.send_email(to_email, config['subject'], html, text)
    
    async def send_usage_report_email(
        self,
        to_email: str,
        bot_username: str,
        period: str,  # 'weekly' or 'monthly'
        stats: dict,
        portal_url: str
    ) -> bool:
        """Send usage analytics report"""
        
        period_text = 'Weekly' if period == 'weekly' else 'Monthly'
        
        # Extract stats with defaults
        messages_sent = stats.get('messages_sent', 0)
        tasks_completed = stats.get('tasks_completed', 0)
        files_processed = stats.get('files_processed', 0)
        active_days = stats.get('active_days', 0)
        most_used_feature = stats.get('most_used_feature', 'General Chat')
        total_tokens = stats.get('total_tokens', 0)
        
        subject = f"📊 Your {period_text} Butlr Report"
        
        content = f'''
            <!-- Report Icon -->
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(16,185,129,0.1)); border: 2px solid #22d3ee; border-radius: 20px; line-height: 80px; font-size: 40px;">
                    📊
                </div>
            </div>
            
            <h1 style="margin: 0 0 10px; color: white; font-size: 32px; text-align: center; font-weight: 600;">
                Your {period_text} Butlr Report
            </h1>
            
            <p style="margin: 0 0 40px; color: rgba(255,255,255,0.7); font-size: 18px; text-align: center;">
                Here's what <strong style="color: #22d3ee;">@{bot_username}</strong> accomplished this {period.lower()}
            </p>
            
            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 30px;">
                {stat_card(f"{messages_sent:,}", "Messages Exchanged", "#22d3ee")}
                {stat_card(f"{tasks_completed}", "Tasks Completed", "#a855f7")}
                {stat_card(f"{files_processed}", "Files Processed", "#fb923c")}
                {stat_card(f"{active_days}", "Active Days", "#3b82f6")}
            </div>
            
            <!-- Most Used Feature -->
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 30px; text-align: center;">
                <h3 style="margin: 0 0 8px; color: rgba(255,255,255,0.6); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Most Used Feature</h3>
                <p style="margin: 0; color: #10b981; font-size: 24px; font-weight: 600;">{most_used_feature}</p>
            </div>
            
            <!-- Activity Visualization -->
            <div style="background: linear-gradient(135deg, rgba(34,211,238,0.02), rgba(16,185,129,0.02)); border: 1px solid rgba(34,211,238,0.1); border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
                <div style="margin-bottom: 20px;">
                    {"📈" if messages_sent > 100 else "📊"} 
                    <span style="font-size: 48px; font-weight: bold; background: linear-gradient(90deg, #22d3ee, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        {round(messages_sent / max(active_days, 1))}
                    </span>
                    <p style="margin: 10px 0 0; color: rgba(255,255,255,0.6); font-size: 14px;">
                        Average messages per active day
                    </p>
                </div>
                <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 13px;">
                    📈 Full activity trends available in your dashboard
                </p>
            </div>
            
            <!-- Pro Tips -->
            {alert_box(f'''
                <h3 style="margin: 0 0 12px; color: #10b981; font-size: 16px;">💡 Pro tip for you:</h3>
                <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    {"Try scheduling recurring tasks with <code>remind me every Monday at 9am</code> - it's like having a personal assistant!" if tasks_completed < 5 else "You're using Butlr like a pro! 🎯 Try our browser automation features next for even more productivity." if tasks_completed < 20 else "Power user alert! 🚀 With your usage level, you might benefit from our advanced API access for custom integrations."}
                </p>
            ''', "#10b981")}
            
            <!-- CTA -->
            <div style="text-align: center; margin: 40px 0;">
                {button_primary("View Full Analytics →", f"{portal_url}/analytics")}
                <p style="margin: 20px 0 0; color: rgba(255,255,255,0.5); font-size: 14px;">
                    Compare with previous {period}s and see detailed breakdowns
                </p>
            </div>
        '''
        
        footer_text = f"This is your {period_text.lower()} usage report. You'll receive the next one in a {period}."
        html = get_base_template(content, footer_text)
        
        text = f'''Your {period_text} Butlr Report

Here's what @{bot_username} accomplished this {period.lower()}:

📊 Key Stats:
• Messages Exchanged: {messages_sent:,}
• Tasks Completed: {tasks_completed}
• Files Processed: {files_processed}
• Active Days: {active_days}

🏆 Most Used Feature: {most_used_feature}

View full analytics: {portal_url}/analytics

- Butlr Team
'''
        
        return await self.send_email(to_email, subject, html, text)
