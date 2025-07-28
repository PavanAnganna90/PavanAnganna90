#!/usr/bin/env python3
"""
Simple FastAPI backend for OpsSight Platform development
Provides basic endpoints with authentication bypass enabled
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
from typing import Dict, Any

# Create FastAPI app
app = FastAPI(
    title="OpsSight Development API",
    description="Simple backend for local development with auth bypass",
    version="2.0.0-dev"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Demo user data
DEMO_USER = {
    "id": "dev-user-001",
    "email": "dev@opssight.local",
    "firstName": "Dev",
    "lastName": "User", 
    "role": "ADMIN",
    "is_active": True,
    "created_at": datetime.utcnow().isoformat(),
    "updated_at": datetime.utcnow().isoformat()
}

# Demo data
DEMO_PROJECTS = [
    {
        "id": "proj-001",
        "name": "OpsSight Platform",
        "description": "Main DevOps visibility platform",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    },
    {
        "id": "proj-002", 
        "name": "Microservices API",
        "description": "Backend microservices architecture",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    }
]

DEMO_METRICS = [
    {"name": "cpu_usage", "value": 65.4, "unit": "percent", "timestamp": datetime.utcnow().isoformat()},
    {"name": "memory_usage", "value": 78.2, "unit": "percent", "timestamp": datetime.utcnow().isoformat()}, 
    {"name": "response_time", "value": 145.6, "unit": "ms", "timestamp": datetime.utcnow().isoformat()},
    {"name": "error_rate", "value": 2.1, "unit": "percent", "timestamp": datetime.utcnow().isoformat()}
]

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OpsSight Development API",
        "version": "2.0.0-dev",
        "status": "running",
        "auth_bypass": True,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "opssight-backend",
        "version": "2.0.0-dev",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "connected",
        "redis": "connected",
        "auth_bypass": True
    }

@app.get("/api/v1/health/readiness")
async def readiness_probe():
    """Kubernetes readiness probe"""
    return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/v1/health/liveness") 
async def liveness_probe():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

@app.post("/auth/demo-token")
async def create_demo_token():
    """Create demo authentication token"""
    return {
        "access_token": "demo-token-dev-environment-bypass-enabled",
        "token_type": "bearer",
        "user": DEMO_USER,
        "expires_in": 86400
    }

@app.post("/api/v1/auth/login")
async def login(credentials: Dict[str, Any] = None):
    """Demo login endpoint with auth bypass"""
    return {
        "user": DEMO_USER,
        "token": "demo-token-dev-environment-bypass-enabled",
        "message": "Authentication bypassed for development"
    }

@app.get("/api/auth/sso-status")
async def get_sso_status():
    """Get SSO bypass status for development"""
    return {
        "success": True,
        "data": {
            "authType": "bypass",
            "development": True,
            "ssoEnabled": False
        }
    }

@app.get("/api/auth/dev-token")
async def get_dev_token():
    """Get development authentication token (bypasses SSO)"""
    import base64
    import json
    
    # Create a simple JWT-like token for development
    payload = {
        "sub": "dev-user-123",
        "email": "dev@example.com", 
        "name": "Dev User",
        "role": "ADMIN",
        "exp": 9999999999  # Far future expiry
    }
    
    # Simple base64 encoding (not real JWT for dev only)
    header = base64.b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode()
    payload_b64 = base64.b64encode(json.dumps(payload).encode()).decode()
    signature = "dev-signature"
    
    token = f"{header}.{payload_b64}.{signature}"
    
    return {
        "success": True,
        "data": {
            "user": {
                "id": payload["sub"],
                "email": payload["email"],
                "name": payload["name"],
                "role": payload["role"]
            },
            "token": token,
            "message": "Development authentication bypass enabled",
            "bypass": True
        }
    }

@app.get("/api/v1/auth/me")
async def get_current_user():
    """Get current user (always returns demo user)"""
    return {"data": DEMO_USER}

@app.get("/api/v1/projects")
async def get_projects():
    """Get demo projects"""
    return {"data": DEMO_PROJECTS, "total": len(DEMO_PROJECTS)}

@app.get("/api/v1/metrics")
async def get_metrics():
    """Get demo metrics"""
    return {"data": DEMO_METRICS, "total": len(DEMO_METRICS)}

@app.get("/api/v1/dashboard/overview")
async def get_dashboard_overview():
    """Get dashboard overview data"""
    return {
        "data": {
            "projects_count": len(DEMO_PROJECTS),
            "active_deployments": 12,
            "success_rate": 94.5,
            "avg_response_time": 145.6,
            "alerts_count": 3,
            "metrics": DEMO_METRICS[:3]
        }
    }

@app.get("/api/v1/users")
async def get_users():
    """Get demo users"""
    users = [
        DEMO_USER,
        {
            "id": "user-002",
            "email": "admin@opssight.local", 
            "firstName": "Admin",
            "lastName": "User",
            "role": "ADMIN",
            "is_active": True
        },
        {
            "id": "user-003",
            "email": "user@opssight.local",
            "firstName": "Regular", 
            "lastName": "User",
            "role": "USER",
            "is_active": True
        }
    ]
    return {"data": users, "total": len(users)}

@app.get("/api/v1/posts")  
async def get_posts():
    """Get demo posts/content"""
    posts = [
        {
            "id": "post-001",
            "title": "OpsSight Platform Launch",
            "content": "Announcing the launch of our new DevOps visibility platform",
            "author": "Dev User",
            "created_at": datetime.utcnow().isoformat(),
            "status": "published"
        },
        {
            "id": "post-002", 
            "title": "Infrastructure Updates",
            "content": "Recent improvements to our monitoring infrastructure",
            "author": "Admin User", 
            "created_at": datetime.utcnow().isoformat(),
            "status": "published"
        }
    ]
    return {"data": posts, "total": len(posts)}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "auth_bypass": True,
            "development": True
        }
    )

@app.get("/cache/metrics")
async def get_cache_metrics():
    """Get cache performance metrics"""
    return {
        "hit_rate": 0.85,
        "miss_rate": 0.15,
        "total_requests": 1500,
        "hits": 1275,
        "misses": 225,
        "size": 2048000,
        "max_size": 10485760
    }

@app.get("/api/performance")
async def get_api_performance():
    """Get API performance metrics"""
    return {
        "response_time_ms": 45.2,
        "cache_enabled": True,
        "cache_level": "both",
        "total_requests": 3500,
        "requests_per_second": 25.3,
        "error_rate": 0.02,
        "uptime_seconds": 86400
    }

@app.get("/api/v1/metrics/dashboard")
async def get_metrics_dashboard():
    """Get dashboard-specific metrics"""
    return {
        "success": True,
        "data": {
            "system": {
                "cpu_usage": 68.5,
                "memory_usage": 76.3,
                "disk_usage": 45.2
            },
            "performance": {
                "response_time": 142.3,
                "throughput": 1250,
                "error_rate": 0.8
            },
            "alerts": {
                "critical": 1,
                "warning": 2,
                "info": 5
            }
        }
    }

@app.post("/api/v1/analytics")
async def post_analytics():
    """Handle analytics data (just acknowledge)"""
    return {
        "success": True,
        "message": "Analytics data received"
    }

if __name__ == "__main__":
    print("🚀 Starting OpsSight Development Backend...")
    print("🔓 Authentication bypass enabled for development")
    print("📍 Available endpoints:")
    print("   • Health: http://localhost:8000/api/v1/health")
    print("   • Dashboard: http://localhost:8000/api/v1/dashboard/overview") 
    print("   • Projects: http://localhost:8000/api/v1/projects")
    print("   • Metrics: http://localhost:8000/api/v1/metrics")
    print("   • Demo Login: http://localhost:8000/auth/demo-token")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )