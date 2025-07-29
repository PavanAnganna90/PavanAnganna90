#!/bin/bash

# =============================================================================
# OpsSight Platform - Local Development Deployment with Auth Bypass
# =============================================================================
# Deploys a fully functional environment with all dashboards accessible
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Script configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/logs/local-deploy.log"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    echo "=============================================================================="
    echo "            OpsSight Local Development Deployment (Auth Bypass)              "
    echo "=============================================================================="
    echo -e "${NC}"
}

# Setup environment files with auth bypass
setup_environment() {
    log "🔧 Setting up environment with authentication bypass..."
    
    # Backend environment with dev auth bypass
    cat > "$PROJECT_ROOT/backend/.env" << 'EOF'
# OpsSight Backend - Local Development with Auth Bypass
DEBUG=True
APP_NAME=OpsSight Development
APP_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
# Enable development auth bypass
AUTH_BYPASS_ENABLED=true
DEMO_MODE=true
GITHUB_CLIENT_ID=demo-client-id
GITHUB_CLIENT_SECRET=demo-client-secret
GITHUB_CALLBACK_URL=http://localhost:8000/auth/callback
JWT_SECRET_KEY=dev-jwt-secret-key-that-is-at-least-32-characters-long
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30
CSRF_SECRET=dev-csrf-secret
ENVIRONMENT=development
DATABASE_URL=postgresql://postgres:postgres@db:5432/opsight_dev
REDIS_URL=redis://redis:6379/0
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080
PROMETHEUS_MULTIPROC_DIR=/tmp/metrics
PROMETHEUS_METRICS_PORT=8001
WORKERS=1
# Disable strict auth checks
DISABLE_AUTH_CHECKS=true
ALLOW_DEMO_LOGIN=true
EOF
    
    # Frontend environment with dev auth bypass
    cat > "$PROJECT_ROOT/frontend/.env.local" << 'EOF'
# OpsSight Frontend - Local Development with Auth Bypass
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NEXT_PUBLIC_APP_VERSION=2.0.0-dev
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
# Enable development features
NEXT_PUBLIC_ENABLE_DEV_AUTH=true
NEXT_PUBLIC_ENABLE_DEMO_MODE=true
NEXT_PUBLIC_DISABLE_SSO=true
NEXT_PUBLIC_MOCK_AUTH=false
EOF
    
    # API Module environment
    cat > "$PROJECT_ROOT/api-module/.env" << 'EOF'
# OpsSight API Module - Local Development
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@db:5432/opsight_dev
REDIS_URL=redis://redis:6379/0
JWT_SECRET=dev-jwt-secret-key-that-is-at-least-32-characters-long
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
# Development features
AUTH_BYPASS=true
DEMO_MODE=true
EOF
    
    log "✅ Environment files created with auth bypass enabled"
}

# Create docker-compose override for local development
create_docker_override() {
    log "🐳 Creating Docker Compose override for local development..."
    
    cat > "$PROJECT_ROOT/docker-compose.local.yml" << 'EOF'
version: '3.8'

# Local development overrides with auth bypass
services:
  # Frontend with dev auth features
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_ENABLE_DEV_AUTH=true
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_ENABLE_DEV_AUTH=true
      - NEXT_PUBLIC_ENABLE_DEMO_MODE=true
      - NEXT_PUBLIC_DISABLE_SSO=true
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    command: ["npm", "run", "dev"]
    depends_on:
      - backend
      - api-module
  
  # Backend with auth bypass
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DEBUG=True
      - AUTH_BYPASS_ENABLED=true
      - DEMO_MODE=true
      - DISABLE_AUTH_CHECKS=true
      - ALLOW_DEMO_LOGIN=true
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/opsight_dev
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ./backend:/code
    command: ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
  
  # API Module
  api-module:
    build:
      context: ./api-module
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=development
      - AUTH_BYPASS=true
      - DEMO_MODE=true
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/opsight_dev
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "3001:3001"
    volumes:
      - ./api-module/src:/app/src
    command: ["npm", "run", "dev"]
    depends_on:
      - db
      - redis
  
  # Database
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=opsight_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/setup_database.py:/docker-entrypoint-initdb.d/setup.py
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
  
  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --save 20 1 --loglevel warning
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
  
  # Monitoring stack remains the same
  prometheus:
    image: prom/prometheus:v2.45.0
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=7d'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    networks:
      - monitor-net
  
  grafana:
    image: grafana/grafana:10.0.3
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    ports:
      - "3002:3000"
    networks:
      - monitor-net
  
  # Node exporter for system metrics
  node-exporter:
    image: prom/node-exporter:v1.6.1
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    networks:
      - monitor-net

networks:
  frontend-net:
  backend-net:
  monitor-net:
  database-net:

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:
  frontend_node_modules:
  api_node_modules:
EOF
    
    log "✅ Docker Compose override created"
}

