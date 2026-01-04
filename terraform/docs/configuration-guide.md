# Configuration Guide

This guide explains all available configuration options for your Fledgely deployment.

## Required Variables

### project_id

Your GCP project ID where Fledgely will be deployed.

```hcl
project_id = "my-fledgely-project"
```

**Requirements:**

- Must be an existing GCP project
- Must have billing enabled
- You must have Owner or Editor role

## Optional Variables

### region

The GCP region for deployment.

```hcl
region = "us-central1"  # default
```

**Valid values:** Any valid GCP region

- `us-central1` (recommended for US)
- `us-east1`, `us-west1`
- `europe-west1` (EU)
- `asia-northeast1` (Asia)

**Recommendation:** Choose a region close to your family for lower latency.

### environment

Environment name used for resource labeling.

```hcl
environment = "production"  # default
```

**Valid values:** `development`, `staging`, `production`

### enable_apis

Automatically enable required GCP APIs.

```hcl
enable_apis = true  # default
```

Set to `false` if you prefer to enable APIs manually or if they're already enabled.

## Screenshot Storage

### screenshot_retention_days

Number of days to retain screenshots before automatic deletion.

```hcl
screenshot_retention_days = 90  # default
```

**Valid values:** 1-365

**Recommendations:**

- 30 days: Minimal storage, lower cost
- 90 days: Balanced (default)
- 180 days: Extended history
- 365 days: Maximum retention

### storage_class

Cloud Storage class for screenshot bucket.

```hcl
storage_class = "STANDARD"  # default
```

**Valid values:**

- `STANDARD` - Frequently accessed data
- `NEARLINE` - Once per month access
- `COLDLINE` - Once per quarter access

### storage_location

Location for Cloud Storage bucket.

```hcl
storage_location = "US"  # default
```

**Valid values:** Any valid GCS location (US, EU, ASIA, etc.)

## Cloud Run (Web Application)

### cloudrun_memory

Memory allocation for web application.

```hcl
cloudrun_memory = "512Mi"  # default
```

**Valid values:** `256Mi`, `512Mi`, `1Gi`, `2Gi`, `4Gi`

### cloudrun_cpu

CPU allocation for web application.

```hcl
cloudrun_cpu = "1"  # default
```

**Valid values:** `1`, `2`, `4`

### cloudrun_max_instances

Maximum number of Cloud Run instances.

```hcl
cloudrun_max_instances = 10  # default
```

**Valid values:** 1-1000

**Recommendations:**

- 2-5: Small family (1-3 children)
- 5-10: Medium family (default)
- 10-20: Large family or multiple devices

### cloudrun_min_instances

Minimum instances to keep warm (costs more but faster cold starts).

```hcl
cloudrun_min_instances = 0  # default
```

**Valid values:** 0+

**Recommendations:**

- 0: Cost-optimized (may have cold starts)
- 1: Always-warm (higher cost, no cold starts)

### cloudrun_concurrency

Maximum concurrent requests per instance.

```hcl
cloudrun_concurrency = 80  # default
```

**Valid values:** 1-1000

## Cloud Functions (API)

### functions_memory

Memory allocation for API functions.

```hcl
functions_memory = 256  # default
```

**Valid values:** 128, 256, 512, 1024, 2048, 4096

### functions_timeout

Function timeout in seconds.

```hcl
functions_timeout = 60  # default
```

**Valid values:** 1-540

### functions_max_instances

Maximum function instances.

```hcl
functions_max_instances = 100  # default
```

### functions_min_instances

Minimum function instances (keep warm).

```hcl
functions_min_instances = 0  # default
```

## Firestore

### firestore_location

Location for Firestore database.

```hcl
firestore_location = "nam5"  # default (US multi-region)
```

**Valid values:**

- `nam5` - US multi-region
- `eur3` - Europe multi-region
- `us-central1`, `us-east1`, etc. - Single region

### firestore_deletion_protection

Prevent accidental database deletion.

```hcl
firestore_deletion_protection = true  # default
```

**Important:** Set to `false` only for testing or before destroying infrastructure.

## Custom Domain

### custom_domain

Your custom domain for the web application.

```hcl
custom_domain = ""  # default (use Cloud Run URL)
```

**Examples:**

- `app.yourdomain.com` (subdomain)
- `fledgely.family.org` (subdomain)
- `yourdomain.com` (apex domain)

### enable_ssl

Enable SSL certificate provisioning.

```hcl
enable_ssl = true  # default
```

Always leave enabled for security.

## CI/CD

### enable_ci_cd

Enable Cloud Build triggers for automated deployments.

```hcl
enable_ci_cd = false  # default
```

### github_owner

GitHub organization or username for Cloud Build.

```hcl
github_owner = ""  # required if enable_ci_cd = true
```

### github_repo

GitHub repository name.

```hcl
github_repo = "fledgely"  # default
```

## Labels

### labels

Custom labels for all resources.

```hcl
labels = {
  team    = "family"
  purpose = "parental-controls"
}
```

## Configuration Profiles

### Small Family (1-2 children, 2-3 devices)

```hcl
project_id = "your-project"
region     = "us-central1"

screenshot_retention_days = 60
storage_class             = "NEARLINE"

cloudrun_memory        = "256Mi"
cloudrun_max_instances = 3
cloudrun_min_instances = 0

functions_memory        = 256
functions_max_instances = 50
```

**Estimated cost:** ~$15-30/month

### Medium Family (3-4 children, 5-8 devices)

```hcl
project_id = "your-project"
region     = "us-central1"

screenshot_retention_days = 90
storage_class             = "STANDARD"

cloudrun_memory        = "512Mi"
cloudrun_max_instances = 10
cloudrun_min_instances = 0

functions_memory        = 256
functions_max_instances = 100
```

**Estimated cost:** ~$30-60/month

### Large Family (5+ children, 10+ devices)

```hcl
project_id = "your-project"
region     = "us-central1"

screenshot_retention_days = 90
storage_class             = "STANDARD"

cloudrun_memory        = "1Gi"
cloudrun_max_instances = 20
cloudrun_min_instances = 1

functions_memory        = 512
functions_max_instances = 200
```

**Estimated cost:** ~$60-115/month

## Validation Errors

Terraform validates configuration at plan time. Common errors:

### Invalid region

```
Error: Invalid value for variable
  region must be a valid GCP region
```

**Fix:** Use a valid GCP region like `us-central1`.

### Invalid environment

```
Error: Invalid value for variable
  environment must be one of: development, staging, production
```

**Fix:** Use an allowed environment value.

### Invalid retention days

```
Error: Invalid value for variable
  screenshot_retention_days must be between 1 and 365
```

**Fix:** Use a value in the valid range.

## Related Documentation

- [Terraform Variables](https://developer.hashicorp.com/terraform/language/values/variables)
- [GCP Regions](https://cloud.google.com/compute/docs/regions-zones)
- [Cost Estimate](./cost-estimate.md)
