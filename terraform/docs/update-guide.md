# Update Guide

This guide explains how to update your self-hosted Fledgely deployment.

## Quick Update

The fastest way to update:

```bash
cd terraform
./scripts/update.sh
```

The script will:

1. Check for available updates
2. Show changelog and breaking changes
3. Pull latest code
4. Apply infrastructure changes
5. Verify the update

## Manual Update Process

### Step 1: Backup (Recommended)

Before updating, create backups:

```bash
# Backup Terraform state
cp terraform.tfstate terraform.tfstate.backup

# Backup Firestore (replace with your bucket)
gcloud firestore export gs://YOUR_BUCKET/backups/pre-update-$(date +%Y%m%d)
```

### Step 2: Check for Updates

```bash
# Fetch latest changes
git fetch origin main

# See what's new
git log --oneline HEAD..origin/main

# Check for breaking changes
git log --grep="BREAKING" HEAD..origin/main
```

### Step 3: Pull Updates

```bash
git pull origin main
```

### Step 4: Review Terraform Changes

```bash
cd terraform
terraform init -upgrade
terraform plan
```

Review the plan output carefully. Look for:

- Resources being destroyed
- Breaking changes to APIs
- New required variables

### Step 5: Apply Updates

```bash
terraform apply
```

### Step 6: Verify Update

```bash
./scripts/verify.sh
```

## Zero-Downtime Deployments

Fledgely uses Cloud Run for the web application, which provides zero-downtime deployments:

1. New container revision is deployed
2. Health checks verify the new revision
3. Traffic gradually shifts to new revision
4. Old revision remains available for quick rollback

If the new revision fails health checks, traffic stays on the old revision.

## Database Migrations

Firestore is schemaless, so most updates don't require migrations.

When migrations are needed:

1. Migration scripts are in `apps/functions/migrations/`
2. Run migrations before updating: `npm run migrate`
3. Migrations are idempotent (safe to run multiple times)

## Rollback

If an update causes issues:

### Quick Rollback (Cloud Run)

Rollback to previous Cloud Run revision:

```bash
# List revisions
gcloud run revisions list --service=fledgely-web --region=YOUR_REGION

# Route traffic to previous revision
gcloud run services update-traffic fledgely-web \
  --to-revisions=PREVIOUS_REVISION=100 \
  --region=YOUR_REGION
```

### Full Rollback

Use the rollback script:

```bash
./scripts/rollback.sh [commit_hash]
```

Or manually:

```bash
# Find the commit to rollback to
git log --oneline -10

# Checkout that commit
git checkout COMMIT_HASH

# Re-apply Terraform
terraform init
terraform apply
```

### Restore from Backup

If data is corrupted:

```bash
# Restore Firestore from backup
gcloud firestore import gs://YOUR_BUCKET/backups/BACKUP_NAME
```

## Update Frequency

**Recommended:** Update monthly for security patches.

Check for updates:

- GitHub Releases: https://github.com/YOUR_ORG/fledgely/releases
- Watch the repository for notifications

## Breaking Changes

Breaking changes are documented in:

1. Commit messages with `BREAKING CHANGE:`
2. GitHub Release notes
3. CHANGELOG.md (if present)

### Common Breaking Changes

| Change Type           | How to Handle                 |
| --------------------- | ----------------------------- |
| New required variable | Add to terraform.tfvars       |
| API change            | Update extension/web app      |
| Firestore schema      | Run migration script          |
| Provider upgrade      | Run `terraform init -upgrade` |

## Troubleshooting Updates

### "Provider version constraint not met"

```bash
terraform init -upgrade
```

### "Resource already exists"

Import existing resources:

```bash
terraform import google_cloud_run_v2_service.web projects/PROJECT/locations/REGION/services/fledgely-web
```

### "Permission denied"

Verify your gcloud credentials:

```bash
gcloud auth list
gcloud auth application-default login
```

### "Update failed, can't rollback"

1. Restore Terraform state from backup:

   ```bash
   cp terraform.tfstate.backup terraform.tfstate
   ```

2. Run terraform plan to see current drift:

   ```bash
   terraform plan
   ```

3. If needed, contact support or file a GitHub issue

## Release Notifications

Get notified of new releases:

### GitHub Watch

1. Go to https://github.com/YOUR_ORG/fledgely
2. Click "Watch" > "Custom"
3. Select "Releases"

### Email Notifications

1. Watch the repository on GitHub
2. Enable email notifications in GitHub settings

### RSS Feed

Subscribe to releases RSS:

```
https://github.com/YOUR_ORG/fledgely/releases.atom
```

## Update Checklist

Before updating:

- [ ] Read release notes
- [ ] Check for breaking changes
- [ ] Backup Terraform state
- [ ] Backup Firestore (for major updates)
- [ ] Have rollback plan ready

After updating:

- [ ] Run verification script
- [ ] Test authentication flow
- [ ] Check screenshot capture
- [ ] Verify API endpoints
- [ ] Monitor for errors

## Update Time Expectations

| Update Type              | Expected Time |
| ------------------------ | ------------- |
| Patch (bug fixes)        | 2-5 minutes   |
| Minor (new features)     | 5-10 minutes  |
| Major (breaking changes) | 10-15 minutes |

NFR86 requires updates to complete in <10 minutes for typical updates.

## Related Documentation

- [Rollback Script](../scripts/rollback.sh)
- [Verify Script](../scripts/verify.sh)
- [Troubleshooting](./troubleshooting.md)
