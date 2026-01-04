#!/bin/bash
# Fledgely Self-Hosted Update Script
# Apache 2.0 License
#
# Usage: ./scripts/update.sh
#
# This script updates a Fledgely self-hosted deployment to the latest version.
# Updates should complete in <10 minutes (NFR86).

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
    echo "    Fledgely Self-Hosted Update"
    echo "============================================"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check we're in a git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository. Please run from the fledgely directory."
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

# Check for updates
check_for_updates() {
    log_info "Checking for updates..."

    # Fetch latest from remote
    git fetch origin main

    # Check if we're behind
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" == "$REMOTE" ]; then
        log_success "Already up to date!"
        exit 0
    fi

    # Show what's new
    log_info "New commits available:"
    git log --oneline HEAD..origin/main | head -10
    echo ""

    COMMIT_COUNT=$(git rev-list --count HEAD..origin/main)
    log_info "$COMMIT_COUNT new commit(s) available"
}

# Show changelog highlights
show_changelog() {
    log_info "Checking for breaking changes..."

    # Look for BREAKING CHANGE in commit messages
    BREAKING=$(git log --oneline --grep="BREAKING" HEAD..origin/main || true)
    if [ -n "$BREAKING" ]; then
        log_warn "Breaking changes detected:"
        echo "$BREAKING"
        echo ""
        log_warn "Please review before proceeding!"
    else
        log_info "No breaking changes detected"
    fi
}

# Create backup recommendation
recommend_backup() {
    log_warn "Recommendation: Create a backup before updating"
    echo ""
    echo "  To backup Firestore:"
    echo "    gcloud firestore export gs://YOUR_BUCKET/backups/pre-update-\$(date +%Y%m%d)"
    echo ""
    echo "  To backup Terraform state:"
    echo "    cp terraform.tfstate terraform.tfstate.backup"
    echo ""
}

# Pull latest changes
pull_updates() {
    log_info "Pulling latest changes..."
    git pull origin main
    log_success "Code updated"
}

# Run terraform init (in case of new providers/modules)
init_terraform() {
    log_info "Initializing Terraform..."
    terraform init -upgrade
    log_success "Terraform initialized"
}

# Plan terraform changes
plan_terraform() {
    log_info "Planning infrastructure changes..."
    terraform plan -out=update.tfplan

    echo ""
    log_info "Review the plan above before applying"
}

# Apply terraform changes
apply_terraform() {
    local start_time=$(date +%s)

    log_info "Applying infrastructure changes..."
    terraform apply update.tfplan

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    log_success "Infrastructure updated in ${minutes}m ${seconds}s"

    # Check against NFR86 (10 minutes)
    if [ $duration -gt 600 ]; then
        log_warn "Update took longer than 10 minutes (NFR86)"
    else
        log_success "Update time within NFR86 requirement (<10 minutes)"
    fi

    # Clean up plan file
    rm -f update.tfplan
}

# Run verification
verify_update() {
    log_info "Verifying update..."
    if [ -x "./scripts/verify.sh" ]; then
        ./scripts/verify.sh
    else
        log_warn "Verification script not found, skipping"
    fi
}

# Main function
main() {
    print_banner

    # Record start time
    UPDATE_START=$(date +%s)

    check_prerequisites
    show_current_version
    check_for_updates
    show_changelog

    # Confirm update
    echo ""
    recommend_backup
    read -p "Proceed with update? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Update cancelled"
        exit 0
    fi

    pull_updates
    init_terraform
    plan_terraform

    # Confirm apply
    echo ""
    read -p "Apply these infrastructure changes? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Update cancelled after plan"
        rm -f update.tfplan
        exit 0
    fi

    apply_terraform
    verify_update

    # Calculate total time
    UPDATE_END=$(date +%s)
    TOTAL_DURATION=$((UPDATE_END - UPDATE_START))
    TOTAL_MINUTES=$((TOTAL_DURATION / 60))
    TOTAL_SECONDS=$((TOTAL_DURATION % 60))

    echo ""
    log_success "============================================"
    log_success "Fledgely update complete!"
    log_success "Total time: ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
    log_success "============================================"
    echo ""
    log_info "New version:"
    git log -1 --format="  Commit: %h%n  Date: %ci%n  Message: %s"
    echo ""
    log_info "If you encounter issues, run: ./scripts/rollback.sh"
}

main "$@"
