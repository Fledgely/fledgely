# Story 37-5: Developmental Framing in UI

## Story

As **a child**,
I want **system messaging to frame privacy as a right**,
So that **I don't feel like I'm earning what I deserve**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Language uses "recognition" not "reward"
- [x] AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
- [x] AC3: Emphasis: privacy is inherent, monitoring is temporary support
- [x] AC4: Messaging validated with child rights advocate principles
- [x] AC5: Helps children understand their developmental rights
- [x] AC6: Reduces shame around monitoring

## Technical Tasks

### Task 1: DevelopmentalMessaging Constants

Create centralized messaging constants for developmental framing.

**Files:**

- `packages/shared/src/contracts/developmentalMessaging.ts` (new)
- `packages/shared/src/contracts/developmentalMessaging.test.ts` (new)

**Constants:**

```typescript
// Rights-based messaging
const MESSAGING_PRINCIPLES = {
  privacyIsRight: 'Privacy is your right as you grow',
  monitoringTemporary: 'Monitoring is temporary support',
  recognizingGrowth: 'Recognizing your growth',
}

// Approved vs Discouraged language
const APPROVED_LANGUAGE = ['recognizing', 'growth', 'maturity', 'developmental']
const DISCOURAGED_LANGUAGE = ['earned', 'reward', 'deserve', 'privilege']
```

**Acceptance Criteria:** AC1, AC2

### Task 2: DevelopmentalMessagingService

Create service for generating rights-based messages.

**Files:**

- `packages/shared/src/services/developmentalMessagingService.ts` (new)
- `packages/shared/src/services/developmentalMessagingService.test.ts` (new)

**Functions:**

```typescript
// Get milestone message with proper framing
function getMilestoneMessage(milestone: TrustMilestone, childName: string): string

// Get reduction notification message
function getReductionMessage(reductionType: string): string

// Get regression message (supportive, not punitive)
function getRegressionMessage(): string

// Validate message follows developmental framing
function validateDevelopmentalFraming(message: string): { valid: boolean; issues: string[] }
```

**Acceptance Criteria:** AC1, AC2, AC3, AC4

### Task 3: DevelopmentalFramingIndicator Component

Create UI component that displays rights-based messaging.

**Files:**

- `apps/web/src/components/milestones/DevelopmentalFramingIndicator.tsx` (new)
- `apps/web/src/components/milestones/DevelopmentalFramingIndicator.test.tsx` (new)

**Props:**

```typescript
interface DevelopmentalFramingIndicatorProps {
  context: 'milestone' | 'reduction' | 'regression' | 'info'
  milestone?: TrustMilestone
  childName: string
  viewerType: 'child' | 'parent'
}
```

**Features:**

- Shows appropriate message for context
- Child view emphasizes rights and growth
- Parent view explains developmental approach
- Never uses "earned" or "reward" language

**Acceptance Criteria:** AC1, AC2, AC5, AC6

### Task 4: Integration Tests

Create integration tests for developmental framing across the system.

**Files:**

- `apps/web/src/components/milestones/__tests__/developmentalFraming.integration.test.tsx` (new)

**Tests:**

- All milestone messages follow developmental framing
- No "earned/reward" language in any message
- Child rights emphasis present
- Shame-reducing language verified
- Parent messaging explains approach

**Acceptance Criteria:** All ACs

## Dev Notes

### Child Rights Advocate Guidance

Key principle: "Privacy is a RIGHT - it's not earned, it's inherent."

**Language Guidelines:**

- Use: "recognizing", "growth", "maturity", "developmental"
- Avoid: "earned", "reward", "deserve", "privilege"

**Correct framing:**

- "We're recognizing your growth by reducing monitoring"
- "Privacy is your developmental right"
- "Monitoring is temporary support as you grow"

**Incorrect framing:**

- "You've earned more privacy"
- "You deserve this reward for good behavior"
- "Privacy is a privilege you've earned"

### References

- [Source: packages/shared/src/contracts/trustMilestones.ts] - Milestone definitions
- [Source: packages/shared/src/services/frequencyReductionService.ts] - Reduction messaging
- [Source: apps/web/src/components/milestones/AutomaticReductionNotification.tsx] - Existing patterns
