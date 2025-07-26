#!/bin/bash

# OpsSight Local Development Deployment
# Runs services directly without Docker

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Check prerequisites
check_prerequisites() {
    log "Checking development prerequisites..."
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed"
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if pip is available
    if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
        error "pip is not installed"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Setup backend environment
setup_backend() {
    log "Setting up backend environment..."
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        log "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    log "Installing backend dependencies..."
    pip install -r requirements.txt 2>/dev/null || {
        # Fallback to basic FastAPI installation
        pip install fastapi uvicorn[standard] sqlalchemy alembic psycopg2-binary redis python-multipart python-jose[cryptography] passlib[bcrypt] aiofiles
    }
    
    cd ..
    success "Backend environment ready"
}

# Setup frontend environment
setup_frontend() {
    log "Setting up frontend environment..."
    
    cd frontend
    
    # Install dependencies
    if [ -f "package-lock.json" ]; then
        log "Installing frontend dependencies with npm..."
        npm install
    elif [ -f "pnpm-lock.yaml" ]; then
        log "Installing frontend dependencies with pnpm..."
        pnpm install
    else
        log "Installing frontend dependencies with npm..."
        npm install
    fi
    
    cd ..
    success "Frontend environment ready"
}

# Create local environment configuration
create_local_env() {
    log "Creating local environment configuration..."
    
    # Backend environment
    cat > backend/.env << EOF
# Local Development Environment
ENVIRONMENT=development
DEBUG=true

# Database - using SQLite for simplicity
DATABASE_URL=sqlite:///./test.db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=opssight_dev
DB_USER=postgres
DB_PASSWORD=password

# Redis - using memory fallback
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=dev-jwt-secret-key
JWT_EXPIRES_IN=24h

# API Configuration
API_V1_STR=/api/v1
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Feature flags
ENABLE_REAL_TIME=true
ENABLE_CACHE_METRICS=true
EOF

    # Frontend environment
    cat > frontend/.env.local << EOF
# Local Development Environment
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=OpsSight DevOps Platform
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_APP_ENV=development

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

# Authentication
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
NEXT_PUBLIC_ENABLE_ADVANCED_MONITORING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Performance Settings
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_CACHE_TTL=300000
NEXT_PUBLIC_RETRY_ATTEMPTS=3

# Development Settings
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_MOCK_DATA=false
EOF
    
    success "Local environment configuration created"
}

# Start backend service
start_backend() {
    log "Starting backend service..."
    
    cd backend
    source venv/bin/activate
    
    # Initialize database if needed
    if [ ! -f "test.db" ]; then
        log "Initializing database..."
        python -c "
from app.db.database import create_tables
import asyncio
asyncio.run(create_tables())
" 2>/dev/null || {
            warning "Database initialization failed, continuing..."
        }
    fi
    
    # Start backend server in background
    log "Starting FastAPI server on port 8000..."
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    
    cd ..
    
    # Wait for backend to start
    log "Waiting for backend to be ready..."
    timeout 60 bash -c 'until curl -f http://localhost:8000/health 2>/dev/null; do sleep 2; done' || {
        error "Backend failed to start"
        return 1
    }
    
    success "Backend service started (PID: $BACKEND_PID)"
}

# Start frontend service
start_frontend() {
    log "Starting frontend service..."
    
    cd frontend
    
    # Start frontend development server in background
    log "Starting Next.js development server on port 3000..."
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    
    cd ..
    
    # Wait for frontend to start
    log "Waiting for frontend to be ready..."
    timeout 60 bash -c 'until curl -f http://localhost:3000 2>/dev/null; do sleep 2; done' || {
        warning "Frontend may take longer to start, continuing..."
    }
    
    success "Frontend service started (PID: $FRONTEND_PID)"
}

