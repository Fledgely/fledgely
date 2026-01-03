# Story 41.4: Device Sync Status Notifications

## Status: done

## Story

As a **parent**,
I want **to be notified about device sync issues**,
So that **I know when monitoring might be interrupted (FR46)**.

## Acceptance Criteria

1. **AC1: Sync Threshold Notification**
   - Given device experiences sync issues
   - When device hasn't synced in configured threshold
   - Then notification: "{deviceName} hasn't synced in {hours} hours"
   - And includes device name and last seen time
   - And includes troubleshooting link

2. **AC2: Configurable Thresholds**
   - Given parent in notification settings
   - When configuring device sync threshold
   - Then options: 1h, 4h, 12h, 24h (default 4h)
   - And threshold stored in notification preferences
   - And applied per-device or family-wide

3. **AC3: No Spam Protection**
   - Given sync threshold exceeded
   - When notification would be sent
   - Then only one notification per device per threshold crossing
   - And no repeat until device syncs and goes offline again
   - And record threshold crossing in Firestore

4. **AC4: Sync Recovery Notification (Optional)**
   - Given device previously notified as offline
   - When device syncs again
   - Then optionally notify: "{deviceName} is back online"
   - And clear offline status
   - And configurable: can disable recovery notifications

5. **AC5: Permission Revoked Alert**
   - Given device has permissions revoked (critical issue)
   - When extension permissions change detected
   - Then more urgent notification: "{deviceName} extension permissions changed"
   - And include "Check permissions" action
   - And this notification bypasses quiet hours (action required)

6. **AC6: NFR78 Compliance**
   - Given device crosses sync threshold
   - When checking device status
   - Then notification sent within 30 seconds of threshold
   - And scheduled function runs every minute
   - And efficient batch processing

## Tasks / Subtasks

### Task 1: Create Device Sync Notification Schemas (AC: #1, #2, #5) [x]

Define schemas for device sync notifications.

**Files:**

- `packages/shared/src/contracts/deviceSyncNotifications.ts` (new)
- `packages/shared/src/contracts/deviceSyncNotifications.test.ts` (new)

**Implementation:**

- Create `syncThresholdSchema`: 1 | 4 | 12 | 24 (hours)
- Create `deviceSyncNotificationEventSchema`:
  - `id: string`
  - `type: 'sync_timeout' | 'permission_revoked' | 'sync_restored'`
  - `deviceId: string`
  - `deviceName: string`
  - `familyId: string`
  - `childId: string`
  - `lastSyncAt: number`
  - `thresholdHours: number`
  - `createdAt: number`
- Create `deviceSyncNotificationContentSchema`:
  - `title: string`
  - `body: string`
  - `data: { type, deviceId, familyId, action }`
- Create helper functions: `buildSyncTimeoutContent`, `buildPermissionRevokedContent`, `buildSyncRestoredContent`
- Export from contracts index

**Tests:** ~15 tests for schema validation and content builders

### Task 2: Create Device Sync Notification Service (AC: #1, #3, #5) [x]

Service to send device sync notifications.

**Files:**

- `apps/functions/src/lib/notifications/deviceSyncNotification.ts` (new)
- `apps/functions/src/lib/notifications/deviceSyncNotification.test.ts` (new)

**Implementation:**

- Create `sendDeviceSyncTimeoutNotification(params)`:
  - Check parent preferences (deviceSyncAlertsEnabled)
  - Check quiet hours (non-critical, can be delayed)
  - Check if already notified for this threshold crossing
  - Build notification with device name and hours offline
  - Deep link to device management
- Create `sendPermissionRevokedNotification(params)`:
  - BYPASSES quiet hours (critical, action required)
  - High priority notification
  - Include "Check permissions" action
- Create `sendSyncRestoredNotification(params)`:
  - Only if recovery notifications enabled
  - Check if device was previously marked offline
  - Clear offline status
- Create `hasAlreadyNotifiedForThreshold(deviceId, threshold)`:
  - Check Firestore for existing notification record
  - Prevent duplicate notifications

**Tests:** ~18 tests for all notification types and dedup

### Task 3: Create Scheduled Device Sync Checker (AC: #3, #6) [x]

Scheduled function to check device sync status.

**Files:**

- `apps/functions/src/scheduled/checkDeviceSyncStatus.ts` (new)
- `apps/functions/src/scheduled/checkDeviceSyncStatus.test.ts` (new)

**Implementation:**

