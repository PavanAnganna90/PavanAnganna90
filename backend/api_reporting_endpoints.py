"""
OpsSight Reporting API Endpoints - v2.0.0
FastAPI endpoints for advanced reporting and scheduled exports

Features:
- Report generation and scheduling
- Multiple export formats support
- Template management
- Delivery configuration
- Report history and management
"""

from fastapi import APIRouter, Request, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime, timedelta
import uuid
import io

from pydantic import BaseModel, Field, EmailStr
from advanced_reporting import (
    reporting_engine, ReportType, ReportFormat, ReportFrequency, 
    DeliveryMethod, Report
)
from database import User, UserRole
from sso_integration import get_current_user
from rbac_system import require_permission

# Configure logging
logger = logging.getLogger(__name__)

# Create router
reporting_router = APIRouter(prefix="/reports", tags=["Advanced Reporting"])

# Pydantic models for request/response
class ReportScheduleModel(BaseModel):
    """Report schedule configuration"""
    frequency: str = Field(description="Frequency: once, daily, weekly, monthly, quarterly, custom_cron")
    cron_expression: Optional[str] = Field(default=None, description="Cron expression for custom scheduling")
    timezone: str = Field(default="UTC", description="Timezone for scheduling")
    active: bool = Field(default=True, description="Whether schedule is active")

class ReportDeliveryModel(BaseModel):
    """Report delivery configuration"""
    method: str = Field(description="Delivery method: email, download, s3_upload, webhook")
    recipients: List[EmailStr] = Field(default_factory=list, description="Email recipients")
    config: Dict[str, Any] = Field(default_factory=dict, description="Additional delivery configuration")

class CreateReportRequest(BaseModel):
    """Create report request"""
    name: str = Field(min_length=1, max_length=100, description="Report name")
    description: str = Field(max_length=500, description="Report description")
    type: str = Field(description="Report type")
    template_id: Optional[str] = Field(default=None, description="Template ID to use")
    format: str = Field(default="pdf", description="Export format: pdf, excel, csv, html, json")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Report filters")
    schedule: Optional[ReportScheduleModel] = Field(default=None, description="Schedule configuration")
    delivery: List[ReportDeliveryModel] = Field(default_factory=list, description="Delivery methods")

