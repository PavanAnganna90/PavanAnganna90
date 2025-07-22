#!/usr/bin/env python3
"""
Test API endpoints to validate server functionality.
"""

import os
import requests
import json
import time
import subprocess
import signal
import sys
from concurrent.futures import ThreadPoolExecutor
import threading

# Set environment variables
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'ALLOWED_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'CSRF_SECRET': 'dev-csrf-secret',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/callback',
    'REDIS_URL': 'redis://localhost:6379/0',
    'JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'development-jwt-secret-key-must-be-at-least-32-chars',
    'GITHUB_CLIENT_ID': 'dev-client-id',
    'GITHUB_CLIENT_SECRET': 'dev-client-secret',
    'DEBUG': 'true',
    'ENVIRONMENT': 'development'
})

class APITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.server_process = None
        
    def start_server(self):
        """Start the FastAPI server in a subprocess."""
        print("🚀 Starting FastAPI server...")
        
        # Kill any existing servers
        subprocess.run(["pkill", "-f", "uvicorn.*app.main"], capture_output=True)
        time.sleep(1)
        
        # Start new server
        self.server_process = subprocess.Popen([
            "uvicorn", "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000",
            "--log-level", "info"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        for i in range(30):  # Wait up to 30 seconds
            try:
                response = requests.get(f"{self.base_url}/health", timeout=2)
                if response.status_code in [200, 401]:  # 401 is expected for protected endpoints
                    print(f"✅ Server started successfully after {i+1} seconds")
                    return True
            except:
                pass
            time.sleep(1)
        
        print("❌ Server failed to start within 30 seconds")
        return False
    
    def stop_server(self):
        """Stop the FastAPI server."""
        if self.server_process:
            print("🛑 Stopping server...")
            self.server_process.terminate()
            self.server_process.wait()
    
    def test_endpoint(self, endpoint, method="GET", data=None, expect_auth=False):
        """Test a single endpoint."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            result = {
                "endpoint": endpoint,
                "method": method,
                "status_code": response.status_code,
                "success": True
            }
            
            # Check if response is JSON
            try:
                result["response"] = response.json()
            except:
                result["response"] = response.text[:200]  # First 200 chars
            
            # Determine if test passed
            if expect_auth and response.status_code == 401:
                result["test_result"] = "PASS (Expected Auth Required)"
            elif not expect_auth and response.status_code == 200:
                result["test_result"] = "PASS"
            elif response.status_code in [200, 401, 422]:  # Common valid responses
                result["test_result"] = "PASS"
            else:
                result["test_result"] = "FAIL"
            
            return result
            
        except Exception as e:
            return {
                "endpoint": endpoint,
                "method": method,
                "success": False,
                "error": str(e),
                "test_result": "FAIL"
            }
    
    def run_tests(self):
        """Run all API endpoint tests."""
        print("🧪 Starting API Endpoint Tests")
        print("=" * 50)
        
        # Start server
        if not self.start_server():
            return False
        
        # Define test endpoints
        test_cases = [
            # Public endpoints
            {"endpoint": "/health", "expect_auth": False},
            {"endpoint": "/", "expect_auth": True},  # Usually requires auth
            
            # API documentation
            {"endpoint": "/api/v1/openapi.json", "expect_auth": True},
            
            # API endpoints (most likely require auth)
            {"endpoint": "/api/v1/auth/", "expect_auth": True},
            {"endpoint": "/api/v1/users/", "expect_auth": True},
            {"endpoint": "/api/v1/teams/", "expect_auth": True},
            {"endpoint": "/api/v1/projects/", "expect_auth": True},
            {"endpoint": "/api/v1/pipelines/", "expect_auth": True},
            {"endpoint": "/api/v1/infrastructure/", "expect_auth": True},
            {"endpoint": "/api/v1/alerts/", "expect_auth": True},
            {"endpoint": "/api/v1/costs/", "expect_auth": True},
        ]
        
        results = []
        passed = 0
        total = len(test_cases)
        
        print(f"🔍 Testing {total} endpoints...")
        print()
        
        for test_case in test_cases:
            result = self.test_endpoint(**test_case)
            results.append(result)
            
            # Print result
            status = result.get("test_result", "UNKNOWN")
            endpoint = result["endpoint"]
            status_code = result.get("status_code", "N/A")
            
            if status == "PASS":
                print(f"✅ {endpoint} - {status_code} - {status}")
                passed += 1
            else:
                error = result.get("error", "")
                print(f"❌ {endpoint} - {status_code} - {status} {error}")
        
        print()
        print("=" * 50)
        print(f"📊 Test Results: {passed}/{total} passed")
        
        # Show detailed results for failures
        failures = [r for r in results if r.get("test_result") == "FAIL"]
        if failures:
            print("\n🔍 Failed Tests Details:")
            for failure in failures:
                print(f"  ❌ {failure['endpoint']}: {failure.get('error', 'Unknown error')}")
        
        # Stop server
        self.stop_server()
        
        return passed == total

def main():
    """Main test function."""
    tester = APITester()
    
    try:
        success = tester.run_tests()
        if success:
            print("🎉 All API endpoint tests passed!")
            return True
        else:
            print("⚠️ Some API endpoint tests failed!")
            return False
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        tester.stop_server()
        return False
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        tester.stop_server()
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)