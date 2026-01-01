# Story 35-4: Expired Agreement Grace Period

## Story

As **a family with expired agreement**,
I want **a grace period before monitoring stops**,
So that **we have time to renew without disruption**.

## Status: done

## Acceptance Criteria

- [x] AC1: 14-day grace period starts automatically when agreement expires
- [x] AC2: Monitoring continues during grace period
- [x] AC3: Banner shown: "Agreement expired - please renew within 14 days"
- [x] AC4: Daily reminders during grace period
- [x] AC5: No device lockout - just reminders
- [x] AC6: Child sees: "Your agreement needs renewal"

## Technical Tasks

### Task 1: Grace Period Types and Constants

Create TypeScript types and constants for grace period handling in shared package.

**Files:**

- `packages/shared/src/contracts/agreementGracePeriod.ts` (new)
- `packages/shared/src/contracts/agreementGracePeriod.test.ts` (new)
- `packages/shared/src/contracts/index.ts` (update exports)

**Implementation:**

```typescript
// Grace period duration
export const GRACE_PERIOD_DAYS = 14

// Grace period status
export const gracePeriodStatusSchema = z.enum(['not-started', 'active', 'expired'])

// Grace period info schema
export const gracePeriodInfoSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  daysRemaining: z.number(),
  status: gracePeriodStatusSchema,
})

// Utility functions
export function isInGracePeriod(agreement: AgreementForGracePeriod): boolean
export function getGracePeriodInfo(agreement: AgreementForGracePeriod): GracePeriodInfo | null
export function getGracePeriodEndDate(expiryDate: Date): Date
export function getDaysRemainingInGracePeriod(gracePeriodEnd: Date): number
```

**Acceptance Criteria:** AC1, AC2

### Task 2: Grace Period Service

Create service for managing grace period logic.

**Files:**

- `apps/web/src/services/gracePeriodService.ts` (new)
- `apps/web/src/services/gracePeriodService.test.ts` (new)

**Functions:**

- `checkGracePeriodStatus(agreement)` - Determine grace period status
- `getGracePeriodDaysRemaining(agreement)` - Days left in grace period
- `shouldShowGracePeriodBanner(agreement)` - Check if banner should display
- `getGracePeriodMessage(daysRemaining, role)` - Get appropriate message
- `isMonitoringActiveInGracePeriod(agreement)` - Confirm monitoring continues

**Acceptance Criteria:** AC1, AC2, AC5

### Task 3: useGracePeriod Hook

Create hook for managing grace period state and UI interactions.

**Files:**

- `apps/web/src/hooks/useGracePeriod.ts` (new)
- `apps/web/src/hooks/useGracePeriod.test.ts` (new)

**Interface:**

```typescript
interface UseGracePeriodResult {
  isInGracePeriod: boolean
  gracePeriodInfo: GracePeriodInfo | null
  daysRemaining: number
  showBanner: boolean
  bannerMessage: string
  dismissBanner: () => void
  renewAgreement: () => void
}
```

**Acceptance Criteria:** AC1, AC3, AC6

### Task 4: GracePeriodBanner Component

Create banner component for grace period notifications.

**Files:**

- `apps/web/src/components/agreements/GracePeriodBanner.tsx` (new)
- `apps/web/src/components/agreements/GracePeriodBanner.test.tsx` (new)

**Props:**

```typescript
interface GracePeriodBannerProps {
  daysRemaining: number
  userRole: 'parent' | 'child'
  onRenew?: () => void
  onDismiss?: () => void
}
```

**Features:**

- Parent message: "Agreement expired - please renew within X days"
- Child message: "Your agreement needs renewal"
- Countdown display
- Renew button for parent
- Urgency styling based on days remaining

**Acceptance Criteria:** AC3, AC6

### Task 5: Grace Period Reminder System

Create daily reminder system during grace period.

**Files:**

- `apps/web/src/services/gracePeriodReminderService.ts` (new)
- `apps/web/src/services/gracePeriodReminderService.test.ts` (new)

**Functions:**

- `shouldSendDailyReminder(lastReminderDate)` - Check if reminder needed
- `getGracePeriodReminderType(daysRemaining)` - Get reminder urgency
- `createGracePeriodReminder(agreement, daysRemaining)` - Create reminder
- `scheduleGracePeriodReminders(agreement)` - Set up daily reminders

**Acceptance Criteria:** AC4

### Task 6: Integration Tests

Create integration tests for complete grace period flow.

**Files:**

- `apps/web/src/components/agreements/GracePeriod.integration.test.tsx` (new)

**Test Scenarios:**

- Grace period starts automatically on expiry
- Monitoring continues during grace period
- Parent sees correct banner and renewal option
- Child sees age-appropriate message
- Daily reminders sent during grace period
- No device lockout during grace period
- Grace period expiration triggers Story 35-5 handling

**Acceptance Criteria:** All ACs

## Dev Notes

### Previous Story Intelligence (35-3)

Story 35-3 established the renewal flow:

