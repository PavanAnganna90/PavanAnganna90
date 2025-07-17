#!/bin/bash
# =============================================================================
# OpsSight Platform - Database Backup Script
# =============================================================================
# Comprehensive backup solution with encryption, compression, and cloud upload
# Supports PostgreSQL backups with automated cleanup and monitoring
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Load environment variables
if [[ -f "$PROJECT_ROOT/backend/.env.production" ]]; then
    source "$PROJECT_ROOT/backend/.env.production"
fi

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/opssight/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-true}"
BACKUP_ENCRYPTION="${BACKUP_ENCRYPTION:-true}"
BACKUP_S3_ENABLED="${BACKUP_S3_ENABLED:-false}"
BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Database configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-opssight_prod}"
DB_USER="${DB_USER:-opssight_prod}"
DB_PASSWORD="${DB_PASSWORD}"

# Backup metadata
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="opssight_backup_${TIMESTAMP}"
BACKUP_LOG="/var/log/opssight/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_with_timestamp() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$BACKUP_LOG"
}

log_info() {
    log_with_timestamp "[INFO] $1"
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log_with_timestamp "[SUCCESS] $1"
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log_with_timestamp "[WARNING] $1"
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log_with_timestamp "[ERROR] $1"
    echo -e "${RED}[ERROR]${NC} $1"
}

# Error handling
handle_error() {
    local exit_code=$?
    local line_number=$1
    log_error "Backup failed at line $line_number with exit code $exit_code"
    cleanup_failed_backup
    exit $exit_code
}

trap 'handle_error $LINENO' ERR

# Cleanup function for failed backups
cleanup_failed_backup() {
    if [[ -f "$BACKUP_DIR/${BACKUP_FILENAME}.sql" ]]; then
        rm -f "$BACKUP_DIR/${BACKUP_FILENAME}.sql"
    fi
    if [[ -f "$BACKUP_DIR/${BACKUP_FILENAME}.sql.gz" ]]; then
        rm -f "$BACKUP_DIR/${BACKUP_FILENAME}.sql.gz"
    fi
    if [[ -f "$BACKUP_DIR/${BACKUP_FILENAME}.sql.gz.enc" ]]; then
        rm -f "$BACKUP_DIR/${BACKUP_FILENAME}.sql.gz.enc"
    fi
}

# Validate configuration
validate_config() {
    log_info "Validating backup configuration..."
    
    # Check required variables
    if [[ -z "$DB_PASSWORD" ]]; then
        log_error "Database password not set"
        exit 1
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$BACKUP_LOG")"
    
    # Check disk space (require at least 2GB free)
    local available_space=$(df "$BACKUP_DIR" | tail -1 | awk '{print $4}')
    local required_space=2097152  # 2GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "Insufficient disk space. Available: ${available_space}KB, Required: ${required_space}KB"
        exit 1
    fi
    
    # Test database connection
    if ! PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log_error "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    log_success "Configuration validated"
}

# Create database backup
create_backup() {
    log_info "Creating database backup..."
    
    local backup_file="$BACKUP_DIR/${BACKUP_FILENAME}.sql"
    
    # Create PostgreSQL backup
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --no-privileges \
        --no-owner \
        > "$backup_file" 2>>"$BACKUP_LOG"
    
    # Verify backup file
    if [[ ! -f "$backup_file" ]] || [[ ! -s "$backup_file" ]]; then
        log_error "Backup file is empty or does not exist"
        exit 1
    fi
    
    local backup_size=$(du -h "$backup_file" | cut -f1)
    log_success "Database backup created: $backup_file ($backup_size)"
    
    echo "$backup_file"
}

# Compress backup
compress_backup() {
    local backup_file="$1"
    
    if [[ "$BACKUP_COMPRESSION" == "true" ]]; then
        log_info "Compressing backup..."
        
        gzip -9 "$backup_file"
        local compressed_file="${backup_file}.gz"
        
        if [[ ! -f "$compressed_file" ]]; then
            log_error "Compression failed"
            exit 1
        fi
        
        local compressed_size=$(du -h "$compressed_file" | cut -f1)
        log_success "Backup compressed: $compressed_file ($compressed_size)"
        
        echo "$compressed_file"
    else
        echo "$backup_file"
    fi
}

