# Fledgely Terraform Module - Cloud Functions Outputs
# Apache 2.0 License

output "functions_url" {
  description = "The URL of the main API Cloud Function"
  value       = google_cloudfunctions2_function.api.service_config[0].uri
}

output "api_function_name" {
  description = "The name of the API Cloud Function"
  value       = google_cloudfunctions2_function.api.name
}

output "cleanup_function_name" {
  description = "The name of the scheduled cleanup function"
  value       = google_cloudfunctions2_function.scheduled_cleanup.name
}

output "source_bucket_name" {
  description = "The name of the function source code bucket"
  value       = google_storage_bucket.function_source.name
}

output "scheduled_tasks_topic" {
  description = "The Pub/Sub topic for scheduled tasks"
  value       = google_pubsub_topic.scheduled_tasks.id
}
