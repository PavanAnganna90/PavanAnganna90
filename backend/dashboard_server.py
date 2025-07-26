"""
Dashboard-focused FastAPI server with WebSocket support
Optimized for real-time dashboard without heavy dependencies
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import asyncio
import json
import logging
import os
import random
from typing import List, Dict, Any
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI instance
app = FastAPI(
    title="OpsSight Dashboard API",
    description="Real-time dashboard API with WebSocket support",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Demo data store
class DashboardData:
    def __init__(self):
        self.metrics_history = []
        self.deployments = []
        self.alerts = []
        self.projects = []
        self._initialize_demo_data()
    
    def _initialize_demo_data(self):
        """Initialize with comprehensive demo data"""
        # Demo projects
        self.projects = [
            {
                "id": 1,
                "name": "Frontend Application",
                "slug": "frontend-app",
                "description": "Next.js dashboard application",
                "repository_url": "https://github.com/opssight/frontend",
                "status": "active"
            },
            {
                "id": 2,
                "name": "Backend API",
                "slug": "backend-api", 
                "description": "FastAPI backend service",
                "repository_url": "https://github.com/opssight/backend",
                "status": "active"
            },
            {
                "id": 3,
                "name": "Database Service",
                "slug": "database-service",
                "description": "PostgreSQL database",
                "repository_url": "https://github.com/opssight/database",
                "status": "active"
            }
        ]
        
        # Demo deployments
        self.deployments = [
            {
                "id": 1,
                "project_id": 1,
                "project_name": "Frontend Application",
                "version": "v2.1.0",
                "commit_sha": "abc123def456",
                "commit_message": "Add real-time dashboard with WebSocket support",
                "status": "success",
                "environment": "production",
                "started_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "completed_at": (datetime.utcnow() - timedelta(hours=1, minutes=45)).isoformat(),
                "duration_seconds": 900
            },
            {
                "id": 2,
                "project_id": 2,
                "project_name": "Backend API",
                "version": "v2.0.8",
                "commit_sha": "def789ghi012",
                "commit_message": "Enhanced API endpoints and WebSocket integration",
                "status": "success",
                "environment": "production",
                "started_at": (datetime.utcnow() - timedelta(hours=4)).isoformat(),
                "completed_at": (datetime.utcnow() - timedelta(hours=3, minutes=50)).isoformat(),
                "duration_seconds": 600
            },
            {
                "id": 3,
                "project_id": 3,
                "project_name": "Database Service",
                "version": "v1.5.2",
                "commit_sha": "ghi345jkl678",
                "commit_message": "Database optimization and index improvements",
                "status": "running",
                "environment": "production",
                "started_at": (datetime.utcnow() - timedelta(minutes=30)).isoformat(),
                "completed_at": None,
                "duration_seconds": None
            }
        ]
        
        # Demo alerts
        self.alerts = [
            {
                "id": 1,
                "title": "High Memory Usage",
                "message": "Memory usage exceeded 85% threshold",
                "severity": "warning",
                "status": "active",
                "source": "monitoring",
                "triggered_at": (datetime.utcnow() - timedelta(minutes=25)).isoformat()
            },
            {
                "id": 2,
                "title": "Deployment Completed Successfully",
                "message": "Frontend application v2.1.0 deployed to production",
                "severity": "info",
                "status": "resolved",
                "source": "deployment",
                "triggered_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                "resolved_at": (datetime.utcnow() - timedelta(hours=1, minutes=45)).isoformat()
            }
        ]
        
        # Initialize metrics history (last 24 hours)
        self._generate_metrics_history()
    
    def _generate_metrics_history(self):
        """Generate realistic metrics history for dashboard"""
        base_time = datetime.utcnow() - timedelta(hours=24)
        
        for i in range(288):  # 24 hours * 12 (5-minute intervals)
            timestamp = base_time + timedelta(minutes=i * 5)
            
            # Generate realistic metrics with patterns
            time_factor = (i % 144) / 144  # Daily cycle
            cpu_base = 40 + 30 * time_factor + random.uniform(-10, 15)
            memory_base = 60 + 20 * time_factor + random.uniform(-15, 20)
            disk_base = 25 + random.uniform(-3, 8)
            
            self.metrics_history.append({
                "timestamp": timestamp.isoformat(),
                "cpu_usage": max(5, min(95, cpu_base)),
                "memory_usage": max(10, min(90, memory_base)),
                "disk_usage": max(15, min(80, disk_base)),
                "network_io": {
                    "in": random.randint(800000, 4000000),
                    "out": random.randint(400000, 1800000)
                },
                "response_time_ms": random.uniform(45, 250),
                "active_connections": random.randint(50, 200)
            })

# Global data store
dashboard_data = DashboardData()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_count = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_count += 1
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except:
            await self.disconnect(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

def generate_current_metrics():
    """Generate current system metrics"""
    # Simulate realistic metrics with some variation
    current_time = datetime.utcnow()
    hour_of_day = current_time.hour
    
    # Simulate daily patterns
    cpu_base = 35 + (hour_of_day * 2.5) + random.uniform(-12, 18)
    memory_base = 55 + (hour_of_day * 1.8) + random.uniform(-18, 25)
    disk_base = 28 + random.uniform(-6, 12)
    
    return {
        "cpu_usage": round(max(8, min(92, cpu_base)), 1),
        "memory_usage": round(max(15, min(88, memory_base)), 1),
        "disk_usage": round(max(18, min(75, disk_base)), 1),
        "network_io": {
            "in": random.randint(1200000, 4500000),
            "out": random.randint(600000, 2200000)
        },
        "response_time_ms": round(random.uniform(48, 280), 1),
        "active_connections": random.randint(85, 220),
        "timestamp": current_time.isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint with enhanced info"""
    return {
        "message": "OpsSight Dashboard API - Enhanced Version",
        "version": "2.1.0",
        "status": "operational",
        "features": [
            "Real-time metrics",
            "WebSocket support", 
            "Dashboard integration",
            "Live deployments",
            "System monitoring"
        ],
        "websocket_connections": len(manager.active_connections),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    current_metrics = generate_current_metrics()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.1.0",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "services": {
            "api": "operational",
            "websockets": f"operational ({len(manager.active_connections)} connections)",
            "database": "operational",
            "cache": "operational"
        },
        "current_metrics": current_metrics
    }

