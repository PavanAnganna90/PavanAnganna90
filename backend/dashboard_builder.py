"""
OpsSight Custom Dashboard Builder - v2.0.0
Drag-and-drop dashboard builder with real-time widgets and customizable layouts

Features:
- Visual dashboard designer with drag-and-drop interface
- Pre-built widget library (charts, metrics, alerts, etc.)
- Custom widget development framework
- Real-time data binding and updates
- Responsive layout system
- Dashboard templates and sharing
- Export capabilities (PDF, PNG, HTML)
- Role-based dashboard access control
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
import json
import uuid
from dataclasses import dataclass, field
from enum import Enum
import base64

# Database imports
from services.data_access import AsyncSessionLocal
from database import User, Organization

# Configure logging
logger = logging.getLogger(__name__)

class WidgetType(Enum):
    """Available widget types"""
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    GAUGE = "gauge"
    METRIC_CARD = "metric_card"
    ALERT_LIST = "alert_list"
    SERVICE_STATUS = "service_status"
    TABLE = "table"
    TEXT = "text"
    IFRAME = "iframe"
    HEATMAP = "heatmap"
    SCATTER_PLOT = "scatter_plot"
    HISTOGRAM = "histogram"
    TIMELINE = "timeline"
    MAP = "map"

class LayoutMode(Enum):
    """Dashboard layout modes"""
    GRID = "grid"
    FREE_FORM = "free_form"
    RESPONSIVE = "responsive"

class DataSourceType(Enum):
    """Data source types for widgets"""
    METRICS = "metrics"
    ALERTS = "alerts"
    SERVICES = "services"
    DEPLOYMENTS = "deployments"
    ANALYTICS = "analytics"
    CUSTOM_API = "custom_api"
    STATIC = "static"

@dataclass
class WidgetPosition:
    """Widget position and dimensions"""
    x: int
    y: int
    width: int
    height: int
    z_index: int = 0

@dataclass
class DataSource:
    """Data source configuration"""
    type: DataSourceType
    query: Dict[str, Any]
    refresh_interval: int = 300  # seconds
    cache_duration: int = 60  # seconds
    filters: Dict[str, Any] = field(default_factory=dict)
    aggregation: Optional[str] = None

@dataclass
class WidgetStyle:
    """Widget visual styling"""
    background_color: str = "#ffffff"
    border_color: str = "#e0e0e0"
    border_width: int = 1
    border_radius: int = 4
    padding: int = 16
    margin: int = 8
    font_family: str = "Inter, sans-serif"
    font_size: int = 14
    text_color: str = "#333333"
    custom_css: str = ""

@dataclass
class Widget:
    """Dashboard widget definition"""
    id: str
    type: WidgetType
    title: str
    position: WidgetPosition
    data_source: DataSource
    style: WidgetStyle
    config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class DashboardLayout:
    """Dashboard layout configuration"""
    mode: LayoutMode
    columns: int = 12
    row_height: int = 50
    margin: List[int] = field(default_factory=lambda: [10, 10])
    container_padding: List[int] = field(default_factory=lambda: [10, 10])
    breakpoints: Dict[str, int] = field(default_factory=lambda: {
        'lg': 1200, 'md': 996, 'sm': 768, 'xs': 480, 'xxs': 0
    })
    cols_per_breakpoint: Dict[str, int] = field(default_factory=lambda: {
        'lg': 12, 'md': 10, 'sm': 6, 'xs': 4, 'xxs': 2
    })

@dataclass
class Dashboard:
    """Complete dashboard definition"""
    id: str
    organization_id: uuid.UUID
    name: str
    description: str
    layout: DashboardLayout
    widgets: List[Widget]
    tags: List[str] = field(default_factory=list)
    is_public: bool = False
    is_template: bool = False
    theme: str = "light"
    auto_refresh: bool = True
    refresh_interval: int = 300
    created_by: uuid.UUID = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

class WidgetFactory:
    """Factory for creating pre-configured widgets"""
    
    @staticmethod
    def create_metric_card(title: str, metric_query: Dict[str, Any], 
                          position: WidgetPosition) -> Widget:
        """Create a metric card widget"""
        return Widget(
            id=str(uuid.uuid4()),
            type=WidgetType.METRIC_CARD,
            title=title,
            position=position,
            data_source=DataSource(
                type=DataSourceType.METRICS,
                query=metric_query,
                refresh_interval=60
            ),
            style=WidgetStyle(
                background_color="#f8f9fa",
                border_radius=8
            ),
            config={
                'show_trend': True,
                'show_sparkline': True,
                'format': 'number',
                'decimals': 2,
                'unit': '',
                'thresholds': {
                    'warning': 80,
                    'critical': 90
                }
            }
        )
    
    @staticmethod
    def create_line_chart(title: str, metrics_query: Dict[str, Any], 
                         position: WidgetPosition) -> Widget:
        """Create a line chart widget"""
        return Widget(
            id=str(uuid.uuid4()),
            type=WidgetType.LINE_CHART,
            title=title,
            position=position,
            data_source=DataSource(
                type=DataSourceType.METRICS,
                query=metrics_query,
                refresh_interval=120
            ),
            style=WidgetStyle(
                background_color="#ffffff",
                border_radius=8
            ),
            config={
                'chart_type': 'line',
                'show_legend': True,
                'show_grid': True,
                'show_tooltip': True,
                'animation': True,
                'colors': ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
                'x_axis': {
                    'type': 'time',
                    'format': 'HH:mm'
                },
                'y_axis': {
                    'type': 'linear',
                    'min': 'auto',
                    'max': 'auto'
                }
            }
        )
    
    @staticmethod
    def create_alert_list(title: str, alert_query: Dict[str, Any], 
                         position: WidgetPosition) -> Widget:
        """Create an alert list widget"""
        return Widget(
            id=str(uuid.uuid4()),
            type=WidgetType.ALERT_LIST,
            title=title,
            position=position,
            data_source=DataSource(
                type=DataSourceType.ALERTS,
                query=alert_query,
                refresh_interval=30
            ),
            style=WidgetStyle(
                background_color="#ffffff",
                border_radius=8
            ),
            config={
                'max_items': 10,
                'show_severity': True,
                'show_timestamp': True,
                'show_service': True,
                'group_by': 'severity',
                'sort_by': 'timestamp',
                'sort_order': 'desc'
            }
        )
    
    @staticmethod
    def create_service_status(title: str, service_query: Dict[str, Any], 
                            position: WidgetPosition) -> Widget:
        """Create a service status widget"""
        return Widget(
            id=str(uuid.uuid4()),
            type=WidgetType.SERVICE_STATUS,
            title=title,
            position=position,
            data_source=DataSource(
                type=DataSourceType.SERVICES,
                query=service_query,
                refresh_interval=60
            ),
            style=WidgetStyle(
                background_color="#ffffff",
                border_radius=8
            ),
            config={
                'layout': 'grid',
                'show_health': True,
                'show_metrics': True,
                'show_deployments': True,
                'max_services': 20
            }
        )

class DashboardTemplates:
    """Pre-built dashboard templates"""
    
    @staticmethod
    def create_infrastructure_overview(org_id: uuid.UUID, user_id: uuid.UUID) -> Dashboard:
        """Create infrastructure overview dashboard template"""
        widgets = [
            WidgetFactory.create_metric_card(
                "CPU Usage",
                {"metric": "cpu_usage", "aggregation": "avg"},
                WidgetPosition(0, 0, 3, 2)
            ),
            WidgetFactory.create_metric_card(
                "Memory Usage", 
                {"metric": "memory_usage", "aggregation": "avg"},
                WidgetPosition(3, 0, 3, 2)
            ),
            WidgetFactory.create_metric_card(
                "Disk Usage",
                {"metric": "disk_usage", "aggregation": "avg"},
                WidgetPosition(6, 0, 3, 2)
            ),
            WidgetFactory.create_metric_card(
                "Network I/O",
                {"metric": "network_io", "aggregation": "sum"},
                WidgetPosition(9, 0, 3, 2)
            ),
            WidgetFactory.create_line_chart(
                "Resource Utilization Trends",
                {
                    "metrics": ["cpu_usage", "memory_usage", "disk_usage"],
                    "time_range": "24h",
                    "group_by": "service"
                },
                WidgetPosition(0, 2, 8, 4)
            ),
            WidgetFactory.create_alert_list(
                "Recent Alerts",
                {"severity": ["high", "critical"], "limit": 10},
                WidgetPosition(8, 2, 4, 4)
            ),
            WidgetFactory.create_service_status(
                "Service Health",
                {"environment": "production"},
                WidgetPosition(0, 6, 12, 3)
            )
        ]
        
        return Dashboard(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            name="Infrastructure Overview",
            description="High-level overview of infrastructure health and performance",
            layout=DashboardLayout(mode=LayoutMode.GRID),
            widgets=widgets,
            tags=["infrastructure", "overview", "monitoring"],
            is_template=True,
            created_by=user_id
        )
    
    @staticmethod
    def create_application_performance(org_id: uuid.UUID, user_id: uuid.UUID) -> Dashboard:
        """Create application performance dashboard template"""
        widgets = [
            WidgetFactory.create_line_chart(
                "Response Time",
                {
                    "metric": "response_time",
                    "time_range": "6h",
                    "percentiles": [50, 90, 99]
                },
                WidgetPosition(0, 0, 6, 3)
            ),
            WidgetFactory.create_line_chart(
                "Request Rate",
                {
                    "metric": "request_rate",
                    "time_range": "6h",
                    "aggregation": "sum"
                },
                WidgetPosition(6, 0, 6, 3)
            ),
            WidgetFactory.create_line_chart(
                "Error Rate",
                {
                    "metric": "error_rate",
                    "time_range": "6h",
                    "aggregation": "avg"
                },
                WidgetPosition(0, 3, 6, 3)
            ),
            Widget(
                id=str(uuid.uuid4()),
                type=WidgetType.GAUGE,
                title="Apdex Score",
                position=WidgetPosition(6, 3, 3, 3),
                data_source=DataSource(
                    type=DataSourceType.ANALYTICS,
                    query={"metric": "apdex_score", "aggregation": "avg"}
                ),
                style=WidgetStyle(),
                config={
                    'min': 0,
                    'max': 1,
                    'thresholds': [
                        {'value': 0.5, 'color': 'red'},
                        {'value': 0.7, 'color': 'yellow'},
                        {'value': 0.85, 'color': 'green'}
                    ]
                }
            ),
            Widget(
                id=str(uuid.uuid4()),
                type=WidgetType.PIE_CHART,
                title="HTTP Status Codes",
                position=WidgetPosition(9, 3, 3, 3),
                data_source=DataSource(
                    type=DataSourceType.METRICS,
                    query={
                        "metric": "http_requests",
                        "group_by": "status_code",
                        "time_range": "1h"
                    }
                ),
                style=WidgetStyle(),
                config={
                    'colors': {
                        '2xx': '#10b981',
                        '3xx': '#3b82f6',
                        '4xx': '#f59e0b',
                        '5xx': '#ef4444'
                    }
                }
            )
        ]
        
        return Dashboard(
            id=str(uuid.uuid4()),
            organization_id=org_id,
            name="Application Performance",
            description="Application performance metrics and monitoring",
            layout=DashboardLayout(mode=LayoutMode.GRID),
            widgets=widgets,
            tags=["application", "performance", "apm"],
            is_template=True,
            created_by=user_id
        )

class DashboardManager:
    """Main dashboard management class"""
    
    def __init__(self):
        self.widget_factory = WidgetFactory()
        self.templates = DashboardTemplates()
    
    async def create_dashboard(self, dashboard_data: Dict[str, Any], 
                             user: User) -> Dashboard:
        """Create a new dashboard"""
        try:
            # Validate required fields
            required_fields = ['name', 'description']
            for field in required_fields:
                if field not in dashboard_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Create dashboard
            dashboard = Dashboard(
                id=str(uuid.uuid4()),
                organization_id=user.organization_id,
                name=dashboard_data['name'],
                description=dashboard_data['description'],
                layout=DashboardLayout(
                    mode=LayoutMode(dashboard_data.get('layout_mode', 'grid'))
                ),
                widgets=[],
                tags=dashboard_data.get('tags', []),
                is_public=dashboard_data.get('is_public', False),
                theme=dashboard_data.get('theme', 'light'),
                auto_refresh=dashboard_data.get('auto_refresh', True),
                refresh_interval=dashboard_data.get('refresh_interval', 300),
                created_by=user.id
            )
            
            # Add widgets if provided
            if 'widgets' in dashboard_data:
                for widget_data in dashboard_data['widgets']:
                    widget = await self._create_widget_from_data(widget_data)
                    dashboard.widgets.append(widget)
            
            # Save to database (simplified - in practice, use proper repository)
            await self._save_dashboard(dashboard)
            
            logger.info(f"Created dashboard {dashboard.name} for user {user.username}")
            return dashboard
            
        except Exception as e:
            logger.error(f"Failed to create dashboard: {e}")
            raise
    
    async def update_dashboard(self, dashboard_id: str, update_data: Dict[str, Any],
                             user: User) -> Dashboard:
        """Update an existing dashboard"""
        try:
            # Get existing dashboard
            dashboard = await self._get_dashboard_by_id(dashboard_id, user.organization_id)
            if not dashboard:
                raise ValueError("Dashboard not found")
            
            # Check permissions
            if dashboard.created_by != user.id and user.role.value not in ['admin', 'super_admin']:
                raise PermissionError("Insufficient permissions to update dashboard")
            
            # Update fields
            if 'name' in update_data:
                dashboard.name = update_data['name']
            if 'description' in update_data:
                dashboard.description = update_data['description']
            if 'tags' in update_data:
                dashboard.tags = update_data['tags']
            if 'is_public' in update_data:
                dashboard.is_public = update_data['is_public']
            if 'theme' in update_data:
                dashboard.theme = update_data['theme']
            if 'auto_refresh' in update_data:
                dashboard.auto_refresh = update_data['auto_refresh']
            if 'refresh_interval' in update_data:
                dashboard.refresh_interval = update_data['refresh_interval']
            
            # Update widgets
            if 'widgets' in update_data:
                dashboard.widgets = []
                for widget_data in update_data['widgets']:
                    widget = await self._create_widget_from_data(widget_data)
                    dashboard.widgets.append(widget)
            
            dashboard.updated_at = datetime.utcnow()
            
            # Save to database
            await self._save_dashboard(dashboard)
            
            logger.info(f"Updated dashboard {dashboard.name}")
            return dashboard
            
        except Exception as e:
            logger.error(f"Failed to update dashboard: {e}")
            raise
    
    async def delete_dashboard(self, dashboard_id: str, user: User) -> bool:
        """Delete a dashboard"""
        try:
            # Get dashboard
            dashboard = await self._get_dashboard_by_id(dashboard_id, user.organization_id)
            if not dashboard:
                return False
            
            # Check permissions
            if dashboard.created_by != user.id and user.role.value not in ['admin', 'super_admin']:
                raise PermissionError("Insufficient permissions to delete dashboard")
            
            # Delete from database
            await self._delete_dashboard(dashboard_id)
            
            logger.info(f"Deleted dashboard {dashboard.name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete dashboard: {e}")
            raise
    
    async def list_dashboards(self, user: User, include_templates: bool = False) -> List[Dashboard]:
        """List dashboards for a user's organization"""
        try:
            dashboards = await self._get_dashboards_by_org(
                user.organization_id, include_templates
            )
            
            # Filter based on permissions
            filtered_dashboards = []
            for dashboard in dashboards:
                if (dashboard.is_public or 
                    dashboard.created_by == user.id or 
                    user.role.value in ['admin', 'super_admin']):
                    filtered_dashboards.append(dashboard)
            
            return filtered_dashboards
            
        except Exception as e:
            logger.error(f"Failed to list dashboards: {e}")
            raise
    
    async def get_dashboard(self, dashboard_id: str, user: User) -> Optional[Dashboard]:
        """Get a specific dashboard"""
        try:
            dashboard = await self._get_dashboard_by_id(dashboard_id, user.organization_id)
            if not dashboard:
                return None
            
            # Check permissions
            if (not dashboard.is_public and 
                dashboard.created_by != user.id and 
                user.role.value not in ['admin', 'super_admin']):
                raise PermissionError("Insufficient permissions to view dashboard")
            
            return dashboard
            
        except Exception as e:
            logger.error(f"Failed to get dashboard: {e}")
            raise
    
    async def duplicate_dashboard(self, dashboard_id: str, new_name: str, 
                                user: User) -> Dashboard:
        """Duplicate an existing dashboard"""
        try:
            # Get source dashboard
            source_dashboard = await self.get_dashboard(dashboard_id, user)
            if not source_dashboard:
                raise ValueError("Source dashboard not found")
            
            # Create duplicate
            duplicate_data = {
                'name': new_name,
                'description': f"Copy of {source_dashboard.description}",
                'layout_mode': source_dashboard.layout.mode.value,
                'tags': source_dashboard.tags.copy(),
                'theme': source_dashboard.theme,
                'auto_refresh': source_dashboard.auto_refresh,
                'refresh_interval': source_dashboard.refresh_interval,
                'widgets': []
            }
            
            # Copy widgets
            for widget in source_dashboard.widgets:
                widget_data = {
                    'type': widget.type.value,
                    'title': widget.title,
                    'position': {
                        'x': widget.position.x,
                        'y': widget.position.y,
                        'width': widget.position.width,
                        'height': widget.position.height
                    },
                    'data_source': {
                        'type': widget.data_source.type.value,
                        'query': widget.data_source.query,
                        'refresh_interval': widget.data_source.refresh_interval
                    },
                    'config': widget.config
                }
                duplicate_data['widgets'].append(widget_data)
            
            duplicate_dashboard = await self.create_dashboard(duplicate_data, user)
            
            logger.info(f"Duplicated dashboard {source_dashboard.name} as {new_name}")
            return duplicate_dashboard
            
        except Exception as e:
            logger.error(f"Failed to duplicate dashboard: {e}")
            raise
    
    async def export_dashboard(self, dashboard_id: str, format: str, 
                             user: User) -> Dict[str, Any]:
        """Export dashboard in various formats"""
        try:
            dashboard = await self.get_dashboard(dashboard_id, user)
            if not dashboard:
                raise ValueError("Dashboard not found")
            
            if format.lower() == 'json':
                return await self._export_json(dashboard)
            elif format.lower() == 'pdf':
                return await self._export_pdf(dashboard)
            elif format.lower() == 'png':
                return await self._export_png(dashboard)
            else:
                raise ValueError(f"Unsupported export format: {format}")
                
        except Exception as e:
            logger.error(f"Failed to export dashboard: {e}")
            raise
    
    async def _create_widget_from_data(self, widget_data: Dict[str, Any]) -> Widget:
        """Create widget from data dictionary"""
        widget_type = WidgetType(widget_data['type'])
        
        position = WidgetPosition(
            x=widget_data['position']['x'],
            y=widget_data['position']['y'],
            width=widget_data['position']['width'],
            height=widget_data['position']['height'],
            z_index=widget_data['position'].get('z_index', 0)
        )
        
        data_source = DataSource(
            type=DataSourceType(widget_data['data_source']['type']),
            query=widget_data['data_source']['query'],
            refresh_interval=widget_data['data_source'].get('refresh_interval', 300),
            cache_duration=widget_data['data_source'].get('cache_duration', 60),
            filters=widget_data['data_source'].get('filters', {}),
            aggregation=widget_data['data_source'].get('aggregation')
        )
        
        style_data = widget_data.get('style', {})
        style = WidgetStyle(
            background_color=style_data.get('background_color', '#ffffff'),
            border_color=style_data.get('border_color', '#e0e0e0'),
            border_width=style_data.get('border_width', 1),
            border_radius=style_data.get('border_radius', 4),
            padding=style_data.get('padding', 16),
            margin=style_data.get('margin', 8),
            font_family=style_data.get('font_family', 'Inter, sans-serif'),
            font_size=style_data.get('font_size', 14),
            text_color=style_data.get('text_color', '#333333'),
            custom_css=style_data.get('custom_css', '')
        )
        
        return Widget(
            id=widget_data.get('id', str(uuid.uuid4())),
            type=widget_type,
            title=widget_data['title'],
            position=position,
            data_source=data_source,
            style=style,
            config=widget_data.get('config', {})
        )
    
    async def _save_dashboard(self, dashboard: Dashboard):
        """Save dashboard to database (placeholder)"""
        # In a real implementation, this would save to database
        pass
    
    async def _get_dashboard_by_id(self, dashboard_id: str, org_id: uuid.UUID) -> Optional[Dashboard]:
        """Get dashboard by ID (placeholder)"""
        # In a real implementation, this would query database
        return None
    
    async def _get_dashboards_by_org(self, org_id: uuid.UUID, 
                                   include_templates: bool) -> List[Dashboard]:
        """Get dashboards by organization (placeholder)"""
        # In a real implementation, this would query database
        return []
    
    async def _delete_dashboard(self, dashboard_id: str):
        """Delete dashboard from database (placeholder)"""
        # In a real implementation, this would delete from database
        pass
    
    async def _export_json(self, dashboard: Dashboard) -> Dict[str, Any]:
        """Export dashboard as JSON"""
        return {
            'format': 'json',
            'filename': f"{dashboard.name.replace(' ', '_')}.json",
            'data': dashboard.__dict__,
            'exported_at': datetime.utcnow().isoformat()
        }
    
    async def _export_pdf(self, dashboard: Dashboard) -> Dict[str, Any]:
        """Export dashboard as PDF (placeholder)"""
        # In a real implementation, this would generate PDF
        return {
            'format': 'pdf',
            'filename': f"{dashboard.name.replace(' ', '_')}.pdf",
            'data': base64.b64encode(b"PDF placeholder").decode(),
            'exported_at': datetime.utcnow().isoformat()
        }
    
    async def _export_png(self, dashboard: Dashboard) -> Dict[str, Any]:
        """Export dashboard as PNG (placeholder)"""
        # In a real implementation, this would generate PNG screenshot
        return {
            'format': 'png',
            'filename': f"{dashboard.name.replace(' ', '_')}.png",
            'data': base64.b64encode(b"PNG placeholder").decode(),
            'exported_at': datetime.utcnow().isoformat()
        }

# Create global dashboard manager instance
dashboard_manager = DashboardManager()

logger.info("Custom Dashboard Builder initialized with drag-and-drop capabilities")