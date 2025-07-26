#!/usr/bin/env python3
"""
Advanced System Observability Dashboard
Comprehensive system monitoring with distributed tracing, metrics correlation, and service mesh insights
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
from collections import defaultdict, deque

class ServiceStatus(Enum):
    """Service health status"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"
    MAINTENANCE = "maintenance"

class MetricCategory(Enum):
    """Metric categories for observability"""
    INFRASTRUCTURE = "infrastructure"
    APPLICATION = "application"
    BUSINESS = "business"
    USER_EXPERIENCE = "user_experience"
    SECURITY = "security"

class TraceSpanType(Enum):
    """Distributed trace span types"""
    HTTP_REQUEST = "http_request"
    DATABASE_QUERY = "database_query"
    CACHE_OPERATION = "cache_operation"
    MESSAGE_QUEUE = "message_queue"
    EXTERNAL_API = "external_api"
    INTERNAL_SERVICE = "internal_service"

@dataclass
class ServiceHealthMetrics:
    """Service health and performance metrics"""
    service_name: str
    status: ServiceStatus
    uptime_percentage: float
    response_time_avg: float
    response_time_p95: float
    response_time_p99: float
    error_rate: float
    throughput_rpm: int
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]
    last_updated: datetime
    dependencies: List[str] = None
    sla_compliance: float = 0.0
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []

@dataclass
class DistributedTrace:
    """Distributed tracing information"""
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    service_name: str
    operation_name: str
    span_type: TraceSpanType
    start_time: datetime
    duration_ms: float
    status_code: int
    tags: Dict[str, str]
    logs: List[Dict[str, Any]]
    baggage: Dict[str, str] = None
    
    def __post_init__(self):
        if self.baggage is None:
            self.baggage = {}

@dataclass
class ServiceDependency:
    """Service dependency mapping"""
    source_service: str
    target_service: str
    dependency_type: str  # sync, async, database, cache, external
    call_volume_rpm: int
    success_rate: float
    avg_latency_ms: float
    circuit_breaker_status: str
    health_impact_score: float

@dataclass
class BusinessMetric:
    """Business-level observability metrics"""
    metric_name: str
    current_value: float
    target_value: float
    unit: str
    trend_direction: str  # up, down, stable
    business_impact: str  # high, medium, low
    related_services: List[str]
    last_updated: datetime

