# Story 38-2: Graduation Conversation Trigger

## Story

As **a child who has maintained perfect trust**,
I want **the system to initiate a graduation conversation**,
So that **I don't stay monitored indefinitely despite compliance**.

## Status: done

## Acceptance Criteria

- [x] AC1: System detects when child reaches 12 consecutive months at 100% trust
- [x] AC2: Notification sent to BOTH child AND parent about eligibility
- [x] AC3: Both parties must acknowledge readiness for graduation conversation
- [x] AC4: System suggests: "Your child has shown consistent responsibility"
- [x] AC5: Conversation template provided with discussion points
- [x] AC6: Prevents indefinite monitoring of compliant teens
- [x] AC7: Respects child's demonstrated readiness for independence

## Technical Tasks

### Task 1: GraduationConversation Data Model

Create Zod schemas and types for graduation conversation tracking.

**Files:**

- `packages/shared/src/contracts/graduationConversation.ts` (new)
- `packages/shared/src/contracts/graduationConversation.test.ts` (new)

**Types:**

```typescript
interface GraduationConversation {
  id: string
  familyId: string
  childId: string
  initiatedAt: Date
  expiresAt: Date // Conversation should happen within 30 days
  status: 'pending' | 'acknowledged' | 'scheduled' | 'completed' | 'declined'
  childAcknowledgment: AcknowledgmentRecord | null
  parentAcknowledgments: AcknowledgmentRecord[] // All parents must acknowledge
  scheduledDate: Date | null
  completedAt: Date | null
  outcome: 'graduated' | 'deferred' | 'declined' | null
}

interface AcknowledgmentRecord {
  userId: string
  role: 'child' | 'parent'
  acknowledgedAt: Date
  message?: string
}

interface ConversationTemplate {
  id: string
  title: string
  discussionPoints: DiscussionPoint[]
  suggestedQuestions: string[]
  resources: Resource[]
}

interface DiscussionPoint {
  topic: string
  forChild: string
  forParent: string
  optional: boolean
}
```

**Acceptance Criteria:** AC1, AC3

### Task 2: GraduationConversationService

Create service for managing graduation conversations.

**Files:**

- `packages/shared/src/services/graduationConversationService.ts` (new)
- `packages/shared/src/services/graduationConversationService.test.ts` (new)

**Functions:**

```typescript
// Initiate graduation conversation when eligibility is reached
function initiateGraduationConversation(
  familyId: string,
  childId: string,
  parentIds: string[]
): GraduationConversation

// Record acknowledgment from child or parent
function recordAcknowledgment(
  conversationId: string,
  userId: string,
  role: 'child' | 'parent'
): GraduationConversation

// Check if all parties have acknowledged
function checkAllAcknowledged(conversation: GraduationConversation): boolean

// Schedule the graduation conversation
function scheduleConversation(conversationId: string, scheduledDate: Date): GraduationConversation

// Complete the conversation with outcome
function completeConversation(
  conversationId: string,
  outcome: 'graduated' | 'deferred' | 'declined'
): GraduationConversation

// Get pending conversations for a family
function getPendingConversations(familyId: string): GraduationConversation[]

// Check if conversation is overdue
function isConversationOverdue(conversation: GraduationConversation): boolean
```

**Acceptance Criteria:** AC1, AC3, AC6

### Task 3: GraduationNotificationService

Create service for generating graduation notifications.

**Files:**

- `packages/shared/src/services/graduationNotificationService.ts` (new)
- `packages/shared/src/services/graduationNotificationService.test.ts` (new)

**Functions:**

```typescript
// Get notification for child reaching eligibility
function getChildEligibilityNotification(
  childName: string,
  monthsCompleted: number
): NotificationContent

// Get notification for parent about child's eligibility
function getParentEligibilityNotification(
  childName: string,
  monthsCompleted: number
): NotificationContent

// Get acknowledgment prompt for child
function getChildAcknowledgmentPrompt(): string

// Get acknowledgment prompt for parent
function getParentAcknowledgmentPrompt(childName: string): string

// Get reminder notification (if not acknowledged within 7 days)
function getReminderNotification(
  recipientType: 'child' | 'parent',
  childName: string,
  daysRemaining: number
): NotificationContent

interface NotificationContent {
  title: string
  message: string
  type: 'graduation_eligible' | 'conversation_reminder' | 'acknowledgment_needed'
  priority: 'high' | 'normal'
  actionLabel?: string
}
```

**Acceptance Criteria:** AC2, AC4, AC7

### Task 4: GraduationConversationTemplate

Create the conversation template with discussion points.

**Files:**

- `packages/shared/src/services/graduationConversationTemplateService.ts` (new)
- `packages/shared/src/services/graduationConversationTemplateService.test.ts` (new)

**Default Template:**

