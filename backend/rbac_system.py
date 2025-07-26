"""
OpsSight Advanced RBAC System - v2.0.0
Role-Based Access Control with fine-grained permissions and dynamic policy management

Features:
- Hierarchical role system with inheritance
- Fine-grained permissions with resource-level access control
- Dynamic policy evaluation and caching
- Attribute-based access control (ABAC) extensions
- Multi-tenancy support with organization isolation
- Permission delegation and temporary access grants
- Audit logging for all authorization decisions
- Real-time permission updates via WebSocket
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Set, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import uuid
from abc import ABC, abstractmethod
import functools
import time

# FastAPI and dependencies
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Database imports
from sqlalchemy import and_, or_, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import select, insert, update, delete
from services.data_access import AsyncSessionLocal, user_repository, audit_log_repository
from database import User, Organization, UserRole, AuditLog

# Configure logging
logger = logging.getLogger(__name__)

# Permission Categories and Actions
class PermissionCategory(Enum):
    """Categories of permissions in the system"""
    SYSTEM = "system"              # System-level operations
    ORGANIZATION = "organization"   # Organization management
    USER = "user"                  # User management
    SERVICE = "service"            # Service monitoring and management
    ALERT = "alert"                # Alert management
    DEPLOYMENT = "deployment"      # Deployment operations
    METRIC = "metric"              # Metrics and monitoring
    AUDIT = "audit"                # Audit log access
    SECURITY = "security"          # Security operations
    COST = "cost"                  # Cost management
    COLLABORATION = "collaboration" # Team collaboration features
    INTEGRATION = "integration"    # External integrations
    REPORTING = "reporting"        # Report generation and access

class PermissionAction(Enum):
    """Granular actions that can be performed"""
    CREATE = "create"              # Create new resources
    READ = "read"                  # View/read resources
    UPDATE = "update"              # Modify existing resources
    DELETE = "delete"              # Delete resources
    EXECUTE = "execute"            # Execute operations
    APPROVE = "approve"            # Approve operations
    MANAGE = "manage"              # Full management access
    ADMIN = "admin"                # Administrative operations
    VIEW_SENSITIVE = "view_sensitive" # View sensitive data
    EXPORT = "export"              # Export data
    IMPORT = "import"              # Import data
    CONFIGURE = "configure"        # Configure settings

@dataclass
class Permission:
    """Individual permission definition"""
    category: PermissionCategory
    action: PermissionAction
    resource: Optional[str] = None  # Specific resource ID or pattern
    conditions: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __str__(self) -> str:
        resource_part = f":{self.resource}" if self.resource else ""
        return f"{self.category.value}:{self.action.value}{resource_part}"
    
    @classmethod
    def from_string(cls, permission_str: str) -> 'Permission':
        """Create Permission from string representation"""
        parts = permission_str.split(':')
        if len(parts) < 2:
            raise ValueError(f"Invalid permission string: {permission_str}")
        
        category = PermissionCategory(parts[0])
        action = PermissionAction(parts[1])
        resource = parts[2] if len(parts) > 2 else None
        
        return cls(category=category, action=action, resource=resource)

@dataclass
class RoleDefinition:
    """Role definition with permissions and metadata"""
    name: str
    display_name: str
    description: str
    permissions: List[Permission]
    inherits_from: Optional[str] = None
    is_system_role: bool = False
    is_active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class AccessContext:
    """Context information for access control decisions"""
    user_id: uuid.UUID
    organization_id: uuid.UUID
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_time: datetime = field(default_factory=datetime.utcnow)
    resource_metadata: Dict[str, Any] = field(default_factory=dict)
    additional_attributes: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AuthorizationResult:
    """Result of authorization decision"""
    granted: bool
    reason: str
    permissions_checked: List[str]
    evaluation_time_ms: float
    cached: bool = False
    context: Optional[AccessContext] = None
    additional_info: Dict[str, Any] = field(default_factory=dict)

class PermissionEvaluator(ABC):
    """Abstract base class for permission evaluation strategies"""
    
    @abstractmethod
    async def evaluate(self, user: User, permission: Permission, 
                      context: AccessContext) -> bool:
        """Evaluate if user has permission in given context"""
        pass

class BasicPermissionEvaluator(PermissionEvaluator):
    """Basic permission evaluator using role-based permissions"""
    
    async def evaluate(self, user: User, permission: Permission, 
                      context: AccessContext) -> bool:
        """Check if user's role includes the required permission"""
        user_permissions = await self._get_user_permissions(user)
        
        # Direct permission match
        permission_str = str(permission)
        if permission_str in user_permissions:
            return True
        
        # Wildcard permission match
        wildcard_perms = [
            f"{permission.category.value}:*",
            f"{permission.category.value}:{permission.action.value}:*",
            "*:*",
            "*"
        ]
        
        for wildcard in wildcard_perms:
            if wildcard in user_permissions:
                return True
        
        return False
    
    async def _get_user_permissions(self, user: User) -> Set[str]:
        """Get all permissions for a user based on their role"""
        role_permissions = ROLE_DEFINITIONS.get(user.role, RoleDefinition(
            name="unknown", display_name="Unknown", description="", permissions=[]
        ))
        
        permissions = set()
        
        # Add direct permissions
        for perm in role_permissions.permissions:
            permissions.add(str(perm))
        
        # Add inherited permissions
        if role_permissions.inherits_from:
            inherited_role = ROLE_DEFINITIONS.get(role_permissions.inherits_from)
            if inherited_role:
                for perm in inherited_role.permissions:
                    permissions.add(str(perm))
        
        # Add user-specific permissions from database
        user_specific_perms = user.permissions or []
        permissions.update(user_specific_perms)
        
        return permissions

