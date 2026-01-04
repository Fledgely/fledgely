# Fledgely Terraform Module - Backup Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "location" {
  description = "Storage bucket location"
  type        = string
  default     = "US"
}

variable "retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30

  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 365
    error_message = "Retention days must be between 1 and 365"
  }
}

variable "enable_scheduled_backup" {
  description = "Enable scheduled daily backups"
  type        = bool
  default     = true
}

variable "backup_schedule" {
  description = "Cron schedule for backups (default: 2 AM UTC)"
  type        = string
  default     = "0 2 * * *"
}

variable "backup_timezone" {
  description = "Timezone for backup schedule"
  type        = string
  default     = "UTC"
}

variable "backup_function_url" {
  description = "URL of the backup Cloud Function"
  type        = string
  default     = ""
}

variable "backup_service_account" {
  description = "Service account email for backup operations"
  type        = string
}

variable "scheduler_service_account" {
  description = "Service account email for Cloud Scheduler"
  type        = string
}

variable "enable_notifications" {
  description = "Enable Pub/Sub notifications for backup events"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
