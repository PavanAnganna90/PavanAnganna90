#!/bin/bash
# =============================================================================
# OpsSight Platform - Database Restore Script
# =============================================================================
# Restore database from backup with support for encrypted/compressed backups
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Load environment variables
if [[ -f "$PROJECT_ROOT/backend/.env.production" ]]; then
    source "$PROJECT_ROOT/backend/.env.production"
fi

# Restore configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/opssight/backups}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# Database configuration
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-opssight_prod}"
DB_USER="${DB_USER:-opssight_prod}"
DB_PASSWORD="${DB_PASSWORD}"

# Command line options
BACKUP_FILE=""
FORCE_RESTORE=false
DRY_RUN=false

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
OpsSight Database Restore Script

Usage: $0 [OPTIONS]

OPTIONS:
    -f, --file FILE         Backup file to restore (required)
    --force                 Force restore without confirmation
    --dry-run              Show what would be done without executing
    -h, --help             Show this help message

EXAMPLES:
    $0 --file /opt/opssight/backups/opssight_backup_20231215_120000.sql.gz.enc
    $0 --file backup.sql --force
    $0 --file backup.sql --dry-run

NOTES:
    - Supports encrypted and compressed backup files
    - Automatically detects file format (.sql, .sql.gz, .sql.gz.enc)
    - Creates a pre-restore backup automatically
    - Requires database to be accessible

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                BACKUP_FILE="$2"
                shift 2
                ;;
            --force)
                FORCE_RESTORE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
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

# Validate inputs
validate_inputs() {
    log_info "Validating restore configuration..."
    
    if [[ -z "$BACKUP_FILE" ]]; then
        log_error "Backup file is required. Use --file option."
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file does not exist: $BACKUP_FILE"
        exit 1
    fi
    
    # Check database connection
    if ! PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log_error "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    log_success "Validation completed"
}

# Create pre-restore backup
create_pre_restore_backup() {
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would create pre-restore backup"
        return 0
    fi
    
    log_info "Creating pre-restore backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_restore_backup="$BACKUP_DIR/pre_restore_backup_${timestamp}.sql"
    
    mkdir -p "$BACKUP_DIR"
    
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        > "$pre_restore_backup"
    
    if [[ -f "$pre_restore_backup" ]] && [[ -s "$pre_restore_backup" ]]; then
        log_success "Pre-restore backup created: $pre_restore_backup"
    else
        log_error "Failed to create pre-restore backup"
        exit 1
    fi
}

# Prepare backup file for restore
prepare_backup_file() {
    local backup_file="$1"
    local temp_dir="/tmp/opssight_restore_$$"
    
    mkdir -p "$temp_dir"
    
    local prepared_file="$backup_file"
    
    # Handle encrypted files
    if [[ "$backup_file" =~ \.enc$ ]]; then
        log_info "Decrypting backup file..."
        
        if [[ -z "$BACKUP_ENCRYPTION_KEY" ]]; then
            log_error "Encryption key required for encrypted backup"
            exit 1
        fi
        
        local decrypted_file="$temp_dir/$(basename "${backup_file%.enc}")"
        
        openssl aes-256-cbc -d -pbkdf2 -in "$backup_file" -out "$decrypted_file" -k "$BACKUP_ENCRYPTION_KEY"
        
        if [[ ! -f "$decrypted_file" ]]; then
            log_error "Failed to decrypt backup file"
            exit 1
        fi
        
        prepared_file="$decrypted_file"
        log_success "Backup file decrypted"
    fi
    
    # Handle compressed files
    if [[ "$prepared_file" =~ \.gz$ ]]; then
        log_info "Decompressing backup file..."
        
        local decompressed_file="$temp_dir/$(basename "${prepared_file%.gz}")"
        
        gunzip -c "$prepared_file" > "$decompressed_file"
        
        if [[ ! -f "$decompressed_file" ]]; then
            log_error "Failed to decompress backup file"
            exit 1
        fi
        
        prepared_file="$decompressed_file"
        log_success "Backup file decompressed"
    fi
    
    echo "$prepared_file"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log_info "Verifying backup file integrity..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would verify backup integrity"
        return 0
    fi
    
    # Test if the backup file is valid
    if pg_restore --list "$backup_file" > /dev/null 2>&1; then
        log_success "Backup file is valid"
    else
        log_error "Backup file is corrupted or invalid"
        exit 1
    fi
}

