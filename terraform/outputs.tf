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
# Connection Information (for extension/app configuration)
# =============================================================================

output "firebase_config" {
  description = "Firebase configuration for client applications"
  value = {
    projectId         = var.project_id
    storageBucket     = module.storage.bucket_name
    authDomain        = "${var.project_id}.firebaseapp.com"
    messagingSenderId = "" # Will need to be obtained from Firebase console
    appId             = "" # Will need to be obtained from Firebase console
  }
  sensitive = false
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
