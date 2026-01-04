# Fledgely Terraform Module

Deploy Fledgely to your own GCP project using Terraform.

## Overview

This Terraform module deploys the complete Fledgely infrastructure to Google Cloud Platform:

- **Firestore** - NoSQL database for families, devices, and screenshot metadata
- **Cloud Storage** - Screenshot image storage with lifecycle policies
- **Cloud Functions** - API backend (Node.js)
- **Cloud Run** - Next.js web application
- **Firebase Auth** - Google Sign-In authentication
- **IAM** - Service accounts with least-privilege permissions

## One-Click Deployment

The fastest way to deploy Fledgely:

```bash
cd terraform
./scripts/deploy.sh [project_id] [region]
```

The script will:

1. Check prerequisites (Terraform, gcloud)
2. Create configuration from inputs
3. Initialize and plan deployment
4. Apply infrastructure (~10-15 minutes)
5. Show next steps for Firebase Auth setup

After deployment, verify with:

```bash
./scripts/verify.sh
```

## Manual Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/fledgely.git
cd fledgely/terraform

# 2. Initialize Terraform
terraform init

# 3. Create configuration file
cat > terraform.tfvars << 'EOF'
project_id = "your-gcp-project-id"
region     = "us-central1"
EOF

# 4. Review the deployment plan
terraform plan

# 5. Deploy
terraform apply
```

## Prerequisites

See [docs/prerequisites.md](docs/prerequisites.md) for detailed requirements:

- GCP Project with billing enabled
- Terraform >= 1.5.0
- gcloud CLI authenticated
- Required GCP APIs (auto-enabled by default)

## Configuration

### Required Variables

| Variable     | Description    | Example               |
| ------------ | -------------- | --------------------- |
| `project_id` | GCP project ID | `my-fledgely-project` |

### Optional Variables

| Variable                    | Default       | Description                   |
| --------------------------- | ------------- | ----------------------------- |
| `region`                    | `us-central1` | GCP region for deployment     |
| `environment`               | `production`  | Environment name              |
| `enable_apis`               | `true`        | Auto-enable required GCP APIs |
| `screenshot_retention_days` | `90`          | Days to retain screenshots    |
| `functions_memory`          | `256`         | Cloud Functions memory (MB)   |
| `cloudrun_max_instances`    | `10`          | Max Cloud Run instances       |

See [variables.tf](variables.tf) for all configuration options.

## Module Structure

```
terraform/
├── main.tf           # Root module - wires everything together
├── variables.tf      # Input variables
├── outputs.tf        # Deployment outputs
├── versions.tf       # Provider requirements
├── README.md         # This file
├── scripts/
│   ├── deploy.sh     # One-click deployment script
│   └── verify.sh     # Deployment verification script
├── docs/
│   ├── prerequisites.md
│   ├── cost-estimate.md
│   ├── firebase-setup.md
│   └── troubleshooting.md
└── modules/
    ├── firestore/    # Firestore database + security rules
    ├── storage/      # Cloud Storage bucket + rules
    ├── functions/    # Cloud Functions Gen 2
    ├── cloudrun/     # Cloud Run service
    ├── firebase/     # Firebase project + auth configuration
    └── iam/          # Service accounts + IAM bindings
```

## Outputs

After deployment, Terraform outputs important information:

```bash
terraform output
```

Key outputs:

- `web_app_url` - URL of the deployed web application
- `functions_url` - API endpoint URL
- `storage_bucket_name` - Screenshot storage bucket
- `deployment_summary` - Complete deployment summary

## Cost Estimate

Estimated monthly cost for typical usage: **$30-115/month**

See [docs/cost-estimate.md](docs/cost-estimate.md) for detailed breakdown.

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common issues.

## Custom Domain

To use a custom domain:

```hcl
custom_domain = "app.yourdomain.com"
enable_ssl    = true
```

You'll need to verify domain ownership and configure DNS records.

## CI/CD Integration

Enable Cloud Build for automatic deployments:

```hcl
enable_ci_cd   = true
github_owner   = "your-org"
github_repo    = "fledgely"
```

## Security

- All resources use least-privilege IAM bindings
- Firestore and Storage security rules are deployed automatically
- Service accounts are created with minimal required permissions
- Public access prevention is enforced on storage buckets

## License

Apache 2.0 - See [LICENSE](../LICENSE) for details.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
