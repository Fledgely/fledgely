# Story 48.4: Configuration Variables

## Status: done

## Story

As **a self-hosted user**,
I want **to customize my deployment**,
So that **it fits my family's needs (FR95)**.

## Acceptance Criteria

1. **AC1: GCP Region Configuration**
   - Given deploying with Terraform
   - When setting variables
   - Then configurable: GCP region (default: us-central1)

2. **AC2: Screenshot Retention Configuration**
   - Given deploying with Terraform
   - When setting variables
   - Then configurable: screenshot retention days (default: 90)

3. **AC3: Resource Sizing Configuration**
   - Given deploying with Terraform
   - When setting variables
   - Then configurable: Cloud Run memory/CPU
   - And configurable: Cloud Functions memory
   - And configurable: instance counts

4. **AC4: Backup Schedule Configuration**
   - Given deploying with Terraform
   - When setting variables
   - Then configurable: backup schedule (documented for Epic 49)

5. **AC5: Sensitive Values Protection**
   - Given deploying with Terraform
   - When setting variables
   - Then all sensitive values via terraform.tfvars (gitignored)
   - And terraform.tfvars.example provided

6. **AC6: Validation**
   - Given invalid configuration
   - When running terraform plan
   - Then validation prevents invalid configurations
   - And shows clear error messages

## Tasks / Subtasks

### Task 1: Verify Configuration Variables [x] DONE

**Files:**

- `terraform/variables.tf` (verify)
- `terraform/terraform.tfvars.example` (verify)

**Implementation:**
1.1 Verify region variable with validation
1.2 Verify screenshot_retention_days variable
1.3 Verify resource sizing variables
1.4 Verify terraform.tfvars.example is comprehensive

### Task 2: Document Configuration Options [x] DONE

**Files:**

- `terraform/docs/configuration-guide.md` (create)

**Implementation:**
2.1 Document all configuration variables
2.2 Document validation constraints
2.3 Document recommended settings by use case

## Dev Notes

### Implementation Notes

Configuration variables were implemented in Story 48-1. This story verifies completeness and adds documentation.

### Available Variables

| Variable                  | Default     | Description                   |
| ------------------------- | ----------- | ----------------------------- |
| project_id                | (required)  | GCP project ID                |
| region                    | us-central1 | GCP region                    |
| environment               | production  | Environment name              |
| screenshot_retention_days | 90          | Screenshot retention          |
| functions_memory          | 256         | Cloud Functions memory (MB)   |
| cloudrun_memory           | 512Mi       | Cloud Run memory              |
| cloudrun_cpu              | 1           | Cloud Run CPU                 |
| cloudrun_max_instances    | 10          | Max Cloud Run instances       |
| functions_max_instances   | 100         | Max Cloud Functions instances |

### References

- [Source: Story 48-1] - Terraform module foundation
- [Terraform Variables](https://developer.hashicorp.com/terraform/language/values/variables)

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

- FR95: Configuration customization

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All configuration variables implemented in Story 48-1
- Validation blocks present for region, environment, memory, retention
- terraform.tfvars.example created with all options
- Created configuration-guide.md documentation

### File List

- `terraform/variables.tf` (verified)
- `terraform/terraform.tfvars.example` (verified)
- `terraform/docs/configuration-guide.md` (created)

## Change Log

| Date       | Change                 |
| ---------- | ---------------------- |
| 2026-01-04 | Story created and done |