class SystemObservabilityService:
    """Advanced system observability service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Service health data
        self.service_health: Dict[str, ServiceHealthMetrics] = {}
        self.service_dependencies: List[ServiceDependency] = []
        self.distributed_traces: List[DistributedTrace] = []
        self.business_metrics: List[BusinessMetric] = []
        
        # Historical data for trend analysis
        self.metric_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1440))  # 24h at 1min intervals
        
        # Correlation analysis
        self.metric_correlations: Dict[str, List[Tuple[str, float]]] = {}
        
        # Initialize demo data
        self._initialize_demo_data()
        
    def _initialize_demo_data(self):
        """Initialize with comprehensive demonstration data"""
        self._generate_service_health_metrics()
        self._generate_service_dependencies()
        self._generate_distributed_traces()
        self._generate_business_metrics()
        self._generate_metric_correlations()
    
    def _generate_service_health_metrics(self):
        """Generate comprehensive service health metrics"""
        services = [
            {
                "name": "opssight-frontend",
                "status": ServiceStatus.HEALTHY,
                "base_response_time": 45,
                "base_throughput": 1200,
                "dependencies": ["opssight-backend", "cdn", "auth-service"]
            },
            {
                "name": "opssight-backend",
                "status": ServiceStatus.WARNING,
                "base_response_time": 120,
                "base_throughput": 800,
                "dependencies": ["postgres", "redis", "elasticsearch"]
            },
            {
                "name": "auth-service",
                "status": ServiceStatus.HEALTHY,
                "base_response_time": 30,
                "base_throughput": 400,
                "dependencies": ["postgres", "redis"]
            },
            {
                "name": "postgres",
                "status": ServiceStatus.HEALTHY,
                "base_response_time": 15,
                "base_throughput": 2000,
                "dependencies": []
            },
            {
                "name": "redis",
                "status": ServiceStatus.HEALTHY,
                "base_response_time": 2,
                "base_throughput": 5000,
                "dependencies": []
            },
            {
                "name": "elasticsearch",
                "status": ServiceStatus.CRITICAL,
                "base_response_time": 200,
                "base_throughput": 300,
                "dependencies": []
            },
            {
                "name": "message-queue",
                "status": ServiceStatus.HEALTHY,
                "base_response_time": 5,
                "base_throughput": 1500,
                "dependencies": []
            },
            {
                "name": "cdn",
                "status": ServiceStatus.HEALTHY,
                "base_response_time": 25,
                "base_throughput": 3000,
                "dependencies": []
            }
        ]
        
        for service_config in services:
            # Add some variance to metrics
            variance = random.uniform(0.8, 1.2)
            spike_factor = random.uniform(1.0, 2.5) if random.random() < 0.1 else 1.0
            
            service_health = ServiceHealthMetrics(
                service_name=service_config["name"],
                status=service_config["status"],
                uptime_percentage=random.uniform(95.0, 99.9) if service_config["status"] != ServiceStatus.CRITICAL else random.uniform(85.0, 95.0),
                response_time_avg=service_config["base_response_time"] * variance,
                response_time_p95=service_config["base_response_time"] * variance * 2.1,
                response_time_p99=service_config["base_response_time"] * variance * 3.8,
                error_rate=random.uniform(0.1, 0.5) if service_config["status"] == ServiceStatus.HEALTHY else random.uniform(2.0, 15.0),
                throughput_rpm=int(service_config["base_throughput"] * variance),
                cpu_usage=random.uniform(20, 40) if service_config["status"] == ServiceStatus.HEALTHY else random.uniform(60, 85),
                memory_usage=random.uniform(40, 70) if service_config["status"] == ServiceStatus.HEALTHY else random.uniform(75, 90),
                disk_usage=random.uniform(30, 60),
                network_io={
                    "in_mbps": random.uniform(10, 50),
                    "out_mbps": random.uniform(5, 30)
                },
                last_updated=datetime.utcnow(),
                dependencies=service_config["dependencies"],
                sla_compliance=random.uniform(95.0, 99.5) if service_config["status"] != ServiceStatus.CRITICAL else random.uniform(85.0, 94.0)
            )
            
            self.service_health[service_config["name"]] = service_health
    
    def _generate_service_dependencies(self):
        """Generate service dependency mappings"""
        dependencies = [
            {
                "source": "opssight-frontend",
                "target": "opssight-backend",
                "type": "sync",
                "volume": 800,
                "success_rate": 98.5
            },
            {
                "source": "opssight-frontend",
                "target": "auth-service",
                "type": "sync",
                "volume": 400,
                "success_rate": 99.2
            },
            {
                "source": "opssight-frontend",
                "target": "cdn",
                "type": "sync",
                "volume": 2000,
                "success_rate": 99.8
            },
            {
                "source": "opssight-backend",
                "target": "postgres",
                "type": "database",
                "volume": 1200,
                "success_rate": 99.1
            },
            {
                "source": "opssight-backend",
                "target": "redis",
                "type": "cache",
                "volume": 2500,
                "success_rate": 99.9
            },
            {
                "source": "opssight-backend",
                "target": "elasticsearch",
                "type": "sync",
                "volume": 300,
                "success_rate": 85.2
            },
            {
                "source": "opssight-backend",
                "target": "message-queue",
                "type": "async",
                "volume": 500,
                "success_rate": 99.5
            },
            {
                "source": "auth-service",
                "target": "postgres",
                "type": "database",
                "volume": 600,
                "success_rate": 99.3
            },
            {
                "source": "auth-service",
                "target": "redis",
                "type": "cache",
                "volume": 800,
                "success_rate": 99.8
            }
        ]
        
        for dep in dependencies:
            dependency = ServiceDependency(
                source_service=dep["source"],
                target_service=dep["target"],
                dependency_type=dep["type"],
                call_volume_rpm=dep["volume"],
                success_rate=dep["success_rate"],
                avg_latency_ms=random.uniform(10, 100),
                circuit_breaker_status="closed" if dep["success_rate"] > 95 else "open",
                health_impact_score=random.uniform(0.5, 1.0)
            )
            self.service_dependencies.append(dependency)
    
    def _generate_distributed_traces(self):
        """Generate sample distributed traces"""
        trace_scenarios = [
            {
                "trace_id": str(uuid.uuid4()),
                "root_operation": "GET /api/v1/dashboard",
                "spans": [
                    {"service": "opssight-frontend", "operation": "render_dashboard", "duration": 45, "span_type": TraceSpanType.HTTP_REQUEST},
                    {"service": "opssight-backend", "operation": "get_metrics", "duration": 120, "span_type": TraceSpanType.HTTP_REQUEST},
                    {"service": "postgres", "operation": "SELECT metrics", "duration": 15, "span_type": TraceSpanType.DATABASE_QUERY},
                    {"service": "redis", "operation": "GET cache_key", "duration": 2, "span_type": TraceSpanType.CACHE_OPERATION}
                ]
            },
            {
                "trace_id": str(uuid.uuid4()),
                "root_operation": "POST /api/v1/alerts",
                "spans": [
                    {"service": "opssight-backend", "operation": "create_alert", "duration": 200, "span_type": TraceSpanType.HTTP_REQUEST},
                    {"service": "postgres", "operation": "INSERT alert", "duration": 25, "span_type": TraceSpanType.DATABASE_QUERY},
                    {"service": "message-queue", "operation": "publish_alert", "duration": 5, "span_type": TraceSpanType.MESSAGE_QUEUE},
                    {"service": "elasticsearch", "operation": "index_alert", "duration": 350, "span_type": TraceSpanType.EXTERNAL_API}
                ]
            },
            {
                "trace_id": str(uuid.uuid4()),
                "root_operation": "GET /api/v1/auth/validate",
                "spans": [
                    {"service": "auth-service", "operation": "validate_token", "duration": 30, "span_type": TraceSpanType.HTTP_REQUEST},
                    {"service": "redis", "operation": "GET session", "duration": 1, "span_type": TraceSpanType.CACHE_OPERATION},
                    {"service": "postgres", "operation": "SELECT user", "duration": 12, "span_type": TraceSpanType.DATABASE_QUERY}
                ]
            }
        ]
        
        for scenario in trace_scenarios:
            parent_span_id = None
            for i, span_config in enumerate(scenario["spans"]):
                span = DistributedTrace(
                    trace_id=scenario["trace_id"],
                    span_id=str(uuid.uuid4()),
                    parent_span_id=parent_span_id,
                    service_name=span_config["service"],
                    operation_name=span_config["operation"],
                    span_type=span_config["span_type"],
                    start_time=datetime.utcnow() - timedelta(minutes=random.randint(1, 60)),
                    duration_ms=span_config["duration"],
                    status_code=200 if random.random() > 0.05 else random.choice([400, 500, 502, 503]),
                    tags={
                        "http.method": "GET" if "GET" in scenario["root_operation"] else "POST",
                        "http.url": scenario["root_operation"],
                        "environment": "production",
                        "version": "v2.3.1"
                    },
                    logs=[
                        {
                            "timestamp": datetime.utcnow().isoformat(),
                            "level": "info",
                            "message": f"Processing {span_config['operation']}"
                        }
                    ]
                )
                self.distributed_traces.append(span)
                parent_span_id = span.span_id
    
    def _generate_business_metrics(self):
        """Generate business-level observability metrics"""
        business_metrics = [
            {
                "name": "active_users_per_minute",
                "current": 1250,
                "target": 1500,
                "unit": "users/min",
                "trend": "up",
                "impact": "high",
                "services": ["opssight-frontend", "auth-service"]
            },
            {
                "name": "api_requests_per_second",
                "current": 450,
                "target": 500,
                "unit": "req/sec",
                "trend": "stable",
                "impact": "high",
                "services": ["opssight-backend", "opssight-frontend"]
            },
            {
                "name": "user_conversion_rate",
                "current": 3.2,
                "target": 4.0,
                "unit": "percent",
                "trend": "down",
                "impact": "high",
                "services": ["opssight-frontend"]
            },
            {
                "name": "revenue_per_hour",
                "current": 2340,
                "target": 2500,
                "unit": "dollars",
                "trend": "up",
                "impact": "high",
                "services": ["opssight-backend", "payment-service"]
            },
            {
                "name": "alert_resolution_time",
                "current": 15.5,
                "target": 12.0,
                "unit": "minutes",
                "trend": "up",
                "impact": "medium",
                "services": ["opssight-backend"]
            },
            {
                "name": "deployment_frequency",
                "current": 8.5,
                "target": 12.0,
                "unit": "deploys/day",
                "trend": "stable",
                "impact": "medium",
                "services": ["ci-cd-pipeline"]
            }
        ]
        
        for metric_config in business_metrics:
            metric = BusinessMetric(
                metric_name=metric_config["name"],
                current_value=metric_config["current"],
                target_value=metric_config["target"],
                unit=metric_config["unit"],
                trend_direction=metric_config["trend"],
                business_impact=metric_config["impact"],
                related_services=metric_config["services"],
                last_updated=datetime.utcnow()
            )
            self.business_metrics.append(metric)
    
    def _generate_metric_correlations(self):
        """Generate metric correlation analysis"""
        correlations = {
            "cpu_usage": [
                ("response_time", 0.85),
                ("error_rate", 0.72),
                ("memory_usage", 0.68)
            ],
            "response_time": [
                ("user_satisfaction", -0.91),
                ("throughput", -0.76),
                ("cpu_usage", 0.85)
            ],
            "error_rate": [
                ("user_conversion_rate", -0.89),
                ("revenue_per_hour", -0.82),
                ("cpu_usage", 0.72)
            ],
            "memory_usage": [
                ("gc_frequency", 0.94),
                ("response_time", 0.63),
                ("disk_io", 0.57)
            ]
        }
        self.metric_correlations = correlations
    
    async def get_observability_overview(self) -> Dict[str, Any]:
        """Get comprehensive observability overview"""
        # Service health summary
        healthy_services = len([s for s in self.service_health.values() if s.status == ServiceStatus.HEALTHY])
        warning_services = len([s for s in self.service_health.values() if s.status == ServiceStatus.WARNING])
        critical_services = len([s for s in self.service_health.values() if s.status == ServiceStatus.CRITICAL])
        
        # Overall system health score
        total_services = len(self.service_health)
        health_score = ((healthy_services * 100) + (warning_services * 70) + (critical_services * 30)) / total_services if total_services > 0 else 0
        
        # SLA compliance
        avg_sla_compliance = statistics.mean([s.sla_compliance for s in self.service_health.values()])
        
        # Trace analysis
        total_traces = len(self.distributed_traces)
        slow_traces = len([t for t in self.distributed_traces if t.duration_ms > 200])
        error_traces = len([t for t in self.distributed_traces if t.status_code >= 400])
        
        return {
            "system_health": {
                "overall_health_score": round(health_score, 1),
                "status": "healthy" if health_score >= 90 else "warning" if health_score >= 70 else "critical",
                "total_services": total_services,
                "healthy_services": healthy_services,
                "warning_services": warning_services,
                "critical_services": critical_services,
                "avg_sla_compliance": round(avg_sla_compliance, 2)
            },
            "performance_summary": {
                "avg_response_time": round(statistics.mean([s.response_time_avg for s in self.service_health.values()]), 1),
                "avg_error_rate": round(statistics.mean([s.error_rate for s in self.service_health.values()]), 2),
                "total_throughput_rpm": sum([s.throughput_rpm for s in self.service_health.values()]),
                "p95_response_time": round(statistics.mean([s.response_time_p95 for s in self.service_health.values()]), 1),
                "p99_response_time": round(statistics.mean([s.response_time_p99 for s in self.service_health.values()]), 1)
            },
            "distributed_tracing": {
                "total_traces_analyzed": total_traces,
                "slow_traces": slow_traces,
                "error_traces": error_traces,
                "avg_trace_duration": round(statistics.mean([t.duration_ms for t in self.distributed_traces]), 1),
                "trace_success_rate": round(((total_traces - error_traces) / total_traces * 100), 2) if total_traces > 0 else 0
            },
            "service_dependencies": {
                "total_dependencies": len(self.service_dependencies),
                "healthy_dependencies": len([d for d in self.service_dependencies if d.success_rate >= 95]),
                "degraded_dependencies": len([d for d in self.service_dependencies if d.success_rate < 95]),
                "circuit_breakers_open": len([d for d in self.service_dependencies if d.circuit_breaker_status == "open"])
            },
            "business_metrics": {
                "total_business_metrics": len(self.business_metrics),
                "metrics_above_target": len([m for m in self.business_metrics if m.current_value >= m.target_value]),
                "high_impact_metrics": len([m for m in self.business_metrics if m.business_impact == "high"]),
                "metrics_trending_down": len([m for m in self.business_metrics if m.trend_direction == "down"])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_service_health_details(self, service_name: Optional[str] = None) -> Dict[str, Any]:
        """Get detailed service health information"""
        if service_name and service_name in self.service_health:
            services = {service_name: self.service_health[service_name]}
        else:
            services = self.service_health
        
        service_details = []
        for name, health in services.items():
            service_details.append({
                "service_name": health.service_name,
                "status": health.status.value,
                "uptime_percentage": health.uptime_percentage,
                "response_time": {
                    "avg": health.response_time_avg,
                    "p95": health.response_time_p95,
                    "p99": health.response_time_p99
                },
                "error_rate": health.error_rate,
                "throughput_rpm": health.throughput_rpm,
                "resource_usage": {
                    "cpu": health.cpu_usage,
                    "memory": health.memory_usage,
                    "disk": health.disk_usage,
                    "network": health.network_io
                },
                "dependencies": health.dependencies,
                "sla_compliance": health.sla_compliance,
                "last_updated": health.last_updated.isoformat(),
                "health_score": self._calculate_service_health_score(health)
            })
        
        return {
            "services": service_details,
            "summary": {
                "total_services": len(service_details),
                "avg_uptime": round(statistics.mean([s["uptime_percentage"] for s in service_details]), 2),
                "avg_response_time": round(statistics.mean([s["response_time"]["avg"] for s in service_details]), 1),
                "total_throughput": sum([s["throughput_rpm"] for s in service_details])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _calculate_service_health_score(self, health: ServiceHealthMetrics) -> float:
        """Calculate overall health score for a service"""
        uptime_score = health.uptime_percentage
        error_score = max(0, 100 - (health.error_rate * 20))
        response_score = max(0, 100 - (health.response_time_avg / 10))
        resource_score = max(0, 100 - max(health.cpu_usage, health.memory_usage))
        
        # Weighted average
        overall_score = (uptime_score * 0.3 + error_score * 0.25 + response_score * 0.25 + resource_score * 0.2)
        return round(overall_score, 1)
    
    async def get_distributed_traces(self, limit: int = 50) -> Dict[str, Any]:
        """Get distributed tracing information"""
        traces_by_id = defaultdict(list)
        
        # Group spans by trace_id
        for trace in self.distributed_traces[-limit:]:
            traces_by_id[trace.trace_id].append({
                "span_id": trace.span_id,
                "parent_span_id": trace.parent_span_id,
                "service_name": trace.service_name,
                "operation_name": trace.operation_name,
                "span_type": trace.span_type.value,
                "start_time": trace.start_time.isoformat(),
                "duration_ms": trace.duration_ms,
                "status_code": trace.status_code,
                "tags": trace.tags,
                "logs": trace.logs
            })
        
        # Calculate trace summaries
        trace_summaries = []
        for trace_id, spans in traces_by_id.items():
            total_duration = sum(span["duration_ms"] for span in spans)
            has_errors = any(span["status_code"] >= 400 for span in spans)
            service_count = len(set(span["service_name"] for span in spans))
            
            trace_summaries.append({
                "trace_id": trace_id,
                "total_duration_ms": total_duration,
                "span_count": len(spans),
                "service_count": service_count,
                "has_errors": has_errors,
                "root_operation": spans[0]["operation_name"] if spans else "unknown",
                "spans": spans
            })
        
        # Sort by duration (slowest first)
        trace_summaries.sort(key=lambda x: x["total_duration_ms"], reverse=True)
        
        return {
            "traces": trace_summaries,
            "summary": {
                "total_traces": len(trace_summaries),
                "avg_duration_ms": round(statistics.mean([t["total_duration_ms"] for t in trace_summaries]), 1) if trace_summaries else 0,
                "error_rate": round(len([t for t in trace_summaries if t["has_errors"]]) / len(trace_summaries) * 100, 2) if trace_summaries else 0,
                "avg_spans_per_trace": round(statistics.mean([t["span_count"] for t in trace_summaries]), 1) if trace_summaries else 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_service_dependencies(self) -> Dict[str, Any]:
        """Get service dependency information"""
        dependency_details = []
        
        for dep in self.service_dependencies:
            dependency_details.append({
                "source_service": dep.source_service,
                "target_service": dep.target_service,
                "dependency_type": dep.dependency_type,
                "call_volume_rpm": dep.call_volume_rpm,
                "success_rate": dep.success_rate,
                "avg_latency_ms": dep.avg_latency_ms,
                "circuit_breaker_status": dep.circuit_breaker_status,
                "health_impact_score": dep.health_impact_score,
                "status": "healthy" if dep.success_rate >= 95 else "degraded"
            })
        
        # Create dependency graph
        services = set()
        for dep in dependency_details:
            services.add(dep["source_service"])
            services.add(dep["target_service"])
        
        return {
            "dependencies": dependency_details,
            "dependency_graph": {
                "nodes": list(services),
                "edges": [(dep["source_service"], dep["target_service"]) for dep in dependency_details]
            },
            "summary": {
                "total_dependencies": len(dependency_details),
                "healthy_dependencies": len([d for d in dependency_details if d["status"] == "healthy"]),
                "degraded_dependencies": len([d for d in dependency_details if d["status"] == "degraded"]),
                "total_call_volume": sum([d["call_volume_rpm"] for d in dependency_details]),
                "avg_success_rate": round(statistics.mean([d["success_rate"] for d in dependency_details]), 2)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_business_metrics(self) -> Dict[str, Any]:
        """Get business-level observability metrics"""
        business_metric_details = []
        
        for metric in self.business_metrics:
            target_achievement = (metric.current_value / metric.target_value * 100) if metric.target_value != 0 else 0
            
            business_metric_details.append({
                "metric_name": metric.metric_name,
                "current_value": metric.current_value,
                "target_value": metric.target_value,
                "target_achievement_percent": round(target_achievement, 1),
                "unit": metric.unit,
                "trend_direction": metric.trend_direction,
                "business_impact": metric.business_impact,
                "related_services": metric.related_services,
                "last_updated": metric.last_updated.isoformat(),
                "status": "on_target" if target_achievement >= 95 else "below_target"
            })
        
        return {
            "business_metrics": business_metric_details,
            "summary": {
                "total_metrics": len(business_metric_details),
                "metrics_on_target": len([m for m in business_metric_details if m["status"] == "on_target"]),
                "metrics_below_target": len([m for m in business_metric_details if m["status"] == "below_target"]),
                "high_impact_metrics": len([m for m in business_metric_details if m["business_impact"] == "high"]),
                "metrics_trending_up": len([m for m in business_metric_details if m["trend_direction"] == "up"])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_metric_correlations(self) -> Dict[str, Any]:
        """Get metric correlation analysis"""
        correlation_analysis = {}
        
        for metric, correlations in self.metric_correlations.items():
            correlation_analysis[metric] = [
                {
                    "correlated_metric": corr_metric,
                    "correlation_coefficient": coefficient,
                    "correlation_strength": "strong" if abs(coefficient) >= 0.8 else "moderate" if abs(coefficient) >= 0.5 else "weak",
                    "correlation_type": "positive" if coefficient > 0 else "negative"
                }
                for corr_metric, coefficient in correlations
            ]
        
        return {
            "correlations": correlation_analysis,
            "insights": {
                "strongest_correlation": max(
                    [(metric, corr["correlation_coefficient"]) for metric, corrs in correlation_analysis.items() for corr in corrs],
                    key=lambda x: abs(x[1])
                ) if correlation_analysis else ("none", 0),
                "total_correlations": sum(len(corrs) for corrs in correlation_analysis.values()),
                "strong_correlations": sum(
                    len([c for c in corrs if abs(c["correlation_coefficient"]) >= 0.8])
                    for corrs in correlation_analysis.values()
                )
            },
            "timestamp": datetime.utcnow().isoformat()
        }

# Create global instance
system_observability = SystemObservabilityService()

if __name__ == "__main__":
    # Test system observability features
    async def test_system_observability():
        print("🔭 Testing System Observability Service")
        print("=" * 55)
        
        # Test overview
        overview = await system_observability.get_observability_overview()
        print(f"✅ System Overview:")
        print(f"   • Overall Health Score: {overview['system_health']['overall_health_score']}/100")
        print(f"   • Total Services: {overview['system_health']['total_services']}")
        print(f"   • SLA Compliance: {overview['system_health']['avg_sla_compliance']}%")
        print(f"   • Total Throughput: {overview['performance_summary']['total_throughput_rpm']} RPM")
        print()
        
        # Test service health
        service_health = await system_observability.get_service_health_details()
        print(f"✅ Service Health:")
        print(f"   • Services Monitored: {service_health['summary']['total_services']}")
        print(f"   • Average Uptime: {service_health['summary']['avg_uptime']}%")
        print(f"   • Average Response Time: {service_health['summary']['avg_response_time']}ms")
        print()
        
        # Test distributed traces
        traces = await system_observability.get_distributed_traces()
        print(f"✅ Distributed Tracing:")
        print(f"   • Total Traces: {traces['summary']['total_traces']}")
        print(f"   • Average Duration: {traces['summary']['avg_duration_ms']}ms")
        print(f"   • Error Rate: {traces['summary']['error_rate']}%")
        print()
        
        # Test business metrics
        business = await system_observability.get_business_metrics()
        print(f"✅ Business Metrics:")
        print(f"   • Total Metrics: {business['summary']['total_metrics']}")
        print(f"   • On Target: {business['summary']['metrics_on_target']}")
        print(f"   • High Impact: {business['summary']['high_impact_metrics']}")
        
        print("\n✅ System observability test completed!")
    
    asyncio.run(test_system_observability())