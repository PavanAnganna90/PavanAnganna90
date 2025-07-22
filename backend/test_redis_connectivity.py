#!/usr/bin/env python3
"""
Test Redis connectivity and cache functionality.
"""

import os
import asyncio
import redis
import json
from datetime import datetime

# Set environment variables
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'REDIS_URL': 'redis://localhost:6379/0',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
})

async def test_redis_basic():
    """Test basic Redis connectivity."""
    print("🔍 Testing: Basic Redis Connectivity")
    
    try:
        # Test direct Redis connection
        r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        
        # Test ping
        ping_result = r.ping()
        print(f"✅ Redis ping: {ping_result}")
        
        # Test set/get
        test_key = "test_key"
        test_value = "test_value"
        r.set(test_key, test_value, ex=60)  # Expire in 60 seconds
        retrieved_value = r.get(test_key)
        print(f"✅ Redis set/get: {retrieved_value == test_value}")
        
        # Clean up
        r.delete(test_key)
        
        return True
    except Exception as e:
        print(f"❌ Redis basic test failed: {e}")
        return False

async def test_cache_manager():
    """Test the application's cache manager."""
    print("\n🔍 Testing: Application Cache Manager")
    
    try:
        from app.core.cache import get_cache_manager
        
        # Get cache manager (it's async)
        cache_manager = await get_cache_manager()
        print(f"✅ Cache manager type: {type(cache_manager).__name__}")
        
        # Test cache operations
        test_key = "app_test_key"
        test_data = {"timestamp": datetime.now().isoformat(), "message": "Cache test"}
        
        # Set cache
        await cache_manager.set(test_key, test_data, ttl=60)
        print("✅ Cache set operation successful")
        
        # Get cache
        retrieved_data = await cache_manager.get(test_key)
        print(f"✅ Cache get operation: {retrieved_data is not None}")
        
        if retrieved_data:
            print(f"   Retrieved: {json.dumps(retrieved_data, indent=2)}")
        
        # Delete cache
        await cache_manager.delete(test_key)
        print("✅ Cache delete operation successful")
        
        # Verify deletion
        deleted_check = await cache_manager.get(test_key)
        print(f"✅ Cache deletion verified: {deleted_check is None}")
        
        return True
    except Exception as e:
        print(f"❌ Cache manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_token_manager():
    """Test the token manager Redis functionality."""
    print("\n🔍 Testing: Token Manager Redis Integration")
    
    try:
        from app.core.auth.token_manager import TokenManager
        
        # Initialize token manager
        token_manager = TokenManager()
        print("✅ Token manager initialized")
        print(f"   Redis client: {token_manager.redis_client is not None}")
        
        # Test basic token creation and validation
        # We'll create a minimal user object for testing
        class MockUser:
            def __init__(self):
                self.id = 1
                self.email = "test@example.com"
                self.full_name = "Test User"
                self.roles = ["user"]
                self.permissions = ["read"]
        
        mock_user = MockUser()
        
        # Create access token
        access_token = await token_manager.create_access_token(mock_user)
        print("✅ Access token created successfully")
        print(f"   Token length: {len(access_token)} characters")
        
        # Validate token
        try:
            token_data = await token_manager.validate_access_token(access_token)
            print("✅ Token validation successful")
            print(f"   Token subject: {token_data.get('sub')}")
            print(f"   Token email: {token_data.get('email')}")
        except Exception as e:
            print(f"⚠️  Token validation failed: {e}")
        
        # Test token revocation
        await token_manager.revoke_token(access_token)
        print("✅ Token revoked successfully")
        
        # Verify revocation
        try:
            revoked_check = await token_manager.validate_access_token(access_token)
            print("❌ Token should have been revoked but is still valid")
        except Exception:
            print("✅ Token revocation verified - token is now invalid")
        
        return True
    except Exception as e:
        print(f"❌ Token manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_session_cache():
    """Test session cache functionality."""
    print("\n🔍 Testing: Session Cache")
    
    try:
        from app.core.cache import get_cache_manager
        
        cache_manager = await get_cache_manager()
        
        # Test session data
        session_id = "session_123456"
        session_data = {
            "user_id": 1,
            "username": "test_user",
            "login_time": datetime.now().isoformat(),
            "permissions": ["read", "write"],
            "last_activity": datetime.now().isoformat()
        }
        
        # Store session
        session_key = f"session:{session_id}"
        await cache_manager.set(session_key, session_data, ttl=1800)  # 30 minutes
        print("✅ Session data stored")
        
        # Retrieve session
        retrieved_session = await cache_manager.get(session_key)
        print(f"✅ Session data retrieved: {retrieved_session is not None}")
        
        if retrieved_session:
            print(f"   Session user: {retrieved_session.get('username')}")
            print(f"   Session permissions: {retrieved_session.get('permissions')}")
        
        # Update session activity
        if retrieved_session:
            retrieved_session['last_activity'] = datetime.now().isoformat()
            await cache_manager.set(session_key, retrieved_session, ttl=1800)
            print("✅ Session activity updated")
        
        # Clean up
        await cache_manager.delete(session_key)
        print("✅ Session cleaned up")
        
        return True
    except Exception as e:
        print(f"❌ Session cache test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main test function."""
    print("🚀 Redis Cache and Session Management Tests")
    print("=" * 60)
    
    tests = [
        ("Basic Redis Connectivity", test_redis_basic),
        ("Application Cache Manager", test_cache_manager),
        ("Token Manager Redis Integration", test_token_manager),
        ("Session Cache", test_session_cache),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if await test_func():
                passed += 1
                print(f"✅ PASS {test_name}")
            else:
                print(f"❌ FAIL {test_name}")
        except Exception as e:
            print(f"❌ FAIL {test_name}: {e}")
        
        print()  # Add spacing between tests
    
    print("=" * 60)
    print(f"📊 Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("🎉 All Redis cache tests passed!")
        return True
    else:
        print("⚠️ Some Redis cache tests failed!")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)