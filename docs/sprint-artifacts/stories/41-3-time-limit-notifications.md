# Story 41.3: Time Limit Notifications

## Status: done

## Story

As a **parent**,
I want **to be notified about time limit events**,
So that **I know when limits are reached (FR44, FR45)**.

## Acceptance Criteria

1. **AC1: Time Limit Warning Notification**
   - Given child approaching time limit
   - When configurable warning threshold crossed (default 15 min)
   - Then parent receives notification if timeLimitWarningsEnabled = true
   - And notification shows: child name, time remaining, device/category
   - And tapping notification opens time dashboard

2. **AC2: Limit Reached Notification**
   - Given child reaches time limit
   - When limit enforced
   - Then parent receives notification if limitReachedEnabled = true
   - And notification shows: child name, which limit (daily/category/device)
   - And notification includes current vs allowed time

3. **AC3: Extension Request Notification**
   - Given child requests time extension
   - When extension request created
   - Then parent receives notification if extensionRequestsEnabled = true
   - And notification shows: child name, amount requested, reason (if provided)
   - And notification has approve/deny quick actions
   - And both co-parents receive notification (FR103)

4. **AC4: Child Time Limit Notifications**
   - Given child has device with fledgely
   - When time limit events occur
   - Then child receives: warning notifications (required, can't disable)
   - And child receives: limit reached notifications
   - And child notifications are age-appropriate

5. **AC5: Configurable Limit Notifications**
   - Given parent in notification settings
   - When configuring time limit preferences
   - Then can disable warnings while keeping limit reached
   - And can disable extension requests while keeping warnings
   - And preferences per-child supported (Story 41.1)

6. **AC6: Quiet Hours Respect**
   - Given parent has quiet hours enabled
   - When time limit notification would be sent
   - Then non-critical time notifications delayed until quiet hours end
   - And extension requests bypass quiet hours (action required)

7. **AC7: Notification Deduplication**
   - Given multiple devices reaching limits
   - When notifications generated
   - Then consolidated into single notification when appropriate
   - And notification shows count if multiple events

## Tasks / Subtasks

### Task 1: Create Time Limit Notification Schemas (AC: #1, #2, #3, #4) [x]

Define schemas for time limit notification events.

**Files:**

- `packages/shared/src/contracts/timeLimitNotifications.ts` (new)
- `packages/shared/src/contracts/timeLimitNotifications.test.ts` (new)

**Implementation:**

- Create `timeLimitNotificationEventSchema`:
  - `id: string`
  - `type: 'warning' | 'limit_reached' | 'extension_request'`
  - `childId: string`
  - `childName: string`
  - `familyId: string`
  - `deviceId?: string`
  - `deviceName?: string`
  - `categoryId?: string`
  - `categoryName?: string`
  - `limitType: 'daily_total' | 'category' | 'device'`
  - `currentMinutes: number`
  - `allowedMinutes: number`
  - `remainingMinutes?: number` (for warnings)
  - `extensionRequestId?: string` (for extension requests)
  - `extensionMinutesRequested?: number`
  - `extensionReason?: string`
  - `createdAt: Date`
- Create `timeLimitNotificationPreferencesSchema` (child-side):
  - `warningNotificationsEnabled: boolean` (always true, can't disable)
  - `limitReachedNotificationsEnabled: boolean` (default true)
- Export from contracts index

**Tests:** ~15 tests for schema validation

### Task 2: Create Time Limit Notification Service (AC: #1, #2, #6, #7) [x]

Service to send time limit notifications to parents.

**Files:**

- `apps/functions/src/lib/notifications/timeLimitNotificationService.ts` (new)
- `apps/functions/src/lib/notifications/timeLimitNotificationService.test.ts` (new)

**Implementation:**

- Create `sendTimeLimitWarningNotification(params)`:
  - Check parent preferences (timeLimitWarningsEnabled)
  - Check quiet hours (non-critical, can be delayed)
  - Build notification: "{childName}'s screen time: {remaining} min left"
  - Send via FCM to all enabled guardians
  - Deep link to `/dashboard/time/{childId}`
- Create `sendLimitReachedNotification(params)`:
  - Check parent preferences (limitReachedEnabled)
  - Check quiet hours (can be delayed)
  - Build notification: "{childName} reached {limitType} limit"
  - Include current vs allowed time in body
  - Send to all enabled guardians
- Create `consolidateTimeLimitNotifications(events)`:
  - Group by child if multiple limits
  - Return consolidated notification content
- Reuse FCM patterns from `sendStatusNotification.ts`

**Tests:** ~20 tests covering notifications, preferences, quiet hours

### Task 3: Create Extension Request Notification Service (AC: #3, #6) [x]

Service for extension request notifications with quick actions.

**Files:**

- `apps/functions/src/lib/notifications/extensionRequestNotification.ts` (new)
- `apps/functions/src/lib/notifications/extensionRequestNotification.test.ts` (new)

**Implementation:**

- Create `sendExtensionRequestNotification(params)`:
  - Check parent preferences (extensionRequestsEnabled)
  - Extension requests BYPASS quiet hours (action required)
  - Build notification: "{childName} requests {minutes} more minutes"
  - Include reason if provided
  - Add action buttons: "Approve", "Deny"
  - Send to ALL guardians (co-parent symmetry FR103)
  - Deep link to extension request view
  - Record in notification history
- Integrate with existing `requestTimeExtension` callable in timeExtension.ts

**Tests:** ~15 tests for extension request notifications

### Task 4: Create Child Time Limit Notification Service (AC: #4) [x]

Service to send time limit notifications to child devices.

**Files:**

- `apps/functions/src/lib/notifications/childTimeLimitNotification.ts` (new)
- `apps/functions/src/lib/notifications/childTimeLimitNotification.test.ts` (new)

**Implementation:**

- Create `sendChildWarningNotification(params)`:
  - Always send (can't disable - required for child awareness)
  - Age-appropriate language
  - Build notification: "Screen time: {remaining} minutes left!"
  - Send to child's device tokens
- Create `sendChildLimitReachedNotification(params)`:
  - Build notification: "Screen time for today is done!"
  - Include encouraging message
  - Send to child's device tokens
- Get child tokens from `users/{childId}/notificationTokens`

**Tests:** ~12 tests for child notifications

### Task 5: Integrate with Time Limit Enforcement (AC: #1, #2, #4) [x]

Connect notification service to time limit enforcement flow.

**Files:**

- `apps/functions/src/http/timeLimits/checkLimit.ts` (modify if exists, or create trigger)
- `apps/functions/src/triggers/onTimeLimitReached.ts` (new if using Firestore triggers)

**Implementation:**

- Option A: HTTP endpoint integration
  - When checkLimit detects warning threshold → queue notification
  - When checkLimit detects limit reached → queue notification
- Option B: Firestore trigger (preferred)
  - Trigger on `children/{childId}/timeLimitStatus/{date}` updates
  - When status changes to 'warning' → send warning notification
  - When status changes to 'enforced' → send limit reached notification
- Ensure notifications sent to both parent and child

**Tests:** ~10 tests for integration

### Task 6: Update Extension Request Flow (AC: #3) [x]

Enhance existing extension request to send notifications.

**Files:**

- `apps/functions/src/callable/timeExtension.ts` (modify)
- `apps/functions/src/callable/timeExtension.test.ts` (modify)

**Implementation:**

- In `requestTimeExtension`:
  - After creating request document, call `sendExtensionRequestNotification`
  - Pass child name, minutes requested, reason
- In `respondToTimeExtension`:
  - After approval/denial, notify child of result
- Ensure co-parent notification symmetry (FR103)

**Tests:** ~8 tests for enhanced extension flow

### Task 7: Update Notification Exports (AC: All) [x]

Export new notification services.

**Files:**

- `apps/functions/src/lib/notifications/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

**Implementation:**

- Export timeLimitNotificationService functions
- Export extensionRequestNotification functions
- Export childTimeLimitNotification functions
- Export timeLimitNotificationEventSchema
- Register any new triggers/scheduled functions

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/shared (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Notifications:** Firebase Cloud Messaging (FCM)

### Architecture Compliance

**From Architecture Document:**

- Firebase Cloud Functions as notification orchestration layer
- Per-user preferences checked for EACH guardian independently
- Co-parent symmetry for extension requests (both receive notification)

**Key Patterns to Follow:**

- `sendStatusNotification.ts` - FCM sending pattern
- `flagNotificationOrchestrator.ts` - Preference checking pattern
- `sendImmediateFlagNotification.ts` - Quiet hours bypass pattern
- `timeExtension.ts` - Existing extension request flow

### Existing Infrastructure to Leverage

**From Story 41.1 (Notification Preferences):**

- `parentNotificationPreferencesSchema` - Preferences structure
- `getNotificationPreferences` callable - Load user preferences
- `isInQuietHours()` helper - Check quiet hours
- `timeLimitWarningsEnabled`, `limitReachedEnabled`, `extensionRequestsEnabled` fields

**From Story 41.2 (Flag Notifications):**

- `flagNotificationOrchestrator.ts` - Orchestration pattern
- `sendImmediateFlagNotification.ts` - FCM sending with quiet hours
- Notification history tracking pattern

**From Epic 31 (Time Limit Enforcement):**

- `timeExtension.ts` - Extension request/response flow
- `timeOverride.ts` - Override flow
- `getConfig.ts` - Time limit configuration
- `warningThresholdsSchema` - Warning threshold config

### Data Model

```typescript
// Time limit notification event (for logging)
interface TimeLimitNotificationEvent {
  id: string
  type: 'warning' | 'limit_reached' | 'extension_request'
  childId: string
  childName: string
  familyId: string
  deviceId?: string
  deviceName?: string
  categoryId?: string
  categoryName?: string
  limitType: 'daily_total' | 'category' | 'device'
  currentMinutes: number
  allowedMinutes: number
  remainingMinutes?: number
  extensionRequestId?: string
  extensionMinutesRequested?: number
  extensionReason?: string
  createdAt: number
}

// Notification content
interface TimeLimitNotificationContent {
  title: string
  body: string
  data: {
    type: 'time_warning' | 'limit_reached' | 'extension_request'
    childId: string
    familyId: string
    limitType?: string
    extensionRequestId?: string
    action: 'view_time' | 'respond_extension'
  }
}
```

### File Structure

```
packages/shared/src/contracts/
├── timeLimitNotifications.ts              # NEW - Event schemas
├── timeLimitNotifications.test.ts         # NEW
└── index.ts                               # MODIFY - exports

apps/functions/src/lib/notifications/
├── timeLimitNotificationService.ts        # NEW - Parent notifications
├── timeLimitNotificationService.test.ts   # NEW
├── extensionRequestNotification.ts        # NEW - Extension requests
├── extensionRequestNotification.test.ts   # NEW
├── childTimeLimitNotification.ts          # NEW - Child notifications
├── childTimeLimitNotification.test.ts     # NEW
└── index.ts                               # MODIFY - exports

apps/functions/src/callable/
├── timeExtension.ts                       # MODIFY - Add notifications
└── timeExtension.test.ts                  # MODIFY

apps/functions/src/triggers/
├── onTimeLimitReached.ts                  # NEW (optional if using triggers)
└── onTimeLimitReached.test.ts             # NEW
```

### Testing Requirements

- Unit test all schemas with edge cases
- Unit test notification services with mocked FCM
- Test preference checking (enabled/disabled states)
- Test quiet hours bypass for extension requests
- Test co-parent notification symmetry
- Test child notification delivery
- Test notification consolidation for multiple events
- Integration test with existing timeExtension.ts

### NFR References

- FR44: Parent notified when child reaches screen time limit
- FR45: Parent notified when child requests time extension
- FR103: Co-parents receive same notifications
- NFR: Notifications respect quiet hours except critical/action-required

### Notification Messages

```typescript
// Warning notification
title: 'Screen Time Warning'
body: "{childName}'s screen time: 15 minutes remaining"

// Limit reached notification
title: 'Screen Time Limit Reached'
body: '{childName} has reached their daily limit (2h used of 2h allowed)'

// Extension request notification
title: 'Time Extension Request'
body: "{childName} is requesting 30 more minutes - 'Need to finish homework'"

// Child warning notification
title: 'Screen Time Reminder'
body: 'You have 15 minutes of screen time left today!'

// Child limit reached notification
title: 'Screen Time Done'
body: 'Your screen time for today is complete. Great job!'
```

### References

- [Source: docs/epics/epic-list.md#Story-41.3]
- [Source: docs/prd/functional-requirements.md#FR44-FR45]
- [Source: apps/functions/src/callable/timeExtension.ts]
- [Source: packages/shared/src/contracts/notificationPreferences.ts]
- [Source: apps/functions/src/lib/notifications/sendStatusNotification.ts]

## Dev Agent Record

### Context Reference

- Epic: 41 (Notifications & Alerts)
- Story Key: 41-3-time-limit-notifications
- Dependencies: Story 41.1 (Notification Preferences Configuration) - COMPLETE
- Dependencies: Story 31.6 (Time Extension Requests) - COMPLETE
- Dependencies: Story 31.1 (Countdown Warning System) - COMPLETE

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- Task 1: Created timeLimitNotifications.ts with all schemas and helper functions (40 tests)
- Task 2: Created timeLimitNotificationService.ts with parent notification functions (13 tests)
- Task 3: Created extensionRequestNotification.ts with co-parent symmetry and quiet hours bypass (13 tests)
- Task 4: Created childTimeLimitNotification.ts with age-appropriate notifications (12 tests)
- Task 5: Created timeLimitCheck.ts integration service with warning thresholds (9 tests)
- Task 6: Updated timeExtension.ts to use new notification services
- Task 7: Updated all index.ts exports for shared and functions packages
- Total: 87 tests passing across Story 41-3 implementation

### File List

**New Files:**

- packages/shared/src/contracts/timeLimitNotifications.ts
- packages/shared/src/contracts/timeLimitNotifications.test.ts
- apps/functions/src/lib/notifications/timeLimitNotificationService.ts
- apps/functions/src/lib/notifications/timeLimitNotificationService.test.ts
- apps/functions/src/lib/notifications/extensionRequestNotification.ts
- apps/functions/src/lib/notifications/extensionRequestNotification.test.ts
- apps/functions/src/lib/notifications/childTimeLimitNotification.ts
- apps/functions/src/lib/notifications/childTimeLimitNotification.test.ts
- apps/functions/src/lib/notifications/timeLimitCheck.ts
- apps/functions/src/lib/notifications/timeLimitCheck.test.ts

**Modified Files:**

- packages/shared/src/contracts/index.ts
- packages/shared/src/index.ts
- apps/functions/src/lib/notifications/index.ts
- apps/functions/src/callable/timeExtension.ts

## Change Log

| Date       | Change                                 |
| ---------- | -------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)          |
| 2026-01-03 | Story implemented and completed (done) |
