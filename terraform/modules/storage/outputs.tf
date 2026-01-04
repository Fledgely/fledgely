# Fledgely Terraform Module - Cloud Storage Outputs
# Apache 2.0 License

output "bucket_name" {
  description = "The name of the screenshots storage bucket"
  value       = google_storage_bucket.screenshots.name
}

output "bucket_url" {
  description = "The URL of the screenshots storage bucket"
  value       = google_storage_bucket.screenshots.url
}

output "bucket_self_link" {
  description = "The self link of the screenshots storage bucket"
  value       = google_storage_bucket.screenshots.self_link
}

output "safety_docs_bucket_name" {
  description = "The name of the safety documents storage bucket"
  value       = google_storage_bucket.safety_documents.name
}

output "safety_docs_bucket_url" {
  description = "The URL of the safety documents storage bucket"
  value       = google_storage_bucket.safety_documents.url
}
