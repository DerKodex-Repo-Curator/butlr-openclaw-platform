#!/usr/bin/env python3
"""Initialize the database"""
import asyncio
from models.database import init_db

async def main():
    print("Initializing database...")
    await init_db()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
