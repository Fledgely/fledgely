# Fledgely Terraform Module - Firebase
# Apache 2.0 License

# =============================================================================
# Firebase Project
# =============================================================================

# Enable Firebase for the GCP project
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  # Wait for Identity Toolkit API to be enabled
  depends_on = [var.api_depends_on]
}

# =============================================================================
# Firebase Web App
# =============================================================================

resource "google_firebase_web_app" "web" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Fledgely Web"

  depends_on = [google_firebase_project.default]
}

# Get the Firebase config for the web app
data "google_firebase_web_app_config" "web" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.web.app_id

  depends_on = [google_firebase_web_app.web]
}

# =============================================================================
# Identity Platform (Firebase Auth)
# =============================================================================

# Enable Identity Platform (underlying service for Firebase Auth)
resource "google_identity_platform_config" "default" {
  project = var.project_id

  # Sign-in configuration
  sign_in {
    allow_duplicate_emails = false

    # Email authentication (used by Firebase Auth)
    email {
      enabled           = true
      password_required = true
    }
  }

  # Authorized domains for OAuth
  authorized_domains = concat(
    [
      "${var.project_id}.firebaseapp.com",
      "${var.project_id}.web.app",
      "localhost",
    ],
    var.authorized_domains
  )

  depends_on = [google_firebase_project.default]
}

# =============================================================================
# Google Sign-In Provider
# =============================================================================

# Note: Google Sign-In provider configuration requires manual setup in Firebase Console
# The Identity Platform Terraform provider has limited support for OAuth providers
#
# Manual steps required:
# 1. Go to Firebase Console > Authentication > Sign-in method
# 2. Enable Google provider
# 3. Configure OAuth consent screen
# 4. Add authorized domains

# Create a null resource to output manual configuration steps
# This only runs once when the Firebase project is first created
resource "null_resource" "firebase_auth_manual_steps" {
  triggers = {
    firebase_project = google_firebase_project.default.project
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "============================================"
      echo "Firebase Auth Manual Configuration Required"
      echo "============================================"
      echo ""
      echo "Complete these steps in Firebase Console:"
      echo "https://console.firebase.google.com/project/${var.project_id}/authentication/providers"
      echo ""
      echo "1. Click 'Get started' if this is a new project"
      echo "2. Click on 'Google' under 'Sign-in providers'"
      echo "3. Toggle 'Enable' and configure:"
      echo "   - Project support email: your-email@domain.com"
      echo "4. Click 'Save'"
      echo ""
      echo "5. Go to 'Settings' > 'Authorized domains'"
      echo "6. Add your custom domain if applicable"
      echo ""
      echo "============================================"
    EOT
  }

  depends_on = [google_identity_platform_config.default]
}
