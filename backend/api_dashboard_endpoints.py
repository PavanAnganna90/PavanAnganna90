"""
OpsSight Dashboard Builder API Endpoints - v2.0.0
FastAPI endpoints for custom dashboard creation and management

Features:
- Dashboard CRUD operations
- Widget management and configuration
- Template creation and sharing
- Dashboard export functionality
- Real-time data binding
- Layout management
"""

from fastapi import APIRouter, Request, Depends, HTTPException, Query, File, UploadFile
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
import uuid
import json
import tempfile
import os

from pydantic import BaseModel, Field
from dashboard_builder import (
    dashboard_manager, Dashboard, Widget, WidgetType, LayoutMode,
    DataSourceType, DashboardTemplates
)
from database import User, UserRole
from sso_integration import get_current_user
from rbac_system import require_permission

# Configure logging
logger = logging.getLogger(__name__)

# Create router
dashboard_router = APIRouter(prefix="/dashboards", tags=["Dashboard Builder"])

# Pydantic models for request/response
class WidgetPositionModel(BaseModel):
    """Widget position model"""
    x: int = Field(ge=0, description="X coordinate")
    y: int = Field(ge=0, description="Y coordinate") 
    width: int = Field(gt=0, description="Widget width")
    height: int = Field(gt=0, description="Widget height")
    z_index: int = Field(default=0, description="Z-index for layering")

class DataSourceModel(BaseModel):
    """Data source model"""
    type: str = Field(description="Data source type")
    query: Dict[str, Any] = Field(description="Query configuration")
    refresh_interval: int = Field(default=300, gt=0, description="Refresh interval in seconds")
    cache_duration: int = Field(default=60, gt=0, description="Cache duration in seconds")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Data filters")
    aggregation: Optional[str] = Field(default=None, description="Data aggregation method")

class WidgetStyleModel(BaseModel):
    """Widget style model"""
    background_color: str = Field(default="#ffffff", description="Background color")
    border_color: str = Field(default="#e0e0e0", description="Border color")
    border_width: int = Field(default=1, ge=0, description="Border width")
    border_radius: int = Field(default=4, ge=0, description="Border radius")
    padding: int = Field(default=16, ge=0, description="Internal padding")
    margin: int = Field(default=8, ge=0, description="External margin")
    font_family: str = Field(default="Inter, sans-serif", description="Font family")
    font_size: int = Field(default=14, gt=0, description="Font size")
    text_color: str = Field(default="#333333", description="Text color")
    custom_css: str = Field(default="", description="Custom CSS")

class WidgetModel(BaseModel):
    """Widget model"""
    id: Optional[str] = Field(default=None, description="Widget ID")
    type: str = Field(description="Widget type")
    title: str = Field(description="Widget title")
    position: WidgetPositionModel = Field(description="Widget position and size")
    data_source: DataSourceModel = Field(description="Data source configuration")
    style: Optional[WidgetStyleModel] = Field(default=None, description="Widget styling")
    config: Dict[str, Any] = Field(default_factory=dict, description="Widget-specific configuration")

class DashboardLayoutModel(BaseModel):
    """Dashboard layout model"""
    mode: str = Field(default="grid", description="Layout mode")
    columns: int = Field(default=12, gt=0, description="Number of columns")
    row_height: int = Field(default=50, gt=0, description="Row height in pixels")
    margin: List[int] = Field(default=[10, 10], description="Layout margins")
    container_padding: List[int] = Field(default=[10, 10], description="Container padding")

class CreateDashboardRequest(BaseModel):
    """Create dashboard request"""
    name: str = Field(min_length=1, max_length=100, description="Dashboard name")
    description: str = Field(max_length=500, description="Dashboard description")
    layout_mode: str = Field(default="grid", description="Layout mode")
    tags: List[str] = Field(default_factory=list, description="Dashboard tags")
    is_public: bool = Field(default=False, description="Is dashboard public")
    theme: str = Field(default="light", description="Dashboard theme")
    auto_refresh: bool = Field(default=True, description="Auto refresh enabled")
    refresh_interval: int = Field(default=300, gt=0, description="Refresh interval in seconds")
    widgets: List[WidgetModel] = Field(default_factory=list, description="Dashboard widgets")

