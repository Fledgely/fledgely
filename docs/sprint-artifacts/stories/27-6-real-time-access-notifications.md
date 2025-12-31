# Story 27.6: Real-Time Access Notifications

Status: done

## Story

As a **parent or child**,
I want **optional real-time notifications when my data is accessed**,
So that **I can stay informed of access as it happens**.

## Acceptance Criteria

1. **AC1: Enable notifications in settings**
   - Given user is in notification settings
   - When enabling access notifications
   - Then preference stored for that user

2. **AC2: Real-time notification on access**
   - Given user has enabled access notifications
   - When another user accesses their data (or their child's data)
   - Then notification sent: "John just viewed Emma's screenshots"

3. **AC3: Notifications off by default**
   - Given new user account
   - When checking notification settings
   - Then access notifications are disabled by default

4. **AC4: Daily digest option**
   - Given user prefers digest notifications
   - When access events occur during the day
   - Then daily summary sent: "Today's access summary: 5 views by 2 family members"

5. **AC5: Child notification option**
   - Given child has notification settings
   - When enabling "notify when parents view my data"
   - Then child receives notifications for their data access

6. **AC6: Quiet hours**
   - Given user has set quiet hours (e.g., 10pm-7am)
   - When access event occurs during quiet hours
   - Then notification held until quiet hours end (or batched into digest)

## Tasks / Subtasks

- [x] Task 1: Add notification preferences to user settings
  - [x] 1.1 Add notification preference types to shared contracts
  - [x] 1.2 Create service to manage notification preferences
  - [x] 1.3 Add preferences to user settings subcollection

- [x] Task 2: Create notification service
  - [x] 2.1 Create `accessNotificationService.ts`
  - [x] 2.2 Implement real-time notification trigger
  - [x] 2.3 Format notification messages with actor and resource info
  - [x] 2.4 Check quiet hours before sending

- [x] Task 3: Integrate with audit event creation
  - [x] 3.1 Trigger notification check on audit event creation
  - [x] 3.2 Skip notification if actor is the notified user
  - [x] 3.3 Handle child-specific notification preferences

- [x] Task 4: Create daily digest scheduled function
  - [x] 4.1 Create `sendAccessDigests` scheduled function
  - [x] 4.2 Query events from last 24 hours per user
  - [x] 4.3 Generate summary message
  - [x] 4.4 Mark notifications as sent

- [x] Task 5: Add notification settings UI
  - [x] 5.1 Add notification settings page
  - [x] 5.2 Toggle for real-time notifications
  - [x] 5.3 Toggle for daily digest
  - [x] 5.4 Quiet hours picker

## Dev Notes

### Notification Preference Schema

```typescript
interface NotificationPreferences {
  accessNotificationsEnabled: boolean // Real-time notifications
  accessDigestEnabled: boolean // Daily summary
  quietHoursStart: string | null // "22:00" format or null
  quietHoursEnd: string | null // "07:00" format or null
  notifyOnChildDataAccess: boolean // For parents
  notifyOnOwnDataAccess: boolean // For children
}
```

### Notification Message Format

Real-time: "John just viewed Emma's screenshots"
Digest: "Access summary for Dec 31: Emma's data was viewed 5 times by 2 family members"

### Push Notification Integration

Use Firebase Cloud Messaging (FCM) for push notifications:

- Store FCM token in user document on login
- Send via `messaging.send()` in Cloud Functions
- Fallback to in-app notification if push fails

### Quiet Hours Logic

```typescript
function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false
  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  // Handle overnight quiet hours (e.g., 22:00-07:00)
  if (prefs.quietHoursStart > prefs.quietHoursEnd) {
    return currentTime >= prefs.quietHoursStart || currentTime < prefs.quietHoursEnd
  }
  return currentTime >= prefs.quietHoursStart && currentTime < prefs.quietHoursEnd
}
```

### Project Structure

```
apps/functions/src/
├── services/notifications/
│   ├── accessNotificationService.ts    # NEW - Notification logic
│   └── index.ts                         # NEW - Exports
├── scheduled/
│   └── sendAccessDigests.ts            # NEW - Daily digest

apps/web/src/
├── app/dashboard/settings/
│   └── notifications/
│       └── page.tsx                     # NEW - Notification settings
```

### References

- [Source: docs/epics/epic-list.md#story-276] - Story requirements
- [Source: apps/functions/src/services/audit/] - Audit services

## Dev Agent Record

### Context Reference

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List

**New Files:**

- `apps/functions/src/services/notifications/accessNotificationService.ts`
- `apps/functions/src/services/notifications/index.ts`
- `apps/functions/src/scheduled/sendAccessDigests.ts`
- `apps/web/src/app/dashboard/settings/notifications/page.tsx`

**Modified Files:**

- `packages/shared/src/contracts/index.ts` - Add notification preference types
- `apps/functions/src/services/audit/auditEventService.ts` - Trigger notifications
- `apps/functions/src/index.ts` - Export scheduled function