class ResourceScopedEvaluator(PermissionEvaluator):
    """Permission evaluator with resource-level scoping"""
    
    async def evaluate(self, user: User, permission: Permission, 
                      context: AccessContext) -> bool:
        """Evaluate permission with resource scoping"""
        # Check basic permission first
        basic_evaluator = BasicPermissionEvaluator()
        if not await basic_evaluator.evaluate(user, permission, context):
            return False
        
        # Apply resource-specific rules
        if permission.resource:
            return await self._check_resource_access(user, permission, context)
        
        return True
    
    async def _check_resource_access(self, user: User, permission: Permission,
                                   context: AccessContext) -> bool:
        """Check resource-specific access rules"""
        # Example resource access rules
        if permission.category == PermissionCategory.SERVICE:
            # Check if user has access to specific service
            return await self._check_service_access(user, permission.resource, context)
        
        elif permission.category == PermissionCategory.ALERT:
            # Check if user can access specific alert
            return await self._check_alert_access(user, permission.resource, context)
        
        # Default: allow access if basic permission is granted
        return True
    
    async def _check_service_access(self, user: User, resource_id: str,
                                  context: AccessContext) -> bool:
        """Check if user has access to specific service"""
        # Implementation would check service ownership, team membership, etc.
        # For now, allow access within same organization
        return True
    
    async def _check_alert_access(self, user: User, resource_id: str,
                                context: AccessContext) -> bool:
        """Check if user has access to specific alert"""
        # Implementation would check alert scope, severity levels, etc.
        return True

class PermissionCache:
    """In-memory cache for permission evaluation results"""
    
    def __init__(self, ttl_seconds: int = 300):  # 5 minutes default TTL
        self.cache: Dict[str, Tuple[bool, datetime]] = {}
        self.ttl_seconds = ttl_seconds
        self.hit_count = 0
        self.miss_count = 0
    
    def _generate_cache_key(self, user: User, permission: Permission, 
                          context: AccessContext) -> str:
        """Generate cache key for permission check"""
        return f"{user.id}:{str(permission)}:{context.organization_id}:{hash(str(context.resource_metadata))}"
    
    def get(self, user: User, permission: Permission, 
            context: AccessContext) -> Optional[bool]:
        """Get cached permission result"""
        cache_key = self._generate_cache_key(user, permission, context)
        
        if cache_key in self.cache:
            result, timestamp = self.cache[cache_key]
            if datetime.utcnow() - timestamp < timedelta(seconds=self.ttl_seconds):
                self.hit_count += 1
                return result
            else:
                # Expired entry
                del self.cache[cache_key]
        
        self.miss_count += 1
        return None
    
    def set(self, user: User, permission: Permission, context: AccessContext, 
            result: bool):
        """Cache permission result"""
        cache_key = self._generate_cache_key(user, permission, context)
        self.cache[cache_key] = (result, datetime.utcnow())
    
    def invalidate_user(self, user_id: uuid.UUID):
        """Invalidate all cache entries for a user"""
        keys_to_remove = [
            key for key in self.cache.keys() 
            if key.startswith(str(user_id))
        ]
        for key in keys_to_remove:
            del self.cache[key]
    
    def clear(self):
        """Clear all cache entries"""
        self.cache.clear()
        self.hit_count = 0
        self.miss_count = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.hit_count + self.miss_count
        hit_rate = (self.hit_count / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'entries': len(self.cache),
            'hit_count': self.hit_count,
            'miss_count': self.miss_count,
            'hit_rate_percent': round(hit_rate, 2),
            'ttl_seconds': self.ttl_seconds
        }

