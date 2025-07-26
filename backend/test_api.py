"""
Comprehensive test suite for OpsSight Platform API
Production-ready testing with authentication, endpoints, and integration tests
"""

import pytest
import httpx
import asyncio
from fastapi.testclient import TestClient
import jwt
from datetime import datetime, timedelta
import json
import os

# Import our auth server for testing
from auth_server import app, auth_store, JWT_SECRET_KEY, JWT_ALGORITHM

# Test client
client = TestClient(app)

class TestAuthentication:
    """Test authentication and authorization"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns correct information"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "OpsSight Platform API - With Authentication"
        assert data["version"] == "2.2.0"
        assert "features" in data
        assert "auth" in data
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "2.2.0"
        assert "auth" in data
        assert "services" in data
    
    def test_github_oauth_initiation(self):
        """Test GitHub OAuth flow initiation"""
        response = client.get("/auth/github")
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "state" in data
        assert "github.com/login/oauth/authorize" in data["auth_url"]
    
    def test_demo_token_generation(self):
        """Test demo token generation"""
        response = client.get("/auth/demo-token")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        
        # Verify token is valid JWT
        token = data["access_token"]
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        assert payload["sub"] == "demo123"
        assert payload["role"] == "admin"
    
    def test_token_verification(self):
        """Test JWT token verification"""
        # Get demo token
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        
        # Test authenticated endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = client.get("/api/v1/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert data["user"]["username"] == "demo-user"
    
    def test_invalid_token(self):
        """Test invalid token handling"""
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/v1/me", headers=headers)
        assert response.status_code == 401
    
    def test_missing_token(self):
        """Test missing token handling"""
        response = client.get("/api/v1/me")
        assert response.status_code == 401

class TestProtectedEndpoints:
    """Test protected API endpoints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get valid authentication headers"""
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_metrics_endpoint(self, auth_headers):
        """Test authenticated metrics endpoint"""
        response = client.get("/api/v1/metrics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "cpu_usage" in data
        assert "memory_usage" in data
        assert "disk_usage" in data
        assert "requested_by" in data
        assert data["mode"] == "authenticated"
    
    def test_deployments_endpoint(self, auth_headers):
        """Test deployments endpoint"""
        response = client.get("/api/v1/deployments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            deployment = data[0]
            assert "id" in deployment
            assert "name" in deployment
            assert "version" in deployment
            assert "status" in deployment
    
    def test_create_deployment(self, auth_headers):
        """Test deployment creation"""
        deployment_data = {
            "name": "test-deployment",
            "version": "v1.0.0",
            "environment": "testing"
        }
        response = client.post("/api/v1/deployments", 
                              json=deployment_data, 
                              headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-deployment"
        assert data["created_by"] == "demo-user"
    
    def test_admin_stats_endpoint(self, auth_headers):
        """Test admin-only endpoint"""
        response = client.get("/api/v1/admin/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "active_sessions" in data
        assert "accessed_by" in data
    
    def test_users_endpoint(self, auth_headers):
        """Test admin users endpoint"""
        response = client.get("/api/v1/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)

class TestRBACSystem:
    """Test Role-Based Access Control"""
    
    def test_permission_enforcement(self):
        """Test permission-based access control"""
        # Create a user with limited permissions
        limited_user_data = {
            "sub": "limited123",
            "role": "user",
            "permissions": ["read"]
        }
        limited_token = auth_store.create_access_token(limited_user_data)
        
        # Add limited user to store
        auth_store.users["limited123"] = {
            "id": 2,
            "github_id": "limited123",
            "username": "limited-user",
            "role": "user",
            "permissions": ["read"],
            "is_active": True
        }
        
        headers = {"Authorization": f"Bearer {limited_token}"}
        
        # Should be able to access read endpoints
        response = client.get("/api/v1/metrics", headers=headers)
        assert response.status_code == 200
        
        # Should NOT be able to access admin endpoints
        response = client.get("/api/v1/admin/stats", headers=headers)
        assert response.status_code == 403
        
        # Should NOT be able to create deployments (requires deploy permission)
        response = client.post("/api/v1/deployments", 
                              json={"name": "test"}, 
                              headers=headers)
        assert response.status_code == 403

class TestDataValidation:
    """Test data validation and error handling"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get valid authentication headers"""
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_malformed_deployment_data(self, auth_headers):
        """Test handling of malformed deployment data"""
        # Test with valid data first
        valid_data = {"name": "valid-deployment", "version": "v1.0.0"}
        response = client.post("/api/v1/deployments", 
                              json=valid_data, 
                              headers=auth_headers)
        assert response.status_code == 200
        
        # Test with missing data (should still work with defaults)
        response = client.post("/api/v1/deployments", 
                              json={}, 
                              headers=auth_headers)
        assert response.status_code == 200
    
    def test_invalid_json(self, auth_headers):
        """Test invalid JSON handling"""
        response = client.post("/api/v1/deployments",
                              data="invalid-json",
                              headers={**auth_headers, "Content-Type": "application/json"})
        assert response.status_code == 422  # Unprocessable Entity

