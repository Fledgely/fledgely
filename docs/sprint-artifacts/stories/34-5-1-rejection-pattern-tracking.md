# Story 34.5.1: Rejection Pattern Tracking

## Status: done

## Story

As **the system**,
I want **to track patterns of rejected child proposals**,
So that **communication breakdowns can be identified**.

## Acceptance Criteria

1. **AC1: Track Proposal Rejections**
   - Given a child submits agreement change proposals
   - When proposals are rejected by parents
   - Then system tracks: proposal count, rejection count, dates
   - And pattern analysis runs after each rejection
   - And only aggregate patterns tracked, not proposal content

2. **AC2: 90-Day Rolling Window**
   - Given rejections are being tracked
   - When calculating patterns
   - Then 90-day rolling window is used for pattern detection
   - And older rejections are not counted
   - And window updates automatically with each new event

3. **AC3: Threshold Detection**
   - Given child has multiple rejected proposals
   - When 3 rejections occur within 90 days
   - Then threshold escalation is triggered
   - And escalation event is recorded
   - And escalation notification is queued

4. **AC4: Privacy-Preserving Tracking**
   - Given rejection patterns are tracked
   - When data is stored
   - Then only aggregate data tracked, not proposal content
   - And patterns tracked per child, not per agreement section
   - And data respects child privacy principles

5. **AC5: Family Communication Metrics**
   - Given patterns are being tracked
   - When parent or child views communication health
   - Then metrics are available (for Story 34.5.5)
   - And metrics include: total proposals, rejection rate, trend
   - And metrics are family-visible (transparency)

## Technical Tasks

### Task 1: Create RejectionPatternService (AC: #1, #2, #3)

Create service for tracking and analyzing rejection patterns.

**Files:**

- `packages/shared/src/services/rejectionPatternService.ts` (new)
- `packages/shared/src/services/rejectionPatternService.test.ts` (new)

**Types and Functions:**

```typescript
// Rejection pattern tracking data
interface RejectionPattern {
  id: string
  familyId: string
  childId: string
  totalProposals: number
  totalRejections: number
  rejectionsInWindow: number // Within 90-day window
  lastProposalAt: Date | null
  lastRejectionAt: Date | null
  escalationTriggered: boolean
  escalationTriggeredAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// Rejection event for tracking
interface RejectionEvent {
  id: string
  familyId: string
  childId: string
  proposalId: string
  rejectedAt: Date
  // NO proposal content stored - privacy preserving
}

// Collection for pattern tracking
const REJECTION_PATTERNS_COLLECTION = 'rejectionPatterns'
const REJECTION_EVENTS_COLLECTION = 'rejectionEvents'

// Record a proposal rejection
function recordRejection(
  familyId: string,
  childId: string,
  proposalId: string
): Promise<RejectionPattern>

// Calculate rejections in 90-day window
function calculateRejectionsInWindow(childId: string, windowDays: number = 90): Promise<number>

// Check if escalation threshold is reached
function checkEscalationThreshold(childId: string, threshold: number = 3): Promise<boolean>

// Get pattern for child
function getRejectionPattern(childId: string): Promise<RejectionPattern | null>

// Trigger escalation event
function triggerEscalation(familyId: string, childId: string): Promise<void>
```

**Tests:** 30+ tests for pattern tracking, window calculation, threshold detection

### Task 2: Create RejectionPattern Schema (AC: #4, #5)

Add Zod schemas for rejection pattern tracking.

**Files:**

- `packages/shared/src/contracts/rejectionPattern.ts` (new)
- `packages/shared/src/contracts/rejectionPattern.test.ts` (new)

**Schemas:**

