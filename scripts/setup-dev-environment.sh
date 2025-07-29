#!/bin/bash

# =============================================================================
# OpsSight Platform - Development Environment Setup Script
# =============================================================================
# This script sets up a complete local development environment for OpsSight
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
LOG_FILE="$PROJECT_ROOT/logs/setup-dev.log"
REQUIRED_TOOLS=("docker" "docker-compose" "node" "npm" "python3" "pip3" "git")

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Logging function
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
    echo "              OpsSight Platform - Development Environment Setup              "
    echo "=============================================================================="
    echo -e "${NC}"
}

# Check system requirements
check_requirements() {
    log "🔍 Checking system requirements..."
    
    local missing_tools=()
    
    for tool in "${REQUIRED_TOOLS[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Please install the missing tools and run this script again."
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    local required_node_version="18.0.0"
    
    if ! npx semver "$node_version" -r ">=$required_node_version" &> /dev/null; then
        log_warning "Node.js version $node_version is less than recommended $required_node_version"
    fi
    
    # Check Python version
    local python_version
    python_version=$(python3 --version | awk '{print $2}')
    local required_python_version="3.9.0"
    
    if ! python3 -c "import sys; exit(0 if sys.version_info >= tuple(map(int, '$required_python_version'.split('.'))) else 1)" &> /dev/null; then
        log_warning "Python version $python_version is less than recommended $required_python_version"
    fi
    
    log "✅ All requirements satisfied!"
}

# Setup environment files
setup_environment_files() {
    log "🔧 Setting up environment files..."
    
    # Backend environment
    if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
        cat > "$PROJECT_ROOT/backend/.env" << 'EOF'
# OpsSight Backend Development Environment
DEBUG=True
APP_NAME=OpsSight Development
APP_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:8000/auth/callback
JWT_SECRET_KEY=dev-jwt-secret-key-that-is-at-least-32-characters-long
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CSRF_SECRET=dev-csrf-secret
ENVIRONMENT=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsight_dev
REDIS_URL=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
PROMETHEUS_MULTIPROC_DIR=/tmp/metrics
PROMETHEUS_METRICS_PORT=8001
WORKERS=1
EOF
        log "✅ Created backend/.env"
    else
        log_info "backend/.env already exists, skipping..."
    fi
    
    # Frontend environment
    if [ ! -f "$PROJECT_ROOT/frontend/.env.local" ]; then
        cat > "$PROJECT_ROOT/frontend/.env.local" << 'EOF'
# OpsSight Frontend Development Environment
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000
NEXT_PUBLIC_APP_VERSION=2.0.0-dev
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHE_METRICS=true
NEXT_PUBLIC_ENVIRONMENT=development
EOF
        log "✅ Created frontend/.env.local"
    else
        log_info "frontend/.env.local already exists, skipping..."
    fi
    
    # API Module environment
    if [ ! -f "$PROJECT_ROOT/api-module/.env" ]; then
        cat > "$PROJECT_ROOT/api-module/.env" << 'EOF'
# OpsSight API Module Development Environment
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opsight_dev
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-jwt-secret-key-that-is-at-least-32-characters-long
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
EOF
        log "✅ Created api-module/.env"
    else
        log_info "api-module/.env already exists, skipping..."
    fi
    
    # Docker Compose override for development
    if [ ! -f "$PROJECT_ROOT/docker-compose.override.yml" ]; then
        cat > "$PROJECT_ROOT/docker-compose.override.yml" << 'EOF'
version: '3.8'

# Development overrides for docker-compose.yml
services:
  backend:
    volumes:
      - ./backend:/app
      - backend_cache:/app/__pycache__
    environment:
      - DEBUG=True
      - APP_ENV=development
    ports:
      - "8000:8000"
      - "8001:8001"  # Metrics port
    command: ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
  
  frontend:
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
    command: ["npm", "run", "dev"]
  
  api-module:
    build:
      context: ./api-module
      dockerfile: Dockerfile.dev
    volumes:
      - ./api-module:/app
      - api_node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
    ports:
      - "3001:3001"
    command: ["npm", "run", "dev"]

volumes:
  backend_cache:
  frontend_node_modules:
  api_node_modules:
EOF
        log "✅ Created docker-compose.override.yml"
    else
        log_info "docker-compose.override.yml already exists, skipping..."
    fi
}

