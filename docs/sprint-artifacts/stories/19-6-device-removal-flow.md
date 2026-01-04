# Story 19.6: Device Removal Flow

## Status: done

## Story

As a **parent**,
I want **to remove a device from monitoring**,
So that **we can stop monitoring when appropriate (FR14)**.

## Acceptance Criteria

1. **AC1: Confirmation Dialog**
   - Given parent views device in dashboard
   - When parent clicks "Remove Device"
   - Then confirmation dialog explains consequences
   - And dialog warns that device will need re-enrollment to resume monitoring

2. **AC2: Device Removal from Family**
   - Given confirmation is accepted
   - When removal is processed
   - Then device is removed from family (soft delete - status = 'unenrolled')
   - And device document retains audit trail data

3. **AC3: Extension/App Notification**
   - Given device is removed
   - When device-side extension/app is online
   - Then extension/app is notified and disables itself
   - And extension shows "Device no longer monitored" indicator

4. **AC4: Screenshot Retention**
   - Given device is removed
   - When removal is processed
   - Then existing screenshots are retained per retention policy
   - And screenshots remain accessible until retention expires

5. **AC5: Audit Logging**
   - Given device is removed
   - When removal is processed
   - Then removal is logged in activity audit
   - And log includes: device info, who removed it, timestamp

6. **AC6: Child Notification**
   - Given device is removed
   - When removal is processed
   - Then child is notified "Device removed from fledgely"
   - And notification is delivered via FCM push

## Tasks / Subtasks

### Task 1: Add Child Notification to removeDevice Callable (AC: #6)

**Files:**

- `apps/functions/src/callable/enrollment.ts` (modify)
- `apps/functions/src/callable/enrollment.test.ts` (modify)

**Implementation:**

1.1 Import child notification delivery functions:

```typescript
import { deliverNotificationToChild } from '../lib/notifications/childNotificationDelivery'
```

1.2 After marking device as unenrolled, send child notification:

```typescript
// Get child ID from device
if (deviceData.childId) {
  await deliverNotificationToChild({
    childId: deviceData.childId,
    familyId,
    notificationType: 'device_removed',
    content: {
      title: 'Device Removed',
      body: 'Device removed from fledgely',
      data: {
        deviceId,
        deviceName: deviceData.name || deviceId,
      },
    },
  })
}
```

1.3 Add tests for child notification on removal

### Task 2: Add DEVICE_REMOVED Notification Type (AC: #6)

**Files:**

- `packages/shared/src/contracts/childNotificationPreferences.ts` (modify)
- `packages/shared/src/contracts/childNotificationPreferences.test.ts` (modify)
- `packages/shared/src/contracts/index.ts` (verify export)

**Implementation:**

2.1 Add DEVICE_REMOVED to CHILD_NOTIFICATION_TYPES:

```typescript
export const CHILD_NOTIFICATION_TYPES = {
  TIME_LIMIT_WARNING: 'time_limit_warning',
  AGREEMENT_CHANGE: 'agreement_change',
  TRUST_SCORE_CHANGE: 'trust_score_change',
  WEEKLY_SUMMARY: 'weekly_summary',
  DEVICE_REMOVED: 'device_removed', // NEW - Story 19.6
} as const
```

2.2 Add to REQUIRED_CHILD_NOTIFICATION_TYPES (cannot be disabled):

```typescript
export const REQUIRED_CHILD_NOTIFICATION_TYPES = [
  CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING,
  CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE,
  CHILD_NOTIFICATION_TYPES.DEVICE_REMOVED, // NEW - always notify child
] as const
```

2.3 Update ChildNotificationPreferenceType union

2.4 Add tests for new notification type

### Task 3: Update Child Notification Delivery (AC: #6)

**Files:**

- `apps/functions/src/lib/notifications/childNotificationDelivery.ts` (modify)
- `apps/functions/src/lib/notifications/childNotificationDelivery.test.ts` (modify)

**Implementation:**

3.1 Add sendDeviceRemovedToChild function:

```typescript
export async function sendDeviceRemovedToChild(
  childId: string,
  familyId: string,
  deviceName: string
): Promise<ChildDeliveryResult> {
  return deliverNotificationToChild(childId, familyId, {
    notificationType: 'device_removed',
    content: {
      title: 'Device Removed',
      body: `${deviceName} removed from fledgely`,
      data: { deviceName },
    },
  })
}
```

