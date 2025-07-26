"""
OpsSight Analytics API Endpoints - v2.0.0
FastAPI endpoints for advanced analytics and predictive insights

Features:
- Anomaly detection and alerting
- Predictive forecasting and capacity planning
- Historical trend analysis
- Metric correlation analysis
- Custom analytics dashboards
- Real-time analytics processing
"""

from fastapi import APIRouter, Request, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any, Union
import logging
from datetime import datetime, timedelta
import uuid

from pydantic import BaseModel, Field
from advanced_analytics import (
    analytics_engine, AnalyticsTimeRange, PredictionHorizon,
    AnomalyType, TimeSeriesData
)
from database import User, UserRole
from sso_integration import get_current_user
from rbac_system import require_permission

# Configure logging
logger = logging.getLogger(__name__)

# Create router
analytics_router = APIRouter(prefix="/analytics", tags=["Advanced Analytics"])

# Pydantic models for request/response
class AnalyticsRequest(BaseModel):
    """General analytics request"""
    service_id: str
    metric_name: str
    time_range: str = Field(default="24h", description="Time range: 1h, 6h, 24h, 7d, 30d, 90d")

class AnomalyDetectionRequest(BaseModel):
    """Anomaly detection request"""
    service_id: str
    metric_name: str
    time_range: str = "24h"
    sensitivity: float = Field(default=0.1, ge=0.0, le=1.0, description="Sensitivity: 0.0 (low) to 1.0 (high)")

class PredictionRequest(BaseModel):
    """Prediction request"""
    service_id: str
    metric_name: str
    prediction_horizon: str = Field(default="24h", description="Horizon: 1h, 6h, 24h, 7d, 30d")
    include_confidence: bool = True

class CorrelationRequest(BaseModel):
    """Correlation analysis request"""
    primary_metric: str
    service_ids: List[str]
    time_range: str = "24h"
    min_correlation: float = Field(default=0.5, ge=0.0, le=1.0)

class CustomAnalyticsRequest(BaseModel):
    """Custom analytics dashboard request"""
    dashboard_config: Dict[str, Any]
    time_range: str = "24h"
    refresh_interval: int = Field(default=300, description="Refresh interval in seconds")

class AnomalyResponse(BaseModel):
    """Anomaly detection response"""
    metric_name: str
    service_id: str
    total_anomalies: int
    anomalies_by_severity: Dict[str, int]
    recent_anomalies: List[Dict[str, Any]]
    analysis_summary: str

class PredictionResponse(BaseModel):
    """Prediction response"""
    metric_name: str
    service_id: str
    prediction_horizon: str
    model_accuracy: float
    predictions: List[Dict[str, Any]]
    insights: List[str]

class TrendResponse(BaseModel):
    """Trend analysis response"""
    metric_name: str
    service_id: str
    trend_direction: str
    trend_strength: float
    seasonal_patterns: Dict[str, Any]
    change_points_count: int
    summary: str

class CorrelationResponse(BaseModel):
    """Correlation analysis response"""
    primary_metric: str
    correlations: List[Dict[str, Any]]
    insights: List[str]

class ComprehensiveAnalysisResponse(BaseModel):
    """Comprehensive analysis response"""
    metric_name: str
    service_id: str
    time_range: str
    data_points: int
    analysis_timestamp: str
    anomalies: Dict[str, Any]
    predictions: Dict[str, Any]
    trends: Dict[str, Any]
    insights: List[str]
    recommendations: List[str]

# Analytics endpoints

