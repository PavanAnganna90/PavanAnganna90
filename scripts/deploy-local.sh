#!/bin/bash

# =============================================================================
# OpsSight Platform - Local Development Deployment Script
# =============================================================================
# Automated setup for complete local development environment with all DevOps tools
# Usage: ./scripts/deploy-local.sh [options]
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.local.yml"
BACKEND_ENV_FILE="backend/.env.local"
FRONTEND_ENV_FILE="frontend/.env.local"

# Default options
SKIP_KUBERNETES=false
SKIP_TERRAFORM=false
VERBOSE=false
FORCE_REBUILD=false
MINIMAL_MODE=false

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${GREEN}==>${NC} $1"
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    # Check available disk space (minimum 10GB)
    available_space=$(df -h . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $available_space -lt 10 ]]; then
        log_warning "Low disk space detected. At least 10GB is recommended."
    fi
    
    # Check available memory (minimum 4GB)
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        available_memory=$(free -g | awk 'NR==2{print $7}')
        if [[ $available_memory -lt 4 ]]; then
            log_warning "Low memory detected. At least 4GB is recommended."
        fi
    fi
    
    log_success "Prerequisites check completed"
}

setup_directories() {
    log_step "Setting up required directories..."
    
    # Create data directories
    mkdir -p "$PROJECT_ROOT"/{data,logs,backups}
    mkdir -p "$PROJECT_ROOT"/data/{postgres,redis,prometheus,grafana,jenkins,nexus,sonarqube,vault,consul,elasticsearch,minio,portainer,pgadmin}
    mkdir -p "$PROJECT_ROOT"/logs/{backend,frontend,nginx}
    mkdir -p "$PROJECT_ROOT"/backups/{database,volumes}
    
    # Create DevOps configuration directories
    mkdir -p "$PROJECT_ROOT"/devops/{jenkins,vault,consul,logstash,terraform}
    mkdir -p "$PROJECT_ROOT"/devops/jenkins/{jobs,plugins,scripts}
    mkdir -p "$PROJECT_ROOT"/devops/vault/config
    mkdir -p "$PROJECT_ROOT"/devops/consul/config
    mkdir -p "$PROJECT_ROOT"/devops/logstash/{config,pipeline}
    mkdir -p "$PROJECT_ROOT"/devops/terraform/{modules,environments}
    
    # Create Kubernetes configuration directory
    mkdir -p "$PROJECT_ROOT"/k8s/{manifests,helm}
    
    # Set permissions
    chmod -R 755 "$PROJECT_ROOT"/data
    chmod -R 755 "$PROJECT_ROOT"/logs
    chmod -R 755 "$PROJECT_ROOT"/devops
    
    log_success "Directories created successfully"
}

setup_kubernetes() {
    if [[ "$SKIP_KUBERNETES" == "true" ]]; then
        log_info "Skipping Kubernetes setup"
        return
    fi
    
    log_step "Setting up local Kubernetes cluster..."
    
    # Check if minikube is available
    if command -v minikube &> /dev/null; then
        log_info "Setting up minikube cluster..."
        
        # Start minikube if not running
        if ! minikube status &> /dev/null; then
            minikube start --driver=docker --memory=4096 --cpus=2
        fi
        
        # Enable required addons
        minikube addons enable dashboard
        minikube addons enable metrics-server
        minikube addons enable ingress
        
        # Get kubeconfig
        mkdir -p ~/.kube
        minikube kubectl -- config view --raw > ~/.kube/config
        
        log_success "Minikube cluster is ready"
        
    elif command -v kind &> /dev/null; then
        log_info "Setting up kind cluster..."
        
        # Create kind cluster if not exists
        if ! kind get clusters | grep -q "opssight-local"; then
            cat > /tmp/kind-config.yaml <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: opssight-local
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 8080
    protocol: TCP
  - containerPort: 443
    hostPort: 8443
    protocol: TCP
EOF
            kind create cluster --config=/tmp/kind-config.yaml
        fi
        
        # Set up kubeconfig
        kind export kubeconfig --name=opssight-local
        
        log_success "Kind cluster is ready"
    else
        log_warning "Neither minikube nor kind found. Installing kubectl only..."
        
        # Install kubectl if not present
        if ! command -v kubectl &> /dev/null; then
            if [[ "$OSTYPE" == "linux-gnu"* ]]; then
                curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                chmod +x kubectl
                sudo mv kubectl /usr/local/bin/
            elif [[ "$OSTYPE" == "darwin"* ]]; then
                curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
                chmod +x kubectl
                sudo mv kubectl /usr/local/bin/
            fi
        fi
        
        log_warning "Local Kubernetes cluster not available. Please install minikube or kind."
    fi
}