# Get database info
get_database_info() {
    log_info "Getting current database information..."
    
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    local db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
    
    log_info "Current database info:"
    log_info "  Tables: $table_count"
    log_info "  Size: $db_size"
}

# Confirm restore operation
confirm_restore() {
    if [[ "$FORCE_RESTORE" == true ]] || [[ "$DRY_RUN" == true ]]; then
        return 0
    fi
    
    log_warning "This operation will REPLACE all data in the database: $DB_NAME"
    log_warning "A pre-restore backup will be created for safety."
    echo
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restore operation cancelled"
        exit 0
    fi
}

# Perform database restore
perform_restore() {
    local backup_file="$1"
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore database from: $backup_file"
        return 0
    fi
    
    log_info "Starting database restore..."
    
    # Drop and recreate database
    log_info "Dropping existing database..."
    PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" --if-exists
    
    log_info "Creating new database..."
    PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    
    # Restore from backup
    log_info "Restoring data from backup..."
    PGPASSWORD="$DB_PASSWORD" pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-owner \
        --no-privileges \
        "$backup_file"
    
    log_success "Database restore completed"
}

# Verify restore
verify_restore() {
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would verify restore"
        return 0
    fi
    
    log_info "Verifying restored database..."
    
    # Check if database is accessible
    if ! PGPASSWORD="$DB_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log_error "Restored database is not accessible"
        exit 1
    fi
    
    # Get basic stats
    local table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    local db_size=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" | xargs)
    
    log_success "Database restore verification completed"
    log_info "Restored database info:"
    log_info "  Tables: $table_count"
    log_info "  Size: $db_size"
}

# Cleanup temporary files
cleanup() {
    local temp_dir="/tmp/opssight_restore_$$"
    if [[ -d "$temp_dir" ]]; then
        rm -rf "$temp_dir"
    fi
}

# List available backups
list_backups() {
    log_info "Available backup files in $BACKUP_DIR:"
    echo
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "Backup directory does not exist: $BACKUP_DIR"
        return
    fi
    
    local backups=($(find "$BACKUP_DIR" -name "opssight_backup_*" -type f | sort -r))
    
    if [[ ${#backups[@]} -eq 0 ]]; then
        log_warning "No backup files found"
        return
    fi
    
    printf "%-40s %-15s %-20s\n" "Backup File" "Size" "Modified"
    printf "%-40s %-15s %-20s\n" "----------------------------------------" "---------------" "--------------------"
    
    for backup in "${backups[@]}"; do
        local size=$(du -h "$backup" | cut -f1)
        local modified=$(date -r "$backup" "+%Y-%m-%d %H:%M:%S")
        local filename=$(basename "$backup")
        printf "%-40s %-15s %-20s\n" "$filename" "$size" "$modified"
    done
    echo
}

# Main function
main() {
    log_info "=============================================="
    log_info "OpsSight Database Restore"
    log_info "=============================================="
    
    if [[ "$DRY_RUN" == true ]]; then
        log_warning "DRY RUN MODE - No changes will be made"
    fi
    
    validate_inputs
    get_database_info
    confirm_restore
    create_pre_restore_backup
    
    local prepared_backup
    prepared_backup=$(prepare_backup_file "$BACKUP_FILE")
    
    verify_backup "$prepared_backup"
    perform_restore "$prepared_backup"
    verify_restore
    cleanup
    
    log_success "=============================================="
    log_success "Database restore completed successfully"
    log_success "=============================================="
}

# Error handling
trap cleanup EXIT

# Handle script arguments
case "${1:-}" in
    "list")
        list_backups
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        parse_args "$@"
        main
        ;;
esac