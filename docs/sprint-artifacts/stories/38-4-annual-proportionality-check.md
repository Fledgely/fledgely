# Story 38-4: Annual Proportionality Check

## Story

As **a family**,
I want **annual prompts to assess if monitoring is still appropriate**,
So that **monitoring level matches developmental stage**.

## Status: done

## Acceptance Criteria

- [x] AC1: Annual prompt triggered after 12+ months of active monitoring (FR-CR4)
- [x] AC2: Both parties prompted: "Is current monitoring appropriate?"
- [x] AC3: Questions include: "Has external risk changed?", "Has maturity increased?"
- [x] AC4: Suggestions based on age and trust score
- [x] AC5: Parent and child respond separately (private)
- [x] AC6: Disagreement surfaces for family conversation
- [x] AC7: Ensures monitoring doesn't outlast its necessity

## Technical Tasks

### Task 1: ProportionalityCheck Data Model

Create Zod schemas and types for the proportionality check system.

**Files:**

- `packages/shared/src/contracts/proportionalityCheck.ts` (new)
- `packages/shared/src/contracts/proportionalityCheck.test.ts` (new)

**Types:**

```typescript
type CheckTrigger = 'annual' | 'manual' | 'system'
type CheckStatus = 'pending' | 'in_progress' | 'completed' | 'expired'
type ResponseChoice = 'appropriate' | 'reduce' | 'increase' | 'discuss' | 'graduate'

interface ProportionalityCheck {
  id: string
  familyId: string
  childId: string
  triggerType: CheckTrigger
  status: CheckStatus
  monitoringStartDate: Date
  checkDueDate: Date
  checkCompletedDate: Date | null
  expiresAt: Date // Check expires after 14 days if not completed
  createdAt: Date
}

interface ProportionalityResponse {
  id: string
  checkId: string
  respondentId: string
  respondentRole: 'child' | 'parent'
  // Core questions
  isMonitoringAppropriate: ResponseChoice
  hasExternalRiskChanged: 'decreased' | 'same' | 'increased' | null
  hasMaturityIncreased: boolean | null
  // Optional feedback
  freeformFeedback: string | null
  suggestedChanges: string[] // e.g., ['reduce_screenshot_frequency', 'graduate']
  respondedAt: Date
  isPrivate: boolean // Always true - responses are private
}

interface ProportionalitySuggestion {
  type: 'reduce_monitoring' | 'maintain' | 'graduation_eligible' | 'consider_discussion'
  title: string
  description: string
  basedOn: {
    childAge: number
    trustScore: number
    monthsMonitored: number
    trustMilestone: string | null
  }
  priority: 'high' | 'medium' | 'low'
}

interface DisagreementRecord {
  checkId: string
  familyId: string
  childId: string
  childResponse: ResponseChoice
  parentResponses: { parentId: string; response: ResponseChoice }[]
  disagreementType: 'child_wants_less' | 'parent_wants_more' | 'mixed'
  surfacedAt: Date
  resolvedAt: Date | null
  resolution: string | null
}

// Configuration
const PROPORTIONALITY_CHECK_INTERVAL_MONTHS = 12
const CHECK_EXPIRY_DAYS = 14
const REMINDER_AFTER_DAYS = 7
```

**Acceptance Criteria:** AC1

---

### Task 2: ProportionalityCheckService

Create service for managing proportionality checks.

**Files:**

- `packages/shared/src/services/proportionalityCheckService.ts` (new)
- `packages/shared/src/services/proportionalityCheckService.test.ts` (new)

**Functions:**

```typescript
// Check eligibility
function isEligibleForProportionalityCheck(childId: string, monitoringStartDate: Date): boolean
function getMonitoringDurationMonths(monitoringStartDate: Date): number
function isCheckOverdue(childId: string): boolean

// Lifecycle
function createProportionalityCheck(
  familyId: string,
  childId: string,
  monitoringStartDate: Date,
  triggerType: CheckTrigger
): ProportionalityCheck

function expireOverdueChecks(): number // Returns count of expired

// Status
function getActiveCheckForChild(childId: string): ProportionalityCheck | null
function getPendingCheckForFamily(familyId: string): ProportionalityCheck[]
function getCheckHistory(childId: string): ProportionalityCheck[]

// For testing
function clearAllCheckData(): void
```

**Pattern:** Follow the same service pattern as `healthCheckInService.ts`.

**Acceptance Criteria:** AC1, AC7

---

### Task 3: ProportionalityResponseService

Create service for handling responses to proportionality checks.

**Files:**

- `packages/shared/src/services/proportionalityResponseService.ts` (new)
- `packages/shared/src/services/proportionalityResponseService.test.ts` (new)

**Functions:**

