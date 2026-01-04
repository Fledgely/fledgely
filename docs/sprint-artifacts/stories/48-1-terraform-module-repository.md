# Story 48.1: Terraform Module Repository

## Status: done

## Story

As **a technical user**,
I want **a public Terraform module for fledgely**,
So that **I can deploy to my own GCP project (FR92)**.

## Acceptance Criteria

1. **AC1: Terraform Module Available**
   - Given user wants to self-host fledgely
   - When accessing deployment resources
   - Then Terraform module available in project repository
   - And module follows Terraform best practices

2. **AC2: Module Structure**
   - Given Terraform module exists
   - When reviewing module structure
   - Then module has standard structure (main.tf, variables.tf, outputs.tf)
   - And modules are organized by resource type

3. **AC3: Comprehensive README**
   - Given Terraform module exists
   - When reading documentation
   - Then comprehensive README with prerequisites
   - And step-by-step deployment instructions
   - And troubleshooting guide

4. **AC4: Required GCP APIs**
   - Given user has GCP project
   - When preparing for deployment
   - Then lists all required GCP APIs to enable
   - And module can auto-enable APIs if permitted

5. **AC5: Minimum Quotas Documented**
   - Given user preparing deployment
   - When reviewing requirements
   - Then documents minimum GCP quotas needed
   - And includes default quota values

6. **AC6: Cost Estimate**
   - Given user evaluating self-hosting
   - When reviewing module
   - Then includes cost estimate for typical usage
   - And breaks down by service

7. **AC7: Apache 2.0 License**
   - Given Terraform module is public
   - When reviewing licensing
   - Then Apache 2.0 license for module
   - And compatible with project license

## Tasks / Subtasks

### Task 1: Create Terraform Directory Structure [x]

**Files:**

- `terraform/` (create directory)
- `terraform/README.md` (create)
- `terraform/main.tf` (create)
- `terraform/variables.tf` (create)
- `terraform/outputs.tf` (create)
- `terraform/versions.tf` (create)

**Implementation:**
1.1 Create terraform directory with standard structure
1.2 Create versions.tf with provider requirements
1.3 Create variables.tf with input variables
1.4 Create outputs.tf with deployment outputs

### Task 2: Create Firestore Module [x]

**Files:**

- `terraform/modules/firestore/main.tf` (create)
- `terraform/modules/firestore/variables.tf` (create)
- `terraform/modules/firestore/outputs.tf` (create)

**Implementation:**
2.1 Create Firestore database resource
2.2 Configure location and mode (Native)
2.3 Set up security rules deployment

### Task 3: Create Cloud Storage Module [x]

**Files:**

- `terraform/modules/storage/main.tf` (create)
- `terraform/modules/storage/variables.tf` (create)
- `terraform/modules/storage/outputs.tf` (create)

**Implementation:**
3.1 Create Cloud Storage bucket for screenshots
3.2 Configure lifecycle policies (retention)
3.3 Set up CORS for web access
3.4 Configure storage class and location

### Task 4: Create Cloud Functions Module [x]

**Files:**

- `terraform/modules/functions/main.tf` (create)
- `terraform/modules/functions/variables.tf` (create)
- `terraform/modules/functions/outputs.tf` (create)

**Implementation:**
4.1 Create Cloud Functions deployment
4.2 Configure runtime and memory
4.3 Set up environment variables
4.4 Configure service account

### Task 5: Create Cloud Run Module (Web App) [x]

**Files:**

- `terraform/modules/cloudrun/main.tf` (create)
- `terraform/modules/cloudrun/variables.tf` (create)
- `terraform/modules/cloudrun/outputs.tf` (create)

**Implementation:**
5.1 Create Cloud Run service for Next.js web app
5.2 Configure container settings
5.3 Set up IAM for public access
5.4 Configure environment variables

### Task 6: Create IAM Module [x]

**Files:**

- `terraform/modules/iam/main.tf` (create)
- `terraform/modules/iam/variables.tf` (create)
- `terraform/modules/iam/outputs.tf` (create)

**Implementation:**
6.1 Create service accounts
6.2 Configure IAM bindings
6.3 Set up Workload Identity (optional)

