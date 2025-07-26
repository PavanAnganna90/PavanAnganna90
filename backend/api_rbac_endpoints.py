"""
OpsSight RBAC API Endpoints - v2.0.0
FastAPI endpoints for advanced Role-Based Access Control management

Features:
- User permission management and role assignment
- Permission validation and audit trails
- Custom role creation and modification
- RBAC system monitoring and analytics
- Integration with SSO for enterprise authentication
"""

from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, List, Optional, Any, Union
import logging
from datetime import datetime, timedelta
import uuid

from pydantic import BaseModel, Field
from rbac_system import (
    rbac_manager, Permission, PermissionCategory, PermissionAction, 
    AccessContext, RoleDefinition, ROLE_DEFINITIONS, 
    require_permission, require_role, get_current_user_rbac
)
from database import User, UserRole
from sso_integration import get_current_user

# Configure logging
logger = logging.getLogger(__name__)

# Create router
rbac_router = APIRouter(prefix="/rbac", tags=["RBAC Management"])

# Pydantic models for request/response
class PermissionInfo(BaseModel):
    """Permission information model"""
    category: str
    action: str
    resource: Optional[str] = None
    description: Optional[str] = None

class PermissionRequest(BaseModel):
    """Permission check request"""
    permission: str
    resource_id: Optional[str] = None
    context_metadata: Dict[str, Any] = Field(default_factory=dict)

class PermissionResponse(BaseModel):
    """Permission check response"""
    granted: bool
    reason: str
    evaluation_time_ms: float
    cached: bool
    additional_info: Dict[str, Any] = Field(default_factory=dict)

class MultiplePermissionsRequest(BaseModel):
    """Multiple permissions check request"""
    permissions: List[str]
    require_all: bool = True
    resource_id: Optional[str] = None
    context_metadata: Dict[str, Any] = Field(default_factory=dict)

class UserPermissionsResponse(BaseModel):
    """User permissions response"""
    user_id: str
    username: str
    role: str
    permissions: List[str]
    effective_permissions: List[str]
    last_updated: datetime

class RoleInfo(BaseModel):
    """Role information model"""
    name: str
    display_name: str
    description: str
    permissions: List[str]
    inherits_from: Optional[str] = None
    is_system_role: bool
    is_active: bool

class GrantPermissionRequest(BaseModel):
    """Grant permission request"""
    user_id: str
    permission: str
    expires_at: Optional[datetime] = None
    reason: Optional[str] = None

class RevokePermissionRequest(BaseModel):
    """Revoke permission request"""
    user_id: str
    permission: str
    reason: Optional[str] = None

class RBACStatsResponse(BaseModel):
    """RBAC system statistics"""
    cache_stats: Dict[str, Any]
    permission_checks_24h: int
    active_users: int
    role_distribution: Dict[str, int]
    recent_permission_changes: List[Dict[str, Any]]

class AuditLogEntry(BaseModel):
    """RBAC audit log entry"""
    id: str
    timestamp: datetime
    user_id: str
    username: str
    action: str
    resource: str
    result: str
    ip_address: Optional[str]
    metadata: Dict[str, Any]

# Public endpoints (authentication required)

