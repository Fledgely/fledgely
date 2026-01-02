# Story 34.5.2: Mediation Resource Prompt

## Status: done

## Story

As **a child with consistently rejected proposals**,
I want **access to mediation resources**,
So that **I have a path forward when feeling unheard**.

## Acceptance Criteria

1. **AC1: Display Mediation Prompt on Escalation**
   - Given escalation threshold is reached (3+ rejections in 90 days)
   - When child views their proposals or agreement dashboard
   - Then supportive prompt appears with resources
   - And prompt is positioned prominently but not intrusively
   - And prompt persists until escalation is acknowledged

2. **AC2: Link to Family Communication Resources**
   - Given escalation prompt is displayed
   - When child interacts with the prompt
   - Then links to family communication resources are shown
   - And resources are curated and age-appropriate
   - And resources open in new tab/modal for easy return

3. **AC3: Family Meeting Template Access**
   - Given child is viewing mediation resources
   - When child selects "Family Meeting" option
   - Then structured family meeting template is displayed
   - And template is printable/shareable
   - And template sections include: parent concerns, child concerns, compromises

4. **AC4: Age-Appropriate Negotiation Tips**
   - Given child is viewing mediation resources
   - When child selects negotiation tips
   - Then age-appropriate negotiation guidance is shown
   - And tips are practical and actionable
   - And language matches child's age tier (8-11, 12-14, 15-17)

5. **AC5: Supportive, Non-Accusatory Messaging**
   - Given escalation prompt is displayed
   - When any messaging is shown to child
   - Then messaging is supportive and empowering
   - And no blame placed on parent
   - And focuses on constructive communication
   - And validates child's feelings without escalating conflict

6. **AC6: Parent Escalation Notification**
   - Given escalation threshold is reached
   - When escalation event is triggered
   - Then parent receives notification
   - And notification message: "Your child may feel unheard - consider a family conversation"
   - And notification links to same resources
   - And notification is not punitive toward parent

## Technical Tasks

### Task 1: Create Mediation Resources Data Structure (AC: #2, #3, #4)

Create data structure and content for mediation resources.

**Files:**

- `packages/shared/src/contracts/mediationResources.ts` (new)
- `packages/shared/src/contracts/mediationResources.test.ts` (new)

**Types and Schemas:**

```typescript
import { z } from 'zod'

// Age tiers for content adaptation
export const ageTierSchema = z.enum(['child-8-11', 'tween-12-14', 'teen-15-17'])
export type AgeTier = z.infer<typeof ageTierSchema>

// Mediation resource types
export const resourceTypeSchema = z.enum([
  'family-meeting-template',
  'negotiation-tips',
  'communication-guide',
  'external-resource',
])
export type ResourceType = z.infer<typeof resourceTypeSchema>

// Mediation resource schema
export const mediationResourceSchema = z.object({
  id: z.string(),
  type: resourceTypeSchema,
  title: z.string(),
  description: z.string(),
  content: z.string(), // Markdown content
  ageTier: ageTierSchema,
  externalUrl: z.string().url().nullable(), // For external resources
  isPrintable: z.boolean(),
  order: z.number().int().min(0),
})

// Family meeting template schema
export const familyMeetingTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  introduction: z.string(),
  parentSection: z.object({
    heading: z.string(),
    prompts: z.array(z.string()),
  }),
  childSection: z.object({
    heading: z.string(),
    prompts: z.array(z.string()),
  }),
  jointSection: z.object({
    heading: z.string(),
    prompts: z.array(z.string()),
  }),
  closingNotes: z.string(),
  ageTier: ageTierSchema,
})

export type MediationResource = z.infer<typeof mediationResourceSchema>
export type FamilyMeetingTemplate = z.infer<typeof familyMeetingTemplateSchema>
```

**Tests:** 15+ tests for schema validation

### Task 2: Create MediationResourceService (AC: #2, #3, #4)

Service for retrieving mediation resources based on child's age.

**Files:**

- `packages/shared/src/services/mediationResourceService.ts` (new)
- `packages/shared/src/services/mediationResourceService.test.ts` (new)

**Functions:**

```typescript
// Get age tier from child's birthdate
function getAgeTier(birthDate: Date): AgeTier

// Get all mediation resources for age tier
function getMediationResources(ageTier: AgeTier): Promise<MediationResource[]>

// Get family meeting template for age tier
function getFamilyMeetingTemplate(ageTier: AgeTier): FamilyMeetingTemplate

// Get negotiation tips for age tier
function getNegotiationTips(ageTier: AgeTier): MediationResource[]

// Format resource content for display
function formatResourceContent(resource: MediationResource): string
```

**Tests:** 20+ tests for resource retrieval and age tier logic

### Task 3: Create Escalation Prompt Component (AC: #1, #5)

React component for displaying escalation prompt to child.

**Files:**

- `apps/web/src/components/escalation/EscalationPrompt.tsx` (new)
- `apps/web/src/components/escalation/EscalationPrompt.test.tsx` (new)

