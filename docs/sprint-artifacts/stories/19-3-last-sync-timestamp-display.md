# Story 19.3: Last Sync Timestamp Display

Status: done

## Story

As a **parent**,
I want **to see when each device last synced**,
So that **I know how fresh the data is**.

## Acceptance Criteria

1. **AC1: Relative time display**
   - Given device is displayed in dashboard
   - When viewing device details
   - Then last sync shows as relative time ("2 minutes ago", "3 hours ago")
   - (Note: Already implemented in Story 19-2 - verify and test)

2. **AC2: Exact timestamp on hover**
   - Given device shows relative sync time
   - When hovering over sync time
   - Then tooltip shows exact timestamp (e.g., "Dec 29, 2025, 3:45 PM")
   - (Note: Already implemented in Story 19-2 - verify and test)

3. **AC3: Automatic updates**
   - Given device list is displayed
   - When time passes or device syncs
   - Then sync time updates automatically (no page refresh needed)
   - (Note: Already done via useDevices real-time hook - add visual test)

4. **AC4: Never synced display**
   - Given a device that has never synced (lastSeen is null or invalid)
   - When viewing device status
   - Then "Never synced" is displayed instead of relative time
   - And health status is shown as Critical

5. **AC5: Last screenshot timestamp**
   - Given device has captured screenshots
   - When viewing device details
   - Then last screenshot timestamp is displayed separately from sync time
   - And shows "No screenshots yet" if none captured

6. **AC6: Warning icon for delayed sync**
   - Given device sync is significantly delayed (warning or critical status)
   - When viewing device in list
   - Then a warning/alert icon is displayed alongside the status
   - (Note: Partially covered by colored status badge from 19-2, may need additional icon)

## Tasks / Subtasks

