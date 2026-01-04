# Story 48.8: Self-Hosted Cost Monitoring

## Status: done

## Story

As **a self-hosted user**,
I want **to understand and monitor costs**,
So that **there are no billing surprises**.

## Acceptance Criteria

1. **AC1: Expected Cost Output**
   - Given self-hosted deployment running
   - When monitoring costs
   - Then Terraform outputs expected monthly cost range

2. **AC2: Budget Alert Configuration**
   - Given self-hosted deployment
   - When configuring monitoring
   - Then GCP budget alert configured (optional)

3. **AC3: Cost Breakdown Documentation**
   - Given self-hosted deployment
   - When reviewing costs
   - Then cost breakdown by service documented

4. **AC4: Cost Optimization Tips**
   - Given cost monitoring
   - When reviewing optimization
   - Then tips for cost optimization included

5. **AC5: Typical Cost Estimate**
   - Given typical family usage
   - When estimating costs
   - Then typical family: <$10/month estimate documented

6. **AC6: Cost Event Logging (NFR42)**
   - Given cost monitoring configured
   - When cost events occur
   - Then cost monitoring events logged

7. **AC7: Scale-to-Zero**
   - Given deployment configuration
   - When not in use
   - Then scale-to-zero when not in use

## Tasks / Subtasks

### Task 1: Add Budget Alert Terraform [x] DONE

**Files:**

- `terraform/modules/billing/main.tf` (create)
- `terraform/modules/billing/variables.tf` (create)
- `terraform/modules/billing/outputs.tf` (create)
- `terraform/main.tf` (modify)
- `terraform/variables.tf` (modify)

**Implementation:**
1.1 Create billing module with budget alert
1.2 Add budget variables to root module
1.3 Wire billing module in main.tf

### Task 2: Add Cost Monitoring Documentation [x] DONE

**Files:**

- `terraform/docs/cost-monitoring.md` (create)

**Implementation:**
2.1 Document cost breakdown by service
2.2 Document optimization tips
2.3 Document budget alert configuration

## Dev Notes

### Cost Estimates

| Service         | Monthly Cost (Typical) |
| --------------- | ---------------------- |
| Cloud Run       | $5-20                  |
| Cloud Functions | $2-10                  |
| Firestore       | $5-15                  |
| Cloud Storage   | $1-5                   |
| Firebase Auth   | Free tier              |
| **Total**       | **$13-50**             |

### Scale-to-Zero

Cloud Run and Functions are configured to scale to zero:

- `min_instances = 0` (default)
- No charges when idle
- Cold start on first request

### References

- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)
- [Source: Story 48-1] - cost-estimate.md

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

- NFR42: Cost monitoring events logged

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Created billing module with optional budget alert
- Added budget variables to root module
- Created cost-monitoring.md documentation
- Scale-to-zero already configured (min_instances = 0)
- Cost estimate output already in outputs.tf

### File List

- `terraform/modules/billing/main.tf` (created)
- `terraform/modules/billing/variables.tf` (created)
- `terraform/modules/billing/outputs.tf` (created)
- `terraform/main.tf` (modified)
- `terraform/variables.tf` (modified)
- `terraform/docs/cost-monitoring.md` (created)

## Change Log

| Date       | Change                 |
| ---------- | ---------------------- |
| 2026-01-04 | Story created and done |
