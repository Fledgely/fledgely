# Story 41.7: Child Notification Preferences

## Status: done

## Story

As a **child**,
I want **some control over my notifications**,
So that **I'm informed without being overwhelmed**.

## Acceptance Criteria

1. **AC1: Required Notifications (Cannot Disable)**
   - Given child has notification settings
   - When viewing notification preferences
   - Then receives: time limit warnings (required, can't disable)
   - And receives: agreement changes (required)
   - And these are shown as "always on" in UI

2. **AC2: Optional Notification Types**
   - Given child is configuring notifications
   - When setting optional preferences
   - Then can toggle: trust score changes
   - And can toggle: weekly activity summary
   - And defaults are age-appropriate

3. **AC3: Quiet Hours for Non-Urgent**
   - Given child wants fewer interruptions
   - When configuring quiet hours
   - Then can set quiet period (e.g., during school, night)
   - And non-urgent notifications are delayed
   - And required notifications still come through immediately

4. **AC4: Parent Privacy Barrier**
   - Given parent is viewing family settings
   - When looking for child notification settings
   - Then CANNOT view child's notification preferences
   - And CANNOT modify child's notification preferences
   - And child settings are truly private

5. **AC5: Age-Appropriate Defaults**
   - Given new child account is created
   - When notification preferences are initialized
   - Then defaults vary by age bracket:
     - Ages 8-12: Minimal optional notifications
     - Ages 13-15: Moderate defaults
     - Ages 16+: All options available
   - And defaults can be changed by child

6. **AC6: Child Notification Delivery**
   - Given child has configured preferences
   - When notification events occur
   - Then notifications delivered per child's settings
   - And delivery logged for child's audit view
   - And uses same delivery infrastructure as parent notifications

## Tasks / Subtasks

### Task 1: Create Child Notification Preferences Schema (AC: #1, #2, #3, #5)

Define schemas for child notification preferences.

**Files:**

- `packages/shared/src/contracts/childNotificationPreferences.ts` (new)
- `packages/shared/src/contracts/childNotificationPreferences.test.ts` (new)

**Implementation:**

- Create `childNotificationPreferencesSchema`:
  - `id: string` (childId)
  - `childId: string`
  - `familyId: string`
  - Required (read-only in schema):
    - `timeLimitWarningsEnabled: true` (locked)
    - `agreementChangesEnabled: true` (locked)
  - Optional:
    - `trustScoreChangesEnabled: boolean` (default varies by age)
    - `weeklySummaryEnabled: boolean` (default varies by age)
  - Quiet hours:
    - `quietHoursEnabled: boolean`
    - `quietHoursStart: string` (HH:mm)
    - `quietHoursEnd: string` (HH:mm)
  - `createdAt`, `updatedAt`
- Create `childNotificationPreferencesUpdateSchema` (only optional fields)
- Create `getAgeAppropriateDefaults(age: number)` helper
- Create validation tests

### Task 2: Create Child Preferences Firestore Service (AC: #4, #6)

Create backend service with privacy enforcement.

**Files:**

- `apps/functions/src/lib/notifications/childNotificationPreferencesService.ts` (new)
- `apps/functions/src/lib/notifications/childNotificationPreferencesService.test.ts` (new)

**Implementation:**

- `getChildNotificationPreferences(childId, familyId)`:
  - Returns child's preferences
  - Creates defaults if not exists (age-appropriate)
- `updateChildNotificationPreferences(childId, updates)`:
  - Only updates allowed optional fields
  - Validates caller is the child (auth check)
  - Rejects parent calls (privacy enforcement)
- `initializeChildPreferences(childId, familyId, birthDate)`:
  - Called when child account created
  - Sets age-appropriate defaults

**Firestore Path:**

- `children/{childId}/settings/notificationPreferences`

### Task 3: Create Child Preferences Callable (AC: #4)

Firebase callable for child preference management.

**Files:**

- `apps/functions/src/callable/getChildNotificationPreferences.ts` (new)
- `apps/functions/src/callable/getChildNotificationPreferences.test.ts` (new)
- `apps/functions/src/callable/updateChildNotificationPreferences.ts` (new)
- `apps/functions/src/callable/updateChildNotificationPreferences.test.ts` (new)

**Implementation:**

- `getChildNotificationPreferences`:
  - Input: `{ childId, familyId }`
  - Auth: Caller must be the child (childId matches auth uid)
  - Returns child's notification preferences
  - REJECTS parent callers (privacy)
- `updateChildNotificationPreferences`:
  - Input: `{ childId, familyId, preferences }`
  - Auth: Caller must be the child
  - Updates only allowed optional fields
  - Returns updated preferences

### Task 4: Update Child Notification Delivery (AC: #6)

Integrate child preferences with notification delivery.

**Files:**

- `apps/functions/src/lib/notifications/childNotificationDelivery.ts` (new)
- `apps/functions/src/lib/notifications/childNotificationDelivery.test.ts` (new)

**Implementation:**

- `shouldDeliverToChild(childId, notificationType)`:
  - Checks child's notification preferences
  - Required types always return true
  - Optional types check preference
  - Respects quiet hours for non-urgent
- `deliverNotificationToChild(childId, notification)`:
  - Uses FCM for push notifications
  - Logs delivery for child's audit trail
  - Follows same patterns as parent delivery

**Notification Types for Children:**

- `time_limit_warning` - required
- `agreement_change` - required
- `trust_score_change` - optional
- `weekly_summary` - optional

### Task 5: Update Exports and Dependencies (AC: all)

**Files:**

- `packages/shared/src/contracts/index.ts` - add exports
- `packages/shared/src/index.ts` - add exports
- `apps/functions/src/lib/notifications/index.ts` - add exports
- `apps/functions/src/index.ts` - register callables

## Dev Notes

### Architecture Patterns (from Story 41-6)

- Use Zod schemas in shared package
- Firebase v2 callables for API
- Lazy Firestore initialization pattern
- Test helpers for resetting state

### Privacy Enforcement

- Critical: Parents MUST NOT access child notification preferences
- Auth check in callable must verify `auth.uid === childId`
- No API endpoint for parents to read/write child prefs
- Separate Firestore path under `children/{childId}/` not `users/{parentId}/`

### Age Bracket Logic

```typescript
function getAgeAppropriateDefaults(birthDate: Date): ChildNotificationDefaults {
  const age = calculateAge(birthDate)
  if (age < 13) {
    // Ages 8-12: Minimal
    return { trustScoreChangesEnabled: false, weeklySummaryEnabled: false }
  } else if (age < 16) {
    // Ages 13-15: Moderate
    return { trustScoreChangesEnabled: true, weeklySummaryEnabled: false }
  } else {
    // Ages 16+: Full
    return { trustScoreChangesEnabled: true, weeklySummaryEnabled: true }
  }
}
```

### Quiet Hours for Children

- Respect school hours (8am-3pm typical)
- Nighttime quiet hours encouraged
- Non-urgent = trust score, weekly summary
- Urgent = time limits, agreement changes (bypass quiet hours)

### Project Structure Notes

- Schemas: `packages/shared/src/contracts/childNotificationPreferences.ts`
- Functions: `apps/functions/src/lib/notifications/childNotificationPreferencesService.ts`
- Callables: `apps/functions/src/callable/[get|update]ChildNotificationPreferences.ts`

### References

- [Source: docs/epics/epic-list.md#story-417-child-notification-preferences]
- [Source: packages/shared/src/contracts/notificationPreferences.ts] - Parent prefs pattern
- [Source: packages/shared/src/contracts/deliveryChannel.ts] - Delivery channel types
- [Source: apps/functions/src/lib/notifications/deliveryChannelManager.ts] - Delivery patterns

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

### Completion Notes List

### File List

- packages/shared/src/contracts/childNotificationPreferences.ts (new)
- packages/shared/src/contracts/childNotificationPreferences.test.ts (new)
- packages/shared/src/contracts/index.ts (modified)
- packages/shared/src/index.ts (modified)
- apps/functions/src/lib/notifications/childNotificationPreferencesService.ts (new)
- apps/functions/src/lib/notifications/childNotificationPreferencesService.test.ts (new)
- apps/functions/src/lib/notifications/childNotificationDelivery.ts (new)
- apps/functions/src/lib/notifications/childNotificationDelivery.test.ts (new)
- apps/functions/src/lib/notifications/index.ts (modified)
- apps/functions/src/callable/getChildNotificationPreferences.ts (new)
- apps/functions/src/callable/getChildNotificationPreferences.test.ts (new)
- apps/functions/src/callable/updateChildNotificationPreferences.ts (new)
- apps/functions/src/callable/updateChildNotificationPreferences.test.ts (new)
- apps/functions/src/index.ts (modified)
