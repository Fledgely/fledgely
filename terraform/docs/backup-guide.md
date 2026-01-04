# Backup Guide

This document describes how to configure and manage automated Firestore backups for Fledgely.

## Overview

Fledgely supports automated daily Firestore backups with configurable retention periods. Backups are stored in a dedicated Cloud Storage bucket with lifecycle policies for automatic cleanup.

## Configuration

### Enable Scheduled Backups

To enable automated daily backups, set the following variables in your `terraform.tfvars`:

```hcl
# Enable scheduled backups
enable_scheduled_backup = true

# Backup schedule (cron format, default: 2 AM UTC)
backup_schedule = "0 2 * * *"

# Backup timezone
backup_timezone = "UTC"

# Backup retention (days)
backup_retention_days = 30

# Backup storage location (default: US)
backup_location = "US"

# Enable Pub/Sub notifications for backup events (optional)
enable_backup_notifications = false
```

### Apply Configuration

```bash
cd terraform
terraform apply
```

## How It Works

### Automated Backups

1. **Cloud Scheduler** triggers the backup function at the configured schedule
2. **Cloud Function** (`backupFirestore`) initiates a Firestore export operation
3. **Firestore Admin API** exports all documents to the backup bucket
4. **Backup events** are logged to `_system/backups/events` collection
5. **Lifecycle policies** automatically delete backups older than the retention period

### Backup Storage

Backups are stored in a dedicated bucket with the following structure:

```
gs://{project-id}-fledgely-backups/
  firestore-backups/
    2024-01-15_02-00-00/
      all_namespaces/
        ...
    2024-01-16_02-00-00/
      ...
```

### Bucket Features

- **Uniform bucket-level access**: Simplified IAM permissions
- **Public access prevention**: Enforced to protect backup data
- **Versioning**: Enabled for additional data protection
- **Lifecycle rules**: Automatic cleanup based on retention period

## Manual Backups

### Using the HTTP Endpoint

Trigger a manual backup via the HTTP endpoint:

```bash
# Get an authentication token
TOKEN=$(gcloud auth print-identity-token)

# Trigger backup
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://{region}-{project-id}.cloudfunctions.net/triggerBackup
```

### Using gcloud

Alternatively, use the gcloud CLI directly:

```bash
gcloud firestore export \
  gs://{project-id}-fledgely-backups/firestore-backups/manual-$(date +%Y-%m-%d_%H-%M-%S) \
  --project={project-id}
```

## Monitoring

### Backup Events

Check backup status in Firestore:

```javascript
// In Firebase Console or via Admin SDK
db.collection('_system')
  .doc('backups')
  .collection('events')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()
```

### Event Structure

```json
{
  "status": "completed",
  "timestamp": 1705302000000,
  "backupPath": "gs://project-fledgely-backups/firestore-backups/2024-01-15_02-00-00",
  "operationName": "projects/project/databases/(default)/operations/xxx",
  "durationMs": 5432
}
```

### Cloud Logging

View backup logs:

```bash
gcloud logging read \
  'resource.type="cloud_function" AND resource.labels.function_name="backupFirestore"' \
  --project={project-id} \
  --limit=20
```

### Monitoring Alerts

If you enabled `enable_backup_notifications`, subscribe to the Pub/Sub topic for backup events:

```bash
# List notifications topic
gcloud pubsub topics list --filter="name:backup-notifications"
```

## Restore Process

### List Available Backups

```bash
gcloud storage ls gs://{project-id}-fledgely-backups/firestore-backups/
```

### Restore from Backup

Restore to a specific collection (recommended for testing):

```bash
gcloud firestore import \
  gs://{project-id}-fledgely-backups/firestore-backups/2024-01-15_02-00-00 \
  --collection-ids=users,families \
  --project={project-id}
```

Restore all collections (use with caution):

```bash
gcloud firestore import \
  gs://{project-id}-fledgely-backups/firestore-backups/2024-01-15_02-00-00 \
  --project={project-id}
```

