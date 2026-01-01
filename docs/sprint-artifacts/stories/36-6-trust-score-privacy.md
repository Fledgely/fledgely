# Story 36-6: Trust Score Privacy

## Story

As **a child**,
I want **my trust score to be private within my family**,
So that **siblings and others can't see it**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Each child sees only their own score
- [x] AC2: Parents see each child's score separately
- [x] AC3: Siblings cannot compare scores
- [x] AC4: No family-wide leaderboard (prevents competition)
- [x] AC5: Trust score not shared outside family
- [x] AC6: Privacy maintains dignity and prevents shame

## Completion Notes

**Total Tests: 92**

- Task 1: TrustScorePrivacyService - 18 tests
- Task 2: PrivacyGate - 12 tests
- Task 3: FamilyTrustOverview - 16 tests
- Task 4: ExternalShareGuard - 13 tests
- Task 5: DignitySafeDisplay - 19 tests
- Task 6: Integration - 14 tests

**Completed Date:** January 2026

## Technical Tasks

### Task 1: TrustScorePrivacyService

Create service for managing trust score privacy rules.

**Files:**

- `packages/shared/src/services/trustScorePrivacyService.ts` (new)
- `packages/shared/src/services/trustScorePrivacyService.test.ts` (new)

**Functions:**

```typescript
interface TrustScoreAccessResult {
  canView: boolean
  reason?: string
}

function canViewTrustScore(
  viewerId: string,
  targetChildId: string,
  familyId: string
): TrustScoreAccessResult
function getViewableTrustScores(viewerId: string, familyId: string): string[] // Returns child IDs viewer can access
function isParentViewer(viewerId: string, familyId: string): boolean
```

**Acceptance Criteria:** AC1, AC2, AC3

### Task 2: PrivacyGate Component

Create component that gates trust score visibility.

**Files:**

- `apps/web/src/components/trustScore/PrivacyGate.tsx` (new)
- `apps/web/src/components/trustScore/PrivacyGate.test.tsx` (new)

**Features:**

- Check if viewer can see trust score
- Show appropriate message if blocked
- Handle parent vs child vs sibling views

**Acceptance Criteria:** AC1, AC2, AC3

### Task 3: NoLeaderboard Validation

Create validation to prevent leaderboard display.

**Files:**

- `apps/web/src/components/trustScore/FamilyTrustOverview.tsx` (new)
- `apps/web/src/components/trustScore/FamilyTrustOverview.test.tsx` (new)

**Features:**

- Parent sees individual child cards (not ranked)
- No comparison metrics
- No "best performer" indicators
- Each child shown equally

**Acceptance Criteria:** AC4, AC6

### Task 4: ExternalShareGuard Component

Create component to prevent external sharing.

**Files:**

- `apps/web/src/components/trustScore/ExternalShareGuard.tsx` (new)
- `apps/web/src/components/trustScore/ExternalShareGuard.test.tsx` (new)

**Features:**

- No share buttons on trust score views
- No export functionality
- Privacy notice displayed

**Acceptance Criteria:** AC5

### Task 5: DignitySafeDisplay Component

Create component for dignity-preserving display.

**Files:**

- `apps/web/src/components/trustScore/DignitySafeDisplay.tsx` (new)
- `apps/web/src/components/trustScore/DignitySafeDisplay.test.tsx` (new)

**Features:**

- No shame-inducing language
- Growth-focused messaging
- Private context for low scores
- Encouraging framing

**Acceptance Criteria:** AC6

### Task 6: Integration Tests

Create integration tests for privacy features.

**Files:**

- `apps/web/src/components/trustScore/__tests__/trustScorePrivacy.integration.test.tsx` (new)

**Test Scenarios:**

- Child can only see own score
- Parent can see all children's scores separately
- Sibling cannot see other sibling's score
- No leaderboard displayed
- External sharing blocked
- Dignity preserved in all displays

**Acceptance Criteria:** All ACs

## Dev Notes

### Privacy Philosophy

- **Individual Dignity**: Each child's score is their own journey
- **No Competition**: Trust is not a race between siblings
- **Family-Internal**: Score never leaves the family context
- **Growth Focus**: Low scores frame as opportunity, not failure

### Implementation Guidelines

- Use role-based access control
- Parent role can view all children
- Child role can only view own score
- No aggregate family statistics
- No ranking or comparison features

### References

- [Source: packages/shared/src/contracts/trustScore.ts] - Trust score model
- [Source: apps/web/src/components/trustScore/] - Existing components
