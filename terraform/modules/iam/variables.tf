# Fledgely Terraform Module - IAM Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "enable_ci_cd" {
  description = "Enable Cloud Build service account for CI/CD"
  type        = bool
  default     = false
}

# Workload Identity variables (optional)
variable "k8s_namespace" {
  description = "Kubernetes namespace for Workload Identity"
  type        = string
  default     = ""
}

variable "k8s_service_account" {
  description = "Kubernetes service account name for Workload Identity"
  type        = string
  default     = ""
}
