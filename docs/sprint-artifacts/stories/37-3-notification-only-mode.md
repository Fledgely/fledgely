# Story 37-3: Notification-Only Mode

## Story

As **a child approaching independence**,
I want **notification-only monitoring mode**,
So that **I have maximum privacy while parents stay informed**.

## Status: Done

## Acceptance Criteria

- [x] AC1: Notification-only mode disables screenshot capture
- [x] AC2: Parents receive daily summary (e.g., "Emma used device 3 hours today")
- [x] AC3: Only concerning patterns trigger alerts (not individual events)
- [x] AC4: Time limits still enforced if configured
- [x] AC5: Child sees "You're in notification-only mode - we trust you"
- [x] AC6: Mode represents near-graduation status (95+ trust for extended period)

## Technical Tasks

### Task 1: NotificationOnlyMode Data Model

Create data model for notification-only mode configuration.

**Files:**

- `packages/shared/src/contracts/notificationOnlyMode.ts` (new)
- `packages/shared/src/contracts/notificationOnlyMode.test.ts` (new)

**Types:**

```typescript
interface NotificationOnlyConfig {
  childId: string
  enabled: boolean
  enabledAt: Date | null
  qualifiedAt: Date | null // When child first qualified
  dailySummaryEnabled: boolean
  timeLimitsStillEnforced: boolean
}

interface DailySummary {
  childId: string
  date: Date
  totalUsageMinutes: number
  topApps: string[]
  concerningPatterns: string[]
}

// Requirement: 95+ trust for extended period (30+ days at milestone)
const NOTIFICATION_ONLY_TRUST_THRESHOLD = 95
const NOTIFICATION_ONLY_DURATION_DAYS = 30
```

**Acceptance Criteria:** AC1, AC6

### Task 2: NotificationOnlyModeService

Create service for managing notification-only mode transitions.

**Files:**

- `packages/shared/src/services/notificationOnlyModeService.ts` (new)
- `packages/shared/src/services/notificationOnlyModeService.test.ts` (new)

**Functions:**

```typescript
function isQualifiedForNotificationOnlyMode(trustScore: number, daysAtThreshold: number): boolean
function enableNotificationOnlyMode(childId: string): NotificationOnlyConfig
function disableNotificationOnlyMode(childId: string, reason: string): NotificationOnlyConfig
function isInNotificationOnlyMode(config: NotificationOnlyConfig): boolean
```

**Acceptance Criteria:** AC1, AC6

### Task 3: DailySummaryService

Create service for generating daily summaries.

**Files:**

- `packages/shared/src/services/dailySummaryService.ts` (new)
- `packages/shared/src/services/dailySummaryService.test.ts` (new)

**Functions:**

```typescript
function generateDailySummary(childId: string, date: Date, usageData: UsageData[]): DailySummary
function formatSummaryForParent(summary: DailySummary, childName: string): string
function detectConcerningPatterns(usageData: UsageData[]): ConcerningPattern[]
```

**Acceptance Criteria:** AC2, AC3

### Task 4: NotificationOnlyModeIndicator Component

Create component showing notification-only mode status.

**Files:**

- `apps/web/src/components/milestones/NotificationOnlyModeIndicator.tsx` (new)
- `apps/web/src/components/milestones/NotificationOnlyModeIndicator.test.tsx` (new)

**Features:**

- Child view: "You're in notification-only mode - we trust you"
- Parent view: Mode status and daily summary option
- Visual celebration of near-graduation status
- Time limits reminder if still enforced

**Acceptance Criteria:** AC4, AC5

### Task 5: Integration Tests

Create integration tests for notification-only mode system.

**Files:**

- `apps/web/src/components/milestones/__tests__/notificationOnlyMode.integration.test.tsx` (new)

**Test Scenarios:**

- Mode qualification at 95+ trust for 30+ days
- Screenshot capture disabled in mode
- Daily summary generation
- Concerning pattern detection
- Time limit enforcement with mode active
- Mode exit on trust regression

**Acceptance Criteria:** All ACs

## Dev Notes

### Mode Philosophy

- Notification-only is RECOGNITION of near-independence
- Maximum privacy while maintaining parental connection
- Represents trust, not just a feature toggle
- Gateway to eventual graduation

### Daily Summary Format

```
[Child Name]'s Daily Summary - [Date]
Device usage: [X] hours
Most used: [App1], [App2], [App3]
No concerning patterns detected ✓
```

### Concerning Patterns

Patterns that should still alert even in notification-only mode:

- Excessive usage (3x normal)
- Late night usage (past configured bedtime)
- New app categories (if configured)
- Time limit violations

### References

- [Source: packages/shared/src/contracts/trustMilestone.ts] - Trust milestone definitions
- [Source: packages/shared/src/services/milestoneService.ts] - Milestone service
