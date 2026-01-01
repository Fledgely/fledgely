# Story 35-2: Renewal Reminder System

## Story

As **a family**,
I want **to receive renewal reminders before agreement expires**,
So that **we don't forget to renew**.

## Status: done

## Acceptance Criteria

- [x] AC1: Reminder at 30 days: "Agreement expires in 30 days"
- [x] AC2: Reminder at 7 days: "Renew your agreement this week"
- [x] AC3: Reminder at 1 day: "Agreement expires tomorrow"
- [x] AC4: Reminders sent to both parent and child
- [x] AC5: Reminder includes one-tap "Renew now" action
- [x] AC6: Snooze option: "Remind me in 3 days"

## Technical Tasks

### Task 1: Renewal Reminder Types and Constants

Create TypeScript types and constants for renewal reminders in shared package.

**Files:**

- `packages/shared/src/contracts/renewalReminder.ts` (new)
- `packages/shared/src/contracts/renewalReminder.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Reminder threshold constants
export const REMINDER_THRESHOLDS = {
  THIRTY_DAYS: 30,
  SEVEN_DAYS: 7,
  ONE_DAY: 1,
} as const

// Snooze duration in days
export const SNOOZE_DURATION_DAYS = 3

// Reminder type schema
export const reminderTypeSchema = z.enum(['30-day', '7-day', '1-day'])

// Reminder status schema
export const reminderStatusSchema = z.enum(['pending', 'shown', 'dismissed', 'snoozed', 'actioned'])

// Reminder messages
export const REMINDER_MESSAGES = {
  '30-day': 'Agreement expires in 30 days',
  '7-day': 'Renew your agreement this week',
  '1-day': 'Agreement expires tomorrow',
}
```

**Acceptance Criteria:** AC1, AC2, AC3

### Task 2: Renewal Reminder Service

Create service for calculating reminder schedules and states.

**Files:**

- `apps/web/src/services/renewalReminderService.ts` (new)
- `apps/web/src/services/renewalReminderService.test.ts` (new)

**Functions:**

- `getActiveReminders(expiryDate, snoozeInfo?)` - Get which reminders should be shown
- `shouldShowReminder(expiryDate, reminderType, snoozeInfo?)` - Check if specific reminder is due
- `calculateSnoozeExpiry(snoozedAt)` - Calculate when snooze ends
- `getReminderMessage(reminderType)` - Get user-friendly message

**Acceptance Criteria:** AC1, AC2, AC3, AC6

### Task 3: useRenewalReminders Hook

Create hook for managing reminder state and actions.

**Files:**

- `apps/web/src/hooks/useRenewalReminders.ts` (new)
- `apps/web/src/hooks/useRenewalReminders.test.ts` (new)

**Interface:**

```typescript
interface UseRenewalRemindersResult {
  activeReminders: ReminderType[]
  currentReminder: Reminder | null
  isReminderVisible: boolean
  snoozeReminder: () => void
  dismissReminder: () => void
  renewNow: () => void
  snoozedUntil: Date | null
}
```

**Acceptance Criteria:** AC5, AC6

### Task 4: RenewalReminderBanner Component

Create banner component for displaying renewal reminders.

**Files:**

- `apps/web/src/components/agreements/RenewalReminderBanner.tsx` (new)
- `apps/web/src/components/agreements/RenewalReminderBanner.test.tsx` (new)

**Props:**

```typescript
interface RenewalReminderBannerProps {
  expiryDate: Date
  agreementId: string
  childId: string
  onRenewClick: () => void
  onSnoozeClick: () => void
  onDismiss: () => void
  variant?: 'parent' | 'child'
}
```

**Features:**

- 30-day reminder: Info styling, calm urgency
- 7-day reminder: Warning styling, moderate urgency
- 1-day reminder: Critical styling, high urgency
- "Renew Now" button (prominent)
- "Remind me in 3 days" snooze link
- Different messaging for parent vs child

**Acceptance Criteria:** AC1, AC2, AC3, AC4, AC5, AC6

### Task 5: RenewalReminderCard Component

Create card component for reminder in dashboard context.

**Files:**

- `apps/web/src/components/agreements/RenewalReminderCard.tsx` (new)
- `apps/web/src/components/agreements/RenewalReminderCard.test.tsx` (new)

**Features:**

- Compact card for dashboard lists
- Shows countdown and urgency indicator
- Quick action buttons
- Child-friendly variant with simpler language

**Acceptance Criteria:** AC4, AC5, AC6

### Task 6: Integration Tests

Create integration tests for the complete renewal reminder flow.

**Files:**

- `apps/web/src/components/agreements/__tests__/renewalReminderIntegration.test.tsx` (new)

**Test Scenarios:**

