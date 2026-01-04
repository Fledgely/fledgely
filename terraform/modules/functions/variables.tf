# Fledgely Terraform Module - Cloud Functions Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for Cloud Functions"
  type        = string
}

variable "runtime" {
  description = "Node.js runtime for Cloud Functions"
  type        = string
  default     = "nodejs20"
}

variable "memory" {
  description = "Memory allocation for Cloud Functions (in MB)"
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Timeout for Cloud Functions (in seconds)"
  type        = number
  default     = 60
}

variable "max_instances" {
  description = "Maximum number of Cloud Functions instances"
  type        = number
  default     = 100
}

variable "min_instances" {
  description = "Minimum number of Cloud Functions instances"
  type        = number
  default     = 0
}

variable "source_path" {
  description = "Path to Cloud Functions source code"
  type        = string
}

variable "service_account_email" {
  description = "Service account email for Cloud Functions"
  type        = string
}

variable "storage_bucket" {
  description = "Cloud Storage bucket for screenshots"
  type        = string
}

variable "environment_variables" {
  description = "Additional environment variables for Cloud Functions"
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
