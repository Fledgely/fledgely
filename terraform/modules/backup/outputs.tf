# Fledgely Terraform Module - Backup Outputs
# Apache 2.0 License

output "backup_bucket_name" {
  description = "The name of the backup storage bucket"
  value       = google_storage_bucket.backups.name
}

output "backup_bucket_url" {
  description = "The URL of the backup storage bucket"
  value       = google_storage_bucket.backups.url
}

output "scheduler_job_name" {
  description = "The name of the Cloud Scheduler job"
  value       = var.enable_scheduled_backup ? google_cloud_scheduler_job.firestore_backup[0].name : null
}

output "notification_topic" {
  description = "The Pub/Sub topic for backup notifications"
  value       = var.enable_notifications ? google_pubsub_topic.backup_notifications[0].name : null
}

output "retention_days" {
  description = "Configured backup retention in days"
  value       = var.retention_days
}
