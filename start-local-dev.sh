#!/bin/bash

# =============================================================================
# OpsSight Platform - Local Development Launcher
# =============================================================================
# Run frontend and backend locally with Docker infrastructure
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info "🚀 Starting OpsSight Platform in Local Development Mode"
echo

# Check if required infrastructure services are running
log_info "Checking infrastructure services..."

if ! docker ps | grep -q "opssight-postgres-local"; then
    log_warning "PostgreSQL not running. Starting infrastructure..."
    docker-compose -f docker-compose.local.yml up -d postgres redis prometheus grafana
    sleep 10
fi

log_success "Infrastructure services are running"

# Function to kill background processes on exit
cleanup() {
    log_info "Shutting down services..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend (FastAPI)
log_info "Starting Backend API server..."
cd "$SCRIPT_DIR/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    log_info "Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
fi

# Set environment variables for local development
export DATABASE_URL="postgresql://opssight:opssight123@localhost:5432/opssight_dev"
export REDIS_URL="redis://localhost:6379/0"
export ENVIRONMENT="local"
export DEBUG="true"

# Start backend in background
log_info "🔥 Backend starting at http://localhost:8000"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > logs/backend.log 2>&1 &
BACKEND_PID=$!

cd "$SCRIPT_DIR"

# Start Frontend (Next.js)
log_info "Starting Frontend application..."
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    log_info "Installing Node.js dependencies..."
    npm install > /dev/null 2>&1
fi

# Start frontend in background
log_info "🎨 Frontend starting at http://localhost:3000"
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"

# Wait for services to start
log_info "Waiting for services to start..."
sleep 5

# Show status
echo
log_success "🎉 OpsSight Platform is starting up!"
echo
echo "📊 Service URLs:"
echo "   🎨 Frontend:        http://localhost:3000"
echo "   🔧 Backend API:     http://localhost:8000"
echo "   📚 API Docs:        http://localhost:8000/docs"
echo "   📈 Grafana:         http://localhost:3001 (admin/admin123)"
echo "   📊 Prometheus:      http://localhost:9090"
echo
echo "📋 Database:"
echo "   🐘 PostgreSQL:      localhost:5432 (opssight/opssight123)"
echo "   🔴 Redis:           localhost:6379"
echo
echo "📝 Logs:"
echo "   📄 Backend:         tail -f logs/backend.log"
echo "   📄 Frontend:        tail -f logs/frontend.log"
echo
log_info "Press Ctrl+C to stop all services"

# Wait for user to stop services
wait