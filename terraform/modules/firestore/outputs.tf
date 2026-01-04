# Fledgely Terraform Module - Firestore Outputs
# Apache 2.0 License

output "database_name" {
  description = "The name of the Firestore database"
  value       = google_firestore_database.main.name
}

output "database_location" {
  description = "The location of the Firestore database"
  value       = google_firestore_database.main.location_id
}

output "database_id" {
  description = "The ID of the Firestore database"
  value       = google_firestore_database.main.id
}

output "rules_version" {
  description = "The version of the deployed Firestore rules"
  value       = google_firebaserules_ruleset.firestore.name
}
