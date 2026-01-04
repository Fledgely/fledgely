# Fledgely Terraform Module - Cloud Run Outputs
# Apache 2.0 License

output "service_url" {
  description = "The URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.web.uri
}

output "service_name" {
  description = "The name of the Cloud Run service"
  value       = google_cloud_run_v2_service.web.name
}

output "service_id" {
  description = "The ID of the Cloud Run service"
  value       = google_cloud_run_v2_service.web.id
}

output "artifact_registry_url" {
  description = "The URL of the Artifact Registry repository"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web.repository_id}"
}

output "custom_domain_status" {
  description = "Status of the custom domain mapping"
  value       = var.custom_domain != "" ? google_cloud_run_domain_mapping.custom[0].status : null
}

output "dns_records" {
  description = "DNS records required for custom domain verification"
  value = var.custom_domain != "" ? [
    for rr in google_cloud_run_domain_mapping.custom[0].status[0].resource_records : {
      type  = rr.type
      name  = rr.name != "" ? rr.name : "@"
      value = rr.rrdata
    }
  ] : []
}
