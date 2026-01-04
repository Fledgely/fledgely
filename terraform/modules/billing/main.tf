# Fledgely Terraform Module - Billing/Budget
# Apache 2.0 License

# =============================================================================
# Budget Alert (Optional)
# =============================================================================

# Create a budget alert to notify when spending exceeds thresholds
resource "google_billing_budget" "fledgely" {
  count = var.enable_budget_alert ? 1 : 0

  billing_account = var.billing_account
  display_name    = "Fledgely Budget Alert"

  budget_filter {
    projects = ["projects/${var.project_number}"]
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = tostring(var.monthly_budget)
    }
  }

  # Alert at 50%, 80%, and 100% of budget
  threshold_rules {
    threshold_percent = 0.5
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 0.8
    spend_basis       = "CURRENT_SPEND"
  }

  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "CURRENT_SPEND"
  }

  # Forecast-based alert at 100%
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  # Notification channels (email by default)
  all_updates_rule {
    pubsub_topic                     = var.pubsub_topic != "" ? var.pubsub_topic : null
    monitoring_notification_channels = var.notification_channels
    disable_default_iam_recipients   = !var.notify_billing_admins
  }
}

# =============================================================================
# Cost Labels
# =============================================================================

# Note: Resource labels are applied in each module to enable cost tracking
# Labels include:
# - environment: production/staging/development
# - project: fledgely
# - managed-by: terraform
