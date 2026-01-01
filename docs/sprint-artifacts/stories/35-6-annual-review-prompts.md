# Story 35-6: Annual Review Prompts

## Story

As **a family**,
I want **annual prompts to review our agreement**,
So that **monitoring evolves with my child's growth**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Prompt sent when 1 year since last review
- [x] AC2: Prompt includes "Your child has grown - consider updating terms"
- [x] AC3: Suggestions based on age (e.g., "Many 14-year-olds have reduced screenshot frequency")
- [x] AC4: Optional family meeting reminder
- [x] AC5: Prompt even for "no expiry" agreements
- [x] AC6: Celebrates healthy relationship: "1 year of building trust together!"

## Completion Notes

**Total Tests: 103**

- Shared package: 33 tests (annualReview.test.ts)
- Service: 20 tests (annualReviewService.test.ts)
- Hook: 12 tests (useAnnualReview.test.ts)
- Component: 19 tests (AnnualReviewPrompt.test.tsx)
- Integration: 19 tests (AnnualReview.integration.test.tsx)

**Key Implementation:**

- Annual review interval: 365 days
- Age-based suggestions for ages 10, 12, 14, 16
- Celebratory, non-urgent messaging
- Works for both expiring and no-expiry agreements
- Optional family meeting scheduling

## Technical Tasks

### Task 1: Annual Review Types and Constants

Create TypeScript types and constants for annual review prompts in shared package.

**Files:**

- `packages/shared/src/contracts/annualReview.ts` (new)
- `packages/shared/src/contracts/annualReview.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Annual review constants
export const ANNUAL_REVIEW_INTERVAL_DAYS = 365

// Review status schema
export const annualReviewStatusSchema = z.enum([
  'not-due',
  'due',
  'prompted',
  'completed',
  'dismissed',
])

// Age-based suggestion thresholds
export const AGE_SUGGESTION_THRESHOLDS = [
  { age: 10, suggestions: ['Consider scheduled screenshot review times'] },
  { age: 12, suggestions: ['Many families reduce screenshot frequency at this age'] },
  { age: 14, suggestions: ['Many 14-year-olds have reduced screenshot frequency'] },
  { age: 16, suggestions: ['Consider notification-only mode for trusted teens'] },
]

// Messages
export const ANNUAL_REVIEW_MESSAGES = {
  PROMPT_TITLE: "It's been a year - time for an agreement review?",
  GROWTH_REMINDER: 'Your child has grown - consider updating terms',
  CELEBRATION: '1 year of building trust together!',
  MEETING_SUGGESTION: 'Consider scheduling a family meeting to discuss',
}

// Utility functions
export function isAnnualReviewDue(agreement: AgreementForAnnualReview): boolean
export function getDaysSinceLastReview(lastReviewDate: Date): number
export function getAgeBasedSuggestions(childAge: number): string[]
```

**Acceptance Criteria:** AC1, AC3, AC5

### Task 2: Annual Review Service

Create service for managing annual review logic.

**Files:**

- `apps/web/src/services/annualReviewService.ts` (new)
- `apps/web/src/services/annualReviewService.test.ts` (new)

**Functions:**

- `checkAnnualReviewStatus(agreement)` - Check if review is due
- `getAnnualReviewPrompt(agreement, childAge)` - Get prompt with suggestions
- `getAgeSuggestions(childAge)` - Get age-appropriate suggestions
- `markReviewComplete(agreementId)` - Mark review as completed
- `dismissAnnualReviewPrompt(agreementId)` - Dismiss until next year

**Acceptance Criteria:** AC1, AC2, AC3, AC5

### Task 3: useAnnualReview Hook

Create hook for managing annual review state and UI interactions.

**Files:**

- `apps/web/src/hooks/useAnnualReview.ts` (new)
- `apps/web/src/hooks/useAnnualReview.test.ts` (new)

**Interface:**

```typescript
interface UseAnnualReviewResult {
  isReviewDue: boolean
  daysSinceLastReview: number
  reviewPrompt: AnnualReviewPrompt | null
  ageSuggestions: string[]
  celebrationMessage: string
  completeReview: () => void
  dismissPrompt: () => void
  scheduleFamilyMeeting: () => void
}
```

