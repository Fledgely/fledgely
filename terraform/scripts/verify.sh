#!/bin/bash
# Fledgely Deployment Verification Script
# Apache 2.0 License
#
# Usage: ./scripts/verify.sh
#
# This script verifies that a Fledgely deployment is working correctly.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

# Track results
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Record result
record_pass() {
    log_success "$1"
    ((PASS_COUNT++))
}

record_fail() {
    log_error "$1"
    ((FAIL_COUNT++))
}

record_warn() {
    log_warn "$1"
    ((WARN_COUNT++))
}

# Print banner
print_banner() {
    echo ""
    echo "============================================"
    echo "    Fledgely Deployment Verification"
    echo "============================================"
    echo ""
}

# Get Terraform outputs
get_outputs() {
    log_info "Reading Terraform outputs..."

    if [ ! -f "terraform.tfstate" ] && [ ! -d ".terraform" ]; then
        log_error "No Terraform state found. Run terraform apply first."
        exit 1
    fi

    PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || echo "")
    WEB_URL=$(terraform output -raw web_app_url 2>/dev/null || echo "")
    API_URL=$(terraform output -raw functions_url 2>/dev/null || echo "")
    STORAGE_BUCKET=$(terraform output -raw storage_bucket_name 2>/dev/null || echo "")

    if [ -z "$PROJECT_ID" ]; then
        log_error "Could not read Terraform outputs. Is the deployment complete?"
        exit 1
    fi

    log_info "Project ID: $PROJECT_ID"
    log_info "Web URL: $WEB_URL"
    log_info "API URL: $API_URL"
    log_info "Storage Bucket: $STORAGE_BUCKET"
    echo ""
}

# Check GCP APIs
check_apis() {
    log_info "Checking GCP APIs..."

    local apis=(
        "cloudfunctions.googleapis.com"
        "run.googleapis.com"
        "firestore.googleapis.com"
        "storage.googleapis.com"
        "firebase.googleapis.com"
    )

    for api in "${apis[@]}"; do
        if gcloud services list --project="$PROJECT_ID" --enabled --filter="name:$api" --format="value(name)" | grep -q "$api"; then
            record_pass "API enabled: $api"
        else
            record_fail "API not enabled: $api"
        fi
    done
}

# Check Cloud Run service
check_cloudrun() {
    log_info "Checking Cloud Run service..."

    # Check if service exists
    if gcloud run services list --project="$PROJECT_ID" --format="value(name)" | grep -q "fledgely-web"; then
        record_pass "Cloud Run service exists"
    else
        record_fail "Cloud Run service not found"
        return
    fi

    # Check if URL is accessible (may return 5xx if app code not deployed)
    if [ -n "$WEB_URL" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" || echo "000")
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
            record_pass "Cloud Run responding (HTTP $HTTP_CODE)"
        elif [ "$HTTP_CODE" == "503" ] || [ "$HTTP_CODE" == "502" ]; then
            record_warn "Cloud Run accessible but app may not be deployed (HTTP $HTTP_CODE)"
        else
            record_fail "Cloud Run not responding (HTTP $HTTP_CODE)"
        fi
    fi
}

# Check Cloud Functions
check_functions() {
    log_info "Checking Cloud Functions..."

    # Check if function exists
    if gcloud functions list --project="$PROJECT_ID" --gen2 --format="value(name)" 2>/dev/null | grep -q "fledgely-api"; then
        record_pass "Cloud Function exists"
    else
        record_fail "Cloud Function not found"
        return
    fi

    # Check if API URL is accessible
    if [ -n "$API_URL" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL" --max-time 10 || echo "000")
        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "401" ]; then
            record_pass "Cloud Function responding (HTTP $HTTP_CODE)"
        else
            record_warn "Cloud Function may not be fully deployed (HTTP $HTTP_CODE)"
        fi
    fi
}

# Check Firestore
check_firestore() {
    log_info "Checking Firestore..."

    # Check if database exists
    if gcloud firestore databases list --project="$PROJECT_ID" --format="value(name)" 2>/dev/null | grep -q "(default)"; then
        record_pass "Firestore database exists"
    else
        record_fail "Firestore database not found"
    fi
}

# Check Cloud Storage
check_storage() {
    log_info "Checking Cloud Storage..."

    if [ -n "$STORAGE_BUCKET" ]; then
        if gcloud storage buckets describe "gs://$STORAGE_BUCKET" --project="$PROJECT_ID" &>/dev/null; then
            record_pass "Storage bucket exists: $STORAGE_BUCKET"
        else
            record_fail "Storage bucket not found: $STORAGE_BUCKET"
        fi
    else
        record_fail "Storage bucket name not found in outputs"
    fi
}

# Check IAM service accounts
check_iam() {
    log_info "Checking IAM service accounts..."

    local accounts=(
        "fledgely-functions-sa"
        "fledgely-cloudrun-sa"
    )

    for account in "${accounts[@]}"; do
        if gcloud iam service-accounts list --project="$PROJECT_ID" --format="value(email)" | grep -q "$account"; then
            record_pass "Service account exists: $account"
        else
            record_fail "Service account not found: $account"
        fi
    done
}

# Check Firebase
check_firebase() {
    log_info "Checking Firebase..."

    # Check Firebase project
    if gcloud firebase projects describe "$PROJECT_ID" &>/dev/null; then
        record_pass "Firebase enabled for project"
    else
        record_warn "Firebase may not be enabled (check manually)"
    fi
}

# Print summary
print_summary() {
    echo ""
    echo "============================================"
    echo "    Verification Summary"
    echo "============================================"
    echo ""
    echo -e "${GREEN}Passed:${NC}  $PASS_COUNT"
    echo -e "${RED}Failed:${NC}  $FAIL_COUNT"
    echo -e "${YELLOW}Warnings:${NC} $WARN_COUNT"
    echo ""

    if [ $FAIL_COUNT -eq 0 ]; then
        log_success "All critical checks passed!"
        if [ $WARN_COUNT -gt 0 ]; then
            log_warn "Some warnings - review above for details"
        fi
        echo ""
        echo "Next steps:"
        echo "  1. Configure Firebase Auth in console"
        echo "  2. Deploy application code"
        echo "  3. Install Chrome extension"
        echo ""
        exit 0
    else
        log_error "Some checks failed - review above for details"
        echo ""
        echo "Troubleshooting:"
        echo "  - Check terraform apply completed successfully"
        echo "  - Review GCP Console for errors"
        echo "  - See terraform/docs/troubleshooting.md"
        echo ""
        exit 1
    fi
}

# Main function
main() {
    print_banner

    # Check we're in the terraform directory
    if [ ! -f "main.tf" ]; then
        log_error "Please run this script from the terraform directory"
        exit 1
    fi

    get_outputs

    check_apis
    check_firestore
    check_storage
    check_iam
    check_cloudrun
    check_functions
    check_firebase

    print_summary
}

main "$@"
