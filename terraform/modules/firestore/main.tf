# Fledgely Terraform Module - Firestore
# Apache 2.0 License

# =============================================================================
# Firestore Database
# =============================================================================

resource "google_firestore_database" "main" {
  project                           = var.project_id
  name                              = "(default)"
  location_id                       = var.location
  type                              = "FIRESTORE_NATIVE"
  concurrency_mode                  = "OPTIMISTIC"
  app_engine_integration_mode       = "DISABLED"
  point_in_time_recovery_enablement = var.point_in_time_recovery ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  delete_protection_state           = var.deletion_protection ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"

  # Note: Labels are not currently supported on google_firestore_database
}

# =============================================================================
# Firestore Security Rules
# =============================================================================

resource "google_firebaserules_ruleset" "firestore" {
  project = var.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file(var.firestore_rules_path)
    }
  }

  depends_on = [google_firestore_database.main]
}

resource "google_firebaserules_release" "firestore" {
  project      = var.project_id
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name

  depends_on = [google_firebaserules_ruleset.firestore]
}

# =============================================================================
# Firestore Indexes
# =============================================================================

# Note: Firestore indexes can be deployed via firebase CLI or terraform.
# For complex index requirements, consider using firebase deploy --only firestore:indexes
#
# Example index resource:
# resource "google_firestore_index" "screenshots_by_timestamp" {
#   project     = var.project_id
#   database    = google_firestore_database.main.name
#   collection  = "screenshots"
#
#   fields {
#     field_path = "childId"
#     order      = "ASCENDING"
#   }
#
#   fields {
#     field_path = "capturedAt"
#     order      = "DESCENDING"
#   }
# }

# =============================================================================
# Firestore Backup Schedule (Optional)
# =============================================================================

resource "google_firestore_backup_schedule" "daily" {
  count = var.enable_daily_backup ? 1 : 0

  project  = var.project_id
  database = google_firestore_database.main.name

  retention = "${var.backup_retention_days * 24 * 60 * 60}s"

  daily_recurrence {}
}
