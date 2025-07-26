"""
OpsSight Data Access Layer (DAL) - v2.0.0
High-level data access services for all entities
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
import json
from dataclasses import dataclass
from abc import ABC, abstractmethod
import uuid

from sqlalchemy import and_, or_, func, desc, asc, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy.sql import select, insert, update, delete
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import (
    db_manager, AsyncSessionLocal, 
    Organization, User, Service, Metric, Alert, Deployment, AuditLog, Configuration,
    UserRole, AlertSeverity, AlertStatus, ServiceStatus, DeploymentStatus
)

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class QueryResult:
    """Standardized query result wrapper"""
    data: Any
    total_count: int = 0
    page: int = 1
    page_size: int = 50
    has_next: bool = False
    has_previous: bool = False
    execution_time_ms: float = 0

@dataclass
class FilterCriteria:
    """Flexible filtering criteria"""
    field: str
    operator: str  # eq, ne, gt, gte, lt, lte, in, not_in, like, ilike
    value: Any
    
class BaseRepository(ABC):
    """Abstract base repository with common operations"""
    
    def __init__(self, model_class):
        self.model_class = model_class
        self.session_factory = AsyncSessionLocal
    
    async def get_by_id(self, id: Union[str, uuid.UUID], org_id: Optional[uuid.UUID] = None) -> Optional[Any]:
        """Get entity by ID"""
        async with self.session_factory() as session:
            query = select(self.model_class).where(self.model_class.id == id)
            
            # Add organization filter if applicable
            if org_id and hasattr(self.model_class, 'organization_id'):
                query = query.where(self.model_class.organization_id == org_id)
            
            result = await session.execute(query)
            return result.scalar_one_or_none()
    
    async def create(self, data: Dict[str, Any], created_by: Optional[uuid.UUID] = None) -> Any:
        """Create new entity"""
        async with self.session_factory() as session:
            try:
                # Add audit fields if applicable
                if hasattr(self.model_class, 'created_by') and created_by:
                    data['created_by'] = created_by
                
                entity = self.model_class(**data)
                session.add(entity)
                await session.commit()
                await session.refresh(entity)
                
                return entity
                
            except IntegrityError as e:
                await session.rollback()
                logger.error(f"Integrity error creating {self.model_class.__name__}: {e}")
                raise
            except Exception as e:
                await session.rollback()
                logger.error(f"Error creating {self.model_class.__name__}: {e}")
                raise

class UserRepository(BaseRepository):
    """User-specific data access operations"""
    
    def __init__(self):
        super().__init__(User)
    
    async def get_by_username(self, username: str, org_id: uuid.UUID) -> Optional[User]:
        """Get user by username within organization"""
        async with self.session_factory() as session:
            query = select(User).where(
                and_(User.username == username, User.organization_id == org_id)
            ).options(selectinload(User.organization))
            
            result = await session.execute(query)
            return result.scalar_one_or_none()

class ServiceRepository(BaseRepository):
    """Service-specific data access operations"""
    
    def __init__(self):
        super().__init__(Service)

class MetricRepository(BaseRepository):
    """Metrics data access with time-series optimizations"""
    
    def __init__(self):
        super().__init__(Metric)
    
    async def bulk_insert_metrics(self, metrics_data: List[Dict[str, Any]]) -> int:
        """Bulk insert metrics for performance"""
        async with self.session_factory() as session:
            try:
                # Use bulk insert for better performance
                await session.execute(insert(Metric), metrics_data)
                await session.commit()
                return len(metrics_data)
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error bulk inserting metrics: {e}")
                raise

class AlertRepository(BaseRepository):
    """Alert management data access"""
    
    def __init__(self):
        super().__init__(Alert)
    
    async def get_active_alerts(self, org_id: uuid.UUID) -> List[Alert]:
        """Get active alerts"""
        async with self.session_factory() as session:
            query = select(Alert).where(
                and_(
                    Alert.organization_id == org_id,
                    Alert.status == AlertStatus.ACTIVE
                )
            ).order_by(Alert.first_seen.desc())
            
            result = await session.execute(query)
            return result.scalars().all()

# Create repository instances
user_repository = UserRepository()
service_repository = ServiceRepository()
metric_repository = MetricRepository()
alert_repository = AlertRepository()

# Additional specialized repositories
deployment_repository = BaseRepository(Deployment)
audit_log_repository = BaseRepository(AuditLog)
configuration_repository = BaseRepository(Configuration)

logger.info("Data Access Layer initialized with all repositories")