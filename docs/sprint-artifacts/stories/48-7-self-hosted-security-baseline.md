# Story 48.7: Self-Hosted Security Baseline

## Status: done

## Story

As **a self-hosted user**,
I want **secure defaults in my deployment**,
So that **my family's data is protected**.

## Acceptance Criteria

1. **AC1: Data Encryption at Rest**
   - Given Terraform deployment
   - When reviewing security posture
   - Then all data encrypted at rest (default)

2. **AC2: Data Encryption in Transit**
   - Given Terraform deployment
   - When reviewing security posture
   - Then all traffic encrypted in transit (TLS 1.3)

3. **AC3: IAM Least Privilege**
   - Given Terraform deployment
   - When reviewing security posture
   - Then IAM follows least privilege

4. **AC4: No Public Firestore**
   - Given Terraform deployment
   - When reviewing security posture
   - Then no public Firestore access

5. **AC5: Authenticated Cloud Run**
   - Given Terraform deployment
   - When reviewing security posture
   - Then Cloud Run requires authentication (Firebase Auth)

6. **AC6: Minimal Service Account Permissions**
   - Given Terraform deployment
   - When reviewing security posture
   - Then service accounts have minimal permissions

7. **AC7: Security Checklist**
   - Given deployment documentation
   - When reviewing security
   - Then security checklist in documentation

## Tasks / Subtasks

### Task 1: Create Security Documentation [x] DONE

**Files:**

- `terraform/docs/security-guide.md` (create)

**Implementation:**
1.1 Document encryption at rest
1.2 Document encryption in transit
1.3 Document IAM configuration
1.4 Document Firestore security
1.5 Create security checklist

### Task 2: Verify Security Configuration [x] DONE

**Files:**

- `terraform/modules/iam/main.tf` (verify)
- `terraform/modules/firestore/main.tf` (verify)

**Implementation:**
2.1 Verify least privilege IAM roles
2.2 Verify Firestore security rules

## Dev Notes

### Security Features Implemented

| Feature             | Implementation              |
| ------------------- | --------------------------- |
| Encryption at rest  | GCP default (all services)  |
| TLS in transit      | Cloud Run enforces HTTPS    |
| IAM least privilege | Custom service accounts     |
| Firestore security  | Security rules deployed     |
| Storage security    | Uniform bucket-level access |

### Service Account Roles

- `fledgely-functions-sa`: Cloud Functions invoker, Firestore user, Storage object admin
- `fledgely-cloudrun-sa`: Cloud Run invoker

### References

- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)
- [Cloud Run Security](https://cloud.google.com/run/docs/securing/managing-access)

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All security defaults already configured in Terraform modules
- Created comprehensive security-guide.md documentation
- Security checklist included in documentation

### File List

- `terraform/docs/security-guide.md` (created)
- `terraform/modules/iam/main.tf` (verified)
- `terraform/modules/firestore/main.tf` (verified)

## Change Log

| Date       | Change                 |
| ---------- | ---------------------- |
| 2026-01-04 | Story created and done |
