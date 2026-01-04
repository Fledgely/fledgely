# Fledgely Terraform Module - Billing Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "project_number" {
  description = "The GCP project number"
  type        = string
}

variable "billing_account" {
  description = "The billing account ID (e.g., 01XXXX-XXXXXX-XXXXXX)"
  type        = string
  default     = ""
}

variable "enable_budget_alert" {
  description = "Enable budget alert monitoring"
  type        = bool
  default     = false
}

variable "monthly_budget" {
  description = "Monthly budget in USD"
  type        = number
  default     = 50

  validation {
    condition     = var.monthly_budget > 0
    error_message = "Monthly budget must be greater than 0"
  }
}

variable "notification_channels" {
  description = "List of monitoring notification channel IDs"
  type        = list(string)
  default     = []
}

variable "notify_billing_admins" {
  description = "Send notifications to billing account admins"
  type        = bool
  default     = true
}

variable "pubsub_topic" {
  description = "Pub/Sub topic for budget alerts (optional)"
  type        = string
  default     = ""
}
