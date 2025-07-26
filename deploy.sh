#!/bin/bash

# OpsSight DevOps Platform - Production Deployment Script
# This script deploys the integrated frontend-backend system

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${DEPLOYMENT_ENV:-production}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-""}
PROJECT_NAME="opssight"
VERSION=${VERSION:-"2.0.0"}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if Node.js is installed (for build process)
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+ for the build process."
        exit 1
    fi
    
    # Check if Python is installed (for backend)
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Please install Python 3.9+."
        exit 1
    fi
    
    success "All prerequisites are met"
}

# Create production environment file
create_production_env() {
    log "Creating production environment configuration..."
    
    cat > .env.production << EOF
# OpsSight Production Configuration
NODE_ENV=production
DEPLOYMENT_ENV=production

# Application Settings
NEXT_PUBLIC_APP_NAME=OpsSight DevOps Platform
NEXT_PUBLIC_APP_VERSION=${VERSION}
NEXT_PUBLIC_APP_ENV=production

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=opssight_prod
DB_USER=opssight
DB_PASSWORD=\${DB_PASSWORD:-secure_prod_password}
DB_SSL=false
DB_MAX_CONNECTIONS=50

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=\${REDIS_PASSWORD:-}
REDIS_DB=0

# Authentication
JWT_SECRET=\${JWT_SECRET:-your-production-jwt-secret}
JWT_EXPIRES_IN=24h
SESSION_SECRET=\${SESSION_SECRET:-your-production-session-secret}

# OAuth Configuration
NEXT_PUBLIC_GITHUB_CLIENT_ID=\${GITHUB_CLIENT_ID:-}
GITHUB_CLIENT_SECRET=\${GITHUB_CLIENT_SECRET:-}
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
NEXT_PUBLIC_ENABLE_ADVANCED_MONITORING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Performance Settings
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_CACHE_TTL=300000
NEXT_PUBLIC_RETRY_ATTEMPTS=3

# Security
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_MOCK_DATA=false

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=\${SENTRY_DSN:-}
EOF
    
    success "Production environment file created"
}

# Build Docker images
build_images() {
    log "Building production Docker images..."
    
    # Build backend image
    log "Building backend image..."
    docker build -t ${PROJECT_NAME}-backend:${VERSION} \
        -t ${PROJECT_NAME}-backend:latest \
        -f backend/Dockerfile \
        ./backend
    
    # Build frontend image
    log "Building frontend image..."
    docker build -t ${PROJECT_NAME}-frontend:${VERSION} \
        -t ${PROJECT_NAME}-frontend:latest \
        -f frontend/Dockerfile \
        ./frontend
    
    success "Docker images built successfully"
}

