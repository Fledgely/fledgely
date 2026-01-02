# Story 34.5.3: Agreement Review Request

## Status: done

## Story

As **a child**,
I want **to request a formal agreement review**,
So that **both parties are prompted to reassess terms together**.

## Acceptance Criteria

1. **AC1: Request Agreement Review Button**
   - Given child feels current agreement is unfair
   - When viewing their agreement dashboard
   - Then "Request Agreement Review" button is available
   - And button is styled invitingly (not aggressive)
   - And button includes supportive tooltip: "Invite your family to discuss the agreement"

2. **AC2: Review Request Notification to Parent**
   - Given child clicks "Request Agreement Review"
   - When request is submitted
   - Then parent receives notification: "[ChildName] is requesting that you both review the agreement"
   - And notification is non-confrontational (invitation, not demand)
   - And notification links to agreement with discussion suggestions

3. **AC3: Suggested Discussion Areas**
   - Given review request is submitted
   - When parent views the request
   - Then system suggests specific areas to discuss based on:
     - Terms that have been most frequently referenced
     - Areas where change proposals were rejected
     - Duration since last agreement review
   - And suggestions are framed constructively

4. **AC4: Rate Limiting (60-Day Cooldown)**
   - Given child has recently requested a review
   - When they try to request again within 60 days
   - Then button is disabled with message: "Next review can be requested in [X] days"
   - And cooldown prevents request spam
   - And countdown is visible to child

5. **AC5: Invitation, Not Demand**
   - Given any review request messaging
   - When displayed to either party
   - Then language is framed as invitation ("Would you like to discuss...")
   - And no ultimatums or pressure language used
   - And respects parent authority while empowering child voice

6. **AC6: Review Request Tracking**
   - Given review requests are made
   - When tracking for metrics
   - Then system records: request date, child ID, family ID
   - And request history visible to both parties (transparency)
   - And integrates with communication health metrics (Story 34.5.5)

## Technical Tasks

### Task 1: Create AgreementReviewRequest Schema (AC: #4, #6)

Create Zod schemas for agreement review requests.

**Files:**

- `packages/shared/src/contracts/agreementReviewRequest.ts` (new)
- `packages/shared/src/contracts/agreementReviewRequest.test.ts` (new)

**Schemas:**

```typescript
import { z } from 'zod'

// Constants
export const REVIEW_REQUEST_COOLDOWN_DAYS = 60

// Review request status
export const reviewRequestStatusSchema = z.enum(['pending', 'acknowledged', 'reviewed', 'expired'])
export type ReviewRequestStatus = z.infer<typeof reviewRequestStatusSchema>

// Agreement review request schema
export const agreementReviewRequestSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  childName: z.string(),
  agreementId: z.string(),
  requestedAt: z.date(),
  status: reviewRequestStatusSchema,
  acknowledgedAt: z.date().nullable(),
  reviewedAt: z.date().nullable(),
  suggestedAreas: z.array(z.string()),
  parentNotificationSent: z.boolean(),
  expiresAt: z.date(), // 30 days after request
})

export type AgreementReviewRequest = z.infer<typeof agreementReviewRequestSchema>

// Cooldown check result
export const cooldownStatusSchema = z.object({
  canRequest: z.boolean(),
  lastRequestAt: z.date().nullable(),
  nextAvailableAt: z.date().nullable(),
  daysRemaining: z.number().int().min(0),
})

export type CooldownStatus = z.infer<typeof cooldownStatusSchema>
```

**Tests:** 20+ tests for schema validation, cooldown calculation

### Task 2: Create AgreementReviewRequestService (AC: #1, #2, #4, #6)

Create service for managing agreement review requests.

**Files:**

- `packages/shared/src/services/agreementReviewRequestService.ts` (new)
- `packages/shared/src/services/agreementReviewRequestService.test.ts` (new)

**Functions:**

