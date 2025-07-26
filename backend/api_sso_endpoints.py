"""
OpsSight SSO API Endpoints - v2.0.0
REST API endpoints for SSO authentication and management

Features:
- SSO provider discovery and configuration
- Authentication flow initiation
- Callback handling for OIDC and SAML
- Token validation and refresh
- User profile synchronization
- Admin endpoints for SSO management
"""

from fastapi import APIRouter, Request, Response, Depends, HTTPException, Form
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

from pydantic import BaseModel, EmailStr
from sso_integration import sso_manager, get_current_user
from database import User, UserRole

# Configure logging
logger = logging.getLogger(__name__)

# Create router
sso_router = APIRouter(prefix="/auth/sso", tags=["SSO Authentication"])

# Pydantic models for request/response
class SSOProviderInfo(BaseModel):
    """SSO provider information"""
    name: str
    type: str  # 'oidc' or 'saml'
    enabled: bool
    display_name: Optional[str] = None
    icon_url: Optional[str] = None

class SSOInitiateRequest(BaseModel):
    """SSO login initiation request"""
    provider: str
    organization: str
    redirect_url: Optional[str] = None

class SSOInitiateResponse(BaseModel):
    """SSO login initiation response"""
    authorization_url: str
    state: str
    provider: str

class SSOCallbackResponse(BaseModel):
    """SSO callback response"""
    access_token: str
    token_type: str
    expires_in: int
    user: Dict[str, Any]
    sso_provider: str

class TokenValidationResponse(BaseModel):
    """Token validation response"""
    valid: bool
    user: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None

class UserProfileResponse(BaseModel):
    """User profile response"""
    id: str
    username: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    organization: str
    sso_provider: Optional[str]
    sso_enabled: bool
    last_login_at: Optional[datetime]
    preferences: Dict[str, Any]

# Public endpoints (no authentication required)

@sso_router.get("/providers", response_model=List[SSOProviderInfo])
async def list_sso_providers() -> List[SSOProviderInfo]:
    """
    List available SSO providers
    
    Returns:
        List of available SSO providers with their configuration
    """
    try:
        providers = sso_manager.list_providers()
        
        # Add display information for each provider
        provider_info = []
        for provider in providers:
            display_names = {
                'azure_ad': 'Microsoft Azure AD',
                'google': 'Google Workspace',
                'okta': 'Okta',
                'adfs': 'Active Directory Federation Services',
                'auth0': 'Auth0',
                'onelogin': 'OneLogin'
            }
            
            icon_urls = {
                'azure_ad': '/icons/providers/microsoft.svg',
                'google': '/icons/providers/google.svg',
                'okta': '/icons/providers/okta.svg',
                'adfs': '/icons/providers/microsoft.svg',
                'auth0': '/icons/providers/auth0.svg',
                'onelogin': '/icons/providers/onelogin.svg'
            }
            
            provider_info.append(SSOProviderInfo(
                name=provider['name'],
                type=provider['type'],
                enabled=provider['enabled'],
                display_name=display_names.get(provider['name'], provider['name'].title()),
                icon_url=icon_urls.get(provider['name'])
            ))
        
        logger.info(f"Listed {len(provider_info)} SSO providers")
        return provider_info
        
    except Exception as e:
        logger.error(f"Failed to list SSO providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve SSO providers")

