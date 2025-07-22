#!/usr/bin/env python3
"""
Simple FastAPI server to test OAuth endpoints without complex dependencies.
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Set up environment
os.environ.update({
    'DATABASE_URL': 'postgresql+asyncpg://opssight:opssight123@localhost:5432/opssight_dev',
    'CORS_ORIGINS': 'http://localhost:3000',
    'APP_NAME': 'OpsSight',
    'APP_ENV': 'development',
    'SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'JWT_SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'SECURITY_JWT_SECRET_KEY': 'local-development-secret-key-for-testing-only-must-be-at-least-32-chars',
    'JWT_ALGORITHM': 'HS256',
    'JWT_ACCESS_TOKEN_EXPIRE_MINUTES': '60',
    'JWT_REFRESH_TOKEN_EXPIRE_DAYS': '7',
    'CSRF_SECRET': 'local-csrf-secret-for-development-only',
    'GITHUB_CLIENT_ID': 'dev-client-id',
    'GITHUB_CLIENT_SECRET': 'dev-client-secret',
    'GITHUB_CALLBACK_URL': 'http://localhost:3000/auth/github/callback',
    'REDIS_URL': 'redis://localhost:6379/0',
    'DEBUG': 'true',
    'ENVIRONMENT': 'development'
})

app = FastAPI(title="OpsSight OAuth Test Server", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "OpsSight OAuth Test", "version": "1.0.0"}

@app.get("/api/v1/auth/oauth/providers")
async def oauth_providers():
    """Test OAuth providers endpoint without authentication."""
    return {
        "providers": [
            {
                "provider": "github",
                "name": "GitHub",
                "configured": True,
                "enabled": True,
                "description": "GitHub OAuth 2.0 authentication"
            },
            {
                "provider": "google", 
                "name": "Google",
                "configured": False,
                "enabled": False,
                "description": "Google OAuth 2.0 authentication (not configured)"
            }
        ],
        "total_count": 2,
        "enabled_count": 1
    }

@app.get("/api/v1/auth/oauth/{provider}/health")
async def oauth_provider_health(provider: str):
    """Test OAuth provider health endpoint."""
    if provider == "github":
        return {
            "provider": "github",
            "status": "healthy",
            "configured": True,
            "auth_url": "https://github.com/login/oauth/authorize",
            "message": "OAuth provider 'github' health check completed"
        }
    else:
        return {
            "provider": provider,
            "status": "not_configured",
            "configured": False,
            "message": f"OAuth provider '{provider}' is not configured"
        }

@app.get("/api/v1/auth/oauth/{provider}/authorize")
async def oauth_authorize(provider: str, redirect_uri: str = None, state: str = None):
    """Test OAuth authorization URL generation."""
    if provider == "github":
        auth_url = f"https://github.com/login/oauth/authorize?client_id=dev-client-id&redirect_uri={redirect_uri or 'http://localhost:3000/auth/callback'}&scope=user:email&state={state or 'test-state'}"
        return {
            "authorization_url": auth_url,
            "provider": provider,
            "state": state or "test-state"
        }
    else:
        return {"error": f"Provider {provider} not configured"}

if __name__ == "__main__":
    print("🚀 Starting OAuth test server...")
    print("   OAuth endpoints will be publicly accessible")
    print("   Testing: http://localhost:8000/api/v1/auth/oauth/providers")
    uvicorn.run(app, host="0.0.0.0", port=8000)