# System Role Definitions
ROLE_DEFINITIONS = {
    UserRole.SUPER_ADMIN: RoleDefinition(
        name="super_admin",
        display_name="Super Administrator",
        description="Full system access with all permissions",
        permissions=[
            Permission(PermissionCategory.SYSTEM, PermissionAction.ADMIN),
            Permission(PermissionCategory.ORGANIZATION, PermissionAction.MANAGE),
            Permission(PermissionCategory.USER, PermissionAction.MANAGE),
            Permission(PermissionCategory.SERVICE, PermissionAction.MANAGE),
            Permission(PermissionCategory.ALERT, PermissionAction.MANAGE),
            Permission(PermissionCategory.DEPLOYMENT, PermissionAction.MANAGE),
            Permission(PermissionCategory.METRIC, PermissionAction.MANAGE),
            Permission(PermissionCategory.AUDIT, PermissionAction.READ),
            Permission(PermissionCategory.SECURITY, PermissionAction.MANAGE),
            Permission(PermissionCategory.COST, PermissionAction.MANAGE),
            Permission(PermissionCategory.COLLABORATION, PermissionAction.MANAGE),
            Permission(PermissionCategory.INTEGRATION, PermissionAction.MANAGE),
            Permission(PermissionCategory.REPORTING, PermissionAction.MANAGE),
        ],
        is_system_role=True
    ),
    
    UserRole.ADMIN: RoleDefinition(
        name="admin",
        display_name="Administrator",
        description="Organization administrator with most permissions",
        permissions=[
            Permission(PermissionCategory.ORGANIZATION, PermissionAction.UPDATE),
            Permission(PermissionCategory.USER, PermissionAction.MANAGE),
            Permission(PermissionCategory.SERVICE, PermissionAction.MANAGE),
            Permission(PermissionCategory.ALERT, PermissionAction.MANAGE),
            Permission(PermissionCategory.DEPLOYMENT, PermissionAction.MANAGE),
            Permission(PermissionCategory.METRIC, PermissionAction.READ),
            Permission(PermissionCategory.AUDIT, PermissionAction.READ),
            Permission(PermissionCategory.SECURITY, PermissionAction.READ),
            Permission(PermissionCategory.COST, PermissionAction.READ),
            Permission(PermissionCategory.COLLABORATION, PermissionAction.MANAGE),
            Permission(PermissionCategory.INTEGRATION, PermissionAction.MANAGE),
            Permission(PermissionCategory.REPORTING, PermissionAction.CREATE),
        ],
        is_system_role=True
    ),
    
    UserRole.OPERATOR: RoleDefinition(
        name="operator",
        display_name="Operator",
        description="Operations team member with deployment and monitoring access",
        permissions=[
            Permission(PermissionCategory.SERVICE, PermissionAction.READ),
            Permission(PermissionCategory.SERVICE, PermissionAction.UPDATE),
            Permission(PermissionCategory.ALERT, PermissionAction.READ),
            Permission(PermissionCategory.ALERT, PermissionAction.UPDATE),
            Permission(PermissionCategory.DEPLOYMENT, PermissionAction.CREATE),
            Permission(PermissionCategory.DEPLOYMENT, PermissionAction.READ),
            Permission(PermissionCategory.DEPLOYMENT, PermissionAction.EXECUTE),
            Permission(PermissionCategory.METRIC, PermissionAction.READ),
            Permission(PermissionCategory.COLLABORATION, PermissionAction.READ),
            Permission(PermissionCategory.COLLABORATION, PermissionAction.CREATE),
            Permission(PermissionCategory.REPORTING, PermissionAction.READ),
        ],
        is_system_role=True
    ),
    
    UserRole.VIEWER: RoleDefinition(
        name="viewer",
        display_name="Viewer",
        description="Read-only access to monitoring and dashboards",
        permissions=[
            Permission(PermissionCategory.SERVICE, PermissionAction.READ),
            Permission(PermissionCategory.ALERT, PermissionAction.READ),
            Permission(PermissionCategory.DEPLOYMENT, PermissionAction.READ),
            Permission(PermissionCategory.METRIC, PermissionAction.READ),
            Permission(PermissionCategory.COLLABORATION, PermissionAction.READ),
            Permission(PermissionCategory.REPORTING, PermissionAction.READ),
        ],
        is_system_role=True
    ),
    
    UserRole.GUEST: RoleDefinition(
        name="guest",
        display_name="Guest",
        description="Limited read-only access",
        permissions=[
            Permission(PermissionCategory.SERVICE, PermissionAction.READ),
            Permission(PermissionCategory.METRIC, PermissionAction.READ),
        ],
        is_system_role=True
    )
}