@sso_router.post("/login", response_model=SSOInitiateResponse)
async def initiate_sso_login(
    request: Request,
    sso_request: SSOInitiateRequest
) -> SSOInitiateResponse:
    """
    Initiate SSO login flow
    
    Args:
        sso_request: SSO login request with provider and organization
        
    Returns:
        Authorization URL and state for SSO login
    """
    try:
        # Validate provider exists
        provider = sso_manager.get_provider(sso_request.provider)
        if not provider:
            raise HTTPException(
                status_code=404, 
                detail=f"SSO provider '{sso_request.provider}' not found or not enabled"
            )
        
        # Initiate SSO login
        login_data = await sso_manager.initiate_sso_login(
            sso_request.provider,
            sso_request.organization,
            request
        )
        
        logger.info(f"Initiated SSO login for {sso_request.provider} - org: {sso_request.organization}")
        
        return SSOInitiateResponse(
            authorization_url=login_data['authorization_url'],
            state=login_data['state'],
            provider=login_data['provider']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to initiate SSO login: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate SSO login")

@sso_router.get("/{provider}/callback")
@sso_router.post("/{provider}/callback")
async def handle_sso_callback(
    provider: str,
    request: Request,
    response: Response,
    # OIDC parameters
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    error_description: Optional[str] = None,
    # SAML parameters
    SAMLResponse: Optional[str] = Form(None),
    RelayState: Optional[str] = Form(None)
) -> SSOCallbackResponse:
    """
    Handle SSO callback from identity provider
    
    Supports both OIDC (GET) and SAML (POST) callbacks
    
    Args:
        provider: SSO provider name
        request: FastAPI request object
        Various callback parameters depending on provider type
        
    Returns:
        Authentication result with access token and user information
    """
    try:
        # Handle OIDC errors
        if error:
            logger.warning(f"SSO callback error for {provider}: {error} - {error_description}")
            raise HTTPException(
                status_code=400, 
                detail=f"SSO authentication failed: {error_description or error}"
            )
        
        # Validate provider exists
        if not sso_manager.get_provider(provider):
            raise HTTPException(status_code=404, detail=f"SSO provider '{provider}' not found")
        
        # Process callback
        auth_result = await sso_manager.handle_sso_callback(provider, request)
        
        # Set secure HTTP-only cookie for token (optional)
        response.set_cookie(
            key="access_token",
            value=auth_result['access_token'],
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=24 * 3600  # 24 hours
        )
        
        logger.info(f"SSO authentication successful for {provider} - user: {auth_result['user']['email']}")
        
        return SSOCallbackResponse(
            access_token=auth_result['access_token'],
            token_type=auth_result['token_type'],
            expires_in=24 * 3600,  # 24 hours in seconds
            user=auth_result['user'],
            sso_provider=auth_result['sso_provider']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSO callback failed for {provider}: {e}")
        raise HTTPException(status_code=500, detail="SSO authentication failed")

@sso_router.post("/validate", response_model=TokenValidationResponse)
async def validate_token(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> TokenValidationResponse:
    """
    Validate JWT token
    
    Args:
        credentials: Bearer token from Authorization header
        
    Returns:
        Token validation result with user information
    """
    try:
        # Validate token
        payload = await sso_manager.validate_jwt_token(credentials.credentials)
        
        # Get user information
        user_data = {
            'id': payload.get('user_id'),
            'username': payload.get('username'),
            'email': payload.get('email'),
            'role': payload.get('role'),
            'organization': payload.get('org_slug'),
            'sso_provider': payload.get('sso_provider')
        }
        
        expires_at = datetime.fromtimestamp(payload.get('exp')) if payload.get('exp') else None
        
        return TokenValidationResponse(
            valid=True,
            user=user_data,
            expires_at=expires_at
        )
        
    except HTTPException as e:
        return TokenValidationResponse(valid=False)
    except Exception as e:
        logger.error(f"Token validation failed: {e}")
        return TokenValidationResponse(valid=False)

# Protected endpoints (authentication required)

@sso_router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
) -> UserProfileResponse:
    """
    Get current user profile
    
    Args:
        current_user: Authenticated user from JWT token
        
    Returns:
        User profile information
    """
    try:
        return UserProfileResponse(
            id=str(current_user.id),
            username=current_user.username,
            email=current_user.email,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            role=current_user.role.value,
            organization=current_user.organization.name,
            sso_provider=current_user.sso_provider,
            sso_enabled=bool(current_user.sso_provider),
            last_login_at=current_user.last_login_at,
            preferences=current_user.preferences or {}
        )
        
    except Exception as e:
        logger.error(f"Failed to get user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile")

@sso_router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Logout user and invalidate token
    
    Args:
        response: FastAPI response object
        current_user: Authenticated user
        
    Returns:
        Logout confirmation
    """
    try:
        # Clear cookie
        response.delete_cookie(key="access_token")
        
        # Log logout event
        from sso_integration import audit_log_repository
        
        audit_data = {
            'organization_id': current_user.organization_id,
            'user_id': current_user.id,
            'event_type': 'logout',
            'resource_type': 'authentication',
            'action': 'User logout',
            'description': f"User {current_user.username} logged out"
        }
        
        await audit_log_repository.create(audit_data)
        
        logger.info(f"User logout: {current_user.username}")
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")

@sso_router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Refresh JWT token
    
    Args:
        current_user: Authenticated user
        
    Returns:
        New access token
    """
    try:
        # Generate new token
        new_token = sso_manager._generate_jwt_token(current_user)
        
        logger.info(f"Token refreshed for user: {current_user.username}")
        
        return {
            "access_token": new_token,
            "token_type": "bearer",
            "expires_in": 24 * 3600  # 24 hours
        }
        
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(status_code=500, detail="Token refresh failed")

# Admin endpoints (admin role required)

@sso_router.get("/admin/users", response_model=List[UserProfileResponse])
async def list_sso_users(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
) -> List[UserProfileResponse]:
    """
    List all SSO users (admin only)
    
    Args:
        current_user: Authenticated admin user
        skip: Number of records to skip
        limit: Maximum number of records to return
        
    Returns:
        List of SSO users
    """
    # Check admin permissions
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        from services.data_access import AsyncSessionLocal
        from sqlalchemy.sql import select
        
        async with AsyncSessionLocal() as session:
            # Get users in the same organization
            query = select(User).where(
                and_(
                    User.organization_id == current_user.organization_id,
                    User.sso_provider.isnot(None)
                )
            ).offset(skip).limit(limit)
            
            result = await session.execute(query)
            users = result.scalars().all()
            
            user_profiles = []
            for user in users:
                user_profiles.append(UserProfileResponse(
                    id=str(user.id),
                    username=user.username,
                    email=user.email,
                    first_name=user.first_name,
                    last_name=user.last_name,
                    role=user.role.value,
                    organization=current_user.organization.name,
                    sso_provider=user.sso_provider,
                    sso_enabled=True,
                    last_login_at=user.last_login_at,
                    preferences=user.preferences or {}
                ))
            
            logger.info(f"Listed {len(user_profiles)} SSO users for admin: {current_user.username}")
            return user_profiles
        
    except Exception as e:
        logger.error(f"Failed to list SSO users: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve SSO users")

@sso_router.get("/admin/config", response_model=Dict[str, Any])
async def get_sso_configuration(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get SSO configuration (admin only)
    
    Args:
        current_user: Authenticated admin user
        
    Returns:
        SSO configuration details
    """
    # Check admin permissions
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        providers = sso_manager.list_providers()
        
        # Get provider statistics
        from services.data_access import AsyncSessionLocal
        from sqlalchemy.sql import select, func
        
        async with AsyncSessionLocal() as session:
            # Count SSO users by provider
            sso_stats_query = select(
                User.sso_provider,
                func.count(User.id).label('user_count')
            ).where(
                and_(
                    User.organization_id == current_user.organization_id,
                    User.sso_provider.isnot(None)
                )
            ).group_by(User.sso_provider)
            
            result = await session.execute(sso_stats_query)
            provider_stats = {row.sso_provider: row.user_count for row in result.fetchall()}
            
            # Total SSO users
            total_sso_users = await session.execute(
                select(func.count(User.id)).where(
                    and_(
                        User.organization_id == current_user.organization_id,
                        User.sso_provider.isnot(None)
                    )
                )
            )
            total_sso_count = total_sso_users.scalar()
            
            config = {
                'providers': providers,
                'statistics': {
                    'total_sso_users': total_sso_count,
                    'provider_usage': provider_stats,
                    'enabled_providers': len([p for p in providers if p['enabled']])
                },
                'security_settings': {
                    'jwt_expiration_hours': 24,
                    'session_timeout_hours': 8,
                    'max_login_attempts': 5
                }
            }
            
            logger.info(f"Retrieved SSO configuration for admin: {current_user.username}")
            return config
        
    except Exception as e:
        logger.error(f"Failed to get SSO configuration: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve SSO configuration")

# Health check endpoint
@sso_router.get("/health")
async def sso_health_check() -> Dict[str, Any]:
    """
    SSO service health check
    
    Returns:
        Health status of SSO service and providers
    """
    try:
        providers = sso_manager.list_providers()
        enabled_providers = [p for p in providers if p['enabled']]
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'providers': {
                'total': len(providers),
                'enabled': len(enabled_providers),
                'configured': [p['name'] for p in enabled_providers]
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"SSO health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

logger.info("SSO API endpoints initialized successfully")