setup_terraform() {
    if [[ "$SKIP_TERRAFORM" == "true" ]]; then
        log_info "Skipping Terraform setup"
        return
    fi
    
    log_step "Setting up Terraform configuration..."
    
    # Create basic Terraform configuration
    cat > "$PROJECT_ROOT"/devops/terraform/main.tf <<EOF
terraform {
  required_version = ">= 1.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Example: Manage Docker networks via Terraform
resource "docker_network" "opssight_terraform" {
  name = "opssight-terraform-managed"
  driver = "bridge"
  
  ipam_config {
    subnet = "172.26.0.0/16"
  }
}
EOF

    # Create variables file
    cat > "$PROJECT_ROOT"/devops/terraform/variables.tf <<EOF
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "opssight"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "local"
}

variable "docker_host" {
  description = "Docker host"
  type        = string
  default     = "unix:///var/run/docker.sock"
}
EOF

    # Create outputs file
    cat > "$PROJECT_ROOT"/devops/terraform/outputs.tf <<EOF
output "network_id" {
  description = "ID of the created Docker network"
  value       = docker_network.opssight_terraform.id
}

output "network_name" {
  description = "Name of the created Docker network"
  value       = docker_network.opssight_terraform.name
}
EOF

    # Initialize Terraform
    cd "$PROJECT_ROOT"/devops/terraform
    if command -v terraform &> /dev/null; then
        terraform init
        log_success "Terraform initialized successfully"
    else
        log_warning "Terraform not found. Please install Terraform to use infrastructure as code features."
    fi
    cd "$PROJECT_ROOT"
}

setup_monitoring_configs() {
    log_step "Setting up monitoring configurations..."
    
    # Create Grafana provisioning directories
    mkdir -p "$PROJECT_ROOT"/monitoring/grafana/{provisioning/datasources,provisioning/dashboards,dashboards}
    
    # Create Grafana datasource configuration
    cat > "$PROJECT_ROOT"/monitoring/grafana/provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF

    # Create dashboard provisioning
    cat > "$PROJECT_ROOT"/monitoring/grafana/provisioning/dashboards/dashboard.yml <<EOF
apiVersion: 1
providers:
  - name: 'OpsSight Dashboards'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

    # Create basic dashboard
    cat > "$PROJECT_ROOT"/monitoring/grafana/dashboards/opssight-overview.json <<'EOF'
{
  "dashboard": {
    "title": "OpsSight Platform Overview",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds",
            "legendFormat": "{{ method }} {{ handler }}"
          }
        ]
      }
    ]
  }
}
EOF

    log_success "Monitoring configurations created"
}

setup_jenkins_config() {
    log_step "Setting up Jenkins configuration..."
    
    # Create Jenkins job configuration
    cat > "$PROJECT_ROOT"/devops/jenkins/jobs/opssight-pipeline.xml <<'EOF'
<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>OpsSight Platform CI/CD Pipeline</description>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/your-org/opssight-platform.git'
            }
        }
        
        stage('Test Backend') {
            steps {
                dir('backend') {
                    sh 'python -m pytest tests/ -v'
                }
            }
        }
        
        stage('Test Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm test'
                }
            }
        }
        
        stage('Build') {
            parallel {
                stage('Build Backend') {
                    steps {
                        dir('backend') {
                            sh 'docker build -t opssight-backend:latest .'
                        }
                    }
                }
                stage('Build Frontend') {
                    steps {
                        dir('frontend') {
                            sh 'docker build -t opssight-frontend:latest .'
                        }
                    }
                }
            }
        }
        
        stage('Deploy') {
            steps {
                sh 'docker-compose -f docker-compose.local.yml up -d'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
    }
}
    </script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>
EOF

    log_success "Jenkins configuration created"
}

start_services() {
    log_step "Starting all services..."
    
    cd "$PROJECT_ROOT"
    
    if [[ "$FORCE_REBUILD" == "true" ]]; then
        log_info "Rebuilding images..."
        docker-compose -f "$COMPOSE_FILE" build --no-cache
    fi
    
    if [[ "$MINIMAL_MODE" == "true" ]]; then
        log_info "Starting core services only..."
        docker-compose -f "$COMPOSE_FILE" up -d postgres redis backend frontend prometheus grafana
    else
        log_info "Starting all services..."
        docker-compose -f "$COMPOSE_FILE" up -d
    fi
    
    log_success "Services started successfully"
}

wait_for_services() {
    log_step "Waiting for services to be healthy..."
    
    local services=("postgres" "redis" "backend")
    local max_attempts=30
    local attempt=0
    
    for service in "${services[@]}"; do
        log_info "Waiting for $service to be healthy..."
        
        while [[ $attempt -lt $max_attempts ]]; do
            if docker-compose -f "$COMPOSE_FILE" exec -T "$service" echo "healthy" &> /dev/null; then
                log_success "$service is healthy"
                break
            fi
            
            attempt=$((attempt + 1))
            sleep 2
            
            if [[ $attempt -eq $max_attempts ]]; then
                log_warning "$service did not become healthy within expected time"
            fi
        done
        
        attempt=0
    done
}

