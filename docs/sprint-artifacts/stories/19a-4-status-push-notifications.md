# Story 19A.4: Status Push Notifications

Status: done

## Story

As a **parent away from the app**,
I want **push notifications only when status changes**,
So that **I'm alerted to problems without constant pings**.

## Acceptance Criteria

1. **AC1: Status change detection**
   - Given family status is being monitored
   - When status changes (green→yellow, yellow→red, etc.)
   - Then system detects the status transition
   - And determines notification type based on severity change

2. **AC2: Push notification delivery**
   - Given status change is detected
   - When notification is triggered
   - Then push notification sent to parent(s) via FCM
   - And notification delivered even if app is closed/backgrounded

3. **AC3: Notification content**
   - Given notification is sent
   - When parent receives it
   - Then notification includes: what changed, which child/device
   - And green-to-yellow sends "Advisory: [Child] device hasn't synced in 2 hours"
   - And any-to-red sends "Action needed: [specific issue]"
   - And red-to-green sends "Resolved: [Child] is back online"

4. **AC4: Notification frequency capping**
   - Given notifications are being sent
   - When multiple status changes occur
   - Then notification frequency is capped (max 1 per hour per child)
   - And more urgent notifications (red) override waiting period

5. **AC5: Token registration**
   - Given parent opens app on a device
   - When app initializes
   - Then FCM token is registered/updated for that user
   - And token associated with user in Firestore

6. **AC6: Multi-device support**
   - Given parent has multiple devices (phone, tablet)
   - When notification is sent
   - Then all registered devices receive the notification
   - And token cleanup handles stale/expired tokens

## Tasks / Subtasks

