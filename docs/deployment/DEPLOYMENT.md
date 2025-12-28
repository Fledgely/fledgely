# Fledgely Deployment Guide

## Overview

Fledgely uses Firebase Hosting with GitHub Actions for continuous deployment. Authentication uses Workload Identity Federation (WIF) - no static service account keys are stored in the repository.

## Prerequisites

1. **Firebase Project**: Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. **Google Cloud Project**: Linked to your Firebase project
3. **GitHub Repository**: Your Fledgely fork or clone

## Workload Identity Federation Setup

Per ADR-014, we use Workload Identity Federation instead of static service account keys.

### Step 1: Enable Required APIs

```bash
gcloud services enable iamcredentials.googleapis.com --project=YOUR_PROJECT_ID
gcloud services enable firebasehosting.googleapis.com --project=YOUR_PROJECT_ID
```

### Step 2: Create Workload Identity Pool

```bash
gcloud iam workload-identity-pools create "github" \
  --project="YOUR_PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions"
```

### Step 3: Create Workload Identity Provider

```bash
gcloud iam workload-identity-pools providers create-oidc "github" \
  --project="YOUR_PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Step 4: Create Service Account

```bash
gcloud iam service-accounts create "github-deploy" \
  --project="YOUR_PROJECT_ID" \
  --display-name="GitHub Deploy"
```

### Step 5: Grant Service Account Roles

```bash
# Firebase Hosting Admin
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

# Service Account User (for impersonation)
gcloud iam service-accounts add-iam-policy-binding \
  "github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --project="YOUR_PROJECT_ID" \
  --role="roles/iam.serviceAccountUser" \
  --member="serviceAccount:github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

### Step 6: Bind WIF to Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --project="YOUR_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/YOUR_GITHUB_ORG/fledgely"
```

Replace `PROJECT_NUMBER` with your GCP project number (not ID) and `YOUR_GITHUB_ORG` with your GitHub organization or username.

### Step 7: Get Project Number

```bash
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
```

## GitHub Repository Secrets

Add these secrets to your GitHub repository:

| Secret Name                      | Value                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `GCP_PROJECT_ID`                 | Your GCP project ID (e.g., `fledgely`)                                                   |
| `GCP_PROJECT_NUMBER`             | Your GCP project number (from Step 7)                                                    |
| `GCP_SERVICE_ACCOUNT`            | `github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com`                                  |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github` |

## Deployment Workflows

### Production Deployment

Triggers on push to `main` branch after CI passes.

```yaml
# .github/workflows/deploy-production.yml
on:
  push:
    branches: [main]
```

### Preview Deployment

Triggers on pull requests. Creates a unique preview URL for each PR.

```yaml
# .github/workflows/deploy-preview.yml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

## Local Testing

Test hosting locally before deploying:

```bash
# Start emulators (includes hosting)
yarn emulators

# Or just hosting
firebase serve --only hosting
```

## Troubleshooting

### "Permission denied" errors

1. Verify service account has `roles/firebasehosting.admin`
2. Check WIF binding includes correct repository path
3. Ensure GitHub workflow has `id-token: write` permission

### "Invalid token" errors

1. Verify workload identity provider is correctly configured
2. Check attribute mapping is correct
3. Ensure issuer URI is `https://token.actions.githubusercontent.com`

### Preview URLs not appearing

1. Check PR has write permissions for comments
2. Verify `peter-evans/create-or-update-comment` action is configured correctly
3. Check Firebase preview channel was created successfully

## Security Notes

- Never commit service account JSON keys
- Use Workload Identity Federation exclusively
- Preview deployments are automatically cleaned up after 7 days
- Production deployments require CI to pass first