setup_initial_data() {
    log_step "Setting up initial data..."
    
    # Wait a bit more for backend to fully start
    sleep 10
    
    # Run database migrations
    if docker-compose -f "$COMPOSE_FILE" exec -T backend python -m alembic upgrade head; then
        log_success "Database migrations completed"
    else
        log_warning "Database migrations failed or already up to date"
    fi
    
    # Create initial admin user (if not exists)
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
from app.core.database import get_db
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy.orm import Session

db = next(get_db())
admin_user = db.query(User).filter(User.email == 'admin@opssight.local').first()

if not admin_user:
    admin_user = User(
        email='admin@opssight.local',
        username='admin',
        full_name='Admin User',
        hashed_password=get_password_hash('admin123'),
        is_active=True,
        is_superuser=True
    )
    db.add(admin_user)
    db.commit()
    print('Admin user created: admin@opssight.local / admin123')
else:
    print('Admin user already exists')
" 2>/dev/null || log_warning "Could not create initial admin user"
}

show_service_urls() {
    log_step "Service URLs:"
    
    echo
    echo "🚀 Core Services:"
    echo "   Frontend:          http://localhost:3000"
    echo "   Backend API:       http://localhost:8000"
    echo "   API Docs:          http://localhost:8000/docs"
    echo
    echo "📊 Monitoring:"
    echo "   Prometheus:        http://localhost:9090"
    echo "   Grafana:           http://localhost:3001 (admin/admin123)"
    echo "   Alertmanager:      http://localhost:9093"
    echo
    echo "🔧 DevOps Tools:"
    echo "   Jenkins:           http://localhost:8081"
    echo "   SonarQube:         http://localhost:9000 (admin/admin)"
    echo "   Nexus:             http://localhost:8082 (admin/admin123)"
    echo "   Vault:             http://localhost:8200 (token: dev-root-token)"
    echo "   Consul:            http://localhost:8500"
    echo
    echo "☸️ Kubernetes:"
    if ! [[ "$SKIP_KUBERNETES" == "true" ]]; then
        echo "   Dashboard:         https://localhost:8443"
    else
        echo "   (Skipped)"
    fi
    echo
    echo "📈 Observability:"
    echo "   Jaeger:            http://localhost:16686"
    echo "   Kibana:            http://localhost:5601"
    echo
    echo "🛠️ Development:"
    echo "   Portainer:         https://localhost:9443"
    echo "   pgAdmin:           http://localhost:8083 (admin@opssight.local/admin123)"
    echo "   Redis Commander:   http://localhost:8084"
    echo "   MailHog:           http://localhost:8025"
    echo "   MinIO Console:     http://localhost:9001 (minioadmin/minioadmin123)"
    echo
}

cleanup_on_exit() {
    log_info "Cleaning up temporary files..."
    rm -f /tmp/kind-config.yaml
}

show_help() {
    cat << EOF
OpsSight Platform - Local Development Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    -f, --force-rebuild     Force rebuild of Docker images
    -m, --minimal           Start only core services (postgres, redis, backend, frontend, monitoring)
    --skip-kubernetes       Skip Kubernetes cluster setup
    --skip-terraform        Skip Terraform configuration
    --clean                 Clean up all containers and volumes before starting

EXAMPLES:
    $0                      # Full deployment with all services
    $0 --minimal            # Minimal deployment with core services only
    $0 --skip-kubernetes    # Skip Kubernetes setup
    $0 --force-rebuild      # Rebuild all images and start
    $0 --clean --minimal    # Clean everything and start minimal setup

SERVICES INCLUDED:
    Core: PostgreSQL, Redis, Backend API, Frontend
    Monitoring: Prometheus, Grafana, Alertmanager
    DevOps: Jenkins, SonarQube, Nexus, Vault, Consul
    Observability: Jaeger, ELK Stack
    Development: Portainer, pgAdmin, Redis Commander, MailHog, MinIO

For more information, see the documentation at docs/local-development.md
EOF
}

# =============================================================================
# Main Script
# =============================================================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                set -x
                shift
                ;;
            -f|--force-rebuild)
                FORCE_REBUILD=true
                shift
                ;;
            -m|--minimal)
                MINIMAL_MODE=true
                shift
                ;;
            --skip-kubernetes)
                SKIP_KUBERNETES=true
                shift
                ;;
            --skip-terraform)
                SKIP_TERRAFORM=true
                shift
                ;;
            --clean)
                log_info "Cleaning up existing containers and volumes..."
                cd "$PROJECT_ROOT"
                docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
                docker system prune -f
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Set trap for cleanup
    trap cleanup_on_exit EXIT
    
    # Main deployment steps
    log_step "Starting OpsSight Platform local deployment..."
    echo
    
    check_prerequisites
    setup_directories
    setup_kubernetes
    setup_terraform
    setup_monitoring_configs
    setup_jenkins_config
    start_services
    wait_for_services
    setup_initial_data
    
    echo
    log_success "🎉 OpsSight Platform local deployment completed successfully!"
    echo
    
    show_service_urls
    
    echo
    echo "💡 Next steps:"
    echo "   1. Visit http://localhost:3000 to access the platform"
    echo "   2. Login with admin@opssight.local / admin123"
    echo "   3. Configure your DevOps integrations"
    echo "   4. Check the monitoring dashboards"
    echo
    echo "📚 Documentation: docs/local-development.md"
    echo "🔧 Troubleshooting: scripts/troubleshoot.sh"
    echo
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi