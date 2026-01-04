# Story 46.4: Offline Timestamp Display

## Status: done

## Story

As **a parent**,
I want **to see when devices were last online**,
So that **I know data freshness (FR89)**.

## Acceptance Criteria

1. **AC1: Last Seen Display**
   - Given device is offline
   - When viewing dashboard
   - Then shows: "Last seen: 3 hours ago"
   - And relative time updates as time passes

2. **AC2: Offline Since Timestamp**
   - Given device is offline
   - When viewing dashboard
   - Then shows: "Offline since: 2:30 PM"
   - And exact timestamp displayed

3. **AC3: Visual Indicators**
   - Given device is offline for varying durations
   - When viewing device status
   - Then yellow indicator for recent offline (<24h)
   - And red indicator for extended offline (≥24h)

4. **AC4: Offline Explanation Tooltip**
   - Given device shows offline status
   - When hovering over status indicator
   - Then tooltip explains: "This device hasn't synced recently. Screenshots captured while offline will upload when it reconnects."
   - And shows last seen time and offline since time

5. **AC5: Syncing State**
   - Given device is actively syncing after being offline
   - When sync in progress
   - Then status shows "Syncing" with animated indicator
   - And reverts to "Active" when complete

6. **AC6: Child Dashboard Parity (Transparency)**
   - Given child views their devices
   - When device is offline
   - Then child sees same offline status as parent
   - And same "Offline since" timestamp

7. **AC7: Extended Offline Notifications (>4h)**
   - Given device offline for extended period
   - When threshold crossed (default 4h)
   - Then parent notified per Story 41-4
   - And notification preferences respected

## Tasks / Subtasks

### Task 1: Add offlineSince Field to Device Model (AC2) [x]

**Files:**

- `apps/web/src/hooks/useDevices.ts` (modify)
- `apps/extension/src/background.ts` (modify)
- `apps/functions/src/triggers/onDeviceHeartbeat.ts` (modify if exists)

**Implementation:**
1.1 Add `offlineSince: Date | null` to Device interface in useDevices.ts
1.2 Parse offlineSince from Firestore device document
1.3 Update extension background.ts to track when device goes offline
1.4 Update device document with offlineSince when transitioning to offline

### Task 2: Create formatOfflineSince Helper (AC2) [x]

**Files:**

- `apps/web/src/hooks/useDevices.ts` (modify)

**Implementation:**
2.1 Create `formatOfflineSince(date: Date | null): string` function
2.2 Format as "X:XX PM" or "X:XX AM" for same-day
2.3 Format as "Mon, 2:30 PM" for different day
2.4 Return empty string if date is null

### Task 3: Add Syncing Status (AC5) [x]

**Files:**

- `apps/web/src/hooks/useDevices.ts` (modify)
- `apps/extension/src/background.ts` (modify)

**Implementation:**
3.1 Add 'syncing' to Device status type: `'active' | 'offline' | 'syncing' | 'unenrolled'`
3.2 Extension sets status to 'syncing' when processScreenshotQueue starts
3.3 Extension sets status to 'active' when queue processing completes
3.4 Add syncing indicator style (blue with pulsing animation)

### Task 4: Enhance Status Tooltip (AC4) [x]

**Files:**

- `apps/web/src/components/devices/DevicesList.tsx` (modify)

**Implementation:**
4.1 Update StatusBadge tooltip content for offline state
4.2 Add explanation text: "This device hasn't synced recently. Screenshots captured while offline will upload when it reconnects."
4.3 Include "Last seen: X ago" and "Offline since: X:XX PM" in tooltip
4.4 Add styling for multi-line tooltip

### Task 5: Update Device Item Display (AC1, AC2, AC3) [x]

**Files:**

- `apps/web/src/components/devices/DevicesList.tsx` (modify)

**Implementation:**
5.1 Display "Offline since: X:XX PM" alongside "Last seen" for offline devices
5.2 Use warning (yellow) color for <24h offline
5.3 Use critical (red) color for ≥24h offline (existing logic)
5.4 Show syncing status with animated indicator

### Task 6: Update Child Device Views (AC6) [x]

**Files:**

- `apps/web/src/components/child/ChildDeviceList.tsx` (modify)
- `apps/web/src/hooks/useChildDevices.ts` (modify)

**Implementation:**
6.1 Add offlineSince to child device interface
6.2 Display same offline status information as parent view
6.3 Ensure child sees "Offline since" timestamp
6.4 Apply same visual indicators (yellow/red)

### Task 7: Verify Notifications Integration (AC7) [x]

**Files:**

- N/A (verification only)

**Implementation:**
7.1 Verify Story 41-4 checkDeviceSyncStatus.ts handles extended offline (>4h)
7.2 Confirm notification preferences respected
7.3 Test notification triggers after 4h threshold

## Dev Notes

### Already Implemented

**From Story 19.2 (Device Status Indicators):**

- `getDeviceHealthStatus(device)` returns 'active' | 'warning' | 'critical' | 'offline'
- Yellow (warning) for 1-24h offline
- Red (critical) for 24+ hours offline
- Status badge with tooltip showing last sync time

**From Story 19.3 (Last Sync Timestamp Display):**

- `formatLastSeen(date)` - Returns "Just now", "X min ago", "X hours ago", "X days ago"
- `isValidDate(date)` - Validates date is not null/NaN/epoch 0
- `formatExactTimestamp(date)` - Returns "Dec 15, 2024, 2:30 PM"

**From Story 41.4 (Device Sync Status Notifications):**

- Scheduled function `checkDeviceSyncStatus` runs every minute
- Sends notifications when device offline exceeds threshold (1h, 4h, 12h, 24h)
- Default threshold is 4h
- Already implemented and complete

