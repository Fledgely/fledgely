# Fledgely Terraform Module - IAM Outputs
# Apache 2.0 License

output "functions_service_account_email" {
  description = "The email of the Cloud Functions service account"
  value       = google_service_account.functions.email
}

output "functions_service_account_name" {
  description = "The name of the Cloud Functions service account"
  value       = google_service_account.functions.name
}

output "cloudrun_service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = google_service_account.cloudrun.email
}

output "cloudrun_service_account_name" {
  description = "The name of the Cloud Run service account"
  value       = google_service_account.cloudrun.name
}

output "cloudbuild_service_account_email" {
  description = "The email of the Cloud Build service account (if enabled)"
  value       = var.enable_ci_cd ? google_service_account.cloudbuild[0].email : null
}
