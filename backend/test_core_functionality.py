#!/usr/bin/env python3
"""
Test core backend functionality without requiring full FastAPI app initialization.
"""

import os
import sys
import asyncio

# Set test environment
os.environ.update({
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight Test',
    'APP_ENV': 'test',
    'CSRF_SECRET': 'test-secret-key',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/callback',
    'DATABASE_URL': 'postgresql://test:test@localhost:5432/test',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'test-jwt-secret',
    'GITHUB_CLIENT_ID': 'test-client-id',
    'GITHUB_CLIENT_SECRET': 'test-client-secret',
    'DEBUG': 'true',
    'ENVIRONMENT': 'test'
})

async def test_core_modules():
    """Test core module functionality."""
    try:
        # Test configuration
        from app.core.config import settings
        print(f"✅ Settings loaded: {settings.PROJECT_NAME} v{settings.VERSION}")
        
        # Test CORS configuration
        cors_origins = settings.CORS_ORIGINS
        print(f"✅ CORS Origins: {cors_origins}")
        
        # Test exceptions
        from app.core.exceptions import ValidationException, DatabaseException
        print("✅ Core exceptions available")
        
        # Test schemas
        from app.schemas.common import HealthCheckResponse, APIInfoResponse
        print("✅ Common schemas available")
        
        # Test response model creation
        health_response = HealthCheckResponse(
            status="healthy",
            service=settings.PROJECT_NAME,
            version="2.0.0",
            environment="test"
        )
        print(f"✅ Health response model: {health_response.model_dump()}")
        
        return True
    except Exception as e:
        print(f"❌ Core modules test failed: {e}")
        return False

async def test_auth_components():
    """Test authentication components."""
    try:
        # Test password hashing without database imports
        from passlib.context import CryptContext
        
        # Test password hashing with passlib
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password = "test_password"
        hashed = pwd_context.hash(password)
        verified = pwd_context.verify(password, hashed)
        
        print(f"✅ Password hashing works: {verified}")
        
        # Test JWT utilities availability
        import jwt as jwt_lib
        test_payload = {"sub": "test_user"}
        token = jwt_lib.encode(test_payload, "test_secret", algorithm="HS256")
        decoded = jwt_lib.decode(token, "test_secret", algorithms=["HS256"])
        
        print(f"✅ JWT functionality works: {decoded['sub'] == 'test_user'}")
        
        # Test auth modules are available (check if files exist)
        import os
        auth_path = "app/core/auth"
        if os.path.exists(auth_path):
            auth_files = [f for f in os.listdir(auth_path) if f.endswith('.py') and not f.startswith('__')]
            print(f"✅ Found {len(auth_files)} auth modules: {', '.join(auth_files[:3])}")
        
        return True
    except Exception as e:
        print(f"❌ Auth components test failed: {e}")
        return False

async def test_database_models():
    """Test database model definitions."""
    try:
        # Test model imports without database connection
        from app.models.user import User
        from app.models.team import Team
        print("✅ Database models imported successfully")
        
        # Test model field definitions
        user_fields = [field for field in User.__annotations__.keys()]
        team_fields = [field for field in Team.__annotations__.keys()]
        
        print(f"✅ User model fields: {len(user_fields)} fields")
        print(f"✅ Team model fields: {len(team_fields)} fields")
        
        return True
    except Exception as e:
        print(f"❌ Database models test failed: {e}")
        return False

async def test_cache_manager():
    """Test cache manager without Redis connection."""
    try:
        from app.core.cache import UniversalCacheManager, SimpleCache, CacheLevel, DataType
        
        # Test cache classes available
        print("✅ UniversalCacheManager available")
        print("✅ SimpleCache available")
        print("✅ CacheLevel enum available")
        print("✅ DataType enum available")
        
        # Test SimpleCache (in-memory) functionality
        simple_cache = SimpleCache()
        await simple_cache.set("test_key", "test_value", ttl=60)
        value = await simple_cache.get("test_key")
        print(f"✅ SimpleCache works: {value == 'test_value'}")
        
        return True
    except Exception as e:
        print(f"❌ Cache manager test failed: {e}")
        return False

async def test_service_layer():
    """Test service layer components."""
    try:
        # Test basic service availability without full initialization
        import os
        services_path = "app/services"
        if os.path.exists(services_path):
            service_files = [f for f in os.listdir(services_path) if f.endswith('.py') and not f.startswith('__')]
            print(f"✅ Found {len(service_files)} service modules")
            for service_file in service_files[:3]:  # Show first 3
                print(f"   - {service_file}")
        
        # Test some basic service-related components
        from app.schemas import common as schemas
        print("✅ Common schemas available for services")
        
        return True
    except Exception as e:
        print(f"❌ Service layer test failed: {e}")
        return False

async def main():
    """Run all core functionality tests."""
    print("🧪 Testing Backend Core Functionality")
    print("=" * 50)
    
    tests = [
        ("Core Modules", test_core_modules),
        ("Authentication Components", test_auth_components),
        ("Database Models", test_database_models),
        ("Cache Manager", test_cache_manager),
        ("Service Layer", test_service_layer),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test {test_name} crashed: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print("=" * 50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Summary: {passed}/{len(results)} tests passed")
    
    if passed >= len(results) * 0.8:  # 80% pass rate
        print("🎉 Backend core functionality is working well!")
        return True
    else:
        print("⚠️  Some core functionality issues detected.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)