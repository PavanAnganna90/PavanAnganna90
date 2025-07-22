#!/usr/bin/env python3
"""
Test script to verify OAuth endpoints are publicly accessible.
"""

import requests
import json


def test_oauth_endpoints():
    """Test that OAuth endpoints are accessible without authentication."""
    base_url = "http://localhost:8000"
    
    # List of endpoints that should be public
    public_endpoints = [
        "/api/v1/auth/oauth/providers",
        "/api/v1/auth/oauth/google/health",
        "/api/v1/auth/oauth/github/health",
        "/api/v1/auth/oauth/google/authorize?redirect_uri=http://localhost:3000/auth/callback",
        "/api/v1/auth/oauth/github/authorize?redirect_uri=http://localhost:3000/auth/callback",
        "/api/v1/auth/sso/config",
    ]
    
    results = []
    
    for endpoint in public_endpoints:
        url = f"{base_url}{endpoint}"
        print(f"\nTesting: {url}")
        
        try:
            # Test without authentication header
            response = requests.get(url, timeout=10.0)
            
            if response.status_code == 401:
                print(f"❌ FAILED: {endpoint} requires authentication (401)")
                results.append({
                    "endpoint": endpoint,
                    "status": "FAILED", 
                    "reason": "Requires authentication",
                    "status_code": response.status_code
                })
            elif response.status_code == 200:
                print(f"✅ SUCCESS: {endpoint} is publicly accessible")
                results.append({
                    "endpoint": endpoint,
                    "status": "SUCCESS",
                    "status_code": response.status_code,
                    "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                })
            else:
                print(f"⚠️  WARNING: {endpoint} returned {response.status_code}")
                results.append({
                    "endpoint": endpoint,
                    "status": "WARNING",
                    "status_code": response.status_code,
                    "response": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                })
                
        except requests.exceptions.ConnectionError:
            print(f"❌ ERROR: Cannot connect to backend server at {base_url}")
            results.append({
                "endpoint": endpoint,
                "status": "ERROR",
                "reason": "Cannot connect to server"
            })
        except Exception as e:
            print(f"❌ ERROR: {endpoint} - {str(e)}")
            results.append({
                "endpoint": endpoint,
                "status": "ERROR",
                "reason": str(e)
            })
    
    # Summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    
    success_count = sum(1 for r in results if r["status"] == "SUCCESS")
    failed_count = sum(1 for r in results if r["status"] == "FAILED")
    warning_count = sum(1 for r in results if r["status"] == "WARNING")
    error_count = sum(1 for r in results if r["status"] == "ERROR")
    
    print(f"Total endpoints tested: {len(results)}")
    print(f"✅ Success: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"⚠️  Warnings: {warning_count}")
    print(f"❌ Errors: {error_count}")
    
    # Print detailed results for failed endpoints
    if failed_count > 0:
        print("\nFailed endpoints requiring authentication:")
        for r in results:
            if r["status"] == "FAILED":
                print(f"  - {r['endpoint']}")
    
    return results


if __name__ == "__main__":
    print("Testing OAuth endpoint accessibility...")
    print("Make sure the backend server is running on http://localhost:8000")
    
    results = test_oauth_endpoints()
    
    # Save results to file
    with open("oauth_endpoint_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to oauth_endpoint_test_results.json")