```typescript
// Response submission
function submitResponse(input: SubmitResponseInput): ProportionalityResponse
function getResponseForCheck(checkId: string, respondentId: string): ProportionalityResponse | null
function getAllResponsesForCheck(checkId: string): ProportionalityResponse[]

// Privacy (AC5)
function canViewResponse(viewerId: string, response: ProportionalityResponse): boolean // Always false for others

// Check completion
function hasAllPartiesResponded(checkId: string): boolean
function markCheckCompleted(checkId: string): ProportionalityCheck
```

**Acceptance Criteria:** AC2, AC3, AC5

---

### Task 4: ProportionalitySuggestionService

Create service that generates suggestions based on age and trust score.

**Files:**

- `packages/shared/src/services/proportionalitySuggestionService.ts` (new)
- `packages/shared/src/services/proportionalitySuggestionService.test.ts` (new)

**Functions:**

```typescript
// Generate suggestions (AC4)
function generateSuggestions(input: GenerateSuggestionsInput): ProportionalitySuggestion[]

interface GenerateSuggestionsInput {
  childAge: number
  trustScore: number
  monthsMonitored: number
  currentMonitoringLevel: string // e.g., 'standard', 'notification_only'
  trustMilestone: string | null // From Epic 37
}

// Suggestion templates
const SUGGESTION_TEMPLATES = {
  // Age-based
  AGE_16_PLUS_HIGH_TRUST: {...},
  AGE_14_PLUS_CONSISTENT: {...},

  // Trust-based
  GRADUATION_ELIGIBLE: {...},
  NOTIFICATION_ONLY_RECOMMENDED: {...},
  REDUCED_FREQUENCY_RECOMMENDED: {...},

  // Neutral
  MAINTAIN_CURRENT: {...},
  CONSIDER_FAMILY_DISCUSSION: {...}
}

// Priority rules
function calculateSuggestionPriority(suggestion: ProportionalitySuggestion): 'high' | 'medium' | 'low'
```

**Acceptance Criteria:** AC4

---

### Task 5: DisagreementService

Create service for detecting and surfacing disagreements.

**Files:**

- `packages/shared/src/services/proportionalityDisagreementService.ts` (new)
- `packages/shared/src/services/proportionalityDisagreementService.test.ts` (new)

**Functions:**

```typescript
// Disagreement detection (AC6)
function detectDisagreement(checkId: string): DisagreementRecord | null
function categorizeDisagreement(
  childResponse: ResponseChoice,
  parentResponses: ResponseChoice[]
): 'child_wants_less' | 'parent_wants_more' | 'mixed' | null

// Surfacing
function createDisagreementRecord(checkId: string): DisagreementRecord
function getUnresolvedDisagreements(familyId: string): DisagreementRecord[]

// Resolution
function markDisagreementResolved(disagreementId: string, resolution: string): DisagreementRecord

// Disagreement types
// - child_wants_less: Child wants reduced monitoring, parent disagrees
// - parent_wants_more: Parent wants more monitoring, child comfortable with current
// - mixed: Multiple parents have different opinions
```

**Acceptance Criteria:** AC6

---

### Task 6: ProportionalityCheckQuestions Component

Create React component for the proportionality check questions interface.

**Files:**

- `apps/web/src/components/proportionality/ProportionalityCheckQuestions.tsx` (new)
- `apps/web/src/components/proportionality/ProportionalityCheckQuestions.test.tsx` (new)

**Props:**

```typescript
interface ProportionalityCheckQuestionsProps {
  check: ProportionalityCheck
  viewerType: ViewerType
  childName: string
  childAge: number
  onSubmit: (response: ProportionalityResponseInput) => void
  onSkip?: () => void
}
```

**Features:**

- AC2: "Is current monitoring appropriate?" question with 5 choices
- AC3: Additional questions about external risk and maturity
- Private response indicator
- Age-appropriate language for child viewers
- Clear, non-leading question framing
- Optional free-form feedback field

**UI Elements:**

1. Question cards with clear choices
2. Explanation text for each question
3. Privacy assurance message
4. Submit and optional skip buttons

**Acceptance Criteria:** AC2, AC3, AC5

---

### Task 7: ProportionalitySuggestions Component

Create React component displaying suggestions based on responses.

**Files:**

- `apps/web/src/components/proportionality/ProportionalitySuggestions.tsx` (new)
- `apps/web/src/components/proportionality/ProportionalitySuggestions.test.tsx` (new)

**Props:**

```typescript
interface ProportionalitySuggestionsProps {
  suggestions: ProportionalitySuggestion[]
  childName: string
  viewerType: ViewerType
  onDismiss?: () => void
}
```

**Features:**

- Display personalized suggestions (AC4)
- Show basis for suggestions (age, trust score, months)
- Priority-based ordering
- Links to relevant actions (e.g., view trust milestones, graduation path)
- Actionable next steps