# Create authentication bypass middleware
create_auth_bypass() {
    log "🔐 Creating authentication bypass for local development..."
    
    # Create backend auth bypass middleware
    cat > "$PROJECT_ROOT/backend/app/middleware/dev_auth_bypass.py" << 'EOF'
"""
Development Authentication Bypass Middleware
Only for local development - NEVER use in production!
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

from app.core.config import settings
from app.models.user import User


class DevAuthBypass:
    """Development authentication bypass"""
    
    @staticmethod
    def create_dev_token(user_id: str = "dev-user-001", email: str = "dev@opssight.local") -> str:
        """Create a development JWT token"""
        payload = {
            "sub": user_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(days=30),
            "iat": datetime.utcnow(),
            "type": "access",
            "role": "ADMIN"
        }
        return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    
    @staticmethod
    def get_dev_user() -> dict:
        """Get development user data"""
        return {
            "id": "dev-user-001",
            "email": "dev@opssight.local",
            "firstName": "Dev",
            "lastName": "User",
            "role": "ADMIN",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }


async def dev_auth_dependency(request: Request) -> Optional[dict]:
    """
    Development authentication dependency
    Automatically authenticates requests in development mode
    """
    if not settings.auth_bypass_enabled:
        return None
    
    # Check for existing auth header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return None  # Let normal auth handle it
    
    # Return dev user for all requests
    return DevAuthBypass.get_dev_user()


# Demo login endpoint for development
async def create_demo_token():
    """Create a demo token for development"""
    if not settings.demo_mode:
        raise HTTPException(status_code=403, detail="Demo mode not enabled")
    
    dev_user = DevAuthBypass.get_dev_user()
    token = DevAuthBypass.create_dev_token(dev_user["id"], dev_user["email"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": dev_user
    }
EOF
    
    # Create frontend auth bypass component
    cat > "$PROJECT_ROOT/frontend/src/components/auth/DevAuthBypass.tsx" << 'EOF'
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/DashboardAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogIn, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function DevAuthBypass() {
  const { login, isAuthenticated, user } = useAuth();
  const isDevelopment = process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';
  const isDevAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true';

  useEffect(() => {
    // Auto-login in development if not authenticated
    if (isDevelopment && isDevAuthEnabled && !isAuthenticated) {
      handleDevLogin();
    }
  }, [isDevelopment, isDevAuthEnabled, isAuthenticated]);

  const handleDevLogin = async () => {
    try {
      // Use demo credentials for development
      await login({
        email: 'dev@opssight.local',
        password: 'dev-password'
      });
    } catch (error) {
      console.error('Dev login failed:', error);
      // Try alternative demo endpoint
      try {
        const response = await fetch('http://localhost:8000/auth/demo-token', {
          method: 'POST'
        });
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          window.location.reload();
        }
      } catch (demoError) {
        console.error('Demo token fetch failed:', demoError);
      }
    }
  };

  if (!isDevelopment || !isDevAuthEnabled) {
    return null;
  }

  if (isAuthenticated && user) {
    return (
      <Alert className="mb-4">
        <User className="h-4 w-4" />
        <AlertTitle>Development Mode</AlertTitle>
        <AlertDescription>
          Logged in as: {user.email} ({user.role})
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Development Authentication</CardTitle>
        <CardDescription>
          Quick access for local development
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Development Mode</AlertTitle>
          <AlertDescription>
            Authentication bypass is enabled for local development.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <Button 
            onClick={handleDevLogin} 
            className="w-full"
            size="lg"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Quick Dev Login
          </Button>
          
          <div className="text-sm text-muted-foreground text-center">
            This will log you in as an admin user with full access to all features.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
EOF
    
    log "✅ Authentication bypass created"
}

# Setup demo data
setup_demo_data() {
    log "📊 Setting up demo data..."
    
    # Create demo data setup script
    cat > "$PROJECT_ROOT/backend/setup_demo_data.py" << 'EOF'
"""
Demo Data Setup for OpsSight Platform
Creates sample data for all features
"""
import asyncio
from datetime import datetime, timedelta
import random
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_database_manager
from app.models.user import User
from app.models.project import Project
from app.models.pipeline import Pipeline, PipelineRun, PipelineStage
from app.models.metrics import MetricSnapshot
from app.models.alert import Alert
from app.utils.security import get_password_hash


async def create_demo_data():
    """Create comprehensive demo data"""
    db_manager = get_database_manager()
    
    async with db_manager.get_session() as session:
        # Create demo users
        demo_users = [
            {
                "email": "dev@opssight.local",
                "password": get_password_hash("dev-password"),
                "first_name": "Dev",
                "last_name": "User",
                "role": "ADMIN",
                "is_active": True
            },
            {
                "email": "admin@opssight.local",
                "password": get_password_hash("admin-password"),
                "first_name": "Admin",
                "last_name": "User",
                "role": "ADMIN",
                "is_active": True
            },
            {
                "email": "user@opssight.local",
                "password": get_password_hash("user-password"),
                "first_name": "Regular",
                "last_name": "User",
                "role": "USER",
                "is_active": True
            }
        ]
        
        for user_data in demo_users:
            user = User(**user_data)
            session.add(user)
        
        await session.commit()
        
        # Create demo projects
        projects = [
            Project(
                name="OpsSight Platform",
                description="Main DevOps visibility platform",
                repository_url="https://github.com/opssight/platform",
                is_active=True
            ),
            Project(
                name="Microservices API",
                description="Backend microservices architecture",
                repository_url="https://github.com/opssight/api",
                is_active=True
            ),
            Project(
                name="Mobile App",
                description="React Native mobile application",
                repository_url="https://github.com/opssight/mobile",
                is_active=True
            )
        ]
        
        for project in projects:
            session.add(project)
        
        await session.commit()
        
        # Create demo pipelines with runs
        for project in projects:
            pipeline = Pipeline(
                project_id=project.id,
                name=f"{project.name} CI/CD",
                description=f"Automated pipeline for {project.name}",
                config={
                    "stages": ["build", "test", "security", "deploy"],
                    "triggers": ["push", "pull_request"]
                }
            )
            session.add(pipeline)
            await session.commit()
            
            # Create pipeline runs
            for i in range(20):
                run_time = datetime.utcnow() - timedelta(hours=random.randint(1, 168))
                status = random.choice(["SUCCESS", "FAILED", "RUNNING", "SUCCESS", "SUCCESS"])
                
                run = PipelineRun(
                    pipeline_id=pipeline.id,
                    run_number=i + 1,
                    status=status,
                    started_at=run_time,
                    finished_at=run_time + timedelta(minutes=random.randint(5, 30)) if status != "RUNNING" else None,
                    commit_sha=f"abc{random.randint(1000, 9999)}def",
                    branch="main" if i % 3 == 0 else "develop",
                    triggered_by="GitHub Actions"
                )
                session.add(run)
            
        await session.commit()
        
        # Create demo metrics
        metric_types = [
            ("cpu_usage", "percent"),
            ("memory_usage", "percent"),
            ("response_time", "milliseconds"),
            ("error_rate", "percent"),
            ("requests_per_second", "count"),
            ("active_users", "count")
        ]
        
        for metric_name, unit in metric_types:
            for i in range(100):
                timestamp = datetime.utcnow() - timedelta(minutes=i * 15)
                value = random.uniform(10, 90) if "percent" in unit else random.uniform(50, 500)
                
                metric = MetricSnapshot(
                    metric_name=metric_name,
                    metric_value=value,
                    unit=unit,
                    timestamp=timestamp,
                    labels={
                        "service": random.choice(["backend", "frontend", "api"]),
                        "environment": "production"
                    }
                )
                session.add(metric)
        
        await session.commit()
        
        # Create demo alerts
        alert_types = [
            ("High CPU Usage", "CPU usage above 80%", "warning"),
            ("Service Down", "Backend service is not responding", "critical"),
            ("High Error Rate", "Error rate exceeds 5%", "warning"),
            ("SSL Certificate Expiry", "SSL certificate expires in 7 days", "info"),
            ("Database Connection Pool", "Connection pool usage above 90%", "warning")
        ]
        
        for title, description, severity in alert_types:
            alert = Alert(
                title=title,
                description=description,
                severity=severity,
                status="active" if random.choice([True, False]) else "resolved",
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72)),
                resolved_at=datetime.utcnow() if severity == "resolved" else None,
                metadata={
                    "service": random.choice(["backend", "frontend", "database"]),
                    "threshold": random.randint(70, 95)
                }
            )
            session.add(alert)
        
        await session.commit()
        
    print("✅ Demo data created successfully!")


if __name__ == "__main__":
    asyncio.run(create_demo_data())
EOF
    
    log "✅ Demo data setup script created"
}

# Clean and prepare environment
prepare_environment() {
    log "🧹 Cleaning up previous deployments..."
    
    # Stop and remove existing containers
    docker-compose -f docker-compose.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.local.yml down -v 2>/dev/null || true
    
    # Clean up volumes (optional - comment out to preserve data)
    # docker volume prune -f
    
    # Ensure required directories exist
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/data/postgres"
    mkdir -p "$PROJECT_ROOT/data/redis"
    mkdir -p "$PROJECT_ROOT/data/prometheus"
    mkdir -p "$PROJECT_ROOT/data/grafana"
    
    log "✅ Environment prepared"
}

# Build and start services
deploy_services() {
    log "🚀 Building and deploying services..."
    
    # Build images
    log_info "Building Docker images..."
    docker-compose -f docker-compose.local.yml build --parallel
    
    # Start core services first
    log_info "Starting core services..."
    docker-compose -f docker-compose.local.yml up -d db redis
    
    # Wait for database to be ready
    log_info "Waiting for database..."
    sleep 10
    
    # Start remaining services
    log_info "Starting application services..."
    docker-compose -f docker-compose.local.yml up -d
    
    log "✅ All services deployed"
}

# Initialize database and demo data
initialize_data() {
    log "🗄️ Initializing database and demo data..."
    
    # Wait for backend to be ready
    sleep 20
    
    # Run database migrations
    docker-compose -f docker-compose.local.yml exec -T backend python -c "
from app.db.database import init_db
import asyncio
asyncio.run(init_db())
" || log_warning "Database initialization skipped or already done"
    
    # Load demo data
    docker-compose -f docker-compose.local.yml exec -T backend python setup_demo_data.py || log_warning "Demo data loading skipped"
    
    log "✅ Database initialized"
}

# Verify deployment
verify_deployment() {
    log "✔️ Verifying deployment..."
    
    local services=(
        "frontend:3000:Frontend"
        "backend:8000:Backend API"
        "api-module:3001:API Module"
        "prometheus:9090:Prometheus"
        "grafana:3002:Grafana"
    )
    
    echo ""
    echo "Service Status:"
    echo "---------------"
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service port name <<< "$service_info"
        if curl -f -s --max-time 5 "http://localhost:${port}" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${name}${NC} - http://localhost:${port}"
        else
            echo -e "${YELLOW}⏳ ${name}${NC} - Starting up..."
        fi
    done
    
    echo ""
}

# Display access information
show_access_info() {
    echo ""
    echo -e "${GREEN}=============================================================================="
    echo "                     🎉 Deployment Complete! 🎉                              "
    echo -e "==============================================================================${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access Points:${NC}"
    echo "  • Frontend Dashboard:   http://localhost:3000"
    echo "  • Backend API:          http://localhost:8000"
    echo "  • API Documentation:    http://localhost:8000/docs"
    echo "  • API Module:           http://localhost:3001"
    echo "  • Prometheus:           http://localhost:9090"
    echo "  • Grafana:              http://localhost:3002 (anonymous access enabled)"
    echo ""
    echo -e "${BLUE}🔐 Authentication:${NC}"
    echo "  • Dev Mode:     Auto-login enabled"
    echo "  • Admin Login:  dev@opssight.local / dev-password"
    echo "  • Regular User: user@opssight.local / user-password"
    echo ""
    echo -e "${BLUE}📊 Available Dashboards:${NC}"
    echo "  • Main Dashboard:       http://localhost:3000/dashboard"
    echo "  • User Management:      http://localhost:3000/dashboard/users"
    echo "  • Posts/Projects:       http://localhost:3000/dashboard/posts"
    echo "  • GitHub Integration:   http://localhost:3000/github"
    echo "  • SSO Settings:         http://localhost:3000/sso"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  • View logs:            docker-compose -f docker-compose.local.yml logs -f [service]"
    echo "  • Stop all:             docker-compose -f docker-compose.local.yml down"
    echo "  • Restart service:      docker-compose -f docker-compose.local.yml restart [service]"
    echo "  • Access backend shell: docker-compose -f docker-compose.local.yml exec backend bash"
    echo ""
    echo -e "${YELLOW}⚠️  Development Mode:${NC}"
    echo "  • Authentication bypass is enabled"
    echo "  • All dashboards are accessible without login"
    echo "  • Demo data is pre-populated"
    echo "  • Hot reload is enabled for all services"
    echo ""
    echo -e "${GREEN}✨ Happy Development! ✨${NC}"
    echo ""
}

# Main execution
main() {
    show_banner
    
    log "🚀 Starting OpsSight local deployment with auth bypass..."
    
    # Execute deployment steps
    prepare_environment
    setup_environment
    create_docker_override
    create_auth_bypass
    setup_demo_data
    deploy_services
    initialize_data
    
    # Wait for services to stabilize
    log_info "Waiting for all services to start..."
    sleep 30
    
    # Verify and show info
    verify_deployment
    show_access_info
    
    # Monitor logs
    echo ""
    read -p "Press Enter to view service logs, or Ctrl+C to exit... "
    docker-compose -f docker-compose.local.yml logs -f
}

# Error handling
trap 'log_error "Deployment failed!"; exit 1' ERR

# Run main function
main "$@"