# Encrypt backup
encrypt_backup() {
    local backup_file="$1"
    
    if [[ "$BACKUP_ENCRYPTION" == "true" ]]; then
        log_info "Encrypting backup..."
        
        if [[ -z "$BACKUP_ENCRYPTION_KEY" ]]; then
            log_error "Encryption key not provided"
            exit 1
        fi
        
        local encrypted_file="${backup_file}.enc"
        
        openssl aes-256-cbc -salt -pbkdf2 -in "$backup_file" -out "$encrypted_file" -k "$BACKUP_ENCRYPTION_KEY"
        
        if [[ ! -f "$encrypted_file" ]]; then
            log_error "Encryption failed"
            exit 1
        fi
        
        # Remove unencrypted file
        rm -f "$backup_file"
        
        local encrypted_size=$(du -h "$encrypted_file" | cut -f1)
        log_success "Backup encrypted: $encrypted_file ($encrypted_size)"
        
        echo "$encrypted_file"
    else
        echo "$backup_file"
    fi
}

# Upload to cloud storage
upload_to_cloud() {
    local backup_file="$1"
    
    if [[ "$BACKUP_S3_ENABLED" == "true" ]] && [[ -n "$BACKUP_S3_BUCKET" ]]; then
        log_info "Uploading backup to S3..."
        
        local s3_key="backups/$(basename "$backup_file")"
        
        aws s3 cp "$backup_file" "s3://$BACKUP_S3_BUCKET/$s3_key" \
            --storage-class STANDARD_IA \
            --metadata "created=$(date -Iseconds),host=$(hostname),database=$DB_NAME"
        
        if [[ $? -eq 0 ]]; then
            log_success "Backup uploaded to S3: s3://$BACKUP_S3_BUCKET/$s3_key"
        else
            log_error "Failed to upload backup to S3"
            # Don't exit - local backup still exists
        fi
    else
        log_info "Cloud upload disabled or not configured"
    fi
}

# Generate backup metadata
generate_metadata() {
    local backup_file="$1"
    local metadata_file="${backup_file}.metadata"
    
    log_info "Generating backup metadata..."
    
    cat > "$metadata_file" << EOF
{
  "backup_timestamp": "$(date -Iseconds)",
  "database_name": "$DB_NAME",
  "database_host": "$DB_HOST",
  "database_port": "$DB_PORT",
  "backup_file": "$(basename "$backup_file")",
  "backup_size": "$(stat -c%s "$backup_file" 2>/dev/null || stat -f%z "$backup_file")",
  "backup_size_human": "$(du -h "$backup_file" | cut -f1)",
  "checksum_md5": "$(md5sum "$backup_file" | cut -d' ' -f1)",
  "checksum_sha256": "$(sha256sum "$backup_file" | cut -d' ' -f1)",
  "compression_enabled": $BACKUP_COMPRESSION,
  "encryption_enabled": $BACKUP_ENCRYPTION,
  "hostname": "$(hostname)",
  "backup_version": "1.0",
  "postgres_version": "$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" | head -1 | xargs)"
}
EOF
    
    log_success "Metadata generated: $metadata_file"
}

# Test backup integrity
test_backup_integrity() {
    local backup_file="$1"
    
    log_info "Testing backup integrity..."
    
    # For custom format backups, use pg_restore --list to verify
    if [[ "$backup_file" =~ \.enc$ ]]; then
        log_info "Skipping integrity test for encrypted backup"
        return 0
    fi
    
    local temp_file="/tmp/backup_test_$$"
    
    if [[ "$backup_file" =~ \.gz$ ]]; then
        gunzip -c "$backup_file" > "$temp_file"
        backup_file="$temp_file"
    fi
    
    if PGPASSWORD="$DB_PASSWORD" pg_restore --list "$backup_file" > /dev/null 2>&1; then
        log_success "Backup integrity test passed"
    else
        log_error "Backup integrity test failed"
        rm -f "$temp_file"
        exit 1
    fi
    
    rm -f "$temp_file"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: $BACKUP_RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm -f "$file"
        rm -f "${file}.metadata"
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "opssight_backup_*" -type f -mtime +$BACKUP_RETENTION_DAYS -print0)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Cleaned up $deleted_count old backup files"
    else
        log_info "No old backups to clean up"
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" == "error" ]]; then
            color="danger"
        elif [[ "$status" == "warning" ]]; then
            color="warning"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"OpsSight Backup $status\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Generate backup report
