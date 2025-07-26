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
from typing import Optional, Dict, Any, List
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
    if "deploy" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Deploy permission required")
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
    if "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin permission required")
    return {
        "users": list(auth_store.users.values()),
        "total": len(auth_store.users)
    }

@app.get("/api/v1/admin/stats")
async def get_admin_stats(user: Dict[str, Any] = Depends(require_auth)):
    """Get admin statistics (admin only)"""
    if "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin permission required")
    return {
        "total_users": len(auth_store.users),
        "active_sessions": len(auth_store.sessions),
        "system_uptime": "4 hours 23 minutes",
        "version": "2.2.0",
        "accessed_by": user["username"]
    }

# Kubernetes Integration Endpoints
from k8s_integration import k8s_service

# Ansible Integration Endpoints
from ansible_integration import ansible_service

# Advanced Analytics Endpoints
from analytics_engine import analytics_engine

# Alert Integration Endpoints
from alert_integrations import alert_manager

# Engineering Intelligence Endpoints (Typo Replica)
from engineering_intelligence import engineering_intel

# AI Code Review Endpoints (Typo Replica)
from ai_code_review import ai_code_review

# Git Analytics Endpoints
from git_analytics import git_analytics

# Deployment Pipeline Endpoints
from deployment_pipeline import deployment_pipeline

# Security Audit Endpoints
from security_audit import security_audit

# API Documentation Endpoints
from api_documentation import api_documentation

# Collaboration Service Endpoints
from collaboration_service import collaboration_service

# Performance Monitoring Endpoints
from performance_monitoring import performance_monitoring

# Intelligent Alerting Endpoints
from intelligent_alerting import intelligent_alerting

# System Observability Endpoints
from system_observability import system_observability

# Cost Optimization Endpoints
from cost_optimization import cost_optimization

@app.get("/api/v1/kubernetes/overview")
async def get_kubernetes_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get Kubernetes cluster overview"""
    return await k8s_service.get_cluster_overview()

@app.get("/api/v1/kubernetes/resources")
async def get_kubernetes_resources(user: Dict[str, Any] = Depends(require_auth)):
    """Get Kubernetes resource utilization"""
    return await k8s_service.get_resource_utilization()

@app.get("/api/v1/kubernetes/health")
async def get_kubernetes_health(user: Dict[str, Any] = Depends(require_auth)):
    """Get Kubernetes application health"""
    return await k8s_service.get_application_health()

@app.get("/api/v1/kubernetes/security")
async def get_kubernetes_security(user: Dict[str, Any] = Depends(require_auth)):
    """Get Kubernetes security posture"""
    if "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin permission required")
    return await k8s_service.get_security_posture()

@app.get("/api/v1/ansible/overview")
async def get_ansible_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get Ansible automation overview"""
    return await ansible_service.get_automation_overview()

@app.get("/api/v1/ansible/analytics")
async def get_ansible_analytics(user: Dict[str, Any] = Depends(require_auth)):
    """Get Ansible playbook analytics"""
    return await ansible_service.get_playbook_analytics()

@app.get("/api/v1/ansible/coverage")
async def get_ansible_coverage(user: Dict[str, Any] = Depends(require_auth)):
    """Get Ansible infrastructure coverage"""
    return await ansible_service.get_infrastructure_coverage()

@app.get("/api/v1/ansible/executions")
async def get_ansible_executions(user: Dict[str, Any] = Depends(require_auth)):
    """Get Ansible execution monitoring"""
    return await ansible_service.get_execution_monitoring()

