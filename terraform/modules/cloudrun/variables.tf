# Fledgely Terraform Module - Cloud Run Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for Cloud Run"
  type        = string
}

variable "memory" {
  description = "Memory allocation for Cloud Run service"
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU allocation for Cloud Run service"
  type        = string
  default     = "1"
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "concurrency" {
  description = "Maximum concurrent requests per Cloud Run instance"
  type        = number
  default     = 80
}

variable "source_path" {
  description = "Path to web application source code"
  type        = string
}

variable "service_account_email" {
  description = "Service account email for Cloud Run"
  type        = string
}

variable "functions_url" {
  description = "URL of the Cloud Functions API"
  type        = string
}

variable "storage_bucket" {
  description = "Cloud Storage bucket name for screenshots"
  type        = string
}

variable "custom_domain" {
  description = "Custom domain for the web application"
  type        = string
  default     = ""
}

variable "enable_ssl" {
  description = "Enable managed SSL certificate for custom domain"
  type        = bool
  default     = true
}

variable "environment_variables" {
  description = "Additional environment variables"
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "enable_ci_cd" {
  description = "Enable Cloud Build trigger for CI/CD"
  type        = bool
  default     = false
}

variable "github_owner" {
  description = "GitHub repository owner for Cloud Build trigger"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository name for Cloud Build trigger"
  type        = string
  default     = ""
}