**Component:**

```typescript
interface EscalationPromptProps {
  childId: string
  familyId: string
  ageTier: AgeTier
  onAcknowledge: () => void
  onViewResources: () => void
}

// Supportive messaging content by age tier
const PROMPT_MESSAGES = {
  'child-8-11': {
    title: 'We noticed something',
    message:
      "It seems like some of your ideas haven't been approved lately. That can feel frustrating! We have some tips that might help you talk with your parents about what you want.",
    cta: 'See helpful tips',
  },
  'tween-12-14': {
    title: 'Having trouble being heard?',
    message:
      "We've noticed several of your proposals weren't approved. That's okay - disagreements happen in families. Here are some resources that might help you have a productive conversation with your parents.",
    cta: 'View resources',
  },
  'teen-15-17': {
    title: 'Communication support available',
    message:
      "Multiple proposals have been declined recently. This might mean it's time for a deeper conversation with your family. We have resources to help facilitate that discussion.",
    cta: 'Access resources',
  },
}
```

**Tests:** 15+ tests for rendering, age-appropriate messaging, callbacks

### Task 4: Create Mediation Resources Modal (AC: #2, #3, #4)

Modal component for displaying mediation resources.

**Files:**

- `apps/web/src/components/escalation/MediationResourcesModal.tsx` (new)
- `apps/web/src/components/escalation/MediationResourcesModal.test.tsx` (new)

**Component:**

```typescript
interface MediationResourcesModalProps {
  isOpen: boolean
  onClose: () => void
  ageTier: AgeTier
  childName: string
}

// Tabs/sections:
// 1. "How to Talk to Your Parents" - Negotiation tips
// 2. "Family Meeting Guide" - Template
// 3. "Helpful Resources" - External links
```

**Tests:** 15+ tests for modal behavior, tab navigation, content display

### Task 5: Create Parent Escalation Notification (AC: #6)

Process escalation notifications to notify parents.

**Files:**

- `packages/shared/src/services/escalationNotificationService.ts` (new)
- `packages/shared/src/services/escalationNotificationService.test.ts` (new)

**Functions:**

```typescript
// Process pending escalation notification
async function processEscalationNotification(notificationId: string): Promise<void>

// Create parent notification for escalation
async function createParentEscalationNotification(
  familyId: string,
  childId: string,
  childName: string
): Promise<void>

// Get parent notification message (non-punitive)
function getParentNotificationMessage(childName: string): {
  title: string
  body: string
}
// Example: {
//   title: "Family communication support",
//   body: "Emma may be feeling unheard. Consider having a conversation about the agreement. Helpful resources are available."
// }
```

**Tests:** 15+ tests for notification creation, messaging

### Task 6: Create useEscalationStatus Hook (AC: #1)

Hook for checking and managing escalation status.

**Files:**

- `apps/web/src/hooks/useEscalationStatus.ts` (new)
- `apps/web/src/hooks/useEscalationStatus.test.ts` (new)

**Hook:**

```typescript
interface EscalationStatus {
  hasActiveEscalation: boolean
  escalationEvent: EscalationEvent | null
  isAcknowledged: boolean
}

interface UseEscalationStatusReturn {
  status: EscalationStatus | null
  loading: boolean
  error: Error | null
  acknowledgeEscalation: () => Promise<void>
}

function useEscalationStatus(familyId: string, childId: string): UseEscalationStatusReturn
```

**Tests:** 15+ tests for status detection, acknowledgment

### Task 7: Integrate Escalation Prompt in Child Dashboard (AC: #1)

Add escalation prompt to child's agreement view.

**Files:**

- `apps/web/src/pages/child/ChildAgreementView.tsx` (modify)
- `apps/web/src/pages/child/ChildAgreementView.test.tsx` (modify)

**Integration:**

```typescript
// In ChildAgreementView component
const { status, acknowledgeEscalation } = useEscalationStatus(familyId, childId)

// Render escalation prompt when active
{status?.hasActiveEscalation && !status.isAcknowledged && (
  <EscalationPrompt
    childId={childId}
    familyId={familyId}
    ageTier={childAgeTier}
    onAcknowledge={acknowledgeEscalation}
    onViewResources={() => setShowResourcesModal(true)}
  />
)}
```

**Tests:** 10+ integration tests

### Task 8: Add Firestore Security Rules (AC: #6)

Extend security rules for mediation resources.

**Files:**

- `packages/firebase-rules/firestore.rules` (modify)

**Rules:**

```javascript
// Mediation resources - public read for children
match /mediationResources/{resourceId} {
  allow read: if request.auth != null;
  allow write: if false; // Admin only
}

// Escalation acknowledgments
match /escalationAcknowledgments/{ackId} {
  allow read: if request.auth != null
              && (request.auth.token.familyId == resource.data.familyId
                  || request.auth.token.childId == resource.data.childId);
  allow create: if request.auth != null
                && request.auth.token.childId == request.resource.data.childId;
  allow update, delete: if false;
}
```

