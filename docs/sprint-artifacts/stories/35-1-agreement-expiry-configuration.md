# Story 35-1: Agreement Expiry Configuration

## Story

As **a parent**,
I want **to set an agreement expiry date**,
So that **we regularly revisit our monitoring arrangement**.

## Status: Draft

## Acceptance Criteria

- [ ] AC1: Expiry options: 3 months, 6 months, 1 year, "No expiry"
- [ ] AC2: Recommended: 6 months for younger children, 1 year for teens
- [ ] AC3: Expiry date shown prominently in agreement view
- [ ] AC4: "No expiry" still prompts annual review reminder
- [ ] AC5: Expiry date can be changed via agreement modification (Epic 34)
- [ ] AC6: Child sees when agreement expires

## Technical Tasks

### Task 1: Expiry Types and Constants

Create TypeScript types and constants for agreement expiry configuration.

**Files:**

- `packages/shared/src/contracts/agreementExpiry.ts` (new)
- `packages/shared/src/contracts/agreementExpiry.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Acceptance Criteria:** AC1, AC2

### Task 2: ExpiryDateSelector Component

Create a component for selecting agreement expiry dates.

**Files:**

- `apps/web/src/components/agreements/ExpiryDateSelector.tsx` (new)
- `apps/web/src/components/agreements/ExpiryDateSelector.test.tsx` (new)

**Acceptance Criteria:** AC1, AC2

### Task 3: AgreementExpiryDisplay Component

Create a component for displaying expiry date prominently.

**Files:**

- `apps/web/src/components/agreements/AgreementExpiryDisplay.tsx` (new)
- `apps/web/src/components/agreements/AgreementExpiryDisplay.test.tsx` (new)

**Acceptance Criteria:** AC3, AC6

### Task 4: useAgreementExpiry Hook

Create a hook for managing expiry date state and calculations.

**Files:**

- `apps/web/src/hooks/useAgreementExpiry.ts` (new)
- `apps/web/src/hooks/useAgreementExpiry.test.ts` (new)

**Acceptance Criteria:** AC1, AC4, AC5

### Task 5: Expiry Service

Create service for calculating and validating expiry dates.

**Files:**

- `apps/web/src/services/expiryService.ts` (new)
- `apps/web/src/services/expiryService.test.ts` (new)

**Acceptance Criteria:** AC1, AC2, AC4

### Task 6: Integration Tests

Create integration tests for the complete expiry configuration flow.

**Files:**

- `apps/web/src/components/agreements/__tests__/expiryConfigurationIntegration.test.tsx` (new)

**Acceptance Criteria:** All ACs

## Dev Notes

- Expiry durations: 3 months, 6 months, 1 year, "no expiry"
- Age-based recommendations:
  - Children under 13: 6 months recommended
  - Teens 13+: 1 year recommended
- "No expiry" triggers annual review reminder at 1 year mark
- Expiry date stored in agreement document in Firestore
- Integrate with Epic 34 agreement modification flow
