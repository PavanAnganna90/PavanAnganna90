#!/usr/bin/env python3
"""
Cost Optimization Analytics and Recommendations
Advanced cost analysis, waste identification, and optimization recommendations for cloud infrastructure
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

class CostCategory(Enum):
    """Cost categories for analysis"""
    COMPUTE = "compute"
    STORAGE = "storage"
    NETWORK = "network"
    DATABASE = "database"
    MONITORING = "monitoring"
    SECURITY = "security"
    BACKUP = "backup"
    LICENSING = "licensing"

class OptimizationType(Enum):
    """Types of cost optimizations"""
    RIGHT_SIZING = "right_sizing"
    RESERVED_INSTANCES = "reserved_instances"
    SPOT_INSTANCES = "spot_instances"
    STORAGE_TIERING = "storage_tiering"
    AUTO_SCALING = "auto_scaling"
    RESOURCE_CLEANUP = "resource_cleanup"
    LICENSING_OPTIMIZATION = "licensing_optimization"
    NETWORK_OPTIMIZATION = "network_optimization"

class PriorityLevel(Enum):
    """Optimization priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class CostItem:
    """Individual cost item"""
    id: str
    resource_name: str
    resource_type: str
    category: CostCategory
    current_monthly_cost: float
    projected_monthly_cost: float
    usage_percentage: float
    region: str
    tags: Dict[str, str]
    last_updated: datetime
    cost_trend: str = "stable"  # increasing, decreasing, stable
    
    def __post_init__(self):
        if not hasattr(self, 'tags') or self.tags is None:
            self.tags = {}

@dataclass
class OptimizationRecommendation:
    """Cost optimization recommendation"""
    id: str
    title: str
    description: str
    optimization_type: OptimizationType
    affected_resources: List[str]
    current_monthly_cost: float
    optimized_monthly_cost: float
    monthly_savings: float
    annual_savings: float
    implementation_effort: str  # low, medium, high
    priority: PriorityLevel
    confidence_score: float  # 0-1
    implementation_steps: List[str]
    risks: List[str]
    prerequisites: List[str]
    estimated_implementation_time: str
    created_at: datetime
    roi_months: Optional[float] = None

@dataclass
class CostForecast:
    """Cost forecasting data"""
    forecast_period: str
    current_monthly_cost: float
    projected_monthly_cost: float
    cost_increase_percentage: float
    key_drivers: List[str]
    confidence_interval: Tuple[float, float]
    forecast_accuracy: float

@dataclass
class WasteAnalysis:
    """Resource waste analysis"""
    resource_id: str
    resource_name: str
    resource_type: str
    waste_type: str
    waste_percentage: float
    monthly_waste_cost: float
    utilization_metrics: Dict[str, float]
    recommended_action: str
    potential_savings: float