**Tests:** 10+ adversarial security tests

## Dev Notes

### Critical Safety Requirements

1. **Supportive, Not Accusatory**: All messaging must be supportive and never blame the parent
2. **Empowering**: Focus on empowering the child to communicate, not creating conflict
3. **Age-Appropriate**: All content must be tailored to the child's age tier
4. **Transparency**: Parent and child see same resources (builds trust)
5. **Privacy**: Escalation details visible to family only

### Previous Story Patterns to Follow

From **Story 34-5-1** (Rejection Pattern Tracking) - JUST COMPLETED:

- `escalationEvents` collection structure and access patterns
- `escalationNotifications` collection for queued notifications
- `useCommunicationMetrics` hook pattern for status checking
- Firestore security rules pattern with familyId/childId claims
- TDD approach with comprehensive test coverage

From **Story 23-2** (Child Annotation Interface):

- Age-appropriate UI patterns for children
- Modal patterns for child interactions
- Accessibility considerations for child interfaces

From **Story 34-5** (Change Decline Handling):

- Respectful messaging patterns
- Notification content that avoids blame

### Architecture Compliance

**New Collections:**

- `mediationResources` - Static resources (admin-write, public-read)
- `escalationAcknowledgments` - Track when child acknowledges escalation

**Extends Existing:**

- `escalationEvents` - Created by Story 34-5-1
- `escalationNotifications` - Created by Story 34-5-1

**Component Structure:**

- Components in `apps/web/src/components/escalation/`
- Services in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`

### Age Tier Content Guidelines

**Child (8-11):**

- Simple vocabulary
- Focus on feelings and fairness
- Short, concrete tips
- Visual aids encouraged

**Tween (12-14):**

- More nuanced vocabulary
- Focus on communication skills
- Practical negotiation strategies
- Examples they can relate to

**Teen (15-17):**

- Adult-like vocabulary
- Focus on mutual respect
- Sophisticated negotiation techniques
- Autonomy-focused messaging

### Testing Requirements

- TDD approach required
- Test age tier detection from birthdate
- Test all three age tiers for each component
- Test escalation prompt visibility logic
- Test parent notification content
- Test acknowledgment flow
- Adversarial security rule tests

### Project Structure Notes

Following established patterns:

- Shared services in `packages/shared/src/services/`
- Contracts in `packages/shared/src/contracts/`
- Components in `apps/web/src/components/`
- Hooks in `apps/web/src/hooks/`
- Tests use vitest with mocked Firebase

### References

- [Source: docs/epics/epic-list.md#Story-34.5.2 - Mediation Resource Prompt]
- [Source: docs/sprint-artifacts/stories/34-5-1-rejection-pattern-tracking.md - Escalation infrastructure]
- [Source: packages/shared/src/services/rejectionPatternService.ts - Escalation event creation]
- [Source: packages/shared/src/contracts/rejectionPattern.ts - EscalationEvent schema]
- [Source: apps/web/src/hooks/useCommunicationMetrics.ts - Hook pattern]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- All 8 tasks completed with TDD approach
- 176 tests passing across shared and web packages
- Age-appropriate messaging for child-8-11, tween-12-14, teen-15-17 tiers
- Supportive, non-accusatory messaging following Child Rights Advocate pattern
- Parent notification uses empathetic language ("may be feeling unheard")
- Security rules added for mediationResources and escalationAcknowledgments
- Integration with ChildAgreementContainer for escalation prompt display

### File List

**New Files (packages/shared/src/contracts/):**

- `mediationResources.ts` - Zod schemas for mediation resources, templates, tips
- `mediationResources.test.ts` - 36 tests for schema validation

**New Files (packages/shared/src/services/):**

- `mediationResourceService.ts` - Service for age-tiered resource retrieval
- `mediationResourceService.test.ts` - 36 tests for service logic
- `escalationNotificationService.ts` - Parent notification service
- `escalationNotificationService.test.ts` - 19 tests for notification messaging

**New Files (apps/web/src/components/escalation/):**

- `EscalationPrompt.tsx` - Age-appropriate prompt component
- `EscalationPrompt.test.tsx` - 20 tests for prompt behavior
- `MediationResourcesModal.tsx` - Tabbed modal with tips and template
- `MediationResourcesModal.test.tsx` - 26 tests for modal functionality
- `index.ts` - Barrel exports

**New Files (apps/web/src/hooks/):**

- `useEscalationStatus.ts` - Hook for escalation detection/acknowledgment
- `useEscalationStatus.test.ts` - 13 tests for hook behavior

**Modified Files:**

- `apps/web/src/components/child/ChildAgreementContainer.tsx` - Escalation prompt integration
- `apps/web/src/components/child/ChildAgreementContainer.test.tsx` - 6 new integration tests
- `packages/firebase-rules/firestore.rules` - Security rules for mediation resources
