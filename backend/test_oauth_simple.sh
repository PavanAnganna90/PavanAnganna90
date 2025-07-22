#!/bin/bash
# Simple test script for OAuth endpoint accessibility

echo "Testing OAuth providers endpoint without authentication..."
echo ""

# Test the providers endpoint
echo "1. Testing /api/v1/auth/oauth/providers"
curl -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  http://localhost:8000/api/v1/auth/oauth/providers | python -m json.tool || true

echo ""
echo "2. Testing /api/v1/auth/sso/config"
curl -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  http://localhost:8000/api/v1/auth/sso/config | python -m json.tool || true

echo ""
echo "3. Testing Google health endpoint"
curl -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  http://localhost:8000/api/v1/auth/oauth/google/health | python -m json.tool || true

echo ""
echo "4. Testing Google authorize endpoint"
curl -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  "http://localhost:8000/api/v1/auth/oauth/google/authorize?redirect_uri=http://localhost:3000/auth/callback" | python -m json.tool || true

echo ""
echo "Test complete!"