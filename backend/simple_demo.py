#!/usr/bin/env python3
"""
Simple demo script to test basic functionality
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="OpsSight Demo API", version="1.0.0-demo")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "OpsSight Demo API is running!", "status": "healthy"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "OpsSight Demo API"}

@app.get("/api/v1/health")
async def api_health():
    return {"status": "healthy", "service": "OpsSight Demo API v1"}

@app.get("/api/v1/metrics")
async def metrics():
    return {
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "disk_usage": 34.5,
        "timestamp": "2025-07-14T13:52:00Z"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)