```typescript
// Check if child can request a review (cooldown check)
function checkReviewRequestCooldown(familyId: string, childId: string): Promise<CooldownStatus>

// Submit a review request
function submitReviewRequest(
  familyId: string,
  childId: string,
  childName: string,
  agreementId: string
): Promise<AgreementReviewRequest>

// Get suggested discussion areas based on history
function getSuggestedDiscussionAreas(
  familyId: string,
  childId: string,
  agreementId: string
): Promise<string[]>

// Get review request history for family
function getReviewRequestHistory(
  familyId: string,
  childId: string
): Promise<AgreementReviewRequest[]>

// Acknowledge a review request (parent)
function acknowledgeReviewRequest(requestId: string): Promise<void>

// Mark review as complete
function markReviewComplete(requestId: string): Promise<void>

// Get pending review request for child
function getPendingReviewRequest(
  familyId: string,
  childId: string
): Promise<AgreementReviewRequest | null>
```

**Tests:** 30+ tests for request submission, cooldown logic, suggestion generation

### Task 3: Create Review Request Notification Service (AC: #2, #5)

Create service for parent review request notifications.

**Files:**

- `packages/shared/src/services/reviewRequestNotificationService.ts` (new)
- `packages/shared/src/services/reviewRequestNotificationService.test.ts` (new)

**Functions:**

```typescript
interface ReviewRequestNotificationMessage {
  title: string
  body: string
  suggestedAreas: string[]
}

// Get parent notification message (non-confrontational)
function getReviewRequestNotificationMessage(
  childName: string,
  suggestedAreas: string[]
): ReviewRequestNotificationMessage
// Example: {
//   title: "Agreement discussion invitation",
//   body: "Alex is inviting you to discuss the agreement together. This could be a good opportunity to check in.",
//   suggestedAreas: ["Screen time limits", "Weekend rules"]
// }

// Create parent notification for review request
async function createReviewRequestNotification(
  familyId: string,
  requestId: string,
  childName: string,
  suggestedAreas: string[]
): Promise<void>

// Sanitize child name for notifications
function sanitizeChildName(name: string): string
```

**Tests:** 15+ tests for notification creation, messaging tone

### Task 4: Create RequestAgreementReviewButton Component (AC: #1, #4, #5)

Create button component for requesting agreement review.

**Files:**

- `apps/web/src/components/child/RequestAgreementReviewButton.tsx` (new)
- `apps/web/src/components/child/RequestAgreementReviewButton.test.tsx` (new)

**Component:**

```typescript
interface RequestAgreementReviewButtonProps {
  familyId: string
  childId: string
  childName: string
  agreementId: string
  onRequestSubmitted?: () => void
}

// Button states:
// - Available: "Request Agreement Review" with supportive tooltip
// - Cooldown: Disabled with "Next review in X days" message
// - Pending: "Review Requested - Waiting for response"
// - Loading: Submitting request

// Tooltip: "Invite your family to have a conversation about the agreement"
```

**Tests:** 20+ tests for button states, cooldown display, submission flow

### Task 5: Create useReviewRequestCooldown Hook (AC: #4)

Hook for managing review request cooldown state.

**Files:**

- `apps/web/src/hooks/useReviewRequestCooldown.ts` (new)
- `apps/web/src/hooks/useReviewRequestCooldown.test.ts` (new)

**Hook:**

```typescript
interface UseReviewRequestCooldownReturn {
  cooldownStatus: CooldownStatus | null
  loading: boolean
  error: Error | null
  canRequest: boolean
  daysRemaining: number
  submitRequest: () => Promise<AgreementReviewRequest | null>
  isSubmitting: boolean
}

function useReviewRequestCooldown(
  familyId: string,
  childId: string,
  childName: string,
  agreementId: string
): UseReviewRequestCooldownReturn
```

**Tests:** 15+ tests for cooldown state management, request submission

### Task 6: Create ParentReviewRequestNotification Component (AC: #2, #3)

Component for displaying review request to parent.

**Files:**

- `apps/web/src/components/parent/ReviewRequestNotification.tsx` (new)
- `apps/web/src/components/parent/ReviewRequestNotification.test.tsx` (new)

**Component:**

```typescript
interface ReviewRequestNotificationProps {
  request: AgreementReviewRequest
  onAcknowledge: () => void
  onViewAgreement: () => void
}

// Displays:
// - Child's invitation message
// - Suggested discussion areas
// - "View Agreement" and "Acknowledge" buttons
// - Supportive framing ("This is an invitation to connect")
```

**Tests:** 15+ tests for rendering, suggested areas display, actions

### Task 7: Integrate in Child Agreement Dashboard (AC: #1)

Add review request button to child's agreement view.

**Files:**

- `apps/web/src/components/child/ChildAgreementContainer.tsx` (modify)
- `apps/web/src/components/child/ChildAgreementContainer.test.tsx` (modify)

**Integration:**

```typescript
// Add review request button below agreement display
{agreement && (
  <RequestAgreementReviewButton
    familyId={familyId}
    childId={childId}
    childName={childName}
    agreementId={agreement.id}
    onRequestSubmitted={handleReviewRequestSubmitted}
  />
)}

// Handle submission feedback
const handleReviewRequestSubmitted = () => {
  // Show success message: "Your request has been sent to your parents"
}
```

**Tests:** 10+ integration tests

### Task 8: Add Firestore Security Rules (AC: #6)

Add security rules for review request collections.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)
- `packages/firebase-rules/__tests__/agreementReviewRequestRules.test.ts` (new)

**Rules:**

```javascript
// Agreement review requests
match /agreementReviewRequests/{requestId} {
  // Family members can read their family's requests
  allow read: if request.auth != null
              && (request.auth.token.familyId == resource.data.familyId
                  || request.auth.token.childId == resource.data.childId);

  // Child can create review requests for their own family
  allow create: if request.auth != null
                && request.auth.token.childId == request.resource.data.childId
                && request.resource.data.familyId is string
                && request.resource.data.agreementId is string
                && request.resource.data.requestedAt is timestamp
                && request.resource.data.status == 'pending';

  // Only parent can acknowledge/update
  allow update: if request.auth != null
                && request.auth.token.familyId == resource.data.familyId
                && request.auth.token.role == 'parent';

  // No deletion
  allow delete: if false;
}

// Review request notifications
match /reviewRequestNotifications/{notificationId} {
  allow read: if request.auth != null
              && request.auth.token.familyId == resource.data.familyId;
  allow write: if false; // System-created only
}
```

**Tests:** 15+ adversarial security rule tests

## Dev Notes

### Critical Design Principles

1. **Invitation, Not Demand**: All messaging must feel like an invitation to dialogue, not a confrontation
2. **Respects Parent Authority**: Child can request, parent decides when/how to respond
3. **Empowers Child Voice**: Gives children a formal channel to be heard
4. **Rate Limited**: 60-day cooldown prevents spam while allowing genuine requests
5. **Transparency**: Both parties see request history

### Messaging Tone Guidelines

**DO:**

- "Invite you to discuss..."
- "...is requesting that you both review..."
- "A good opportunity to check in"
- "Consider having a conversation"

**DON'T:**

- "Demanding a review"
- "Must respond"
- "Failed to address"
- Any ultimatum language

### Previous Story Patterns to Follow

From **Story 34-5-1** (Rejection Pattern Tracking):

- `rejectionPatternService.ts` - Service structure with Firebase
- `useCommunicationMetrics` hook - Hook pattern with loading/error states
- Firestore security rules with familyId/childId claims
- TDD approach with comprehensive tests

From **Story 34-5-2** (Mediation Resource Prompt):

- `escalationNotificationService.ts` - Notification messaging patterns
- `useEscalationStatus` hook - Status checking hook pattern
- Age-appropriate, supportive messaging
- Non-punitive parent notifications

From **Story 19C-5** (Request Agreement Change):

- `ChangeRequestModal` - Modal patterns for child requests
- `useChangeRequest` hook - Request submission pattern
- Success feedback patterns

### Suggested Discussion Areas Logic

Generate suggestions based on:

1. **Rejection History**: Terms where change proposals were rejected
2. **Agreement Age**: If agreement > 6 months, suggest general review
3. **Time-Related Terms**: Screen time limits, bedtime rules
4. **Recently Modified Terms**: Areas that have seen recent changes

Example suggestions:

- "Screen time limits" (if related rejections)
- "Weekend rules" (common discussion topic)
- "The agreement is 8 months old - consider a general check-in"

### Architecture Compliance

**New Collections:**

- `agreementReviewRequests` - Review request records
- `reviewRequestNotifications` - Parent notification queue

**Extends Existing:**

- Uses `communicationMetrics` from Story 34-5-1 for suggestions
- Uses `rejectionPatterns` from Story 34-5-1 for suggestion logic
- Uses `escalationEvents` from Story 34-5-2 for context

**Component Structure:**

- Components in `apps/web/src/components/child/` and `apps/web/src/components/parent/`
- Services in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`
- Hooks in `apps/web/src/hooks/`

### Testing Requirements

- TDD approach required
- Test 60-day cooldown calculation with edge cases
- Test suggested areas generation logic
- Test all messaging for appropriate tone
- Test button state transitions
- Test notification creation and delivery
- Adversarial security rule tests

### Project Structure Notes

Following established patterns:

- Shared services in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`
- Components in `apps/web/src/components/`
- Hooks in `apps/web/src/hooks/`
- Tests use vitest with mocked Firebase

### References

- [Source: docs/epics/epic-list.md#Story-34.5.3 - Agreement Review Request]
- [Source: docs/sprint-artifacts/stories/34-5-1-rejection-pattern-tracking.md - Pattern tracking service]
- [Source: docs/sprint-artifacts/stories/34-5-2-mediation-resource-prompt.md - Notification patterns]
- [Source: apps/web/src/components/child/ChildAgreementContainer.tsx - Integration point]
- [Source: packages/shared/src/services/rejectionPatternService.ts - Service patterns]
- [Source: packages/shared/src/services/escalationNotificationService.ts - Notification patterns]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Task 1: Created AgreementReviewRequest schema with Zod validation, cooldown calculation (46 tests)
- Task 2: Created AgreementReviewRequestService with Firebase integration (33 tests)
- Task 3: Created ReviewRequestNotificationService with invitation-style messaging (27 tests)
- Task 4: Created RequestAgreementReviewButton component with cooldown states (20 tests)
- Task 5: Created useReviewRequestCooldown hook for state management (13 tests)
- Task 6: Created ReviewRequestNotification component for parent view (18 tests)
- Task 7: Integrated button in ChildAgreementContainer (29 tests)
- Task 8: Added Firestore security rules with adversarial tests (28 tests)
- Total: 214 tests across all tasks

### File List

**New Files:**

- `packages/shared/src/contracts/agreementReviewRequest.ts`
- `packages/shared/src/contracts/agreementReviewRequest.test.ts`
- `packages/shared/src/services/agreementReviewRequestService.ts`
- `packages/shared/src/services/agreementReviewRequestService.test.ts`
- `packages/shared/src/services/reviewRequestNotificationService.ts`
- `packages/shared/src/services/reviewRequestNotificationService.test.ts`
- `apps/web/src/components/child/RequestAgreementReviewButton.tsx`
- `apps/web/src/components/child/RequestAgreementReviewButton.test.tsx`
- `apps/web/src/hooks/useReviewRequestCooldown.ts`
- `apps/web/src/hooks/useReviewRequestCooldown.test.ts`
- `apps/web/src/components/parent/ReviewRequestNotification.tsx`
- `apps/web/src/components/parent/ReviewRequestNotification.test.tsx`
- `packages/firebase-rules/__tests__/agreementReviewRequestRules.test.ts`

**Modified Files:**

- `apps/web/src/components/child/ChildAgreementContainer.tsx` (added button integration)
- `apps/web/src/components/child/ChildAgreementContainer.test.tsx` (added integration tests)
- `packages/firebase-rules/firestore.rules` (added security rules)