- Run every minute (for NFR78 compliance)
- Query all devices with `lastSeen` older than their threshold
- Efficient batch query: `collectionGroup('devices').where('lastSeen', '<=', thresholdTime)`
- For each stale device:
  - Get family and parent preferences
  - Check if notification already sent
  - Send notification if needed
  - Record notification sent
- Batch size limit to prevent timeout
- Log metrics: devices checked, notifications sent

**Tests:** ~12 tests for scheduled function

### Task 4: Create Permission Change Trigger (AC: #5) [x]

Firestore trigger for permission changes.

**Files:**

- `apps/functions/src/triggers/onDevicePermissionChange.ts` (new)
- `apps/functions/src/triggers/onDevicePermissionChange.test.ts` (new)

**Implementation:**

- Trigger on `families/{familyId}/devices/{deviceId}` updates
- Watch for `extensionPermissions` field changes
- If permissions reduced:
  - Send immediate permission revoked notification
  - Bypass quiet hours (critical)
  - Include action to check permissions
- If permissions restored:
  - Optionally notify restoration

**Tests:** ~8 tests for trigger

### Task 5: Add Sync Threshold to Notification Preferences (AC: #2) [x]

Update preferences schema for device sync settings.

**Files:**

- `packages/shared/src/contracts/notificationPreferences.ts` (modify)
- `packages/shared/src/contracts/notificationPreferences.test.ts` (modify)
- `apps/functions/src/callable/updateNotificationPreferences.ts` (modify)

**Implementation:**

- Add to `parentNotificationPreferencesSchema`:
  - `deviceSyncAlertsEnabled: boolean` (default true)
  - `deviceSyncThresholdHours: 1 | 4 | 12 | 24` (default 4)
  - `deviceSyncRecoveryEnabled: boolean` (default false)
- Update `NOTIFICATION_DEFAULTS` with new fields
- Update `createDefaultNotificationPreferences` function
- Add validation in update callable

**Tests:** ~8 tests for new preference fields

### Task 6: Update Notification Exports (AC: All) [x]

Export new device sync notification services.

**Files:**

- `apps/functions/src/lib/notifications/index.ts` (modify)
- `apps/functions/src/index.ts` (modify)
- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/index.ts` (modify)

**Implementation:**

- Export deviceSyncNotification functions
- Export deviceSyncNotificationEventSchema
- Register scheduled function in index.ts
- Register trigger function in index.ts

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/shared (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Notifications:** Firebase Cloud Messaging (FCM)
- **Scheduling:** Firebase Scheduled Functions (every 1 minute)

### Architecture Compliance

**From Architecture Document:**

- Scheduled function for periodic sync checking
- Firestore trigger for real-time permission changes
- Per-user preferences checked for EACH guardian

**Key Patterns to Follow:**

- `sendStatusNotification.ts` - FCM sending pattern
- `flagNotificationOrchestrator.ts` - Preference checking pattern
- `sendImmediateFlagNotification.ts` - Quiet hours bypass pattern
- `checkDeviceSync.ts` (if exists) - Device sync checking

### Existing Infrastructure to Leverage

**From Story 41.1 (Notification Preferences):**

- `parentNotificationPreferencesSchema` - Extend with sync settings
- `getNotificationPreferences` callable - Load user preferences
- `isInQuietHours()` helper - Check quiet hours

**From Epic 19A (Family Status):**

- Device `lastSeen` field - Already tracked
- Device health monitoring patterns

**From Story 29 (Chromebook Screen Time):**

- `syncScreenTime` endpoint updates `lastSeen`
- Device enrollment patterns

### Data Model

```typescript
// Device sync notification event
interface DeviceSyncNotificationEvent {
  id: string
  type: 'sync_timeout' | 'permission_revoked' | 'sync_restored'
  deviceId: string
  deviceName: string
  familyId: string
  childId: string
  lastSyncAt: number
  thresholdHours: number
  createdAt: number
}

// Notification tracking (prevent duplicates)
// Path: families/{familyId}/deviceNotifications/{deviceId}
interface DeviceNotificationStatus {
  deviceId: string
  lastSyncTimeoutNotifiedAt?: number
  lastSyncTimeoutThreshold?: number
  lastPermissionRevokedNotifiedAt?: number
  lastSyncRestoredNotifiedAt?: number
  isOffline: boolean
  updatedAt: number
}
```

### File Structure

```
packages/shared/src/contracts/
├── deviceSyncNotifications.ts            # NEW - Event schemas
├── deviceSyncNotifications.test.ts       # NEW
├── notificationPreferences.ts            # MODIFY - Add sync fields
└── index.ts                              # MODIFY - exports

