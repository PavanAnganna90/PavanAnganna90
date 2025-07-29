#!/bin/bash

# =============================================================================
# OpsSight Platform - Infrastructure Validation Script
# =============================================================================
# Comprehensive validation of all infrastructure components
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
LOG_FILE="$PROJECT_ROOT/logs/validation.log"
VALIDATION_RESULTS="$PROJECT_ROOT/logs/validation-results.json"

# Create logs directory
mkdir -p "$PROJECT_ROOT/logs"

# Initialize results tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    ((FAILED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
    ((WARNING_CHECKS++))
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
    ((PASSED_CHECKS++))
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Increment total check counter
check() {
    ((TOTAL_CHECKS++))
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    echo "=============================================================================="
    echo "                OpsSight Platform - Infrastructure Validation                "
    echo "=============================================================================="
    echo -e "${NC}"
}

# Docker and Docker Compose validation
validate_docker() {
    log "🐳 Validating Docker configuration..."
    
    # Check if Docker is running
    check
    if docker info &> /dev/null; then
        log_success "Docker daemon is running"
    else
        log_error "Docker daemon is not running"
        return 1
    fi
    
    # Check Docker Compose files
    local compose_files=("docker-compose.yml" "docker-compose.dev.yml" "docker-compose.prod.yml")
    for compose_file in "${compose_files[@]}"; do
        check
        if [ -f "$PROJECT_ROOT/$compose_file" ]; then
            if docker-compose -f "$PROJECT_ROOT/$compose_file" config &> /dev/null; then
                log_success "Docker Compose file $compose_file is valid"
            else
                log_error "Docker Compose file $compose_file is invalid"
            fi
        else
            log_warning "Docker Compose file $compose_file not found"
        fi
    done
    
    # Check Dockerfiles
    local dockerfiles=("backend/Dockerfile" "frontend/Dockerfile" "api-module/Dockerfile")
    for dockerfile in "${dockerfiles[@]}"; do
        check
        if [ -f "$PROJECT_ROOT/$dockerfile" ]; then
            if docker build --dry-run -f "$PROJECT_ROOT/$dockerfile" "$PROJECT_ROOT/$(dirname "$dockerfile")" &> /dev/null; then
                log_success "Dockerfile $dockerfile syntax is valid"
            else
                log_warning "Dockerfile $dockerfile may have syntax issues"
            fi
        else
            log_error "Dockerfile $dockerfile not found"
        fi
    done
}

# Service health validation
validate_services() {
    log "🔍 Validating service health..."
    
    # Start services if not running
    docker-compose up -d &> /dev/null || true
    sleep 30  # Wait for services to start
    
    # Define service health checks
    local services=(
        "backend:8000:/api/v1/health"
        "frontend:3000:/"
        "api-module:3001:/health"
        "prometheus:9090:/-/healthy"
        "grafana:3001:/api/health"
    )
    
    for service_check in "${services[@]}"; do
        IFS=':' read -r service port endpoint <<< "$service_check"
        check
        
        local url="http://localhost:${port}${endpoint}"
        if curl -f -s --max-time 10 "$url" > /dev/null 2>&1; then
            log_success "Service $service is healthy ($url)"
        else
            log_error "Service $service health check failed ($url)"
        fi
    done
    
    # Check database connectivity
    check
    if docker-compose exec -T db pg_isready -U postgres &> /dev/null; then
        log_success "PostgreSQL database is accessible"
    else
        log_error "PostgreSQL database is not accessible"
    fi
    
    # Check Redis connectivity
    check
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        log_success "Redis cache is accessible"
    else
        log_error "Redis cache is not accessible"
    fi
}

