#!/usr/bin/env python3
"""
Test frontend-backend integration to ensure proper communication.
"""

import os
import requests
import json
import time
import subprocess
import signal
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# Set environment variables for backend
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'CSRF_SECRET': 'dev-csrf-secret',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'DEBUG': 'true',
    'ENVIRONMENT': 'development'
})

class FrontendBackendTester:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.backend_process = None
        self.frontend_process = None
        self.backend_dir = Path(__file__).parent
        self.frontend_dir = self.backend_dir.parent / "frontend"
        
    def start_backend(self):
        """Start the FastAPI backend server."""
        print("🚀 Starting Backend Server (FastAPI)...")
        
        # Kill any existing backend servers
        subprocess.run(["pkill", "-f", "uvicorn.*app.main"], capture_output=True)
        time.sleep(1)
        
        # Start backend server
        self.backend_process = subprocess.Popen([
            "uvicorn", "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--log-level", "info"
        ], 
        cwd=self.backend_dir,
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
        )
        
        # Wait for backend to start
        print("⏳ Waiting for backend to start...")
        for i in range(30):
            try:
                response = requests.get(f"{self.backend_url}/health", timeout=2)
                if response.status_code == 200:
                    print(f"✅ Backend started successfully after {i+1} seconds")
                    return True
            except:
                pass
            time.sleep(1)
        
        print("❌ Backend failed to start within 30 seconds")
        return False
    
    def start_frontend(self):
        """Start the Next.js frontend server."""
        print("🚀 Starting Frontend Server (Next.js)...")
        
        # Check if frontend directory exists
        if not self.frontend_dir.exists():
            print(f"❌ Frontend directory not found: {self.frontend_dir}")
            return False
        
        # Kill any existing frontend servers
        subprocess.run(["pkill", "-f", "next.*dev"], capture_output=True)
        time.sleep(1)
        
        # Start frontend server
        self.frontend_process = subprocess.Popen([
            "npm", "run", "dev"
        ], 
        cwd=self.frontend_dir,
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
        )
        
        # Wait for frontend to start
        print("⏳ Waiting for frontend to start...")
        for i in range(60):  # Frontend takes longer to start
            try:
                response = requests.get(f"{self.frontend_url}", timeout=5)
                if response.status_code in [200, 404]:  # 404 is acceptable for Next.js
                    print(f"✅ Frontend started successfully after {i+1} seconds")
                    return True
            except:
                pass
            time.sleep(1)
        
        print("❌ Frontend failed to start within 60 seconds")
        return False
    
    def stop_servers(self):
        """Stop both frontend and backend servers."""
        print("🛑 Stopping servers...")
        
        if self.backend_process:
            self.backend_process.terminate()
            self.backend_process.wait()
            print("✅ Backend server stopped")
        
        if self.frontend_process:
            self.frontend_process.terminate()
            self.frontend_process.wait()
            print("✅ Frontend server stopped")
    
    def test_backend_endpoints(self):
        """Test essential backend API endpoints."""
        print("\n🧪 Testing Backend API Endpoints")
        print("-" * 40)
        
        test_endpoints = [
            {"url": "/health", "name": "Health Check", "expect_status": 200},
            {"url": "/", "name": "Root Endpoint", "expect_status": 200},
            {"url": "/health/detailed", "name": "Detailed Health", "expect_status": 200},
            {"url": "/api/v1/openapi.json", "name": "OpenAPI Schema", "expect_status": 200},
        ]
        
        passed = 0
        total = len(test_endpoints)
        
        for test in test_endpoints:
            try:
                response = requests.get(f"{self.backend_url}{test['url']}", timeout=5)
                
                if response.status_code == test["expect_status"]:
                    print(f"✅ {test['name']}: {response.status_code}")
                    passed += 1
                else:
                    print(f"❌ {test['name']}: Expected {test['expect_status']}, got {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {test['name']}: Request failed - {e}")
        
        print(f"\n📊 Backend Tests: {passed}/{total} passed")
        return passed == total
    
    def test_cors_configuration(self):
        """Test CORS configuration between frontend and backend."""
        print("\n🧪 Testing CORS Configuration")
        print("-" * 40)
        
        # Test CORS headers
        try:
            response = requests.options(
                f"{self.backend_url}/health",
                headers={
                    "Origin": self.frontend_url,
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "Content-Type"
                },
                timeout=5
            )
            
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
                "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials"),
            }
            
            print(f"✅ CORS Headers Retrieved:")
            for header, value in cors_headers.items():
                print(f"   {header}: {value}")
            
            # Check if frontend origin is allowed
            allowed_origin = cors_headers.get("Access-Control-Allow-Origin")
            if allowed_origin == self.frontend_url or allowed_origin == "*":
                print(f"✅ Frontend origin ({self.frontend_url}) is allowed")
                return True
            else:
                print(f"❌ Frontend origin ({self.frontend_url}) not allowed. Allowed: {allowed_origin}")
                return False
                
        except Exception as e:
            print(f"❌ CORS test failed: {e}")
            return False
    
    def test_api_from_frontend_perspective(self):
        """Test API calls as if coming from frontend."""
        print("\n🧪 Testing API from Frontend Perspective")
        print("-" * 40)
        
        # Simulate frontend API calls
        headers = {
            "Origin": self.frontend_url,
            "Referer": self.frontend_url,
            "User-Agent": "Mozilla/5.0 (Frontend Integration Test)"
        }
        
        test_calls = [
            {"url": "/health", "name": "Health Check from Frontend"},
            {"url": "/api/v1/openapi.json", "name": "API Schema from Frontend"},
        ]
        
        passed = 0
        total = len(test_calls)
        
        for test in test_calls:
            try:
                response = requests.get(
                    f"{self.backend_url}{test['url']}", 
                    headers=headers,
                    timeout=5
                )
                
                if response.status_code == 200:
                    print(f"✅ {test['name']}: {response.status_code}")
                    passed += 1
                    
                    # Check response content
                    try:
                        if test['url'] == '/health':
                            data = response.json()
                            if data.get('status') == 'healthy':
                                print(f"   ✅ Health status: {data.get('status')}")
                            else:
                                print(f"   ⚠️ Unexpected health status: {data.get('status')}")
                    except:
                        pass
                        
                else:
                    print(f"❌ {test['name']}: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ {test['name']}: {e}")
        
        print(f"\n📊 Frontend API Tests: {passed}/{total} passed")
        return passed == total
    
    def test_frontend_accessibility(self):
        """Test if frontend is accessible and serving content."""
        print("\n🧪 Testing Frontend Accessibility")
        print("-" * 40)
        
        try:
            response = requests.get(self.frontend_url, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ Frontend accessible: {response.status_code}")
                
                # Check if it's serving HTML content
                content_type = response.headers.get('content-type', '')
                if 'text/html' in content_type:
                    print("✅ Frontend serving HTML content")
                    
                    # Check for common Next.js indicators
                    content = response.text.lower()
                    if 'next' in content or 'react' in content:
                        print("✅ Next.js/React content detected")
                    
                    return True
                else:
                    print(f"⚠️ Unexpected content type: {content_type}")
                    return False
            else:
                print(f"❌ Frontend not accessible: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Frontend accessibility test failed: {e}")
            return False
    
    def run_integration_tests(self):
        """Run complete frontend-backend integration tests."""
        print("🔗 Frontend-Backend Integration Tests")
        print("=" * 60)
        
        try:
            # Start backend
            if not self.start_backend():
                return False
            
            # Start frontend
            if not self.start_frontend():
                self.stop_servers()
                return False
            
            # Run tests
            backend_ok = self.test_backend_endpoints()
            cors_ok = self.test_cors_configuration()
            api_ok = self.test_api_from_frontend_perspective()
            frontend_ok = self.test_frontend_accessibility()
            
            # Summary
            total_tests = 4
            passed_tests = sum([backend_ok, cors_ok, api_ok, frontend_ok])
            
            print("\n" + "=" * 60)
            print(f"📊 Integration Test Results: {passed_tests}/{total_tests} test suites passed")
            
            if passed_tests == total_tests:
                print("🎉 All integration tests passed!")
                print("✅ Frontend and backend can communicate properly")
                print("✅ CORS is configured correctly")
                print("✅ API endpoints are accessible from frontend")
                print("✅ Both servers are running and accessible")
                return True
            else:
                print("⚠️ Some integration tests failed!")
                print("🔍 Check the test output above for details")
                return False
            
        except KeyboardInterrupt:
            print("\n🛑 Tests interrupted by user")
            return False
        except Exception as e:
            print(f"❌ Integration test suite failed: {e}")
            return False
        finally:
            self.stop_servers()

def main():
    """Main test function."""
    tester = FrontendBackendTester()
    
    try:
        success = tester.run_integration_tests()
        if success:
            print("\n🎉 Frontend-Backend integration verified successfully!")
            return True
        else:
            print("\n⚠️ Frontend-Backend integration has issues!")
            return False
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)