class CostOptimizationService:
    """Advanced cost optimization service"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Cost data storage
        self.cost_items: List[CostItem] = []
        self.optimization_recommendations: List[OptimizationRecommendation] = []
        self.cost_forecasts: List[CostForecast] = []
        self.waste_analysis: List[WasteAnalysis] = []
        
        # Historical cost data for trend analysis
        self.cost_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=365))  # 1 year
        
        # Cost budgets and thresholds
        self.cost_budgets = {
            "monthly_total": 15000.0,
            "quarterly_total": 45000.0,
            "annual_total": 180000.0
        }
        
        # Initialize demo data
        self._initialize_demo_data()
        
    def _initialize_demo_data(self):
        """Initialize with comprehensive cost optimization data"""
        self._generate_cost_items()
        self._generate_optimization_recommendations()
        self._generate_cost_forecasts()
        self._generate_waste_analysis()
        self._generate_historical_cost_data()
    
    def _generate_cost_items(self):
        """Generate comprehensive cost items"""
        cost_templates = [
            {
                "resource_name": "opssight-prod-cluster",
                "resource_type": "kubernetes_cluster",
                "category": CostCategory.COMPUTE,
                "current_cost": 3200.0,
                "usage_percentage": 45.0,
                "region": "us-east-1",
                "trend": "increasing"
            },
            {
                "resource_name": "postgres-primary-db",
                "resource_type": "rds_instance",
                "category": CostCategory.DATABASE,
                "current_cost": 850.0,
                "usage_percentage": 78.0,
                "region": "us-east-1",
                "trend": "stable"
            },
            {
                "resource_name": "redis-cluster-cache",
                "resource_type": "elasticache",
                "category": CostCategory.DATABASE,
                "current_cost": 420.0,
                "usage_percentage": 62.0,
                "region": "us-east-1",
                "trend": "stable"
            },
            {
                "resource_name": "s3-data-storage",
                "resource_type": "s3_bucket",
                "category": CostCategory.STORAGE,
                "current_cost": 1200.0,
                "usage_percentage": 85.0,
                "region": "us-east-1",
                "trend": "increasing"
            },
            {
                "resource_name": "cloudwatch-logs",
                "resource_type": "logs_service",
                "category": CostCategory.MONITORING,
                "current_cost": 380.0,
                "usage_percentage": 90.0,
                "region": "us-east-1",
                "trend": "increasing"
            },
            {
                "resource_name": "load-balancer-prod",
                "resource_type": "application_load_balancer",
                "category": CostCategory.NETWORK,
                "current_cost": 180.0,
                "usage_percentage": 55.0,
                "region": "us-east-1",
                "trend": "stable"
            },
            {
                "resource_name": "backup-storage",
                "resource_type": "s3_glacier",
                "category": CostCategory.BACKUP,
                "current_cost": 95.0,
                "usage_percentage": 40.0,
                "region": "us-east-1",
                "trend": "decreasing"
            },
            {
                "resource_name": "waf-security",
                "resource_type": "web_application_firewall",
                "category": CostCategory.SECURITY,
                "current_cost": 220.0,
                "usage_percentage": 70.0,
                "region": "us-east-1",
                "trend": "stable"
            },
            {
                "resource_name": "elasticsearch-logs",
                "resource_type": "elasticsearch_cluster",
                "category": CostCategory.STORAGE,
                "current_cost": 650.0,
                "usage_percentage": 35.0,
                "region": "us-east-1",
                "trend": "stable"
            },
            {
                "resource_name": "nat-gateway",
                "resource_type": "nat_gateway",
                "category": CostCategory.NETWORK,
                "current_cost": 125.0,
                "usage_percentage": 25.0,
                "region": "us-east-1",
                "trend": "stable"
            }
        ]
        
        for i, template in enumerate(cost_templates):
            # Add some variance to costs
            variance = random.uniform(0.9, 1.1)
            
            cost_item = CostItem(
                id=f"cost_item_{i+1:03d}",
                resource_name=template["resource_name"],
                resource_type=template["resource_type"],
                category=template["category"],
                current_monthly_cost=template["current_cost"] * variance,
                projected_monthly_cost=template["current_cost"] * variance * random.uniform(1.0, 1.15),
                usage_percentage=template["usage_percentage"],
                region=template["region"],
                tags={
                    "environment": "production",
                    "team": "platform",
                    "cost-center": "engineering"
                },
                last_updated=datetime.utcnow(),
                cost_trend=template["trend"]
            )
            
            self.cost_items.append(cost_item)
    
    def _generate_optimization_recommendations(self):
        """Generate cost optimization recommendations"""
        recommendations = [
            {
                "title": "Right-size Kubernetes cluster nodes",
                "description": "Current cluster nodes are over-provisioned with 45% average utilization. Reduce instance sizes to save costs.",
                "optimization_type": OptimizationType.RIGHT_SIZING,
                "affected_resources": ["opssight-prod-cluster"],
                "current_cost": 3200.0,
                "optimized_cost": 2100.0,
                "effort": "medium",
                "priority": PriorityLevel.HIGH,
                "confidence": 0.89,
                "steps": [
                    "Analyze workload patterns over 30 days",
                    "Test performance with smaller instance types in staging",
                    "Gradually migrate nodes during maintenance window",
                    "Monitor performance post-migration"
                ],
                "risks": ["Potential performance impact during peak loads"],
                "prerequisites": ["Performance baseline established", "Staging environment available"],
                "time": "2-3 weeks"
            },
            {
                "title": "Implement Reserved Instances for stable workloads",
                "description": "Purchase 1-year reserved instances for predictable workloads to achieve 30-40% cost savings.",
                "optimization_type": OptimizationType.RESERVED_INSTANCES,
                "affected_resources": ["postgres-primary-db", "redis-cluster-cache"],
                "current_cost": 1270.0,
                "optimized_cost": 850.0,
                "effort": "low",
                "priority": PriorityLevel.HIGH,
                "confidence": 0.95,
                "steps": [
                    "Analyze usage patterns for commitment eligibility",
                    "Purchase appropriate reserved instance types",
                    "Apply reserved instances to existing resources",
                    "Monitor savings realization"
                ],
                "risks": ["Commitment to 1-year term", "Less flexibility for scaling"],
                "prerequisites": ["Stable workload patterns confirmed"],
                "time": "1 week"
            },
            {
                "title": "Optimize Elasticsearch cluster configuration",
                "description": "Elasticsearch cluster is under-utilized at 35%. Consider smaller instances or consolidation.",
                "optimization_type": OptimizationType.RIGHT_SIZING,
                "affected_resources": ["elasticsearch-logs"],
                "current_cost": 650.0,
                "optimized_cost": 400.0,
                "effort": "medium",
                "priority": PriorityLevel.MEDIUM,
                "confidence": 0.78,
                "steps": [
                    "Analyze query patterns and data retention needs",
                    "Implement index lifecycle management",
                    "Reduce cluster size and optimize node configuration",
                    "Test search performance with new configuration"
                ],
                "risks": ["Search performance degradation", "Data retention concerns"],
                "prerequisites": ["Query pattern analysis completed"],
                "time": "3-4 weeks"
            },
            {
                "title": "Implement S3 Intelligent Tiering",
                "description": "Enable intelligent tiering for S3 storage to automatically move data to cost-effective storage classes.",
                "optimization_type": OptimizationType.STORAGE_TIERING,
                "affected_resources": ["s3-data-storage"],
                "current_cost": 1200.0,
                "optimized_cost": 900.0,
                "effort": "low",
                "priority": PriorityLevel.MEDIUM,
                "confidence": 0.92,
                "steps": [
                    "Enable S3 Intelligent Tiering on relevant buckets",
                    "Configure lifecycle policies for old data",
                    "Monitor access patterns and cost savings",
                    "Optimize data retention policies"
                ],
                "risks": ["Slight access latency for infrequently accessed data"],
                "prerequisites": ["Data access patterns understood"],
                "time": "1 week"
            },
            {
                "title": "Remove unused NAT Gateway",
                "description": "NAT Gateway shows only 25% utilization. Consider consolidating or removing if not essential.",
                "optimization_type": OptimizationType.RESOURCE_CLEANUP,
                "affected_resources": ["nat-gateway"],
                "current_cost": 125.0,
                "optimized_cost": 0.0,
                "effort": "low",
                "priority": PriorityLevel.LOW,
                "confidence": 0.85,
                "steps": [
                    "Audit outbound traffic requiring NAT Gateway",
                    "Identify alternative routing options",
                    "Test connectivity without NAT Gateway",
                    "Remove gateway if confirmed unnecessary"
                ],
                "risks": ["Potential connectivity issues for private subnets"],
                "prerequisites": ["Network traffic analysis completed"],
                "time": "1 week"
            },
            {
                "title": "Optimize CloudWatch Logs retention",
                "description": "CloudWatch logs retention can be optimized to reduce storage costs while maintaining compliance.",
                "optimization_type": OptimizationType.STORAGE_TIERING,
                "affected_resources": ["cloudwatch-logs"],
                "current_cost": 380.0,
                "optimized_cost": 190.0,
                "effort": "low",
                "priority": PriorityLevel.MEDIUM,
                "confidence": 0.87,
                "steps": [
                    "Review log retention requirements by service",
                    "Implement tiered retention policies",
                    "Export old logs to cheaper storage",
                    "Set up automated log cleanup"
                ],
                "risks": ["Loss of historical log data for debugging"],
                "prerequisites": ["Compliance requirements reviewed"],
                "time": "1-2 weeks"
            }
        ]
        
        for i, rec in enumerate(recommendations):
            monthly_savings = rec["current_cost"] - rec["optimized_cost"]
            annual_savings = monthly_savings * 12
            roi_months = 0.5 if monthly_savings > 0 else None  # Assume minimal implementation cost
            
            recommendation = OptimizationRecommendation(
                id=f"opt_rec_{i+1:03d}",
                title=rec["title"],
                description=rec["description"],
                optimization_type=rec["optimization_type"],
                affected_resources=rec["affected_resources"],
                current_monthly_cost=rec["current_cost"],
                optimized_monthly_cost=rec["optimized_cost"],
                monthly_savings=monthly_savings,
                annual_savings=annual_savings,
                implementation_effort=rec["effort"],
                priority=rec["priority"],
                confidence_score=rec["confidence"],
                implementation_steps=rec["steps"],
                risks=rec["risks"],
                prerequisites=rec["prerequisites"],
                estimated_implementation_time=rec["time"],
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 14)),
                roi_months=roi_months
            )
            
            self.optimization_recommendations.append(recommendation)
    
    def _generate_cost_forecasts(self):
        """Generate cost forecasting data"""
        current_total = sum(item.current_monthly_cost for item in self.cost_items)
        
        forecasts = [
            {
                "period": "Next Month",
                "increase": 5.2,
                "drivers": ["Increased traffic", "New feature deployments"],
                "confidence": 0.89
            },
            {
                "period": "Next Quarter",
                "increase": 12.8,
                "drivers": ["Seasonal traffic growth", "Infrastructure scaling", "New services"],
                "confidence": 0.82
            },
            {
                "period": "Next 6 Months",
                "increase": 18.5,
                "drivers": ["Business growth", "Additional regions", "Enhanced monitoring"],
                "confidence": 0.75
            },
            {
                "period": "Next Year",
                "increase": 25.3,
                "drivers": ["Market expansion", "Product portfolio growth", "Compliance requirements"],
                "confidence": 0.68
            }
        ]
        
        for forecast_data in forecasts:
            increase_factor = 1 + (forecast_data["increase"] / 100)
            projected_cost = current_total * increase_factor
            
            # Add confidence interval
            margin = projected_cost * 0.15  # 15% margin
            confidence_interval = (projected_cost - margin, projected_cost + margin)
            
            forecast = CostForecast(
                forecast_period=forecast_data["period"],
                current_monthly_cost=current_total,
                projected_monthly_cost=projected_cost,
                cost_increase_percentage=forecast_data["increase"],
                key_drivers=forecast_data["drivers"],
                confidence_interval=confidence_interval,
                forecast_accuracy=forecast_data["confidence"]
            )
            
            self.cost_forecasts.append(forecast)
    
    def _generate_waste_analysis(self):
        """Generate resource waste analysis"""
        waste_scenarios = [
            {
                "resource_name": "opssight-prod-cluster",
                "resource_type": "kubernetes_cluster",
                "waste_type": "over_provisioning",
                "waste_percentage": 55.0,  # 100 - 45 utilization
                "utilization": {"cpu": 45.0, "memory": 42.0, "network": 35.0},
                "action": "Right-size to smaller instances",
                "monthly_cost": 3200.0
            },
            {
                "resource_name": "elasticsearch-logs",
                "resource_type": "elasticsearch_cluster",
                "waste_type": "under_utilization",
                "waste_percentage": 65.0,  # 100 - 35 utilization
                "utilization": {"cpu": 35.0, "memory": 38.0, "storage": 45.0},
                "action": "Consolidate or downsize cluster",
                "monthly_cost": 650.0
            },
            {
                "resource_name": "nat-gateway",
                "resource_type": "nat_gateway",
                "waste_type": "unnecessary_resource",
                "waste_percentage": 75.0,  # 100 - 25 utilization
                "utilization": {"bandwidth": 25.0, "connections": 30.0},
                "action": "Remove if not required",
                "monthly_cost": 125.0
            },
            {
                "resource_name": "backup-storage",
                "resource_type": "s3_glacier",
                "waste_type": "over_retention",
                "waste_percentage": 60.0,  # 100 - 40 utilization
                "utilization": {"storage": 40.0, "retrieval": 5.0},
                "action": "Optimize retention policies",
                "monthly_cost": 95.0
            }
        ]
        
        for i, waste in enumerate(waste_scenarios):
            waste_cost = waste["monthly_cost"] * (waste["waste_percentage"] / 100)
            
            analysis = WasteAnalysis(
                resource_id=f"waste_{i+1:03d}",
                resource_name=waste["resource_name"],
                resource_type=waste["resource_type"],
                waste_type=waste["waste_type"],
                waste_percentage=waste["waste_percentage"],
                monthly_waste_cost=waste_cost,
                utilization_metrics=waste["utilization"],
                recommended_action=waste["action"],
                potential_savings=waste_cost * 0.8  # Assume 80% of waste can be recovered
            )
            
            self.waste_analysis.append(analysis)
    
    def _generate_historical_cost_data(self):
        """Generate historical cost data for trend analysis"""
        for item in self.cost_items:
            # Generate 90 days of historical data
            base_cost = item.current_monthly_cost / 30  # Daily cost
            
            for days_ago in range(90, 0, -1):
                # Add trend and random variation
                trend_factor = 1.0
                if item.cost_trend == "increasing":
                    trend_factor = 1 + (days_ago * 0.001)  # Gradual increase
                elif item.cost_trend == "decreasing":
                    trend_factor = 1 - (days_ago * 0.0005)  # Gradual decrease
                
                daily_cost = base_cost * trend_factor * random.uniform(0.9, 1.1)
                date = datetime.utcnow() - timedelta(days=days_ago)
                
                self.cost_history[item.id].append({
                    "date": date,
                    "cost": daily_cost,
                    "category": item.category.value
                })
    
    async def get_cost_overview(self) -> Dict[str, Any]:
        """Get comprehensive cost overview"""
        total_monthly_cost = sum(item.current_monthly_cost for item in self.cost_items)
        total_projected_cost = sum(item.projected_monthly_cost for item in self.cost_items)
        
        # Cost by category
        category_costs = defaultdict(float)
        for item in self.cost_items:
            category_costs[item.category.value] += item.current_monthly_cost
        
        # Top cost drivers
        top_costs = sorted(self.cost_items, key=lambda x: x.current_monthly_cost, reverse=True)[:5]
        
        # Total potential savings
        total_savings = sum(rec.monthly_savings for rec in self.optimization_recommendations)
        
        # Budget utilization
        monthly_budget = self.cost_budgets["monthly_total"]
        budget_utilization = (total_monthly_cost / monthly_budget) * 100
        
        return {
            "cost_summary": {
                "current_monthly_cost": round(total_monthly_cost, 2),
                "projected_monthly_cost": round(total_projected_cost, 2),
                "monthly_increase": round(total_projected_cost - total_monthly_cost, 2),
                "increase_percentage": round(((total_projected_cost - total_monthly_cost) / total_monthly_cost) * 100, 1),
                "annual_cost_projection": round(total_projected_cost * 12, 2)
            },
            "budget_analysis": {
                "monthly_budget": monthly_budget,
                "budget_utilization_percent": round(budget_utilization, 1),
                "budget_remaining": round(monthly_budget - total_monthly_cost, 2),
                "budget_status": "under_budget" if budget_utilization < 90 else "approaching_limit" if budget_utilization < 100 else "over_budget"
            },
            "cost_by_category": dict(category_costs),
            "top_cost_drivers": [
                {
                    "resource_name": item.resource_name,
                    "resource_type": item.resource_type,
                    "monthly_cost": round(item.current_monthly_cost, 2),
                    "percentage_of_total": round((item.current_monthly_cost / total_monthly_cost) * 100, 1)
                }
                for item in top_costs
            ],
            "optimization_potential": {
                "total_recommendations": len(self.optimization_recommendations),
                "potential_monthly_savings": round(total_savings, 2),
                "potential_annual_savings": round(total_savings * 12, 2),
                "savings_percentage": round((total_savings / total_monthly_cost) * 100, 1)
            },
            "waste_analysis_summary": {
                "total_waste_cost": round(sum(w.monthly_waste_cost for w in self.waste_analysis), 2),
                "waste_percentage": round((sum(w.monthly_waste_cost for w in self.waste_analysis) / total_monthly_cost) * 100, 1),
                "resources_with_waste": len(self.waste_analysis)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_optimization_recommendations(self, priority: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """Get cost optimization recommendations"""
        recommendations = self.optimization_recommendations.copy()
        
        # Filter by priority if specified
        if priority:
            try:
                priority_enum = PriorityLevel(priority.lower())
                recommendations = [r for r in recommendations if r.priority == priority_enum]
            except ValueError:
                pass
        
        # Sort by potential savings and priority
        priority_weight = {PriorityLevel.CRITICAL: 4, PriorityLevel.HIGH: 3, PriorityLevel.MEDIUM: 2, PriorityLevel.LOW: 1}
        recommendations.sort(key=lambda x: (priority_weight[x.priority], x.monthly_savings), reverse=True)
        
        # Limit results
        recommendations = recommendations[:limit]
        
        return {
            "recommendations": [
                {
                    "id": rec.id,
                    "title": rec.title,
                    "description": rec.description,
                    "optimization_type": rec.optimization_type.value,
                    "affected_resources": rec.affected_resources,
                    "current_monthly_cost": rec.current_monthly_cost,
                    "optimized_monthly_cost": rec.optimized_monthly_cost,
                    "monthly_savings": rec.monthly_savings,
                    "annual_savings": rec.annual_savings,
                    "implementation_effort": rec.implementation_effort,
                    "priority": rec.priority.value,
                    "confidence_score": rec.confidence_score,
                    "implementation_steps": rec.implementation_steps,
                    "risks": rec.risks,
                    "prerequisites": rec.prerequisites,
                    "estimated_implementation_time": rec.estimated_implementation_time,
                    "roi_months": rec.roi_months,
                    "created_at": rec.created_at.isoformat()
                }
                for rec in recommendations
            ],
            "summary": {
                "total_recommendations": len(recommendations),
                "total_potential_savings": round(sum(r.monthly_savings for r in recommendations), 2),
                "high_priority_recommendations": len([r for r in recommendations if r.priority in [PriorityLevel.HIGH, PriorityLevel.CRITICAL]]),
                "quick_wins": len([r for r in recommendations if r.implementation_effort == "low" and r.monthly_savings > 100])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_cost_forecasts(self) -> Dict[str, Any]:
        """Get cost forecasting analysis"""
        return {
            "forecasts": [
                {
                    "forecast_period": forecast.forecast_period,
                    "current_monthly_cost": round(forecast.current_monthly_cost, 2),
                    "projected_monthly_cost": round(forecast.projected_monthly_cost, 2),
                    "cost_increase_percentage": forecast.cost_increase_percentage,
                    "cost_increase_amount": round(forecast.projected_monthly_cost - forecast.current_monthly_cost, 2),
                    "key_drivers": forecast.key_drivers,
                    "confidence_interval": {
                        "lower": round(forecast.confidence_interval[0], 2),
                        "upper": round(forecast.confidence_interval[1], 2)
                    },
                    "forecast_accuracy": forecast.forecast_accuracy
                }
                for forecast in self.cost_forecasts
            ],
            "insights": {
                "highest_growth_period": max(self.cost_forecasts, key=lambda x: x.cost_increase_percentage).forecast_period,
                "total_annual_increase": round(max(self.cost_forecasts, key=lambda x: x.cost_increase_percentage).cost_increase_percentage, 1),
                "primary_cost_drivers": list(set(driver for forecast in self.cost_forecasts for driver in forecast.key_drivers))
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_waste_analysis(self) -> Dict[str, Any]:
        """Get resource waste analysis"""
        return {
            "waste_analysis": [
                {
                    "resource_id": waste.resource_id,
                    "resource_name": waste.resource_name,
                    "resource_type": waste.resource_type,
                    "waste_type": waste.waste_type,
                    "waste_percentage": waste.waste_percentage,
                    "monthly_waste_cost": round(waste.monthly_waste_cost, 2),
                    "utilization_metrics": waste.utilization_metrics,
                    "recommended_action": waste.recommended_action,
                    "potential_savings": round(waste.potential_savings, 2)
                }
                for waste in self.waste_analysis
            ],
            "summary": {
                "total_waste_resources": len(self.waste_analysis),
                "total_monthly_waste": round(sum(w.monthly_waste_cost for w in self.waste_analysis), 2),
                "total_potential_savings": round(sum(w.potential_savings for w in self.waste_analysis), 2),
                "worst_waste_resource": max(self.waste_analysis, key=lambda x: x.waste_percentage).resource_name,
                "waste_by_type": {
                    waste_type: len([w for w in self.waste_analysis if w.waste_type == waste_type])
                    for waste_type in set(w.waste_type for w in self.waste_analysis)
                }
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_cost_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get cost trend analysis"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Aggregate cost trends by category
        category_trends = defaultdict(list)
        daily_totals = defaultdict(float)
        
        for item_id, history in self.cost_history.items():
            for record in history:
                if record["date"] >= cutoff_date:
                    category_trends[record["category"]].append({
                        "date": record["date"].isoformat(),
                        "cost": round(record["cost"], 2)
                    })
                    daily_totals[record["date"].date()] += record["cost"]
        
        # Calculate trend statistics
        if daily_totals:
            costs = list(daily_totals.values())
            trend_direction = "increasing" if costs[-1] > costs[0] else "decreasing" if costs[-1] < costs[0] else "stable"
            avg_daily_cost = statistics.mean(costs)
            cost_volatility = statistics.stdev(costs) if len(costs) > 1 else 0
        else:
            trend_direction = "stable"
            avg_daily_cost = 0
            cost_volatility = 0
        
        return {
            "trend_analysis": {
                "period_days": days,
                "trend_direction": trend_direction,
                "average_daily_cost": round(avg_daily_cost, 2),
                "cost_volatility": round(cost_volatility, 2),
                "total_period_cost": round(sum(daily_totals.values()), 2)
            },
            "category_trends": dict(category_trends),
            "daily_totals": [
                {
                    "date": date.isoformat(),
                    "total_cost": round(cost, 2)
                }
                for date, cost in sorted(daily_totals.items())
            ],
            "insights": {
                "highest_cost_day": max(daily_totals.items(), key=lambda x: x[1])[0].isoformat() if daily_totals else None,
                "lowest_cost_day": min(daily_totals.items(), key=lambda x: x[1])[0].isoformat() if daily_totals else None,
                "cost_range": round(max(daily_totals.values()) - min(daily_totals.values()), 2) if daily_totals else 0
            },
            "timestamp": datetime.utcnow().isoformat()
        }

# Create global instance
cost_optimization = CostOptimizationService()

if __name__ == "__main__":
    # Test cost optimization features
    async def test_cost_optimization():
        print("💰 Testing Cost Optimization Service")
        print("=" * 55)
        
        # Test overview
        overview = await cost_optimization.get_cost_overview()
        print(f"✅ Cost Overview:")
        print(f"   • Current Monthly Cost: ${overview['cost_summary']['current_monthly_cost']:,}")
        print(f"   • Budget Utilization: {overview['budget_analysis']['budget_utilization_percent']}%")
        print(f"   • Potential Savings: ${overview['optimization_potential']['potential_monthly_savings']:,}/month")
        print(f"   • Waste Percentage: {overview['waste_analysis_summary']['waste_percentage']}%")
        print()
        
        # Test recommendations
        recommendations = await cost_optimization.get_optimization_recommendations()
        print(f"✅ Optimization Recommendations:")
        print(f"   • Total Recommendations: {recommendations['summary']['total_recommendations']}")
        print(f"   • Potential Savings: ${recommendations['summary']['total_potential_savings']:,}/month")
        print(f"   • High Priority: {recommendations['summary']['high_priority_recommendations']}")
        print(f"   • Quick Wins: {recommendations['summary']['quick_wins']}")
        print()
        
        # Test forecasts
        forecasts = await cost_optimization.get_cost_forecasts()
        print(f"✅ Cost Forecasts:")
        print(f"   • Forecast Periods: {len(forecasts['forecasts'])}")
        print(f"   • Highest Growth: {forecasts['insights']['highest_growth_period']}")
        print(f"   • Annual Increase: {forecasts['insights']['total_annual_increase']}%")
        print()
        
        # Test waste analysis
        waste = await cost_optimization.get_waste_analysis()
        print(f"✅ Waste Analysis:")
        print(f"   • Resources with Waste: {waste['summary']['total_waste_resources']}")
        print(f"   • Monthly Waste: ${waste['summary']['total_monthly_waste']:,}")
        print(f"   • Potential Savings: ${waste['summary']['total_potential_savings']:,}")
        
        print("\n✅ Cost optimization test completed!")
    
    asyncio.run(test_cost_optimization())