#!/bin/bash

# Backup and Disaster Recovery Script for OpsSight Platform
# Handles database backups, file backups, and restoration procedures

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
ENV_FILE="${PROJECT_DIR}/.env.prod"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

# Default retention (days)
BACKUP_RETENTION_DAYS=30
DB_BACKUP_RETENTION_DAYS=7

# Functions
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

load_environment() {
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE"
        set +a
        log_info "Environment loaded from $ENV_FILE"
    else
        log_warning "Environment file not found: $ENV_FILE"
        log_warning "Using default values"
        POSTGRES_USER=${POSTGRES_USER:-opssight}
        POSTGRES_DB=${POSTGRES_DB:-opssight_prod}
    fi
}

create_database_backup() {
    local backup_name="${1:-db-backup-$(date +%Y%m%d-%H%M%S)}"
    local backup_file="${BACKUP_DIR}/${backup_name}.sql"
    
    log_info "Creating database backup: $backup_name"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check if database container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi
    
    # Create database dump
    docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_dump \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --verbose \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists > "$backup_file"
    
    # Compress the backup
    gzip "$backup_file"
    backup_file="${backup_file}.gz"
    
    # Verify backup
    if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
        local backup_size=$(du -h "$backup_file" | cut -f1)
        log_success "Database backup created: $backup_file ($backup_size)"
        
        # Create backup metadata
        cat > "${backup_file}.meta" << EOF
backup_type=database
created_at=$(date -Iseconds)
postgres_version=$(docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -t -c "SELECT version();" | head -1 | xargs)
database_name=${POSTGRES_DB}
backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file")
EOF
        
        return 0
    else
        log_error "Database backup failed or is empty"
        return 1
    fi
}

restore_database_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warning "This will REPLACE the current database with the backup!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Database restore cancelled"
        return 0
    fi
    
    log_info "Restoring database from: $backup_file"
    
    # Check if database container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_error "PostgreSQL container is not running"
        return 1
    fi
    
    # Stop backend services to prevent connections
    log_info "Stopping backend services..."
    docker-compose -f "$COMPOSE_FILE" stop backend
    
    # Wait for connections to close
    sleep 5
    
    # Restore database
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
    else
        docker-compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" < "$backup_file"
    fi
    
    # Restart backend services
    log_info "Restarting backend services..."
    docker-compose -f "$COMPOSE_FILE" start backend
    
    log_success "Database restored successfully"
}

create_full_backup() {
    local backup_name="${1:-full-backup-$(date +%Y%m%d-%H%M%S)}"
    local backup_dir="${BACKUP_DIR}/${backup_name}"
    
    log_info "Creating full system backup: $backup_name"
    
    mkdir -p "$backup_dir"
    
    # Create database backup
    if create_database_backup "database"; then
        mv "${BACKUP_DIR}/database.sql.gz" "${backup_dir}/"
        mv "${BACKUP_DIR}/database.sql.gz.meta" "${backup_dir}/"
    fi
    
    # Backup Docker volumes
    log_info "Backing up Docker volumes..."
    local volumes=("postgres_data" "redis_data" "grafana_data" "prometheus_data")
    
    for volume in "${volumes[@]}"; do
        if docker volume ls | grep -q "$volume"; then
            log_info "Backing up volume: $volume"
            docker run --rm \
                -v "${volume}:/data" \
                -v "${backup_dir}:/backup" \
                alpine:latest \
                tar -czf "/backup/${volume}.tar.gz" -C /data .
        fi
    done
    
    # Backup configuration files
    log_info "Backing up configuration files..."
    tar -czf "${backup_dir}/config.tar.gz" \
        -C "$PROJECT_DIR" \
        --exclude="node_modules" \
        --exclude="*.log" \
        --exclude=".git" \
        --exclude="backups" \
        . 2>/dev/null || true
    
    # Create backup manifest
    cat > "${backup_dir}/manifest.json" << EOF
{
    "backup_name": "$backup_name",
    "created_at": "$(date -Iseconds)",
    "backup_type": "full",
    "hostname": "$(hostname)",
    "docker_version": "$(docker --version)",
    "compose_version": "$(docker-compose --version)",
    "files": [
        $(ls -1 "$backup_dir" | sed 's/manifest.json//' | sed 's/^/        "/' | sed 's/$/"/' | paste -sd ',' -)
    ]
}
EOF
    
    # Calculate total backup size
    local total_size=$(du -sh "$backup_dir" | cut -f1)
    log_success "Full backup created: $backup_dir ($total_size)"
    
    # Create compressed archive
    log_info "Creating compressed archive..."
    tar -czf "${backup_dir}.tar.gz" -C "$BACKUP_DIR" "$(basename "$backup_dir")"
    rm -rf "$backup_dir"
    
    log_success "Backup archive created: ${backup_dir}.tar.gz"
}

