# Story 34-6: Agreement Change History

## Story

As **a family member**,
I want **to see the history of agreement changes**,
So that **we can see how our rules have evolved**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Timeline shows all versions with dates when viewing change history
- [x] AC2: Each change shows: who proposed, who accepted, what changed
- [x] AC3: Diff view available for any two versions
- [x] AC4: "We've updated the agreement X times" summary displayed
- [x] AC5: History demonstrates growth and trust-building messaging
- [x] AC6: Export available for records

## Technical Tasks

### Task 1: Agreement History Types and Constants

Create TypeScript types and constants for agreement history.

**Files:**

- `packages/shared/src/contracts/agreementHistory.ts` (new)
- `packages/shared/src/contracts/agreementHistory.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Acceptance Criteria:** AC1, AC2, AC4, AC5

### Task 2: useAgreementHistory Hook

Create a React hook to fetch and manage agreement version history from Firestore.

**Files:**

- `apps/web/src/hooks/useAgreementHistory.ts` (new)
- `apps/web/src/hooks/useAgreementHistory.test.ts` (new)

**Acceptance Criteria:** AC1, AC2

### Task 3: Agreement Diff Utility

Create utility functions to compute and display diffs between agreement versions.

**Files:**

- `apps/web/src/utils/agreementDiff.ts` (new)
- `apps/web/src/utils/agreementDiff.test.ts` (new)

**Acceptance Criteria:** AC3

### Task 4: AgreementHistoryTimeline Component

Create a timeline component showing all agreement versions with dates.

**Files:**

- `apps/web/src/components/agreements/AgreementHistoryTimeline.tsx` (new)
- `apps/web/src/components/agreements/AgreementHistoryTimeline.test.tsx` (new)

**Acceptance Criteria:** AC1, AC2, AC4

### Task 5: AgreementVersionDiff Component

Create a diff view component for comparing two agreement versions.

**Files:**

- `apps/web/src/components/agreements/AgreementVersionDiff.tsx` (new)
- `apps/web/src/components/agreements/AgreementVersionDiff.test.tsx` (new)

**Acceptance Criteria:** AC3

### Task 6: AgreementHistorySummary Component

Create a summary component with growth/trust-building messaging.

**Files:**

- `apps/web/src/components/agreements/AgreementHistorySummary.tsx` (new)
- `apps/web/src/components/agreements/AgreementHistorySummary.test.tsx` (new)

**Acceptance Criteria:** AC4, AC5

### Task 7: Agreement History Export Service

Create service for exporting agreement history to various formats.

**Files:**

- `apps/web/src/services/agreementExportService.ts` (new)
- `apps/web/src/services/agreementExportService.test.ts` (new)

**Acceptance Criteria:** AC6

### Task 8: Integration Tests

Create integration tests for the complete agreement history flow.

**Files:**

- `apps/web/src/components/agreements/__tests__/agreementHistoryIntegration.test.tsx` (new)

**Acceptance Criteria:** All ACs

## Dev Notes

- Agreement versions stored in Firestore subcollection: `families/{familyId}/agreements/{agreementId}/versions`
- Each version includes: proposer, accepter, changes, timestamp, version number
- Diff algorithm should handle nested object changes for agreement sections
- Export formats: JSON, PDF (future), plain text
- Growth messaging should emphasize collaboration and evolution
