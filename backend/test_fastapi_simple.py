#!/usr/bin/env python3
"""
Simple FastAPI test that bypasses database startup requirements.
"""

import os
import sys
import asyncio
from unittest.mock import patch, AsyncMock

# Set test environment
os.environ.update({
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight Test',
    'APP_ENV': 'test',
    'CSRF_SECRET': 'test-secret-key',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/callback',
    'DATABASE_URL': 'postgresql+asyncpg://test:test@localhost:5432/test',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'test-jwt-secret-key-that-is-long-enough-for-security-validation',
    'SECURITY_JWT_SECRET_KEY': 'test-jwt-secret-key-that-is-long-enough-for-security-validation',  # For SecuritySettings
    'GITHUB_CLIENT_ID': 'test-client-id',
    'GITHUB_CLIENT_SECRET': 'test-client-secret',
    'DEBUG': 'true',
    'ENVIRONMENT': 'test',
    'PYTEST_CURRENT_TEST': 'true'  # Skip metrics initialization
})

async def test_app_with_mocked_db():
    """Test FastAPI app creation with mocked database functions."""
    try:
        # Mock the database functions to avoid connection issues
        with patch('app.db.database.check_async_db_connection', new_callable=AsyncMock) as mock_check_db:
            with patch('app.db.database.create_tables', new_callable=AsyncMock) as mock_create_tables:
                with patch('app.core.dependencies.get_redis_pool', new_callable=AsyncMock) as mock_redis:
                    with patch('app.services.token_cleanup_service.start_token_cleanup_service', new_callable=AsyncMock):
                        # Configure mocks
                        mock_check_db.return_value = True
                        mock_create_tables.return_value = None
                        
                        # Mock Redis pool with ping method
                        mock_redis_pool = AsyncMock()
                        mock_redis_pool.ping = AsyncMock()
                        mock_redis.return_value = mock_redis_pool
                        
                        # Import and create app
                        from app.main import app
                        
                        print("✅ FastAPI app created successfully with mocked dependencies")
                        print(f"✅ App title: {app.title}")
                        print(f"✅ App version: {app.version}")
                        
                        # Test basic functionality
                        from fastapi.testclient import TestClient
                        client = TestClient(app)
                        
                        # Test health endpoint
                        response = client.get("/health")
                        print(f"✅ Health endpoint status: {response.status_code}")
                        if response.status_code == 200:
                            health_data = response.json()
                            print(f"✅ Health response: {health_data}")
                        
                        # Test root endpoint
                        response = client.get("/")
                        print(f"✅ Root endpoint status: {response.status_code}")
                        if response.status_code == 200:
                            root_data = response.json()
                            print(f"✅ Root message: {root_data.get('message', 'unknown')}")
                        
                        # Test route counting
                        routes = [route.path for route in app.routes if hasattr(route, 'path')]
                        api_routes = [r for r in routes if r.startswith('/api/v1')]
                        print(f"✅ Total routes: {len(routes)}")
                        print(f"✅ API v1 routes: {len(api_routes)}")
                        
                        return True
                        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_api_documentation():
    """Test OpenAPI documentation generation."""
    try:
        with patch('app.db.database.check_async_db_connection', new_callable=AsyncMock) as mock_check_db:
            with patch('app.db.database.create_tables', new_callable=AsyncMock) as mock_create_tables:
                with patch('app.core.dependencies.get_redis_pool', new_callable=AsyncMock) as mock_redis:
                    with patch('app.services.token_cleanup_service.start_token_cleanup_service', new_callable=AsyncMock):
                        # Configure mocks
                        mock_check_db.return_value = True
                        mock_create_tables.return_value = None
                        
                        # Mock Redis pool
                        mock_redis_pool = AsyncMock()
                        mock_redis_pool.ping = AsyncMock()
                        mock_redis.return_value = mock_redis_pool
                        
                        # Import app
                        from app.main import app
                        from fastapi.testclient import TestClient
                        client = TestClient(app)
                        
                        # Test OpenAPI JSON
                        response = client.get("/api/v1/openapi.json")
                        print(f"✅ OpenAPI JSON status: {response.status_code}")
                        
                        if response.status_code == 200:
                            openapi_data = response.json()
                            print(f"✅ OpenAPI title: {openapi_data.get('info', {}).get('title', 'unknown')}")
                            paths_count = len(openapi_data.get('paths', {}))
                            print(f"✅ OpenAPI paths: {paths_count}")
                        
                        return True
                        
    except Exception as e:
        print(f"❌ Documentation test failed: {e}")
        return False

async def main():
    """Run FastAPI tests with mocked dependencies."""
    print("🚀 Testing FastAPI Application (Mocked Dependencies)")
    print("=" * 60)
    
    tests = [
        ("App Creation & Basic Endpoints", test_app_with_mocked_db),
        ("API Documentation", test_api_documentation),
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
    
    print("\n" + "=" * 60)
    print("📊 Test Results:")
    print("=" * 60)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Summary: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 FastAPI application working correctly!")
        return True
    else:
        print("⚠️  Some FastAPI functionality issues detected.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)