- [x] Task 1: Handle "Never Synced" Edge Case (AC: #4)
  - [x] 1.1 Update `formatLastSeen` to handle null/undefined dates
  - [x] 1.2 Update `getDeviceHealthStatus` to return 'critical' for never-synced devices
  - [x] 1.3 Display "Never synced" text in device metadata row
  - [x] 1.4 Update StatusBadge tooltip to handle never-synced state

- [x] Task 2: Add Last Screenshot Timestamp (AC: #5)
  - [x] 2.1 Add `lastScreenshotAt` field to Device interface (if not present)
  - [x] 2.2 Update useDevices hook to include lastScreenshotAt from Firestore
  - [x] 2.3 Add screenshot timestamp display in device metadata row
  - [x] 2.4 Show "No screenshots yet" if lastScreenshotAt is null
  - [x] 2.5 Format using existing formatLastSeen utility

- [x] Task 3: Add Warning Icon for Delayed Sync (AC: #6)
  - [x] 3.1 Add warning icon (⚠️) next to StatusBadge for warning/critical status
  - [x] 3.2 Style icon consistently with status colors
  - [x] 3.3 Add aria-label for accessibility

- [x] Task 4: Verify Existing Functionality (AC: #1, #2, #3)
  - [x] 4.1 Add tests verifying relative time display
  - [x] 4.2 Add tests verifying hover tooltip with exact timestamp
  - [x] 4.3 Document that real-time updates are handled by useDevices hook

- [x] Task 5: Add Unit Tests (AC: #4, #5, #6)
  - [x] 5.1 Test "Never synced" display for null lastSeen
  - [x] 5.2 Test last screenshot timestamp display
  - [x] 5.3 Test "No screenshots yet" display
  - [x] 5.4 Test warning icon visibility for warning/critical status
  - [x] 5.5 Minimum 8 new tests

## Dev Notes

### Implementation Strategy

Story 19-3 builds on Story 19-2's StatusBadge enhancements. Most of the core functionality (relative time, tooltip, real-time updates) is already implemented. The key new requirements are:

1. Handle "never synced" edge case
2. Add last screenshot timestamp display
3. Add visual warning icon for delayed sync

### Existing Code to Extend

**Primary file:** `apps/web/src/components/devices/DevicesList.tsx`

Story 19-2 already implemented:

- `getDeviceHealthStatus()` - health status calculation (line ~593)
- `formatExactTimestamp()` - exact date formatting (line ~617)
- `StatusBadge` component with tooltip showing last sync (line ~639)
- `formatLastSeen` from useDevices hook (relative time)

**Device metadata display** (line ~1106-1108):

```typescript
<div style={styles.deviceMeta}>
  {device.type === 'chromebook' ? 'Chromebook' : 'Android'} &middot; Last seen{' '}
  {formatLastSeen(device.lastSeen)}
</div>
```

### Never Synced Handling

Update formatLastSeen or create wrapper:

```typescript
function formatSyncTime(lastSeen: Date | null): string {
  if (!lastSeen || lastSeen.getTime() === 0) {
    return 'Never synced'
  }
  return formatLastSeen(lastSeen)
}
```

Update getDeviceHealthStatus:

```typescript
export function getDeviceHealthStatus(device: Device): HealthStatus {
  if (device.status === 'unenrolled') return 'offline'
  if (device.status === 'offline') return 'offline'

  // Handle never synced - treat as critical
  if (!device.lastSeen || device.lastSeen.getTime() === 0) {
    return 'critical'
  }

  // ... existing logic
}
```

### Last Screenshot Timestamp

**Device interface update** (in useDevices.ts):

```typescript
interface Device {
  // ... existing fields
  lastScreenshotAt: Date | null // NEW: Track last screenshot capture
}
```

**Display in device metadata:**

```typescript
<div style={styles.deviceMeta}>
  {device.type === 'chromebook' ? 'Chromebook' : 'Android'}
  &middot; Last seen {formatSyncTime(device.lastSeen)}
  &middot; Last screenshot {device.lastScreenshotAt
    ? formatLastSeen(device.lastScreenshotAt)
    : 'No screenshots yet'}
</div>
```

### Warning Icon Implementation

Add next to StatusBadge in renderDeviceItem:

```typescript
{(healthStatus === 'warning' || healthStatus === 'critical') && (
  <span
    style={{ marginLeft: '4px', fontSize: '14px' }}
    aria-label={`Device has ${healthStatus} status`}
  >
    ⚠️
  </span>
)}
```

Or integrate into StatusBadge component itself for cleaner approach.

### Data Dependencies

**Firestore schema check needed:**

- Verify `lastScreenshotAt` field exists in device documents
- If not present, add during screenshot upload (story 18.2)
- Handle null gracefully in UI

### Previous Story Learnings (19-2)

From Story 19-2 implementation:

1. Use State for tooltip visibility (showTooltip useState)
2. Use onFocus/onBlur alongside mouseEnter/mouseLeave for accessibility
3. Export utility functions for testability
4. Handle edge cases: future timestamps, offline precedence

### Project Structure Notes

**Files to modify:**

- `apps/web/src/components/devices/DevicesList.tsx` - Add warning icon, never-synced handling
- `apps/web/src/hooks/useDevices.ts` - Add lastScreenshotAt to Device interface and query

**Files to update tests:**

- `apps/web/src/components/devices/DevicesList.test.tsx` - Add new test cases

### References

- [Source: docs/epics/epic-list.md#Story-19.3 - Last Sync Timestamp Display]
- [Pattern: apps/web/src/components/devices/DevicesList.tsx - StatusBadge implementation]
- [Pattern: apps/web/src/hooks/useDevices.ts - formatLastSeen utility]
- [Previous: docs/sprint-artifacts/stories/19-2-device-status-indicators.md - Status badge with tooltip]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

1. Implemented `isValidDate()` helper in useDevices.ts to handle null, undefined, epoch 0, and NaN dates
2. Updated `formatLastSeen()` to use isValidDate and return "Never synced" for invalid dates
3. Updated `getDeviceHealthStatus()` to return 'critical' for never-synced devices
4. Added `lastScreenshotAt` field to Device interface and Firestore query
5. Added screenshot timestamp display in device metadata row with "No screenshots yet" fallback
6. Added warning icon (⚠️) for devices with warning/critical status with proper aria-label
7. Updated StatusBadge tooltip to conditionally show exact timestamp only for valid dates
8. Added 8 new unit tests covering all Story 19-3 acceptance criteria

### File List

- `apps/web/src/hooks/useDevices.ts` - Added lastScreenshotAt field, isValidDate helper, updated formatLastSeen
- `apps/web/src/components/devices/DevicesList.tsx` - Added screenshot display, warning icon, updated tooltip
- `apps/web/src/components/devices/DevicesList.test.tsx` - Added 8 Story 19-3 unit tests, added isValidDate mock
- `apps/web/src/components/devices/__tests__/DevicesList.test.tsx` - Updated mocks for lastScreenshotAt and isValidDate
