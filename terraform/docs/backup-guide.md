# Firestore Backup Guide

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

## Related Documentation

- [Terraform Backup Module](../modules/backup/README.md)
- [GCP Firestore Export/Import](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [Cloud Storage Lifecycle Policies](https://cloud.google.com/storage/docs/lifecycle)
