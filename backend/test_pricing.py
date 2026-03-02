"""Test script for new pricing features"""
import asyncio
import httpx
from datetime import datetime

BASE_URL = "http://localhost:8000"

async def test_pricing_endpoints():
    """Test the pricing API endpoints"""
    async with httpx.AsyncClient() as client:
        print("🧪 Testing Pricing Features\n")
        
        # 1. Get pricing tiers
        print("1️⃣ Getting pricing tiers...")
        response = await client.get(f"{BASE_URL}/api/pricing/tiers")
        if response.status_code == 200:
            tiers = response.json()
            print("✅ Available tiers:")
            for tier in tiers:
                print(f"   - {tier['tier_name']}: €{tier['price_cents']/100}")
        else:
            print(f"❌ Failed: {response.status_code}")
        
        print("\n" + "-"*50 + "\n")
        
        # 2. Test auth (mock for now)
        print("2️⃣ Testing mock auth...")
        auth_response = await client.post(
            f"{BASE_URL}/auth/stripe-login",
            json={"customer_id": "cus_test123"}
        )
        if auth_response.status_code == 200:
            token = auth_response.json()["token"]
            print(f"✅ Got token: {token}")
            
            # Set auth header
            headers = {"Authorization": f"Bearer {token}"}
            
            # 3. Test API key endpoints (will fail without real auth)
            print("\n3️⃣ Testing API key management...")
            
            # List keys
            keys_response = await client.get(
                f"{BASE_URL}/api/pricing/api-keys",
                headers=headers
            )
            print(f"   List keys: {keys_response.status_code}")
            
            # Get usage
            usage_response = await client.get(
                f"{BASE_URL}/api/pricing/usage",
                headers=headers
            )
            print(f"   Get usage: {usage_response.status_code}")
            
        else:
            print(f"❌ Auth failed: {auth_response.status_code}")

async def test_database_direct():
    """Test database schema directly"""
    print("\n🗄️ Testing Database Schema\n")
    
    import sys
    sys.path.append('/root/butlr-backend')
    
    from models.database import engine
    from sqlalchemy import text
    
    async with engine.connect() as conn:
        # Check tables
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('pricing_tiers', 'user_api_keys', 'usage_tracking')
            ORDER BY table_name
        """))
        tables = result.fetchall()
        
        print("✅ New tables created:")
        for table in tables:
            print(f"   - {table[0]}")
        
        # Check pricing tiers
        result = await conn.execute(text("SELECT tier_name, price_cents FROM pricing_tiers"))
        tiers = result.fetchall()
        
        print("\n✅ Pricing tiers in DB:")
        for tier in tiers:
            print(f"   - {tier[0]}: €{tier[1]/100}")
        
        # Check customer table
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'customers' 
            AND column_name = 'plan_tier'
        """))
        if result.fetchone():
            print("\n✅ plan_tier column added to customers table")
        
        await conn.commit()

async def main():
    """Run all tests"""
    print("="*60)
    print("🚀 BUTLR PRICING FEATURE TEST")
    print(f"📅 {datetime.now()}")
    print("="*60)
    
    # Test endpoints
    await test_pricing_endpoints()
    
    # Test database
    await test_database_direct()
    
    print("\n✅ Tests completed!")

if __name__ == "__main__":
    asyncio.run(main())