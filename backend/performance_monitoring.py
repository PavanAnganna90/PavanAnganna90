#!/usr/bin/env python3
"""
Performance Monitoring and Optimization Service
Advanced system performance monitoring, anomaly detection, and optimization alerts
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import logging
import random
import uuid
from enum import Enum
import statistics

class AlertSeverity(Enum):
    """Performance alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

class MetricType(Enum):
    """Types of performance metrics"""
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    DATABASE = "database"
    APPLICATION = "application"
    KUBERNETES = "kubernetes"

class AlertStatus(Enum):
    """Alert status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"

@dataclass
class PerformanceMetric:
    """Performance metric data point"""
    id: str
    metric_type: MetricType
    name: str
    value: float
    unit: str
    timestamp: datetime
    hostname: str
    service: str
    tags: Dict[str, str]
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None

@dataclass
class PerformanceAlert:
    """Performance alert"""
    id: str
    metric_name: str
    severity: AlertSeverity
    status: AlertStatus
    message: str
    description: str
    current_value: float
    threshold_value: float
    service: str
    hostname: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    auto_resolution: bool = False
    runbook_url: Optional[str] = None
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

@dataclass
class OptimizationRecommendation:
    """System optimization recommendation"""
    id: str
    category: str
    title: str
    description: str
    impact: str  # low, medium, high
    effort: str  # low, medium, high
    savings_estimate: Optional[str]
    implementation_steps: List[str]
    affected_services: List[str]
    priority_score: int
    created_at: datetime
    implemented: bool = False

class PerformanceMonitoringService:
    """Advanced performance monitoring service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize monitoring data
        self.current_metrics: Dict[str, List[PerformanceMetric]] = {}
        self.historical_metrics: Dict[str, List[PerformanceMetric]] = {}
        self.active_alerts: List[PerformanceAlert] = []
        self.alert_history: List[PerformanceAlert] = []
        self.optimization_recommendations: List[OptimizationRecommendation] = []
        
        # Anomaly detection baselines
        self.baselines: Dict[str, Dict[str, float]] = {}
        
        # Generate demo data
        self._initialize_demo_data()
        
    def _initialize_demo_data(self):
        """Initialize with demonstration data"""
        # Generate baseline metrics for anomaly detection
        self._generate_baselines()
        
        # Generate current metrics
        self._generate_current_metrics()
        
        # Generate alerts
        self._generate_demo_alerts()
        
        # Generate optimization recommendations
        self._generate_optimization_recommendations()
    
    def _generate_baselines(self):
        """Generate baseline performance metrics for anomaly detection"""
        services = ["opssight-frontend", "opssight-backend", "postgres", "redis", "nginx"]
        
        for service in services:
            self.baselines[service] = {
                "cpu_usage": random.uniform(15, 35),
                "memory_usage": random.uniform(40, 70),
                "disk_usage": random.uniform(20, 50),
                "network_in": random.uniform(50, 150),
                "network_out": random.uniform(30, 100),
                "response_time": random.uniform(50, 200),
                "error_rate": random.uniform(0.1, 2.0)
            }
    
    def _generate_current_metrics(self):
        """Generate current performance metrics"""
        services = ["opssight-frontend", "opssight-backend", "postgres", "redis", "nginx"]
        hostnames = ["prod-web-01", "prod-web-02", "prod-db-01", "prod-cache-01", "prod-lb-01"]
        
        # Generate metrics for the last hour
        for i in range(60):  # 60 data points (1 per minute)
            timestamp = datetime.utcnow() - timedelta(minutes=59-i)
            
            for service, hostname in zip(services, hostnames):
                baseline = self.baselines[service]
                
                # Add some variance and occasional spikes
                variance_factor = random.uniform(0.8, 1.2)
                spike_chance = random.random()
                spike_factor = random.uniform(1.5, 3.0) if spike_chance < 0.05 else 1.0
                
                metrics = [
                    PerformanceMetric(
                        id=str(uuid.uuid4()),
                        metric_type=MetricType.CPU,
                        name="cpu_usage_percent",
                        value=min(baseline["cpu_usage"] * variance_factor * spike_factor, 100),
                        unit="percent",
                        timestamp=timestamp,
                        hostname=hostname,
                        service=service,
                        tags={"environment": "production", "region": "us-east-1"},
                        threshold_warning=80.0,
                        threshold_critical=90.0
                    ),
                    PerformanceMetric(
                        id=str(uuid.uuid4()),
                        metric_type=MetricType.MEMORY,
                        name="memory_usage_percent",
                        value=min(baseline["memory_usage"] * variance_factor * spike_factor, 95),
                        unit="percent",
                        timestamp=timestamp,
                        hostname=hostname,
                        service=service,
                        tags={"environment": "production", "region": "us-east-1"},
                        threshold_warning=80.0,
                        threshold_critical=90.0
                    ),
                    PerformanceMetric(
                        id=str(uuid.uuid4()),
                        metric_type=MetricType.APPLICATION,
                        name="response_time_ms",
                        value=baseline["response_time"] * variance_factor * spike_factor,
                        unit="milliseconds",
                        timestamp=timestamp,
                        hostname=hostname,
                        service=service,
                        tags={"environment": "production", "endpoint": "/api/v1/metrics"},
                        threshold_warning=500.0,
                        threshold_critical=1000.0
                    )
                ]
                
                for metric in metrics:
                    metric_key = f"{service}_{metric.name}"
                    if metric_key not in self.current_metrics:
                        self.current_metrics[metric_key] = []
                    self.current_metrics[metric_key].append(metric)
    
    def _generate_demo_alerts(self):
        """Generate demonstration alerts"""
        alert_templates = [
            {
                "metric_name": "cpu_usage_percent",
                "severity": AlertSeverity.CRITICAL,
                "message": "High CPU usage detected",
                "description": "CPU usage has exceeded 85% for more than 5 minutes",
                "current_value": 87.3,
                "threshold_value": 85.0,
                "service": "opssight-backend",
                "hostname": "prod-web-02",
                "runbook_url": "https://runbooks.opssight.dev/high-cpu"
            },
            {
                "metric_name": "memory_usage_percent",
                "severity": AlertSeverity.WARNING,
                "message": "Memory usage approaching limit",
                "description": "Memory usage has exceeded 75% threshold",
                "current_value": 78.5,
                "threshold_value": 75.0,
                "service": "postgres",
                "hostname": "prod-db-01",
                "runbook_url": "https://runbooks.opssight.dev/memory-pressure"
            },
            {
                "metric_name": "response_time_ms",
                "severity": AlertSeverity.WARNING,
                "message": "API response time degraded",
                "description": "Average response time has exceeded 800ms for the past 10 minutes",
                "current_value": 850.2,
                "threshold_value": 500.0,
                "service": "opssight-frontend",
                "hostname": "prod-web-01",
                "runbook_url": "https://runbooks.opssight.dev/slow-response"
            },
            {
                "metric_name": "disk_usage_percent",
                "severity": AlertSeverity.CRITICAL,
                "message": "Disk space critically low",
                "description": "Disk usage has exceeded 90% on /var/log partition",
                "current_value": 92.1,
                "threshold_value": 90.0,
                "service": "nginx",
                "hostname": "prod-lb-01",
                "runbook_url": "https://runbooks.opssight.dev/disk-cleanup"
            },
            {
                "metric_name": "error_rate_percent",
                "severity": AlertSeverity.WARNING,
                "message": "Elevated error rate",
                "description": "Error rate has increased to 4.2% over the last 15 minutes",
                "current_value": 4.2,
                "threshold_value": 3.0,
                "service": "opssight-backend",
                "hostname": "prod-web-02",
                "runbook_url": "https://runbooks.opssight.dev/error-spike"
            }
        ]
        
        for i, template in enumerate(alert_templates):
            created_time = datetime.utcnow() - timedelta(minutes=random.randint(5, 120))
            
            alert = PerformanceAlert(
                id=f"alert_{i+1:03d}",
                metric_name=template["metric_name"],
                severity=template["severity"],
                status=AlertStatus.ACTIVE if i < 3 else AlertStatus.ACKNOWLEDGED,
                message=template["message"],
                description=template["description"],
                current_value=template["current_value"],
                threshold_value=template["threshold_value"],
                service=template["service"],
                hostname=template["hostname"],
                created_at=created_time,
                acknowledged_at=created_time + timedelta(minutes=10) if i >= 3 else None,
                acknowledged_by="alex_kumar" if i >= 3 else None,
                runbook_url=template["runbook_url"],
                tags={"environment": "production", "region": "us-east-1"}
            )
            
            self.active_alerts.append(alert)
    
    def _generate_optimization_recommendations(self):
        """Generate optimization recommendations"""
        recommendations = [
            {
                "category": "Resource Optimization",
                "title": "Right-size database instances",
                "description": "PostgreSQL instances are over-provisioned with 40% average CPU utilization. Consider downsizing to save costs.",
                "impact": "medium",
                "effort": "low",
                "savings_estimate": "$1,200/month",
                "implementation_steps": [
                    "Analyze 30-day CPU and memory usage patterns",
                    "Test performance with smaller instance sizes in staging",
                    "Schedule maintenance window for production migration",
                    "Monitor performance post-migration"
                ],
                "affected_services": ["postgres"],
                "priority_score": 75
            },
            {
                "category": "Performance Tuning",
                "title": "Implement Redis caching for API responses",
                "description": "API response times can be improved by 60% with strategic caching of frequently accessed data.",
                "impact": "high",
                "effort": "medium",
                "savings_estimate": "Improved user experience",
                "implementation_steps": [
                    "Identify most frequently accessed API endpoints",
                    "Design cache invalidation strategy",
                    "Implement caching layer with Redis",
                    "Monitor cache hit rates and performance gains"
                ],
                "affected_services": ["opssight-backend", "redis"],
                "priority_score": 85
            },
            {
                "category": "Capacity Planning",
                "title": "Scale frontend servers horizontally",
                "description": "Frontend servers are approaching capacity limits during peak hours. Add 2 additional instances.",
                "impact": "high",
                "effort": "low",
                "savings_estimate": "Prevent outages",
                "implementation_steps": [
                    "Provision 2 additional frontend server instances",
                    "Update load balancer configuration",
                    "Verify traffic distribution",
                    "Monitor performance during peak hours"
                ],
                "affected_services": ["opssight-frontend", "nginx"],
                "priority_score": 90
            },
            {
                "category": "Cost Optimization",
                "title": "Optimize log retention policies",
                "description": "Current log retention of 90 days is excessive. Reduce to 30 days for non-critical logs.",
                "impact": "low",
                "effort": "low",
                "savings_estimate": "$300/month",
                "implementation_steps": [
                    "Review log categories and compliance requirements",
                    "Update log rotation policies",
                    "Implement automated cleanup jobs",
                    "Monitor disk usage improvements"
                ],
                "affected_services": ["nginx", "opssight-backend"],
                "priority_score": 60
            },
            {
                "category": "Security Optimization",
                "title": "Enable database connection pooling",
                "description": "Database connections are not pooled, leading to connection exhaustion under load.",
                "impact": "medium",
                "effort": "medium",
                "savings_estimate": "Improved stability",
                "implementation_steps": [
                    "Configure PgBouncer connection pooler",
                    "Update application connection strings",
                    "Test connection limits and performance",
                    "Monitor connection pool metrics"
                ],
                "affected_services": ["postgres", "opssight-backend"],
                "priority_score": 80
            }
        ]
        
        for i, rec in enumerate(recommendations):
            recommendation = OptimizationRecommendation(
                id=f"opt_{i+1:03d}",
                category=rec["category"],
                title=rec["title"],
                description=rec["description"],
                impact=rec["impact"],
                effort=rec["effort"],
                savings_estimate=rec["savings_estimate"],
                implementation_steps=rec["implementation_steps"],
                affected_services=rec["affected_services"],
                priority_score=rec["priority_score"],
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 7)),
                implemented=i == 0  # Mark first one as implemented
            )
            
            self.optimization_recommendations.append(recommendation)
    
    async def get_performance_overview(self) -> Dict[str, Any]:
        """Get comprehensive performance overview"""
        # Calculate current system health
        active_critical_alerts = len([a for a in self.active_alerts if a.severity == AlertSeverity.CRITICAL and a.status == AlertStatus.ACTIVE])
        active_warning_alerts = len([a for a in self.active_alerts if a.severity == AlertSeverity.WARNING and a.status == AlertStatus.ACTIVE])
        
        # Calculate average metrics
        latest_metrics = {}
        for metric_key, metrics in self.current_metrics.items():
            if metrics:
                latest_metric = max(metrics, key=lambda x: x.timestamp)
                latest_metrics[metric_key] = latest_metric.value
        
        # Calculate health score (0-100)
        health_score = 100
        health_score -= active_critical_alerts * 20
        health_score -= active_warning_alerts * 10
        health_score = max(health_score, 0)
        
        # Get optimization potential
        pending_recommendations = [r for r in self.optimization_recommendations if not r.implemented]
        total_savings = 0
        for rec in pending_recommendations:
            if rec.savings_estimate and '$' in rec.savings_estimate:
                try:
                    amount = float(rec.savings_estimate.split('$')[1].split('/')[0].replace(',', ''))
                    total_savings += amount
                except:
                    pass
        
        return {
            "system_health": {
                "health_score": health_score,
                "status": "healthy" if health_score >= 80 else "degraded" if health_score >= 60 else "critical",
                "active_alerts": len([a for a in self.active_alerts if a.status == AlertStatus.ACTIVE]),
                "critical_alerts": active_critical_alerts,
                "warning_alerts": active_warning_alerts
            },
            "performance_summary": {
                "avg_cpu_usage": round(statistics.mean([v for k, v in latest_metrics.items() if 'cpu_usage' in k]), 1),
                "avg_memory_usage": round(statistics.mean([v for k, v in latest_metrics.items() if 'memory_usage' in k]), 1),
                "avg_response_time": round(statistics.mean([v for k, v in latest_metrics.items() if 'response_time' in k]), 1),
                "services_monitored": len(set(metric.service for metrics in self.current_metrics.values() for metric in metrics)),
                "metrics_collected": sum(len(metrics) for metrics in self.current_metrics.values())
            },
            "optimization_insights": {
                "pending_recommendations": len(pending_recommendations),
                "implemented_recommendations": len([r for r in self.optimization_recommendations if r.implemented]),
                "potential_monthly_savings": f"${total_savings:,.0f}",
                "high_impact_recommendations": len([r for r in pending_recommendations if r.impact == "high"])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_active_alerts(self, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get active performance alerts"""
        alerts = [a for a in self.active_alerts if a.status == AlertStatus.ACTIVE]
        
        if severity:
            try:
                severity_enum = AlertSeverity(severity.lower())
                alerts = [a for a in alerts if a.severity == severity_enum]
            except ValueError:
                pass
        
        # Sort by severity and creation time
        severity_order = {AlertSeverity.EMERGENCY: 0, AlertSeverity.CRITICAL: 1, AlertSeverity.WARNING: 2, AlertSeverity.INFO: 3}
        alerts.sort(key=lambda x: (severity_order[x.severity], x.created_at), reverse=True)
        
        return [
            {
                "id": alert.id,
                "metric_name": alert.metric_name,
                "severity": alert.severity.value,
                "status": alert.status.value,
                "message": alert.message,
                "description": alert.description,
                "current_value": alert.current_value,
                "threshold_value": alert.threshold_value,
                "service": alert.service,
                "hostname": alert.hostname,
                "created_at": alert.created_at.isoformat(),
                "duration_minutes": int((datetime.utcnow() - alert.created_at).total_seconds() / 60),
                "runbook_url": alert.runbook_url,
                "tags": alert.tags
            }
            for alert in alerts
        ]
    
    async def get_performance_metrics(self, service: Optional[str] = None, 
                                    metric_type: Optional[str] = None,
                                    hours: int = 24) -> Dict[str, Any]:
        """Get performance metrics with filtering"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        filtered_metrics = {}
        for metric_key, metrics in self.current_metrics.items():
            # Filter by time
            recent_metrics = [m for m in metrics if m.timestamp >= cutoff_time]
            
            # Filter by service
            if service:
                recent_metrics = [m for m in recent_metrics if m.service == service]
            
            # Filter by metric type
            if metric_type:
                try:
                    metric_type_enum = MetricType(metric_type.lower())
                    recent_metrics = [m for m in recent_metrics if m.metric_type == metric_type_enum]
                except ValueError:
                    pass
            
            if recent_metrics:
                filtered_metrics[metric_key] = recent_metrics
        
        # Calculate summary statistics
        metric_summaries = {}
        for metric_key, metrics in filtered_metrics.items():
            values = [m.value for m in metrics]
            if values:
                metric_summaries[metric_key] = {
                    "current": values[-1],
                    "average": round(statistics.mean(values), 2),
                    "min": min(values),
                    "max": max(values),
                    "count": len(values),
                    "unit": metrics[0].unit,
                    "service": metrics[0].service,
                    "metric_type": metrics[0].metric_type.value
                }
        
        return {
            "metrics": metric_summaries,
            "time_range": {
                "hours": hours,
                "start_time": cutoff_time.isoformat(),
                "end_time": datetime.utcnow().isoformat()
            },
            "filters": {
                "service": service,
                "metric_type": metric_type
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_optimization_recommendations(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get optimization recommendations"""
        recommendations = self.optimization_recommendations
        
        if category:
            recommendations = [r for r in recommendations if r.category.lower() == category.lower()]
        
        # Sort by priority score (descending) and implementation status
        recommendations.sort(key=lambda x: (x.implemented, -x.priority_score))
        
        return [
            {
                "id": rec.id,
                "category": rec.category,
                "title": rec.title,
                "description": rec.description,
                "impact": rec.impact,
                "effort": rec.effort,
                "savings_estimate": rec.savings_estimate,
                "implementation_steps": rec.implementation_steps,
                "affected_services": rec.affected_services,
                "priority_score": rec.priority_score,
                "created_at": rec.created_at.isoformat(),
                "implemented": rec.implemented,
                "status": "implemented" if rec.implemented else "pending"
            }
            for rec in recommendations
        ]
    
    async def get_anomaly_detection(self) -> Dict[str, Any]:
        """Get anomaly detection results"""
        anomalies = []
        
        # Check recent metrics against baselines for anomalies
        recent_time = datetime.utcnow() - timedelta(minutes=30)
        
        for service, baseline in self.baselines.items():
            for metric_name, baseline_value in baseline.items():
                metric_key = f"{service}_{metric_name}"
                if metric_key in self.current_metrics:
                    recent_metrics = [m for m in self.current_metrics[metric_key] if m.timestamp >= recent_time]
                    
                    if recent_metrics:
                        current_values = [m.value for m in recent_metrics]
                        avg_current = statistics.mean(current_values)
                        
                        # Detect anomalies (deviation > 50% from baseline)
                        deviation = abs(avg_current - baseline_value) / baseline_value
                        
                        if deviation > 0.5:  # 50% deviation threshold
                            anomalies.append({
                                "service": service,
                                "metric": metric_name,
                                "baseline_value": baseline_value,
                                "current_value": avg_current,
                                "deviation_percent": round(deviation * 100, 1),
                                "severity": "high" if deviation > 1.0 else "medium",
                                "detected_at": datetime.utcnow().isoformat()
                            })
        
        return {
            "anomalies_detected": len(anomalies),
            "anomalies": sorted(anomalies, key=lambda x: x["deviation_percent"], reverse=True),
            "detection_period": "30 minutes",
            "baseline_comparison": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def acknowledge_alert(self, alert_id: str, user_id: str) -> bool:
        """Acknowledge a performance alert"""
        for alert in self.active_alerts:
            if alert.id == alert_id and alert.status == AlertStatus.ACTIVE:
                alert.status = AlertStatus.ACKNOWLEDGED
                alert.acknowledged_at = datetime.utcnow()
                alert.acknowledged_by = user_id
                return True
        return False

# Create global instance
performance_monitoring = PerformanceMonitoringService()

if __name__ == "__main__":
    # Test performance monitoring features
    async def test_performance_monitoring():
        print("📊 Testing Performance Monitoring Service")
        print("=" * 55)
        
        # Test performance overview
        overview = await performance_monitoring.get_performance_overview()
        print(f"✅ Performance Overview:")
        print(f"   • Health Score: {overview['system_health']['health_score']}/100")
        print(f"   • System Status: {overview['system_health']['status']}")
        print(f"   • Active Alerts: {overview['system_health']['active_alerts']}")
        print(f"   • Average CPU: {overview['performance_summary']['avg_cpu_usage']}%")
        print(f"   • Potential Savings: {overview['optimization_insights']['potential_monthly_savings']}")
        print()
        
        # Test active alerts
        alerts = await performance_monitoring.get_active_alerts()
        print(f"✅ Active Alerts:")
        print(f"   • Total Active: {len(alerts)}")
        critical_alerts = [a for a in alerts if a['severity'] == 'critical']
        print(f"   • Critical: {len(critical_alerts)}")
        if alerts:
            print(f"   • Most Recent: {alerts[0]['message']}")
        print()
        
        # Test optimization recommendations
        recommendations = await performance_monitoring.get_optimization_recommendations()
        print(f"✅ Optimization Recommendations:")
        print(f"   • Total Recommendations: {len(recommendations)}")
        pending = [r for r in recommendations if not r['implemented']]
        print(f"   • Pending: {len(pending)}")
        high_impact = [r for r in recommendations if r['impact'] == 'high']
        print(f"   • High Impact: {len(high_impact)}")
        print()
        
        # Test anomaly detection
        anomalies = await performance_monitoring.get_anomaly_detection()
        print(f"✅ Anomaly Detection:")
        print(f"   • Anomalies Detected: {anomalies['anomalies_detected']}")
        print(f"   • Detection Period: {anomalies['detection_period']}")
        if anomalies['anomalies']:
            top_anomaly = anomalies['anomalies'][0]
            print(f"   • Top Anomaly: {top_anomaly['service']} - {top_anomaly['deviation_percent']}% deviation")
        
        print("\n✅ Performance monitoring system test completed!")
    
    asyncio.run(test_performance_monitoring())