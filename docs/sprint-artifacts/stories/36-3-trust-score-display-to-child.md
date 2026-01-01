# Story 36-3: Trust Score Display to Child

## Story

As **a child**,
I want **to see my trust score**,
So that **I understand where I stand**.

## Status: Done

## Test Summary

- **Total Tests**: 140
- **TrustScoreCard**: 26 tests
- **TrustScoreTrend**: 23 tests
- **TrustScoreFactors**: 20 tests
- **TrustScoreImprovement**: 18 tests
- **TrustScoreEncouragement**: 18 tests
- **ChildTrustScoreView**: 12 tests
- **Integration Tests**: 23 tests

## Acceptance Criteria

- [x] AC1: Score displayed prominently: "Your trust score: 85"
- [x] AC2: Trend shown: "Up 5 points this month"
- [x] AC3: Factors breakdown: "Following time limits: +10"
- [x] AC4: Language is encouraging, not punitive
- [x] AC5: Tips: "To improve: stick to time limits for 2 weeks"
- [x] AC6: Score framed as growth metric, not judgment

## Technical Tasks

### Task 1: TrustScoreCard Component

Create the main trust score display card for child view.

**Files:**

- `apps/web/src/components/trustScore/TrustScoreCard.tsx` (new)
- `apps/web/src/components/trustScore/TrustScoreCard.test.tsx` (new)

**Props:**

```typescript
interface TrustScoreCardProps {
  childId: string
  trustScore: TrustScore
  showDetails?: boolean
}
```

**Features:**

- Large, prominent score display (AC1)
- Encouraging color scheme (green for high, neutral for mid)
- Accessible design with ARIA labels

**Acceptance Criteria:** AC1, AC6

### Task 2: TrustScoreTrend Component

Create component to show score trend over time.

**Files:**

- `apps/web/src/components/trustScore/TrustScoreTrend.tsx` (new)
- `apps/web/src/components/trustScore/TrustScoreTrend.test.tsx` (new)

**Features:**

- Weekly and monthly trend display (AC2)
- Up/down arrow indicators
- "Up 5 points this month" format
- Encouraging language for both increases and decreases

**Acceptance Criteria:** AC2, AC4

### Task 3: TrustScoreFactors Component

Create component to show factor breakdown.

**Files:**

- `apps/web/src/components/trustScore/TrustScoreFactors.tsx` (new)
- `apps/web/src/components/trustScore/TrustScoreFactors.test.tsx` (new)

**Features:**

- List of factors with points (AC3)
- "Following time limits: +10" format
- Grouped by category (positive, neutral, concerning)
- Child-friendly labels

**Acceptance Criteria:** AC3, AC4

### Task 4: TrustScoreImprovement Component

Create component to show improvement tips.

**Files:**

- `apps/web/src/components/trustScore/TrustScoreImprovement.tsx` (new)
- `apps/web/src/components/trustScore/TrustScoreImprovement.test.tsx` (new)

**Features:**

- Actionable tips based on current factors (AC5)
- Encouraging, growth-focused language
- "To improve: stick to time limits for 2 weeks"
- Only shown when relevant improvements exist

**Acceptance Criteria:** AC5, AC4

### Task 5: TrustScoreEncouragement Component

Create component for encouragement and growth messaging.

**Files:**

- `apps/web/src/components/trustScore/TrustScoreEncouragement.tsx` (new)
- `apps/web/src/components/trustScore/TrustScoreEncouragement.test.tsx` (new)

**Features:**

- Growth-oriented messaging (AC6)
- Milestone celebrations
- "Keep it up!" or "Every day is a new chance!"
- Visually positive design

**Acceptance Criteria:** AC4, AC6

### Task 6: ChildTrustScoreView Component

Create the complete child trust score view page/section.

**Files:**

- `apps/web/src/components/trustScore/ChildTrustScoreView.tsx` (new)
- `apps/web/src/components/trustScore/ChildTrustScoreView.test.tsx` (new)

**Layout:**

```
┌─────────────────────────────────────┐
│  Your Trust Score                   │
│  ┌─────────────┐                    │
│  │     85      │ ↑ Up 5 this month  │
│  └─────────────┘                    │
│                                     │
│  What's helping your score:         │
│  • Following time limits: +10       │
│  • Using focus mode: +5             │
│                                     │
│  Tips to improve:                   │
│  • Keep sticking to time limits!    │
│                                     │
│  Keep up the great work! 🎉         │
└─────────────────────────────────────┘
```

**Acceptance Criteria:** All ACs

### Task 7: Integration Tests

Create integration tests for complete child trust score display.

**Files:**

- `apps/web/src/components/trustScore/__tests__/childTrustScoreDisplay.integration.test.tsx` (new)

**Test Scenarios:**

- Score displayed prominently
- Trend calculated and displayed correctly
- Factors breakdown visible
- Language is encouraging throughout
- Improvement tips shown when relevant
- Growth framing verified

**Acceptance Criteria:** All ACs

## Dev Notes

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Component Composition**: Small, focused components
- **Tailwind CSS**: Styling consistent with existing app
- **Accessibility**: ARIA labels, keyboard navigation

### Language Guidelines (AC4, AC6)

From Epic 36 requirements:

- Score is for **recognition**, not punishment
- Language should be **encouraging**, not punitive
- Frame as **growth metric**, not judgment
- Even concerning factors logged for **conversation**, not punishment
- Every message should feel supportive

### Example Messages

**Positive:**

- "Great job! Your trust score is 85."
- "You've been following time limits really well!"
- "Keep up the amazing work!"

**After Decrease:**

- "Your score is 68. Every day is a new chance to improve!"
- "No worries - you can build it back up!"

**Improvement Tips:**

- "To keep improving: stick to your time limits"
- "Try using focus mode during homework time"

### File Structure

```
apps/web/src/components/trustScore/
  TrustScoreCard.tsx
  TrustScoreCard.test.tsx
  TrustScoreTrend.tsx
  TrustScoreTrend.test.tsx
  TrustScoreFactors.tsx
  TrustScoreFactors.test.tsx
  TrustScoreImprovement.tsx
  TrustScoreImprovement.test.tsx
  TrustScoreEncouragement.tsx
  TrustScoreEncouragement.test.tsx
  ChildTrustScoreView.tsx
  ChildTrustScoreView.test.tsx
  __tests__/
    childTrustScoreDisplay.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/trustScore.ts] - Data model
- [Source: packages/shared/src/contracts/trustScoreBreakdown.ts] - Display formatting
- [Source: apps/web/src/hooks/useScoreCalculation.ts] - Calculation hook
- [Source: docs/epics/epic-list.md#Story 36.3] - Original requirements
