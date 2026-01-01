# Story 37-1: Trust Milestone Definitions

## Story

As **the system**,
I want **to define trust milestones that trigger monitoring adjustments**,
So that **developmental growth is recognized systematically**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Milestones defined: 80 (Growing), 90 (Maturing), 95 (Ready for independence)
- [x] AC2: Duration requirement: score maintained for 30+ days
- [x] AC3: Milestone notifications sent to both parties
- [x] AC4: Language: "Recognizing your growth" not "You've earned"
- [x] AC5: Milestones documented in agreement
- [x] AC6: Regression handled gracefully (not punitive)

## Technical Tasks

### Task 1: TrustMilestone Data Model

Create data model for trust milestones.

**Files:**

- `packages/shared/src/contracts/trustMilestone.ts` (new)
- `packages/shared/src/contracts/trustMilestone.test.ts` (new)

**Types:**

```typescript
interface TrustMilestone {
  level: 'growing' | 'maturing' | 'ready-for-independence'
  threshold: number // 80, 90, 95
  durationDays: number // 30 days required
  description: string
  benefits: string[] // what this milestone unlocks
}

interface ChildMilestoneStatus {
  childId: string
  currentMilestone: TrustMilestone | null
  milestoneHistory: MilestoneHistoryEntry[]
  streakStartDate: Date | null
  consecutiveDays: number
}
```

**Acceptance Criteria:** AC1, AC2

### Task 2: MilestoneService

Create service for milestone calculations and transitions.

**Files:**

- `packages/shared/src/services/milestoneService.ts` (new)
- `packages/shared/src/services/milestoneService.test.ts` (new)

**Functions:**

```typescript
function getMilestoneForScore(score: number): TrustMilestone | null
function checkMilestoneEligibility(
  childId: string,
  scoreHistory: ScoreHistoryEntry[]
): MilestoneEligibility
function calculateConsecutiveDays(scoreHistory: ScoreHistoryEntry[], threshold: number): number
function transitionMilestone(
  childId: string,
  fromMilestone: TrustMilestone | null,
  toMilestone: TrustMilestone
): MilestoneTransition
```

**Acceptance Criteria:** AC1, AC2

### Task 3: MilestoneNotification Component

Create notification components for milestone events.

**Files:**

- `apps/web/src/components/milestones/MilestoneNotification.tsx` (new)
- `apps/web/src/components/milestones/MilestoneNotification.test.tsx` (new)

**Features:**

- Celebratory notification when milestone reached
- Uses "recognizing your growth" language, not "you've earned"
- Displays milestone benefits
- Different views for child and parent

**Acceptance Criteria:** AC3, AC4

### Task 4: MilestoneProgress Component

Create component showing progress toward milestones.

**Files:**

- `apps/web/src/components/milestones/MilestoneProgress.tsx` (new)
- `apps/web/src/components/milestones/MilestoneProgress.test.tsx` (new)

**Features:**

- Visual progress indicator showing days toward milestone
- Current milestone highlighted
- Next milestone preview
- Uses developmental framing language

**Acceptance Criteria:** AC1, AC2, AC4

### Task 5: MilestoneRegressionHandler

Create handler for graceful regression when score drops.

**Files:**

- `packages/shared/src/services/milestoneRegressionService.ts` (new)
- `packages/shared/src/services/milestoneRegressionService.test.ts` (new)

**Features:**

- 2-week grace period before milestone loss
- Non-punitive messaging
- Opportunity to recover
- Notification before milestone drops

**Acceptance Criteria:** AC6

### Task 6: Integration Tests

Create integration tests for milestone system.

**Files:**

- `apps/web/src/components/milestones/__tests__/milestoneSystem.integration.test.tsx` (new)

**Test Scenarios:**

- Child reaches milestone after 30 days
- Milestone progress updates correctly
- Regression grace period works
- Notifications sent correctly
- Language is developmental, not reward-based

**Acceptance Criteria:** All ACs

## Dev Notes

### Milestone Philosophy

- **Privacy is a RIGHT** - not earned, it's inherent
- Milestones recognize maturity, not reward behavior
- Language: "We're recognizing your growth" not "You've earned this"
- Regression is handled with compassion, not punishment

### Milestone Thresholds

- **80+ (Growing)**: Beginning to show consistent responsibility
- **90+ (Maturing)**: Demonstrated sustained responsibility
- **95+ (Ready for Independence)**: Approaching graduation from monitoring

### Duration Requirement

- 30 consecutive days at threshold
- Grace period of 2 weeks if score drops
- If score recovers within grace period, streak continues

### References

- [Source: packages/shared/src/contracts/trustScore.ts] - Trust score data model
- [Source: packages/shared/src/contracts/trustScoreCalculation.ts] - Score calculation