**Acceptance Criteria:** AC1, AC4, AC6

### Task 4: AnnualReviewPrompt Component

Create component for displaying annual review prompt.

**Files:**

- `apps/web/src/components/agreements/AnnualReviewPrompt.tsx` (new)
- `apps/web/src/components/agreements/AnnualReviewPrompt.test.tsx` (new)

**Props:**

```typescript
interface AnnualReviewPromptProps {
  childName: string
  childAge: number
  yearsSinceCreation: number
  onStartReview: () => void
  onDismiss: () => void
  onScheduleMeeting?: () => void
}
```

**Features:**

- Celebration message for anniversary
- Growth reminder
- Age-based suggestions
- Family meeting reminder option
- Start review button
- Dismiss option

**Acceptance Criteria:** AC2, AC3, AC4, AC6

### Task 5: Integration Tests

Create integration tests for complete annual review flow.

**Files:**

- `apps/web/src/components/agreements/AnnualReview.integration.test.tsx` (new)

**Test Scenarios:**

- Prompt appears after 1 year
- Prompt includes growth reminder
- Age-based suggestions display correctly
- Family meeting option available
- Works for "no expiry" agreements
- Celebration message shows
- Can complete or dismiss review

**Acceptance Criteria:** All ACs

## Dev Notes

### Previous Story Intelligence (35-5)

Story 35-5 established post-grace period handling:

- **Post-Grace Types**: `packages/shared/src/contracts/agreementPostGrace.ts`
- **Post-Grace Service**: `apps/web/src/services/postGracePeriodService.ts`
- **Post-Grace Hook**: `apps/web/src/hooks/usePostGracePeriod.ts`
- **Post-Grace Banner**: `apps/web/src/components/agreements/PostGracePeriodBanner.tsx`

Story 35-6 is independent of expiry/grace - applies to ALL agreements including "no expiry" ones.

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Annual Review Flow Logic

```
Agreement created/last reviewed
  ├── Track lastReviewDate
  └── After 365 days:
      ├── Show prompt (AC1)
      ├── Include growth message (AC2)
      ├── Show age-based suggestions (AC3)
      ├── Offer family meeting option (AC4)
      ├── Works for no-expiry agreements (AC5)
      └── Celebrate the milestone (AC6)
```

### Key Behavior: Positive Framing

- **Celebration first**: "1 year of building trust together!"
- **Growth focus**: "Your child has grown"
- **Suggestions not demands**: "Many families at this age..."
- **Optional meeting**: Not required, just suggested
- **No urgency**: Unlike expiry reminders, this is a positive check-in

### Age-Based Suggestions

- Age 10: Basic suggestions about review schedules
- Age 12: Consider reducing screenshot frequency
- Age 14: Many have reduced frequency
- Age 16: Consider notification-only mode

### UI/UX Patterns

- **Celebratory Tone**: Positive, not urgent
- **Clear Status**: Anniversary milestone shown
- **Easy Actions**: Review now, dismiss, or schedule meeting
- **Age Context**: Show child's current age and growth

### Message Examples

- Title: "It's been a year - time for an agreement review?"
- Growth: "Your child has grown - consider updating terms"
- Age 14: "Many 14-year-olds have reduced screenshot frequency"
- Meeting: "Consider scheduling a family meeting to discuss"
- Celebration: "1 year of building trust together!"

### File Structure

```
packages/shared/src/contracts/
  annualReview.ts              # Types and constants
  annualReview.test.ts         # Unit tests

apps/web/src/
  services/
    annualReviewService.ts         # Review logic
    annualReviewService.test.ts
  hooks/
    useAnnualReview.ts             # State hook
    useAnnualReview.test.ts
  components/agreements/
    AnnualReviewPrompt.tsx         # Prompt component
    AnnualReviewPrompt.test.tsx
    AnnualReview.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/renewalReminder.ts] - Reminder patterns
- [Source: apps/web/src/services/renewalReminderService.ts] - Reminder service
- [Source: docs/epics/epic-list.md#Story 35.6] - Original requirements