- [x] Task 1: Create FCM token registration on web (AC: #5, #6)
  - [x] 1.1 Create `apps/web/src/hooks/usePushNotifications.ts` for FCM setup
  - [x] 1.2 Request notification permission on dashboard load
  - [x] 1.3 Get FCM token using Firebase Messaging SDK
  - [x] 1.4 Store token in Firestore `users/{uid}/notificationTokens/{tokenId}`
  - [x] 1.5 Handle token refresh and update Firestore
  - [x] 1.6 Clean up tokens on sign-out (unregisterToken function)

- [x] Task 2: Create status change detection function (AC: #1)
  - [x] 2.1 Create `apps/functions/src/triggers/onDeviceStatusChange.ts`
  - [x] 2.2 Trigger on Firestore writes to `families/{familyId}/devices/{deviceId}`
  - [x] 2.3 Compare previous vs new status to detect transitions
  - [x] 2.4 Calculate family-level status change from device changes
  - [x] 2.5 Determine affected child from device's childId

- [x] Task 3: Create notification sending function (AC: #2, #3)
  - [x] 3.1 Create `apps/functions/src/lib/notifications/sendStatusNotification.ts`
  - [x] 3.2 Accept parameters: familyId, childId, transition type, device info
  - [x] 3.3 Build notification title and body based on transition
  - [x] 3.4 Fetch all parent FCM tokens for the family
  - [x] 3.5 Send via firebase-admin messaging.sendEachForMulticast()
  - [x] 3.6 Handle send failures and token cleanup

- [x] Task 4: Implement notification throttling (AC: #4)
  - [x] 4.1 Create `apps/functions/src/lib/notifications/notificationThrottle.ts`
  - [x] 4.2 Store last notification time per child in Firestore `families/{familyId}/notificationState/{childId}`
  - [x] 4.3 Check throttle before sending (1 hour cooldown)
  - [x] 4.4 Red status notifications bypass throttle (urgent)
  - [x] 4.5 Update throttle timestamp after successful send

- [x] Task 5: Create notification content builder (AC: #3)
  - [x] 5.1 Create `apps/functions/src/lib/notifications/buildStatusNotification.ts`
  - [x] 5.2 Define notification templates for each transition type
  - [x] 5.3 Include child name and specific issue in body
  - [x] 5.4 Add deep link data for tapping notification

- [x] Task 6: Add notification token cleanup (AC: #6)
  - [x] 6.1 Handle `messaging/registration-token-not-registered` errors
  - [x] 6.2 Remove stale tokens from Firestore on send failure
  - [x] 6.3 Create scheduled cleanup function for expired tokens (optional - not needed, cleanup on send failure is sufficient)

- [x] Task 7: Add unit tests (AC: #1-6)
  - [x] 7.1 Test token registration and storage (12 tests)
  - [x] 7.2 Test status change detection (13 tests)
  - [x] 7.3 Test notification content for each transition type (15 tests)
  - [x] 7.4 Test throttling logic (10 tests)
  - [x] 7.5 Test red status bypasses throttle
  - [x] 7.6 Test multi-device token handling
  - [x] 7.7 Test stale token cleanup
  - [x] 7.8 Minimum 20 tests required - **115 tests total (103 backend + 12 frontend)**

## Dev Notes

### Implementation Strategy

This story implements push notifications for status changes using Firebase Cloud Messaging (FCM). The architecture consists of:

1. **Web client**: Registers FCM tokens when user opens app
2. **Firestore trigger**: Detects device status changes
3. **Notification service**: Sends push notifications to parents

### Critical Dependencies

**Firebase Packages Required:**

- `firebase/messaging` - Already in web app (check package.json)
- `firebase-admin` - Already in functions

**FCM Setup Required:**

- Web Push Certificate (VAPID key) - needs to be configured in Firebase Console
- Service Worker for background notifications

### Existing Code to Leverage

**From Story 19A-1:**

- `apps/web/src/hooks/useFamilyStatus.ts` - Status calculation logic, THRESHOLDS
- Status levels: `good`, `attention`, `action`

**From useDevices:**

- Device health metrics structure
- `lastSyncTimestamp`, `isOnline`, `monitoringActive`

**From functions/src:**

- `apps/functions/src/utils/adminAudit.ts` - Audit logging pattern
- Firestore trigger patterns from existing functions

### Data Structures

```typescript
// Token storage: users/{uid}/notificationTokens/{tokenId}
interface NotificationToken {
  token: string
  platform: 'web' | 'android' | 'ios'
  createdAt: Timestamp
  updatedAt: Timestamp
  deviceInfo?: string
}

// Throttle state: families/{familyId}/notificationState/{childId}
interface NotificationState {
  lastNotificationSent: Timestamp
  lastTransition: StatusTransition
}

// Status transition types
type StatusTransition =
  | 'good_to_attention'
  | 'good_to_action'
  | 'attention_to_action'
  | 'attention_to_good'
  | 'action_to_attention'
  | 'action_to_good'
```

### Notification Templates

```typescript
const NOTIFICATION_TEMPLATES: Record<StatusTransition, { title: string; bodyTemplate: string }> = {
  good_to_attention: {
    title: 'Advisory',
    bodyTemplate: "{childName}'s device hasn't synced in 2 hours",
  },
  good_to_action: {
    title: 'Action Needed',
    bodyTemplate: '{childName}: {issueDescription}',
  },
  attention_to_action: {
    title: 'Action Needed',
    bodyTemplate: '{childName}: {issueDescription}',
  },
  attention_to_good: {
    title: 'Resolved',
    bodyTemplate: "{childName}'s status is back to normal",
  },
  action_to_attention: {
    title: 'Improving',
    bodyTemplate: '{childName}: Some issues resolved, attention still needed',
  },
  action_to_good: {
    title: 'Resolved',
    bodyTemplate: '{childName} is back online',
  },
}
```

### FCM Web Setup

```typescript
// apps/web/src/lib/firebase-messaging.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { app } from './firebase'

export async function initializeMessaging() {
  const messaging = getMessaging(app)

  // Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.log('Notification permission denied')
    return null
  }

  // Get FCM token
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  })

  return token
}
```

### Service Worker for Background Notifications

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: '...',
  projectId: 'fledgely-dev',
  messagingSenderId: '...',
  appId: '...',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification
  self.registration.showNotification(title, { body })
})
```

### Trigger Function Pattern

```typescript
// apps/functions/src/triggers/onDeviceStatusChange.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

export const onDeviceStatusChange = onDocumentWritten(
  'families/{familyId}/devices/{deviceId}',
  async (event) => {
    const before = event.data?.before?.data()
    const after = event.data?.after?.data()

    if (!after) return // Deleted

    const prevStatus = calculateDeviceStatus(before)
    const newStatus = calculateDeviceStatus(after)

    if (prevStatus !== newStatus) {
      await handleStatusTransition({
        familyId: event.params.familyId,
        deviceId: event.params.deviceId,
        childId: after.childId,
        transition: `${prevStatus}_to_${newStatus}`,
      })
    }
  }
)
```

### Throttling Logic

```typescript
// apps/functions/src/lib/notifications/notificationThrottle.ts
const THROTTLE_DURATION_MS = 60 * 60 * 1000 // 1 hour

export async function shouldSendNotification(
  familyId: string,
  childId: string,
  transition: StatusTransition
): Promise<boolean> {
  // Red (action) notifications always send
  if (transition.endsWith('_to_action')) {
    return true
  }

  const stateRef = db
    .collection('families')
    .doc(familyId)
    .collection('notificationState')
    .doc(childId)
  const state = await stateRef.get()

  if (!state.exists) return true

  const lastSent = state.data()?.lastNotificationSent?.toDate()
  if (!lastSent) return true

  const elapsed = Date.now() - lastSent.getTime()
  return elapsed >= THROTTLE_DURATION_MS
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/hooks/usePushNotifications.ts` - Token registration hook
- `apps/web/src/lib/firebase-messaging.ts` - FCM setup utilities
- `apps/web/public/firebase-messaging-sw.js` - Service worker
- `apps/functions/src/triggers/onDeviceStatusChange.ts` - Status change trigger
- `apps/functions/src/lib/notifications/sendStatusNotification.ts` - Send function
- `apps/functions/src/lib/notifications/notificationThrottle.ts` - Throttle logic
- `apps/functions/src/lib/notifications/buildStatusNotification.ts` - Content builder
- `apps/functions/src/lib/notifications/index.ts` - Barrel exports
- Test files for all above

**Files to modify:**

- `apps/functions/src/index.ts` - Export trigger function
- `apps/web/src/app/dashboard/page.tsx` - Initialize notifications

### Testing Strategy

**Unit tests (functions):**

- Mock Firestore for trigger tests
- Test status comparison logic
- Test notification content building
- Test throttle bypass for red status

**Unit tests (web):**

- Mock firebase/messaging
- Test permission request flow
- Test token registration
- Test token refresh handling

**Integration tests (optional):**

- Use Firebase Emulator for trigger testing
- Test end-to-end notification flow

### Edge Cases

1. **No FCM tokens registered:** Skip notification silently
2. **All tokens invalid:** Clean up tokens, no notification
3. **Device deleted:** Don't send notification for deletion
4. **Multiple devices change simultaneously:** Aggregate to one notification
5. **Family has no children:** Skip (shouldn't happen)
6. **User denies notification permission:** Graceful degradation, no token stored

### Security Considerations

- FCM tokens are user-specific, stored in user's subcollection
- Only family guardians receive notifications
- No sensitive data in notification payload (just child name and generic status)
- Service worker doesn't expose any credentials

### Previous Story Intelligence

**From Story 19A-1/19A-2:**

- Status thresholds: OFFLINE_CRITICAL_HOURS: 24, SYNC_WARNING_MINUTES: 60
- Status levels: `good`, `attention`, `action`
- Device health metrics structure in useDevices

**From Extension Stories (Epic 9-12):**

- Device status updates to Firestore
- Health metrics: lastSyncTimestamp, isOnline, monitoringActive

### References

- [Source: docs/epics/epic-list.md#Story-19A.4 - Status Push Notifications requirements]
- [Source: docs/epics/epic-list.md#Epic-41 - Full notifications infrastructure (future)]
- [Pattern: apps/web/src/hooks/useFamilyStatus.ts - Status calculation, THRESHOLDS]
- [Pattern: apps/functions/src/triggers/ - Firestore trigger patterns]
- [Firebase FCM Documentation: https://firebase.google.com/docs/cloud-messaging]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 7 tasks completed with 115 tests passing
- Backend notification infrastructure created in apps/functions/src/lib/notifications/
- Web FCM token registration hook created with full test coverage
- Firestore trigger for device status changes integrated
- Throttling system implemented with 1-hour cooldown (urgent notifications bypass)
- Token cleanup on send failure implemented

### File List

**Created:**

- apps/web/src/hooks/usePushNotifications.ts - FCM token registration hook
- apps/web/src/hooks/usePushNotifications.test.ts - 12 tests
- apps/web/public/firebase-messaging-sw.js - Service worker for background notifications
- apps/functions/src/lib/notifications/statusTypes.ts - Type definitions and constants
- apps/functions/src/lib/notifications/statusTypes.test.ts - 6 tests
- apps/functions/src/lib/notifications/buildStatusNotification.ts - Content builder
- apps/functions/src/lib/notifications/buildStatusNotification.test.ts - 15 tests
- apps/functions/src/lib/notifications/notificationThrottle.ts - Throttle logic
- apps/functions/src/lib/notifications/notificationThrottle.test.ts - 10 tests
- apps/functions/src/lib/notifications/sendStatusNotification.ts - Send function
- apps/functions/src/lib/notifications/sendStatusNotification.test.ts - 17 tests
- apps/functions/src/triggers/onDeviceStatusChange.ts - Firestore trigger
- apps/functions/src/triggers/onDeviceStatusChange.test.ts - 13 tests

**Modified:**

- apps/functions/src/index.ts - Added export for onDeviceStatusChange trigger
- apps/functions/src/lib/notifications/index.ts - Added status notification exports
- apps/web/src/app/dashboard/page.tsx - Integrated push notification hook
