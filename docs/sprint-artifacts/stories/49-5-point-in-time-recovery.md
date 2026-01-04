# Story 49.5: Point-in-Time Recovery

## Status: done

## Story

As **a self-hosted user**,
I want **to restore to a specific point in time**,
So that **I can recover from accidental deletions**.

## Acceptance Criteria

1. **AC1: Time Selection**
   - Given Firestore point-in-time recovery enabled
   - When restore needed
   - Then can select any time in last 7 days

2. **AC2: Minute-Level Precision**
   - Given time selection
   - When choosing restore point
   - Then granularity is minute-level precision

3. **AC3: Preview**
   - Given restore point selected
   - When reviewing
   - Then shows what data existed at that time

4. **AC4: Collection Selection**
   - Given restore point selected
   - When restoring
   - Then can restore entire database or specific collections

5. **AC5: Original Preserved**
   - Given restore initiated
   - When in progress
   - Then original data preserved until confirmed

6. **AC6: Use Cases**
   - Accidental deletion recovery
   - Data corruption recovery

7. **AC7: GCP Tier Requirement**
   - PITR requires GCP support (not all tiers)
   - Documented in backup-guide.md

## Implementation Notes

GCP Firestore Point-in-Time Recovery is a native feature that must be
enabled in the Firebase/GCP console. Documentation provided in backup-guide.md
explains how to use this feature.

## Dev Agent Record

### Context Reference

Epic 49: Self-Hosted Backups & Restore

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

1. Point-in-Time Recovery is a GCP native feature
2. Must be enabled in Firebase/GCP console
3. Documentation added to backup-guide.md explaining:
   - How PITR works with Firestore
   - Command to restore from specific point
   - GCP tier requirements

### File List

- `terraform/docs/backup-guide.md` (contains PITR documentation)

## Change Log

| Date       | Change                                                            |
| ---------- | ----------------------------------------------------------------- |
| 2026-01-04 | Story created and marked complete (documented in backup-guide.md) |
