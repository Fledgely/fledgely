# Story 49.2: Screenshot Storage Backup

## Status: done

## Story

As **a self-hosted user**,
I want **screenshots backed up separately**,
So that **images are preserved with data**.

## Acceptance Criteria

1. **AC1: Versioning Enabled**
   - Given screenshots stored in Cloud Storage
   - When backup runs
   - Then screenshot bucket uses versioning

2. **AC2: Lifecycle Policy**
   - Given screenshots accumulate
   - When lifecycle policy runs
   - Then old versions move to Nearline storage
   - And configurable delete after X days

3. **AC3: Backup Includes**
   - Given backup runs
   - When export completes
   - Then backup includes original screenshots
   - And backup includes thumbnails

4. **AC4: Storage Optimization (NFR54)**
   - Given lifecycle rules applied
   - When storage costs monitored
   - Then costs optimized with lifecycle rules

5. **AC5: Data-Only Option**
   - Given backup configuration
   - When configured
   - Then can exclude screenshots from backup

6. **AC6: Size Reporting**
   - Given backup runs
   - When viewing dashboard
   - Then backup size reported

## Tasks / Subtasks

### Task 1: Update Storage Module for Versioning

**Files:**

- `terraform/modules/storage/main.tf` (modify)

**Implementation:**
1.1 Enable versioning on screenshot bucket
1.2 Add lifecycle rule to move to Nearline after 30 days
1.3 Add lifecycle rule for version cleanup

### Task 2: Add Screenshot Backup Configuration

**Files:**

- `terraform/variables.tf` (modify)
- `terraform/modules/storage/variables.tf` (modify)

**Implementation:**
2.1 Add screenshot_versioning_enabled variable
2.2 Add screenshot_archive_days variable
2.3 Add screenshot_backup_enabled variable

### Task 3: Document Screenshot Backup

**Files:**

- `terraform/docs/backup-guide.md` (modify)

**Implementation:**
3.1 Add screenshot backup section
3.2 Document lifecycle policies
3.3 Document cost optimization

## Dev Agent Record

### Context Reference

Epic 49: Self-Hosted Backups & Restore

- NFR54: Storage costs optimized

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

1. Updated storage module with:
   - NEARLINE lifecycle transition (archive_after_days)
   - Configurable non-current version retention
   - Cost optimization through storage class transitions

2. Added root-level variables:
   - screenshot_versioning_enabled (default: true)
   - screenshot_archive_days (default: 30)

3. Updated backup documentation with screenshot backup section

### File List

- `terraform/modules/storage/main.tf` (modified - added NEARLINE transition)
- `terraform/modules/storage/variables.tf` (modified - added archive variables)
- `terraform/main.tf` (modified - passing new variables)
- `terraform/variables.tf` (modified - added screenshot backup variables)
- `terraform/docs/backup-guide.md` (modified - added screenshot section)

## Change Log

| Date       | Change                                                        |
| ---------- | ------------------------------------------------------------- |
| 2026-01-04 | Story created                                                 |
| 2026-01-04 | Story completed - NEARLINE transition and documentation added |
