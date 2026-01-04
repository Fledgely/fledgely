# Fledgely Terraform Module - Cloud Storage Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "location" {
  description = "Cloud Storage bucket location (region or multi-region)"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Cloud Storage class"
  type        = string
  default     = "STANDARD"
}

variable "retention_days" {
  description = "Number of days to retain screenshots (0 = never delete)"
  type        = number
  default     = 90
}

variable "enable_versioning" {
  description = "Enable object versioning for data protection"
  type        = bool
  default     = false
}

variable "cors_origins" {
  description = "List of origins allowed for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "storage_rules_path" {
  description = "Path to Cloud Storage security rules file"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "safety_docs_retention_days" {
  description = "Retention period for safety documents in days (0 = no retention policy)"
  type        = number
  default     = 0
}

variable "archive_after_days" {
  description = "Move screenshots to NEARLINE storage after this many days (0 = disabled)"
  type        = number
  default     = 30
}

variable "noncurrent_version_retention_days" {
  description = "Days to retain non-current versions before deletion"
  type        = number
  default     = 7
}