- **Renewal Types**: `packages/shared/src/contracts/agreementRenewal.ts`
- **Renewal Service**: `apps/web/src/services/agreementRenewalService.ts`
- **Renewal Hook**: `apps/web/src/hooks/useAgreementRenewal.ts`
- **Renewal Components**: RenewalModeSelector, RenewalConsentFlow

The "Renew Now" button from the grace period banner should trigger Story 35-3 renewal flow.

### Previous Story Intelligence (35-1, 35-2)

Story 35-1 established expiry configuration:

- **Expiry Types**: `packages/shared/src/contracts/agreementExpiry.ts`
- `calculateExpiryDate(duration, startDate)` - Base calculation
- `isExpiringSoon(expiryDate, thresholdDays)` - Check expiry status
- `isExpired(expiryDate)` - Check if past expiry

Story 35-2 established reminder patterns:

- **Reminder Service**: `apps/web/src/services/renewalReminderService.ts`
- **Reminder Hook**: `apps/web/src/hooks/useRenewalReminders.ts`
- Similar patterns for daily reminders during grace period

### Architecture Patterns

- **TDD Approach**: Write tests first following existing patterns
- **Zod Schemas**: All types use Zod for validation
- **Vitest + React Testing Library**: Testing stack
- **Shared Package First**: Types and constants in `packages/shared`
- **Service Layer**: Business logic in `services/`
- **Custom Hooks**: State management in `hooks/`

### Grace Period Flow Logic

```
Agreement expires (expiryDate < today)
  ├── Grace period starts automatically
  │   ├── 14 days from expiry date
  │   ├── Monitoring continues unchanged
  │   └── Banner displays to both parties
  ├── During grace period (days 1-14)
  │   ├── Daily reminders sent
  │   ├── Countdown shown in banner
  │   ├── Renew option available
  │   └── No device restrictions
  └── If renewed during grace period
      └── New expiry set, grace period ends
```

### UI/UX Patterns

- **Banner Urgency**: Yellow (14-8 days), Orange (7-3 days), Red (2-1 days)
- **Countdown**: "X days remaining to renew"
- **Parent View**: Action-oriented with renew button
- **Child View**: Informational with age-appropriate language
- **No Lockout**: Emphasize no punitive measures

### Message Examples

- Parent (14 days): "Your agreement expired. Please renew within 14 days to continue monitoring."
- Parent (3 days): "Urgent: Only 3 days left to renew your agreement!"
- Child: "Your agreement needs renewal. Ask your parent to renew it."

### File Structure

```
packages/shared/src/contracts/
  agreementGracePeriod.ts           # Types and constants
  agreementGracePeriod.test.ts      # Unit tests

apps/web/src/
  services/
    gracePeriodService.ts               # Service logic
    gracePeriodService.test.ts
    gracePeriodReminderService.ts       # Reminder logic
    gracePeriodReminderService.test.ts
  hooks/
    useGracePeriod.ts                   # State hook
    useGracePeriod.test.ts
  components/agreements/
    GracePeriodBanner.tsx               # Banner component
    GracePeriodBanner.test.tsx
    GracePeriod.integration.test.tsx
```

### References

- [Source: packages/shared/src/contracts/agreementExpiry.ts] - Expiry types
- [Source: packages/shared/src/contracts/agreementRenewal.ts] - Renewal types
- [Source: apps/web/src/services/renewalReminderService.ts] - Reminder patterns
- [Source: docs/epics/epic-list.md#Story 35.4] - Original requirements
- FR147, FR148: Grace period functional requirements

## Dev Agent Record

### Context Reference

Story 35-3 (126 tests) completed. Renewal flow infrastructure ready.

### Agent Model Used

Claude Opus 4.5

### Completion Notes List

- **133 tests total**: 35 shared + 23 service + 13 hook + 19 banner + 19 reminder + 24 integration
- TDD approach followed throughout
- All ESLint issues resolved
- Grace period: 14 days from expiry date
- Monitoring continues during grace period (AC2)
- Urgency levels: normal (14-8 days), warning (7-3 days), critical (2-1 days), expired (0 days)
- Child sees age-appropriate message without countdown

### File List

**New Files:**

- `packages/shared/src/contracts/agreementGracePeriod.ts`
- `packages/shared/src/contracts/agreementGracePeriod.test.ts`
- `apps/web/src/services/gracePeriodService.ts`
- `apps/web/src/services/gracePeriodService.test.ts`
- `apps/web/src/services/gracePeriodReminderService.ts`
- `apps/web/src/services/gracePeriodReminderService.test.ts`
- `apps/web/src/hooks/useGracePeriod.ts`
- `apps/web/src/hooks/useGracePeriod.test.ts`
- `apps/web/src/components/agreements/GracePeriodBanner.tsx`
- `apps/web/src/components/agreements/GracePeriodBanner.test.tsx`
- `apps/web/src/components/agreements/GracePeriod.integration.test.tsx`

**Updated Files:**

- `packages/shared/src/contracts/index.ts`
- `packages/shared/src/index.ts`
