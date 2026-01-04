# Story 48.3: Custom Domain Configuration

## Status: done

## Story

As **a self-hosted user**,
I want **to use my own domain**,
So that **my family uses fledgely.myfamily.com (FR94)**.

## Acceptance Criteria

1. **AC1: Custom Domain Variable**
   - Given Terraform deployment complete
   - When configuring custom domain
   - Then variable: `custom_domain = "fledgely.myfamily.com"`

2. **AC2: SSL Certificate Provisioning**
   - Given custom domain configured
   - When Terraform applies
   - Then automatically provisions SSL certificate
   - And HTTPS enforced (no HTTP)

3. **AC3: Cloud Run Domain Mapping**
   - Given custom domain configured
   - When Terraform applies
   - Then configures Cloud Run domain mapping
   - And domain routes to web application

4. **AC4: DNS Records Output**
   - Given domain mapping created
   - When viewing Terraform outputs
   - Then provides DNS records to add
   - And shows record type (CNAME/A)
   - And shows record values

5. **AC5: Domain Verification**
   - Given DNS records added
   - When Cloud Run verifies
   - Then verifies DNS configuration
   - And shows verification status

6. **AC6: Domain Support**
   - Given custom domain feature
   - When using different domain types
   - Then supports subdomains
   - And supports apex domains

## Tasks / Subtasks

### Task 1: Add DNS Records Output [x] DONE

**Files:**

- `terraform/modules/cloudrun/outputs.tf` (modify)
- `terraform/outputs.tf` (modify)

**Implementation:**
1.1 Add dns_records output to cloudrun module
1.2 Expose dns_records in root outputs

### Task 2: Add Custom Domain Documentation [x] DONE

**Files:**

- `terraform/docs/custom-domain-setup.md` (create)

**Implementation:**
2.1 Document custom domain configuration
2.2 Document DNS record setup
2.3 Document verification process

## Dev Notes

### Implementation Notes

Custom domain support was implemented in Story 48-1 via the cloudrun module. This story adds:

- DNS records output for user guidance
- Detailed documentation

### Cloud Run Domain Mapping

Cloud Run automatically provisions managed SSL certificates when domain mapping is created.
The SSL cert is provisioned after DNS verification succeeds.

### References

- [Cloud Run Domain Mapping](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Source: Story 48-1] - Terraform module foundation

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

- FR94: Own Firebase project with custom domain
- FR95: Custom domain support

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Custom domain variable already implemented in Story 48-1
- SSL/HTTPS enforced by Cloud Run domain mapping
- Added dns_records output to cloudrun module
- Added custom_domain_dns_records output to root
- Created custom-domain-setup.md documentation

### File List

- `terraform/modules/cloudrun/outputs.tf` (modified)
- `terraform/outputs.tf` (modified)
- `terraform/docs/custom-domain-setup.md` (created)

## Change Log

| Date       | Change                 |
| ---------- | ---------------------- |
| 2026-01-04 | Story created and done |
