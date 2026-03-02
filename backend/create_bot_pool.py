#!/usr/bin/env python3
"""
Bot Pool Creator - Helper script to create Telegram bots and add to pool

Usage:
    python create_bot_pool.py --count 50 --prefix Butlr

This script will:
1. Guide you through creating bots at @BotFather
2. Validate each bot token
3. Add valid bots to the database
"""

import asyncio
import httpx
import argparse
import json
from pathlib import Path
from datetime import datetime

# Config
API_BASE = "http://localhost:8000"
TELEGRAM_API = "https://api.telegram.org/bot{token}/getMe"

async def validate_bot_token(token: str) -> dict | None:
    """Validate a bot token with Telegram API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(TELEGRAM_API.format(token=token))
            data = response.json()
            if data.get("ok"):
                return data.get("result")
    except Exception as e:
        print(f"Error: {e}")
    return None


async def add_bot_to_api(token: str) -> bool:
    """Add bot to the pool via API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{API_BASE}/api/bot-pool/add",
                json={"bot_token": token}
            )
            return response.status_code == 200
    except Exception as e:
        print(f"API Error: {e}")
    return False


def generate_botfather_commands(prefix: str, start: int, count: int) -> list:
    """Generate BotFather commands for creating bots"""
    commands = []
    for i in range(start, start + count):
        username = f"{prefix}{i:03d}Bot"
        name = f"{prefix} Assistant #{i:03d}"
        commands.append({
            "number": i,
            "username": username,
            "name": name,
            "commands": [
                "/newbot",
                name,
                username
            ]
        })
    return commands


async def interactive_mode(prefix: str, count: int, start: int = 1):
    """Interactive mode - guide user through bot creation"""
    
    print("=" * 60)
    print("🤖 BUTLR BOT POOL CREATOR")
    print("=" * 60)
    print()
    print(f"We'll create {count} bots with prefix '{prefix}'")
    print(f"Usernames: @{prefix}001Bot to @{prefix}{count:03d}Bot")
    print()
    print("📝 INSTRUCTIONS:")
    print("1. Open Telegram and go to @BotFather")
    print("2. For each bot, send the commands shown below")
    print("3. Copy the token BotFather gives you")
    print("4. Paste it here when prompted")
    print()
    input("Press Enter when ready to start...")
    print()
    
    bots_created = []
    bots_file = Path(f"bot_tokens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    
    commands = generate_botfather_commands(prefix, start, count)
    
    for cmd in commands:
        print("-" * 40)
        print(f"🤖 Bot #{cmd['number']} - @{cmd['username']}")
        print("-" * 40)
        print()
        print("Send these to @BotFather:")
        for c in cmd["commands"]:
            print(f"  → {c}")
        print()
        
        while True:
            token = input("Paste the bot token (or 'skip' to skip, 'quit' to exit): ").strip()
            
            if token.lower() == 'quit':
                print("Exiting...")
                break
            
            if token.lower() == 'skip':
                print("Skipped.")
                break
            
            # Validate token
            print("Validating token...", end=" ")
            info = await validate_bot_token(token)
            
            if info:
                print(f"✅ Valid! (@{info['username']})")
                
                # Add to API
                print("Adding to pool...", end=" ")
                if await add_bot_to_api(token):
                    print("✅ Added!")
                    bots_created.append({
                        "username": info["username"],
                        "token": token,
                        "id": info["id"]
                    })
                else:
                    print("⚠️ API Error (saving locally)")
                    bots_created.append({
                        "username": info["username"],
                        "token": token,
                        "id": info["id"],
                        "api_added": False
                    })
                break
            else:
                print("❌ Invalid token. Try again.")
        
        if token.lower() == 'quit':
            break
        
        # Save progress after each bot
        with open(bots_file, 'w') as f:
            json.dump(bots_created, f, indent=2)
        print(f"Progress saved to {bots_file}")
        print()
    
    # Final summary
    print()
    print("=" * 60)
    print("📊 SUMMARY")
    print("=" * 60)
    print(f"Bots created: {len(bots_created)}/{count}")
    print(f"Tokens saved to: {bots_file}")
    print()
    
    if bots_created:
        print("Created bots:")
        for bot in bots_created:
            print(f"  • @{bot['username']}")


async def batch_import(file_path: str):
    """Import bots from a JSON file"""
    print(f"Importing bots from {file_path}...")
    
    with open(file_path) as f:
        bots = json.load(f)
    
    success = 0
    for bot in bots:
        token = bot.get("token")
        if token:
            if await add_bot_to_api(token):
                print(f"✅ @{bot.get('username', 'unknown')}")
                success += 1
            else:
                print(f"❌ @{bot.get('username', 'unknown')}")
    
    print(f"\nImported {success}/{len(bots)} bots")


def main():
    parser = argparse.ArgumentParser(description="Create and manage Butlr bot pool")
    parser.add_argument("--count", type=int, default=10, help="Number of bots to create")
    parser.add_argument("--prefix", type=str, default="Butlr", help="Bot username prefix")
    parser.add_argument("--start", type=int, default=1, help="Starting number")
    parser.add_argument("--import-file", type=str, help="Import bots from JSON file")
    parser.add_argument("--api", type=str, default="http://localhost:8000", help="API base URL")
    
    args = parser.parse_args()
    
    global API_BASE
    API_BASE = args.api
    
    if args.import_file:
        asyncio.run(batch_import(args.import_file))
    else:
        asyncio.run(interactive_mode(args.prefix, args.count, args.start))


if __name__ == "__main__":
    main()