### Important Notes

- Restores can take significant time for large databases
- Existing documents are overwritten with backup data
- New documents created after backup are NOT deleted
- Consider restoring to a test project first

## IAM Permissions

The backup function requires the following IAM roles:

| Role                                | Purpose                |
| ----------------------------------- | ---------------------- |
| `roles/datastore.importExportAdmin` | Export Firestore data  |
| `roles/storage.objectAdmin`         | Write to backup bucket |
| `roles/cloudscheduler.jobRunner`    | (For Cloud Scheduler)  |

These are automatically configured by the Terraform module.

## Troubleshooting

### Backup Failed: Permission Denied

Verify the function service account has the required roles:

```bash
gcloud projects get-iam-policy {project-id} \
  --flatten="bindings[].members" \
  --format='table(bindings.role)' \
  --filter="bindings.members:fledgely-functions@{project-id}.iam.gserviceaccount.com"
```

### Backup Failed: Bucket Not Found

Check the backup bucket exists:

```bash
gcloud storage buckets describe gs://{project-id}-fledgely-backups
```

### Export Operation Timeout

Firestore exports for large databases may take longer than the function timeout. The export continues in the background even if the function times out. Check the export status:

```bash
gcloud firestore operations list --database='(default)'
```

## Cost Considerations

### Backup Costs

| Resource         | Cost Factor                                      |
| ---------------- | ------------------------------------------------ |
| Cloud Storage    | $0.020-0.026/GB/month (depends on storage class) |
| Cloud Functions  | Minimal (runs once daily)                        |
| Cloud Scheduler  | $0.10/month per job                              |
| Firestore Export | Free (included in Firestore pricing)             |

### Optimization Tips

1. Set appropriate retention periods (30 days is usually sufficient)
2. Use regional storage location matching your Firestore region
3. Consider NEARLINE storage for longer retention periods

## Security

### Backup Encryption

- Backups are encrypted at rest using Google-managed encryption keys
- Enable customer-managed encryption keys (CMEK) for additional control

### Access Control

- Backup bucket has public access prevention enforced
- Only the function service account can write to the bucket
- Restore operations require `datastore.importExportAdmin` role

## Screenshot Storage Backup (Story 49.2)

Screenshots are backed up separately from Firestore data using Cloud Storage features.

### Configuration

```hcl
# Enable versioning for data protection
screenshot_versioning_enabled = true

# Move to NEARLINE storage after 30 days (cost savings)
screenshot_archive_days = 30

# Delete after 90 days
screenshot_retention_days = 90
```

### How It Works

1. **Versioning**: When enabled, every overwrite creates a new version
   - Previous versions are retained
   - Accidental deletions can be recovered
   - Non-current versions deleted after 7 days by default

2. **NEARLINE Transition**: Old screenshots automatically move to cheaper storage
   - Reduced storage costs (NEARLINE is ~50% cheaper)
   - Access is slightly slower but fine for old screenshots
   - Only applies if `screenshot_archive_days < screenshot_retention_days`

3. **Deletion**: Screenshots deleted after retention period expires

### Lifecycle Timeline Example

```
Day 0:  Screenshot uploaded (STANDARD storage)
Day 30: Moved to NEARLINE storage
Day 90: Deleted from storage
```

### Cost Optimization

| Storage Class | Cost/GB/Month | Use Case                       |
| ------------- | ------------- | ------------------------------ |
| STANDARD      | ~$0.020       | Recent screenshots (< 30 days) |
| NEARLINE      | ~$0.010       | Older screenshots (30-90 days) |

### Disabling Screenshot Backup

To exclude screenshots from versioning (data-only backup):

```hcl
screenshot_versioning_enabled = false
screenshot_archive_days = 0
```

### Viewing Storage Size

Check current storage usage:

```bash
gcloud storage du -s gs://{project-id}-screenshots-*
```

