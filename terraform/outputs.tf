# Fledgely Terraform Module - Outputs
# Apache 2.0 License

# =============================================================================
# Project Information
# =============================================================================

output "project_id" {
  description = "The GCP project ID"
  value       = var.project_id
}

output "region" {
  description = "The deployment region"
  value       = var.region
}

output "environment" {
  description = "The deployment environment"
  value       = var.environment
}

# =============================================================================
# Web Application URLs
# =============================================================================

output "web_app_url" {
  description = "The URL of the deployed web application"
  value       = module.cloudrun.service_url
}

output "custom_domain_url" {
  description = "The custom domain URL (if configured)"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : null
}

output "custom_domain_dns_records" {
  description = "DNS records to add for custom domain verification"
  value       = module.cloudrun.dns_records
}

# =============================================================================
# API Endpoints
# =============================================================================

output "functions_url" {
  description = "The base URL for Cloud Functions"
  value       = module.functions.functions_url
}

# =============================================================================
# Storage Information
# =============================================================================

output "storage_bucket_name" {
  description = "The name of the Cloud Storage bucket for screenshots"
  value       = module.storage.bucket_name
}

output "storage_bucket_url" {
  description = "The URL of the Cloud Storage bucket"
  value       = module.storage.bucket_url
}

# =============================================================================
# Database Information
# =============================================================================

output "firestore_database_name" {
  description = "The name of the Firestore database"
  value       = module.firestore.database_name
}

output "firestore_location" {
  description = "The location of the Firestore database"
  value       = module.firestore.database_location
}

# =============================================================================
# Service Accounts
# =============================================================================

output "functions_service_account" {
  description = "The service account email for Cloud Functions"
  value       = module.iam.functions_service_account_email
}

output "cloudrun_service_account" {
  description = "The service account email for Cloud Run"
  value       = module.iam.cloudrun_service_account_email
}

# =============================================================================
# Enabled APIs
# =============================================================================

output "enabled_apis" {
  description = "List of GCP APIs that were enabled"
  value       = var.enable_apis ? local.required_apis : []
}

# =============================================================================
# Cost Information
# =============================================================================

output "estimated_monthly_cost" {
  description = "Estimated monthly cost range for this deployment"
  value       = "$30-115/month (varies based on usage)"
}

# =============================================================================
# Backup Information
# =============================================================================

output "backup_bucket_name" {
  description = "The name of the backup storage bucket"
  value       = module.backup.backup_bucket_name
}

output "backup_schedule" {
  description = "The backup schedule (if enabled)"
  value       = var.enable_scheduled_backup ? var.backup_schedule : "Disabled"
}

output "backup_retention_days" {
  description = "Backup retention period in days"
  value       = var.backup_retention_days
}

# =============================================================================
# Connection Information (for extension/app configuration)
# =============================================================================

output "firebase_config" {
  description = "Firebase configuration for client applications"
  value       = module.firebase.firebase_config
  sensitive   = true
}

output "deployment_summary" {
  description = "Summary of the deployed infrastructure"
  value = {
    web_url        = module.cloudrun.service_url
    api_url        = module.functions.functions_url
    storage_bucket = module.storage.bucket_name
    firestore_db   = module.firestore.database_name
    region         = var.region
    environment    = var.environment
    estimated_cost = "$30-115/month"
  }
}

# =============================================================================
# Next Steps (Story 48-2)
# =============================================================================

output "next_steps" {
  description = "Next steps after deployment"
  value       = <<-EOT

  ============================================
  Fledgely Deployment Complete!
  ============================================

  Your infrastructure is now deployed. Follow these steps to complete setup:

  1. CONFIGURE FIREBASE AUTH (Required)
     ----------------------------------------
     Visit: https://console.firebase.google.com/project/${var.project_id}/authentication/providers

     - Click 'Get started' (if new project)
     - Enable 'Google' sign-in provider
     - Set project support email
     - Click 'Save'

  2. GET FIREBASE CONFIG (Required for Extension)
     ----------------------------------------
     Run: terraform output -json firebase_config

     Copy these values to your extension/app configuration:
     - apiKey
     - authDomain
     - projectId
     - storageBucket
     - messagingSenderId
     - appId

  3. DEPLOY APPLICATION CODE
     ----------------------------------------
     # Build and deploy Cloud Functions
     cd apps/functions
     npm run deploy

     # Build and deploy web application
     cd apps/web
     npm run build
     # Push to Cloud Run via CI/CD or manual docker push

  4. VERIFY DEPLOYMENT
     ----------------------------------------
     Run the verification script:
     ./scripts/verify.sh

     Or manually check:
     - Web App: ${module.cloudrun.service_url}
     - API Health: ${module.functions.functions_url}/health
     - Firebase Console: https://console.firebase.google.com/project/${var.project_id}

  5. INSTALL CHROME EXTENSION
     ----------------------------------------
     - Build extension: cd apps/extension && npm run build
     - Load unpacked in chrome://extensions
     - Configure with your Firebase project

  ============================================
  Useful Links
  ============================================

  - GCP Console: https://console.cloud.google.com/home/dashboard?project=${var.project_id}
  - Firebase Console: https://console.firebase.google.com/project/${var.project_id}
  - Cloud Run: https://console.cloud.google.com/run?project=${var.project_id}
  - Firestore: https://console.cloud.google.com/firestore?project=${var.project_id}
  - Cloud Storage: https://console.cloud.google.com/storage?project=${var.project_id}
  - Billing: https://console.cloud.google.com/billing?project=${var.project_id}

  EOT
}

# =============================================================================
# Verification Commands (Story 48-2)
# =============================================================================

output "verification_commands" {
  description = "Commands to verify the deployment"
  value       = <<-EOT

  # Verify Cloud Run is accessible
  curl -s ${module.cloudrun.service_url}/api/health | jq .

  # Verify Cloud Functions
  curl -s ${module.functions.functions_url}/health | jq .

  # Check Firestore connection
  gcloud firestore databases list --project=${var.project_id}

  # Check Storage bucket
  gcloud storage ls gs://${module.storage.bucket_name}

  # View service accounts
  gcloud iam service-accounts list --project=${var.project_id} | grep fledgely

  # Check Cloud Run logs
  gcloud logging read "resource.type=cloud_run_revision" --project=${var.project_id} --limit=10

  # Check Functions logs
  gcloud logging read "resource.type=cloud_function" --project=${var.project_id} --limit=10

  EOT
}