3.2 Ensure device_removed bypasses quiet hours (it's required)

3.3 Add unit tests

### Task 4: Enhance Extension Unenrollment Handling (AC: #3)

**Files:**

- `apps/extension/src/enrollment-service.ts` (modify)
- `apps/extension/src/background.ts` (verify)

**Implementation:**

4.1 Ensure extension checks enrollment status periodically (already exists)

4.2 When `verifyDeviceEnrollment` returns status 'revoked' or 'not_found':

- Clear local enrollment data
- Update monitoring indicator to "Device no longer monitored"
- Stop capture service
- Show neutral message (not alerting)

  4.3 The extension already handles this via `chrome.runtime.onSuspend` from Story 19.5

### Task 5: Verify Confirmation Dialog Content (AC: #1)

**Files:**

- `apps/web/src/components/devices/DevicesList.tsx` (verify existing)

**Implementation:**

5.1 Review existing RemoveConfirmModal component
5.2 Ensure confirmation text explains:

- Device will be removed from monitoring
- Re-enrollment required to resume
- Screenshots retained per policy

  5.3 Already implemented in Story 12.6 - verify content is sufficient

### Task 6: Add Integration Tests (AC: all)

**Files:**

- `apps/functions/src/callable/enrollment.test.ts` (modify)

**Implementation:**

6.1 Test removeDevice sends child notification
6.2 Test removal creates audit log
6.3 Test removal updates device status to 'unenrolled'
6.4 Test child without assigned device doesn't get notification
6.5 Minimum 5 new tests

## Dev Notes

### Existing Infrastructure

**RemoveDevice Callable (enrollment.ts:856-913):**

- Already marks device as 'unenrolled' (soft delete)
- Already creates audit log entry
- Already verifies parent permission
- Needs: Child notification

**Child Notification Delivery (childNotificationDelivery.ts):**

- From Story 41.7 - complete child notification system
- Supports quiet hours bypass for required notifications
- Uses FCM for push delivery
- Has audit logging built in

**Extension Enrollment Service:**

- `verifyDeviceEnrollment` endpoint returns status
- Extension checks on startup and periodically
- Story 19.5 added `chrome.runtime.onSuspend` for final sync

### Firestore Paths

- Device: `families/{familyId}/devices/{deviceId}`
- Audit log: `auditLogs/{autoId}`
- Child FCM tokens: `families/{familyId}/children/{childId}` → `fcmTokens` array

### API Patterns

**Existing removeDevice signature:**

```typescript
export const removeDevice = onCall<
  { familyId: string; deviceId: string },
  Promise<{ success: boolean; message: string }>
>
```

### What's Already Done vs What's Needed

| Requirement                 | Already Done          | Needs Implementation          |
| --------------------------- | --------------------- | ----------------------------- |
| Confirmation dialog         | ✅ Story 12.6         | Verify content                |
| Soft delete to 'unenrolled' | ✅ Story 12.6         | -                             |
| Audit logging               | ✅ Story 12.6         | -                             |
| Screenshot retention        | ✅ By default         | -                             |
| Extension notification      | ✅ Story 19.5 partial | Verify status handling        |
| **Child notification**      | ❌                    | **NEW - Add to removeDevice** |

### Key Integration Point

The main work is adding child notification to the removeDevice callable:

```typescript
// In removeDevice callable, after marking device as unenrolled:
if (deviceData.childId) {
  try {
    await sendDeviceRemovedToChild(
      deviceData.childId,
      familyId,
      deviceData.name || `Device ${deviceId.slice(0, 8)}`
    )
    logger.info('Child notified of device removal', { childId: deviceData.childId, deviceId })
  } catch (error) {
    // Don't fail removal if notification fails
    logger.warn('Failed to notify child of device removal', { error, childId: deviceData.childId })
  }
}
```

### Security Considerations

- Child notification uses FCM tokens stored in child document
- Only guardians can call removeDevice (permission check exists)
- Audit trail captures all removals
- Child notification is neutral ("removed from fledgely") - no accusatory language

### Previous Story Intelligence

**From Story 19.5 (Monitoring Disabled Alert):**

- MonitoringDisabledBanner component exists for unenrolled devices
- MonitoringAlertDetailModal shows removal option
- Extension sends final status update on suspend

**From Story 41.7 (Child Notification Preferences):**

- Complete child notification delivery system
- Required vs optional notification types
- Quiet hours bypass for required notifications
- Uses same FCM multicast pattern as parent notifications

### Edge Cases

1. **Device has no childId:** Skip child notification (unassigned device)
2. **Child has no FCM tokens:** Log warning, don't fail removal
3. **Multiple devices for same child:** Each removal sends notification
4. **Notification fails:** Log warning, removal still succeeds

### Testing Strategy

1. Unit tests for new notification type in shared package
2. Unit tests for sendDeviceRemovedToChild function
3. Integration tests for removeDevice callable with child notification
4. Manual test: verify notification appears on child's device

### References

- [Source: docs/epics/epic-list.md#Story-19.6 - Device Removal Flow]
- [Pattern: apps/functions/src/callable/enrollment.ts:856-913 - Existing removeDevice]
- [Pattern: apps/functions/src/lib/notifications/childNotificationDelivery.ts - Child notification]
- [Pattern: apps/functions/src/lib/notifications/sendChildFlagNotification.ts - Similar child notification]
- [Existing: apps/web/src/components/devices/DevicesList.tsx:818-845 - RemoveConfirmModal]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None

### Completion Notes List

- Tasks 1-3: Implemented child notification for device removal (AC6)
- Tasks 4-5: Verified extension handles unenrollment, dialog content sufficient
- Task 6: Added 5 integration tests with proper mock for sendDeviceRemovedToChild
- All tests pass: 59 shared, 21 notification delivery, 86 enrollment

### File List

- `packages/shared/src/contracts/childNotificationPreferences.ts` - Added DEVICE_REMOVED type
- `packages/shared/src/contracts/childNotificationPreferences.test.ts` - Added 3 tests for DEVICE_REMOVED
- `apps/functions/src/callable/enrollment.ts` - Added child notification to removeDevice
- `apps/functions/src/callable/enrollment.test.ts` - Added 5 tests for child notification with mock
- `apps/functions/src/lib/notifications/childNotificationDelivery.ts` - Added sendDeviceRemovedToChild
- `apps/functions/src/lib/notifications/childNotificationDelivery.test.ts` - Added 3 tests for sendDeviceRemovedToChild
- `apps/functions/src/lib/notifications/index.ts` - Added export for sendDeviceRemovedToChild
