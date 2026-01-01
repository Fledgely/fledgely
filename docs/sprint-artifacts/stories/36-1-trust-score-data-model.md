# Story 36-1: Trust Score Data Model

## Story

As **the system**,
I want **a data model for trust scores**,
So that **responsible behavior can be tracked and recognized**.

## Status: Done

## Completion Notes

**Total Tests: 187**

- Shared package (trustScore.ts): 53 tests
- Shared package (trustFactorDefinitions.ts): 33 tests
- Shared package (trustScoreValidation.ts): 37 tests
- Service (trustScoreService.ts): 27 tests
- Hook (useTrustScore.ts): 15 tests
- Integration tests: 22 tests

**Key Implementation:**

- TRUST_SCORE_DEFAULT = 70 (benefit of the doubt)
- Score range: 0-100
- 6 factor types (3 positive, 1 neutral, 2 concerning)
- Daily update restriction (24-hour minimum)
- Full Zod schema validation

## Acceptance Criteria

- [x] AC1: Schema includes: childId, currentScore, history, factors
- [x] AC2: Score range: 0-100 (100 = highest trust)
- [x] AC3: Zod schema: `trustScoreSchema` in @fledgely/shared
- [x] AC4: History tracks score changes over time with reasons
- [x] AC5: Factors breakdown: which behaviors contributed
- [x] AC6: Score updates daily (not real-time)

## Technical Tasks

### Task 1: Trust Score Types and Constants

Create TypeScript types and constants for trust score data model in shared package.

**Files:**

- `packages/shared/src/contracts/trustScore.ts` (new)
- `packages/shared/src/contracts/trustScore.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Score range constants
export const TRUST_SCORE_MIN = 0
export const TRUST_SCORE_MAX = 100
export const TRUST_SCORE_DEFAULT = 70 // Starting score: benefit of the doubt

// Trust factor types
export const trustFactorTypeSchema = z.enum([
  'time-limit-compliance',
  'focus-mode-usage',
  'no-bypass-attempts',
  'normal-app-usage',
  'bypass-attempt',
  'monitoring-disabled',
])

// Trust factor category
export const trustFactorCategorySchema = z.enum(['positive', 'neutral', 'concerning'])

// Trust factor schema
export const trustFactorSchema = z.object({
  type: trustFactorTypeSchema,
  category: trustFactorCategorySchema,
  value: z.number(), // Points contributed (positive or negative)
  description: z.string(),
  occurredAt: z.date(),
})

// Trust score history entry
export const trustScoreHistoryEntrySchema = z.object({
  date: z.date(),
  score: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  previousScore: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  reason: z.string(),
  factors: z.array(trustFactorSchema),
})

// Main trust score schema
export const trustScoreSchema = z.object({
  id: z.string(),
  childId: z.string(),
  currentScore: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  history: z.array(trustScoreHistoryEntrySchema),
  factors: z.array(trustFactorSchema),
  lastUpdatedAt: z.date(),
  createdAt: z.date(),
})

// Utility types
export type TrustFactor = z.infer<typeof trustFactorSchema>
export type TrustScoreHistoryEntry = z.infer<typeof trustScoreHistoryEntrySchema>
export type TrustScore = z.infer<typeof trustScoreSchema>
```

**Acceptance Criteria:** AC1, AC2, AC3, AC4, AC5

### Task 2: Trust Factor Definitions

Create factor definitions with point values and categories.

**Files:**

- `packages/shared/src/contracts/trustFactorDefinitions.ts` (new)
- `packages/shared/src/contracts/trustFactorDefinitions.test.ts` (new)

**Implementation:**

```typescript
// Factor definitions with point values
export const TRUST_FACTOR_DEFINITIONS: TrustFactorDefinition[] = [
  // Positive factors
  {
    type: 'time-limit-compliance',
    category: 'positive',
    basePoints: 5,
    description: 'Following time limits',
  },
  {
    type: 'focus-mode-usage',
    category: 'positive',
    basePoints: 3,
    description: 'Using focus mode',
  },
  {
    type: 'no-bypass-attempts',
    category: 'positive',
    basePoints: 2,
    description: 'No bypass attempts detected',
  },
  // Neutral factors
  {
    type: 'normal-app-usage',
    category: 'neutral',
    basePoints: 0,
    description: 'Normal app usage within limits',
  },
  // Concerning factors (logged not punished)
  {
    type: 'bypass-attempt',
    category: 'concerning',
    basePoints: -5,
    description: 'Bypass attempt detected',
  },
  {
    type: 'monitoring-disabled',
    category: 'concerning',
    basePoints: -3,
    description: 'Monitoring disabled',
  },
]

// Utility functions
export function getFactorDefinition(type: TrustFactorType): TrustFactorDefinition | null
export function getFactorsByCategory(category: TrustFactorCategory): TrustFactorDefinition[]
export function calculateFactorPoints(factors: TrustFactor[]): number
```

