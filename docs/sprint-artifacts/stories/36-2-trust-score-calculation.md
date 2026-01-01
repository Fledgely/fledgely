# Story 36-2: Trust Score Calculation

## Story

As **the system**,
I want **to calculate trust scores based on behavior patterns**,
So that **responsible behavior is recognized**.

## Status: Done

## Completion Notes

**Total Tests: 187**

- Shared package (trustScoreCalculation.ts): 51 tests
- Shared package (trustScoreBreakdown.ts): 42 tests
- Service (trustScoreCalculationService.ts): 38 tests
- Hook (useScoreCalculation.ts): 23 tests
- Integration tests: 33 tests

**Key Implementation:**

- Recency weighting: Last 7 days (100%), 8-14 days (75%), 15-30 days (50%), 31+ days (25%)
- Daily change limits: +5 max increase, -10 max decrease
- Transparent breakdown with human-readable text
- Milestone detection (90, 80, 70, 60, 50 thresholds)
- Score trends (weekly/monthly)
- Improvement tips and encouragement messages

## Acceptance Criteria

- [x] AC1: Positive factors: time limit compliance, focus mode usage, no bypass attempts
- [x] AC2: Neutral factors: normal app usage within limits
- [x] AC3: Concerning factors: bypass attempts, disabled monitoring (logged not punished)
- [x] AC4: Calculation weighted toward recent behavior (last 30 days)
- [x] AC5: Starting score: 70 (benefit of the doubt)
- [x] AC6: Calculation transparent (child can see why)

## Technical Tasks

### Task 1: Score Calculation Constants and Types

Create constants and types for score calculation in shared package.

**Files:**

- `packages/shared/src/contracts/trustScoreCalculation.ts` (new)
- `packages/shared/src/contracts/trustScoreCalculation.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Weight constants for recency (AC4)
export const RECENCY_WEIGHT_LAST_7_DAYS = 1.0 // Full weight
export const RECENCY_WEIGHT_LAST_14_DAYS = 0.75
export const RECENCY_WEIGHT_LAST_30_DAYS = 0.5
export const RECENCY_WEIGHT_OLDER = 0.25 // Older than 30 days

// Score change limits per day
export const MAX_DAILY_INCREASE = 5
export const MAX_DAILY_DECREASE = 10

// Calculation result type
export interface ScoreCalculationResult {
  newScore: number
  previousScore: number
  factorsApplied: TrustFactor[]
  breakdown: ScoreBreakdown
  calculatedAt: Date
}

export interface ScoreBreakdown {
  positivePoints: number
  neutralPoints: number
  concerningPoints: number
  recencyMultiplier: number
  finalDelta: number
}
```

**Acceptance Criteria:** AC4, AC5, AC6

### Task 2: Recency Weight Calculation

Create function to calculate recency-based weights for factors.

**Files:**

- `packages/shared/src/contracts/trustScoreCalculation.ts` (update)
- `packages/shared/src/contracts/trustScoreCalculation.test.ts` (update)

**Functions:**

- `getRecencyWeight(occurredAt: Date)` - Returns weight based on how recent the factor is
- `applyRecencyWeight(factor: TrustFactor)` - Returns factor points with recency applied

**Acceptance Criteria:** AC4

### Task 3: Score Calculation Service

Create service for performing trust score calculations.

**Files:**

- `apps/web/src/services/trustScoreCalculationService.ts` (new)
- `apps/web/src/services/trustScoreCalculationService.test.ts` (new)

**Functions:**

- `calculateNewScore(currentScore, factors, lastUpdatedAt)` - Calculate new score from factors
- `calculateFactorContribution(factors)` - Sum points from all factors
- `getPositiveContribution(factors)` - Sum positive factor points
- `getNeutralContribution(factors)` - Sum neutral factor points
- `getConcerningContribution(factors)` - Sum concerning factor points
- `generateScoreBreakdown(factors)` - Create transparent breakdown for display

**Acceptance Criteria:** AC1, AC2, AC3, AC6

### Task 4: Daily Score Update Function

Create function for performing daily score updates.

**Files:**

- `apps/web/src/services/trustScoreCalculationService.ts` (update)
- `apps/web/src/services/trustScoreCalculationService.test.ts` (update)

**Functions:**