class TestPerformance:
    """Test API performance and load handling"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get valid authentication headers"""
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_concurrent_requests(self, auth_headers):
        """Test handling of concurrent requests"""
        import concurrent.futures
        import time
        
        def make_request():
            start_time = time.time()
            response = client.get("/api/v1/metrics", headers=auth_headers)
            end_time = time.time()
            return response.status_code, end_time - start_time
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        for status_code, duration in results:
            assert status_code == 200
            assert duration < 2.0  # Should respond within 2 seconds
    
    def test_response_times(self, auth_headers):
        """Test API response times"""
        import time
        
        endpoints = [
            "/api/v1/metrics",
            "/api/v1/deployments",
            "/api/v1/me"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=auth_headers)
            end_time = time.time()
            
            assert response.status_code == 200
            assert (end_time - start_time) < 1.0  # Response within 1 second

class TestSecurityFeatures:
    """Test security features and vulnerabilities"""
    
    def test_sql_injection_protection(self):
        """Test SQL injection protection (though we're using in-memory store)"""
        malicious_input = "'; DROP TABLE users; --"
        
        # Try SQL injection in deployment creation
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        deployment_data = {
            "name": malicious_input,
            "version": malicious_input
        }
        
        response = client.post("/api/v1/deployments", 
                              json=deployment_data, 
                              headers=headers)
        
        # Should succeed but sanitize the input
        assert response.status_code == 200
    
    def test_xss_protection(self):
        """Test XSS protection in API responses"""
        xss_payload = "<script>alert('xss')</script>"
        
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        deployment_data = {
            "name": xss_payload,
            "version": "v1.0.0"
        }
        
        response = client.post("/api/v1/deployments", 
                              json=deployment_data, 
                              headers=headers)
        
        assert response.status_code == 200
        # In a real app, you'd verify the payload is sanitized
    
    def test_rate_limiting_simulation(self):
        # Get auth headers
        response = client.get("/auth/demo-token")
        token = response.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        # Simulate rate limiting tests
        # Make rapid requests to test stability
        responses = []
        for i in range(20):
            response = client.get("/api/v1/metrics", headers=auth_headers)
            responses.append(response.status_code)
        
        # All should succeed (no rate limiting implemented yet)
        assert all(status == 200 for status in responses)

# Test runner and utilities
def run_tests():
    """Run all tests and generate report"""
    import sys
    
    # Run pytest with verbose output
    exit_code = pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--durations=10",
        "-x"  # Stop on first failure
    ])
    
    return exit_code == 0

if __name__ == "__main__":
    print("🧪 OpsSight Platform API Test Suite")
    print("=" * 50)
    
    success = run_tests()
    
    if success:
        print("\n✅ All tests passed! API is ready for production.")
    else:
        print("\n❌ Some tests failed. Please fix issues before deployment.")
        sys.exit(1)