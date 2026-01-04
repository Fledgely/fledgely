# Cost Monitoring Guide

This guide explains how to monitor and optimize costs for your Fledgely self-hosted deployment.

## Expected Costs

### Typical Family Usage

For a typical family (3-4 children, 5-8 devices):

| Service                     | Monthly Cost     |
| --------------------------- | ---------------- |
| Cloud Run (web app)         | $5-20            |
| Cloud Functions (API)       | $2-10            |
| Firestore (database)        | $5-15            |
| Cloud Storage (screenshots) | $1-5             |
| Firebase Auth               | Free tier        |
| Network Egress              | $1-5             |
| **Total**                   | **$15-55/month** |

### Cost Factors

Costs vary based on:

- Number of children/devices
- Screenshot frequency
- Screenshot retention period
- Usage patterns (more active = higher cost)

## Budget Alerts

### Enable Budget Monitoring

Add to your `terraform.tfvars`:

```hcl
# Enable budget alerts
enable_budget_alert = true

# Your billing account ID (find in GCP Console > Billing)
billing_account = "01XXXX-XXXXXX-XXXXXX"

# Monthly budget in USD
monthly_budget = 50

# Send alerts to billing admins
notify_billing_admins = true
```

### Alert Thresholds

When enabled, you'll receive alerts at:

- **50%** of budget spent
- **80%** of budget spent
- **100%** of budget spent
- **100%** forecasted (predictive alert)

### Finding Your Billing Account ID

1. Go to [GCP Console](https://console.cloud.google.com)
2. Navigate to **Billing**
3. Select your billing account
4. The ID is in the format: `01XXXX-XXXXXX-XXXXXX`

## Cost Breakdown by Service

### Cloud Run (Web Application)

Billed for:

- vCPU-seconds when processing requests
- Memory GB-seconds
- Request count

**Free tier:** 2 million requests/month

**Optimization tips:**

- Use `min_instances = 0` for scale-to-zero
- Right-size memory: 256Mi may be sufficient
- Enable CPU throttling during idle

### Cloud Functions (API)

Billed for:

- Invocations
- Compute time (GB-seconds)
- Networking

**Free tier:** 2 million invocations/month

**Optimization tips:**

- Use 256MB memory (default)
- Optimize function execution time
- Batch operations where possible

### Firestore

Billed for:

- Document reads
- Document writes
- Document deletes
- Storage (per GB)

**Free tier:**

- 50K reads/day
- 20K writes/day
- 20K deletes/day
- 1 GB storage

**Optimization tips:**

- Use efficient queries
- Avoid reading entire collections
- Use pagination

### Cloud Storage

Billed for:

- Storage (per GB/month)
- Operations (Class A/B)
- Network egress

**Optimization tips:**

- Set appropriate retention period
- Use NEARLINE for less frequent access
- Enable lifecycle rules for auto-deletion

## Scale-to-Zero

By default, Fledgely is configured for scale-to-zero:

```hcl
cloudrun_min_instances   = 0
functions_min_instances  = 0
```

This means:

- **No charges when idle**: Services scale down to zero instances
- **Cold starts**: First request after idle takes 1-3 seconds
- **Best for cost optimization**: Pay only for actual usage

### Always-On Mode

For faster response times (at higher cost):

```hcl
cloudrun_min_instances = 1
```

This keeps one instance warm, eliminating cold starts but adding ~$20-30/month.

## Cost Optimization Strategies

### 1. Right-Size Resources

Start with defaults and adjust based on actual usage:

```hcl
# Conservative settings
cloudrun_memory  = "256Mi"
cloudrun_cpu     = "1"
functions_memory = 256
```

### 2. Reduce Screenshot Retention

Shorter retention = lower storage costs:

```hcl
# 30 days instead of default 90
screenshot_retention_days = 30
```

### 3. Use NEARLINE Storage

For less frequent screenshot access:

```hcl
storage_class = "NEARLINE"
```

NEARLINE is cheaper for data accessed less than once per month.

### 4. Monitor and Adjust

Review billing regularly and adjust:

```bash
# View current month's costs
gcloud billing accounts get-iam-policy BILLING_ACCOUNT_ID
```

Or use the [GCP Billing Console](https://console.cloud.google.com/billing).

## Monitoring Costs

### GCP Console

View costs in real-time:

1. Go to [Billing](https://console.cloud.google.com/billing)
2. Select your billing account
3. Click **Reports**
4. Filter by project

### Cost Export

Export costs to BigQuery for analysis:

1. Go to Billing > Billing export
2. Enable BigQuery export
3. Query costs with SQL

### Terraform Output

Check estimated costs:

```bash
terraform output estimated_monthly_cost
```

## Cost Alerts Setup

### Email Notifications

Budget alerts are sent to:

- Billing account admins (if `notify_billing_admins = true`)
- Custom notification channels (if configured)

### Custom Notifications

Set up Slack/webhook notifications:

1. Create a Pub/Sub topic
2. Set up a Cloud Function to forward to Slack
3. Configure in Terraform:

```hcl
pubsub_topic = "projects/PROJECT/topics/budget-alerts"
```

## Cost Comparison

### Self-Hosted vs Managed

|               | Self-Hosted | Managed SaaS |
| ------------- | ----------- | ------------ |
| Small family  | $15-30/mo   | $10-15/mo    |
| Medium family | $30-55/mo   | $25-40/mo    |
| Large family  | $55-100/mo  | $50-75/mo    |

Self-hosted has:

- Higher base cost (always-on infrastructure)
- Lower per-user scaling cost
- Full data ownership

## Troubleshooting High Costs

### Unexpected High Usage

1. Check Cloud Logging for anomalies
2. Review Firestore read/write counts
3. Check for runaway functions
4. Verify screenshot frequency

### Billing Spikes

1. Review billing reports by service
2. Check for unintended resources
3. Verify scale-to-zero is working
4. Review network egress

### Getting Help

If costs seem abnormal:

1. Review the [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
2. Contact GCP Support for billing inquiries
3. File an issue on the Fledgely repository

## Related Documentation

- [GCP Pricing](https://cloud.google.com/pricing)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Firestore Pricing](https://cloud.google.com/firestore/pricing)
- [Cost Estimate](./cost-estimate.md)