## Point-in-Time Recovery (Story 49.5)

GCP Firestore supports Point-in-Time Recovery (PITR) for minute-level granularity.

### Enabling PITR

PITR must be enabled in the Firebase/GCP console:

1. Go to Firebase Console → Firestore Database
2. Navigate to Settings → Point-in-Time Recovery
3. Enable PITR (may require upgrading your billing plan)

### Using PITR

Restore to a specific point in time:

```bash
# List available recovery points
gcloud firestore databases describe --project={project-id}

# Restore to a specific timestamp
gcloud firestore databases restore \
  --source-database='(default)' \
  --destination-database='{project-id}-restored' \
  --snapshot-time='2024-01-15T14:30:00Z' \
  --project={project-id}
```

### PITR Limitations

- Requires GCP support (not available on all tiers)
- Recovery window: last 7 days
- Restores to a new database (not in-place)
- May have additional costs

## Backup Verification (Story 49.6)

Regular verification ensures backups are restorable when needed.

### Integrity Verification

Check backup metadata:

```bash
# List backup contents
gcloud storage ls -l gs://{project-id}-fledgely-backups/firestore-backups/

# Check backup metadata
gcloud firestore operations list --database='(default)' --project={project-id}
```

### Test Restore (Recommended Quarterly)

1. Create a test project:

   ```bash
   gcloud projects create {project-id}-test --name="Backup Test"
   ```

2. Restore backup to test project:

   ```bash
   gcloud firestore import \
     gs://{project-id}-fledgely-backups/firestore-backups/2024-01-15_02-00-00 \
     --project={project-id}-test
   ```

3. Verify data integrity in test project

4. Clean up test project:
   ```bash
   gcloud projects delete {project-id}-test
   ```

### Backup Health Monitoring

Check backup events in Firestore:

```javascript
// Recent backup events
const events = await db
  .collection('_system')
  .doc('backups')
  .collection('events')
  .orderBy('timestamp', 'desc')
  .limit(30)
  .get()

// Check for failures
const failures = events.docs.filter((d) => d.data().status === 'failed')
console.log(`Failed backups: ${failures.length}`)
```

### Estimated Restore Times

| Data Size | Estimated Restore Time |
| --------- | ---------------------- |
| < 1 GB    | < 10 minutes           |
| 1-10 GB   | 10-30 minutes          |
| 10-50 GB  | 30-60 minutes          |
| > 50 GB   | 1-4 hours              |

## Recovery Runbook

### Emergency Recovery Steps

1. **Assess the Situation**
   - Identify what data was lost/corrupted
   - Determine when the issue occurred
   - Check if PITR is available

2. **Choose Recovery Method**
   - For recent issues (< 7 days): Use PITR if enabled
   - For older issues: Use scheduled backup
   - For specific collections: Selective restore

3. **Prepare for Restore**
   - Notify users of maintenance window
   - Take a current backup (preserve current state)
   - Document the restore reason

4. **Execute Restore**

   ```bash
   # Take safety backup first
   gcloud firestore export \
     gs://{project-id}-fledgely-backups/firestore-backups/pre-restore-$(date +%Y-%m-%d_%H-%M-%S) \
     --project={project-id}

   # Perform restore
   gcloud firestore import \
     gs://{project-id}-fledgely-backups/firestore-backups/{backup-timestamp} \
     --project={project-id}
   ```

5. **Verify Restore**
   - Check critical data is present
   - Verify application functionality
   - Monitor for errors

6. **Post-Restore**
   - Document what was restored
   - Update backup verification schedule
   - Review what caused the data loss

## Related Documentation

- [Terraform Backup Module](../modules/backup/README.md)
- [GCP Firestore Export/Import](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [Cloud Storage Lifecycle Policies](https://cloud.google.com/storage/docs/lifecycle)
- [Firestore Point-in-Time Recovery](https://cloud.google.com/firestore/docs/backups)
