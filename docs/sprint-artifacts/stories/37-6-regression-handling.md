# Story 37-6: Regression Handling

## Story

As **a family**,
I want **graceful handling when trust score drops**,
So that **temporary setbacks become learning opportunities not punishment**.

## Status: Done

## Acceptance Criteria

- [x] AC1: 2-week grace period before monitoring increases
- [x] AC2: Notification: "Let's talk about what happened"
- [x] AC3: Conversation-first approach, not automatic punishment
- [x] AC4: Parent-child discussion encouraged before changes
- [x] AC5: Child can explain circumstances
- [x] AC6: Regression framed as "let's work on this" not "you failed"

## Technical Tasks

### Task 1: RegressionConfig Schema and Types

Create Zod schemas and types for trust regression configuration.

**Files:**

- `packages/shared/src/contracts/trustRegression.ts` (new)
- `packages/shared/src/contracts/trustRegression.test.ts` (new)

**Types:**

```typescript
interface TrustRegressionConfig {
  gracePeriodDays: number // Default: 14 (2 weeks)
  conversationFirst: boolean // Always true
  childCanExplain: boolean // Always true
  autoRevertAfterGrace: boolean // Whether monitoring auto-reverts after grace
}

interface RegressionEvent {
  childId: string
  previousMilestone: TrustMilestone
  currentMilestone: TrustMilestone
  occurredAt: Date
  graceExpiresAt: Date
  status: 'grace_period' | 'awaiting_conversation' | 'resolved' | 'reverted'
  childExplanation?: string
  conversationHeld: boolean
}
```

**Acceptance Criteria:** AC1, AC3

### Task 2: TrustRegressionService

Create service for managing trust regression events.

**Files:**

- `packages/shared/src/services/trustRegressionService.ts` (new)
- `packages/shared/src/services/trustRegressionService.test.ts` (new)

**Functions:**

```typescript
// Create regression event with 2-week grace period
function createRegressionEvent(
  childId: string,
  previousMilestone: TrustMilestone,
  currentMilestone: TrustMilestone
): RegressionEvent

// Check if still in grace period
function isInGracePeriod(event: RegressionEvent): boolean

// Record child explanation
function recordChildExplanation(eventId: string, explanation: string): RegressionEvent

// Mark conversation held
function markConversationHeld(eventId: string): RegressionEvent

// Resolve regression (keep current monitoring level)
function resolveRegression(eventId: string): RegressionEvent

// Revert monitoring (only after grace + conversation)
function revertMonitoring(eventId: string): RegressionEvent

// Get regression status for child
function getRegressionStatus(childId: string): RegressionEvent | null
```

**Acceptance Criteria:** AC1, AC3, AC4, AC5

### Task 3: RegressionNotificationService

Create service for supportive regression notifications.

**Files:**

- `packages/shared/src/services/regressionNotificationService.ts` (new)
- `packages/shared/src/services/regressionNotificationService.test.ts` (new)

**Functions:**

```typescript
// Get "Let's talk" notification for child
function getChildRegressionNotification(childName: string): RegressionNotification

// Get notification for parent
function getParentRegressionNotification(childName: string): RegressionNotification

// Get grace period reminder
function getGracePeriodReminder(daysRemaining: number, viewerType: ViewerType): string

// Get conversation prompt
function getConversationPrompt(viewerType: ViewerType): string

// Get "let's work on this" framing
function getSupportiveFraming(viewerType: ViewerType): string
```

**Message Examples:**

- Child: "Let's talk about what happened. This isn't punishment - it's a chance to understand and work through this together."
- Parent: "Emma's trust score has dropped. This is an opportunity for a supportive conversation before any changes take effect."

**Acceptance Criteria:** AC2, AC6

### Task 4: RegressionIndicator Component

Create UI component for displaying regression state and facilitating conversation.

**Files:**

- `apps/web/src/components/milestones/RegressionIndicator.tsx` (new)
- `apps/web/src/components/milestones/RegressionIndicator.test.tsx` (new)

**Props:**

```typescript
interface RegressionIndicatorProps {
  regressionEvent: RegressionEvent
  childName: string
  viewerType: ViewerType
  onRecordExplanation?: (explanation: string) => void
  onMarkConversationHeld?: () => void
  onResolve?: () => void
}
```

**Features:**

- Shows grace period countdown
- Child view: form to explain circumstances
- Parent view: prompt to have conversation
- Supportive messaging throughout
- Shows "Let's work on this" framing

**Acceptance Criteria:** AC2, AC4, AC5, AC6

### Task 5: Integration Tests

Create integration tests for complete regression workflow.

**Files:**

- `apps/web/src/components/milestones/__tests__/trustRegression.integration.test.tsx` (new)

**Tests:**

- Full regression workflow from detection to resolution
- Grace period enforcement (no changes within 2 weeks)
- Conversation-first requirement
- Child explanation flow
- Supportive language verification
- No punitive framing anywhere

**Acceptance Criteria:** All ACs

## Dev Notes

### Child Rights Advocate Guidance

Key principle: "Regression should be a learning moment, not a punishment."

**Correct framing:**

- "Let's talk about what happened"
- "This isn't punishment - it's support"
- "Let's work on this together"
- "Your explanation matters"

**Incorrect framing:**

- "You failed"
- "You've lost your privileges"
- "Your trust has been violated"
- "Consequences for your actions"

### Grace Period Logic

- 2 weeks from regression detection
- No automatic monitoring changes during grace
- Conversation must occur before any changes
- Child always gets chance to explain
- Resolution options: keep current level OR revert (but only after conversation)

### References

- [Source: packages/shared/src/contracts/trustMilestones.ts] - Milestone definitions
- [Source: packages/shared/src/services/developmentalMessagingService.ts] - Message patterns
- [Source: apps/web/src/components/milestones/DevelopmentalFramingIndicator.tsx] - UI patterns