# Install dependencies
install_dependencies() {
    log "📦 Installing dependencies..."
    
    # Backend dependencies
    if [ -f "$PROJECT_ROOT/backend/requirements-dev.txt" ]; then
        log_info "Installing Python dependencies..."
        cd "$PROJECT_ROOT/backend"
        pip3 install -r requirements-dev.txt || pip3 install -r requirements-minimal.txt
        log "✅ Python dependencies installed"
    fi
    
    # Frontend dependencies
    if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
        log_info "Installing frontend dependencies..."
        cd "$PROJECT_ROOT/frontend"
        npm install
        log "✅ Frontend dependencies installed"
    fi
    
    # API Module dependencies
    if [ -f "$PROJECT_ROOT/api-module/package.json" ]; then
        log_info "Installing API module dependencies..."
        cd "$PROJECT_ROOT/api-module"
        npm install
        log "✅ API module dependencies installed"
    fi
    
    cd "$PROJECT_ROOT"
}

# Setup database
setup_database() {
    log "🗄️ Setting up development database..."
    
    # Start database services
    docker-compose up -d db redis
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    timeout 60 bash -c 'until docker-compose exec -T db pg_isready -U postgres; do sleep 2; done' || {
        log_error "Database failed to start within 60 seconds"
        return 1
    }
    
    # Create database if it doesn't exist
    docker-compose exec -T db psql -U postgres -c "CREATE DATABASE opsight_dev;" 2>/dev/null || true
    docker-compose exec -T db psql -U postgres -c "CREATE DATABASE opsight_test;" 2>/dev/null || true
    
    log "✅ Database setup completed"
}

# Setup monitoring stack
setup_monitoring() {
    log "📊 Setting up monitoring stack..."
    
    # Start monitoring services
    docker-compose up -d prometheus grafana alertmanager node-exporter
    
    # Wait for services to be ready
    log_info "Waiting for monitoring services..."
    sleep 10
    
    # Check if services are running
    if curl -f http://localhost:9090 &> /dev/null; then
        log "✅ Prometheus is running at http://localhost:9090"
    else
        log_warning "Prometheus may not be ready yet"
    fi
    
    if curl -f http://localhost:3001 &> /dev/null; then
        log "✅ Grafana is running at http://localhost:3001 (admin/admin)"
    else
        log_warning "Grafana may not be ready yet"
    fi
}

# Setup development tools
setup_dev_tools() {
    log "🛠️ Setting up development tools..."
    
    # Pre-commit hooks
    if command -v pre-commit &> /dev/null; then
        cd "$PROJECT_ROOT"
        if [ -f ".pre-commit-config.yaml" ]; then
            pre-commit install
            log "✅ Pre-commit hooks installed"
        fi
    else
        log_info "Pre-commit not found, skipping hook installation"
    fi
    
    # Git hooks
    if [ -d ".git" ]; then
        # Create a simple commit-msg hook
        cat > .git/hooks/commit-msg << 'EOF'
#!/bin/bash
# Simple commit message validation
commit_regex='^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+'
if ! grep -qE "$commit_regex" "$1"; then
    echo "Invalid commit message format!"
    echo "Format: type(scope): description"
    echo "Types: feat, fix, docs, style, refactor, test, chore"
    exit 1
fi
EOF
        chmod +x .git/hooks/commit-msg
        log "✅ Git commit message hook installed"
    fi
}

