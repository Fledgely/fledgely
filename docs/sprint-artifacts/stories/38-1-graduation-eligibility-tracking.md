# Story 38-1: Graduation Eligibility Tracking

## Story

As **the system**,
I want **to track graduation eligibility**,
So that **children can see their path to independence**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Eligibility requires 100% trust score maintained for 12 consecutive months (FR38A)
- [x] AC2: Progress visible to child: "9 months at 100% trust - 3 months to graduation eligibility"
- [x] AC3: Child sees clear path to end of monitoring
- [x] AC4: Parent sees same progress information (transparency)
- [x] AC5: Eligibility doesn't mean automatic graduation - triggers conversation
- [x] AC6: Progress display motivates sustained responsible behavior

## Implementation Summary

**Test Coverage:** 217 tests (136 shared + 81 web)

### Files Created

**Shared Package:**

- `packages/shared/src/contracts/graduationEligibility.ts` (60 tests)
- `packages/shared/src/services/graduationEligibilityService.ts` (39 tests)
- `packages/shared/src/services/graduationProgressMessageService.ts` (37 tests)

**Web Package:**

- `apps/web/src/components/graduation/GraduationProgressIndicator.tsx` (29 tests)
- `apps/web/src/components/graduation/GraduationPathExplainer.tsx` (31 tests)
- `apps/web/src/components/graduation/graduation.integration.test.tsx` (21 tests)
- `apps/web/src/components/graduation/index.ts`

## Technical Tasks

### Task 1: GraduationEligibility Data Model

Create Zod schemas and types for graduation eligibility tracking.

**Files:**

- `packages/shared/src/contracts/graduationEligibility.ts` (new)
- `packages/shared/src/contracts/graduationEligibility.test.ts` (new)

**Types:**

```typescript
interface GraduationEligibilityConfig {
  trustScoreThreshold: number // 100 (perfect trust)
  durationMonths: number // 12 months required
  checkInterval: 'daily' | 'weekly'
}

interface GraduationEligibilityStatus {
  childId: string
  currentTrustScore: number
  monthsAtPerfectTrust: number
  eligibilityDate: Date | null // When child will become eligible
  isEligible: boolean
  progressPercentage: number // 0-100
  streakStartDate: Date | null
  lastCheckedAt: Date
}

// FR38A requirement
const GRADUATION_TRUST_THRESHOLD = 100
const GRADUATION_DURATION_MONTHS = 12
```

**Acceptance Criteria:** AC1

### Task 2: GraduationEligibilityService

Create service for tracking and calculating graduation eligibility.

**Files:**

- `packages/shared/src/services/graduationEligibilityService.ts` (new)
- `packages/shared/src/services/graduationEligibilityService.test.ts` (new)

**Functions:**

```typescript
// Check if child meets eligibility requirements
function checkGraduationEligibility(
  childId: string,
  trustScoreHistory: TrustScoreHistory[]
): GraduationEligibilityStatus

// Calculate months at perfect trust
function calculateMonthsAtPerfectTrust(
  trustScoreHistory: TrustScoreHistory[],
  threshold: number
): number

// Calculate progress percentage toward graduation
function calculateGraduationProgress(monthsAtPerfect: number): number

// Get eligibility date projection
function projectEligibilityDate(currentMonths: number, requiredMonths: number): Date | null

// Check if streak was broken
function checkStreakContinuity(
  trustScoreHistory: TrustScoreHistory[],
  threshold: number
): { streakBroken: boolean; breakDate: Date | null }
```

**Acceptance Criteria:** AC1, AC5

### Task 3: GraduationProgressMessage Service

Create service for generating progress messages for both viewers.

**Files:**

- `packages/shared/src/services/graduationProgressMessageService.ts` (new)
- `packages/shared/src/services/graduationProgressMessageService.test.ts` (new)

**Functions:**

```typescript
// Get progress message for child
function getChildProgressMessage(status: GraduationEligibilityStatus): string
// Example: "9 months at 100% trust - 3 months to graduation eligibility"

// Get progress message for parent
function getParentProgressMessage(status: GraduationEligibilityStatus, childName: string): string

// Get milestone celebration messages
function getMilestoneMessage(monthsCompleted: number, viewerType: ViewerType): string | null

// Get motivational message
function getMotivationalMessage(status: GraduationEligibilityStatus, viewerType: ViewerType): string
```

