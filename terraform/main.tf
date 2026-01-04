# Fledgely Terraform Module - Root Module
# Apache 2.0 License
#
# This module deploys the complete Fledgely infrastructure to GCP:
# - Firestore database
# - Cloud Storage bucket for screenshots
# - Cloud Functions for API
# - Cloud Run for web application
# - IAM service accounts and permissions

# =============================================================================
# Provider Configuration
# =============================================================================

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# =============================================================================
# Local Values
# =============================================================================

locals {
  # Required GCP APIs for Fledgely
  required_apis = [
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "firestore.googleapis.com",
    "storage.googleapis.com",
    "firebase.googleapis.com",
    "identitytoolkit.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "compute.googleapis.com",
    "artifactregistry.googleapis.com",
    "pubsub.googleapis.com",
    "cloudscheduler.googleapis.com",
    "firebaserules.googleapis.com",
  ]

  # Common labels for all resources
  common_labels = merge(var.labels, {
    environment = var.environment
  })
}

# =============================================================================
# Data Sources
# =============================================================================

data "google_project" "current" {
  project_id = var.project_id
}

# =============================================================================
# Enable Required APIs
# =============================================================================

resource "google_project_service" "required_apis" {
  for_each = var.enable_apis ? toset(local.required_apis) : toset([])

  project = var.project_id
  service = each.value

  disable_on_destroy         = false
  disable_dependent_services = false
}

# =============================================================================
# Child Modules
# =============================================================================

# IAM Module - Service accounts and permissions
module "iam" {
  source = "./modules/iam"

  project_id   = var.project_id
  environment  = var.environment
  labels       = local.common_labels
  enable_ci_cd = var.enable_ci_cd

  depends_on = [google_project_service.required_apis]
}

# Firestore Module - Database
module "firestore" {
  source = "./modules/firestore"

  project_id           = var.project_id
  location             = var.firestore_location
  deletion_protection  = var.firestore_deletion_protection
  firestore_rules_path = var.firestore_rules_path
  labels               = local.common_labels

  depends_on = [google_project_service.required_apis]
}

# Storage Module - Screenshot storage
module "storage" {
  source = "./modules/storage"

  project_id         = var.project_id
  location           = var.storage_location
  storage_class      = var.storage_class
  retention_days     = var.screenshot_retention_days
  storage_rules_path = var.storage_rules_path
  labels             = local.common_labels

  depends_on = [google_project_service.required_apis]
}

# Functions Module - API backend
module "functions" {
  source = "./modules/functions"

  project_id            = var.project_id
  region                = var.region
  runtime               = var.functions_runtime
  memory                = var.functions_memory
  timeout               = var.functions_timeout
  max_instances         = var.functions_max_instances
  min_instances         = var.functions_min_instances
  source_path           = var.functions_source_path
  service_account_email = module.iam.functions_service_account_email
  storage_bucket        = module.storage.bucket_name
  labels                = local.common_labels

  depends_on = [
    google_project_service.required_apis,
    module.iam,
    module.storage,
    module.firestore,
  ]
}

# Cloud Run Module - Web application
module "cloudrun" {
  source = "./modules/cloudrun"

  project_id            = var.project_id
  region                = var.region
  memory                = var.cloudrun_memory
  cpu                   = var.cloudrun_cpu
  max_instances         = var.cloudrun_max_instances
  min_instances         = var.cloudrun_min_instances
  concurrency           = var.cloudrun_concurrency
  source_path           = var.web_source_path
  service_account_email = module.iam.cloudrun_service_account_email
  custom_domain         = var.custom_domain
  enable_ssl            = var.enable_ssl
  functions_url         = module.functions.functions_url
  storage_bucket        = module.storage.bucket_name
  labels                = local.common_labels
  enable_ci_cd          = var.enable_ci_cd
  github_owner          = var.github_owner
  github_repo           = var.github_repo

  depends_on = [
    google_project_service.required_apis,
    module.iam,
    module.functions,
  ]
}

# Firebase Module - Firebase project and authentication
module "firebase" {
  source = "./modules/firebase"

  project_id         = var.project_id
  authorized_domains = var.authorized_domains

  api_depends_on = google_project_service.required_apis

  depends_on = [google_project_service.required_apis]
}

# Billing Module - Budget alerts (Optional)
module "billing" {
  source = "./modules/billing"

  project_id            = var.project_id
  project_number        = data.google_project.current.number
  billing_account       = var.billing_account
  enable_budget_alert   = var.enable_budget_alert
  monthly_budget        = var.monthly_budget
  notification_channels = var.budget_notification_channels
  notify_billing_admins = var.notify_billing_admins
}
