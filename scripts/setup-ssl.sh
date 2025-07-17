#!/bin/bash
# =============================================================================
# SSL/TLS Certificate Setup Script for OpsSight Platform
# =============================================================================
# Sets up SSL certificates using Let's Encrypt (Certbot)
# Supports both staging and production certificates
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NGINX_DIR="$PROJECT_ROOT/nginx"
SSL_DIR="$NGINX_DIR/ssl"

# Default values
DOMAIN=""
EMAIL=""
STAGING=false
FORCE_RENEWAL=false
WEBROOT_PATH="/var/www/certbot"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Help function
show_help() {
    cat << EOF
SSL/TLS Certificate Setup Script for OpsSight Platform

Usage: $0 [OPTIONS]

OPTIONS:
    -d, --domain DOMAIN         Domain name for SSL certificate (required)
    -e, --email EMAIL          Email address for Let's Encrypt (required)
    -s, --staging              Use Let's Encrypt staging environment
    -f, --force                Force certificate renewal
    -w, --webroot PATH         Webroot path for ACME challenge (default: $WEBROOT_PATH)
    -h, --help                 Show this help message

EXAMPLES:
    $0 --domain example.com --email admin@example.com
    $0 --domain example.com --email admin@example.com --staging
    $0 --domain example.com --email admin@example.com --force

NOTES:
    - Requires Docker and Docker Compose to be installed
    - Uses Certbot in Docker container for certificate generation
    - Automatically configures Nginx with generated certificates
    - Supports automatic renewal via cron job

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -d|--domain)
                DOMAIN="$2"
                shift 2
                ;;
            -e|--email)
                EMAIL="$2"
                shift 2
                ;;
            -s|--staging)
                STAGING=true
                shift
                ;;
            -f|--force)
                FORCE_RENEWAL=true
                shift
                ;;
            -w|--webroot)
                WEBROOT_PATH="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate requirements
validate_requirements() {
    log_info "Validating requirements..."
    
    # Check required parameters
    if [[ -z "$DOMAIN" ]]; then
        log_error "Domain name is required. Use --domain option."
        exit 1
    fi
    
    if [[ -z "$EMAIL" ]]; then
        log_error "Email address is required. Use --email option."
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "Requirements validated"
}

# Create necessary directories
setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$SSL_DIR"
    mkdir -p "$WEBROOT_PATH"
    mkdir -p "$NGINX_DIR/logs"
    
    # Set proper permissions
    chmod 755 "$SSL_DIR"
    chmod 755 "$WEBROOT_PATH"
    
    log_success "Directories created"
}

# Generate Diffie-Hellman parameters
generate_dhparam() {
    local dhparam_file="$SSL_DIR/dhparam.pem"
    
    if [[ ! -f "$dhparam_file" ]]; then
        log_info "Generating Diffie-Hellman parameters (this may take a few minutes)..."
        openssl dhparam -out "$dhparam_file" 2048
        log_success "Diffie-Hellman parameters generated"
    else
        log_info "Diffie-Hellman parameters already exist"
    fi
}

# Create dummy certificates for initial Nginx startup
create_dummy_certificates() {
    log_info "Creating dummy SSL certificates for initial setup..."
    
    local cert_file="$SSL_DIR/fullchain.pem"
    local key_file="$SSL_DIR/privkey.pem"
    local chain_file="$SSL_DIR/chain.pem"
    
    # Only create dummy certs if real ones don't exist
    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
            -keyout "$key_file" \
            -out "$cert_file" \
            -subj "/CN=$DOMAIN"
        
        # Create dummy chain file
        cp "$cert_file" "$chain_file"
        
        log_success "Dummy certificates created"
    else
        log_info "SSL certificates already exist"
    fi
}

# Start Nginx for ACME challenge
start_nginx() {
    log_info "Starting Nginx for ACME challenge..."
    
    # Update Nginx configuration with domain
    sed -i.bak "s/\${DOMAIN_NAME}/$DOMAIN/g" "$NGINX_DIR/nginx.prod.conf"
    
    # Start Nginx container
    docker run -d \
        --name nginx-ssl-setup \
        --network host \
        -v "$NGINX_DIR/nginx.prod.conf:/etc/nginx/nginx.conf:ro" \
        -v "$SSL_DIR:/etc/nginx/ssl:ro" \
        -v "$WEBROOT_PATH:/var/www/certbot:ro" \
        -p 80:80 \
        -p 443:443 \
        nginx:1.25-alpine
    
    # Wait for Nginx to start
    sleep 5
    
    log_success "Nginx started"
}

