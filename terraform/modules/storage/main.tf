# Fledgely Terraform Module - Cloud Storage
# Apache 2.0 License

# =============================================================================
# Random Suffix for Bucket Name Uniqueness
# =============================================================================

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# =============================================================================
# Cloud Storage Bucket for Screenshots
# =============================================================================

resource "google_storage_bucket" "screenshots" {
  project                     = var.project_id
  name                        = "${var.project_id}-screenshots-${random_id.bucket_suffix.hex}"
  location                    = var.location
  storage_class               = var.storage_class
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Versioning for data protection
  versioning {
    enabled = var.enable_versioning
  }

  # Lifecycle rules for automatic cleanup
  dynamic "lifecycle_rule" {
    for_each = var.retention_days > 0 ? [1] : []
    content {
      condition {
        age = var.retention_days
      }
      action {
        type = "Delete"
      }
    }
  }

  # Delete non-current versions after 7 days
  dynamic "lifecycle_rule" {
    for_each = var.enable_versioning ? [1] : []
    content {
      condition {
        num_newer_versions         = 1
        days_since_noncurrent_time = 7
      }
      action {
        type = "Delete"
      }
    }
  }

  # CORS configuration for web access
  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "Content-Disposition"]
    max_age_seconds = 3600
  }

  labels = var.labels
}

# =============================================================================
# Firebase Storage Rules
# =============================================================================

resource "google_firebaserules_ruleset" "storage" {
  project = var.project_id
  source {
    files {
      name    = "storage.rules"
      content = file(var.storage_rules_path)
    }
  }
}

resource "google_firebaserules_release" "storage" {
  project      = var.project_id
  name         = "firebase.storage/${google_storage_bucket.screenshots.name}"
  ruleset_name = google_firebaserules_ruleset.storage.name

  depends_on = [
    google_firebaserules_ruleset.storage,
    google_storage_bucket.screenshots,
  ]
}

# =============================================================================
# Safety Documents Bucket (Isolated)
# =============================================================================

resource "google_storage_bucket" "safety_documents" {
  project                     = var.project_id
  name                        = "${var.project_id}-safety-docs-${random_id.bucket_suffix.hex}"
  location                    = var.location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  # Versioning for legal compliance
  versioning {
    enabled = true
  }

  # No lifecycle deletion - safety documents are retained indefinitely
  # for legal/compliance purposes

  # Retention policy for legal hold (optional)
  dynamic "retention_policy" {
    for_each = var.safety_docs_retention_days > 0 ? [1] : []
    content {
      is_locked        = false
      retention_period = var.safety_docs_retention_days * 24 * 60 * 60
    }
  }

  labels = merge(var.labels, {
    type = "safety-critical"
  })
}