@rbac_router.get("/permissions/check", response_model=PermissionResponse)
async def check_permission(
    permission: str = Query(..., description="Permission string to check (e.g., 'service:read')"),
    resource_id: Optional[str] = Query(None, description="Specific resource ID"),
    request: Request = None,
    current_user: User = Depends(get_current_user)
) -> PermissionResponse:
    """
    Check if current user has specific permission
    
    Args:
        permission: Permission string in format 'category:action' or 'category:action:resource'
        resource_id: Optional specific resource ID
        current_user: Authenticated user
        
    Returns:
        Permission check result with evaluation details
    """
    try:
        # Parse permission
        perm_obj = Permission.from_string(permission)
        if resource_id:
            perm_obj.resource = resource_id
        
        # Create access context
        context = AccessContext(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get('user-agent') if request else None
        )
        
        # Check permission
        result = await rbac_manager.check_permission(current_user, perm_obj, context)
        
        return PermissionResponse(
            granted=result.granted,
            reason=result.reason,
            evaluation_time_ms=result.evaluation_time_ms,
            cached=result.cached,
            additional_info={
                'permissions_checked': result.permissions_checked,
                'user_role': current_user.role.value
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid permission format: {e}")
    except Exception as e:
        logger.error(f"Permission check failed: {e}")
        raise HTTPException(status_code=500, detail="Permission check failed")

@rbac_router.post("/permissions/check-multiple", response_model=PermissionResponse)
async def check_multiple_permissions(
    request_data: MultiplePermissionsRequest,
    request: Request = None,
    current_user: User = Depends(get_current_user)
) -> PermissionResponse:
    """
    Check multiple permissions with AND or OR logic
    
    Args:
        request_data: Multiple permissions check request
        current_user: Authenticated user
        
    Returns:
        Combined permission check result
    """
    try:
        # Parse permissions
        perm_objects = []
        for perm_str in request_data.permissions:
            perm_obj = Permission.from_string(perm_str)
            if request_data.resource_id:
                perm_obj.resource = request_data.resource_id
            perm_objects.append(perm_obj)
        
        # Create access context
        context = AccessContext(
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            ip_address=request.client.host if request else None,
            user_agent=request.headers.get('user-agent') if request else None,
            resource_metadata=request_data.context_metadata
        )
        
        # Check multiple permissions
        result = await rbac_manager.check_multiple_permissions(
            current_user, perm_objects, context, request_data.require_all
        )
        
        return PermissionResponse(
            granted=result.granted,
            reason=result.reason,
            evaluation_time_ms=result.evaluation_time_ms,
            cached=result.cached,
            additional_info={
                'permissions_checked': result.permissions_checked,
                'require_all': request_data.require_all,
                'user_role': current_user.role.value
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid permission format: {e}")
    except Exception as e:
        logger.error(f"Multiple permissions check failed: {e}")
        raise HTTPException(status_code=500, detail="Multiple permissions check failed")

@rbac_router.get("/permissions/my-permissions", response_model=UserPermissionsResponse)
async def get_my_permissions(
    current_user: User = Depends(get_current_user)
) -> UserPermissionsResponse:
    """
    Get current user's permissions
    
    Args:
        current_user: Authenticated user
        
    Returns:
        User's role and permission details
    """
    try:
        # Get user permissions
        user_permissions = await rbac_manager.get_user_permissions(current_user)
        
        # Get role definition
        role_def = ROLE_DEFINITIONS.get(current_user.role)
        role_permissions = []
        if role_def:
            role_permissions = [str(perm) for perm in role_def.permissions]
        
        return UserPermissionsResponse(
            user_id=str(current_user.id),
            username=current_user.username,
            role=current_user.role.value,
            permissions=current_user.permissions or [],
            effective_permissions=user_permissions,
            last_updated=current_user.updated_at or current_user.created_at
        )
        
    except Exception as e:
        logger.error(f"Failed to get user permissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user permissions")

@rbac_router.get("/roles", response_model=List[RoleInfo])
async def list_roles(
    current_user: User = Depends(get_current_user)
) -> List[RoleInfo]:
    """
    List available roles and their permissions
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of available roles with their permission details
    """
    try:
        roles = []
        for role_enum, role_def in ROLE_DEFINITIONS.items():
            roles.append(RoleInfo(
                name=role_def.name,
                display_name=role_def.display_name,
                description=role_def.description,
                permissions=[str(perm) for perm in role_def.permissions],
                inherits_from=role_def.inherits_from,
                is_system_role=role_def.is_system_role,
                is_active=role_def.is_active
            ))
        
        logger.info(f"Listed {len(roles)} roles for user: {current_user.username}")
        return roles
        
    except Exception as e:
        logger.error(f"Failed to list roles: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve roles")

@rbac_router.get("/permissions", response_model=List[PermissionInfo])
async def list_permissions(
    category: Optional[str] = Query(None, description="Filter by permission category"),
    current_user: User = Depends(get_current_user)
) -> List[PermissionInfo]:
    """
    List available permissions
    
    Args:
        category: Optional permission category filter
        current_user: Authenticated user
        
    Returns:
        List of available permissions
    """
    try:
        permissions = []
        
        # Permission descriptions for documentation
        permission_descriptions = {
            'system:admin': 'Full system administration access',
            'organization:manage': 'Manage organization settings and users',
            'user:manage': 'Create, update, and delete users',
            'service:read': 'View service information and status',
            'service:manage': 'Manage services and configurations',
            'alert:read': 'View alerts and notifications',
            'alert:manage': 'Manage alerts and alert rules',
            'deployment:read': 'View deployment information',
            'deployment:execute': 'Execute deployments',
            'metric:read': 'View metrics and monitoring data',
            'audit:read': 'View audit logs and reports',
            'security:manage': 'Manage security settings',
            'cost:read': 'View cost and billing information',
            'collaboration:read': 'View team collaboration features',
            'integration:manage': 'Manage external integrations',
            'reporting:create': 'Create and generate reports'
        }
        
        # Build permission list from categories and actions
        for perm_category in PermissionCategory:
            if category and perm_category.value != category:
                continue
                
            for perm_action in PermissionAction:
                perm_string = f"{perm_category.value}:{perm_action.value}"
                description = permission_descriptions.get(perm_string, 
                    f"{perm_action.value.title()} access to {perm_category.value} resources")
                
                permissions.append(PermissionInfo(
                    category=perm_category.value,
                    action=perm_action.value,
                    description=description
                ))
        
        logger.info(f"Listed {len(permissions)} permissions for user: {current_user.username}")
        return permissions
        
    except Exception as e:
        logger.error(f"Failed to list permissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve permissions")

# Admin endpoints (admin role required)

@rbac_router.post("/admin/permissions/grant")
@require_role(UserRole.ADMIN)
async def grant_permission(
    request_data: GrantPermissionRequest,
    request: Request = None,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Grant additional permission to user (admin only)
    
    Args:
        request_data: Permission grant request
        current_user: Authenticated admin user
        
    Returns:
        Grant operation result
    """
    try:
        # Get target user
        from services.data_access import user_repository
        target_user = await user_repository.get_by_id(request_data.user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify same organization
        if target_user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from different organization")
        
        # Parse permission
        perm_obj = Permission.from_string(request_data.permission)
        
        # Grant permission
        await rbac_manager.grant_permission(
            target_user, perm_obj, current_user, request_data.expires_at
        )
        
        logger.info(f"Admin {current_user.username} granted permission {request_data.permission} to {target_user.username}")
        
        return {
            "message": f"Permission '{request_data.permission}' granted to user '{target_user.username}'",
            "granted_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid permission format: {e}")
    except Exception as e:
        logger.error(f"Failed to grant permission: {e}")
        raise HTTPException(status_code=500, detail="Failed to grant permission")

@rbac_router.post("/admin/permissions/revoke")
@require_role(UserRole.ADMIN)
async def revoke_permission(
    request_data: RevokePermissionRequest,
    request: Request = None,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Revoke permission from user (admin only)
    
    Args:
        request_data: Permission revoke request
        current_user: Authenticated admin user
        
    Returns:
        Revoke operation result
    """
    try:
        # Get target user
        from services.data_access import user_repository
        target_user = await user_repository.get_by_id(request_data.user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify same organization
        if target_user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from different organization")
        
        # Parse permission
        perm_obj = Permission.from_string(request_data.permission)
        
        # Revoke permission
        await rbac_manager.revoke_permission(target_user, perm_obj, current_user)
        
        logger.info(f"Admin {current_user.username} revoked permission {request_data.permission} from {target_user.username}")
        
        return {
            "message": f"Permission '{request_data.permission}' revoked from user '{target_user.username}'",
            "revoked_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid permission format: {e}")
    except Exception as e:
        logger.error(f"Failed to revoke permission: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke permission")

@rbac_router.get("/admin/users/{user_id}/permissions", response_model=UserPermissionsResponse)
@require_role(UserRole.ADMIN)
async def get_user_permissions(
    user_id: str,
    current_user: User = Depends(get_current_user)
) -> UserPermissionsResponse:
    """
    Get specific user's permissions (admin only)
    
    Args:
        user_id: Target user ID
        current_user: Authenticated admin user
        
    Returns:
        User's permission details
    """
    try:
        # Get target user
        from services.data_access import user_repository
        target_user = await user_repository.get_by_id(user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify same organization
        if target_user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot view users from different organization")
        
        # Get user permissions
        user_permissions = await rbac_manager.get_user_permissions(target_user)
        
        return UserPermissionsResponse(
            user_id=str(target_user.id),
            username=target_user.username,
            role=target_user.role.value,
            permissions=target_user.permissions or [],
            effective_permissions=user_permissions,
            last_updated=target_user.updated_at or target_user.created_at
        )
        
    except Exception as e:
        logger.error(f"Failed to get user permissions: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user permissions")

@rbac_router.get("/admin/stats", response_model=RBACStatsResponse)
@require_role(UserRole.ADMIN)
async def get_rbac_stats(
    current_user: User = Depends(get_current_user)
) -> RBACStatsResponse:
    """
    Get RBAC system statistics (admin only)
    
    Args:
        current_user: Authenticated admin user
        
    Returns:
        RBAC system statistics and metrics
    """
    try:
        # Get cache statistics
        cache_stats = rbac_manager.get_cache_stats()
        
        # Get user statistics
        from services.data_access import AsyncSessionLocal
        from sqlalchemy.sql import select, func
        
        async with AsyncSessionLocal() as session:
            # Count active users in organization
            active_users_query = select(func.count(User.id)).where(
                and_(
                    User.organization_id == current_user.organization_id,
                    User.is_active == True
                )
            )
            active_users_result = await session.execute(active_users_query)
            active_users = active_users_result.scalar()
            
            # Role distribution
            role_dist_query = select(
                User.role,
                func.count(User.id).label('count')
            ).where(
                User.organization_id == current_user.organization_id
            ).group_by(User.role)
            
            role_dist_result = await session.execute(role_dist_query)
            role_distribution = {
                row.role.value: row.count 
                for row in role_dist_result.fetchall()
            }
            
            # Recent permission changes (from audit logs)
            from database import AuditLog
            recent_changes_query = select(AuditLog).where(
                and_(
                    AuditLog.organization_id == current_user.organization_id,
                    AuditLog.event_type == 'authorization_check',
                    AuditLog.created_at >= datetime.utcnow() - timedelta(hours=24)
                )
            ).order_by(AuditLog.created_at.desc()).limit(10)
            
            recent_changes_result = await session.execute(recent_changes_query)
            recent_changes = []
            
            for audit_log in recent_changes_result.scalars():
                recent_changes.append({
                    'timestamp': audit_log.created_at.isoformat(),
                    'user_id': str(audit_log.user_id),
                    'action': audit_log.action,
                    'resource': audit_log.resource_id,
                    'granted': audit_log.metadata.get('granted', False) if audit_log.metadata else False
                })
        
        # Count permission checks in last 24h (estimate from cache stats)
        permission_checks_24h = cache_stats.get('hit_count', 0) + cache_stats.get('miss_count', 0)
        
        return RBACStatsResponse(
            cache_stats=cache_stats,
            permission_checks_24h=permission_checks_24h,
            active_users=active_users,
            role_distribution=role_distribution,
            recent_permission_changes=recent_changes
        )
        
    except Exception as e:
        logger.error(f"Failed to get RBAC stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve RBAC statistics")

@rbac_router.post("/admin/cache/clear")
@require_role(UserRole.ADMIN)
async def clear_permission_cache(
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Clear permission cache (admin only)
    
    Args:
        current_user: Authenticated admin user
        
    Returns:
        Cache clear operation result
    """
    try:
        # Clear cache
        rbac_manager.clear_cache()
        
        logger.info(f"Admin {current_user.username} cleared RBAC permission cache")
        
        return {
            "message": "Permission cache cleared successfully",
            "cleared_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear permission cache")

# Health check endpoint
@rbac_router.get("/health")
async def rbac_health_check() -> Dict[str, Any]:
    """
    RBAC service health check
    
    Returns:
        Health status of RBAC service
    """
    try:
        cache_stats = rbac_manager.get_cache_stats()
        
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'cache': {
                'entries': cache_stats.get('entries', 0),
                'hit_rate_percent': cache_stats.get('hit_rate_percent', 0),
                'ttl_seconds': cache_stats.get('ttl_seconds', 300)
            },
            'roles': {
                'system_roles': len([r for r in ROLE_DEFINITIONS.values() if r.is_system_role]),
                'total_roles': len(ROLE_DEFINITIONS)
            },
            'permissions': {
                'categories': len(PermissionCategory),
                'actions': len(PermissionAction)
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"RBAC health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

logger.info("RBAC API endpoints initialized successfully")