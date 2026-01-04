# Story 49.1: Automated Firestore Backup

## Status: done

## Story

As **a self-hosted user**,
I want **automated daily backups of Firestore data**,
So that **my family's data is protected (FR124)**.

## Acceptance Criteria

1. **AC1: Daily Backup Schedule**
   - Given self-hosted deployment running
   - When backup schedule triggers
   - Then Firestore export runs daily (configurable time)

2. **AC2: Backup Storage**
   - Given backup runs
   - When export completes
   - Then exports to Cloud Storage bucket
   - And backup files organized by date

3. **AC3: Retention Policy**
   - Given backups accumulate
   - When retention limit reached
   - Then retains backups per policy (default: 30 days)
   - And older backups automatically deleted

4. **AC4: Backup Performance (NFR79)**
   - Given backup runs
   - When processing typical family data
   - Then backup completes in <30 minutes

5. **AC5: Backup Logging**
   - Given backup runs
   - When backup completes or fails
   - Then backup success/failure logged
   - And logs include duration, size, status

6. **AC6: Failure Notifications**
   - Given backup fails
   - When error occurs
   - Then email notification sent (optional)
   - And alert logged for monitoring

## Tasks / Subtasks

### Task 1: Create Backup Terraform Module

**Files:**

- `terraform/modules/backup/main.tf` (create)
- `terraform/modules/backup/variables.tf` (create)
- `terraform/modules/backup/outputs.tf` (create)

**Implementation:**
1.1 Create backup storage bucket
1.2 Create Cloud Scheduler job for daily trigger
1.3 Configure lifecycle policy for retention
1.4 Set up IAM for backup operations

### Task 2: Create Backup Cloud Function

**Files:**

- `apps/functions/src/backup/firestore-backup.ts` (create)
- `apps/functions/src/backup/index.ts` (create)

**Implementation:**
2.1 Create function to trigger Firestore export
2.2 Handle success/failure logging
2.3 Implement notification on failure

### Task 3: Wire Backup Module

**Files:**

- `terraform/main.tf` (modify)
- `terraform/variables.tf` (modify)
- `terraform/outputs.tf` (modify)

**Implementation:**
3.1 Add backup module to main.tf
3.2 Add backup variables
3.3 Add backup outputs

### Task 4: Add Backup Documentation

**Files:**

- `terraform/docs/backup-guide.md` (create)

**Implementation:**
4.1 Document backup configuration
4.2 Document restore process
4.3 Document monitoring and alerts

## Dev Notes

### Firestore Export API

Uses `gcloud firestore export` or Admin SDK:

```typescript
const firestore = admin.firestore()
const bucket = storage.bucket(backupBucket)
await admin.firestore().exportDocuments(bucket.name, collectionIds)
```

### Cloud Scheduler

Schedule format: `0 2 * * *` (2 AM daily UTC)

### Retention Lifecycle

```hcl
lifecycle_rule {
  condition {
    age = 30
  }
  action {
    type = "Delete"
  }
}
```

### References

- [Firestore Export/Import](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Cloud Scheduler](https://cloud.google.com/scheduler/docs)

## Dev Agent Record

### Context Reference

Epic 49: Self-Hosted Backups & Restore

- FR124: Automated backups
- NFR79: Backup completes in <30 minutes

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

1. Created Terraform backup module with:
   - Backup storage bucket with lifecycle policies
   - Cloud Scheduler job for daily backups
   - Dynamic lifecycle rule for NEARLINE transition (only if retention > 7 days)
   - IAM permissions for Firestore export and bucket access

2. Created Cloud Function `backupFirestore` with:
   - Scheduled trigger (cron-based, default 2 AM UTC)
   - Uses Firestore Admin API via googleapis for exports
   - Logs backup events to `_system/backups/events` collection
   - Retry logic with 3 attempts

3. Created HTTP endpoint `triggerBackup` for:
   - Manual/on-demand backups
   - Cloud Scheduler integration
   - Private invoker (requires IAM auth)

4. Added comprehensive backup documentation covering:
   - Configuration options
   - Monitoring and logging
   - Restore procedures
   - Troubleshooting guide

### File List

- `terraform/modules/backup/main.tf` (created)
- `terraform/modules/backup/variables.tf` (created)
- `terraform/modules/backup/outputs.tf` (created)
- `terraform/main.tf` (modified - added backup module)
- `terraform/variables.tf` (modified - added backup variables)
- `terraform/outputs.tf` (modified - added backup outputs)
- `apps/functions/src/scheduled/firestore-backup.ts` (created)
- `apps/functions/src/scheduled/index.ts` (modified - added exports)
- `apps/functions/src/index.ts` (modified - added exports)
- `terraform/docs/backup-guide.md` (created)

## Change Log

| Date       | Change                                                   |
| ---------- | -------------------------------------------------------- |
| 2026-01-04 | Story created                                            |
| 2026-01-04 | Story completed - backup module and function implemented |
