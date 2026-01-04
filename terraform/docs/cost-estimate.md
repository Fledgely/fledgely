# Fledgely Cost Estimate

Estimated monthly cost for running Fledgely on GCP.

## Summary

| Usage Level                              | Monthly Cost |
| ---------------------------------------- | ------------ |
| Light (1-2 children, occasional use)     | $30-50       |
| Moderate (3-5 children, daily use)       | $50-80       |
| Heavy (5+ children, frequent monitoring) | $80-115      |

## Cost Breakdown by Service

### Firestore

| Metric           | Free Tier  | Cost After Free Tier |
| ---------------- | ---------- | -------------------- |
| Document reads   | 50,000/day | $0.06 per 100K       |
| Document writes  | 20,000/day | $0.18 per 100K       |
| Document deletes | 20,000/day | $0.02 per 100K       |
| Storage          | 1 GB       | $0.18 per GB         |

**Typical monthly cost**: $10-50

Factors affecting Firestore costs:

- Number of children monitored
- Screenshot capture frequency
- Dashboard refresh rate
- Real-time listeners

### Cloud Storage

| Metric               | Cost                |
| -------------------- | ------------------- |
| Storage (Standard)   | $0.026 per GB/month |
| Egress (to internet) | $0.12 per GB        |
| Operations           | $0.005 per 10K      |

**Typical monthly cost**: $5-20

Screenshot storage assumptions:

- Average screenshot: 200 KB (JPEG)
- 1 screenshot per 5 minutes = ~288/day per device
- ~8 GB/month per device
- 90-day retention = ~24 GB per device

### Cloud Functions

| Metric              | Free Tier  | Cost After Free Tier |
| ------------------- | ---------- | -------------------- |
| Invocations         | 2M/month   | $0.40 per million    |
| Compute (GB-second) | 400K/month | $0.0000025           |
| Networking          | 5 GB/month | $0.12 per GB         |

**Typical monthly cost**: $5-15

### Cloud Run

| Metric   | Free Tier         | Cost After Free Tier        |
| -------- | ----------------- | --------------------------- |
| CPU      | 180K vCPU-seconds | $0.00002400 per vCPU-second |
| Memory   | 360K GB-seconds   | $0.00000250 per GB-second   |
| Requests | 2M/month          | $0.40 per million           |

**Typical monthly cost**: $10-30

### Other Services

| Service           | Typical Cost  |
| ----------------- | ------------- |
| Cloud Scheduler   | Free (3 jobs) |
| Pub/Sub           | ~$0.50        |
| Artifact Registry | ~$1-5         |
| Cloud Logging     | Free (50 GB)  |
| Cloud Monitoring  | Free          |

## Cost Optimization Tips

### 1. Scale to Zero

Set minimum instances to 0:

```hcl
cloudrun_min_instances  = 0
functions_min_instances = 0
```

This eliminates idle costs but adds cold start latency.

### 2. Screenshot Retention

Reduce retention period:

```hcl
screenshot_retention_days = 30  # Instead of 90
```

Storage costs scale linearly with retention.

### 3. Capture Frequency

Configure lower screenshot frequency in the extension settings. Default is 5 minutes, but 10-15 minutes reduces storage by 50-66%.

### 4. Region Selection

Choose a region close to users:

- US: `us-central1` (Iowa) - cheapest
- EU: `europe-west1` (Belgium)
- Asia: `asia-east1` (Taiwan)

### 5. Committed Use Discounts

For production workloads, consider:

- Cloud Run CPU: 17% discount for 1-year commitment
- Firestore: Capacity pricing for predictable workloads

## Free Tier Maximization

To stay within free tier limits:

1. **Single family**: ~2 children monitored
2. **Screenshot frequency**: 15+ minutes
3. **Retention**: 30 days
4. **Dashboard access**: < 50K reads/day

## Cost Monitoring

### Enable Budget Alerts

```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Fledgely Budget" \
  --budget-amount=100USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

### View Current Spend

1. Go to [GCP Billing](https://console.cloud.google.com/billing)
2. Select your billing account
3. View cost breakdown by service

### Cost Allocation Labels

All resources are tagged with labels for cost tracking:

```hcl
labels = {
  app         = "fledgely"
  environment = "production"
  managed-by  = "terraform"
}
```

## Pricing References

- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Functions Pricing](https://cloud.google.com/functions/pricing)
- [Firestore Pricing](https://cloud.google.com/firestore/pricing)
- [Cloud Storage Pricing](https://cloud.google.com/storage/pricing)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)

## Disclaimer

Costs are estimates based on typical usage patterns as of 2024. Actual costs may vary based on:

- Usage patterns
- Region selection
- GCP pricing changes
- Data egress to users

Always monitor your billing and set up alerts to avoid unexpected charges.