@app.get("/api/v1/health")
async def api_health_check():
    """API health check endpoint"""
    return await health_check()

@app.get("/api/v1/metrics")
async def get_current_metrics():
    """Get current system metrics with dashboard data"""
    metrics = generate_current_metrics()
    
    # Add dashboard-specific metrics
    running_deployments = len([d for d in dashboard_data.deployments if d["status"] == "running"])
    total_deployments = len(dashboard_data.deployments)
    successful_deployments = len([d for d in dashboard_data.deployments if d["status"] == "success"])
    
    metrics.update({
        "active_deployments": running_deployments,
        "total_deployments": total_deployments,
        "success_rate": round((successful_deployments / max(1, total_deployments)) * 100, 1),
        "pipeline_runs_today": random.randint(28, 55),
        "active_alerts": len([a for a in dashboard_data.alerts if a["status"] == "active"]),
        "websocket_connections": len(manager.active_connections),
        "mode": "dashboard-enhanced"
    })
    
    # Store in history (keep last 500 entries)
    dashboard_data.metrics_history.append(metrics)
    if len(dashboard_data.metrics_history) > 500:
        dashboard_data.metrics_history = dashboard_data.metrics_history[-500:]
    
    return metrics

@app.get("/api/v1/metrics/history")
async def get_metrics_history(hours: int = 24, limit: int = 200):
    """Get historical metrics data"""
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    filtered_metrics = [
        m for m in dashboard_data.metrics_history
        if datetime.fromisoformat(m["timestamp"].replace('Z', '')) > cutoff_time
    ]
    
    # Return last N data points
    result_data = filtered_metrics[-limit:] if len(filtered_metrics) > limit else filtered_metrics
    
    return {
        "data": result_data,
        "count": len(result_data),
        "total_available": len(filtered_metrics),
        "timerange_hours": hours,
        "limit": limit
    }