# Create production docker-compose file
create_production_compose() {
    log "Creating production docker-compose configuration..."
    
    cat > docker-compose.production.yml << EOF
version: '3.8'

networks:
  opssight-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

services:
  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: opssight_prod
      POSTGRES_USER: opssight
      POSTGRES_PASSWORD: \${DB_PASSWORD:-secure_prod_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - opssight-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opssight -d opssight_prod"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - opssight-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped

  # Backend API
  backend:
    image: ${PROJECT_NAME}-backend:${VERSION}
    environment:
      - ENVIRONMENT=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=opssight_prod
      - DB_USER=opssight
      - DB_PASSWORD=\${DB_PASSWORD:-secure_prod_password}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=\${JWT_SECRET:-your-production-jwt-secret}
      - DEBUG=false
    ports:
      - "8000:8000"
    networks:
      - opssight-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  # Frontend
  frontend:
    image: ${PROJECT_NAME}-frontend:${VERSION}
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
      - NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
      - NEXT_PUBLIC_APP_VERSION=${VERSION}
      - NEXT_PUBLIC_ENABLE_REAL_TIME=true
      - NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
    ports:
      - "3000:3000"
    networks:
      - opssight-network
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M

  # Monitoring - Prometheus
  prometheus:
    image: prom/prometheus:latest
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - opssight-network
    restart: unless-stopped

  # Monitoring - Grafana
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - opssight-network
    restart: unless-stopped
EOF
    
    success "Production docker-compose file created"
}

# Deploy infrastructure services
deploy_infrastructure() {
    log "Deploying infrastructure services (Database, Redis, Monitoring)..."
    
    # Start infrastructure services first
    docker-compose -f docker-compose.production.yml up -d postgres redis prometheus grafana
    
    # Wait for services to be healthy
    log "Waiting for infrastructure services to be ready..."
    timeout 300 bash -c 'until docker-compose -f docker-compose.production.yml exec postgres pg_isready -U opssight -d opssight_prod; do sleep 5; done'
    timeout 120 bash -c 'until docker-compose -f docker-compose.production.yml exec redis redis-cli ping; do sleep 5; done'
    
    success "Infrastructure services deployed successfully"
}

# Deploy application services
deploy_application() {
    log "Deploying application services (Backend, Frontend)..."
    
    # Start application services
    docker-compose -f docker-compose.production.yml up -d backend frontend
    
    # Wait for services to be healthy
    log "Waiting for application services to be ready..."
    timeout 300 bash -c 'until curl -f http://localhost:8000/health; do sleep 10; done'
    timeout 300 bash -c 'until curl -f http://localhost:3000/api/health; do sleep 10; done'
    
    success "Application services deployed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run backend migrations
    docker-compose -f docker-compose.production.yml exec backend python -m alembic upgrade head
    
    success "Database migrations completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check all services are running
    local failed_services=()
    
    # Test backend health
    if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
        failed_services+=("backend")
    fi
    
    # Test frontend health
    if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        failed_services+=("frontend")
    fi
    
    # Test database connection
    if ! docker-compose -f docker-compose.production.yml exec postgres pg_isready -U opssight -d opssight_prod > /dev/null 2>&1; then
        failed_services+=("database")
    fi
    
    # Test Redis connection
    if ! docker-compose -f docker-compose.production.yml exec redis redis-cli ping > /dev/null 2>&1; then
        failed_services+=("redis")
    fi
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        success "All services are running correctly"
        
        # Run integration tests
        log "Running integration tests..."
        if node test-integration.js; then
            success "Integration tests passed"
        else
            warning "Some integration tests failed, but services are running"
        fi
        
        return 0
    else
        error "The following services failed health checks: ${failed_services[*]}"
        return 1
    fi
}

# Display deployment information
show_deployment_info() {
    log "Deployment completed successfully!"
    echo ""
    echo "=== OpsSight DevOps Platform - Deployment Information ==="
    echo ""
    echo "🌐 Frontend Dashboard: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📊 API Documentation: http://localhost:8000/docs"
    echo "📈 Prometheus Metrics: http://localhost:9090"
    echo "📊 Grafana Dashboard: http://localhost:3001 (admin/admin)"
    echo ""
    echo "=== Service Status ==="
    docker-compose -f docker-compose.production.yml ps
    echo ""
    echo "=== Next Steps ==="
    echo "1. Configure OAuth providers in the backend"
    echo "2. Set up monitoring alerts in Grafana"
    echo "3. Configure SSL/TLS certificates for production"
    echo "4. Set up backup procedures for PostgreSQL"
    echo ""
    echo "=== Management Commands ==="
    echo "• View logs: docker-compose -f docker-compose.production.yml logs -f [service]"
    echo "• Restart service: docker-compose -f docker-compose.production.yml restart [service]"
    echo "• Stop deployment: docker-compose -f docker-compose.production.yml down"
    echo "• Full cleanup: docker-compose -f docker-compose.production.yml down -v"
    echo ""
    success "OpsSight DevOps Platform is ready for use!"
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        error "Deployment failed. Cleaning up..."
        docker-compose -f docker-compose.production.yml down
    fi
}

# Main deployment function
main() {
    log "Starting OpsSight DevOps Platform deployment..."
    
    # Set up cleanup on exit
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    create_production_env
    build_images
    create_production_compose
    deploy_infrastructure
    sleep 30  # Give infrastructure time to fully initialize
    deploy_application
    sleep 30  # Give application time to fully initialize
    run_migrations
    
    if verify_deployment; then
        show_deployment_info
    else
        error "Deployment verification failed"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        build_images
        ;;
    "verify")
        verify_deployment
        ;;
    "cleanup")
        log "Cleaning up deployment..."
        docker-compose -f docker-compose.production.yml down -v
        success "Cleanup completed"
        ;;
    "logs")
        docker-compose -f docker-compose.production.yml logs -f "${2:-}"
        ;;
    "status")
        docker-compose -f docker-compose.production.yml ps
        ;;
    *)
        echo "Usage: $0 {deploy|build|verify|cleanup|logs|status}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  build    - Build Docker images only"
        echo "  verify   - Verify deployment health"
        echo "  cleanup  - Stop and remove all services"
        echo "  logs     - Show service logs"
        echo "  status   - Show service status"
        exit 1
        ;;
esac