### Task 7: Create Root Module [x]

**Files:**

- `terraform/main.tf` (modify)

**Implementation:**
7.1 Wire up all child modules
7.2 Configure provider
7.3 Enable required APIs
7.4 Add data sources for project info

### Task 8: Create Documentation [x]

**Files:**

- `terraform/README.md` (modify)
- `terraform/docs/` (create directory)
- `terraform/docs/prerequisites.md` (create)
- `terraform/docs/cost-estimate.md` (create)
- `terraform/docs/troubleshooting.md` (create)

**Implementation:**
8.1 Write comprehensive README
8.2 Document prerequisites
8.3 Create cost estimate document
8.4 Add troubleshooting guide

## Dev Notes

### Infrastructure Components

The fledgely application consists of:

1. **Firestore** - NoSQL database for families, devices, screenshots metadata
2. **Cloud Storage** - Screenshot images storage
3. **Cloud Functions** - Backend API (Node.js)
4. **Cloud Run** - Next.js web application
5. **Firebase Auth** - Authentication (Google Sign-In)

### Terraform Best Practices

- Use modules for reusability
- Define all variables with descriptions and defaults
- Use outputs for important values
- Tag all resources for cost tracking
- Use data sources for existing resources

### GCP APIs Required

```
cloudfunctions.googleapis.com
run.googleapis.com
firestore.googleapis.com
storage.googleapis.com
firebase.googleapis.com
identitytoolkit.googleapis.com
cloudbuild.googleapis.com
secretmanager.googleapis.com
```

### Cost Estimate (Typical Usage)

| Service         | Monthly Estimate                       |
| --------------- | -------------------------------------- |
| Firestore       | $10-50 (depending on reads/writes)     |
| Cloud Storage   | $5-20 (depending on screenshot volume) |
| Cloud Functions | $5-15 (depending on invocations)       |
| Cloud Run       | $10-30 (depending on traffic)          |
| **Total**       | **$30-115/month**                      |

### References

- [Source: firebase.json] - Current Firebase configuration
- [Source: apps/functions] - Cloud Functions source
- [Source: apps/web] - Next.js web application
- [Terraform GCP Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

- FR92: Terraform module for self-deployment
- FR93: One-click deployment
- NFR51: Deployment < 15 minutes

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 8 tasks completed successfully
- Created complete Terraform module with 5 child modules (firestore, storage, functions, cloudrun, iam)
- Root module wires up all child modules with proper dependencies
- Comprehensive documentation: README, prerequisites, cost estimate, troubleshooting
- Module follows Terraform best practices with variables, outputs, and labels
- Auto-enables 15 required GCP APIs
- Apache 2.0 license headers on all files

### File List

**Created Files:**

- `terraform/main.tf` - Root module
- `terraform/variables.tf` - Input variables (30+ configuration options)
- `terraform/outputs.tf` - Deployment outputs
- `terraform/versions.tf` - Provider requirements
- `terraform/README.md` - Comprehensive documentation
- `terraform/docs/prerequisites.md` - GCP prerequisites
- `terraform/docs/cost-estimate.md` - Monthly cost breakdown
- `terraform/docs/troubleshooting.md` - Common issues and solutions
- `terraform/modules/firestore/main.tf` - Firestore database + rules
- `terraform/modules/firestore/variables.tf`
- `terraform/modules/firestore/outputs.tf`
- `terraform/modules/storage/main.tf` - Cloud Storage buckets
- `terraform/modules/storage/variables.tf`
- `terraform/modules/storage/outputs.tf`
- `terraform/modules/functions/main.tf` - Cloud Functions Gen 2
- `terraform/modules/functions/variables.tf`
- `terraform/modules/functions/outputs.tf`
- `terraform/modules/cloudrun/main.tf` - Cloud Run service
- `terraform/modules/cloudrun/variables.tf`
- `terraform/modules/cloudrun/outputs.tf`
- `terraform/modules/iam/main.tf` - Service accounts + IAM
- `terraform/modules/iam/variables.tf`
- `terraform/modules/iam/outputs.tf`

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-01-04 | Story created                          |
| 2026-01-04 | Implementation completed, 8 tasks done |
