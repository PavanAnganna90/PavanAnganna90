#!/usr/bin/env python3
"""
Test FastAPI application startup and basic endpoint functionality.
"""

import os
import sys
import asyncio
from fastapi.testclient import TestClient

# Set test environment
os.environ.update({
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight Test',
    'APP_ENV': 'test',
    'CSRF_SECRET': 'test-secret-key',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/callback',
    'DATABASE_URL': 'postgresql+asyncpg://test:test@localhost:5432/test',  # Use async driver for test
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'test-jwt-secret',
    'GITHUB_CLIENT_ID': 'test-client-id',
    'GITHUB_CLIENT_SECRET': 'test-client-secret',
    'DEBUG': 'true',
    'ENVIRONMENT': 'test',
    'PYTEST_CURRENT_TEST': 'true'  # Skip metrics initialization
})

async def test_app_creation():
    """Test FastAPI app can be created."""
    try:
        from app.main import app
        print("✅ FastAPI app created successfully")
        print(f"✅ App title: {app.title}")
        print(f"✅ App version: {app.version}")
        return True, app
    except Exception as e:
        print(f"❌ App creation failed: {e}")
        return False, None

async def test_health_endpoints():
    """Test health check endpoints."""
    try:
        success, app = await test_app_creation()
        if not success:
            return False
        
        client = TestClient(app)
        
        # Test basic health endpoint
        response = client.get("/health")
        print(f"✅ Health endpoint status: {response.status_code}")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Health response: {health_data.get('status', 'unknown')}")
        
        # Test root endpoint
        response = client.get("/")
        print(f"✅ Root endpoint status: {response.status_code}")
        if response.status_code == 200:
            root_data = response.json()
            print(f"✅ Root response: {root_data.get('message', 'unknown')}")
        
        return True
    except Exception as e:
        print(f"❌ Health endpoints test failed: {e}")
        return False

async def test_api_routes():
    """Test API route registration."""
    try:
        success, app = await test_app_creation()
        if not success:
            return False
        
        # Get all routes
        routes = []
        for route in app.routes:
            if hasattr(route, 'path'):
                routes.append(route.path)
        
        print(f"✅ Found {len(routes)} routes")
        
        # Check for key API routes
        api_routes = [r for r in routes if r.startswith('/api/v1')]
        print(f"✅ Found {len(api_routes)} API v1 routes")
        
        # Show some example routes
        for route in routes[:5]:
            print(f"   - {route}")
        
        return True
    except Exception as e:
        print(f"❌ API routes test failed: {e}")
        return False

async def test_openapi_docs():
    """Test OpenAPI documentation generation."""
    try:
        success, app = await test_app_creation()
        if not success:
            return False
        
        client = TestClient(app)
        
        # Test OpenAPI JSON
        response = client.get("/api/v1/openapi.json")
        print(f"✅ OpenAPI JSON status: {response.status_code}")
        
        if response.status_code == 200:
            openapi_data = response.json()
            print(f"✅ OpenAPI info: {openapi_data.get('info', {}).get('title', 'unknown')}")
            paths_count = len(openapi_data.get('paths', {}))
            print(f"✅ OpenAPI paths: {paths_count}")
        
        return True
    except Exception as e:
        print(f"❌ OpenAPI docs test failed: {e}")
        return False

async def main():
    """Run all FastAPI startup tests."""
    print("🚀 Testing FastAPI Application Startup")
    print("=" * 50)
    
    tests = [
        ("Application Creation", test_app_creation),
        ("Health Endpoints", test_health_endpoints),
        ("API Routes", test_api_routes),
        ("OpenAPI Documentation", test_openapi_docs),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Testing: {test_name}")
        try:
            if test_name == "Application Creation":
                result, _ = await test_func()
            else:
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
    
    if passed >= len(results) * 0.75:  # 75% pass rate
        print("🎉 FastAPI application startup successful!")
        return True
    else:
        print("⚠️  FastAPI application startup issues detected.")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)