```typescript
import { z } from 'zod'

// Pattern constants
export const REJECTION_WINDOW_DAYS = 90
export const REJECTION_THRESHOLD = 3

// Rejection pattern schema
export const rejectionPatternSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  totalProposals: z.number().int().min(0),
  totalRejections: z.number().int().min(0),
  rejectionsInWindow: z.number().int().min(0),
  lastProposalAt: z.date().nullable(),
  lastRejectionAt: z.date().nullable(),
  escalationTriggered: z.boolean(),
  escalationTriggeredAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Rejection event schema (privacy-preserving)
export const rejectionEventSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  proposalId: z.string(), // Reference only, no content
  rejectedAt: z.date(),
})

// Escalation event schema
export const escalationEventSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: string(),
  triggeredAt: z.date(),
  rejectionsCount: z.number().int(),
  windowDays: z.number().int(),
  acknowledged: z.boolean(),
  acknowledgedAt: z.date().nullable(),
})

export type RejectionPattern = z.infer<typeof rejectionPatternSchema>
export type RejectionEvent = z.infer<typeof rejectionEventSchema>
export type EscalationEvent = z.infer<typeof escalationEventSchema>
```

**Tests:** 20+ tests for schema validation, edge cases

### Task 3: Integrate with Proposal Response Flow (AC: #1)

Extend existing proposal response to trigger pattern tracking.

**Files:**

- `apps/web/src/services/agreementProposalService.ts` (modify)
- `apps/web/src/services/agreementProposalService.test.ts` (modify)
- `apps/web/src/hooks/useProposalResponse.ts` (modify)

**Modifications:**

```typescript
// In agreementProposalService.ts - extend logProposalResponse

// After logging a decline action for child proposal
export async function handleChildProposalRejection(
  familyId: string,
  childId: string,
  proposalId: string
): Promise<void> {
  // Record rejection in pattern tracking
  const pattern = await recordRejection(familyId, childId, proposalId)

  // Check if escalation threshold reached
  if (await checkEscalationThreshold(childId)) {
    await triggerEscalation(familyId, childId)
  }
}

// In useProposalResponse hook - call after decline
const handleDecline = async () => {
  // Existing decline logic...

  // If this was a child's proposal being declined
  if (proposal.proposedBy === 'child') {
    await handleChildProposalRejection(proposal.familyId, proposal.childId, proposal.id)
  }
}
```

**Tests:** 15+ tests for integration flow

### Task 4: Create Firestore Security Rules (AC: #4)

Add security rules for rejection pattern collections.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)

**Rules:**

```javascript
// Rejection patterns - family members can read own family's patterns
match /rejectionPatterns/{patternId} {
  allow read: if isFamilyMember(resource.data.familyId);
  // Write only via Cloud Functions or admin
  allow write: if false;
}

// Rejection events - more restrictive
match /rejectionEvents/{eventId} {
  // Only admin/system can access (privacy)
  allow read: if false;
  allow write: if false;
}

// Escalation events - family can read
match /escalationEvents/{eventId} {
  allow read: if isFamilyMember(resource.data.familyId);
  // Write only via Cloud Functions
  allow write: if false;
}
```

**Tests:** 10+ adversarial security rule tests

### Task 5: Create Communication Metrics Hook (AC: #5)

Create hook for accessing communication health metrics.

**Files:**

- `apps/web/src/hooks/useCommunicationMetrics.ts` (new)
- `apps/web/src/hooks/useCommunicationMetrics.test.ts` (new)

**Hook:**

```typescript
interface CommunicationMetrics {
  totalProposals: number
  totalRejections: number
  rejectionsInWindow: number
  rejectionRate: number // percentage
  escalationTriggered: boolean
  trend: 'improving' | 'stable' | 'needs-attention'
}

interface UseCommunicationMetricsReturn {
  metrics: CommunicationMetrics | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

function useCommunicationMetrics(familyId: string, childId: string): UseCommunicationMetricsReturn
```

**Tests:** 15+ tests for hook, metric calculations

### Task 6: Record Proposal Submissions (AC: #5)

Track proposal submissions (not just rejections) for complete metrics.

**Files:**

- `apps/web/src/services/agreementProposalService.ts` (modify)

**Modifications:**

```typescript
// After child proposal creation
export async function handleChildProposalSubmission(
  familyId: string,
  childId: string,
  proposalId: string
): Promise<void> {
  // Update pattern with proposal count
  await incrementProposalCount(familyId, childId)
}

// In proposal creation hook - call after submission
const handleSubmit = async () => {
  // Existing creation logic...

  await handleChildProposalSubmission(familyId, childId, newProposal.id)
}
```

**Tests:** 10+ tests for proposal tracking

## Dev Notes

### Critical Safety Requirements

