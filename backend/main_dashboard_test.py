"""
OpsSight Dashboard Builder Test Server - v2.0.0
FastAPI server for testing the Custom Dashboard Builder functionality

Run this server to test dashboard creation, management, and widget configuration.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import logging
import sys
import os
import uvicorn
from pathlib import Path

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our dashboard endpoints
from api_dashboard_endpoints import dashboard_router
from api_rbac_endpoints import rbac_router
from api_sso_endpoints import sso_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="OpsSight Dashboard Builder API",
    description="API for testing custom dashboard builder functionality",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard_router)
app.include_router(rbac_router)
app.include_router(sso_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "OpsSight Dashboard Builder",
        "version": "2.0.0",
        "endpoints": {
            "dashboards": "/dashboards",
            "rbac": "/rbac", 
            "sso": "/auth/sso",
            "docs": "/docs"
        }
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "OpsSight Dashboard Builder API",
        "version": "2.0.0",
        "docs_url": "/docs",
        "health_url": "/health"
    }

# Exception handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 OpsSight Dashboard Builder Test Server")
    print("=" * 60)
    print()
    print("📋 Testing Endpoints Available:")
    print("   • Dashboard Builder: http://localhost:8000/docs#/Dashboard%20Builder")
    print("   • RBAC Management:   http://localhost:8000/docs#/RBAC%20Management") 
    print("   • SSO Authentication: http://localhost:8000/docs#/SSO%20Authentication")
    print()
    print("🔗 Key URLs:")
    print("   • API Documentation: http://localhost:8000/docs")
    print("   • Health Check:      http://localhost:8000/health")
    print("   • ReDoc:            http://localhost:8000/redoc")
    print()
    print("📊 Dashboard Builder Test Endpoints:")
    print("   • GET  /dashboards           - List dashboards")
    print("   • POST /dashboards           - Create dashboard")
    print("   • GET  /dashboards/{id}      - Get dashboard")
    print("   • PUT  /dashboards/{id}      - Update dashboard")
    print("   • DELETE /dashboards/{id}    - Delete dashboard")
    print("   • POST /dashboards/{id}/duplicate - Duplicate dashboard")
    print("   • GET  /dashboards/templates/list - List templates")
    print("   • GET  /dashboards/widgets/types  - Get widget types")
    print()
    print("Starting server on http://localhost:8000...")
    print("Press Ctrl+C to stop")
    print("=" * 60)
    
    uvicorn.run(
        "main_dashboard_test:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )