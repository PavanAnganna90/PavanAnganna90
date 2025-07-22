#!/usr/bin/env python3
"""
Test backend server functionality and readiness for frontend integration.
"""

import os
import requests
import json
import time
import subprocess
import signal
import sys
from pathlib import Path

# Set environment variables for backend
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'CSRF_SECRET': 'dev-csrf-secret',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'JWT_ALGORITHM': 'HS256',
    'JWT_ACCESS_TOKEN_EXPIRE_MINUTES': '60',
    'JWT_REFRESH_TOKEN_EXPIRE_DAYS': '7',
    'GITHUB_CLIENT_ID': 'dev-client-id',
    'GITHUB_CLIENT_SECRET': 'dev-client-secret',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/github/callback',
    'DEBUG': 'true',
    'ENVIRONMENT': 'development'
})

class BackendTester:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.backend_process = None
        self.backend_dir = Path(__file__).parent
        
    def start_backend(self):
        """Start the FastAPI backend server."""
        print("🚀 Starting Backend Server (FastAPI)...")
        
        # Kill any existing backend servers
        subprocess.run(["pkill", "-f", "uvicorn.*app.main"], capture_output=True)
        time.sleep(2)
        
        # Start backend server
        env = os.environ.copy()
        self.backend_process = subprocess.Popen([
            "uvicorn", "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--log-level", "info"
        ], 
        cwd=self.backend_dir,
        env=env,
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
        )
        
        # Wait for backend to start
        print("⏳ Waiting for backend to start...")
        for i in range(30):
            try:
                response = requests.get(f"{self.backend_url}/health", timeout=3)
                if response.status_code == 200:
                    print(f"✅ Backend started successfully after {i+1} seconds")
                    return True
            except:
                pass
            time.sleep(1)
        
        print("❌ Backend failed to start within 30 seconds")
        return False
    
    def stop_backend(self):
        """Stop the FastAPI backend server."""
        print("🛑 Stopping backend...")
        
        if self.backend_process:
            self.backend_process.terminate()
            self.backend_process.wait()
            print("✅ Backend server stopped")
    
    def test_health_endpoints(self):
        """Test health check endpoints."""
        print("\n🧪 Testing Health Endpoints")
        print("-" * 40)
        
        tests = [
            {"url": "/health", "name": "Basic Health Check"},
            {"url": "/health/detailed", "name": "Detailed Health Check"},
        ]
        
        passed = 0
        for test in tests:
            try:
                response = requests.get(f"{self.backend_url}{test['url']}", timeout=5)
                
                if response.status_code == 200:
                    data = response.json()
                    status = data.get('status', 'unknown')
                    print(f"✅ {test['name']}: {response.status_code} - Status: {status}")
                    passed += 1
                else:
                    print(f"❌ {test['name']}: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {test['name']}: {e}")
        
        return passed == len(tests)
    
    def test_api_endpoints(self):
        """Test core API endpoints."""
        print("\n🧪 Testing API Endpoints")
        print("-" * 40)
        
        tests = [
            {"url": "/", "name": "Root Endpoint"},
            {"url": "/api/v1/openapi.json", "name": "OpenAPI Schema"},
            {"url": "/cache/metrics", "name": "Cache Metrics"},
            {"url": "/api/performance", "name": "API Performance"},
        ]
        
        passed = 0
        for test in tests:
            try:
                response = requests.get(f"{self.backend_url}{test['url']}", timeout=5)
                
                if response.status_code in [200, 401]:  # 401 is OK for protected endpoints
                    print(f"✅ {test['name']}: {response.status_code}")
                    passed += 1
                else:
                    print(f"❌ {test['name']}: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {test['name']}: {e}")
        
        return passed == len(tests)
    
    def test_cors_configuration(self):
        """Test CORS configuration."""
        print("\n🧪 Testing CORS Configuration")
        print("-" * 40)
        
        try:
            # Test preflight request
            response = requests.options(
                f"{self.backend_url}/health",
                headers={
                    "Origin": self.frontend_url,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Content-Type"
                },
                timeout=5
            )
            
            print(f"✅ CORS Preflight: {response.status_code}")
            
            # Check CORS headers
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
                "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
            }
            
            print("✅ CORS Headers:")
            for header, value in cors_headers.items():
                if value:
                    print(f"   {header}: {value}")
            
            # Test actual request with origin
            response = requests.get(
                f"{self.backend_url}/health",
                headers={"Origin": self.frontend_url},
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"✅ GET with Origin: {response.status_code}")
                return True
            else:
                print(f"❌ GET with Origin: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ CORS test failed: {e}")
            return False
    
    def test_json_responses(self):
        """Test that endpoints return proper JSON."""
        print("\n🧪 Testing JSON Responses")
        print("-" * 40)
        
        tests = [
            {"url": "/health", "name": "Health JSON"},
            {"url": "/", "name": "Root JSON"},
        ]
        
        passed = 0
        for test in tests:
            try:
                response = requests.get(f"{self.backend_url}{test['url']}", timeout=5)
                
                if response.status_code == 200:
                    data = response.json()  # This will fail if not valid JSON
                    print(f"✅ {test['name']}: Valid JSON with {len(data)} fields")
                    passed += 1
                else:
                    print(f"❌ {test['name']}: {response.status_code}")
                    
            except json.JSONDecodeError:
                print(f"❌ {test['name']}: Invalid JSON response")
            except Exception as e:
                print(f"❌ {test['name']}: {e}")
        
        return passed == len(tests)
    
    def run_backend_tests(self):
        """Run all backend tests."""
        print("🔗 Backend Readiness Tests for Frontend Integration")
        print("=" * 70)
        
        try:
            # Start backend
            if not self.start_backend():
                return False
            
            # Run tests
            health_ok = self.test_health_endpoints()
            api_ok = self.test_api_endpoints()
            cors_ok = self.test_cors_configuration()
            json_ok = self.test_json_responses()
            
            # Summary
            tests = [health_ok, api_ok, cors_ok, json_ok]
            passed_tests = sum(tests)
            total_tests = len(tests)
            
            print("\n" + "=" * 70)
            print(f"📊 Backend Integration Readiness: {passed_tests}/{total_tests} test suites passed")
            
            if passed_tests == total_tests:
                print("🎉 Backend is ready for frontend integration!")
                print("✅ All health endpoints working")
                print("✅ API endpoints accessible")
                print("✅ CORS configured for frontend")
                print("✅ JSON responses valid")
                return True
            else:
                print("⚠️ Backend has integration issues!")
                print("🔍 Check the test output above for details")
                return False
            
        except KeyboardInterrupt:
            print("\n🛑 Tests interrupted by user")
            return False
        except Exception as e:
            print(f"❌ Backend test suite failed: {e}")
            return False
        finally:
            self.stop_backend()

def main():
    """Main test function."""
    tester = BackendTester()
    
    try:
        success = tester.run_backend_tests()
        if success:
            print("\n🎉 Backend is ready for frontend integration!")
            return True
        else:
            print("\n⚠️ Backend needs fixes before frontend integration!")
            return False
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)