# Verify deployment
verify_deployment() {
    log "Verifying local deployment..."
    
    local services=("backend:8000" "frontend:3000")
    local failed=()
    
    for service in "${services[@]}"; do
        local name="${service%:*}"
        local port="${service#*:}"
        
        if curl -f http://localhost:${port} >/dev/null 2>&1 || curl -f http://localhost:${port}/health >/dev/null 2>&1; then
            success "${name} is running on port ${port}"
        else
            failed+=("${name}")
            error "${name} is not responding on port ${port}"
        fi
    done
    
    if [ ${#failed[@]} -eq 0 ]; then
        success "All services are responding"
        return 0
    else
        error "Failed services: ${failed[*]}"
        return 1
    fi
}

# Show deployment info
show_deployment_info() {
    log "OpsSight Local Deployment Ready!"
    echo ""
    echo "=== Service URLs ==="
    echo "🌐 Frontend Dashboard: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📊 API Documentation: http://localhost:8000/docs"
    echo "📊 Health Check: http://localhost:8000/health"
    echo ""
    echo "=== Process Information ==="
    [ -f backend.pid ] && echo "Backend PID: $(cat backend.pid)"
    [ -f frontend.pid ] && echo "Frontend PID: $(cat frontend.pid)"
    echo ""
    echo "=== Log Files ==="
    echo "Backend logs: logs/backend.log"
    echo "Frontend logs: logs/frontend.log"
    echo ""
    echo "=== Management Commands ==="
    echo "• Stop services: $0 stop"
    echo "• View logs: $0 logs [backend|frontend]"
    echo "• Restart: $0 restart"
    echo "• Status: $0 status"
    echo ""
    
    # Run integration test if available
    if [ -f "test-integration.js" ]; then
        log "Running integration tests..."
        if node test-integration.js; then
            success "Integration tests passed!"
        else
            warning "Some integration tests failed, but services are running"
        fi
    fi
    
    success "OpsSight is ready for development!"
}

# Stop services
stop_services() {
    log "Stopping OpsSight services..."
    
    if [ -f backend.pid ]; then
        local backend_pid=$(cat backend.pid)
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid
            success "Backend stopped (PID: $backend_pid)"
        fi
        rm backend.pid
    fi
    
    if [ -f frontend.pid ]; then
        local frontend_pid=$(cat frontend.pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid
            success "Frontend stopped (PID: $frontend_pid)"
        fi
        rm frontend.pid
    fi
    
    # Kill any remaining processes
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    success "All services stopped"
}

# Show status
show_status() {
    log "Service Status:"
    
    if [ -f backend.pid ] && kill -0 $(cat backend.pid) 2>/dev/null; then
        success "Backend is running (PID: $(cat backend.pid))"
    else
        warning "Backend is not running"
    fi
    
    if [ -f frontend.pid ] && kill -0 $(cat frontend.pid) 2>/dev/null; then
        success "Frontend is running (PID: $(cat frontend.pid))"
    else
        warning "Frontend is not running"
    fi
}

# Show logs
show_logs() {
    local service=$1
    case $service in
        "backend")
            [ -f logs/backend.log ] && tail -f logs/backend.log || echo "Backend log not found"
            ;;
        "frontend")
            [ -f logs/frontend.log ] && tail -f logs/frontend.log || echo "Frontend log not found"
            ;;
        *)
            echo "Available logs: backend, frontend"
            ;;
    esac
}

# Main deployment
main() {
    log "Starting OpsSight Local Development Deployment..."
    
    # Create logs directory
    mkdir -p logs
    
    check_prerequisites
    setup_backend
    setup_frontend
    create_local_env
    start_backend
    start_frontend
    
    if verify_deployment; then
        show_deployment_info
    else
        error "Deployment verification failed"
        stop_services
        exit 1
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "start")
        main
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 2
        main
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "verify")
        verify_deployment
        ;;
    "clean")
        stop_services
        rm -f backend/.env frontend/.env.local
        rm -rf backend/venv
        success "Cleanup completed"
        ;;
    *)
        echo "Usage: $0 {deploy|start|stop|restart|status|logs|verify|clean}"
        echo ""
        echo "Commands:"
        echo "  deploy/start - Start all services"
        echo "  stop         - Stop all services"
        echo "  restart      - Restart all services"
        echo "  status       - Show service status"
        echo "  logs         - Show logs (backend|frontend)"
        echo "  verify       - Verify deployment"
        echo "  clean        - Clean up all files"
        exit 1
        ;;
esac