restore_full_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warning "This will REPLACE all data with the backup!"
    log_warning "Current containers will be stopped and data will be lost!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Full restore cancelled"
        return 0
    fi
    
    log_info "Restoring full backup from: $backup_file"
    
    # Extract backup
    local restore_dir="${BACKUP_DIR}/restore-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$restore_dir"
    tar -xzf "$backup_file" -C "$restore_dir" --strip-components=1
    
    # Stop all services
    log_info "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" down -v
    
    # Restore Docker volumes
    log_info "Restoring Docker volumes..."
    for volume_backup in "$restore_dir"/*.tar.gz; do
        if [ -f "$volume_backup" ]; then
            local volume_name=$(basename "$volume_backup" .tar.gz)
            log_info "Restoring volume: $volume_name"
            
            # Remove existing volume
            docker volume rm "$volume_name" 2>/dev/null || true
            
            # Create new volume
            docker volume create "$volume_name"
            
            # Restore data
            docker run --rm \
                -v "$volume_name:/data" \
                -v "$restore_dir:/backup" \
                alpine:latest \
                tar -xzf "/backup/${volume_name}.tar.gz" -C /data
        fi
    done
    
    # Restore configuration files
    if [ -f "$restore_dir/config.tar.gz" ]; then
        log_info "Restoring configuration files..."
        log_warning "This will overwrite current configuration files!"
        read -p "Continue with configuration restore? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            tar -xzf "$restore_dir/config.tar.gz" -C "$PROJECT_DIR"
        fi
    fi
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Cleanup
    rm -rf "$restore_dir"
    
    log_success "Full restore completed successfully"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Clean up old database backups
    find "$BACKUP_DIR" -name "db-backup-*.sql.gz" -mtime +$DB_BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "db-backup-*.sql.gz.meta" -mtime +$DB_BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean up old full backups
    find "$BACKUP_DIR" -name "full-backup-*.tar.gz" -mtime +$BACKUP_RETENTION_DAYS -delete 2>/dev/null || true
    
    log_success "Old backups cleaned up"
}

list_backups() {
    log_info "Available backups:"
    echo
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        log_warning "No backups found"
        return 0
    fi
    
    echo "Database Backups:"
    ls -lh "$BACKUP_DIR"/db-backup-*.sql.gz 2>/dev/null | while read -r line; do
        echo "  $line"
    done
    
    echo
    echo "Full Backups:"
    ls -lh "$BACKUP_DIR"/full-backup-*.tar.gz 2>/dev/null | while read -r line; do
        echo "  $line"
    done
    
    echo
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    echo "Total backup size: $total_size"
}

show_help() {
    echo "OpsSight Platform Backup & Restore Tool"
    echo
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo
    echo "Commands:"
    echo "  backup-db [name]     - Create database backup (optional name)"
    echo "  restore-db <file>    - Restore database from backup file"
    echo "  backup-full [name]   - Create full system backup (optional name)"
    echo "  restore-full <file>  - Restore full system from backup file"
    echo "  list                 - List available backups"
    echo "  cleanup              - Remove old backups based on retention policy"
    echo "  help                 - Show this help message"
    echo
    echo "Examples:"
    echo "  $0 backup-db                    # Create database backup with timestamp"
    echo "  $0 backup-db pre-migration      # Create named database backup"
    echo "  $0 restore-db backup.sql.gz     # Restore from database backup"
    echo "  $0 backup-full                  # Create full system backup"
    echo "  $0 restore-full backup.tar.gz   # Restore full system"
    echo "  $0 list                         # List all backups"
    echo "  $0 cleanup                      # Clean up old backups"
    echo
}

# Main script
main() {
    local command="${1:-help}"
    
    # Load environment
    load_environment
    
    case "$command" in
        "backup-db")
            create_database_backup "${2:-}"
            ;;
        "restore-db")
            if [ -z "${2:-}" ]; then
                log_error "Please specify backup file to restore"
                exit 1
            fi
            restore_database_backup "$2"
            ;;
        "backup-full")
            create_full_backup "${2:-}"
            ;;
        "restore-full")
            if [ -z "${2:-}" ]; then
                log_error "Please specify backup file to restore"
                exit 1
            fi
            restore_full_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run main function
main "$@"