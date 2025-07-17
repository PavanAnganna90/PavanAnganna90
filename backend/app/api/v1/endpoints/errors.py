"""
Error tracking endpoint for frontend error reporting.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, Field
import logging
from datetime import datetime
from app.core.dependencies import get_current_user_optional, get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


class ErrorReport(BaseModel):
    """Error report model."""
    error_message: str = Field(..., description="Error message")
    error_stack: Optional[str] = Field(None, description="Error stack trace")
    error_type: str = Field(..., description="Type of error (e.g., 'javascript', 'network', 'validation')")
    page_url: str = Field(..., description="URL where error occurred")
    user_agent: Optional[str] = Field(None, description="Browser user agent")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    user_id: Optional[str] = Field(None, description="User ID (if authenticated)")
    session_id: Optional[str] = Field(None, description="Session ID")
    severity: str = Field(default="error", description="Error severity level")
    context: Dict[str, Any] = Field(default={}, description="Additional error context")


class ErrorResponse(BaseModel):
    """Error response model."""
    success: bool = Field(..., description="Whether the error was recorded successfully")
    error_id: str = Field(None, description="Unique ID for the recorded error")
    message: str = Field(..., description="Response message")


@router.post(
    "/errors",
    response_model=ErrorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report Frontend Error",
    description="""
    Report frontend errors for monitoring and debugging.
    
    This endpoint collects:
    - JavaScript errors and exceptions
    - Network request failures
    - User interface errors
    - Performance issues
    
    Error data is used for debugging and platform improvement.
    """,
)
async def report_error(
    request: Request,
    error: ErrorReport,
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> ErrorResponse:
    """
    Report a frontend error.
    
    Args:
        request: FastAPI request object
        error: Error report data
        current_user: Current authenticated user (optional)
        
    Returns:
        Error response with success status
    """
    try:
        # Generate error ID
        import uuid
        error_id = str(uuid.uuid4())
        
        # Get client IP
        client_ip = request.client.host if request.client else None
        
        # Log the error with security context
        logger.error(
            f"Frontend error reported",
            extra={
                "error_id": error_id,
                "error_message": error.error_message,
                "error_type": error.error_type,
                "error_stack": error.error_stack,
                "page_url": error.page_url,
                "user_agent": error.user_agent,
                "user_id": current_user.id if current_user else error.user_id,
                "session_id": error.session_id,
                "severity": error.severity,
                "context": error.context,
                "client_ip": client_ip,
                "timestamp": error.timestamp.isoformat(),
            }
        )
        
        # Security logging for error tracking
        logger.info(
            f"[Security] Error report from {client_ip}",
            extra={
                "event_type": "error_report",
                "client_ip": client_ip,
                "user_id": current_user.id if current_user else None,
                "error_type": error.error_type,
                "page_url": error.page_url,
            }
        )
        
        return ErrorResponse(
            success=True,
            error_id=error_id,
            message="Error reported successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to report error: {str(e)}")
        return ErrorResponse(
            success=False,
            message=f"Failed to report error: {str(e)}"
        )


@router.post(
    "/errors/batch",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Report Multiple Errors",
    description="""
    Report multiple frontend errors in a single request.
    
    Useful for:
    - Bulk error uploads
    - Offline error synchronization
    - Performance optimization
    """,
)
async def report_errors_batch(
    request: Request,
    errors: List[ErrorReport],
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Report multiple frontend errors in batch.
    
    Args:
        request: FastAPI request object
        errors: List of error reports
        current_user: Current authenticated user (optional)
        
    Returns:
        Batch processing results
    """
    try:
        successful_errors = 0
        failed_errors = 0
        error_ids = []
        client_ip = request.client.host if request.client else None
        
        for error in errors:
            try:
                import uuid
                error_id = str(uuid.uuid4())
                error_ids.append(error_id)
                
                logger.error(
                    f"Batch frontend error reported",
                    extra={
                        "error_id": error_id,
                        "error_message": error.error_message,
                        "error_type": error.error_type,
                        "error_stack": error.error_stack,
                        "page_url": error.page_url,
                        "user_agent": error.user_agent,
                        "user_id": current_user.id if current_user else error.user_id,
                        "session_id": error.session_id,
                        "severity": error.severity,
                        "context": error.context,
                        "client_ip": client_ip,
                        "timestamp": error.timestamp.isoformat(),
                    }
                )
                
                successful_errors += 1
                
            except Exception as e:
                logger.error(f"Failed to report batch error: {str(e)}")
                failed_errors += 1
        
        # Security logging for batch error reporting
        logger.info(
            f"[Security] Batch error report from {client_ip}",
            extra={
                "event_type": "batch_error_report",
                "client_ip": client_ip,
                "user_id": current_user.id if current_user else None,
                "total_errors": len(errors),
                "successful_errors": successful_errors,
                "failed_errors": failed_errors,
            }
        )
        
        return {
            "success": failed_errors == 0,
            "total_errors": len(errors),
            "successful_errors": successful_errors,
            "failed_errors": failed_errors,
            "error_ids": error_ids,
            "message": f"Processed {successful_errors}/{len(errors)} errors successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to process error batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process error batch: {str(e)}"
        )


@router.get(
    "/errors/health",
    response_model=Dict[str, Any],
    summary="Error Tracking Service Health",
    description="Check the health status of the error tracking service.",
)
async def error_tracking_health() -> Dict[str, Any]:
    """
    Check error tracking service health.
    
    Returns:
        Health status of error tracking service
    """
    return {
        "status": "healthy",
        "service": "error_tracking",
        "message": "Error tracking service is operational",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get(
    "/errors/stats",
    response_model=Dict[str, Any],
    summary="Error Statistics",
    description="Get error statistics and trends.",
)
async def get_error_stats(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Get error statistics.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Error statistics and trends
    """
    # In a real implementation, this would query a database or analytics service
    return {
        "total_errors_today": 0,
        "error_types": {
            "javascript": 0,
            "network": 0,
            "validation": 0
        },
        "severity_breakdown": {
            "critical": 0,
            "error": 0,
            "warning": 0,
            "info": 0
        },
        "message": "Error statistics retrieved successfully",
        "timestamp": datetime.utcnow().isoformat()
    }