### New Implementation Required

1. **offlineSince Timestamp:**
   - Track when device transitions from online → offline
   - Store in Firestore: `families/{familyId}/devices/{deviceId}/offlineSince`
   - Update via extension heartbeat or scheduled function

2. **Syncing State:**
   - New status value for when queue is being processed
   - Extension sets this during processScreenshotQueue()
   - Dashboard shows pulsing/animated indicator

3. **formatOfflineSince Helper:**

```typescript
export function formatOfflineSince(date: Date | null): string {
  if (!date || !isValidDate(date)) return ''

  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  const timeStr = date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (isToday) {
    return timeStr // "2:30 PM"
  }

  const dayStr = date.toLocaleString('en-US', { weekday: 'short' })
  return `${dayStr}, ${timeStr}` // "Mon, 2:30 PM"
}
```

### Device Interface Updates

```typescript
// In useDevices.ts - extend Device interface
export interface Device {
  // ... existing fields ...
  status: 'active' | 'offline' | 'syncing' | 'unenrolled'
  offlineSince: Date | null // NEW: When device went offline
}
```

### Extension Changes

```typescript
// In background.ts - track offline transition
onNetworkStatusChange(async (online) => {
  if (online) {
    // Clear offlineSince when coming online
    await updateDeviceStatus({ status: 'syncing', offlineSince: null })
    // ... process queue ...
    await updateDeviceStatus({ status: 'active' })
  } else {
    // Set offlineSince when going offline
    await updateDeviceStatus({ status: 'offline', offlineSince: serverTimestamp() })
  }
})
```

### Testing Considerations

- Test formatOfflineSince with same-day vs different-day dates
- Test syncing state transitions
- Test tooltip content updates for different offline durations
- Test child dashboard parity with parent dashboard
- Mock date/time for consistent test results

### Project Structure Notes

- Web dashboard: `apps/web/src/`
- Extension source: `apps/extension/src/`
- Shared types: `packages/shared/src/`
- Build command: `yarn build`
- Test with: `yarn test`

### References

- [Source: apps/web/src/hooks/useDevices.ts] - Device interface, formatLastSeen
- [Source: apps/web/src/components/devices/DevicesList.tsx] - StatusBadge, getDeviceHealthStatus
- [Source: apps/extension/src/background.ts] - Network status handling
- [Source: docs/sprint-artifacts/stories/41-4-device-sync-status-notifications.md] - Extended offline notifications
- [Source: docs/epics/epic-list.md#story-464] - Story requirements

## Dev Agent Record

### Context Reference

Epic 46: Offline Operation Foundation

- FR89: Data freshness visibility
- Story 46-3: Automatic sync on reconnect (prerequisite)
- Story 41-4: Device sync status notifications (handles >4h notifications)

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A

### Completion Notes List

- All 7 tasks completed successfully
- 767 extension tests passing (including network-status, battery-status, event-logger tests)
- 19 web hook tests passing (formatLastSeen, formatOfflineSince, isValidDate)
- Added offlineSince field to Device interface in useDevices.ts and useChildDevices.ts
- Created formatOfflineSince helper for "Offline since: X:XX PM" display format
- Added 'syncing' status to Device status type throughout codebase
- Enhanced StatusBadge tooltip with offline explanation and offlineSince display
- Updated DevicesList to show "Offline since" in device meta info
- Updated ChildDeviceList for AC6 transparency - child sees same offline status as parent
- Added syncing state tracking in network-status module (setSyncingState, getNetworkStatusString)
- Cloud Function health.ts updated to track offlineSince and set device status based on networkStatus
- AC7 verified: Story 41-4 already implements extended offline notifications (>4h)

### Code Review Fixes (2026-01-04)

1. Added tests for syncing functions (network-status.test.ts) - 11 new tests for isSyncing, setSyncingState, getNetworkStatusString
2. Updated DeviceHealthMetrics interface to include 'syncing' in networkStatus type
3. Added @keyframes pulse animation for syncing status dots in DevicesList and ChildDeviceList
4. Added unit tests for formatOfflineSince helper (useDevices.test.ts) - 19 tests for helper functions

### File List

**Modified Files:**

- `apps/web/src/hooks/useDevices.ts` - Added offlineSince field, formatOfflineSince helper, syncing status, updated DeviceHealthMetrics interface
- `apps/web/src/hooks/useChildDevices.ts` - Added offlineSince field parsing
- `apps/web/src/components/devices/DevicesList.tsx` - Added syncing status, enhanced tooltip, offline since display, pulse animation keyframes
- `apps/web/src/components/child/ChildDeviceList.tsx` - Added syncing status, offline since display for AC6, pulse animation keyframes
- `apps/extension/src/network-status.ts` - Added syncing state tracking (setSyncingState, getNetworkStatusString)
- `apps/extension/src/network-status.test.ts` - Added tests for syncing state functions
- `apps/extension/src/health-metrics.ts` - Updated to use getNetworkStatusString with syncing support
- `apps/extension/src/background.ts` - Added setSyncingState calls in processScreenshotQueue
- `apps/functions/src/http/sync/health.ts` - Added offlineSince tracking and status mapping

**New Files:**

- `apps/web/src/hooks/useDevices.test.ts` - Unit tests for formatLastSeen, formatOfflineSince, isValidDate helpers

## Change Log

| Date       | Change                                                     |
| ---------- | ---------------------------------------------------------- |
| 2026-01-04 | Story created (ready-for-dev)                              |
| 2026-01-04 | Implementation completed, 756 tests passing                |
| 2026-01-04 | Code review fixes: tests, interface, animation - 767 tests |
