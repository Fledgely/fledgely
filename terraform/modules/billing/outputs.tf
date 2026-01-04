# Fledgely Terraform Module - Billing Outputs
# Apache 2.0 License

output "budget_id" {
  description = "The ID of the budget alert"
  value       = var.enable_budget_alert ? google_billing_budget.fledgely[0].id : null
}

output "budget_name" {
  description = "The display name of the budget alert"
  value       = var.enable_budget_alert ? google_billing_budget.fledgely[0].display_name : null
}

output "monthly_budget" {
  description = "The configured monthly budget in USD"
  value       = var.monthly_budget
}
