# Story 37-4: Automatic Monitoring Reduction

## Story

As **a child with sustained high trust**,
I want **monitoring to automatically reduce**,
So that **my developmental rights are honored, not just offered**.

## Status: Done

## Acceptance Criteria

- [x] AC1: 95%+ trust for 6 months triggers automatic reduction
- [x] AC2: Reduction is AUTOMATIC, not optional
- [x] AC3: Parent notified: "Your child's demonstrated maturity means reduced monitoring"
- [x] AC4: Parent cannot override without child agreement
- [x] AC5: Both parties celebrate: "6 months of trust - monitoring reducing"
- [x] AC6: Sets expectation of eventual graduation

## Technical Tasks

### Task 1: AutomaticReduction Data Model

Create data model for automatic monitoring reduction.

**Files:**

- `packages/shared/src/contracts/automaticReduction.ts` (new)
- `packages/shared/src/contracts/automaticReduction.test.ts` (new)

**Types:**

```typescript
interface AutomaticReductionConfig {
  childId: string
  eligibleAt: Date | null
  appliedAt: Date | null
  overrideRequested: boolean
  overrideAgreedByChild: boolean
  graduationPathStarted: boolean
}

// FR37A requirement
const AUTOMATIC_REDUCTION_TRUST_THRESHOLD = 95
const AUTOMATIC_REDUCTION_DURATION_MONTHS = 6
```

**Acceptance Criteria:** AC1, AC2

### Task 2: AutomaticReductionService

Create service for managing automatic reduction lifecycle.

**Files:**

- `packages/shared/src/services/automaticReductionService.ts` (new)
- `packages/shared/src/services/automaticReductionService.test.ts` (new)

**Functions:**

```typescript
function isEligibleForAutomaticReduction(trustScore: number, monthsAtThreshold: number): boolean
function applyAutomaticReduction(childId: string): AutomaticReductionResult
function requestOverride(childId: string, parentReason: string): OverrideRequest
function respondToOverride(childId: string, childAgreed: boolean): OverrideResult
```

**Acceptance Criteria:** AC1, AC2, AC4

### Task 3: AutomaticReductionNotification Component

Create notification components for automatic reduction.

**Files:**

- `apps/web/src/components/milestones/AutomaticReductionNotification.tsx` (new)
- `apps/web/src/components/milestones/AutomaticReductionNotification.test.tsx` (new)

**Features:**

- Parent notification with developmental messaging (AC3)
- Child celebration with graduation expectation (AC5, AC6)
- Override request and agreement flow (AC4)

**Acceptance Criteria:** AC3, AC4, AC5, AC6

### Task 4: Integration Tests

Create integration tests for automatic reduction system.

**Files:**

- `apps/web/src/components/milestones/__tests__/automaticReduction.integration.test.tsx` (new)

**Test Scenarios:**

- Eligibility at 6 months
- Automatic application
- Override request and child agreement flow
- Graduation path initiation
- Messaging for all parties

**Acceptance Criteria:** All ACs

## Dev Notes

### FR37A Requirement

"At 95%+ trust for 6 months, monitoring AUTOMATICALLY reduces (not optional) - developmental rights must be honored"

This is different from Story 37-3 notification-only mode which is at 30 days. This story requires:

- 6 months sustained trust (vs 30 days)
- AUTOMATIC reduction (not parent-initiated)
- Parent cannot unilaterally override

### Override Agreement

Parent can request override only if:

1. They provide a reason
2. Child agrees to the override
3. Override is logged for transparency

### Graduation Path

Once automatic reduction applies:

- System shows "graduation path" indicator
- Both parties see timeline to full independence
- Sets clear expectation monitoring will eventually end

### References

- [Source: packages/shared/src/contracts/notificationOnlyMode.ts] - Notification-only prerequisites
- [Source: packages/shared/src/services/notificationOnlyModeService.ts] - Mode service patterns
