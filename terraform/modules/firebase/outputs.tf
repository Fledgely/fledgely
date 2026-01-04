# Fledgely Terraform Module - Firebase Outputs
# Apache 2.0 License

output "firebase_project_id" {
  description = "The Firebase project ID"
  value       = google_firebase_project.default.project
}

output "web_app_id" {
  description = "The Firebase Web App ID"
  value       = google_firebase_web_app.web.app_id
}

output "firebase_config" {
  description = "Firebase configuration for client applications"
  value = {
    apiKey            = data.google_firebase_web_app_config.web.api_key
    authDomain        = "${var.project_id}.firebaseapp.com"
    projectId         = var.project_id
    storageBucket     = data.google_firebase_web_app_config.web.storage_bucket
    messagingSenderId = data.google_firebase_web_app_config.web.messaging_sender_id
    appId             = google_firebase_web_app.web.app_id
  }
  sensitive = true
}

output "authorized_domains" {
  description = "List of authorized domains for Firebase Auth"
  value       = google_identity_platform_config.default.authorized_domains
}
