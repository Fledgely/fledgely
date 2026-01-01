# Story 36-5: Bypass Attempt Logging

## Story

As **the system**,
I want **to log bypass attempts and their impact on trust score**,
So that **parents can understand behavior patterns and children see consequences**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Log bypass attempts with timestamp and context
- [x] AC2: Show bypass attempt impact on trust score
- [x] AC3: Bypass attempts expire after configurable period
- [x] AC4: Child can see their own bypass attempt history
- [x] AC5: Parent can see bypass attempts with non-punitive framing
- [x] AC6: Distinguish between intentional bypass vs accidental

## Technical Tasks

### Task 1: BypassAttemptService

Create service for logging and retrieving bypass attempts.

**Files:**

- `packages/shared/src/services/bypassAttemptService.ts` (new)
- `packages/shared/src/services/bypassAttemptService.test.ts` (new)

**Functions:**

```typescript
interface BypassAttempt {
  id: string
  childId: string
  deviceId: string
  attemptType: 'extension-disable' | 'settings-change' | 'vpn-detected' | 'proxy-detected' | 'other'
  context: string
  occurredAt: Date
  expiresAt: Date
  impactOnScore: number
  wasIntentional: boolean | null
}

function logBypassAttempt(attempt: Omit<BypassAttempt, 'id' | 'expiresAt'>): Promise<BypassAttempt>
function getBypassAttempts(
  childId: string,
  options?: { includeExpired?: boolean }
): Promise<BypassAttempt[]>
function markAsUnintentional(attemptId: string): Promise<void>
```

**Acceptance Criteria:** AC1, AC3, AC6

### Task 2: BypassAttemptCard Component

Create component to display a single bypass attempt.

**Files:**

- `apps/web/src/components/trustScore/BypassAttemptCard.tsx` (new)
- `apps/web/src/components/trustScore/BypassAttemptCard.test.tsx` (new)

**Features:**

- Display bypass type with icon
- Show timestamp and context (AC1)
- Show impact on score (AC2)
- Non-punitive language (AC5)
- "This was accidental" button (AC6)

**Acceptance Criteria:** AC1, AC2, AC5, AC6

### Task 3: BypassAttemptList Component

Create component to display list of bypass attempts.

**Files:**

- `apps/web/src/components/trustScore/BypassAttemptList.tsx` (new)
- `apps/web/src/components/trustScore/BypassAttemptList.test.tsx` (new)

**Features:**

- List of bypass attempts
- Filter by type
- Show expired/active status
- Empty state
- Pagination

**Acceptance Criteria:** AC3, AC4, AC5

### Task 4: ChildBypassView Component

Create child-facing view for their bypass history.

**Files:**

- `apps/web/src/components/trustScore/ChildBypassView.tsx` (new)
- `apps/web/src/components/trustScore/ChildBypassView.test.tsx` (new)

**Features:**

- Child sees their own bypass history (AC4)
- Educational messaging about why bypasses affect trust
- Option to mark as accidental
- Growth-focused language

**Acceptance Criteria:** AC4, AC6

### Task 5: ParentBypassView Component

Create parent-facing view for child's bypass attempts.

**Files:**

- `apps/web/src/components/trustScore/ParentBypassView.tsx` (new)
- `apps/web/src/components/trustScore/ParentBypassView.test.tsx` (new)

**Features:**

- Parent sees bypass history (AC5)
- Non-punitive framing
- Conversation starters
- Pattern insights

**Acceptance Criteria:** AC5

### Task 6: useBypassAttempts Hook

Create React hook for bypass attempt data.

**Files:**

- `apps/web/src/hooks/useBypassAttempts.ts` (new)
- `apps/web/src/hooks/useBypassAttempts.test.ts` (new)

**Features:**

- Fetch bypass attempts for child
- Real-time updates
- Optimistic updates for marking as accidental

**Acceptance Criteria:** AC1, AC3, AC4

### Task 7: Integration Tests

Create integration tests for bypass attempt logging.

**Files:**

- `apps/web/src/components/trustScore/__tests__/bypassAttemptLogging.integration.test.tsx` (new)

**Test Scenarios:**

- Bypass attempt logged and displayed
- Impact shown on trust score
- Expired attempts handled
- Child and parent views work correctly
- Marking as accidental works

**Acceptance Criteria:** All ACs

## Dev Notes

### Architecture Patterns

- **TDD Approach**: Write tests first
- **Shared Service**: bypassAttemptService in shared package
- **Non-Punitive Language**: Focus on trust-building, not punishment
- **Expiry**: Default 30 days, configurable per-family

### Bypass Attempt Types

- `extension-disable`: Chrome extension was disabled
- `settings-change`: Monitoring settings were changed
- `vpn-detected`: VPN usage detected
- `proxy-detected`: Proxy usage detected
- `other`: Other bypass attempts

### Impact Calculation

Bypass attempts affect trust score based on:

- Type severity (VPN/proxy more severe than settings)
- Frequency (repeated attempts more impactful)
- Recency (recent attempts weighted more)
- Whether marked as accidental (accidental = reduced impact)

### Non-Punitive Framing

Use language like:

- "This affected your trust score" not "You were caught"
- "Let's talk about this" not "You broke the rules"
- "Was this accidental?" not "Explain yourself"

### References

- [Source: packages/shared/src/contracts/trustScore.ts] - Trust score model
- [Source: apps/web/src/components/trustScore/] - Existing components
