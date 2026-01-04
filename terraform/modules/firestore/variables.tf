# Fledgely Terraform Module - Firestore Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "location" {
  description = "Firestore database location"
  type        = string
  default     = "us-central1"
}

variable "deletion_protection" {
  description = "Enable deletion protection for the Firestore database"
  type        = bool
  default     = true
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery for Firestore"
  type        = bool
  default     = false
}

variable "firestore_rules_path" {
  description = "Path to Firestore security rules file"
  type        = string
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "enable_daily_backup" {
  description = "Enable daily Firestore backups"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain Firestore backups"
  type        = number
  default     = 7
}
