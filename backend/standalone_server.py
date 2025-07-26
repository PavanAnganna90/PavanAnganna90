"""
Completely isolated FastAPI server for health checks and basic functionality.
No imports from the app module to avoid dependency issues.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os

# Create FastAPI instance
app = FastAPI(
    title="OpsSight Platform API (Simple)",
    description="DevOps Platform API - Simple Health Check Version",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OpsSight Platform API - Simple Version",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0-simple",
        "environment": os.getenv("ENVIRONMENT", "production")
    }

@app.get("/api/v1/health")
async def api_health_check():
    """API health check endpoint"""
    return await health_check()

@app.get("/api/v1/status")
async def api_status():
    """API status endpoint"""
    return {
        "api": "operational",
        "database": "not connected (simple mode)",
        "redis": "not connected (simple mode)",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/metrics")
async def get_metrics():
    """Mock metrics endpoint for frontend"""
    return {
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "disk_usage": 23.4,
        "network_io": {"in": 1234567, "out": 987654},
        "active_deployments": 8,
        "pipeline_runs_today": 32,
        "success_rate": 96.5,
        "timestamp": datetime.utcnow().isoformat(),
        "mode": "simple"
    }

@app.get("/api/v1/deployments")
async def get_deployments():
    """Mock deployments endpoint"""
    return [
        {
            "id": "dep-001",
            "name": "frontend-app",
            "status": "running",
            "environment": "production",
            "version": "v1.2.3",
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "id": "dep-002", 
            "name": "api-service",
            "status": "running",
            "environment": "production",
            "version": "v2.0.0-simple",
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "id": "dep-003",
            "name": "database-service",
            "status": "running",
            "environment": "production", 
            "version": "v1.0.0",
            "updated_at": datetime.utcnow().isoformat()
        }
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)