# Fledgely Terraform Module - Cloud Run (Web App)
# Apache 2.0 License

# =============================================================================
# Artifact Registry Repository
# =============================================================================

resource "google_artifact_registry_repository" "web" {
  project       = var.project_id
  location      = var.region
  repository_id = "fledgely-web"
  description   = "Fledgely web application container images"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 5
    }
  }

  labels = var.labels
}

# =============================================================================
# Cloud Run Service
# =============================================================================

resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  name     = "fledgely-web"
  location = var.region

  template {
    service_account = var.service_account_email

    scaling {
      max_instance_count = var.max_instances
      min_instance_count = var.min_instances
    }

    containers {
      # Initial placeholder image - replaced by CI/CD pipeline
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle = var.min_instances == 0 ? true : false
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = var.functions_url
      }

      env {
        name  = "NEXT_PUBLIC_STORAGE_BUCKET"
        value = var.storage_bucket
      }

      env {
        name  = "NEXT_PUBLIC_PROJECT_ID"
        value = var.project_id
      }

      # Dynamic environment variables
      dynamic "env" {
        for_each = var.environment_variables
        content {
          name  = env.key
          value = env.value
        }
      }

      ports {
        container_port = 3000
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 5
        timeout_seconds       = 3
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 10
        timeout_seconds       = 3
        period_seconds        = 30
        failure_threshold     = 3
      }
    }

    max_instance_request_concurrency = var.concurrency
    timeout                          = "300s"
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  labels = var.labels

  lifecycle {
    # Ignore changes to image - managed by CI/CD pipeline
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Allow unauthenticated access to web app
resource "google_cloud_run_v2_service_iam_member" "web_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# =============================================================================
# Custom Domain (Optional)
# =============================================================================

resource "google_cloud_run_domain_mapping" "custom" {
  count = var.custom_domain != "" ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = var.custom_domain

  metadata {
    namespace = var.project_id
    labels    = var.labels
  }

  spec {
    route_name = google_cloud_run_v2_service.web.name
  }
}

# =============================================================================
# Cloud Build Trigger (Optional)
# =============================================================================

# Trigger for building and deploying on push to main branch
resource "google_cloudbuild_trigger" "web_deploy" {
  count = var.enable_ci_cd ? 1 : 0

  project  = var.project_id
  name     = "fledgely-web-deploy"
  location = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = "^main$"
    }
  }

  included_files = ["apps/web/**"]

  build {
    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "build",
        "-t", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web.repository_id}/web:$COMMIT_SHA",
        "-f", "apps/web/Dockerfile",
        ".",
      ]
    }

    step {
      name = "gcr.io/cloud-builders/docker"
      args = [
        "push",
        "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web.repository_id}/web:$COMMIT_SHA",
      ]
    }

    step {
      name = "gcr.io/cloud-builders/gcloud"
      args = [
        "run", "deploy", google_cloud_run_v2_service.web.name,
        "--image", "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web.repository_id}/web:$COMMIT_SHA",
        "--region", var.region,
        "--platform", "managed",
      ]
    }

    images = [
      "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.web.repository_id}/web:$COMMIT_SHA",
    ]
  }
}
