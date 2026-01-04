# Story 48.6: Self-Hosted Update Process

## Status: done

## Story

As **a self-hosted user**,
I want **to update my fledgely instance**,
So that **I get new features and security fixes (FR96)**.

## Acceptance Criteria

1. **AC1: Update Workflow**
   - Given new fledgely version released
   - When updating self-hosted instance
   - Then git pull + terraform apply workflow

2. **AC2: Database Migrations**
   - Given update includes data changes
   - When applying updates
   - Then database migrations run automatically

3. **AC3: Zero-Downtime Updates**
   - Given update in progress
   - When Cloud Run deploys new version
   - Then zero-downtime updates (rolling deployment)

4. **AC4: Rollback Instructions**
   - Given update causes issues
   - When needing to revert
   - Then rollback instructions provided

5. **AC5: Changelog Highlights**
   - Given new version available
   - When reviewing changes
   - Then changelog highlights breaking changes

6. **AC6: Update Time (NFR86)**
   - Given update process runs
   - When applying changes
   - Then update completes in <10 minutes

7. **AC7: Release Notifications**
   - Given new version released
   - When monitoring releases
   - Then email notification option documented

## Tasks / Subtasks

### Task 1: Create Update Script [x] DONE

**Files:**

- `terraform/scripts/update.sh` (create)

**Implementation:**
1.1 Create update.sh with git pull and terraform apply
1.2 Add pre-update backup recommendation
1.3 Add update timing measurement

### Task 2: Create Rollback Script [x] DONE

**Files:**

- `terraform/scripts/rollback.sh` (create)

**Implementation:**
2.1 Create rollback script with instructions
2.2 Document rollback procedure

### Task 3: Create Update Documentation [x] DONE

**Files:**

- `terraform/docs/update-guide.md` (create)

**Implementation:**
3.1 Document update workflow
3.2 Document rollback procedure
3.3 Document release notification options

## Dev Notes

### Update Process

1. `git fetch && git pull` - Get latest changes
2. `terraform plan` - Review changes
3. `terraform apply` - Apply infrastructure changes
4. Cloud Run auto-deploys new container via CI/CD

### Zero-Downtime Deployment

Cloud Run provides zero-downtime deployments via:

- Gradual traffic migration to new revision
- Health checks before routing traffic
- Automatic rollback if health checks fail

### References

- [Source: Story 48-1] - Terraform module foundation
- [Cloud Run Revisions](https://cloud.google.com/run/docs/managing/revisions)

## Dev Agent Record

### Context Reference

Epic 48: Self-Hosted Terraform Deployment

- FR96: Upgrade documentation
- NFR86: Update completes in <10 minutes

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Created update.sh script with timing measurement
- Created rollback.sh script with instructions
- Created update-guide.md documentation
- Documented GitHub release notification options

### File List

- `terraform/scripts/update.sh` (created)
- `terraform/scripts/rollback.sh` (created)
- `terraform/docs/update-guide.md` (created)

## Change Log

| Date       | Change                 |
| ---------- | ---------------------- |
| 2026-01-04 | Story created and done |