class UpdateDashboardRequest(BaseModel):
    """Update dashboard request"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[List[str]] = Field(default=None)
    is_public: Optional[bool] = Field(default=None)
    theme: Optional[str] = Field(default=None)
    auto_refresh: Optional[bool] = Field(default=None)
    refresh_interval: Optional[int] = Field(default=None, gt=0)
    widgets: Optional[List[WidgetModel]] = Field(default=None)

class DashboardResponse(BaseModel):
    """Dashboard response model"""
    id: str
    name: str
    description: str
    layout: Dict[str, Any]
    widgets: List[Dict[str, Any]]
    tags: List[str]
    is_public: bool
    is_template: bool
    theme: str
    auto_refresh: bool
    refresh_interval: int
    created_by: str
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]

class DashboardListResponse(BaseModel):
    """Dashboard list response"""
    dashboards: List[DashboardResponse]
    total_count: int
    templates_count: int

class ExportDashboardRequest(BaseModel):
    """Export dashboard request"""
    format: str = Field(description="Export format: json, pdf, png")
    include_data: bool = Field(default=False, description="Include current data in export")

# Dashboard CRUD endpoints

@dashboard_router.post("/", response_model=DashboardResponse)
@require_permission("collaboration:create")
async def create_dashboard(
    request: CreateDashboardRequest,
    current_user: User = Depends(get_current_user)
) -> DashboardResponse:
    """
    Create a new dashboard
    
    Args:
        request: Dashboard creation parameters
        current_user: Authenticated user
        
    Returns:
        Created dashboard details
    """
    try:
        # Convert request to dict
        dashboard_data = request.dict()
        
        # Create dashboard
        dashboard = await dashboard_manager.create_dashboard(dashboard_data, current_user)
        
        # Convert to response format
        response_data = {
            'id': dashboard.id,
            'name': dashboard.name,
            'description': dashboard.description,
            'layout': {
                'mode': dashboard.layout.mode.value,
                'columns': dashboard.layout.columns,
                'row_height': dashboard.layout.row_height,
                'margin': dashboard.layout.margin,
                'container_padding': dashboard.layout.container_padding
            },
            'widgets': [
                {
                    'id': w.id,
                    'type': w.type.value,
                    'title': w.title,
                    'position': {
                        'x': w.position.x,
                        'y': w.position.y,
                        'width': w.position.width,
                        'height': w.position.height,
                        'z_index': w.position.z_index
                    },
                    'data_source': {
                        'type': w.data_source.type.value,
                        'query': w.data_source.query,
                        'refresh_interval': w.data_source.refresh_interval,
                        'cache_duration': w.data_source.cache_duration,
                        'filters': w.data_source.filters,
                        'aggregation': w.data_source.aggregation
                    },
                    'style': {
                        'background_color': w.style.background_color,
                        'border_color': w.style.border_color,
                        'border_width': w.style.border_width,
                        'border_radius': w.style.border_radius,
                        'padding': w.style.padding,
                        'margin': w.style.margin,
                        'font_family': w.style.font_family,
                        'font_size': w.style.font_size,
                        'text_color': w.style.text_color,
                        'custom_css': w.style.custom_css
                    },
                    'config': w.config,
                    'created_at': w.created_at.isoformat(),
                    'updated_at': w.updated_at.isoformat()
                } for w in dashboard.widgets
            ],
            'tags': dashboard.tags,
            'is_public': dashboard.is_public,
            'is_template': dashboard.is_template,
            'theme': dashboard.theme,
            'auto_refresh': dashboard.auto_refresh,
            'refresh_interval': dashboard.refresh_interval,
            'created_by': str(dashboard.created_by),
            'created_at': dashboard.created_at.isoformat(),
            'updated_at': dashboard.updated_at.isoformat(),
            'metadata': dashboard.metadata
        }
        
        logger.info(f"Created dashboard '{dashboard.name}' for user {current_user.username}")
        return DashboardResponse(**response_data)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to create dashboard")

@dashboard_router.get("/", response_model=DashboardListResponse)
@require_permission("collaboration:read")
async def list_dashboards(
    include_templates: bool = Query(default=False, description="Include template dashboards"),
    tags: Optional[List[str]] = Query(default=None, description="Filter by tags"),
    current_user: User = Depends(get_current_user)
) -> DashboardListResponse:
    """
    List dashboards for the current user's organization
    
    Args:
        include_templates: Whether to include template dashboards
        tags: Filter dashboards by tags
        current_user: Authenticated user
        
    Returns:
        List of dashboards
    """
    try:
        # Get dashboards
        dashboards = await dashboard_manager.list_dashboards(current_user, include_templates)
        
        # Filter by tags if provided
        if tags:
            dashboards = [d for d in dashboards if any(tag in d.tags for tag in tags)]
        
        # Convert to response format
        dashboard_responses = []
        templates_count = 0
        
        for dashboard in dashboards:
            if dashboard.is_template:
                templates_count += 1
            
            dashboard_responses.append(DashboardResponse(
                id=dashboard.id,
                name=dashboard.name,
                description=dashboard.description,
                layout={
                    'mode': dashboard.layout.mode.value,
                    'columns': dashboard.layout.columns,
                    'row_height': dashboard.layout.row_height
                },
                widgets=[],  # Don't include full widget details in list
                tags=dashboard.tags,
                is_public=dashboard.is_public,
                is_template=dashboard.is_template,
                theme=dashboard.theme,
                auto_refresh=dashboard.auto_refresh,
                refresh_interval=dashboard.refresh_interval,
                created_by=str(dashboard.created_by),
                created_at=dashboard.created_at.isoformat(),
                updated_at=dashboard.updated_at.isoformat(),
                metadata=dashboard.metadata
            ))
        
        return DashboardListResponse(
            dashboards=dashboard_responses,
            total_count=len(dashboard_responses),
            templates_count=templates_count
        )
        
    except Exception as e:
        logger.error(f"Failed to list dashboards: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboards")

@dashboard_router.get("/{dashboard_id}", response_model=DashboardResponse)
@require_permission("collaboration:read")
async def get_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
) -> DashboardResponse:
    """
    Get a specific dashboard
    
    Args:
        dashboard_id: Dashboard ID
        current_user: Authenticated user
        
    Returns:
        Dashboard details
    """
    try:
        dashboard = await dashboard_manager.get_dashboard(dashboard_id, current_user)
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Convert to response format (full details including widgets)
        response_data = {
            'id': dashboard.id,
            'name': dashboard.name,
            'description': dashboard.description,
            'layout': {
                'mode': dashboard.layout.mode.value,
                'columns': dashboard.layout.columns,
                'row_height': dashboard.layout.row_height,
                'margin': dashboard.layout.margin,
                'container_padding': dashboard.layout.container_padding,
                'breakpoints': dashboard.layout.breakpoints,
                'cols_per_breakpoint': dashboard.layout.cols_per_breakpoint
            },
            'widgets': [
                {
                    'id': w.id,
                    'type': w.type.value,
                    'title': w.title,
                    'position': {
                        'x': w.position.x,
                        'y': w.position.y,
                        'width': w.position.width,
                        'height': w.position.height,
                        'z_index': w.position.z_index
                    },
                    'data_source': {
                        'type': w.data_source.type.value,
                        'query': w.data_source.query,
                        'refresh_interval': w.data_source.refresh_interval,
                        'cache_duration': w.data_source.cache_duration,
                        'filters': w.data_source.filters,
                        'aggregation': w.data_source.aggregation
                    },
                    'style': {
                        'background_color': w.style.background_color,
                        'border_color': w.style.border_color,
                        'border_width': w.style.border_width,
                        'border_radius': w.style.border_radius,
                        'padding': w.style.padding,
                        'margin': w.style.margin,
                        'font_family': w.style.font_family,
                        'font_size': w.style.font_size,
                        'text_color': w.style.text_color,
                        'custom_css': w.style.custom_css
                    },
                    'config': w.config,
                    'created_at': w.created_at.isoformat(),
                    'updated_at': w.updated_at.isoformat()
                } for w in dashboard.widgets
            ],
            'tags': dashboard.tags,
            'is_public': dashboard.is_public,
            'is_template': dashboard.is_template,
            'theme': dashboard.theme,
            'auto_refresh': dashboard.auto_refresh,
            'refresh_interval': dashboard.refresh_interval,
            'created_by': str(dashboard.created_by),
            'created_at': dashboard.created_at.isoformat(),
            'updated_at': dashboard.updated_at.isoformat(),
            'metadata': dashboard.metadata
        }
        
        return DashboardResponse(**response_data)
        
    except PermissionError:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    except Exception as e:
        logger.error(f"Failed to get dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve dashboard")

@dashboard_router.put("/{dashboard_id}", response_model=DashboardResponse)
@require_permission("collaboration:update")
async def update_dashboard(
    dashboard_id: str,
    request: UpdateDashboardRequest,
    current_user: User = Depends(get_current_user)
) -> DashboardResponse:
    """
    Update an existing dashboard
    
    Args:
        dashboard_id: Dashboard ID
        request: Update parameters
        current_user: Authenticated user
        
    Returns:
        Updated dashboard details
    """
    try:
        # Convert request to dict, excluding None values
        update_data = {k: v for k, v in request.dict().items() if v is not None}
        
        # Update dashboard
        dashboard = await dashboard_manager.update_dashboard(dashboard_id, update_data, current_user)
        
        # Convert to response format
        response_data = {
            'id': dashboard.id,
            'name': dashboard.name,
            'description': dashboard.description,
            'layout': {
                'mode': dashboard.layout.mode.value,
                'columns': dashboard.layout.columns,
                'row_height': dashboard.layout.row_height,
                'margin': dashboard.layout.margin,
                'container_padding': dashboard.layout.container_padding
            },
            'widgets': [
                {
                    'id': w.id,
                    'type': w.type.value,
                    'title': w.title,
                    'position': {
                        'x': w.position.x,
                        'y': w.position.y,
                        'width': w.position.width,
                        'height': w.position.height,
                        'z_index': w.position.z_index
                    },
                    'data_source': {
                        'type': w.data_source.type.value,
                        'query': w.data_source.query,
                        'refresh_interval': w.data_source.refresh_interval
                    },
                    'config': w.config
                } for w in dashboard.widgets
            ],
            'tags': dashboard.tags,
            'is_public': dashboard.is_public,
            'is_template': dashboard.is_template,
            'theme': dashboard.theme,
            'auto_refresh': dashboard.auto_refresh,
            'refresh_interval': dashboard.refresh_interval,
            'created_by': str(dashboard.created_by),
            'created_at': dashboard.created_at.isoformat(),
            'updated_at': dashboard.updated_at.isoformat(),
            'metadata': dashboard.metadata
        }
        
        logger.info(f"Updated dashboard '{dashboard.name}'")
        return DashboardResponse(**response_data)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    except Exception as e:
        logger.error(f"Failed to update dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to update dashboard")

@dashboard_router.delete("/{dashboard_id}")
@require_permission("collaboration:manage")
async def delete_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a dashboard
    
    Args:
        dashboard_id: Dashboard ID
        current_user: Authenticated user
        
    Returns:
        Deletion confirmation
    """
    try:
        success = await dashboard_manager.delete_dashboard(dashboard_id, current_user)
        
        if not success:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        logger.info(f"Deleted dashboard {dashboard_id}")
        return {
            "message": "Dashboard deleted successfully",
            "deleted_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except PermissionError:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    except Exception as e:
        logger.error(f"Failed to delete dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete dashboard")

# Dashboard operations endpoints

@dashboard_router.post("/{dashboard_id}/duplicate", response_model=DashboardResponse)
@require_permission("collaboration:create")
async def duplicate_dashboard(
    dashboard_id: str,
    new_name: str = Query(..., description="Name for the duplicated dashboard"),
    current_user: User = Depends(get_current_user)
) -> DashboardResponse:
    """
    Duplicate an existing dashboard
    
    Args:
        dashboard_id: Source dashboard ID
        new_name: Name for the new dashboard
        current_user: Authenticated user
        
    Returns:
        Duplicated dashboard details
    """
    try:
        dashboard = await dashboard_manager.duplicate_dashboard(dashboard_id, new_name, current_user)
        
        # Convert to response format
        response_data = {
            'id': dashboard.id,
            'name': dashboard.name,
            'description': dashboard.description,
            'layout': {
                'mode': dashboard.layout.mode.value,
                'columns': dashboard.layout.columns,
                'row_height': dashboard.layout.row_height
            },
            'widgets': [],  # Can include full widget details if needed
            'tags': dashboard.tags,
            'is_public': dashboard.is_public,
            'is_template': dashboard.is_template,
            'theme': dashboard.theme,
            'auto_refresh': dashboard.auto_refresh,
            'refresh_interval': dashboard.refresh_interval,
            'created_by': str(dashboard.created_by),
            'created_at': dashboard.created_at.isoformat(),
            'updated_at': dashboard.updated_at.isoformat(),
            'metadata': dashboard.metadata
        }
        
        return DashboardResponse(**response_data)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to duplicate dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to duplicate dashboard")

@dashboard_router.post("/{dashboard_id}/export")
@require_permission("collaboration:read")
async def export_dashboard(
    dashboard_id: str,
    request: ExportDashboardRequest,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Export dashboard in various formats
    
    Args:
        dashboard_id: Dashboard ID
        request: Export parameters
        current_user: Authenticated user
        
    Returns:
        Export result with download information
    """
    try:
        export_result = await dashboard_manager.export_dashboard(
            dashboard_id, request.format, current_user
        )
        
        logger.info(f"Exported dashboard {dashboard_id} as {request.format}")
        return export_result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to export dashboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to export dashboard")

# Template endpoints

@dashboard_router.get("/templates/list")
@require_permission("collaboration:read")
async def list_dashboard_templates(
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    List available dashboard templates
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Available dashboard templates
    """
    try:
        templates = [
            {
                'id': 'infrastructure_overview',
                'name': 'Infrastructure Overview',
                'description': 'High-level overview of infrastructure health and performance',
                'category': 'infrastructure',
                'preview_image': '/templates/infrastructure_overview.png',
                'widgets_count': 7,
                'tags': ['infrastructure', 'overview', 'monitoring']
            },
            {
                'id': 'application_performance',
                'name': 'Application Performance',
                'description': 'Application performance metrics and monitoring',
                'category': 'application',
                'preview_image': '/templates/application_performance.png',
                'widgets_count': 5,
                'tags': ['application', 'performance', 'apm']
            }
        ]
        
        return {'templates': templates}
        
    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve templates")

@dashboard_router.post("/templates/{template_id}/create", response_model=DashboardResponse)
@require_permission("collaboration:create")
async def create_dashboard_from_template(
    template_id: str,
    name: str = Query(..., description="Name for the new dashboard"),
    current_user: User = Depends(get_current_user)
) -> DashboardResponse:
    """
    Create dashboard from template
    
    Args:
        template_id: Template ID
        name: Name for the new dashboard
        current_user: Authenticated user
        
    Returns:
        Created dashboard details
    """
    try:
        templates = DashboardTemplates()
        
        if template_id == 'infrastructure_overview':
            dashboard = templates.create_infrastructure_overview(
                current_user.organization_id, current_user.id
            )
        elif template_id == 'application_performance':
            dashboard = templates.create_application_performance(
                current_user.organization_id, current_user.id
            )
        else:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Update name and save
        dashboard.name = name
        dashboard.is_template = False
        await dashboard_manager._save_dashboard(dashboard)
        
        # Convert to response format
        response_data = {
            'id': dashboard.id,
            'name': dashboard.name,
            'description': dashboard.description,
            'layout': {
                'mode': dashboard.layout.mode.value,
                'columns': dashboard.layout.columns,
                'row_height': dashboard.layout.row_height
            },
            'widgets': [],
            'tags': dashboard.tags,
            'is_public': dashboard.is_public,
            'is_template': dashboard.is_template,
            'theme': dashboard.theme,
            'auto_refresh': dashboard.auto_refresh,
            'refresh_interval': dashboard.refresh_interval,
            'created_by': str(dashboard.created_by),
            'created_at': dashboard.created_at.isoformat(),
            'updated_at': dashboard.updated_at.isoformat(),
            'metadata': dashboard.metadata
        }
        
        logger.info(f"Created dashboard '{name}' from template '{template_id}'")
        return DashboardResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create dashboard from template: {e}")
        raise HTTPException(status_code=500, detail="Failed to create dashboard from template")

# Widget configuration endpoints

@dashboard_router.get("/widgets/types")
@require_permission("collaboration:read")
async def get_widget_types(
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get available widget types and their configurations
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Available widget types with configuration schemas
    """
    try:
        widget_types = [
            {
                'type': 'line_chart',
                'name': 'Line Chart',
                'description': 'Display metrics as a time series line chart',
                'category': 'charts',
                'icon': 'line-chart',
                'config_schema': {
                    'chart_type': {'type': 'select', 'options': ['line', 'area', 'step']},
                    'show_legend': {'type': 'boolean', 'default': True},
                    'show_grid': {'type': 'boolean', 'default': True},
                    'colors': {'type': 'array', 'items': {'type': 'color'}}
                }
            },
            {
                'type': 'metric_card',
                'name': 'Metric Card',
                'description': 'Display a single metric value with trend',
                'category': 'metrics',
                'icon': 'card',
                'config_schema': {
                    'show_trend': {'type': 'boolean', 'default': True},
                    'format': {'type': 'select', 'options': ['number', 'percentage', 'bytes']},
                    'decimals': {'type': 'number', 'default': 2}
                }
            },
            {
                'type': 'alert_list',
                'name': 'Alert List',
                'description': 'Display a list of recent alerts',
                'category': 'alerts',
                'icon': 'alert',
                'config_schema': {
                    'max_items': {'type': 'number', 'default': 10},
                    'show_severity': {'type': 'boolean', 'default': True},
                    'group_by': {'type': 'select', 'options': ['severity', 'service', 'timestamp']}
                }
            }
        ]
        
        return {'widget_types': widget_types}
        
    except Exception as e:
        logger.error(f"Failed to get widget types: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve widget types")

# Health check endpoint
@dashboard_router.get("/health")
async def dashboard_health_check() -> Dict[str, Any]:
    """
    Dashboard service health check
    
    Returns:
        Health status of dashboard service
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'dashboard_manager': 'operational',
                'widget_factory': 'operational',
                'templates': 'operational'
            },
            'widget_types': len(WidgetType),
            'layout_modes': len(LayoutMode),
            'data_source_types': len(DataSourceType)
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Dashboard health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

logger.info("Dashboard Builder API endpoints initialized successfully")