@app.get("/api/v1/deployments")
async def get_deployments():
    """Get all deployments with enhanced details"""
    return dashboard_data.deployments

@app.post("/api/v1/deployments")
async def create_deployment(deployment_data: dict):
    """Create a new deployment"""
    project = next((p for p in dashboard_data.projects if p["id"] == deployment_data.get("project_id", 1)), None)
    
    new_deployment = {
        "id": len(dashboard_data.deployments) + 1,
        "project_id": deployment_data.get("project_id", 1),
        "project_name": project["name"] if project else "Unknown Project",
        "version": deployment_data.get("version", f"v1.0.{random.randint(1, 99)}"),
        "commit_sha": deployment_data.get("commit_sha", str(uuid.uuid4())[:8]),
        "commit_message": deployment_data.get("commit_message", "Automated deployment"),
        "status": "running",
        "environment": deployment_data.get("environment", "production"),
        "started_at": datetime.utcnow().isoformat(),
        "completed_at": None,
        "duration_seconds": None
    }
    
    dashboard_data.deployments.append(new_deployment)
    
    # Broadcast to connected WebSocket clients
    await manager.broadcast(json.dumps({
        "type": "deployment_created",
        "data": new_deployment
    }))
    
    return new_deployment

@app.get("/api/v1/projects")
async def get_projects():
    """Get all projects"""
    return dashboard_data.projects

@app.get("/api/v1/alerts")
async def get_alerts():
    """Get system alerts"""
    return dashboard_data.alerts

@app.post("/api/v1/alerts")
async def create_alert(alert_data: dict):
    """Create a new alert"""
    new_alert = {
        "id": len(dashboard_data.alerts) + 1,
        "title": alert_data.get("title", "System Alert"),
        "message": alert_data.get("message", "System alert triggered"),
        "severity": alert_data.get("severity", "info"),
        "status": "active",
        "source": alert_data.get("source", "system"),
        "triggered_at": datetime.utcnow().isoformat()
    }
    
    dashboard_data.alerts.append(new_alert)
    
    # Broadcast to connected WebSocket clients
    await manager.broadcast(json.dumps({
        "type": "alert_created",
        "data": new_alert
    }))
    
    return new_alert

@app.get("/api/v1/system/status")
async def get_system_status():
    """Get comprehensive system status"""
    current_metrics = generate_current_metrics()
    
    return {
        "overall_status": "operational",
        "services": {
            "api": {
                "status": "operational",
                "uptime": "4 hours 23 minutes",
                "version": "2.1.0",
                "response_time_ms": current_metrics["response_time_ms"]
            },
            "websockets": {
                "status": "operational",
                "active_connections": len(manager.active_connections),
                "total_connections": manager.connection_count
            },
            "database": {
                "status": "operational",
                "connection_pool": "8/10 active"
            },
            "cache": {
                "status": "operational",
                "hit_rate": "96.4%",
                "memory_usage": "245MB"
            }
        },
        "metrics": current_metrics,
        "deployments": {
            "total": len(dashboard_data.deployments),
            "running": len([d for d in dashboard_data.deployments if d["status"] == "running"]),
            "successful": len([d for d in dashboard_data.deployments if d["status"] == "success"])
        },
        "alerts": {
            "total": len(dashboard_data.alerts),
            "active": len([a for a in dashboard_data.alerts if a["status"] == "active"])
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time dashboard updates"""
    await manager.connect(websocket)
    
    try:
        while True:
            # Send periodic metrics updates
            metrics = await get_current_metrics()
            
            await manager.send_personal_message(
                json.dumps({
                    "type": "metrics_update",
                    "data": metrics,
                    "timestamp": datetime.utcnow().isoformat()
                }),
                websocket
            )
            
            # Send system status occasionally
            if random.random() < 0.1:  # 10% chance
                system_status = await get_system_status()
                await manager.send_personal_message(
                    json.dumps({
                        "type": "system_status",
                        "data": system_status
                    }),
                    websocket
                )
            
            # Wait before next update (5 seconds)
            await asyncio.sleep(5)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)