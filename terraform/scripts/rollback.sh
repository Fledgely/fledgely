#!/bin/bash
# Fledgely Self-Hosted Rollback Script
# Apache 2.0 License
#
# Usage: ./scripts/rollback.sh [commit_hash]
#
# This script rolls back a Fledgely deployment to a previous version.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Print banner
print_banner() {
    echo ""
    echo "============================================"
    echo "    Fledgely Rollback"
    echo "============================================"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check we're in a git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository."
        exit 1
    fi

    # Check terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed."
        exit 1
    fi

    # Check we're in the terraform directory
    if [ ! -f "main.tf" ]; then
        log_error "Please run this script from the terraform directory"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Show current version
show_current_version() {
    log_info "Current version:"
    git log -1 --format="  Commit: %h%n  Date: %ci%n  Message: %s"
    echo ""
}

# Show recent versions
show_recent_versions() {
    log_info "Recent versions (last 10 commits):"
    echo ""
    git log --oneline -10
    echo ""
}

# Get target commit
get_target_commit() {
    local target="${1:-}"

    if [ -n "$target" ]; then
        # Validate provided commit
        if ! git rev-parse --verify "$target^{commit}" > /dev/null 2>&1; then
            log_error "Invalid commit hash: $target"
            exit 1
        fi
        TARGET_COMMIT="$target"
    else
        # Prompt for commit
        show_recent_versions
        read -p "Enter commit hash to rollback to: " TARGET_COMMIT
        if [ -z "$TARGET_COMMIT" ]; then
            log_error "No commit specified"
            exit 1
        fi
    fi

    log_info "Target version:"
    git log -1 --format="  Commit: %h%n  Date: %ci%n  Message: %s" "$TARGET_COMMIT"
    echo ""
}

# Check for Terraform state backup
check_state_backup() {
    if [ -f "terraform.tfstate.backup" ]; then
        log_info "Found Terraform state backup"
    else
        log_warn "No Terraform state backup found"
        log_warn "If infrastructure rollback fails, manual intervention may be required"
    fi
}

# Rollback code
rollback_code() {
    log_info "Rolling back code to $TARGET_COMMIT..."

    # Create a backup branch of current state
    BACKUP_BRANCH="backup-$(date +%Y%m%d-%H%M%S)"
    git branch "$BACKUP_BRANCH"
    log_info "Created backup branch: $BACKUP_BRANCH"

    # Checkout target commit
    git checkout "$TARGET_COMMIT"

    log_success "Code rolled back"
}

# Rollback infrastructure
rollback_infrastructure() {
    log_info "Re-initializing Terraform..."
    terraform init

    log_info "Planning infrastructure rollback..."
    terraform plan -out=rollback.tfplan

    echo ""
    read -p "Apply this rollback plan? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Infrastructure rollback cancelled"
        log_info "Code has been rolled back, but infrastructure unchanged"
        rm -f rollback.tfplan
        return
    fi

    log_info "Applying infrastructure rollback..."
    terraform apply rollback.tfplan

    rm -f rollback.tfplan
    log_success "Infrastructure rolled back"
}

# Rollback Cloud Run to previous revision
rollback_cloudrun() {
    log_info "Cloud Run Revision Rollback"
    echo ""
    log_info "To rollback Cloud Run to a previous revision:"
    echo ""
    echo "  1. List available revisions:"
    echo "     gcloud run revisions list --service=fledgely-web --region=\$REGION"
    echo ""
    echo "  2. Route traffic to previous revision:"
    echo "     gcloud run services update-traffic fledgely-web \\"
    echo "       --to-revisions=REVISION_NAME=100 \\"
    echo "       --region=\$REGION"
    echo ""
    log_info "Cloud Run maintains the last 100 revisions for quick rollback"
}

# Main function
main() {
    print_banner

    check_prerequisites
    show_current_version
    check_state_backup

    get_target_commit "${1:-}"

    # Confirm rollback
    log_warn "This will rollback to commit: $TARGET_COMMIT"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Rollback cancelled"
        exit 0
    fi

    rollback_code

    # Ask about infrastructure rollback
    echo ""
    read -p "Also rollback infrastructure? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rollback_infrastructure
    fi

    echo ""
    log_success "============================================"
    log_success "Rollback complete!"
    log_success "============================================"
    echo ""

    rollback_cloudrun

    echo ""
    log_info "Current version after rollback:"
    git log -1 --format="  Commit: %h%n  Date: %ci%n  Message: %s"
    echo ""
    log_info "To return to latest version: git checkout main && git pull"
}

main "$@"
