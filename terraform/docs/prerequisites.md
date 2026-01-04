# Fledgely Terraform Prerequisites

Before deploying Fledgely, ensure you have the following prerequisites in place.

## 1. GCP Project

You need a Google Cloud Platform project with billing enabled.

### Create a new project

```bash
# Create project
gcloud projects create my-fledgely-project --name="Fledgely"

# Enable billing (required)
gcloud billing accounts list
gcloud billing projects link my-fledgely-project --billing-account=BILLING_ACCOUNT_ID
```

### Use an existing project

```bash
# Set your project ID
gcloud config set project my-fledgely-project
```

## 2. Terraform

Install Terraform version 1.5.0 or later.

### macOS

```bash
brew install terraform
```

### Linux

```bash
# Download and install
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

### Windows

```powershell
choco install terraform
```

### Verify installation

```bash
terraform version
# Should show: Terraform v1.5.0 or later
```

## 3. Google Cloud CLI

Install and authenticate the gcloud CLI.

### Installation

See [Google Cloud SDK Installation](https://cloud.google.com/sdk/docs/install)

### Authentication

```bash
# Login with your Google account
gcloud auth login

# Set application default credentials (required for Terraform)
gcloud auth application-default login

# Set your project
gcloud config set project my-fledgely-project
```

## 4. Required GCP APIs

The following APIs are required. By default, Terraform will enable them automatically when `enable_apis = true`.

| API                                   | Description       |
| ------------------------------------- | ----------------- |
| `cloudfunctions.googleapis.com`       | Cloud Functions   |
| `run.googleapis.com`                  | Cloud Run         |
| `firestore.googleapis.com`            | Firestore         |
| `storage.googleapis.com`              | Cloud Storage     |
| `firebase.googleapis.com`             | Firebase          |
| `identitytoolkit.googleapis.com`      | Firebase Auth     |
| `cloudbuild.googleapis.com`           | Cloud Build       |
| `secretmanager.googleapis.com`        | Secret Manager    |
| `cloudresourcemanager.googleapis.com` | Resource Manager  |
| `iam.googleapis.com`                  | IAM               |
| `compute.googleapis.com`              | Compute Engine    |
| `artifactregistry.googleapis.com`     | Artifact Registry |
| `pubsub.googleapis.com`               | Pub/Sub           |
| `cloudscheduler.googleapis.com`       | Cloud Scheduler   |
| `firebaserules.googleapis.com`        | Firebase Rules    |

### Manual API enablement

If you prefer to enable APIs manually:

```bash
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  firebase.googleapis.com \
  identitytoolkit.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iam.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  cloudscheduler.googleapis.com \
  firebaserules.googleapis.com
```

## 5. IAM Permissions

The user or service account running Terraform needs the following roles:

- `roles/owner` (recommended for initial deployment)

Or these specific roles:

- `roles/editor` - General resource management
- `roles/iam.serviceAccountAdmin` - Create service accounts
- `roles/iam.securityAdmin` - Manage IAM bindings
- `roles/firebase.admin` - Firebase resources
- `roles/datastore.owner` - Firestore management
- `roles/storage.admin` - Cloud Storage management

### Grant permissions

```bash
# For a user
gcloud projects add-iam-policy-binding my-fledgely-project \
  --member="user:you@example.com" \
  --role="roles/owner"

# For a service account
gcloud projects add-iam-policy-binding my-fledgely-project \
  --member="serviceAccount:terraform@my-fledgely-project.iam.gserviceaccount.com" \
  --role="roles/owner"
```

## 6. Quotas

Ensure your project has sufficient quotas:

| Resource              | Minimum Required | Default Quota |
| --------------------- | ---------------- | ------------- |
| Cloud Functions       | 1                | 1000          |
| Cloud Run Services    | 1                | 1000          |
| Firestore Databases   | 1                | 1             |
| Cloud Storage Buckets | 3                | Unlimited     |
| Service Accounts      | 3                | 100           |

### Check quotas

```bash
gcloud compute project-info describe --project my-fledgely-project
```

## 7. Firebase Setup

Firebase needs to be initialized for the project.

### Enable Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Select your existing GCP project
4. Follow the wizard to enable Firebase

### Configure Firebase Auth

1. In Firebase Console, go to Authentication > Sign-in method
2. Enable "Google" provider
3. Add your authorized domains

## 8. Network Requirements

Terraform needs network access to:

- `*.googleapis.com` - GCP APIs
- `registry.terraform.io` - Terraform provider downloads
- `releases.hashicorp.com` - Terraform updates

## Verification Checklist

Before running `terraform apply`, verify:

- [ ] GCP project exists and has billing enabled
- [ ] Terraform 1.5.0+ installed
- [ ] gcloud CLI authenticated
- [ ] Application default credentials set
- [ ] Sufficient IAM permissions
- [ ] Firebase enabled for the project
- [ ] Network access to required domains

## Next Steps

Once prerequisites are met:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```
