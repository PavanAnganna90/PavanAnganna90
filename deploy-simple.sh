#!/bin/bash

# OpsSight Simple Deployment Script
# Simplified approach that works around Docker credential issues

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

# Create simplified environment file
create_env() {
    log "Creating deployment environment..."
    
    cat > .env << EOF
# Production Environment
NODE_ENV=production
DEPLOYMENT_ENV=production

# Database
DB_PASSWORD=secure_prod_password
POSTGRES_DB=opssight_prod
POSTGRES_USER=opssight
POSTGRES_PASSWORD=secure_prod_password

# Backend
JWT_SECRET=your-production-jwt-secret-change-in-production
API_V1_STR=/api/v1
DEBUG=false

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NEXT_PUBLIC_APP_VERSION=2.0.0
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
NEXT_PUBLIC_ENABLE_ADVANCED_MONITORING=true

# Monitoring
GRAFANA_PASSWORD=admin
EOF
    
    success "Environment file created"
}

# Start services using existing docker-compose
deploy_services() {
    log "Starting OpsSight services..."
    
    # Stop any existing services
    log "Stopping existing services..."
    docker-compose down 2>/dev/null || true
    
    # Start infrastructure services first
    log "Starting database and cache services..."
    docker-compose up -d db redis
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    timeout 120 bash -c 'until docker-compose exec db pg_isready -U postgres 2>/dev/null; do sleep 5; done' || {
        error "Database failed to start"
        return 1
    }
    
    # Wait for Redis to be ready
    log "Waiting for Redis to be ready..."
    timeout 60 bash -c 'until docker-compose exec redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 3; done' || {
        error "Redis failed to start"
        return 1
    }
    
    # Start application services
    log "Starting backend service..."
    docker-compose up -d backend
    
    # Wait for backend to be healthy
    log "Waiting for backend to be ready..."
    timeout 180 bash -c 'until curl -f http://localhost:8000/health 2>/dev/null; do sleep 10; done' || {
        error "Backend failed to start"
        docker-compose logs backend
        return 1
    }
    
    # Start frontend service
    log "Starting frontend service..."
    docker-compose up -d frontend
    
    # Wait for frontend to be ready
    log "Waiting for frontend to be ready..."
    timeout 180 bash -c 'until curl -f http://localhost:3000/api/health 2>/dev/null; do sleep 10; done' || {
        warning "Frontend may not be fully ready, continuing..."
    }
    
    # Start monitoring services
    log "Starting monitoring services..."
    docker-compose up -d prometheus grafana
    
    success "All services started"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    local services=("backend:8000" "frontend:3000" "prometheus:9090" "grafana:3001")
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

# Show status
show_status() {
    log "OpsSight Deployment Status"
    echo ""
    echo "=== Service URLs ==="
    echo "🌐 Frontend Dashboard: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📊 API Documentation: http://localhost:8000/docs"
    echo "📈 Prometheus: http://localhost:9090"
    echo "📊 Grafana: http://localhost:3001 (admin/admin)"
    echo ""
    echo "=== Service Status ==="
    docker-compose ps
    echo ""
    
    # Run integration test if available
    if [ -f "test-integration.js" ]; then
        log "Running integration tests..."
        if node test-integration.js; then
            success "Integration tests passed!"
        else
            warning "Some integration tests failed"
        fi
    fi
    
    echo ""
    echo "=== Quick Commands ==="
    echo "• View logs: docker-compose logs -f [service]"
    echo "• Restart: docker-compose restart [service]"
    echo "• Stop all: docker-compose down"
    echo "• Clean up: docker-compose down -v"
    echo ""
    success "OpsSight DevOps Platform is ready!"
}

# Main deployment
main() {
    log "Starting OpsSight Simple Deployment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    create_env
    deploy_services
    
    if verify_deployment; then
        show_status
    else
        error "Deployment verification failed"
        echo ""
        echo "Troubleshooting:"
        echo "1. Check service logs: docker-compose logs [service]"
        echo "2. Check service status: docker-compose ps"
        echo "3. Restart services: docker-compose restart"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "status")
        docker-compose ps
        ;;
    "logs")
        docker-compose logs -f "${2:-}"
        ;;
    "restart")
        docker-compose restart "${2:-}"
        ;;
    "stop")
        log "Stopping all services..."
        docker-compose down
        success "All services stopped"
        ;;
    "clean")
        log "Cleaning up deployment..."
        docker-compose down -v
        rm -f .env 2>/dev/null || true
        success "Cleanup completed"
        ;;
    "verify")
        verify_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|status|logs|restart|stop|clean|verify}"
        exit 1
        ;;
esac