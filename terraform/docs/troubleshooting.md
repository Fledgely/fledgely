# Fledgely Terraform Troubleshooting

Common issues and solutions when deploying Fledgely with Terraform.

## Initialization Issues

### Provider download fails

**Error:**

```
Error: Failed to install provider
```

**Solution:**

```bash
# Clear provider cache
rm -rf .terraform
rm .terraform.lock.hcl

# Reinitialize
terraform init
```

### Version constraint error

**Error:**

```
Error: Unsatisfied provider version constraint
```

**Solution:**
Update your Terraform version:

```bash
# macOS
brew upgrade terraform

# Verify version
terraform version
```

## Authentication Issues

### Missing credentials

**Error:**

```
Error: google: could not find default credentials
```

**Solution:**

```bash
# Set application default credentials
gcloud auth application-default login
```

### Permission denied

**Error:**

```
Error: googleapi: Error 403: The caller does not have permission
```

**Solution:**

```bash
# Check current account
gcloud auth list

# Verify project access
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Grant owner role (if needed)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:you@example.com" \
  --role="roles/owner"
```

## API Issues

### API not enabled

**Error:**

```
Error: googleapi: Error 403: API has not been used in project
```

**Solution:**
Enable the API manually:

```bash
gcloud services enable SERVICE_NAME.googleapis.com
```

Or set `enable_apis = true` in your configuration.

### API enablement propagation

**Error:**

```
Error: Error creating resource: API may still be enabling
```

**Solution:**
Wait a few minutes and retry:

```bash
# Wait 60 seconds
sleep 60

# Retry
terraform apply
```

## Firestore Issues

### Database already exists

**Error:**

```
Error: Error creating Database: googleapi: Error 409: Database already exists
```

**Solution:**
If you have an existing Firestore database, import it:

```bash
terraform import module.firestore.google_firestore_database.main projects/YOUR_PROJECT_ID/databases/(default)
```

### Location cannot be changed

**Error:**

```
Error: Cannot change Firestore location
```

**Solution:**
Firestore location is immutable. Either:

1. Use the existing location
2. Delete and recreate the database (data loss)
3. Create a new project

## Cloud Functions Issues

### Build timeout

**Error:**

```
Error: Cloud Build timed out
```

**Solution:**
Increase the build timeout:

```hcl
functions_timeout = 540  # 9 minutes max
```

### Missing entry point

**Error:**

```
Error: Entry point not found
```

**Solution:**
Verify the entry point in `apps/functions/src/index.ts`:

```typescript
export { api } from './api'
export { scheduledCleanup } from './scheduled'
```

### Source code not found

**Error:**

```
Error: Cannot find source directory
```

**Solution:**
Check the source path:

```hcl
functions_source_path = "../apps/functions"
```

Ensure the path is relative to the terraform directory.

## Cloud Run Issues

### Image not found

**Error:**

```
Error: Image not found or invalid
```

**Solution:**
The initial deployment uses a placeholder image. After the first Cloud Build run, the actual image will be deployed.

For manual deployment:

```bash
# Build and push image
docker build -t gcr.io/YOUR_PROJECT/fledgely-web apps/web
docker push gcr.io/YOUR_PROJECT/fledgely-web

# Update Cloud Run
gcloud run deploy fledgely-web \
  --image gcr.io/YOUR_PROJECT/fledgely-web \
  --region us-central1
```

### Container fails to start

**Error:**

```
Error: Container failed to start
```

**Solution:**
Check Cloud Run logs:

```bash
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

Common causes:

- Missing environment variables
- Port mismatch (should be 3000)
- Insufficient memory

## Storage Issues

### Bucket name already taken

**Error:**

```
Error: googleapi: Error 409: Bucket name already exists
```

**Solution:**
Bucket names are globally unique. The module adds a random suffix, but if it conflicts:

```bash
# Destroy and recreate with new suffix
terraform destroy -target=module.storage
terraform apply -target=module.storage
```

### CORS errors

**Error:**
Browser console shows CORS errors when accessing images.

**Solution:**
Verify CORS configuration in the storage module:

```hcl
cors_origins = ["https://your-domain.com"]
```

## IAM Issues

### Service account creation failed

**Error:**

```
Error: Error creating service account
```

**Solution:**
Check service account quota:

```bash
gcloud iam service-accounts list --project YOUR_PROJECT_ID
```

Limit is 100 service accounts per project.

### Role assignment delay

**Error:**
Resources fail because IAM bindings aren't propagated.

**Solution:**
Add explicit dependencies or retry after a delay:

```bash
# Wait and retry
sleep 30
terraform apply
```

## State Issues

### State lock

**Error:**

```
Error: Error acquiring the state lock
```

**Solution:**
If you're sure no other process is running:

```bash
terraform force-unlock LOCK_ID
```

### State mismatch

**Error:**

```
Error: Resource already exists
```

**Solution:**
Import existing resources:

```bash
terraform import MODULE.RESOURCE RESOURCE_ID
```

Or remove from state:

```bash
terraform state rm MODULE.RESOURCE
```

## Network Issues

### Timeout connecting to GCP

**Error:**

```
Error: dial tcp: i/o timeout
```

**Solution:**
Check network connectivity:

```bash
# Test connectivity
curl -I https://cloudresourcemanager.googleapis.com

# Check proxy settings
echo $HTTP_PROXY $HTTPS_PROXY
```

## Cleanup and Reset

### Complete reset

```bash
# Destroy all resources
terraform destroy

# Remove state
rm -rf .terraform terraform.tfstate*

# Reinitialize
terraform init
```

### Targeted destroy

```bash
# Destroy specific module
terraform destroy -target=module.functions

# Recreate
terraform apply -target=module.functions
```

## Getting Help

1. **Check logs**:

   ```bash
   gcloud logging read "severity>=ERROR" --limit=50
   ```

2. **Enable verbose logging**:

   ```bash
   export TF_LOG=DEBUG
   terraform apply
   ```

3. **Review GCP Console**:
   - [Cloud Run](https://console.cloud.google.com/run)
   - [Cloud Functions](https://console.cloud.google.com/functions)
   - [Firestore](https://console.cloud.google.com/firestore)
   - [Error Reporting](https://console.cloud.google.com/errors)

4. **Report issues**:
   - GitHub Issues: [fledgely/issues](https://github.com/your-org/fledgely/issues)