class UpdateReportRequest(BaseModel):
    """Update report request"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    filters: Optional[Dict[str, Any]] = Field(default=None)
    schedule: Optional[ReportScheduleModel] = Field(default=None)
    delivery: Optional[List[ReportDeliveryModel]] = Field(default=None)

class ReportResponse(BaseModel):
    """Report response model"""
    id: str
    name: str
    description: str
    type: str
    template_id: str
    format: str
    filters: Dict[str, Any]
    schedule: Optional[Dict[str, Any]]
    delivery: List[Dict[str, Any]]
    created_by: str
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]

class ReportListResponse(BaseModel):
    """Report list response"""
    reports: List[ReportResponse]
    total_count: int
    scheduled_count: int

class ReportHistoryEntry(BaseModel):
    """Report generation history entry"""
    id: str
    report_id: str
    generated_at: str
    format: str
    size_bytes: int
    delivered: bool
    delivery_methods: List[str]
    status: str
    error_message: Optional[str]

class GenerateReportRequest(BaseModel):
    """Generate report request"""
    time_range_start: Optional[datetime] = Field(default=None, description="Start of time range")
    time_range_end: Optional[datetime] = Field(default=None, description="End of time range")
    format: Optional[str] = Field(default=None, description="Override default format")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Additional filters")

# Report CRUD endpoints

@reporting_router.post("/", response_model=ReportResponse)
@require_permission("reporting:create")
async def create_report(
    request: CreateReportRequest,
    current_user: User = Depends(get_current_user)
) -> ReportResponse:
    """
    Create a new report configuration
    
    Args:
        request: Report creation parameters
        current_user: Authenticated user
        
    Returns:
        Created report details
    """
    try:
        # Validate report type
        try:
            report_type = ReportType(request.type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid report type")
        
        # Validate format
        try:
            report_format = ReportFormat(request.format)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid report format")
        
        # Convert request to dict
        report_data = request.dict()
        
        # Create report
        report = await reporting_engine.create_report(report_data, current_user)
        
        # Convert to response format
        response_data = {
            'id': report.id,
            'name': report.name,
            'description': report.description,
            'type': report.type.value,
            'template_id': report.template_id,
            'format': report.format.value,
            'filters': report.filters,
            'schedule': None,
            'delivery': [],
            'created_by': str(report.created_by),
            'created_at': report.created_at.isoformat(),
            'updated_at': report.updated_at.isoformat(),
            'metadata': report.metadata
        }
        
        if report.schedule:
            response_data['schedule'] = {
                'frequency': report.schedule.frequency.value,
                'cron_expression': report.schedule.cron_expression,
                'timezone': report.schedule.timezone,
                'next_run': report.schedule.next_run.isoformat() if report.schedule.next_run else None,
                'last_run': report.schedule.last_run.isoformat() if report.schedule.last_run else None,
                'active': report.schedule.active
            }
        
        for delivery in report.delivery:
            response_data['delivery'].append({
                'method': delivery.method.value,
                'recipients': delivery.recipients,
                'config': delivery.config
            })
        
        logger.info(f"Created report '{report.name}' for user {current_user.username}")
        return ReportResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create report: {e}")
        raise HTTPException(status_code=500, detail="Failed to create report")

@reporting_router.get("/", response_model=ReportListResponse)
@require_permission("reporting:read")
async def list_reports(
    report_type: Optional[str] = Query(default=None, description="Filter by report type"),
    scheduled_only: bool = Query(default=False, description="Show only scheduled reports"),
    current_user: User = Depends(get_current_user)
) -> ReportListResponse:
    """
    List reports for the current user's organization
    
    Args:
        report_type: Filter by report type
        scheduled_only: Show only scheduled reports
        current_user: Authenticated user
        
    Returns:
        List of reports
    """
    try:
        # Get all reports (simplified - would query from database)
        all_reports = list(reporting_engine.report_scheduler.scheduled_reports.values())
        
        # Filter by organization
        org_reports = [r for r in all_reports if r.organization_id == current_user.organization_id]
        
        # Apply filters
        if report_type:
            org_reports = [r for r in org_reports if r.type.value == report_type]
        
        if scheduled_only:
            org_reports = [r for r in org_reports if r.schedule is not None]
        
        # Convert to response format
        report_responses = []
        scheduled_count = 0
        
        for report in org_reports:
            if report.schedule:
                scheduled_count += 1
            
            response_data = {
                'id': report.id,
                'name': report.name,
                'description': report.description,
                'type': report.type.value,
                'template_id': report.template_id,
                'format': report.format.value,
                'filters': report.filters,
                'schedule': None,
                'delivery': [],
                'created_by': str(report.created_by),
                'created_at': report.created_at.isoformat(),
                'updated_at': report.updated_at.isoformat(),
                'metadata': report.metadata
            }
            
            if report.schedule:
                response_data['schedule'] = {
                    'frequency': report.schedule.frequency.value,
                    'active': report.schedule.active,
                    'next_run': report.schedule.next_run.isoformat() if report.schedule.next_run else None
                }
            
            report_responses.append(ReportResponse(**response_data))
        
        return ReportListResponse(
            reports=report_responses,
            total_count=len(report_responses),
            scheduled_count=scheduled_count
        )
        
    except Exception as e:
        logger.error(f"Failed to list reports: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve reports")

@reporting_router.get("/{report_id}", response_model=ReportResponse)
@require_permission("reporting:read")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
) -> ReportResponse:
    """
    Get a specific report configuration
    
    Args:
        report_id: Report ID
        current_user: Authenticated user
        
    Returns:
        Report details
    """
    try:
        # Get report (simplified - would query from database)
        report = reporting_engine.report_scheduler.scheduled_reports.get(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Check permissions
        if report.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Convert to response format
        response_data = {
            'id': report.id,
            'name': report.name,
            'description': report.description,
            'type': report.type.value,
            'template_id': report.template_id,
            'format': report.format.value,
            'filters': report.filters,
            'schedule': None,
            'delivery': [],
            'created_by': str(report.created_by),
            'created_at': report.created_at.isoformat(),
            'updated_at': report.updated_at.isoformat(),
            'metadata': report.metadata
        }
        
        if report.schedule:
            response_data['schedule'] = {
                'frequency': report.schedule.frequency.value,
                'cron_expression': report.schedule.cron_expression,
                'timezone': report.schedule.timezone,
                'next_run': report.schedule.next_run.isoformat() if report.schedule.next_run else None,
                'last_run': report.schedule.last_run.isoformat() if report.schedule.last_run else None,
                'active': report.schedule.active
            }
        
        for delivery in report.delivery:
            response_data['delivery'].append({
                'method': delivery.method.value,
                'recipients': delivery.recipients,
                'config': delivery.config
            })
        
        return ReportResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get report: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve report")

@reporting_router.delete("/{report_id}")
@require_permission("reporting:manage")
async def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Delete a report configuration
    
    Args:
        report_id: Report ID
        current_user: Authenticated user
        
    Returns:
        Deletion confirmation
    """
    try:
        # Get report
        report = reporting_engine.report_scheduler.scheduled_reports.get(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Check permissions
        if report.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if report.created_by != current_user.id and current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Remove from scheduler
        del reporting_engine.report_scheduler.scheduled_reports[report_id]
        
        logger.info(f"Deleted report {report.name}")
        return {
            "message": "Report deleted successfully",
            "deleted_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete report: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete report")

# Report generation endpoints

@reporting_router.post("/{report_id}/generate")
@require_permission("reporting:create")
async def generate_report(
    report_id: str,
    request: GenerateReportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generate a report on-demand
    
    Args:
        report_id: Report ID
        request: Generation parameters
        background_tasks: FastAPI background tasks
        current_user: Authenticated user
        
    Returns:
        Generation task information
    """
    try:
        # Get report configuration
        report = reporting_engine.report_scheduler.scheduled_reports.get(report_id)
        if not report:
            # Allow ad-hoc generation for testing
            if report_id not in ['executive_summary', 'infrastructure_health']:
                raise HTTPException(status_code=404, detail="Report not found")
        
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        
        # Schedule background generation
        background_tasks.add_task(
            _generate_report_background,
            report_id,
            current_user,
            request.dict(),
            task_id
        )
        
        logger.info(f"Scheduled report generation for {report_id}")
        
        return {
            "message": "Report generation started",
            "task_id": task_id,
            "status_url": f"/reports/tasks/{task_id}/status",
            "download_url": f"/reports/tasks/{task_id}/download",
            "estimated_time_seconds": 30
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@reporting_router.get("/{report_id}/download")
@require_permission("reporting:read")
async def download_report(
    report_id: str,
    format: Optional[str] = Query(default=None, description="Override default format"),
    current_user: User = Depends(get_current_user)
):
    """
    Download a generated report
    
    Args:
        report_id: Report ID
        format: Override report format
        current_user: Authenticated user
        
    Returns:
        Report file download
    """
    try:
        # Generate report
        report_bytes = await reporting_engine.generate_report(report_id, current_user)
        
        # Determine format and content type
        report = reporting_engine.report_scheduler.scheduled_reports.get(report_id)
        if report:
            report_format = format or report.format.value
            report_name = report.name
        else:
            report_format = format or 'pdf'
            report_name = report_id
        
        content_types = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv',
            'html': 'text/html',
            'json': 'application/json'
        }
        
        content_type = content_types.get(report_format, 'application/octet-stream')
        filename = f"{report_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{report_format}"
        
        return StreamingResponse(
            io.BytesIO(report_bytes),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to download report: {e}")
        raise HTTPException(status_code=500, detail="Failed to download report")

# Template endpoints

@reporting_router.get("/templates/list")
@require_permission("reporting:read")
async def list_report_templates(
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[Dict[str, Any]]]:
    """
    List available report templates
    
    Args:
        current_user: Authenticated user
        
    Returns:
        Available report templates
    """
    try:
        templates = []
        
        for template_id, template in reporting_engine.templates.items():
            templates.append({
                'id': template.id,
                'name': template.name,
                'type': template.type.value,
                'sections_count': len(template.sections),
                'description': f"Template for {template.type.value.replace('_', ' ').title()} reports"
            })
        
        return {'templates': templates}
        
    except Exception as e:
        logger.error(f"Failed to list templates: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve templates")

# Report types and formats endpoints

@reporting_router.get("/types")
async def get_report_types() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get available report types
    
    Returns:
        Available report types with descriptions
    """
    report_types = [
        {
            'type': ReportType.EXECUTIVE_SUMMARY.value,
            'name': 'Executive Summary',
            'description': 'High-level overview for executives and stakeholders',
            'icon': 'chart-line'
        },
        {
            'type': ReportType.INFRASTRUCTURE_HEALTH.value,
            'name': 'Infrastructure Health',
            'description': 'Detailed infrastructure health and performance metrics',
            'icon': 'server'
        },
        {
            'type': ReportType.APPLICATION_PERFORMANCE.value,
            'name': 'Application Performance',
            'description': 'Application performance metrics and analysis',
            'icon': 'code'
        },
        {
            'type': ReportType.SECURITY_COMPLIANCE.value,
            'name': 'Security & Compliance',
            'description': 'Security posture and compliance status',
            'icon': 'shield-check'
        },
        {
            'type': ReportType.COST_ANALYSIS.value,
            'name': 'Cost Analysis',
            'description': 'Infrastructure and service cost breakdown',
            'icon': 'dollar-sign'
        },
        {
            'type': ReportType.INCIDENT_SUMMARY.value,
            'name': 'Incident Summary',
            'description': 'Incident reports and resolution metrics',
            'icon': 'alert-triangle'
        },
        {
            'type': ReportType.SLA_COMPLIANCE.value,
            'name': 'SLA Compliance',
            'description': 'Service level agreement compliance tracking',
            'icon': 'clipboard-check'
        },
        {
            'type': ReportType.CAPACITY_PLANNING.value,
            'name': 'Capacity Planning',
            'description': 'Resource utilization and capacity projections',
            'icon': 'trending-up'
        }
    ]
    
    return {'report_types': report_types}

@reporting_router.get("/formats")
async def get_report_formats() -> Dict[str, List[Dict[str, Any]]]:
    """
    Get available report formats
    
    Returns:
        Available export formats with descriptions
    """
    formats = [
        {
            'format': ReportFormat.PDF.value,
            'name': 'PDF',
            'description': 'Portable Document Format - best for printing and sharing',
            'mime_type': 'application/pdf',
            'extension': '.pdf'
        },
        {
            'format': ReportFormat.EXCEL.value,
            'name': 'Excel',
            'description': 'Microsoft Excel - best for data analysis',
            'mime_type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'extension': '.xlsx'
        },
        {
            'format': ReportFormat.CSV.value,
            'name': 'CSV',
            'description': 'Comma-separated values - universal data format',
            'mime_type': 'text/csv',
            'extension': '.csv'
        },
        {
            'format': ReportFormat.HTML.value,
            'name': 'HTML',
            'description': 'Web page format - best for online viewing',
            'mime_type': 'text/html',
            'extension': '.html'
        },
        {
            'format': ReportFormat.JSON.value,
            'name': 'JSON',
            'description': 'JavaScript Object Notation - best for API integration',
            'mime_type': 'application/json',
            'extension': '.json'
        }
    ]
    
    return {'formats': formats}

# Background task function
async def _generate_report_background(report_id: str, user: User, 
                                    params: Dict[str, Any], task_id: str):
    """Background task to generate report"""
    try:
        # Generate report
        report_bytes = await reporting_engine.generate_report(report_id, user)
        
        # Store result (in practice, would use cache or database)
        # For now, just log success
        logger.info(f"Report {report_id} generated successfully for task {task_id}")
        
    except Exception as e:
        logger.error(f"Background report generation failed for task {task_id}: {e}")

# Health check endpoint
@reporting_router.get("/health")
async def reporting_health_check() -> Dict[str, Any]:
    """
    Reporting service health check
    
    Returns:
        Health status of reporting service
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'report_generator': 'operational',
                'report_scheduler': 'operational',
                'data_collector': 'operational'
            },
            'scheduler': {
                'running': reporting_engine.report_scheduler.running,
                'scheduled_reports': len(reporting_engine.report_scheduler.scheduled_reports)
            },
            'templates': {
                'available': len(reporting_engine.templates)
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Reporting health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

logger.info("Reporting API endpoints initialized successfully")