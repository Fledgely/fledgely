# Story 36-4: Trust Score Display to Parent

## Story

As **a parent**,
I want **to see my child's trust score**,
So that **I can understand their behavior patterns**.

## Status: Done

## Test Summary

- **Task 1 (ParentTrustScoreCard)**: 18 tests
- **Task 2 (TrustScoreHistoryChart)**: 17 tests
- **Task 3 (MilestoneTimeline)**: 14 tests
- **Task 4 (FactorDetailModal)**: 16 tests
- **Task 5 (TrustGuidanceCard)**: 17 tests
- **Task 6 (ParentTrustScoreView)**: 15 tests
- **Task 7 (Integration Tests)**: 25 tests
- **Total**: 122 tests

## Acceptance Criteria

- [x] AC1: Same score visible as child sees (transparency)
- [x] AC2: Historical chart: trust score over time
- [x] AC3: Milestone markers: "Reached 90 on Sept 15"
- [x] AC4: Factor details available on click
- [x] AC5: Guidance: "High trust = consider reducing monitoring"
- [x] AC6: No auto-punishment tied to score

## Technical Tasks

### Task 1: ParentTrustScoreCard Component

Create the parent-facing trust score card with same data as child sees.

**Files:**

- `apps/web/src/components/trustScore/ParentTrustScoreCard.tsx` (new)
- `apps/web/src/components/trustScore/ParentTrustScoreCard.test.tsx` (new)

**Props:**

```typescript
interface ParentTrustScoreCardProps {
  childId: string
  childName: string
  trustScore: TrustScore
  onFactorClick?: (factor: TrustFactor) => void
}
```

**Features:**

- Display same score child sees (AC1)
- Child name header
- Score with trend indicator
- Click handler for factor details (AC4)

**Acceptance Criteria:** AC1, AC4

### Task 2: TrustScoreHistoryChart Component

Create historical chart showing score over time.

**Files:**

- `apps/web/src/components/trustScore/TrustScoreHistoryChart.tsx` (new)
- `apps/web/src/components/trustScore/TrustScoreHistoryChart.test.tsx` (new)

**Features:**

- Line chart of score history (AC2)
- Time range selector (week/month/all)
- Milestone markers on chart (AC3)
- Hover tooltips with date and score
- Accessible with keyboard navigation

**Acceptance Criteria:** AC2, AC3

### Task 3: MilestoneTimeline Component

Create component to show milestone markers.

**Files:**

- `apps/web/src/components/trustScore/MilestoneTimeline.tsx` (new)
- `apps/web/src/components/trustScore/MilestoneTimeline.test.tsx` (new)

**Features:**

- List of milestones: "Reached 90 on Sept 15" (AC3)
- Milestone icons for achievements
- Both up and down milestones
- Celebratory styling for achievements

**Acceptance Criteria:** AC3

### Task 4: FactorDetailModal Component

Create modal for viewing factor details on click.

**Files:**

- `apps/web/src/components/trustScore/FactorDetailModal.tsx` (new)
- `apps/web/src/components/trustScore/FactorDetailModal.test.tsx` (new)

**Features:**

- Factor description and value (AC4)
- When it occurred
- Recency weight applied
- Category explanation
- Close button and keyboard support

**Acceptance Criteria:** AC4

### Task 5: TrustGuidanceCard Component

Create guidance card for parents based on trust level.

**Files:**

- `apps/web/src/components/trustScore/TrustGuidanceCard.tsx` (new)
- `apps/web/src/components/trustScore/TrustGuidanceCard.test.tsx` (new)

**Features:**

- Level-based guidance (AC5):
  - High (80+): "Consider reducing monitoring frequency"
  - Medium (50-79): "Maintaining good trust level"
  - Growing (<50): "Focus on open conversations"
- Links to relevant actions
- No punishment suggestions (AC6)

**Acceptance Criteria:** AC5, AC6

### Task 6: ParentTrustScoreView Component

Create the complete parent trust score view.

**Files:**

- `apps/web/src/components/trustScore/ParentTrustScoreView.tsx` (new)
- `apps/web/src/components/trustScore/ParentTrustScoreView.test.tsx` (new)

**Layout:**

```
┌─────────────────────────────────────┐
│  Emma's Trust Score                 │
│  ┌─────────────┐                    │
│  │     85      │ ↑ Up 5 this month  │
│  └─────────────┘                    │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ [Chart: Score over time]        ││
│  │ ★ Reached 90 on Sept 15         ││
│  └─────────────────────────────────┘│
│                                     │
│  Factors (tap for details):         │
│  • Following time limits: +10       │
│  • Using focus mode: +5             │
│                                     │
│  Guidance:                          │
│  Consider reducing monitoring       │
│  frequency as trust builds.         │
└─────────────────────────────────────┘
```

**Acceptance Criteria:** All ACs

### Task 7: Integration Tests

Create integration tests for parent trust score display.

**Files:**

- `apps/web/src/components/trustScore/__tests__/parentTrustScoreDisplay.integration.test.tsx` (new)

**Test Scenarios:**

- Same score visible as child sees
- Historical chart rendered
- Milestone markers displayed
- Factor click opens details
- Guidance matches score level
- No punishment language

**Acceptance Criteria:** All ACs

## Dev Notes

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Shared Components**: Reuse child components where appropriate
- **Tailwind CSS**: Styling consistent with existing app
- **Accessibility**: ARIA labels, keyboard navigation

### AC1 Implementation

Both parent and child see same TrustScore data - no separate "parent view" score.
Use same formatting utilities from trustScoreBreakdown.ts.

### AC6 Implementation

Language must be growth-focused:

- "Consider reducing monitoring" not "You can relax restrictions"
- "Focus on conversations" not "Need to address issues"
- No suggestions of punishment or consequences

### References

- [Source: apps/web/src/components/trustScore/] - Child components to reuse
- [Source: packages/shared/src/contracts/trustScore.ts] - Data model
- [Source: packages/shared/src/contracts/trustScoreBreakdown.ts] - Display formatting
- [Source: apps/web/src/hooks/useScoreCalculation.ts] - Calculation hook
