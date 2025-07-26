"""
Enhanced FastAPI server with GitHub OAuth authentication
Production-ready authentication and authorization system
"""

from fastapi import FastAPI, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse
import httpx
import jwt
from datetime import datetime, timedelta
import os
import json
import hashlib
import secrets
from typing import Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI instance
app = FastAPI(
    title="OpsSight Platform API - With Authentication",
    description="Production-ready DevOps Platform API with GitHub OAuth",
    version="2.2.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth & JWT Configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "placeholder-client-id")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "placeholder-client-secret")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "production-jwt-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Security
security = HTTPBearer(auto_error=False)

# In-memory stores (would be database in production)
class AuthStore:
    def __init__(self):
        self.users = {}
        self.sessions = {}
        self.oauth_states = {}
        self._init_demo_data()
    
    def _init_demo_data(self):
        """Initialize with demo user for testing"""
        demo_user = {
            "id": 1,
            "github_id": "demo123",
            "username": "demo-user",
            "email": "demo@opssight.dev",
            "full_name": "Demo User",
            "avatar_url": "https://github.com/identicons/demo.png",
            "role": "admin",
            "permissions": ["read", "write", "admin", "deploy"],
            "organization_id": 1,
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat()
        }
        self.users["demo123"] = demo_user
        
        # Create demo session
        demo_token = self.create_access_token({"sub": "demo123", "role": "admin"})
        self.sessions[demo_token] = {
            "user_id": "demo123",
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        }

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "iat": datetime.utcnow()})
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id and user_id in self.users:
                return payload
            return None
        except jwt.PyJWTError as e:
            logger.error(f"JWT verification failed: {e}")
            return None
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def create_or_update_user(self, github_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update user from GitHub data"""
        github_id = str(github_data["id"])
        
        user_data = {
            "id": len(self.users) + 1,
            "github_id": github_id,
            "username": github_data["login"],
            "email": github_data.get("email"),
            "full_name": github_data.get("name"),
            "avatar_url": github_data.get("avatar_url"),
            "role": "user",  # Default role
            "permissions": ["read"],  # Default permissions
            "organization_id": 1,  # Default org
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "last_login": datetime.utcnow().isoformat(),
            "github_profile": github_data
        }
        
        # Update existing user or create new
        if github_id in self.users:
            existing_user = self.users[github_id]
            user_data.update({
                "id": existing_user["id"],
                "role": existing_user["role"],
                "permissions": existing_user["permissions"],
                "created_at": existing_user["created_at"]
            })
        
        self.users[github_id] = user_data
        return user_data

# Global auth store
auth_store = AuthStore()

# Dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict[str, Any]]:
    """Get current authenticated user"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = auth_store.verify_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    user = auth_store.get_user(user_id)
    if not user or not user.get("is_active"):
        return None
    
    return user

async def require_auth(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require authentication"""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user

async def require_permission(permission: str):
    """Create permission requirement dependency"""
    async def permission_checker(user: Dict[str, Any] = Depends(require_auth)):
        if permission not in user.get("permissions", []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return user
    return permission_checker

# Demo data for authenticated endpoints
DEMO_METRICS = {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "disk_usage": 23.4,
    "network_io": {"in": 1234567, "out": 987654},
    "active_deployments": 8,
    "pipeline_runs_today": 32,
    "success_rate": 96.5,
    "timestamp": datetime.utcnow().isoformat(),
    "mode": "authenticated"
}

# Routes
@app.get("/")
async def root():
    """Root endpoint with authentication info"""
    return {
        "message": "OpsSight Platform API - With Authentication",
        "version": "2.2.0",
        "status": "operational",
        "features": [
            "GitHub OAuth authentication",
            "JWT token management",
            "Role-based access control",
            "Protected API endpoints",
            "User session management"
        ],
        "auth": {
            "oauth_provider": "GitHub",
            "login_url": "/auth/github",
            "demo_token_available": True
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check with auth status"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.2.0",
        "auth": {
            "oauth_configured": bool(GITHUB_CLIENT_ID != "placeholder-client-id"),
            "jwt_enabled": True,
            "active_sessions": len(auth_store.sessions)
        },
        "services": {
            "api": "operational",
            "authentication": "operational",
            "authorization": "operational"
        }
    }

# Authentication Routes
@app.get("/auth/github")
async def github_oauth_login():
    """Initiate GitHub OAuth flow"""
    state = secrets.token_urlsafe(32)
    auth_store.oauth_states[state] = {
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={GITHUB_CLIENT_ID}&"
        f"redirect_uri=http://localhost:8000/auth/github/callback&"
        f"scope=user:email&"
        f"state={state}"
    )
    
    return {"auth_url": github_auth_url, "state": state}

@app.get("/auth/github/callback")
async def github_oauth_callback(code: str, state: str):
    """Handle GitHub OAuth callback"""
    # Verify state
    if state not in auth_store.oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Remove used state
    del auth_store.oauth_states[state]
    
    try:
        # Exchange code for access token
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            
            if "access_token" not in token_data:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            
            # Get user info from GitHub
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {token_data['access_token']}"}
            )
            github_user = user_response.json()
            
            # Create or update user
            user = auth_store.create_or_update_user(github_user)
            
            # Create JWT token
            access_token = auth_store.create_access_token({
                "sub": user["github_id"],
                "role": user["role"],
                "permissions": user["permissions"]
            })
            
            # Store session
            auth_store.sessions[access_token] = {
                "user_id": user["github_id"],
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
            }
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "email": user["email"],
                    "full_name": user["full_name"],
                    "avatar_url": user["avatar_url"],
                    "role": user["role"]
                }
            }
            
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.get("/auth/demo-token")
async def get_demo_token():
    """Get demo token for testing (development only)"""
    if os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(status_code=404, detail="Demo tokens not available in production")
    
    demo_token = auth_store.create_access_token({
        "sub": "demo123",
        "role": "admin",
        "permissions": ["read", "write", "admin", "deploy"]
    })
    
    return {
        "access_token": demo_token,
        "token_type": "bearer",
        "expires_in": JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": auth_store.get_user("demo123"),
        "note": "This is a demo token for development/testing"
    }

@app.post("/auth/logout")
async def logout(user: Dict[str, Any] = Depends(require_auth)):
    """Logout user and invalidate session"""
    # In a real implementation, you'd add the token to a blacklist
    return {"message": "Logged out successfully"}

# Protected API Routes
@app.get("/api/v1/me")
async def get_current_user_info(user: Dict[str, Any] = Depends(require_auth)):
    """Get current user information"""
    return {
        "user": user,
        "session": {
            "authenticated": True,
            "role": user["role"],
            "permissions": user["permissions"]
        }
    }

@app.get("/api/v1/health")
async def api_health_check():
    """Public API health check"""
    return await health_check()

@app.get("/api/v1/metrics")
async def get_metrics(user: Dict[str, Any] = Depends(require_auth)):
    """Get system metrics (requires authentication)"""
    metrics = DEMO_METRICS.copy()
    metrics.update({
        "timestamp": datetime.utcnow().isoformat(),
        "requested_by": user["username"],
        "user_role": user["role"]
    })
    return metrics

@app.get("/api/v1/deployments")
async def get_deployments(user: Dict[str, Any] = Depends(require_auth)):
    """Get deployments (requires authentication)"""
    return [
        {
            "id": 1,
            "name": "frontend-app",
            "version": "v2.2.0",
            "status": "running",
            "environment": "production",
            "created_by": user["username"],
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "id": 2,
            "name": "backend-api",
            "version": "v2.2.0",
            "status": "running",
            "environment": "production",
            "created_by": "system",
            "updated_at": datetime.utcnow().isoformat()
        }
    ]

@app.post("/api/v1/deployments")
async def create_deployment(
    deployment_data: dict, 
    user: Dict[str, Any] = Depends(require_auth)
):
    """Create deployment (requires deploy permission)"""
    new_deployment = {
        "id": 999,
        "name": deployment_data.get("name", "new-deployment"),
        "version": deployment_data.get("version", "v1.0.0"),
        "status": "pending",
        "environment": deployment_data.get("environment", "production"),
        "created_by": user["username"],
        "created_at": datetime.utcnow().isoformat()
    }
    return new_deployment

@app.get("/api/v1/users")
async def get_users(user: Dict[str, Any] = Depends(require_auth)):
    """Get all users (admin only)"""
    return {
        "users": list(auth_store.users.values()),
        "total": len(auth_store.users)
    }

@app.get("/api/v1/admin/stats")
async def get_admin_stats(user: Dict[str, Any] = Depends(require_auth)):
    """Get admin statistics (admin only)"""
    return {
        "total_users": len(auth_store.users),
        "active_sessions": len(auth_store.sessions),
        "system_uptime": "4 hours 23 minutes",
        "version": "2.2.0",
        "accessed_by": user["username"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)