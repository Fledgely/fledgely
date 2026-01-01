# Story 37-2: Reduced Screenshot Frequency

## Story

As **the system**,
I want **to reduce screenshot frequency based on milestone achievement**,
So that **privacy recognition grows naturally with demonstrated maturity**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Growing milestone (80+) reduces frequency to every 15 minutes
- [x] AC2: Maturing milestone (90+) reduces frequency to every 30 minutes
- [x] AC3: Ready for Independence (95+) enables hourly frequency option
- [x] AC4: Frequency changes apply automatically upon milestone achievement
- [x] AC5: Child notified of frequency reduction with celebratory message
- [x] AC6: Parent dashboard reflects current frequency setting

## Technical Tasks

### Task 1: MilestoneFrequencyConfig Data Model

Create data model for milestone-based frequency configuration.

**Files:**

- `packages/shared/src/contracts/milestoneFrequency.ts` (new)
- `packages/shared/src/contracts/milestoneFrequency.test.ts` (new)

**Types:**

```typescript
interface MilestoneFrequencyConfig {
  milestoneLevel: TrustMilestoneLevel
  frequencyMinutes: number
  description: string
}

const MILESTONE_FREQUENCIES = {
  growing: 15, // Every 15 minutes
  maturing: 30, // Every 30 minutes
  'ready-for-independence': 60, // Hourly
}
```

**Acceptance Criteria:** AC1, AC2, AC3

### Task 2: FrequencyReductionService

Create service for calculating and applying frequency reductions.

**Files:**

- `packages/shared/src/services/frequencyReductionService.ts` (new)
- `packages/shared/src/services/frequencyReductionService.test.ts` (new)

**Functions:**

```typescript
function getFrequencyForMilestone(milestone: TrustMilestoneLevel | null): number
function calculateFrequencyChange(
  childId: string,
  newMilestone: TrustMilestoneLevel
): FrequencyChange
function applyFrequencyReduction(childId: string, milestone: TrustMilestoneLevel): FrequencyUpdate
```

**Acceptance Criteria:** AC1, AC2, AC3, AC4

### Task 3: FrequencyChangeNotification Component

Create notification component for frequency changes.

**Files:**

- `apps/web/src/components/milestones/FrequencyChangeNotification.tsx` (new)
- `apps/web/src/components/milestones/FrequencyChangeNotification.test.tsx` (new)

**Features:**

- Celebratory notification when frequency reduces
- Shows old vs new frequency
- Uses developmental language
- Different messaging for child vs parent

**Acceptance Criteria:** AC5

### Task 4: FrequencyDisplay Component

Create component showing current frequency setting.

**Files:**

- `apps/web/src/components/milestones/FrequencyDisplay.tsx` (new)
- `apps/web/src/components/milestones/FrequencyDisplay.test.tsx` (new)

**Features:**

- Visual display of current frequency
- Shows milestone level connection
- Parent dashboard integration
- Child-friendly explanation

**Acceptance Criteria:** AC6

### Task 5: Integration Tests

Create integration tests for frequency reduction system.

**Files:**

- `apps/web/src/components/milestones/__tests__/frequencyReduction.integration.test.tsx` (new)

**Test Scenarios:**

- Frequency changes with milestone achievement
- Notifications sent correctly
- Parent dashboard updates
- Child view updates
- Frequency returns to baseline on regression

**Acceptance Criteria:** All ACs

## Dev Notes

### Frequency Philosophy

- Frequency reduction is RECOGNITION of maturity
- Privacy grows naturally with demonstrated responsibility
- Not a reward system - acknowledging growth
- Regression handled compassionately (separate story)

### Frequency Mapping

- **Default (no milestone)**: 5 minutes
- **Growing (80+)**: 15 minutes (3x less frequent)
- **Maturing (90+)**: 30 minutes (6x less frequent)
- **Ready for Independence (95+)**: 60 minutes (12x less frequent)

### Integration Points

- Extension capture interval configuration
- Screenshot metadata with frequency context
- Parent dashboard frequency display
- Child milestone progress view

### References

- [Source: packages/shared/src/contracts/trustMilestone.ts] - Milestone definitions
- [Source: packages/shared/src/services/milestoneService.ts] - Milestone service
- [Source: apps/extension/src/background/captureService.ts] - Capture interval logic
