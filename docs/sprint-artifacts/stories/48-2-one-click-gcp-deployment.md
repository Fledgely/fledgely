# Story 48.2: One-Click GCP Deployment

## Status: done

## Story

As **a technical user**,
I want **to deploy fledgely with minimal commands**,
So that **setup is straightforward (FR93)**.

## Acceptance Criteria

1. **AC1: Deploys Cloud Run services**
   - Given user has GCP project and Terraform installed
   - When running terraform apply
   - Then deploys Cloud Run service for web application
   - And service is publicly accessible

2. **AC2: Deploys Firestore database**
   - Given terraform apply runs
   - When creating infrastructure
   - Then Firestore database created in Native mode
   - And security rules deployed

3. **AC3: Deploys Cloud Storage buckets**
   - Given terraform apply runs
   - When creating infrastructure
   - Then screenshot storage bucket created
   - And safety documents bucket created
   - And storage rules deployed

4. **AC4: Deploys Cloud Functions**
   - Given terraform apply runs
   - When creating infrastructure
   - Then API Cloud Function deployed
   - And scheduled cleanup function deployed

5. **AC5: Deploys Firebase Auth configuration**
   - Given terraform apply runs
   - When creating infrastructure
   - Then Firebase Auth enabled
   - And Google Sign-In provider configured (manual step documented)

6. **AC6: Deployment Time (NFR51)**
   - Given user runs terraform apply
   - When deployment completes
   - Then total time < 15 minutes

7. **AC7: Outputs URLs and Next Steps**
   - Given deployment completes
   - When viewing terraform output
   - Then shows web application URL
   - And shows API endpoint URL
   - And shows next steps for configuration
   - And shows verification commands

## Tasks / Subtasks

### Task 1: Add Firebase Module [x] DONE

**Files:**

- `terraform/modules/firebase/main.tf` (create)
- `terraform/modules/firebase/variables.tf` (create)
- `terraform/modules/firebase/outputs.tf` (create)

**Implementation:**
1.1 Create Firebase project enablement
1.2 Configure Firebase Auth settings (where possible)
1.3 Document manual Firebase Auth steps

### Task 2: Add Comprehensive Outputs [x] DONE

**Files:**

- `terraform/outputs.tf` (modify)

**Implementation:**
2.1 Add next_steps output with post-deployment instructions
2.2 Add verification_commands output
2.3 Add connection_info output for extension/app configuration

### Task 3: Add Deploy Script [x] DONE

**Files:**

- `terraform/scripts/deploy.sh` (create)
- `terraform/scripts/verify.sh` (create)

**Implementation:**
3.1 Create deploy.sh for one-command deployment
3.2 Create verify.sh for deployment verification
3.3 Add deployment timing measurement

### Task 4: Update Documentation [x] DONE

**Files:**

- `terraform/README.md` (modify)
- `terraform/docs/firebase-setup.md` (create)

**Implementation:**
4.1 Document one-click deployment process
4.2 Document Firebase Auth manual configuration
4.3 Add deployment time expectations

## Dev Notes

### Deployment Flow

```
1. terraform init
2. terraform apply -var="project_id=..."
3. Manual: Configure Firebase Auth in console
4. Manual: Add authorized domains
5. Deploy extension and web app code
```

### Firebase Auth Limitations

Firebase Auth cannot be fully configured via Terraform. Manual steps required:

1. Enable Google Sign-In provider
2. Add authorized domains
3. Obtain Firebase config values (apiKey, appId, etc.)

### Time Budget (NFR51: <15 minutes)

| Step           | Estimated Time  |
| -------------- | --------------- |
| terraform init | 30 seconds      |
| API enablement | 2-3 minutes     |
| IAM creation   | 1-2 minutes     |
| Firestore      | 2-3 minutes     |
| Storage        | 1 minute        |
| Functions      | 3-5 minutes     |
| Cloud Run      | 2-3 minutes     |
| **Total**      | **~12 minutes** |

### References

- [Source: Story 48-1] - Terraform module foundation
- [Firebase Terraform Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/firebase_project)
- [Firebase Console](https://console.firebase.google.com/)

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

- FR93: One-click deployment
- NFR51: Deployment < 15 minutes

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Created Firebase module with google_firebase_project, google_firebase_web_app, and google_identity_platform_config resources
- Firebase Auth Google Sign-In provider requires manual console configuration (documented)
- Updated outputs.tf with comprehensive next_steps and verification_commands
- Created deploy.sh one-click deployment script with NFR51 timing measurement
- Created verify.sh deployment verification script
- Updated README.md with one-click deployment section
- Created firebase-setup.md detailed documentation
- Fixed null_resource trigger to only run once on Firebase project creation

### File List

- `terraform/modules/firebase/main.tf` (created)
- `terraform/modules/firebase/variables.tf` (created)
- `terraform/modules/firebase/outputs.tf` (created)
- `terraform/outputs.tf` (modified)
- `terraform/main.tf` (modified - added firebase module)
- `terraform/scripts/deploy.sh` (created)
- `terraform/scripts/verify.sh` (created)
- `terraform/README.md` (modified)
- `terraform/docs/firebase-setup.md` (created)

## Change Log

| Date       | Change                   |
| ---------- | ------------------------ |
| 2026-01-04 | Story created            |
| 2026-01-04 | Story completed and done |