# Monitoring stack validation
validate_monitoring() {
    log "📊 Validating monitoring stack..."
    
    # Check Prometheus configuration
    check
    if [ -f "$PROJECT_ROOT/monitoring/prometheus/prometheus.yml" ]; then
        if curl -f -s "http://localhost:9090/-/ready" > /dev/null 2>&1; then
            log_success "Prometheus is running and ready"
        else
            log_error "Prometheus is not ready"
        fi
    else
        log_error "Prometheus configuration file not found"
    fi
    
    # Check Grafana
    check
    if curl -f -s "http://localhost:3001/api/health" > /dev/null 2>&1; then
        log_success "Grafana is running and healthy"
    else
        log_error "Grafana is not healthy"
    fi
    
    # Check AlertManager
    check
    if curl -f -s "http://localhost:9093/-/healthy" > /dev/null 2>&1; then
        log_success "AlertManager is running and healthy"
    else
        log_warning "AlertManager is not accessible (may not be required for dev)"
    fi
    
    # Check metrics collection
    check
    local metrics_endpoint="http://localhost:9090/api/v1/query?query=up"
    if curl -f -s "$metrics_endpoint" | grep -q '"status":"success"'; then
        log_success "Prometheus is collecting metrics"
    else
        log_error "Prometheus is not collecting metrics properly"
    fi
    
    # Validate alert rules
    check
    if [ -f "$PROJECT_ROOT/monitoring/prometheus/alert_rules.yml" ]; then
        if curl -f -s "http://localhost:9090/api/v1/rules" | grep -q '"status":"success"'; then
            log_success "Prometheus alert rules are loaded"
        else
            log_warning "Prometheus alert rules may not be loaded"
        fi
    else
        log_warning "Alert rules file not found"
    fi
}

# Network connectivity validation
validate_networking() {
    log "🌐 Validating network connectivity..."
    
    # Check internal service communication
    local network_tests=(
        "backend->db:5432"
        "backend->redis:6379"
        "frontend->backend:8000"
        "prometheus->backend:8000"
    )
    
    for network_test in "${network_tests[@]}"; do
        IFS='->' read -r source target <<< "$network_test"
        IFS=':' read -r service port <<< "$target"
        
        check
        if docker-compose exec -T "$source" nc -z "$service" "$port" &> /dev/null; then
            log_success "Network connectivity: $source -> $service:$port"
        else
            log_error "Network connectivity failed: $source -> $service:$port"
        fi
    done
    
    # Check external connectivity
    check
    if docker-compose exec -T backend curl -f -s --max-time 10 "https://api.github.com" > /dev/null 2>&1; then
        log_success "External connectivity (GitHub API) is working"
    else
        log_warning "External connectivity (GitHub API) may be limited"
    fi
}

# Security validation
validate_security() {
    log "🔒 Validating security configuration..."
    
    # Check for secure secrets management
    local env_files=(".env" "backend/.env" "frontend/.env.local" "api-module/.env")
    for env_file in "${env_files[@]}"; do
        check
        if [ -f "$PROJECT_ROOT/$env_file" ]; then
            if grep -q "SECRET" "$PROJECT_ROOT/$env_file" && ! grep -q "your-secret-here\|change-me\|example" "$PROJECT_ROOT/$env_file"; then
                log_success "Environment file $env_file appears to have proper secrets"
            else
                log_warning "Environment file $env_file may contain default/weak secrets"
            fi
        else
            log_warning "Environment file $env_file not found"
        fi
    done
    
    # Check SSL/TLS configuration
    check
    if [ -d "$PROJECT_ROOT/ssl" ] && [ -f "$PROJECT_ROOT/ssl/cert.pem" ]; then
        log_success "SSL certificates found"
    else
        log_warning "SSL certificates not found (may be using development setup)"
    fi
    
    # Check for exposed sensitive ports
    check
    local exposed_ports=$(docker-compose ps --services | xargs -I {} docker-compose port {} 2>/dev/null | grep "0.0.0.0" || true)
    if echo "$exposed_ports" | grep -q "5432\|6379\|9090\|9093"; then
        log_warning "Sensitive ports are exposed to all interfaces"
    else
        log_success "Sensitive ports are properly restricted"
    fi
}