apps/functions/src/lib/notifications/
├── deviceSyncNotification.ts             # NEW - Notification service
├── deviceSyncNotification.test.ts        # NEW
└── index.ts                              # MODIFY - exports

apps/functions/src/scheduled/
├── checkDeviceSyncStatus.ts              # NEW - Scheduled checker
└── checkDeviceSyncStatus.test.ts         # NEW

apps/functions/src/triggers/
├── onDevicePermissionChange.ts           # NEW - Permission trigger
└── onDevicePermissionChange.test.ts      # NEW
```

### Testing Requirements

- Unit test all schemas with edge cases
- Unit test notification services with mocked FCM
- Test preference checking (enabled/disabled states)
- Test quiet hours bypass for permission revoked
- Test deduplication (no spam)
- Test scheduled function with mock devices
- Test trigger function with permission changes
- Integration test end-to-end flow

### NFR References

- FR46: Parent notified when device hasn't synced
- NFR78: Notification within 30 seconds of threshold

### Notification Messages

```typescript
// Sync timeout notification
title: 'Device Sync Issue'
body: "{deviceName} hasn't synced in {hours} hours"

// Permission revoked notification
title: 'Extension Permissions Changed'
body: '{deviceName} extension permissions may have been modified'

// Sync restored notification
title: 'Device Back Online'
body: '{deviceName} is syncing again'
```

### References

- [Source: docs/epics/epic-list.md#Story-41.4]
- [Source: docs/prd/functional-requirements.md#FR46]
- [Source: apps/functions/src/http/sync/screen-time.ts]

## Dev Agent Record

### Context Reference

- Epic: 41 (Notifications & Alerts)
- Story Key: 41-4-device-sync-status-notifications
- Dependencies: Story 41.1 (Notification Preferences Configuration) - COMPLETE
- Dependencies: Story 19A.4 (Status Push Notifications) - Device status patterns

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 6 tasks completed with 73 tests passing
- Schemas created with Zod validation (23 tests)
- Notification service handles sync timeout, permission revoked, and sync restored (20 tests)
- Scheduled function runs every minute for NFR78 compliance (10 tests)
- Permission change trigger sends critical notifications bypassing quiet hours (20 tests)
- Added deviceStatusEnabled and deviceSyncRecoveryEnabled to preferences schema
- Code review fixes: Added deviceSyncRecoveryEnabled check to sendSyncRestoredNotification, fixed threshold preference lookup path, added offline status check before sending recovery notifications

### File List

**New Files:**

- `packages/shared/src/contracts/deviceSyncNotifications.ts` - Event schemas and content builders
- `packages/shared/src/contracts/deviceSyncNotifications.test.ts` - Schema tests (23 tests)
- `apps/functions/src/lib/notifications/deviceSyncNotification.ts` - Notification service
- `apps/functions/src/lib/notifications/deviceSyncNotification.test.ts` - Service tests (20 tests)
- `apps/functions/src/scheduled/checkDeviceSyncStatus.ts` - Scheduled sync checker
- `apps/functions/src/scheduled/checkDeviceSyncStatus.test.ts` - Scheduled tests (10 tests)
- `apps/functions/src/triggers/onDevicePermissionChange.ts` - Permission change trigger
- `apps/functions/src/triggers/onDevicePermissionChange.test.ts` - Trigger tests (20 tests)

**Modified Files:**

- `packages/shared/src/contracts/notificationPreferences.ts` - Added deviceStatusEnabled, deviceSyncRecoveryEnabled fields
- `packages/shared/src/contracts/index.ts` - Added deviceSyncNotifications exports
- `packages/shared/src/index.ts` - Added deviceSyncNotifications exports
- `apps/functions/src/lib/notifications/index.ts` - Added deviceSyncNotification exports
- `apps/functions/src/scheduled/index.ts` - Added checkDeviceSyncStatus export
- `apps/functions/src/index.ts` - Registered scheduled function and trigger
- `apps/functions/src/callable/getNotificationPreferences.ts` - Added new preference fields
- `apps/functions/src/callable/updateNotificationPreferences.ts` - Added new preference fields

## Change Log

| Date       | Change                                      |
| ---------- | ------------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)               |
| 2026-01-03 | Implementation completed, all tests passing |
| 2026-01-03 | Code review fixes applied, status: done     |
