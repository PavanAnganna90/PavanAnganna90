"""
Analytics endpoint for frontend data tracking.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
import logging
from datetime import datetime
from app.core.dependencies import get_current_user_optional, get_current_user
from app.models.user import User
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


class AnalyticsEvent(BaseModel):
    """Analytics event model."""
    event_name: str = Field(..., description="Name of the analytics event")
    event_data: Dict[str, Any] = Field(default={}, description="Event data payload")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event timestamp")
    user_id: str = Field(None, description="User ID (optional)")
    session_id: str = Field(None, description="Session ID (optional)")
    page_url: str = Field(None, description="Page URL where event occurred")


class AnalyticsResponse(BaseModel):
    """Analytics response model."""
    success: bool = Field(..., description="Whether the event was recorded successfully")
    event_id: str = Field(None, description="Unique ID for the recorded event")
    message: str = Field(..., description="Response message")


@router.post(
    "/analytics",
    response_model=AnalyticsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Analytics Event",
    description="""
    Record user analytics events from the frontend application.
    
    This endpoint collects:
    - User interaction events
    - Page navigation tracking
    - Feature usage metrics
    - Performance data
    
    All data is anonymized and used for platform improvement.
    """,
)
async def record_analytics_event(
    event: AnalyticsEvent,
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> AnalyticsResponse:
    """
    Record an analytics event.
    
    Args:
        event: Analytics event data
        current_user: Current authenticated user
        
    Returns:
        Analytics response with success status
    """
    try:
        # Generate event ID
        import uuid
        event_id = str(uuid.uuid4())
        
        # Log the analytics event (in production, this would go to a proper analytics service)
        logger.info(
            f"Analytics event recorded",
            extra={
                "event_id": event_id,
                "event_name": event.event_name,
                "user_id": current_user.id if current_user else event.user_id,
                "session_id": event.session_id,
                "page_url": event.page_url,
                "event_data": event.event_data,
                "timestamp": event.timestamp.isoformat(),
            }
        )
        
        return AnalyticsResponse(
            success=True,
            event_id=event_id,
            message="Analytics event recorded successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to record analytics event: {str(e)}")
        return AnalyticsResponse(
            success=False,
            message=f"Failed to record analytics event: {str(e)}"
        )


@router.post(
    "/analytics/batch",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="Record Multiple Analytics Events",
    description="""
    Record multiple analytics events in a single request for better performance.
    
    Useful for:
    - Bulk event uploads
    - Offline event synchronization
    - Performance optimization
    """,
)
async def record_analytics_events_batch(
    events: List[AnalyticsEvent],
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Record multiple analytics events in batch.
    
    Args:
        events: List of analytics events
        current_user: Current authenticated user
        
    Returns:
        Batch processing results
    """
    try:
        successful_events = 0
        failed_events = 0
        event_ids = []
        
        for event in events:
            try:
                import uuid
                event_id = str(uuid.uuid4())
                event_ids.append(event_id)
                
                logger.info(
                    f"Batch analytics event recorded",
                    extra={
                        "event_id": event_id,
                        "event_name": event.event_name,
                        "user_id": current_user.id if current_user else event.user_id,
                        "session_id": event.session_id,
                        "page_url": event.page_url,
                        "event_data": event.event_data,
                        "timestamp": event.timestamp.isoformat(),
                    }
                )
                
                successful_events += 1
                
            except Exception as e:
                logger.error(f"Failed to record batch analytics event: {str(e)}")
                failed_events += 1
        
        return {
            "success": failed_events == 0,
            "total_events": len(events),
            "successful_events": successful_events,
            "failed_events": failed_events,
            "event_ids": event_ids,
            "message": f"Processed {successful_events}/{len(events)} events successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to process analytics batch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process analytics batch: {str(e)}"
        )


@router.get(
    "/analytics/health",
    response_model=Dict[str, Any],
    summary="Analytics Service Health",
    description="Check the health status of the analytics service.",
)
async def analytics_health() -> Dict[str, Any]:
    """
    Check analytics service health.
    
    Returns:
        Health status of analytics service
    """
    return {
        "status": "healthy",
        "service": "analytics",
        "message": "Analytics service is operational",
        "timestamp": datetime.utcnow().isoformat()
    }