@app.get("/api/v1/analytics/trends")
async def get_performance_trends(
    days: int = 7,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get performance trends analysis"""
    return await analytics_engine.get_performance_trends(days=days)

@app.get("/api/v1/analytics/predictions")
async def get_predictive_analytics(user: Dict[str, Any] = Depends(require_auth)):
    """Get predictive analytics and forecasting"""
    return await analytics_engine.get_predictive_analytics()

@app.get("/api/v1/alerts")
async def get_active_alerts(
    severity: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get active alerts"""
    return await alert_manager.get_active_alerts(severity=severity)

@app.post("/api/v1/alerts/{alert_id}/notify")
async def send_alert_notifications(
    alert_id: str,
    channels: List[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Send alert notifications to configured channels"""
    if "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin permission required")
    return await alert_manager.send_alert_notifications(alert_id, channels)

@app.get("/api/v1/alerts/integrations/status")
async def get_integration_status(user: Dict[str, Any] = Depends(require_auth)):
    """Get alert integration status"""
    return await alert_manager.get_integration_status()

@app.post("/api/v1/alerts/integrations/test")
async def test_alert_integrations(user: Dict[str, Any] = Depends(require_auth)):
    """Test all alert integrations"""
    if "admin" not in user.get("permissions", []):
        raise HTTPException(status_code=403, detail="Admin permission required")
    return await alert_manager.test_integrations()

# Engineering Intelligence Endpoints (Typo Replica Features)

@app.get("/api/v1/engineering/sdlc")
async def get_sdlc_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get SDLC visibility overview - Typo core feature"""
    return await engineering_intel.get_sdlc_overview()

@app.get("/api/v1/engineering/teams")
async def get_team_performance(user: Dict[str, Any] = Depends(require_auth)):
    """Get team performance analytics"""
    return await engineering_intel.get_team_performance()

@app.get("/api/v1/engineering/dora")
async def get_dora_metrics(user: Dict[str, Any] = Depends(require_auth)):
    """Get DORA metrics (DevOps Research & Assessment)"""
    return await engineering_intel.get_dora_metrics()

@app.get("/api/v1/engineering/quality")
async def get_code_quality_insights(user: Dict[str, Any] = Depends(require_auth)):
    """Get AI-powered code quality insights"""
    return await engineering_intel.get_code_quality_insights()

@app.get("/api/v1/engineering/devex")
async def get_developer_experience(user: Dict[str, Any] = Depends(require_auth)):
    """Get developer experience insights and satisfaction metrics"""
    return await engineering_intel.get_developer_experience()

# AI Code Review Endpoints (Typo Core Features)

@app.get("/api/v1/code-review/analyze/{pr_id}")
async def analyze_pull_request(pr_id: str, user: Dict[str, Any] = Depends(require_auth)):
    """AI-powered pull request analysis - Typo core feature"""
    return await ai_code_review.analyze_pull_request(pr_id)

@app.get("/api/v1/code-review/summary")
async def get_ai_review_summary(user: Dict[str, Any] = Depends(require_auth)):
    """Get AI code review summary across all PRs"""
    return await ai_code_review.get_ai_review_summary()

# Git Analytics Endpoints

@app.get("/api/v1/git/repositories")
async def get_repository_analytics(user: Dict[str, Any] = Depends(require_auth)):
    """Get comprehensive repository analytics"""
    return await git_analytics.get_repository_analytics()

@app.get("/api/v1/git/contributors")
async def get_contributor_analytics(user: Dict[str, Any] = Depends(require_auth)):
    """Get contributor analytics and patterns"""
    return await git_analytics.get_contributor_analytics()

@app.get("/api/v1/git/velocity")
async def get_code_velocity_analytics(user: Dict[str, Any] = Depends(require_auth)):
    """Get code velocity and productivity analytics"""
    return await git_analytics.get_code_velocity_analytics()

@app.get("/api/v1/git/repository/{repository_name}")
async def get_repository_insights(
    repository_name: str,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get detailed insights for a specific repository"""
    return await git_analytics.get_repository_insights(repository_name)

# Deployment Pipeline Endpoints

@app.get("/api/v1/pipeline/overview")
async def get_pipeline_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get pipeline overview and real-time status"""
    return await deployment_pipeline.get_pipeline_overview()

@app.get("/api/v1/pipeline/execution/{pipeline_id}")
async def get_pipeline_execution(
    pipeline_id: str,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get detailed pipeline execution information"""
    return await deployment_pipeline.get_pipeline_execution(pipeline_id)

@app.get("/api/v1/pipeline/analytics")
async def get_deployment_analytics(user: Dict[str, Any] = Depends(require_auth)):
    """Get deployment analytics and DORA metrics"""
    return await deployment_pipeline.get_deployment_analytics()

@app.get("/api/v1/pipeline/environments")
async def get_environment_status(user: Dict[str, Any] = Depends(require_auth)):
    """Get environment status and deployment history"""
    return await deployment_pipeline.get_environment_status()

# Security Audit Endpoints

@app.get("/api/v1/security/overview")
async def get_security_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get comprehensive security overview and vulnerability summary"""
    return await security_audit.get_security_overview()

@app.get("/api/v1/security/vulnerabilities")
async def get_vulnerability_details(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get detailed vulnerability information with filtering"""
    return await security_audit.get_vulnerability_details(severity=severity, status=status)

@app.get("/api/v1/security/trends")
async def get_security_trends(user: Dict[str, Any] = Depends(require_auth)):
    """Get security trends and analytics"""
    return await security_audit.get_security_trends()

@app.get("/api/v1/security/compliance")
async def get_compliance_dashboard(user: Dict[str, Any] = Depends(require_auth)):
    """Get compliance framework dashboard"""
    return await security_audit.get_compliance_dashboard()

# API Documentation Endpoints

@app.get("/api/v1/docs/summary")
async def get_api_documentation_summary(user: Dict[str, Any] = Depends(require_auth)):
    """Get API documentation summary and endpoint statistics"""
    return await api_documentation.get_endpoint_summary()

@app.get("/api/v1/docs/full")
async def get_full_api_documentation(user: Dict[str, Any] = Depends(require_auth)):
    """Get complete API documentation with examples and schemas"""
    return await api_documentation.get_full_documentation()

# Collaboration Service Endpoints

@app.get("/api/v1/collaboration/channels")
async def get_user_channels(user: Dict[str, Any] = Depends(require_auth)):
    """Get channels accessible to the current user"""
    return await collaboration_service.get_user_channels(user["github_id"])

@app.get("/api/v1/collaboration/channels/{channel_id}/messages")
async def get_channel_messages(
    channel_id: str,
    limit: int = 50,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get recent messages for a specific channel"""
    return await collaboration_service.get_channel_messages(channel_id, user["github_id"], limit)

@app.post("/api/v1/collaboration/channels/{channel_id}/messages")
async def send_message(
    channel_id: str,
    message_data: dict,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Send a message to a channel"""
    return await collaboration_service.send_message(
        channel_id, 
        user["github_id"], 
        message_data.get("content", ""),
        message_data.get("message_type", "text"),
        message_data.get("reply_to")
    )

@app.get("/api/v1/collaboration/notifications")
async def get_user_notifications(
    unread_only: bool = False,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get user notifications"""
    return await collaboration_service.get_user_notifications(user["github_id"], unread_only)

@app.post("/api/v1/collaboration/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Mark notification as read"""
    success = await collaboration_service.mark_notification_read(notification_id, user["github_id"])
    return {"success": success}

@app.get("/api/v1/collaboration/users/online")
async def get_online_users(user: Dict[str, Any] = Depends(require_auth)):
    """Get list of currently online users"""
    return await collaboration_service.get_online_users()

@app.get("/api/v1/collaboration/stats")
async def get_collaboration_stats(user: Dict[str, Any] = Depends(require_auth)):
    """Get collaboration platform statistics"""
    return await collaboration_service.get_collaboration_stats()

# Performance Monitoring Endpoints

@app.get("/api/v1/performance/overview")
async def get_performance_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get comprehensive system performance overview with health score"""
    return await performance_monitoring.get_performance_overview()

@app.get("/api/v1/performance/alerts")
async def get_performance_alerts(
    severity: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get active performance alerts with filtering"""
    return await performance_monitoring.get_active_alerts(severity=severity)

@app.get("/api/v1/performance/metrics")
async def get_performance_metrics(
    service: Optional[str] = None,
    metric_type: Optional[str] = None,
    hours: int = 24,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get performance metrics with filtering and time range"""
    return await performance_monitoring.get_performance_metrics(
        service=service, metric_type=metric_type, hours=hours
    )

@app.get("/api/v1/performance/recommendations")
async def get_optimization_recommendations(
    category: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get system optimization recommendations"""
    return await performance_monitoring.get_optimization_recommendations(category=category)

@app.get("/api/v1/performance/anomalies")
async def get_anomaly_detection(user: Dict[str, Any] = Depends(require_auth)):
    """Get anomaly detection results and baseline comparisons"""
    return await performance_monitoring.get_anomaly_detection()

@app.post("/api/v1/performance/alerts/{alert_id}/acknowledge")
async def acknowledge_performance_alert(
    alert_id: str,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Acknowledge a performance alert"""
    success = await performance_monitoring.acknowledge_alert(alert_id, user["github_id"])
    return {"success": success, "acknowledged_by": user["username"]}

# Intelligent Alerting Endpoints

@app.get("/api/v1/intelligent-alerting/overview")
async def get_intelligent_alerting_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get comprehensive intelligent alerting overview with ML performance metrics"""
    return await intelligent_alerting.get_intelligent_alerts_overview()

@app.get("/api/v1/intelligent-alerting/alerts")
async def get_intelligent_alerts(
    category: Optional[str] = None,
    priority: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get intelligent alerts with ML insights and filtering"""
    return await intelligent_alerting.get_intelligent_alerts(category=category, priority=priority)

@app.get("/api/v1/intelligent-alerting/patterns")
async def get_pattern_analysis(user: Dict[str, Any] = Depends(require_auth)):
    """Get pattern analysis and predictions from ML models"""
    return await intelligent_alerting.get_pattern_analysis()

@app.get("/api/v1/intelligent-alerting/anomalies")
async def get_intelligent_anomaly_detection(user: Dict[str, Any] = Depends(require_auth)):
    """Get advanced anomaly detection results with ML confidence scores"""
    return await intelligent_alerting.get_anomaly_detection()

@app.get("/api/v1/intelligent-alerting/predictions")
async def get_predictive_insights(user: Dict[str, Any] = Depends(require_auth)):
    """Get predictive insights and forecasting from ML models"""
    return await intelligent_alerting.get_predictive_insights()

# System Observability Endpoints

@app.get("/api/v1/observability/overview")
async def get_observability_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get comprehensive system observability overview"""
    return await system_observability.get_observability_overview()

@app.get("/api/v1/observability/services")
async def get_service_health_details(
    service_name: Optional[str] = None,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get detailed service health information"""
    return await system_observability.get_service_health_details(service_name=service_name)

@app.get("/api/v1/observability/traces")
async def get_distributed_traces(
    limit: int = 50,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get distributed tracing information"""
    return await system_observability.get_distributed_traces(limit=limit)

@app.get("/api/v1/observability/dependencies")
async def get_service_dependencies(user: Dict[str, Any] = Depends(require_auth)):
    """Get service dependency mapping and health"""
    return await system_observability.get_service_dependencies()

@app.get("/api/v1/observability/business")
async def get_business_metrics(user: Dict[str, Any] = Depends(require_auth)):
    """Get business-level observability metrics"""
    return await system_observability.get_business_metrics()

@app.get("/api/v1/observability/correlations")
async def get_metric_correlations(user: Dict[str, Any] = Depends(require_auth)):
    """Get metric correlation analysis"""
    return await system_observability.get_metric_correlations()

# Cost Optimization Endpoints

@app.get("/api/v1/cost-optimization/overview")
async def get_cost_overview(user: Dict[str, Any] = Depends(require_auth)):
    """Get comprehensive cost overview and analysis"""
    return await cost_optimization.get_cost_overview()

@app.get("/api/v1/cost-optimization/recommendations")
async def get_cost_optimization_recommendations(
    priority: Optional[str] = None,
    limit: int = 20,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get cost optimization recommendations with filtering"""
    return await cost_optimization.get_optimization_recommendations(priority=priority, limit=limit)

@app.get("/api/v1/cost-optimization/forecasts")
async def get_cost_forecasts(user: Dict[str, Any] = Depends(require_auth)):
    """Get cost forecasting analysis and projections"""
    return await cost_optimization.get_cost_forecasts()

@app.get("/api/v1/cost-optimization/waste")
async def get_waste_analysis(user: Dict[str, Any] = Depends(require_auth)):
    """Get resource waste analysis and optimization opportunities"""
    return await cost_optimization.get_waste_analysis()

@app.get("/api/v1/cost-optimization/trends")
async def get_cost_trends(
    days: int = 30,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Get cost trend analysis over specified period"""
    return await cost_optimization.get_cost_trends(days=days)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)