```typescript
const DEFAULT_GRADUATION_TEMPLATE: ConversationTemplate = {
  id: 'default',
  title: 'Graduation Conversation Guide',
  discussionPoints: [
    {
      topic: 'Celebrating Achievement',
      forChild:
        "You've shown 12 months of consistent responsibility. How do you feel about this milestone?",
      forParent:
        'Your child has demonstrated sustained trustworthy behavior. Share your pride in their growth.',
      optional: false,
    },
    {
      topic: 'Readiness for Independence',
      forChild: 'What does more independence mean to you?',
      forParent: 'What aspects of monitoring do you feel comfortable reducing?',
      optional: false,
    },
    {
      topic: 'Ongoing Support',
      forChild: 'What kind of support would you still like from your parents?',
      forParent: 'How can you continue to support healthy digital habits without monitoring?',
      optional: false,
    },
    {
      topic: 'Transition Timeline',
      forChild: 'What timeline feels right for transitioning off monitoring?',
      forParent: 'What transition approach would work for your family?',
      optional: true,
    },
  ],
  suggestedQuestions: [
    'What have you learned during this monitoring period?',
    'How has trust grown in our family?',
    'What digital habits will you continue independently?',
  ],
  resources: [
    { title: 'Healthy Digital Independence Guide', url: '/resources/digital-independence' },
    { title: 'Post-Graduation Support Options', url: '/resources/post-graduation' },
  ],
}
```

**Acceptance Criteria:** AC4, AC5, AC7

### Task 5: GraduationEligibilityBanner Component

Create UI component showing eligibility status and prompting conversation.

**Files:**

- `apps/web/src/components/graduation/GraduationEligibilityBanner.tsx` (new)
- `apps/web/src/components/graduation/GraduationEligibilityBanner.test.tsx` (new)

**Props:**

```typescript
interface GraduationEligibilityBannerProps {
  conversation: GraduationConversation
  viewerType: ViewerType
  childName: string
  hasAcknowledged: boolean
  onAcknowledge: () => void
  onSchedule?: () => void
  onViewTemplate?: () => void
}
```

**Features:**

- Celebratory banner when eligibility is reached
- Clear call-to-action for acknowledgment
- Status of who has/hasn't acknowledged
- Link to conversation template
- Countdown to schedule conversation
- Different messaging for child vs parent view

**Acceptance Criteria:** AC2, AC3, AC4

### Task 6: GraduationConversationGuide Component

Create component displaying the conversation template.

**Files:**

- `apps/web/src/components/graduation/GraduationConversationGuide.tsx` (new)
- `apps/web/src/components/graduation/GraduationConversationGuide.test.tsx` (new)

**Props:**

```typescript
interface GraduationConversationGuideProps {
  template: ConversationTemplate
  viewerType: ViewerType
  childName: string
  conversationStatus: GraduationConversation['status']
  onSchedule?: (date: Date) => void
  onComplete?: (outcome: 'graduated' | 'deferred' | 'declined') => void
}
```

**Features:**

- Step-by-step discussion points
- Viewer-appropriate prompts (child sees their version, parent sees theirs)
- Suggested questions section
- Resource links
- Option to schedule date
- Option to mark conversation complete

**Acceptance Criteria:** AC5, AC7

### Task 7: Integration Tests

Create integration tests for graduation conversation system.

**Files:**

- `apps/web/src/components/graduation/graduationConversation.integration.test.tsx` (new)

**Test Scenarios:**

- Child reaches eligibility, conversation initiated
- Both child and parent receive notification
- Child acknowledges, parent sees child has acknowledged
- Parent acknowledges, all acknowledged state triggers
- Conversation template displays correctly
- Scheduling conversation works
- Completing conversation with different outcomes
- Reminder sent if acknowledgment delayed
- Prevents indefinite monitoring by forcing conversation

**Acceptance Criteria:** All ACs

## Dev Notes

### Dependency on Story 38-1

This story builds directly on Story 38-1's eligibility tracking:

| Story 38-1 Component           | Usage in 38-2                         |
| ------------------------------ | ------------------------------------- |
| `GraduationEligibilityStatus`  | Triggers conversation at isEligible   |
| `checkGraduationEligibility()` | Checks when to initiate conversation  |
| `GraduationProgressIndicator`  | Displays alongside eligibility banner |

### FR38A Requirement

From Pre-mortem Analysis:

> "At 100% trust for 12 months, system initiates 'graduation conversation' that BOTH parties must acknowledge - prevents indefinite monitoring of compliant teens"

This story implements the **conversation trigger** portion. Story 38-1 implemented tracking.

### Acknowledgment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Eligibility Reached                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  System creates GraduationConversation (status: pending)     │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Child Notified  │         │ Parent Notified │
    └─────────────────┘         └─────────────────┘
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │ Child Acks      │         │ Parent Acks     │
    └─────────────────┘         └─────────────────┘
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  All Acknowledged → status: acknowledged                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Schedule Conversation → status: scheduled                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Complete Conversation → status: completed                   │
│  outcome: graduated | deferred | declined                    │
└─────────────────────────────────────────────────────────────┘
```

### Messaging Tone

Consistent with Epic 37 developmental framing:

- **Child message:** "Congratulations! You've earned this milestone through 12 months of responsible digital behavior."
- **Parent message:** "Your child has shown consistent responsibility. It's time to discuss the next chapter."
- **NOT:** "You must have this conversation" (avoid punitive framing)

### References

- [Source: packages/shared/src/contracts/graduationEligibility.ts] - Eligibility types
- [Source: packages/shared/src/services/graduationEligibilityService.ts] - Eligibility checking
- [Source: docs/epics/epic-list.md#Epic-38] - Epic requirements
- [Source: docs/sprint-artifacts/stories/38-1-graduation-eligibility-tracking.md] - Story 38-1