- Full reminder lifecycle: 30 days -> 7 days -> 1 day
- Snooze functionality persists for 3 days
- Parent and child both receive reminders
- Renew action navigates correctly
- Dismiss clears reminder state

**Acceptance Criteria:** All ACs

## Dev Notes

### Previous Story Intelligence (35-1)

Story 35-1 established the expiry system foundation:

- **Expiry Types**: `packages/shared/src/contracts/agreementExpiry.ts`
  - `ExpiryDuration`: '3-months' | '6-months' | '1-year' | 'no-expiry'
  - `isExpiringSoon(expiryDate, thresholdDays)` - Use 30 for our reminder check
  - `getDaysUntilExpiry(expiryDate)` - Returns days or null
- **Expiry Service**: `apps/web/src/services/expiryService.ts`
  - `getExpiryWarningLevel(expiryDate)` - Returns 'none' | 'warning' | 'critical' | 'expired'
  - Warning at 30 days, critical at 7 days
- **Expiry Hook**: `apps/web/src/hooks/useAgreementExpiry.ts`
  - `isExpiringSoon`, `daysUntilExpiry` states available

### Integration Points

- Leverage `getDaysUntilExpiry` from shared package
- Extend `getExpiryWarningLevel` patterns for reminder urgency
- Use existing `EXPIRY_MESSAGES` pattern for `REMINDER_MESSAGES`
- Follow component patterns from `AgreementExpiryDisplay`

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Reminder Logic

```
Days until expiry:
  >= 30: Show "30-day" reminder (if not snoozed)
  >= 7 and < 30: Show "7-day" reminder (if not snoozed)
  >= 1 and < 7: Show "1-day" reminder (if not snoozed)
  < 1: Expired - don't show reminder, show expired state

Snooze logic:
  - Store snooze timestamp + reminder type
  - Hide that specific reminder for 3 days
  - Can snooze each threshold independently
  - 1-day reminder cannot be snoozed (too urgent)
```

### UI/UX Patterns

- **Banner**: Full-width at top of agreement view
- **Card**: Compact for dashboard/list views
- **Parent View**: Professional, action-oriented language
- **Child View**: Friendly, simple language ("Time to renew your agreement!")
- **Urgency Colors**:
  - 30 days: Blue/Info
  - 7 days: Yellow/Warning
  - 1 day: Red/Critical

### File Structure

```
packages/shared/src/contracts/
  renewalReminder.ts          # Types and constants
  renewalReminder.test.ts     # Unit tests

apps/web/src/
  services/
    renewalReminderService.ts      # Service logic
    renewalReminderService.test.ts
  hooks/
    useRenewalReminders.ts         # State hook
    useRenewalReminders.test.ts
  components/agreements/
    RenewalReminderBanner.tsx      # Banner component
    RenewalReminderBanner.test.tsx
    RenewalReminderCard.tsx        # Card component
    RenewalReminderCard.test.tsx
    __tests__/
      renewalReminderIntegration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/agreementExpiry.ts] - Expiry types and utilities
- [Source: apps/web/src/services/expiryService.ts] - Warning level patterns
- [Source: apps/web/src/components/agreements/AgreementExpiryDisplay.tsx] - Display component patterns
- [Source: docs/epics/epic-list.md#Story 35.2] - Original requirements

## Dev Agent Record

### Context Reference

Story 35-1 completed with 129 tests. Expiry infrastructure is ready.

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- **140 tests total**: 36 shared + 21 service + 17 hook + 20 banner + 25 card + 21 integration
- TDD approach followed throughout
- All ESLint issues resolved
- Snooze disabled for 1-day reminders (too urgent)
- Parent and child variants with appropriate messaging
- Urgency levels: info (30-day), warning (7-day), critical (1-day)
- Components: RenewalReminderBanner (full width) and RenewalReminderCard (compact)

### File List

**New Files:**

- `packages/shared/src/contracts/renewalReminder.ts`
- `packages/shared/src/contracts/renewalReminder.test.ts`
- `apps/web/src/services/renewalReminderService.ts`
- `apps/web/src/services/renewalReminderService.test.ts`
- `apps/web/src/hooks/useRenewalReminders.ts`
- `apps/web/src/hooks/useRenewalReminders.test.ts`
- `apps/web/src/components/agreements/RenewalReminderBanner.tsx`
- `apps/web/src/components/agreements/RenewalReminderBanner.test.tsx`
- `apps/web/src/components/agreements/RenewalReminderCard.tsx`
- `apps/web/src/components/agreements/RenewalReminderCard.test.tsx`
- `apps/web/src/components/agreements/RenewalReminders.integration.test.tsx`

**Updated Files:**

- `packages/shared/src/contracts/index.ts`
- `packages/shared/src/index.ts`