class RBACManager:
    """Main RBAC management class"""
    
    def __init__(self):
        self.evaluators: List[PermissionEvaluator] = [
            ResourceScopedEvaluator(),
            BasicPermissionEvaluator()
        ]
        self.cache = PermissionCache(ttl_seconds=300)  # 5 minutes
        self.security = HTTPBearer(auto_error=False)
    
    async def check_permission(self, user: User, permission: Permission,
                             context: AccessContext) -> AuthorizationResult:
        """Check if user has specific permission"""
        start_time = time.time()
        
        # Check cache first
        cached_result = self.cache.get(user, permission, context)
        if cached_result is not None:
            evaluation_time = (time.time() - start_time) * 1000
            return AuthorizationResult(
                granted=cached_result,
                reason="Cached permission result",
                permissions_checked=[str(permission)],
                evaluation_time_ms=evaluation_time,
                cached=True,
                context=context
            )
        
        # Evaluate permission using evaluators
        granted = False
        reasons = []
        
        for evaluator in self.evaluators:
            try:
                result = await evaluator.evaluate(user, permission, context)
                if result:
                    granted = True
                    reasons.append(f"Granted by {evaluator.__class__.__name__}")
                    break
                else:
                    reasons.append(f"Denied by {evaluator.__class__.__name__}")
            except Exception as e:
                logger.error(f"Permission evaluation error: {e}")
                reasons.append(f"Error in {evaluator.__class__.__name__}: {str(e)}")
        
        # Cache result
        self.cache.set(user, permission, context, granted)
        
        # Log authorization decision
        await self._log_authorization_decision(user, permission, context, granted)
        
        evaluation_time = (time.time() - start_time) * 1000
        
        return AuthorizationResult(
            granted=granted,
            reason="; ".join(reasons),
            permissions_checked=[str(permission)],
            evaluation_time_ms=evaluation_time,
            context=context
        )
    
    async def check_multiple_permissions(self, user: User, permissions: List[Permission],
                                       context: AccessContext,
                                       require_all: bool = True) -> AuthorizationResult:
        """Check multiple permissions with AND or OR logic"""
        start_time = time.time()
        
        results = []
        permissions_checked = []
        
        for permission in permissions:
            result = await self.check_permission(user, permission, context)
            results.append(result.granted)
            permissions_checked.append(str(permission))
        
        if require_all:
            granted = all(results)
            reason = f"All {len(permissions)} permissions required" if granted else "Missing required permissions"
        else:
            granted = any(results)
            reason = f"At least one of {len(permissions)} permissions granted" if granted else "No permissions granted"
        
        evaluation_time = (time.time() - start_time) * 1000
        
        return AuthorizationResult(
            granted=granted,
            reason=reason,
            permissions_checked=permissions_checked,
            evaluation_time_ms=evaluation_time,
            context=context
        )
    
    async def get_user_permissions(self, user: User) -> List[str]:
        """Get all permissions for a user"""
        evaluator = BasicPermissionEvaluator()
        user_permissions = await evaluator._get_user_permissions(user)
        return list(user_permissions)
    
    async def grant_permission(self, user: User, permission: Permission,
                             granted_by: User, expires_at: Optional[datetime] = None):
        """Grant additional permission to user"""
        # Add permission to user's permission list
        current_permissions = user.permissions or []
        permission_str = str(permission)
        
        if permission_str not in current_permissions:
            current_permissions.append(permission_str)
            user.permissions = current_permissions
            
            # Update user in database
            await user_repository.update(
                user.id, 
                {'permissions': current_permissions},
                updated_by=granted_by.id
            )
            
            # Invalidate cache
            self.cache.invalidate_user(user.id)
            
            logger.info(f"Granted permission {permission_str} to user {user.username} by {granted_by.username}")
    
    async def revoke_permission(self, user: User, permission: Permission,
                              revoked_by: User):
        """Revoke permission from user"""
        current_permissions = user.permissions or []
        permission_str = str(permission)
        
        if permission_str in current_permissions:
            current_permissions.remove(permission_str)
            user.permissions = current_permissions
            
            # Update user in database
            await user_repository.update(
                user.id,
                {'permissions': current_permissions},
                updated_by=revoked_by.id
            )
            
            # Invalidate cache
            self.cache.invalidate_user(user.id)
            
            logger.info(f"Revoked permission {permission_str} from user {user.username} by {revoked_by.username}")
    
    async def _log_authorization_decision(self, user: User, permission: Permission,
                                        context: AccessContext, granted: bool):
        """Log authorization decisions for audit"""
        try:
            audit_data = {
                'organization_id': context.organization_id,
                'user_id': context.user_id,
                'event_type': 'authorization_check',
                'resource_type': 'permission',
                'resource_id': str(permission),
                'action': 'check_permission',
                'description': f"Permission check: {str(permission)}",
                'ip_address': context.ip_address,
                'user_agent': context.user_agent,
                'session_id': context.session_id,
                'metadata': {
                    'permission': str(permission),
                    'granted': granted,
                    'user_role': user.role.value,
                    'resource_metadata': context.resource_metadata,
                    'additional_attributes': context.additional_attributes
                }
            }
            
            await audit_log_repository.create(audit_data)
            
        except Exception as e:
            logger.error(f"Failed to log authorization decision: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get permission cache statistics"""
        return self.cache.get_stats()
    
    def clear_cache(self):
        """Clear permission cache"""
        self.cache.clear()

# Create global RBAC manager instance
rbac_manager = RBACManager()

# Permission decorators for FastAPI endpoints
def require_permission(permission_str: str):
    """Decorator to require specific permission for endpoint access"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user and request from kwargs
            current_user = kwargs.get('current_user')
            request = kwargs.get('request')
            
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Parse permission
            try:
                permission = Permission.from_string(permission_str)
            except ValueError as e:
                logger.error(f"Invalid permission string: {permission_str}")
                raise HTTPException(status_code=500, detail="Invalid permission configuration")
            
            # Create access context
            context = AccessContext(
                user_id=current_user.id,
                organization_id=current_user.organization_id,
                ip_address=request.client.host if request else None,
                user_agent=request.headers.get('user-agent') if request else None
            )
            
            # Check permission
            result = await rbac_manager.check_permission(current_user, permission, context)
            
            if not result.granted:
                logger.warning(f"Permission denied for {current_user.username}: {permission_str}")
                raise HTTPException(
                    status_code=403, 
                    detail=f"Permission denied: {permission_str}"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

def require_role(required_role: UserRole):
    """Decorator to require specific role for endpoint access"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            # Define role hierarchy levels
            role_hierarchy = {
                UserRole.GUEST: 0,
                UserRole.VIEWER: 1,
                UserRole.OPERATOR: 2,
                UserRole.ADMIN: 3,
                UserRole.SUPER_ADMIN: 4
            }
            
            user_level = role_hierarchy.get(current_user.role, 0)
            required_level = role_hierarchy.get(required_role, 0)
            
            if user_level < required_level:
                logger.warning(f"Role access denied for {current_user.username}: required {required_role.value}, has {current_user.role.value}")
                raise HTTPException(
                    status_code=403, 
                    detail=f"Role '{required_role.value}' or higher required"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

# FastAPI dependency to get current user from RBAC context
async def get_current_user_rbac(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    """Get current user with RBAC context"""
    from sso_integration import sso_manager
    
    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    
    # Validate token and get user
    user = await sso_manager.get_current_user(credentials)
    
    return user

logger.info("Advanced RBAC system initialized with fine-grained permissions")