- `performDailyUpdate(trustScore, factors)` - Execute daily score recalculation
- `validateDailyUpdateTiming(lastUpdatedAt)` - Verify 24h have passed
- `createCalculationResult(score, previousScore, factors)` - Create result object

**Acceptance Criteria:** AC4, AC5

### Task 5: Score Breakdown for Transparency

Create utilities for generating human-readable score breakdowns.

**Files:**

- `packages/shared/src/contracts/trustScoreBreakdown.ts` (new)
- `packages/shared/src/contracts/trustScoreBreakdown.test.ts` (new)

**Functions:**

- `formatFactorContribution(factor)` - Format a factor for display (e.g., "Following time limits: +5")
- `formatScoreChange(delta)` - Format score change (e.g., "Up 5 points")
- `generateBreakdownText(breakdown)` - Generate full breakdown text
- `getCategoryContributionText(category, points)` - Text for category contribution

**Acceptance Criteria:** AC6

### Task 6: useScoreCalculation Hook

Create hook for managing score calculation in components.

**Files:**

- `apps/web/src/hooks/useScoreCalculation.ts` (new)
- `apps/web/src/hooks/useScoreCalculation.test.ts` (new)

**Interface:**

```typescript
interface UseScoreCalculationParams {
  trustScore: TrustScore
  pendingFactors: TrustFactor[]
}

interface UseScoreCalculationResult {
  projectedScore: number
  breakdown: ScoreBreakdown
  breakdownText: string[]
  positiveContribution: number
  concerningContribution: number
  canRecalculate: boolean
  recalculate: () => ScoreCalculationResult
}
```

**Acceptance Criteria:** AC1, AC2, AC3, AC6

### Task 7: Integration Tests

Create integration tests for complete score calculation flow.

**Files:**

- `apps/web/src/components/trustScore/__tests__/trustScoreCalculation.integration.test.tsx` (new)

**Test Scenarios:**

- Starting score initialization at 70
- Positive factors increase score correctly
- Neutral factors don't change score
- Concerning factors decrease score (logged not punished)
- Recency weighting applies correctly (last 30 days prioritized)
- Daily update restriction enforced
- Score breakdown is transparent and accurate
- Score clamped to 0-100 range
- Mixed factors calculated correctly

**Acceptance Criteria:** All ACs

## Dev Notes

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Calculation Philosophy

From Epic 36 requirements:

- Score is for **recognition**, not punishment
- Starting score is 70 (benefit of the doubt)
- Concerning factors are **logged for conversation**, not auto-punishment
- Calculation weighted toward recent behavior (last 30 days)
- Transparency: child can see exactly why score changes

### Recency Weighting (AC4)

```
Last 7 days: 100% weight
8-14 days: 75% weight
15-30 days: 50% weight
Older than 30 days: 25% weight
```

### Factor Categories (from Story 36-1)

- **Positive**: time-limit-compliance (+5), focus-mode-usage (+3), no-bypass-attempts (+2)
- **Neutral**: normal-app-usage (0)
- **Concerning**: bypass-attempt (-5), monitoring-disabled (-3)

### Key Constants

```
TRUST_SCORE_DEFAULT = 70 (starting score)
MAX_DAILY_INCREASE = 5 (prevent gaming)
MAX_DAILY_DECREASE = 10 (concerning logged, not punished harshly)
```

### File Structure

```
packages/shared/src/contracts/
  trustScoreCalculation.ts      # Calculation types and constants
  trustScoreCalculation.test.ts # Unit tests
  trustScoreBreakdown.ts        # Display formatting utilities
  trustScoreBreakdown.test.ts   # Unit tests

apps/web/src/
  services/
    trustScoreCalculationService.ts     # Calculation logic
    trustScoreCalculationService.test.ts
  hooks/
    useScoreCalculation.ts              # Calculation hook
    useScoreCalculation.test.ts
  components/trustScore/
    __tests__/
      trustScoreCalculation.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/trustScore.ts] - Data model from Story 36-1
- [Source: packages/shared/src/contracts/trustFactorDefinitions.ts] - Factor definitions
- [Source: apps/web/src/services/trustScoreService.ts] - Service patterns from 36-1
- [Source: docs/epics/epic-list.md#Story 36.2] - Original requirements