**Acceptance Criteria:** AC4

---

### Task 8: DisagreementNotification Component

Create React component for surfacing disagreements.

**Files:**

- `apps/web/src/components/proportionality/DisagreementNotification.tsx` (new)
- `apps/web/src/components/proportionality/DisagreementNotification.test.tsx` (new)

**Props:**

```typescript
interface DisagreementNotificationProps {
  disagreement: DisagreementRecord
  viewerType: ViewerType
  childName: string
  onDismiss: () => void
  onScheduleConversation?: () => void
}
```

**Features:**

- AC6: Surface disagreement for family conversation
- Neutral, non-blaming language
- Suggests scheduling a family discussion
- Links to communication resources (from Epic 27.5)
- Option to mark as resolved

**UI Elements:**

1. Alert banner with disagreement summary
2. Suggested discussion topics
3. "Schedule a Conversation" action
4. "We've Talked About This" resolution button

**Acceptance Criteria:** AC6

---

### Task 9: ProportionalityCheckPrompt Component

Create React component for the check-in prompt banner.

**Files:**

- `apps/web/src/components/proportionality/ProportionalityCheckPrompt.tsx` (new)
- `apps/web/src/components/proportionality/ProportionalityCheckPrompt.test.tsx` (new)

**Props:**

```typescript
interface ProportionalityCheckPromptProps {
  check: ProportionalityCheck
  childName: string
  viewerType: ViewerType
  onStartCheck: () => void
  onDismiss?: () => void
}
```

**Features:**

- Dashboard banner prompting user to complete check
- Shows monitoring duration context
- Countdown to expiry
- Different messaging for parent vs child

**Acceptance Criteria:** AC1, AC2

---

### Task 10: Integration Tests

Create integration tests for the complete proportionality check flow.

**Files:**

- `apps/web/src/components/proportionality/proportionalityCheck.integration.test.tsx` (new)

**Test Scenarios:**

1. Check triggered after 12 months of monitoring
2. Both parties can submit responses privately
3. Questions display correctly for parent and child
4. Suggestions generated based on age/trust score
5. Disagreement detected when responses differ
6. Disagreement surfaced for family conversation
7. Check completes when all parties respond
8. Check expires after 14 days if incomplete
9. Reminder sent after 7 days if incomplete
10. Cannot view other party's response (privacy)
11. Check history tracked per child

**Acceptance Criteria:** All ACs

## Dev Notes

### Dependency on Previous Stories

| Story | Component               | Usage in 38-4                             |
| ----- | ----------------------- | ----------------------------------------- |
| 37-1  | `TrustMilestone`        | Used for suggestions based on trust level |
| 37-4  | `getMonitoringLevel()`  | Current monitoring level for suggestions  |
| 27.5  | `healthCheckInService`  | Pattern reference for periodic prompts    |
| 38-1  | `GraduationEligibility` | Graduation suggestions if eligible        |

### FR-CR4 Requirement

From Epic 38 (Child Rights Advocate Addition):

> "Annual 'proportionality check' prompt asking both parties if current monitoring level matches child's developmental stage and external risk profile"

This is a **child rights protection** feature ensuring monitoring doesn't continue indefinitely.

### Privacy Design (AC5)

Responses are **always private**:

- Child cannot see parent responses
- Parents cannot see child responses
- Parents cannot see each other's responses
- Only system uses responses for suggestions

This enables honest feedback without fear of consequences.

### Disagreement Surfacing (AC6)

When responses differ significantly:

1. System detects the disagreement
2. Both parties see neutral notification
3. Encourages family conversation
4. Does NOT reveal specific responses
5. Links to conflict resolution resources

### Suggestion Logic (AC4)

Suggestions prioritized by:

1. **Graduation eligible** - 100% trust for 12+ months
2. **Notification-only recommended** - Trust milestone reached
3. **Reduced monitoring recommended** - Age 14+ with consistent trust
4. **Maintain current** - No change indicators
5. **Consider discussion** - Disagreement or concerns

### Age-Appropriate Language

Following Story 27.5.7 patterns:

- Under 10: Very simple language
- 10-12: Simple but clear
- 13+: More mature, direct

### References

- [Source: apps/functions/src/services/health/healthCheckInService.ts] - Pattern reference
- [Source: packages/shared/src/services/trustMilestoneService.ts] - Trust level integration
- [Source: packages/shared/src/services/graduationEligibilityService.ts] - Graduation check
- [Source: docs/epics/epic-list.md#Story-38.4] - Epic requirements
- [Source: docs/sprint-artifacts/stories/37-4-automatic-monitoring-reduction-fr37a.md] - Monitoring levels

## Dev Agent Record

### Context Reference

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