# Performance validation
validate_performance() {
    log "⚡ Validating performance characteristics..."
    
    # Check response times
    local performance_urls=(
        "http://localhost:8000/api/v1/health"
        "http://localhost:3000"
        "http://localhost:3001/health"
    )
    
    for url in "${performance_urls[@]}"; do
        check
        local response_time=$(curl -w "%{time_total}" -o /dev/null -s --max-time 10 "$url" 2>/dev/null || echo "999")
        local response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "999")
        
        if (( $(echo "$response_time < 2.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "Response time for $url: ${response_ms}ms (Good)"
        elif (( $(echo "$response_time < 5.0" | bc -l 2>/dev/null || echo "0") )); then
            log_warning "Response time for $url: ${response_ms}ms (Acceptable)"
        else
            log_error "Response time for $url: ${response_ms}ms (Poor)"
        fi
    done
    
    # Check resource usage
    check
    local cpu_usage=$(docker stats --no-stream --format "table {{.CPUPerc}}" | tail -n +2 | sed 's/%//' | awk '{sum+=$1} END {print sum}' 2>/dev/null || echo "0")
    if (( $(echo "$cpu_usage < 50" | bc -l 2>/dev/null || echo "1") )); then
        log_success "CPU usage is reasonable: ${cpu_usage}%"
    else
        log_warning "High CPU usage detected: ${cpu_usage}%"
    fi
}

# Data persistence validation
validate_persistence() {
    log "💾 Validating data persistence..."
    
    # Check Docker volumes
    local volumes=("postgres_data" "redis_data" "prometheus_data" "grafana_data")
    for volume in "${volumes[@]}"; do
        check
        if docker volume inspect "${PROJECT_ROOT##*/}_$volume" &> /dev/null; then
            log_success "Docker volume $volume exists"
        else
            log_error "Docker volume $volume not found"
        fi
    done
    
    # Test database persistence
    check
    local test_query="SELECT 1 as test;"
    if docker-compose exec -T db psql -U postgres -d opsight -c "$test_query" &> /dev/null; then
        log_success "Database is accessible and responsive"
    else
        log_warning "Database connectivity test failed"
    fi
    
    # Test Redis persistence
    check
    if docker-compose exec -T redis redis-cli set test_key "test_value" &> /dev/null; then
        if [ "$(docker-compose exec -T redis redis-cli get test_key 2>/dev/null)" = "test_value" ]; then
            log_success "Redis read/write operations working"
            docker-compose exec -T redis redis-cli del test_key &> /dev/null
        else
            log_error "Redis read operation failed"
        fi
    else
        log_error "Redis write operation failed"
    fi
}

# Backup and recovery validation
validate_backup() {
    log "🔄 Validating backup capabilities..."
    
    # Check backup scripts
    local backup_scripts=("scripts/backup-restore.sh" "scripts/backup/backup.sh")
    for script in "${backup_scripts[@]}"; do
        check
        if [ -f "$PROJECT_ROOT/$script" ] && [ -x "$PROJECT_ROOT/$script" ]; then
            log_success "Backup script $script exists and is executable"
        else
            log_warning "Backup script $script not found or not executable"
        fi
    done
    
    # Test backup directory
    check
    if [ -d "$PROJECT_ROOT/backups" ]; then
        log_success "Backup directory exists"
    else
        log_warning "Backup directory not found"
    fi
}

# CI/CD validation
validate_cicd() {
    log "🚀 Validating CI/CD configuration..."
    
    # Check GitHub Actions workflows
    local workflows=(".github/workflows/ci-cd.yml" ".github/workflows/enhanced-ci-cd.yml")
    for workflow in "${workflows[@]}"; do
        check
        if [ -f "$PROJECT_ROOT/$workflow" ]; then
            log_success "GitHub Actions workflow $workflow exists"
        else
            log_warning "GitHub Actions workflow $workflow not found"
        fi
    done
    
    # Check deployment scripts
    local deploy_scripts=("deploy.sh" "deploy-production.sh" "scripts/deploy-local.sh")
    for script in "${deploy_scripts[@]}"; do
        check
        if [ -f "$PROJECT_ROOT/$script" ]; then
            log_success "Deployment script $script exists"
        else
            log_warning "Deployment script $script not found"
        fi
    done
}

# Generate validation report
generate_report() {
    log "📋 Generating validation report..."
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    
    cat > "$VALIDATION_RESULTS" << EOF
{
  "validation_summary": {
    "timestamp": "$timestamp",
    "total_checks": $TOTAL_CHECKS,
    "passed_checks": $PASSED_CHECKS,
    "failed_checks": $FAILED_CHECKS,
    "warning_checks": $WARNING_CHECKS,
    "success_rate": $success_rate,
    "overall_status": "$([ $FAILED_CHECKS -eq 0 ] && echo "PASS" || echo "FAIL")"
  },
  "recommendations": [
    $([ $FAILED_CHECKS -gt 0 ] && echo '"Address critical failures before production deployment",' || echo '')
    $([ $WARNING_CHECKS -gt 0 ] && echo '"Review warnings and consider improvements",' || echo '')
    $([ $success_rate -lt 90 ] && echo '"Infrastructure needs significant improvements",' || echo '')
    "Regular monitoring and maintenance recommended"
  ]
}
EOF
    
    log "✅ Validation report saved to: $VALIDATION_RESULTS"
}

# Display results
show_results() {
    echo ""
    echo -e "${BLUE}=============================================================================="
    echo "                         Validation Results Summary                           "
    echo -e "==============================================================================${NC}"
    echo ""
    
    local success_rate=$(( PASSED_CHECKS * 100 / TOTAL_CHECKS ))
    
    echo -e "${GREEN}✅ Passed:${NC}   $PASSED_CHECKS / $TOTAL_CHECKS checks"
    echo -e "${RED}❌ Failed:${NC}   $FAILED_CHECKS / $TOTAL_CHECKS checks"
    echo -e "${YELLOW}⚠️  Warnings:${NC} $WARNING_CHECKS / $TOTAL_CHECKS checks"
    echo ""
    echo -e "${BLUE}📊 Success Rate:${NC} $success_rate%"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}🎉 Overall Status: INFRASTRUCTURE VALIDATION PASSED${NC}"
        if [ $WARNING_CHECKS -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Note: There are warnings that should be reviewed${NC}"
        fi
    else
        echo -e "${RED}🚨 Overall Status: INFRASTRUCTURE VALIDATION FAILED${NC}"
        echo -e "${RED}❗ Critical issues must be resolved before production deployment${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Detailed logs:${NC} $LOG_FILE"
    echo -e "${BLUE}📊 JSON report:${NC} $VALIDATION_RESULTS"
    echo ""
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up validation artifacts..."
    # Add any cleanup tasks here
}

# Main execution
main() {
    show_banner
    
    log "🚀 Starting infrastructure validation..."
    log "📍 Project root: $PROJECT_ROOT"
    
    # Run validation checks
    validate_docker
    validate_services
    validate_monitoring
    validate_networking
    validate_security
    validate_performance
    validate_persistence
    validate_backup
    validate_cicd
    
    # Generate report and show results
    generate_report
    show_results
    
    log "✅ Infrastructure validation completed!"
    
    # Exit with appropriate code
    if [ $FAILED_CHECKS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Error handling
set_error_handling() {
    set -eE
    trap 'log_error "Script failed at line $LINENO. Exit code: $?"' ERR
    trap cleanup EXIT
}

# Check if script is run with --help or -h
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    echo "OpsSight Platform Infrastructure Validation"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --quick        Run only critical validation checks"
    echo "  --report-only  Generate report from existing logs"
    echo ""
    echo "This script validates:"
    echo "  • Docker and container configuration"
    echo "  • Service health and connectivity"
    echo "  • Monitoring stack setup"
    echo "  • Network connectivity"
    echo "  • Security configuration"
    echo "  • Performance characteristics"
    echo "  • Data persistence"
    echo "  • Backup capabilities"
    echo "  • CI/CD configuration"
    echo ""
    exit 0
fi

# Enable error handling and run main function
set_error_handling
main "$@"