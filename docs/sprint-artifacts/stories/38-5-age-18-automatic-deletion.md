# Story 38-5: Age 18 Automatic Deletion

## Story

As **the system**,
I want **to automatically delete all data when child turns 18**,
So that **their childhood monitoring doesn't follow them into adulthood**.

## Status: done

## Acceptance Criteria

- [x] AC1: Child's birthdate is stored on file (FR72)
- [x] AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
- [x] AC3: Deletion is complete and irreversible
- [x] AC4: Deletion includes: screenshots, flags, activity logs, trust history
- [x] AC5: Deletion occurs regardless of parent wishes
- [x] AC6: Child notified: "You're 18 - all data has been deleted"
- [x] AC7: Scheduled function executes daily to check birthdates

## Technical Tasks

### Task 1: Age18Deletion Data Model

Create Zod schemas and types for age-18 automatic deletion.

**Files:**

- `packages/shared/src/contracts/age18Deletion.ts` (new)
- `packages/shared/src/contracts/age18Deletion.test.ts` (new)

**Types:**

```typescript
interface ChildBirthdate {
  childId: string
  familyId: string
  birthdate: Date
  createdAt: Date
  updatedAt: Date
}

interface Age18DeletionRecord {
  id: string
  childId: string
  familyId: string
  birthdate: Date
  deletionTriggeredAt: Date
  deletionCompletedAt: Date | null
  dataTypesDeleted: DataType[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  notificationSentAt: Date | null
}

interface Age18DeletionNotification {
  id: string
  childId: string
  type: 'pre_deletion' | 'deletion_complete'
  sentAt: Date
  acknowledged: boolean
}

// Configuration
const AGE_18_IN_YEARS = 18
const DELETION_CHECK_INTERVAL = 'daily'
```

**Acceptance Criteria:** AC1, AC2, AC4

---

### Task 2: BirthdateService

Create service for managing child birthdates.

**Files:**

- `packages/shared/src/services/birthdateService.ts` (new)
- `packages/shared/src/services/birthdateService.test.ts` (new)

**Functions:**

```typescript
// Birthdate management
function setBirthdate(childId: string, familyId: string, birthdate: Date): ChildBirthdate
function getBirthdate(childId: string): ChildBirthdate | null
function updateBirthdate(childId: string, birthdate: Date): ChildBirthdate

// Age calculation
function calculateAge(birthdate: Date, referenceDate?: Date): number
function getAgeInYearsAndMonths(birthdate: Date): { years: number; months: number }

// 18th birthday detection
function is18OrOlder(birthdate: Date): boolean
function getDaysUntil18(birthdate: Date): number
function get18thBirthdayDate(birthdate: Date): Date

// Validation
function isValidBirthdate(birthdate: Date): boolean // Not in future, not > 100 years ago

// For testing
function clearAllBirthdateData(): void
```

**Acceptance Criteria:** AC1

---

### Task 3: Age18DeletionService

Create service for automatic deletion when child turns 18.

**Files:**

- `packages/shared/src/services/age18DeletionService.ts` (new)
- `packages/shared/src/services/age18DeletionService.test.ts` (new)

**Functions:**

```typescript
// Find children turning 18
function getChildrenTurning18Today(): { childId: string; familyId: string; birthdate: Date }[]
function getChildrenTurning18InDays(
  days: number
): { childId: string; familyId: string; birthdate: Date }[]

// Execute deletion (INV-005)
function executeAge18Deletion(childId: string, familyId: string): Age18DeletionRecord
function deleteAllChildData(childId: string): {
  dataTypesDeleted: DataType[]
  recordsDeleted: number
}

// Scheduled job execution
function runDailyAge18Check(): DailyCheckResult
interface DailyCheckResult {
  childrenChecked: number
  deletionsTriggered: number
  deletionsCompleted: number
  deletionsFailed: number
  notificationsSent: number
}

// Status tracking
function getDeletionRecord(childId: string): Age18DeletionRecord | null
function getAge18DeletionHistory(): Age18DeletionRecord[]

// For testing
function clearAllAge18DeletionData(): void
```

**Business Rules:**

