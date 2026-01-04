# Fledgely Terraform Module - IAM
# Apache 2.0 License

# =============================================================================
# Service Accounts
# =============================================================================

# Cloud Functions Service Account
resource "google_service_account" "functions" {
  project      = var.project_id
  account_id   = "fledgely-functions-sa"
  display_name = "Fledgely Cloud Functions Service Account"
  description  = "Service account for Fledgely Cloud Functions API backend"
}

# Cloud Run Service Account
resource "google_service_account" "cloudrun" {
  project      = var.project_id
  account_id   = "fledgely-cloudrun-sa"
  display_name = "Fledgely Cloud Run Service Account"
  description  = "Service account for Fledgely Next.js web application"
}

# =============================================================================
# Cloud Functions IAM Roles
# =============================================================================

# Firestore Admin - read/write all Firestore data
resource "google_project_iam_member" "functions_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Cloud Storage Admin - read/write storage objects
resource "google_project_iam_member" "functions_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Firebase Auth Admin - manage user authentication
resource "google_project_iam_member" "functions_firebase_auth" {
  project = var.project_id
  role    = "roles/firebaseauth.admin"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Secret Manager Access - read secrets
resource "google_project_iam_member" "functions_secret_manager" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Cloud Trace Writer - for observability
resource "google_project_iam_member" "functions_trace" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Cloud Logging Writer - for logging
resource "google_project_iam_member" "functions_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# Pub/Sub Publisher - for scheduled tasks
resource "google_project_iam_member" "functions_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.functions.email}"
}

# =============================================================================
# Cloud Run IAM Roles
# =============================================================================

# Firestore Viewer - read-only access (most writes go through Functions)
resource "google_project_iam_member" "cloudrun_firestore" {
  project = var.project_id
  role    = "roles/datastore.viewer"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud Storage Viewer - read-only access for serving images
resource "google_project_iam_member" "cloudrun_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Secret Manager Access - read secrets
resource "google_project_iam_member" "cloudrun_secret_manager" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud Trace Writer - for observability
resource "google_project_iam_member" "cloudrun_trace" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# Cloud Logging Writer - for logging
resource "google_project_iam_member" "cloudrun_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloudrun.email}"
}

# =============================================================================
# Workload Identity (Optional)
# =============================================================================

# For Kubernetes workloads or external identity federation
# Uncomment and configure as needed
#
# resource "google_service_account_iam_binding" "workload_identity" {
#   service_account_id = google_service_account.functions.name
#   role               = "roles/iam.workloadIdentityUser"
#
#   members = [
#     "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${var.k8s_service_account}]"
#   ]
# }

# =============================================================================
# Cloud Build Service Account (for CI/CD)
# =============================================================================

resource "google_service_account" "cloudbuild" {
  count = var.enable_ci_cd ? 1 : 0

  project      = var.project_id
  account_id   = "fledgely-cloudbuild-sa"
  display_name = "Fledgely Cloud Build Service Account"
  description  = "Service account for Fledgely CI/CD pipeline"
}

# Cloud Build needs to deploy to Cloud Run
resource "google_project_iam_member" "cloudbuild_run_admin" {
  count = var.enable_ci_cd ? 1 : 0

  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild[0].email}"
}

# Cloud Build needs to push to Artifact Registry
resource "google_project_iam_member" "cloudbuild_artifact_registry" {
  count = var.enable_ci_cd ? 1 : 0

  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloudbuild[0].email}"
}

# Cloud Build needs to deploy Cloud Functions
resource "google_project_iam_member" "cloudbuild_functions_admin" {
  count = var.enable_ci_cd ? 1 : 0

  project = var.project_id
  role    = "roles/cloudfunctions.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild[0].email}"
}

# Cloud Build needs to act as the service accounts
resource "google_service_account_iam_member" "cloudbuild_act_as_functions" {
  count = var.enable_ci_cd ? 1 : 0

  service_account_id = google_service_account.functions.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cloudbuild[0].email}"
}

resource "google_service_account_iam_member" "cloudbuild_act_as_cloudrun" {
  count = var.enable_ci_cd ? 1 : 0

  service_account_id = google_service_account.cloudrun.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cloudbuild[0].email}"
}