# Stop and remove Nginx container
stop_nginx() {
    log_info "Stopping Nginx container..."
    docker stop nginx-ssl-setup || true
    docker rm nginx-ssl-setup || true
}

# Obtain SSL certificate using Certbot
obtain_certificate() {
    log_info "Obtaining SSL certificate for $DOMAIN..."
    
    local staging_flag=""
    if [[ "$STAGING" == true ]]; then
        staging_flag="--staging"
        log_warning "Using Let's Encrypt staging environment"
    fi
    
    local force_flag=""
    if [[ "$FORCE_RENEWAL" == true ]]; then
        force_flag="--force-renewal"
        log_warning "Forcing certificate renewal"
    fi
    
    # Run Certbot
    docker run --rm \
        -v "$SSL_DIR:/etc/letsencrypt" \
        -v "$WEBROOT_PATH:/var/www/certbot" \
        certbot/certbot \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        $staging_flag \
        $force_flag
    
    # Copy certificates to expected locations
    if [[ -d "$SSL_DIR/live/$DOMAIN" ]]; then
        cp "$SSL_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
        cp "$SSL_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
        cp "$SSL_DIR/live/$DOMAIN/chain.pem" "$SSL_DIR/chain.pem"
        
        # Set proper permissions
        chmod 644 "$SSL_DIR/fullchain.pem"
        chmod 600 "$SSL_DIR/privkey.pem"
        chmod 644 "$SSL_DIR/chain.pem"
        
        log_success "SSL certificate obtained and configured"
    else
        log_error "Failed to obtain SSL certificate"
        return 1
    fi
}

# Test SSL certificate
test_certificate() {
    log_info "Testing SSL certificate..."
    
    # Test with OpenSSL
    if openssl x509 -in "$SSL_DIR/fullchain.pem" -text -noout > /dev/null 2>&1; then
        log_success "SSL certificate is valid"
        
        # Show certificate details
        local expiry=$(openssl x509 -in "$SSL_DIR/fullchain.pem" -noout -enddate | cut -d= -f2)
        log_info "Certificate expires: $expiry"
    else
        log_error "SSL certificate is invalid"
        return 1
    fi
}

# Setup automatic renewal
setup_renewal() {
    log_info "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > "$SCRIPT_DIR/renew-ssl.sh" << 'EOF'
#!/bin/bash
# Automatic SSL certificate renewal script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SSL_DIR="$PROJECT_ROOT/nginx/ssl"

# Attempt renewal
docker run --rm \
    -v "$SSL_DIR:/etc/letsencrypt" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot renew --quiet

# If renewal was successful, reload Nginx
if [[ $? -eq 0 ]]; then
    # Copy renewed certificates
    if [[ -d "$SSL_DIR/live/$DOMAIN" ]]; then
        cp "$SSL_DIR/live/$DOMAIN/fullchain.pem" "$SSL_DIR/fullchain.pem"
        cp "$SSL_DIR/live/$DOMAIN/privkey.pem" "$SSL_DIR/privkey.pem"
        cp "$SSL_DIR/live/$DOMAIN/chain.pem" "$SSL_DIR/chain.pem"
    fi
    
    # Reload Nginx
    docker-compose -f "$PROJECT_ROOT/docker-compose.production.yml" exec nginx nginx -s reload
fi
EOF
    
    chmod +x "$SCRIPT_DIR/renew-ssl.sh"
    
    log_info "Renewal script created at $SCRIPT_DIR/renew-ssl.sh"
    log_info "Add the following line to your crontab for automatic renewal:"
    log_info "0 12 * * * $SCRIPT_DIR/renew-ssl.sh"
    
    log_success "Automatic renewal configured"
}

# Main function
main() {
    log_info "Starting SSL/TLS setup for OpsSight Platform"
    log_info "Domain: $DOMAIN"
    log_info "Email: $EMAIL"
    
    if [[ "$STAGING" == true ]]; then
        log_warning "Using staging environment"
    fi
    
    # Execute setup steps
    validate_requirements
    setup_directories
    generate_dhparam
    create_dummy_certificates
    start_nginx
    
    # Wait a moment for Nginx to be ready
    sleep 10
    
    # Obtain certificate
    if obtain_certificate; then
        stop_nginx
        test_certificate
        setup_renewal
        
        log_success "SSL/TLS setup completed successfully!"
        log_info "You can now start your application with:"
        log_info "docker-compose -f docker-compose.production.yml up -d"
    else
        stop_nginx
        log_error "SSL/TLS setup failed"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log_error "SSL setup failed with exit code $exit_code"
        stop_nginx
    fi
}

trap cleanup EXIT

# Parse arguments and run main function
parse_args "$@"
main