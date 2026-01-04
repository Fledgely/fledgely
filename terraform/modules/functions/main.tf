# Fledgely Terraform Module - Cloud Functions
# Apache 2.0 License

# =============================================================================
# Cloud Storage Bucket for Function Source Code
# =============================================================================

resource "random_id" "source_suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "function_source" {
  project                     = var.project_id
  name                        = "${var.project_id}-functions-source-${random_id.source_suffix.hex}"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Auto-delete old source archives after 30 days
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }

  labels = var.labels
}

# =============================================================================
# Archive Function Source Code
# =============================================================================

data "archive_file" "function_source" {
  type        = "zip"
  source_dir  = var.source_path
  output_path = "${path.module}/tmp/functions-source.zip"
  excludes    = ["node_modules", "dist", ".git", "*.test.ts", "*.spec.ts"]
}

resource "google_storage_bucket_object" "function_source" {
  name   = "functions-${data.archive_file.function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_source.name
  source = data.archive_file.function_source.output_path
}

# =============================================================================
# Cloud Functions (Gen 2)
# =============================================================================

# Main API Function
resource "google_cloudfunctions2_function" "api" {
  project     = var.project_id
  name        = "fledgely-api"
  location    = var.region
  description = "Fledgely API - main Cloud Functions backend"

  build_config {
    runtime     = var.runtime
    entry_point = "api"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count    = var.max_instances
    min_instance_count    = var.min_instances
    available_memory      = "${var.memory}M"
    timeout_seconds       = var.timeout
    service_account_email = var.service_account_email

    environment_variables = merge({
      STORAGE_BUCKET = var.storage_bucket
      PROJECT_ID     = var.project_id
      NODE_ENV       = "production"
    }, var.environment_variables)

    ingress_settings               = "ALLOW_ALL"
    all_traffic_on_latest_revision = true
  }

  labels = var.labels
}

# Allow unauthenticated access to API (authentication handled by Firebase Auth)
resource "google_cloud_run_service_iam_member" "api_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloudfunctions2_function.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [google_cloudfunctions2_function.api]
}

# =============================================================================
# Scheduled Functions (Pub/Sub Triggered)
# =============================================================================

# Pub/Sub topic for scheduled tasks
resource "google_pubsub_topic" "scheduled_tasks" {
  project = var.project_id
  name    = "fledgely-scheduled-tasks"

  labels = var.labels
}

# Cloud Scheduler for periodic tasks
resource "google_cloud_scheduler_job" "daily_cleanup" {
  project     = var.project_id
  name        = "fledgely-daily-cleanup"
  description = "Daily cleanup of expired data"
  schedule    = "0 3 * * *" # 3 AM daily
  time_zone   = "UTC"
  region      = var.region

  pubsub_target {
    topic_name = google_pubsub_topic.scheduled_tasks.id
    data       = base64encode("{\"task\": \"dailyCleanup\"}")
  }
}

# Scheduled cleanup function
resource "google_cloudfunctions2_function" "scheduled_cleanup" {
  project     = var.project_id
  name        = "fledgely-scheduled-cleanup"
  location    = var.region
  description = "Fledgely scheduled cleanup tasks"

  build_config {
    runtime     = var.runtime
    entry_point = "scheduledCleanup"

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count    = 1
    min_instance_count    = 0
    available_memory      = "256M"
    timeout_seconds       = 540
    service_account_email = var.service_account_email

    environment_variables = {
      STORAGE_BUCKET = var.storage_bucket
      PROJECT_ID     = var.project_id
      NODE_ENV       = "production"
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.scheduled_tasks.id
    retry_policy   = "RETRY_POLICY_RETRY"
  }

  labels = var.labels
}

# =============================================================================
# Firestore Triggers (Optional)
# =============================================================================

# Example: Screenshot upload trigger
# Uncomment and customize as needed
#
# resource "google_cloudfunctions2_function" "screenshot_processor" {
#   project     = var.project_id
#   name        = "fledgely-screenshot-processor"
#   location    = var.region
#   description = "Process uploaded screenshots"
#
#   build_config {
#     runtime     = var.runtime
#     entry_point = "processScreenshot"
#
#     source {
#       storage_source {
#         bucket = google_storage_bucket.function_source.name
#         object = google_storage_bucket_object.function_source.name
#       }
#     }
#   }
#
#   service_config {
#     max_instance_count    = var.max_instances
#     min_instance_count    = 0
#     available_memory      = "${var.memory}M"
#     timeout_seconds       = var.timeout
#     service_account_email = var.service_account_email
#   }
#
#   event_trigger {
#     trigger_region        = var.region
#     event_type            = "google.cloud.firestore.document.v1.created"
#     event_filters {
#       attribute = "database"
#       value     = "(default)"
#     }
#     event_filters {
#       attribute = "document"
#       value     = "children/{childId}/screenshots/{screenshotId}"
#       operator  = "match-path-pattern"
#     }
#     retry_policy = "RETRY_POLICY_RETRY"
#   }
#
#   labels = var.labels
# }
