# Fledgely Terraform Module - Input Variables
# Apache 2.0 License

# =============================================================================
# Required Variables
# =============================================================================

variable "project_id" {
  description = "The GCP project ID to deploy Fledgely into"
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with a letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "region" {
  description = "The GCP region for deployment (e.g., us-central1, europe-west1)"
  type        = string
  default     = "us-central1"

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]$", var.region))
    error_message = "Region must be a valid GCP region (e.g., us-central1, europe-west1)."
  }
}

# =============================================================================
# Optional Variables - General
# =============================================================================

variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "labels" {
  description = "Labels to apply to all resources for cost tracking"
  type        = map(string)
  default = {
    app        = "fledgely"
    managed-by = "terraform"
  }
}

variable "enable_apis" {
  description = "Whether to enable required GCP APIs automatically"
  type        = bool
  default     = true
}

# =============================================================================
# Firestore Configuration
# =============================================================================

variable "firestore_location" {
  description = "Firestore database location (must match region for consistency)"
  type        = string
  default     = "us-central1"
}

variable "firestore_deletion_protection" {
  description = "Enable deletion protection for Firestore database"
  type        = bool
  default     = true
}

# =============================================================================
# Cloud Storage Configuration
# =============================================================================

variable "storage_location" {
  description = "Cloud Storage bucket location (region or multi-region)"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Cloud Storage class (STANDARD, NEARLINE, COLDLINE, ARCHIVE)"
  type        = string
  default     = "STANDARD"

  validation {
    condition     = contains(["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"], var.storage_class)
    error_message = "Storage class must be one of: STANDARD, NEARLINE, COLDLINE, ARCHIVE."
  }
}

variable "screenshot_retention_days" {
  description = "Number of days to retain screenshots before deletion (0 = never delete)"
  type        = number
  default     = 90

  validation {
    condition     = var.screenshot_retention_days >= 0 && var.screenshot_retention_days <= 3650
    error_message = "Screenshot retention must be between 0 and 3650 days."
  }
}

# =============================================================================
# Cloud Functions Configuration
# =============================================================================

variable "functions_runtime" {
  description = "Node.js runtime for Cloud Functions"
  type        = string
  default     = "nodejs20"

  validation {
    condition     = can(regex("^nodejs[0-9]+$", var.functions_runtime))
    error_message = "Functions runtime must be a valid Node.js runtime (e.g., nodejs20)."
  }
}

variable "functions_memory" {
  description = "Memory allocation for Cloud Functions (in MB)"
  type        = number
  default     = 256

  validation {
    condition     = contains([128, 256, 512, 1024, 2048, 4096, 8192], var.functions_memory)
    error_message = "Functions memory must be one of: 128, 256, 512, 1024, 2048, 4096, 8192 MB."
  }
}

variable "functions_timeout" {
  description = "Timeout for Cloud Functions (in seconds)"
  type        = number
  default     = 60

  validation {
    condition     = var.functions_timeout >= 1 && var.functions_timeout <= 540
    error_message = "Functions timeout must be between 1 and 540 seconds."
  }
}

variable "functions_max_instances" {
  description = "Maximum number of Cloud Functions instances"
  type        = number
  default     = 100

  validation {
    condition     = var.functions_max_instances >= 1 && var.functions_max_instances <= 1000
    error_message = "Functions max instances must be between 1 and 1000."
  }
}

variable "functions_min_instances" {
  description = "Minimum number of Cloud Functions instances (0 = scale to zero)"
  type        = number
  default     = 0

  validation {
    condition     = var.functions_min_instances >= 0 && var.functions_min_instances <= 100
    error_message = "Functions min instances must be between 0 and 100."
  }
}

# =============================================================================
# Cloud Run Configuration (Web App)
# =============================================================================

variable "cloudrun_memory" {
  description = "Memory allocation for Cloud Run service"
  type        = string
  default     = "512Mi"

  validation {
    condition     = can(regex("^[0-9]+(Mi|Gi)$", var.cloudrun_memory))
    error_message = "Cloud Run memory must be specified in Mi or Gi (e.g., 512Mi, 1Gi)."
  }
}

variable "cloudrun_cpu" {
  description = "CPU allocation for Cloud Run service"
  type        = string
  default     = "1"

  validation {
    condition     = can(regex("^[0-9]+$", var.cloudrun_cpu))
    error_message = "Cloud Run CPU must be a number (e.g., 1, 2)."
  }
}

variable "cloudrun_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10

  validation {
    condition     = var.cloudrun_max_instances >= 1 && var.cloudrun_max_instances <= 1000
    error_message = "Cloud Run max instances must be between 1 and 1000."
  }
}

variable "cloudrun_min_instances" {
  description = "Minimum number of Cloud Run instances (0 = scale to zero)"
  type        = number
  default     = 0

  validation {
    condition     = var.cloudrun_min_instances >= 0 && var.cloudrun_min_instances <= 100
    error_message = "Cloud Run min instances must be between 0 and 100."
  }
}

variable "cloudrun_concurrency" {
  description = "Maximum concurrent requests per Cloud Run instance"
  type        = number
  default     = 80

  validation {
    condition     = var.cloudrun_concurrency >= 1 && var.cloudrun_concurrency <= 1000
    error_message = "Cloud Run concurrency must be between 1 and 1000."
  }
}

# =============================================================================
# Custom Domain Configuration
# =============================================================================

variable "custom_domain" {
  description = "Custom domain for the web application (optional)"
  type        = string
  default     = ""
}

variable "enable_ssl" {
  description = "Enable managed SSL certificate for custom domain"
  type        = bool
  default     = true
}

# =============================================================================
# Firebase Authentication Configuration
# =============================================================================

variable "enable_google_signin" {
  description = "Enable Google Sign-In for authentication"
  type        = bool
  default     = true
}

variable "authorized_domains" {
  description = "List of authorized domains for Firebase Auth"
  type        = list(string)
  default     = []
}

# =============================================================================
# Source Code Configuration
# =============================================================================

variable "functions_source_path" {
  description = "Path to Cloud Functions source code"
  type        = string
  default     = "../apps/functions"
}

variable "web_source_path" {
  description = "Path to web application source code"
  type        = string
  default     = "../apps/web"
}

variable "firestore_rules_path" {
  description = "Path to Firestore security rules"
  type        = string
  default     = "../packages/firebase-rules/firestore.rules"
}

variable "storage_rules_path" {
  description = "Path to Cloud Storage security rules"
  type        = string
  default     = "../packages/firebase-rules/storage.rules"
}

# =============================================================================
# CI/CD Configuration
# =============================================================================

variable "enable_ci_cd" {
  description = "Enable Cloud Build triggers and service accounts for CI/CD"
  type        = bool
  default     = false
}

variable "github_owner" {
  description = "GitHub repository owner for Cloud Build triggers"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository name for Cloud Build triggers"
  type        = string
  default     = "fledgely"
}