- Deletion occurs at midnight on 18th birthday (in child's configured timezone)
- Deletion is IMMEDIATE and IRREVERSIBLE
- Parent wishes are NOT consulted (AC5)
- All data types defined in DELETION_DATA_TYPES are deleted

**Acceptance Criteria:** AC2, AC3, AC4, AC5, AC7

---

### Task 4: Age18NotificationService

Create service for notifying child of deletion.

**Files:**

- `packages/shared/src/services/age18NotificationService.ts` (new)
- `packages/shared/src/services/age18NotificationService.test.ts` (new)

**Functions:**

```typescript
// Notification generation
function getAge18DeletionMessage(): string
// Returns: "You're 18 - all data has been deleted"

function getPreDeletionMessage(daysUntil18: number): string
// Returns: "In 30 days, all your monitoring data will be automatically deleted"

// Notification sending
function sendDeletionCompleteNotification(childId: string): Age18DeletionNotification
function sendPreDeletionNotification(
  childId: string,
  daysUntil18: number
): Age18DeletionNotification

// Notification status
function getNotificationsForChild(childId: string): Age18DeletionNotification[]
function markNotificationAcknowledged(notificationId: string): void

// For testing
function clearAllNotificationData(): void
```

**Messages:**

- Primary message: "You're 18 - all data has been deleted" (AC6)
- Tone: Celebratory, emphasizing transition to adulthood
- No action required from child

**Acceptance Criteria:** AC6

---

### Task 5: Age18DeletionScheduler

Create scheduled function for daily birthdate checks.

**Files:**

- `packages/shared/src/services/age18DeletionScheduler.ts` (new)
- `packages/shared/src/services/age18DeletionScheduler.test.ts` (new)

**Functions:**

```typescript
// Scheduled job
function scheduleDailyAge18Check(): void
function executeDailyAge18Check(): DailyCheckResult

// Pre-deletion notifications (30 days before)
function sendPreDeletionNotifications(): number

// Retry failed deletions
function retryFailedDeletions(): { retried: number; succeeded: number; failed: number }

// Scheduler status
function getLastSchedulerRun(): { timestamp: Date; result: DailyCheckResult } | null
function getSchedulerStats(): SchedulerStats

interface SchedulerStats {
  totalRuns: number
  lastRunAt: Date | null
  totalDeletions: number
  failedDeletions: number
}
```

**Schedule:**

- Runs daily at 00:01 UTC (catches all timezone 18th birthdays)
- Checks all children with birthdates matching today - 18 years
- Triggers immediate deletion for matching children
- Sends pre-deletion notifications 30 days before

**Acceptance Criteria:** AC7

---

### Task 6: Age18DeletionConfirmation Component

Create UI component showing deletion confirmation to child.

**Files:**

- `apps/web/src/components/age18/Age18DeletionConfirmation.tsx` (new)
- `apps/web/src/components/age18/Age18DeletionConfirmation.test.tsx` (new)

**Props:**

```typescript
interface Age18DeletionConfirmationProps {
  childName: string
  deletionDate: Date
  dataTypesDeleted: DataType[]
  onAcknowledge: () => void
}
```

**Features:**

- Celebratory design (transition to adulthood)
- Clear message: "You're 18 - all data has been deleted"
- Lists what was deleted (without revealing sensitive content)
- Acknowledgment button
- No reversibility warning (deletion is already complete)
- Links to any post-graduation resources

**Acceptance Criteria:** AC6

---

### Task 7: Age18PreDeletionNotice Component

Create UI component warning of upcoming deletion.

**Files:**

- `apps/web/src/components/age18/Age18PreDeletionNotice.tsx` (new)
- `apps/web/src/components/age18/Age18PreDeletionNotice.test.tsx` (new)

**Props:**

```typescript
interface Age18PreDeletionNoticeProps {
  childName: string
  daysUntil18: number
  eighteenthBirthday: Date
  viewerType: ViewerType
  onDismiss?: () => void
}
```

**Features:**

- Banner/card shown 30 days before 18th birthday
- Different messaging for child vs parent:
  - Child: "In X days, all your monitoring data will be automatically deleted"
  - Parent: "In X days, [ChildName]'s monitoring data will be automatically deleted"
- Links to data export option (Story 38-6)
- Countdown display
- Cannot be dismissed permanently (reappears until deletion)

**Acceptance Criteria:** AC2, AC5

---

### Task 8: Integration Tests

Create integration tests for complete age-18 deletion flow.

**Files:**

- `packages/shared/src/services/__tests__/integration/age18Deletion.integration.test.ts` (new)

**Test Scenarios:**

1. Child with birthdate reaching 18 today triggers deletion
2. Deletion includes all data types (screenshots, flags, activity_logs, trust_history)
3. Deletion is complete and records are removed
4. Child receives notification after deletion
5. Parent cannot prevent or delay deletion
6. Daily scheduler correctly identifies children turning 18
7. Pre-deletion notifications sent 30 days before
8. Failed deletions are logged and retried
9. Child under 18 is not affected by scheduler
10. Birthdate validation prevents invalid dates
11. Deletion record created for audit trail

**Acceptance Criteria:** All ACs

---

### Task 9: Export Index Updates

Update package exports for age-18 deletion services.

**Files:**

- `packages/shared/src/index.ts` (update)
- `apps/web/src/components/age18/index.ts` (new)

**Exports:**

```typescript
// Age 18 Deletion exports (Story 38-5)
export * from './contracts/age18Deletion'
export * from './services/birthdateService'
export * from './services/age18DeletionService'
export * from './services/age18NotificationService'
export * from './services/age18DeletionScheduler'
```

**Acceptance Criteria:** All ACs

## Dev Notes

### Dependency on Previous Stories

| Story | Component                  | Usage in 38-5                           |
| ----- | -------------------------- | --------------------------------------- |
| 38-3  | `DataDeletionQueueService` | Reuse deletion patterns and data types  |
| 38-3  | `DeletionQueueEntry`       | Data type constants                     |
| 38-6  | `DataExportService`        | Pre-deletion export option (referenced) |

### INV-005 Architectural Invariant

From `docs/archive/architecture.md`:

> "INV-005: Deletion at 18 is automatic"

This is a **non-negotiable architectural constraint**. The deletion:

- Cannot be delayed by parent request
- Cannot be prevented by outstanding disputes
- Cannot be partially executed
- Must complete regardless of system state

### FR72 Requirement

From Epic 38:

> "Child's birthdate is on file"

Birthdate storage requirements:

- Collected during child account creation
- Validated for reasonableness (not future, not > 100 years ago)
- Used for age-appropriate messaging throughout app
- Critical for age-18 deletion trigger

### Deletion Scope

All data defined in `DELETION_DATA_TYPES` (from Story 38-3):

- `screenshots` - All captured screenshots
- `flags` - All content flags
- `activity_logs` - All activity records
- `trust_history` - All trust score history

Also includes:

- Child profile data
- Agreement history
- Device associations
- Any alumni records

### Scheduled Function Design

```typescript
// Runs daily at 00:01 UTC
// Checks: SELECT * FROM children WHERE
//   DATE(birthdate) = DATE(NOW() - INTERVAL 18 YEAR)
//
// For each match:
// 1. Execute immediate deletion
// 2. Send notification
// 3. Log deletion record
// 4. Update child status to 'deleted'
```

### Parent Notification Strategy

While parent wishes don't affect deletion:

- Parents receive 30-day advance notice (via Story 38-6)
- Parents can export sanitized data before deletion
- Parents cannot prevent, delay, or modify deletion

### Edge Cases

1. **Child turns 18 while offline**: Deletion happens server-side, notification delivered when child reconnects
2. **Birthdate not set**: Child is flagged for manual review; no automatic deletion
3. **Deletion partially fails**: Retry mechanism with exponential backoff; alert if persistent failure
4. **Already deleted/alumni**: Skip if child already graduated and data deleted

### References

- [Source: docs/archive/architecture.md#INV-005] - Deletion invariant
- [Source: packages/shared/src/services/dataDeletionQueueService.ts] - Deletion patterns
- [Source: packages/shared/src/contracts/graduationProcess.ts] - Data type definitions
- [Source: docs/epics/epic-list.md#Story-38.5] - Epic requirements

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List