@analytics_router.post("/anomalies/detect", response_model=AnomalyResponse)
@require_permission("metric:read")
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    current_user: User = Depends(get_current_user)
) -> AnomalyResponse:
    """
    Detect anomalies in metric data using advanced ML algorithms
    
    Args:
        request: Anomaly detection parameters
        current_user: Authenticated user
        
    Returns:
        Anomaly detection results with insights
    """
    try:
        # Validate time range
        try:
            time_range = AnalyticsTimeRange(request.time_range)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Get metrics data
        data = await analytics_engine.get_metrics_data(
            request.service_id, 
            request.metric_name, 
            time_range,
            current_user.organization_id
        )
        
        if not data:
            raise HTTPException(status_code=404, detail="No data found for the specified metric")
        
        # Detect anomalies
        anomalies = await analytics_engine.anomaly_detector.detect_anomalies(
            data, request.sensitivity
        )
        
        # Group by severity
        severity_counts = {
            'low': sum(1 for a in anomalies if a.severity == 'low'),
            'medium': sum(1 for a in anomalies if a.severity == 'medium'),
            'high': sum(1 for a in anomalies if a.severity == 'high'),
            'critical': sum(1 for a in anomalies if a.severity == 'critical')
        }
        
        # Recent anomalies (last 10)
        recent_anomalies = [
            {
                'timestamp': a.timestamp.isoformat(),
                'value': a.value,
                'anomaly_type': a.anomaly_type.value,
                'severity': a.severity,
                'confidence': a.confidence,
                'score': a.anomaly_score,
                'context': a.context
            } for a in anomalies[-10:]
        ]
        
        # Generate summary
        total_anomalies = len(anomalies)
        critical_count = severity_counts['critical']
        high_count = severity_counts['high']
        
        if critical_count > 0:
            summary = f"CRITICAL: {critical_count} critical anomalies detected requiring immediate attention"
        elif high_count > 0:
            summary = f"WARNING: {high_count} high-severity anomalies detected"
        elif total_anomalies > 0:
            summary = f"INFO: {total_anomalies} anomalies detected in the specified time range"
        else:
            summary = "No significant anomalies detected in the data"
        
        logger.info(f"Anomaly detection completed for {request.metric_name}: {total_anomalies} anomalies found")
        
        return AnomalyResponse(
            metric_name=request.metric_name,
            service_id=request.service_id,
            total_anomalies=total_anomalies,
            anomalies_by_severity=severity_counts,
            recent_anomalies=recent_anomalies,
            analysis_summary=summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(status_code=500, detail="Anomaly detection failed")

@analytics_router.post("/predictions/forecast", response_model=PredictionResponse)
@require_permission("metric:read")
async def forecast_metric(
    request: PredictionRequest,
    current_user: User = Depends(get_current_user)
) -> PredictionResponse:
    """
    Generate predictive forecasts for metric values using ML models
    
    Args:
        request: Prediction parameters
        current_user: Authenticated user
        
    Returns:
        Prediction results with confidence intervals
    """
    try:
        # Validate prediction horizon
        try:
            horizon = PredictionHorizon(request.prediction_horizon)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid prediction horizon")
        
        # Get historical data for training
        historical_range = AnalyticsTimeRange.LAST_7_DAYS  # Use more data for better predictions
        data = await analytics_engine.get_metrics_data(
            request.service_id,
            request.metric_name,
            historical_range,
            current_user.organization_id
        )
        
        if not data:
            raise HTTPException(status_code=404, detail="Insufficient historical data for prediction")
        
        # Generate predictions
        predictions = await analytics_engine.predictive_analytics.forecast_metric(data, horizon)
        
        if not predictions:
            raise HTTPException(status_code=400, detail="Unable to generate predictions with available data")
        
        # Format predictions
        formatted_predictions = []
        for pred in predictions[:100]:  # Limit to first 100 predictions
            pred_data = {
                'timestamp': pred.timestamp.isoformat(),
                'predicted_value': pred.predicted_value,
                'model_accuracy': pred.model_accuracy
            }
            
            if request.include_confidence:
                pred_data['confidence_interval'] = {
                    'lower': pred.confidence_interval[0],
                    'upper': pred.confidence_interval[1]
                }
                pred_data['feature_importance'] = pred.feature_importance
            
            formatted_predictions.append(pred_data)
        
        # Generate insights
        insights = []
        avg_accuracy = sum(p.model_accuracy for p in predictions) / len(predictions)
        
        if avg_accuracy > 0.8:
            insights.append("High prediction confidence - model is performing well")
        elif avg_accuracy > 0.6:
            insights.append("Moderate prediction confidence - monitor actual vs predicted")
        else:
            insights.append("Low prediction confidence - consider more historical data")
        
        # Trend insights
        values = [p.predicted_value for p in predictions[:20]]  # Next few hours
        if len(values) > 1:
            if values[-1] > values[0] * 1.1:
                insights.append("Predicted upward trend in the near term")
            elif values[-1] < values[0] * 0.9:
                insights.append("Predicted downward trend in the near term")
            else:
                insights.append("Predicted stable values in the near term")
        
        logger.info(f"Prediction completed for {request.metric_name}: {len(predictions)} data points generated")
        
        return PredictionResponse(
            metric_name=request.metric_name,
            service_id=request.service_id,
            prediction_horizon=request.prediction_horizon,
            model_accuracy=avg_accuracy,
            predictions=formatted_predictions,
            insights=insights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction generation failed")

@analytics_router.post("/trends/analyze", response_model=TrendResponse)
@require_permission("metric:read")
async def analyze_trends(
    request: AnalyticsRequest,
    current_user: User = Depends(get_current_user)
) -> TrendResponse:
    """
    Analyze historical trends and patterns in metric data
    
    Args:
        request: Trend analysis parameters
        current_user: Authenticated user
        
    Returns:
        Trend analysis results with seasonal patterns
    """
    try:
        # Validate time range
        try:
            time_range = AnalyticsTimeRange(request.time_range)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Get metrics data
        data = await analytics_engine.get_metrics_data(
            request.service_id,
            request.metric_name,
            time_range,
            current_user.organization_id
        )
        
        if not data:
            raise HTTPException(status_code=404, detail="No data found for trend analysis")
        
        # Analyze trends
        trends = await analytics_engine.trend_analyzer.analyze_trends(data, time_range)
        
        logger.info(f"Trend analysis completed for {request.metric_name}: {trends.trend_direction} trend detected")
        
        return TrendResponse(
            metric_name=trends.metric_name,
            service_id=trends.service_id,
            trend_direction=trends.trend_direction,
            trend_strength=trends.trend_strength,
            seasonal_patterns=trends.seasonal_patterns,
            change_points_count=len(trends.change_points),
            summary=trends.summary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trend analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Trend analysis failed")

@analytics_router.post("/correlations/analyze", response_model=CorrelationResponse)
@require_permission("metric:read")
async def analyze_correlations(
    request: CorrelationRequest,
    current_user: User = Depends(get_current_user)
) -> CorrelationResponse:
    """
    Analyze correlations between different metrics
    
    Args:
        request: Correlation analysis parameters
        current_user: Authenticated user
        
    Returns:
        Correlation analysis results
    """
    try:
        # Validate time range
        try:
            time_range = AnalyticsTimeRange(request.time_range)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Collect data for all metrics
        metrics_data = []
        for service_id in request.service_ids:
            # Get common metrics for each service
            common_metrics = ['cpu_usage', 'memory_usage', 'response_time', 'error_rate']
            
            for metric_name in common_metrics:
                data = await analytics_engine.get_metrics_data(
                    service_id, metric_name, time_range, current_user.organization_id
                )
                if data:
                    metrics_data.append(data)
        
        if len(metrics_data) < 2:
            raise HTTPException(status_code=400, detail="Insufficient metrics data for correlation analysis")
        
        # Analyze correlations
        correlations = await analytics_engine.correlation_analyzer.analyze_correlations(
            request.primary_metric, metrics_data, request.min_correlation
        )
        
        # Format correlations
        formatted_correlations = []
        for corr in correlations:
            formatted_correlations.append({
                'primary_metric': corr.primary_metric,
                'correlated_metrics': corr.correlated_metrics,
                'correlation_strength': corr.correlation_strength,
                'causality_direction': corr.causality_direction,
                'lag_minutes': corr.lag_minutes
            })
        
        # Generate insights
        insights = []
        strong_correlations = [c for c in correlations if abs(c.correlation_strength) > 0.7]
        
        if strong_correlations:
            insights.append(f"Found {len(strong_correlations)} strong correlations")
            for corr in strong_correlations[:3]:  # Top 3
                direction = "positively" if corr.correlation_strength > 0 else "negatively"
                insights.append(f"{corr.primary_metric} is {direction} correlated with {corr.correlated_metrics[0]['metric_name']}")
        else:
            insights.append("No strong correlations found with the specified threshold")
        
        logger.info(f"Correlation analysis completed: {len(correlations)} correlations found")
        
        return CorrelationResponse(
            primary_metric=request.primary_metric,
            correlations=formatted_correlations,
            insights=insights
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Correlation analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Correlation analysis failed")

@analytics_router.post("/comprehensive", response_model=ComprehensiveAnalysisResponse)
@require_permission("metric:read")
async def comprehensive_analysis(
    request: AnalyticsRequest,
    current_user: User = Depends(get_current_user)
) -> ComprehensiveAnalysisResponse:
    """
    Perform comprehensive analysis including anomalies, predictions, and trends
    
    Args:
        request: Analysis parameters
        current_user: Authenticated user
        
    Returns:
        Complete analysis results with insights and recommendations
    """
    try:
        # Validate time range
        try:
            time_range = AnalyticsTimeRange(request.time_range)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time range")
        
        # Perform comprehensive analysis
        analysis = await analytics_engine.comprehensive_analysis(
            request.service_id,
            request.metric_name,
            time_range,
            current_user.organization_id
        )
        
        if 'error' in analysis:
            raise HTTPException(status_code=400, detail=analysis['error'])
        
        # Generate insights
        insights = []
        recommendations = []
        
        # Anomaly insights
        anomaly_count = analysis['anomalies']['total_count']
        if anomaly_count > 0:
            critical_count = analysis['anomalies']['by_severity'].get('critical', 0)
            if critical_count > 0:
                insights.append(f"CRITICAL: {critical_count} critical anomalies require immediate attention")
                recommendations.append("Investigate critical anomalies and implement immediate fixes")
            else:
                insights.append(f"Detected {anomaly_count} anomalies in the time period")
                recommendations.append("Monitor anomalies and establish alert thresholds")
        
        # Trend insights
        trend_direction = analysis['trends']['direction']
        trend_strength = analysis['trends']['strength']
        
        if trend_direction == 'increasing' and trend_strength > 0.5:
            insights.append("Strong upward trend detected - potential capacity issues")
            recommendations.append("Consider scaling resources or optimizing performance")
        elif trend_direction == 'decreasing' and trend_strength > 0.5:
            insights.append("Strong downward trend detected")
            recommendations.append("Investigate potential performance improvements or reduced usage")
        elif trend_direction == 'volatile':
            insights.append("High volatility detected in metric values")
            recommendations.append("Investigate root causes of instability")
        
        # Prediction insights
        prediction_count = analysis['predictions']['total_count']
        if prediction_count > 0:
            insights.append(f"Generated {prediction_count} predictions for capacity planning")
            recommendations.append("Use predictions for proactive resource management")
        
        # Seasonal pattern insights
        seasonal_patterns = analysis['trends']['seasonal_patterns']
        if 'daily' in seasonal_patterns:
            peak_hour = seasonal_patterns['daily']['peak_hour']
            insights.append(f"Daily peak usage occurs at hour {peak_hour}")
            recommendations.append("Schedule maintenance outside peak hours")
        
        logger.info(f"Comprehensive analysis completed for {request.metric_name}")
        
        return ComprehensiveAnalysisResponse(
            metric_name=analysis['metric_name'],
            service_id=analysis['service_id'],
            time_range=analysis['time_range'],
            data_points=analysis['data_points'],
            analysis_timestamp=analysis['analysis_timestamp'],
            anomalies=analysis['anomalies'],
            predictions=analysis['predictions'],
            trends=analysis['trends'],
            insights=insights,
            recommendations=recommendations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comprehensive analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Comprehensive analysis failed")

# Background analysis endpoints

@analytics_router.post("/background/schedule-analysis")
@require_permission("metric:manage")
async def schedule_background_analysis(
    background_tasks: BackgroundTasks,
    service_ids: List[str] = Query(..., description="Service IDs to analyze"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, str]:
    """
    Schedule background analysis for multiple services
    
    Args:
        background_tasks: FastAPI background tasks
        service_ids: List of service IDs to analyze
        current_user: Authenticated user
        
    Returns:
        Scheduled analysis confirmation
    """
    try:
        # Schedule background analysis for each service
        for service_id in service_ids:
            background_tasks.add_task(
                _run_background_analysis,
                service_id,
                current_user.organization_id,
                current_user.id
            )
        
        logger.info(f"Scheduled background analysis for {len(service_ids)} services")
        
        return {
            "message": f"Background analysis scheduled for {len(service_ids)} services",
            "scheduled_by": current_user.username,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to schedule background analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule background analysis")

async def _run_background_analysis(service_id: str, org_id: uuid.UUID, user_id: uuid.UUID):
    """Run background analysis for a service"""
    try:
        # Common metrics to analyze
        metrics_to_analyze = ['cpu_usage', 'memory_usage', 'response_time', 'error_rate']
        
        for metric_name in metrics_to_analyze:
            # Run comprehensive analysis
            analysis = await analytics_engine.comprehensive_analysis(
                service_id, metric_name, AnalyticsTimeRange.LAST_24_HOURS, org_id
            )
            
            if 'error' not in analysis:
                # Store analysis results or trigger alerts if needed
                # This could be enhanced to create alerts for critical anomalies
                critical_anomalies = analysis['anomalies']['by_severity'].get('critical', 0)
                if critical_anomalies > 0:
                    logger.warning(f"Background analysis detected {critical_anomalies} critical anomalies in {service_id}:{metric_name}")
        
    except Exception as e:
        logger.error(f"Background analysis failed for service {service_id}: {e}")

# Analytics dashboard endpoints

@analytics_router.get("/dashboard/metrics-overview")
@require_permission("metric:read")
async def get_metrics_overview(
    time_range: str = Query("24h", description="Time range for overview"),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get analytics overview for dashboard
    
    Args:
        time_range: Time range for analysis
        current_user: Authenticated user
        
    Returns:
        Analytics overview data
    """
    try:
        # This is a simplified overview - in practice, you'd aggregate data from multiple services
        overview = {
            'timestamp': datetime.utcnow().isoformat(),
            'time_range': time_range,
            'summary': {
                'total_services_analyzed': 0,
                'total_anomalies_detected': 0,
                'critical_alerts': 0,
                'prediction_accuracy': 0.0
            },
            'top_anomalies': [],
            'trend_summary': {},
            'capacity_alerts': []
        }
        
        # In a real implementation, you would:
        # 1. Query all services for the organization
        # 2. Run analysis on key metrics
        # 3. Aggregate results for dashboard
        
        return overview
        
    except Exception as e:
        logger.error(f"Failed to get metrics overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve metrics overview")

# Health check endpoint
@analytics_router.get("/health")
async def analytics_health_check() -> Dict[str, Any]:
    """
    Analytics service health check
    
    Returns:
        Health status of analytics service
    """
    try:
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'components': {
                'anomaly_detector': 'operational',
                'predictive_analytics': 'operational',
                'trend_analyzer': 'operational',
                'correlation_analyzer': 'operational'
            },
            'models': {
                'loaded_models': len(analytics_engine.predictive_analytics.models),
                'anomaly_models': len(analytics_engine.anomaly_detector.models)
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        return {
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }

logger.info("Analytics API endpoints initialized successfully")