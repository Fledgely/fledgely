# Fledgely Terraform Module - Firebase Variables
# Apache 2.0 License

variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "authorized_domains" {
  description = "Additional authorized domains for Firebase Auth"
  type        = list(string)
  default     = []
}

variable "api_depends_on" {
  description = "Resource dependencies for API enablement"
  type        = any
  default     = null
}