# Run tests
run_tests() {
    log "🧪 Running tests to verify setup..."
    
    # Wait for all services to be ready
    log_info "Waiting for all services to start..."
    sleep 30
    
    # Test backend
    if curl -f http://localhost:8000/api/v1/health &> /dev/null; then
        log "✅ Backend health check passed"
    else
        log_warning "Backend health check failed - service may not be ready yet"
    fi
    
    # Test frontend
    if curl -f http://localhost:3000 &> /dev/null; then
        log "✅ Frontend accessibility check passed"
    else
        log_warning "Frontend accessibility check failed - service may not be ready yet"
    fi
    
    # Test API module
    if curl -f http://localhost:3001/health &> /dev/null; then
        log "✅ API module health check passed"
    else
        log_warning "API module health check failed - service may not be ready yet"
    fi
    
    # Run unit tests if possible
    if [ -f "$PROJECT_ROOT/api-module/package.json" ]; then
        cd "$PROJECT_ROOT/api-module"
        if npm run test:ci &> /dev/null; then
            log "✅ API module tests passed"
        else
            log_info "API module tests skipped or failed"
        fi
    fi
}

# Display helpful information
show_info() {
    echo -e "${GREEN}"
    echo "=============================================================================="
    echo "                         🎉 Setup Complete! 🎉                              "
    echo "=============================================================================="
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}🌐 Service URLs:${NC}"
    echo "  • Frontend:     http://localhost:3000"
    echo "  • Backend API:  http://localhost:8000"
    echo "  • API Module:   http://localhost:3001"
    echo "  • Prometheus:   http://localhost:9090"
    echo "  • Grafana:      http://localhost:3001 (admin/admin)"
    echo "  • Redis:        localhost:6379"
    echo "  • PostgreSQL:   localhost:5432 (postgres/postgres)"
    echo ""
    echo -e "${BLUE}📚 Useful Commands:${NC}"
    echo "  • Start all services:    docker-compose up -d"
    echo "  • Stop all services:     docker-compose down"
    echo "  • View logs:             docker-compose logs -f [service]"
    echo "  • Run backend tests:     cd backend && python -m pytest"
    echo "  • Run frontend tests:    cd frontend && npm test"
    echo "  • Run API tests:         cd api-module && npm test"
    echo ""
    echo -e "${BLUE}🔧 Development:${NC}"
    echo "  • Backend hot reload:    Enabled (modify files in backend/)"
    echo "  • Frontend hot reload:   Enabled (modify files in frontend/)"
    echo "  • API hot reload:        Enabled (modify files in api-module/)"
    echo ""
    echo -e "${BLUE}📖 Documentation:${NC}"
    echo "  • API Docs:              http://localhost:8000/docs"
    echo "  • API Redoc:             http://localhost:8000/redoc"
    echo "  • Project README:        ./README.md"
    echo ""
    echo -e "${YELLOW}⚠️  Important Notes:${NC}"
    echo "  • First startup may take several minutes"
    echo "  • Check logs if services don't respond immediately"
    echo "  • Update .env files with your actual API keys"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    show_banner
    
    log "🚀 Starting OpsSight development environment setup..."
    
    check_requirements
    setup_environment_files
    install_dependencies
    setup_database
    setup_monitoring
    setup_dev_tools
    
    # Start all services
    log "🔄 Starting all services..."
    docker-compose up -d
    
    run_tests
    show_info
    
    log "✅ Development environment setup completed successfully!"
    log "📝 Setup log saved to: $LOG_FILE"
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    # Add any cleanup tasks here
}

# Trap cleanup function on script exit
trap cleanup EXIT

# Error handling
set_error_handling() {
    set -eE
    trap 'log_error "Script failed at line $LINENO. Exit code: $?"' ERR
}

# Check if script is run with --help or -h
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "OpsSight Platform Development Environment Setup"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --no-tests     Skip running tests after setup"
    echo "  --minimal      Minimal setup (no monitoring stack)"
    echo ""
    echo "This script will:"
    echo "  1. Check system requirements"
    echo "  2. Setup environment files"
    echo "  3. Install dependencies"
    echo "  4. Setup database and Redis"
    echo "  5. Setup monitoring stack"
    echo "  6. Start all services"
    echo "  7. Run verification tests"
    echo ""
    exit 0
fi

# Parse command line arguments
SKIP_TESTS=false
MINIMAL_SETUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-tests)
            SKIP_TESTS=true
            shift
            ;;
        --minimal)
            MINIMAL_SETUP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Enable error handling and run main function
set_error_handling
main