**Acceptance Criteria:** AC2, AC3, AC4, AC6

### Task 4: GraduationProgressIndicator Component

Create UI component showing graduation progress.

**Files:**

- `apps/web/src/components/graduation/GraduationProgressIndicator.tsx` (new)
- `apps/web/src/components/graduation/GraduationProgressIndicator.test.tsx` (new)

**Props:**

```typescript
interface GraduationProgressIndicatorProps {
  eligibilityStatus: GraduationEligibilityStatus
  childName: string
  viewerType: ViewerType
  onLearnMore?: () => void
}
```

**Features:**

- Visual progress bar showing months toward 12-month goal
- Progress text: "9 months at 100% trust - 3 months to go"
- Milestone markers at 3, 6, 9, 12 months
- Different styling for child vs parent view
- Celebratory animations at milestones
- Clear "path to independence" messaging for child

**Acceptance Criteria:** AC2, AC3, AC4, AC6

### Task 5: GraduationPathExplainer Component

Create component explaining what graduation means.

**Files:**

- `apps/web/src/components/graduation/GraduationPathExplainer.tsx` (new)
- `apps/web/src/components/graduation/GraduationPathExplainer.test.tsx` (new)

**Features:**

- Explains what graduation means (end of monitoring)
- Shows requirements (100% trust for 12 months)
- Clarifies eligibility triggers conversation, not automatic graduation
- Uses developmental framing from Epic 37

**Acceptance Criteria:** AC3, AC5

### Task 6: Integration Tests

Create integration tests for complete graduation eligibility system.

**Files:**

- `apps/web/src/components/graduation/__tests__/graduationEligibility.integration.test.tsx` (new)

**Test Scenarios:**

- Child at 0 months shows full 12-month path
- Child at 6 months shows 50% progress, 6 months remaining
- Child at 11 months shows 91.7% progress, 1 month remaining
- Child reaches 12 months, becomes eligible, conversation triggered
- Streak break resets counter appropriately
- Both child and parent see same progress data
- Milestone celebrations at 3, 6, 9, 12 months

**Acceptance Criteria:** All ACs

## Dev Notes

### Dependency on Epic 37

This story builds directly on Epic 37's trust milestone foundation:

| Epic 37 Component           | Usage in 38-1                           |
| --------------------------- | --------------------------------------- |
| `trustMilestone.ts`         | Trust score types and thresholds        |
| `developmentalMessaging.ts` | Framing patterns ("recognizing growth") |
| `milestoneService.ts`       | Score history access patterns           |

### FR38A Requirement

From Pre-mortem Analysis:

> "At 100% trust for 12 months, system initiates 'graduation conversation' that BOTH parties must acknowledge - prevents indefinite monitoring of compliant teens"

This story implements the **tracking** portion. Story 38-2 implements the conversation trigger.

### Progress Calculation

```typescript
// 12 months = 100% progress
const progressPercentage = Math.min(100, (monthsAtPerfect / 12) * 100)

// Example messages by progress:
// 0%: "Your path to graduation: maintain 100% trust for 12 months"
// 25%: "3 months at 100% trust - 9 months to graduation eligibility"
// 50%: "Halfway there! 6 months at 100% trust"
// 75%: "9 months at 100% trust - 3 months to graduation eligibility"
// 100%: "Congratulations! You've reached graduation eligibility"
```

### Streak Handling

If trust score drops below 100%, the streak resets. Message:

- "Your path continues - maintain 100% trust to resume progress"
- NOT punitive framing (consistent with Epic 37 regression handling)

### References

- [Source: packages/shared/src/contracts/trustMilestones.ts] - Trust score types
- [Source: packages/shared/src/services/developmentalMessagingService.ts] - Framing patterns
- [Source: docs/epics/epic-list.md#Epic-38] - Epic requirements
- [Source: docs/sprint-artifacts/stories/37-4-automatic-monitoring-reduction.md] - 6-month pattern reference