1. **Privacy-Preserving**: Only track aggregate patterns, NEVER store proposal content in pattern tracking
2. **Transparency**: Both parent and child can see communication metrics (family transparency)
3. **No Punishment**: Pattern tracking is for support, not punishment
4. **Child Rights**: Empowers children by surfacing when their voice isn't being heard

### Previous Story Patterns to Follow

From **Story 34-5** (Change Decline Handling):

- `declineHandlingService.ts` - Decline notification patterns
- 7-day cooldown logic pattern (adapt for 90-day window)
- Respectful messaging patterns

From **Story 34-2** (Child-Initiated Agreement Change):

- `useAgreementProposal` hook - Proposal creation pattern
- Child proposal notification pattern
- Firestore query patterns for child proposals

From **Story 34-3** (Change Review and Negotiation):

- `useProposalResponse` hook - Decline action flow
- `notifyProposerOfResponse` - Response notification

### Architecture Compliance

**Collections:**

- `rejectionPatterns` - Aggregate pattern data per child (family-visible)
- `rejectionEvents` - Individual events (system-only, privacy)
- `escalationEvents` - Threshold breach events (family-visible)

**Security Rules:**

- Family can read their patterns and escalations
- Rejection events are system-only for privacy
- All writes via Cloud Functions

### Testing Requirements

- TDD approach required
- Test 90-day window calculation edge cases
- Test threshold at exactly 3 rejections
- Test escalation triggering only once
- Test proposal count increments
- Test metric calculations
- Adversarial security rule tests

### Project Structure Notes

Following established patterns:

- Shared service in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`
- Hooks in `apps/web/src/hooks/`
- Tests use vitest with mocked Firebase

### References

- [Source: docs/epics/epic-list.md#Story-34.5.1 - Rejection Pattern Tracking]
- [Source: docs/sprint-artifacts/stories/34-5-change-decline-handling.md - Decline patterns]
- [Source: docs/sprint-artifacts/stories/34-2-child-initiated-agreement-change.md - Child proposal flow]
- [Source: apps/web/src/services/agreementProposalService.ts - Proposal service patterns]
- [Source: apps/web/src/hooks/useProposalResponse.ts - Response hook patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 tasks implemented with TDD approach
- 30+ tests for rejectionPatternService (pattern tracking, window calculation, threshold detection)
- 23 tests for rejectionPattern schema validation
- 15 tests for useCommunicationMetrics hook
- 7 tests for child proposal rejection integration in useProposalResponse
- 4 tests for child proposal submission tracking in useAgreementProposal
- Security rules with adversarial tests for all 3 collections
- AC3 notification queueing added via escalationNotifications collection

### File List

**New Files:**

- `packages/shared/src/services/rejectionPatternService.ts` - Core service for pattern tracking (Task 1)
- `packages/shared/src/services/rejectionPatternService.test.ts` - 32 tests for service
- `packages/shared/src/contracts/rejectionPattern.ts` - Zod schemas (Task 2)
- `packages/shared/src/contracts/rejectionPattern.test.ts` - 23 schema tests
- `apps/web/src/hooks/useCommunicationMetrics.ts` - Communication metrics hook (Task 5)
- `apps/web/src/hooks/useCommunicationMetrics.test.ts` - 15 hook tests
- `packages/firebase-rules/__tests__/rejectionPatternRules.test.ts` - Security rule tests (Task 4)

**Modified Files:**

- `apps/web/src/services/agreementProposalService.ts` - Added rejection/submission handlers (Task 3, 6)
- `apps/web/src/services/agreementProposalService.test.ts` - Added integration tests
- `apps/web/src/hooks/useProposalResponse.ts` - Added rejection tracking on decline (Task 3)
- `apps/web/src/hooks/useProposalResponse.test.ts` - Added rejection tracking tests
- `apps/web/src/hooks/useAgreementProposal.ts` - Added submission tracking (Task 6)
- `apps/web/src/hooks/useAgreementProposal.test.ts` - Added submission tracking tests
- `packages/firebase-rules/firestore.rules` - Added rules for 4 collections (Task 4)
- `packages/shared/src/contracts/index.ts` - Added exports
- `packages/shared/src/index.ts` - Added service exports