**Acceptance Criteria:** AC5

### Task 3: Trust Score Service

Create service for managing trust score data operations.

**Files:**

- `apps/web/src/services/trustScoreService.ts` (new)
- `apps/web/src/services/trustScoreService.test.ts` (new)

**Functions:**

- `initializeTrustScore(childId)` - Create initial trust score with default value (70)
- `getTrustScore(childId)` - Retrieve current trust score
- `getTrustScoreHistory(childId, limit?)` - Get score history with pagination
- `getFactorsBreakdown(childId)` - Get current factors contributing to score
- `addFactorToScore(childId, factor)` - Add a new factor
- `canUpdateScore(lastUpdatedAt)` - Check if daily update is due

**Acceptance Criteria:** AC1, AC4, AC6

### Task 4: useTrustScore Hook

Create hook for managing trust score state in components.

**Files:**

- `apps/web/src/hooks/useTrustScore.ts` (new)
- `apps/web/src/hooks/useTrustScore.test.ts` (new)

**Interface:**

```typescript
interface UseTrustScoreParams {
  childId: string
}

interface UseTrustScoreResult {
  currentScore: number
  scoreHistory: TrustScoreHistoryEntry[]
  currentFactors: TrustFactor[]
  positiveFactors: TrustFactor[]
  concerningFactors: TrustFactor[]
  isLoading: boolean
  lastUpdatedAt: Date | null
  canUpdate: boolean
  refreshScore: () => void
}
```

**Acceptance Criteria:** AC1, AC4, AC5

### Task 5: Trust Score Validation

Create validation utilities for trust score operations.

**Files:**

- `packages/shared/src/contracts/trustScoreValidation.ts` (new)
- `packages/shared/src/contracts/trustScoreValidation.test.ts` (new)

**Functions:**

- `isValidScore(score)` - Check if score is within 0-100 range
- `clampScore(score)` - Ensure score stays within valid range
- `validateTrustScore(data)` - Full Zod validation of trust score object
- `validateFactor(factor)` - Validate a single factor
- `isScoreUpdateDue(lastUpdatedAt)` - Check if 24 hours have passed

**Acceptance Criteria:** AC2, AC6

### Task 6: Integration Tests

Create integration tests for the complete trust score data model.

**Files:**

- `apps/web/src/components/trustScore/__tests__/trustScoreDataModel.integration.test.tsx` (new)

**Test Scenarios:**

- Trust score initialization with default value (70)
- Score range enforcement (0-100)
- History entry creation on score change
- Factor addition and point calculation
- Daily update restriction enforcement
- Factors breakdown retrieval
- Score validation edge cases

**Acceptance Criteria:** All ACs

## Dev Notes

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Trust Score Philosophy

From Epic 36 requirements:

- Score is for **recognition**, not punishment
- Starting score is 70 (benefit of the doubt)
- Concerning factors are **logged for conversation**, not auto-punishment
- Updates are daily to avoid anxiety about real-time changes
- Transparency: child can see why score changes

### Previous Story Intelligence (35-6)

Story 35-6 established annual review prompts with similar patterns:

- **Types**: `packages/shared/src/contracts/annualReview.ts`
- **Service**: `apps/web/src/services/annualReviewService.ts`
- **Hook**: `apps/web/src/hooks/useAnnualReview.ts`

Apply same structure for trust score implementation.

### Key Constants

```
TRUST_SCORE_MIN = 0
TRUST_SCORE_MAX = 100
TRUST_SCORE_DEFAULT = 70 (starting score)
```

### Factor Categories

- **Positive**: Time limit compliance, focus mode usage, no bypass attempts
- **Neutral**: Normal app usage within limits
- **Concerning**: Bypass attempts, disabled monitoring (logged not punished)

### File Structure

```
packages/shared/src/contracts/
  trustScore.ts              # Main types and constants
  trustScore.test.ts         # Unit tests
  trustFactorDefinitions.ts  # Factor definitions
  trustFactorDefinitions.test.ts
  trustScoreValidation.ts    # Validation utilities
  trustScoreValidation.test.ts

apps/web/src/
  services/
    trustScoreService.ts     # Data operations
    trustScoreService.test.ts
  hooks/
    useTrustScore.ts         # State hook
    useTrustScore.test.ts
  components/trustScore/
    __tests__/
      trustScoreDataModel.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/annualReview.ts] - Similar patterns
- [Source: apps/web/src/services/annualReviewService.ts] - Service patterns
- [Source: docs/epics/epic-list.md#Story 36.1] - Original requirements