generate_report() {
    local backup_file="$1"
    local start_time="$2"
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup_report_${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
OpsSight Database Backup Report
==============================

Backup Details:
- Timestamp: $(date -Iseconds)
- Database: $DB_NAME
- Host: $DB_HOST:$DB_PORT
- Duration: ${duration}s
- Backup File: $(basename "$backup_file")
- File Size: $(du -h "$backup_file" | cut -f1)

Configuration:
- Compression: $BACKUP_COMPRESSION
- Encryption: $BACKUP_ENCRYPTION
- Cloud Upload: $BACKUP_S3_ENABLED
- Retention: $BACKUP_RETENTION_DAYS days

Status: SUCCESS
EOF
    
    log_success "Backup report generated: $report_file"
}

# Health check
health_check() {
    log_info "Performing backup system health check..."
    
    # Check backup directory permissions
    if [[ ! -w "$BACKUP_DIR" ]]; then
        log_error "Backup directory is not writable: $BACKUP_DIR"
        exit 1
    fi
    
    # Check available tools
    local required_tools=("pg_dump" "pg_restore" "gzip" "openssl")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool not found: $tool"
            exit 1
        fi
    done
    
    # Check AWS CLI if S3 is enabled
    if [[ "$BACKUP_S3_ENABLED" == "true" ]] && ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found but S3 upload is enabled"
        exit 1
    fi
    
    log_success "Health check passed"
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log_info "=============================================="
    log_info "OpsSight Database Backup Started"
    log_info "Timestamp: $(date -Iseconds)"
    log_info "Database: $DB_NAME"
    log_info "=============================================="
    
    # Perform backup steps
    health_check
    validate_config
    
    local backup_file
    backup_file=$(create_backup)
    backup_file=$(compress_backup "$backup_file")
    backup_file=$(encrypt_backup "$backup_file")
    
    generate_metadata "$backup_file"
    test_backup_integrity "$backup_file"
    upload_to_cloud "$backup_file"
    cleanup_old_backups
    generate_report "$backup_file" "$start_time"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "=============================================="
    log_success "Backup completed successfully in ${duration}s"
    log_success "Final backup file: $backup_file"
    log_success "=============================================="
    
    send_notification "success" "Database backup completed successfully in ${duration}s"
}

# Handle script arguments
case "${1:-}" in
    "test")
        log_info "Running backup system test..."
        health_check
        validate_config
        log_success "Backup system test completed"
        ;;
    "cleanup")
        log_info "Running cleanup only..."
        cleanup_old_backups
        ;;
    "help"|"--help"|"-h")
        cat << EOF
OpsSight Database Backup Script

Usage: $0 [COMMAND]

Commands:
    (none)    Run full backup process
    test      Test backup system without creating backup
    cleanup   Clean up old backups only
    help      Show this help message

Environment Variables:
    BACKUP_DIR              Backup directory (default: /opt/opssight/backups)
    BACKUP_RETENTION_DAYS   Retention period in days (default: 30)
    BACKUP_COMPRESSION      Enable compression (default: true)
    BACKUP_ENCRYPTION       Enable encryption (default: true)
    BACKUP_S3_ENABLED       Enable S3 upload (default: false)
    BACKUP_S3_BUCKET        S3 bucket name
    BACKUP_ENCRYPTION_KEY   Encryption key for backup files

EOF
        ;;
    *)
        main
        ;;
esac