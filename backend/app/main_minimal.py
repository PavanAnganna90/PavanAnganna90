"""
Minimal FastAPI application for health checks and basic API functionality.
This version loads only essential components to ensure quick startup.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import sys
from datetime import datetime

# Create FastAPI instance
app = FastAPI(
    title="OpsSight Platform API (Minimal)",
    description="DevOps Platform API - Minimal Version",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "OpsSight Platform API",
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
        "version": "2.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
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
        "database": "checking...",
        "redis": "checking...",
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
        "active_deployments": 12,
        "pipeline_runs_today": 45,
        "success_rate": 94.5,
        "timestamp": datetime.utcnow().isoformat()
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
            "version": "v2.0.0",
            "updated_at": datetime.utcnow().isoformat()
        }
    ]

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)