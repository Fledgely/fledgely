# Story 19.2: Device Status Indicators

Status: done

## Story

As a **parent**,
I want **visual indicators showing each device's status**,
So that **I can quickly identify problems**.

## Acceptance Criteria

1. **AC1: Colored status indicator**
   - Given devices are listed in dashboard
   - When viewing device status
   - Then each device shows colored status indicator dot/badge

2. **AC2: Green = Active and syncing**
   - Given device has synced within last hour
   - When viewing device status
   - Then status indicator is green with "Active" label

3. **AC3: Yellow = Warning (not synced in 1-24 hours)**
   - Given device has not synced in last 1-24 hours
   - When viewing device status
   - Then status indicator is yellow/amber with "Warning" label

4. **AC4: Red = Critical (24+ hours or monitoring disabled)**
   - Given device has not synced in 24+ hours OR monitoring is disabled
   - When viewing device status
   - Then status indicator is red with "Critical" or "Disabled" label

5. **AC5: Gray = Offline/Removed**
   - Given device is offline or has been removed
   - When viewing device status
   - Then status indicator is gray with "Offline" label

6. **AC6: Status tooltip with last sync**
   - Given device has status indicator
   - When hovering over status indicator
   - Then tooltip shows last sync timestamp

7. **AC7: Click for health details**
   - Given device has status indicator
   - When clicking status indicator
   - Then detailed health breakdown panel opens
   - (Note: Full health panel is Story 19.4, this AC just needs the click handler wired)

## Tasks / Subtasks

- [x] Task 1: Create Status Calculation Utility (AC: #1-5)
  - [x] 1.1 Create `getDeviceHealthStatus` function in DevicesList.tsx
  - [x] 1.2 Calculate status from `device.lastSeen` timestamp
  - [x] 1.3 Return status: 'active' | 'warning' | 'critical' | 'offline'
  - [x] 1.4 Handle edge case: device.status === 'unenrolled' → 'offline'
  - [x] 1.5 Add configurable thresholds (1 hour warning, 24 hour critical)

- [x] Task 2: Update StatusBadge Component (AC: #1-5)
  - [x] 2.1 Replace existing StatusBadge with enhanced version
  - [x] 2.2 Add colored dot indicator before text
  - [x] 2.3 Use health status for color: green/yellow/red/gray
  - [x] 2.4 Update label text: Active/Warning/Critical/Offline
  - [x] 2.5 Add aria-label for accessibility

- [x] Task 3: Add Tooltip with Last Sync (AC: #6)
  - [x] 3.1 Wrap StatusBadge in tooltip container
  - [x] 3.2 Display last sync as formatted timestamp on hover
  - [x] 3.3 Use existing `formatLastSeen` utility for relative time
  - [x] 3.4 Show exact timestamp (e.g., "Dec 29, 2025 3:45 PM")
  - [x] 3.5 Style tooltip with consistent design

- [x] Task 4: Add Click Handler for Health Details (AC: #7)
  - [x] 4.1 Make StatusBadge clickable (button or link)
  - [x] 4.2 Add onClick prop to StatusBadge
  - [x] 4.3 Wire to state setter for future health panel modal
  - [x] 4.4 Add visual feedback for clickability (cursor, hover state)

- [x] Task 5: Add Unit Tests (AC: #1-7)
  - [x] 5.1 Test getDeviceHealthStatus utility function
  - [x] 5.2 Test status colors for each threshold
  - [x] 5.3 Test tooltip presence on hover
  - [x] 5.4 Test click handler called
  - [x] 5.5 Minimum 10 tests (19 tests added)

## Dev Notes

### Implementation Strategy

Story 19.2 enhances the existing `StatusBadge` component to calculate health status based on `lastSeen` timestamp rather than just using the stored `device.status` field. The existing StatusBadge already shows Active/Offline/Unenrolled based on `device.status`, but Story 19.2 requires calculating this dynamically based on sync timing.

### Existing Code to Modify

**Primary file:** `apps/web/src/components/devices/DevicesList.tsx`

The current StatusBadge component at line ~516:

```typescript
function StatusBadge({ status }: { status: Device['status'] }) {
  const statusStyles = {
    ...styles.statusBadge.base,
    ...styles.statusBadge[status],
  }

  const labels = {
    active: 'Active',
    offline: 'Offline',
    unenrolled: 'Unenrolled',
  }

  return <span style={statusStyles}>{labels[status]}</span>
}
```

### New Status Calculation Logic

```typescript
type HealthStatus = 'active' | 'warning' | 'critical' | 'offline'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function getDeviceHealthStatus(device: Device): HealthStatus {
  // Unenrolled devices are always offline
  if (device.status === 'unenrolled') return 'offline'

  // Offline status from device takes precedence
  if (device.status === 'offline') return 'offline'

  const now = Date.now()
  const lastSeenMs = device.lastSeen.getTime()
  const timeSinceSync = now - lastSeenMs

  if (timeSinceSync < HOUR_MS) return 'active' // Green: < 1 hour
  if (timeSinceSync < DAY_MS) return 'warning' // Yellow: 1-24 hours
  return 'critical' // Red: 24+ hours
}
```

### Updated StatusBadge Styling

```typescript
const styles = {
  statusBadge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 500,
      cursor: 'pointer',
      gap: '6px',
    },
    active: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    warning: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },
    critical: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
    offline: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
    },
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusDotActive: { backgroundColor: '#22c55e' },
  statusDotWarning: { backgroundColor: '#f59e0b' },
  statusDotCritical: { backgroundColor: '#ef4444' },
  statusDotOffline: { backgroundColor: '#9ca3af' },
}
```

### Tooltip Implementation

Use a simple CSS-based tooltip (no external library needed):

```typescript
const styles = {
  tooltipContainer: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  tooltip: {
    visibility: 'hidden',
    opacity: 0,
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
    marginBottom: '6px',
    zIndex: 100,
    transition: 'opacity 0.15s, visibility 0.15s',
  },
  tooltipVisible: {
    visibility: 'visible',
    opacity: 1,
  },
}
```

### Data Structure

The Device interface already has `lastSeen: Date` which is what we need:

```typescript
interface Device {
  deviceId: string
  type: 'chromebook' | 'android'
  enrolledAt: Date
  enrolledBy: string
  childId: string | null
  name: string
  lastSeen: Date  // KEY: Used for health calculation
  status: 'active' | 'offline' | 'unenrolled'  // Base status
  metadata: { ... }
}
```

### Helper for Exact Timestamp

```typescript
function formatExactTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
// Returns: "Dec 29, 2025, 3:45 PM"
```

### Edge Cases

1. **Device never synced**: If `lastSeen` is very old (before enrollment), treat as critical
2. **Future timestamp**: If `lastSeen` is in the future (clock skew), treat as active
3. **Status === 'unenrolled'**: Always show as offline regardless of lastSeen
4. **Hover state with keyboard**: Use onFocus/onBlur for keyboard accessibility

### Project Structure Notes

**Files to modify:**

- `apps/web/src/components/devices/DevicesList.tsx` - Update StatusBadge, add health calculation

**Files to update tests:**

- `apps/web/src/components/devices/DevicesList.test.tsx` - Add health status tests

**No new files needed** - extends existing component.

### Previous Story Learnings (19-1)

From Story 19-1 implementation:

1. Use `role="heading"` with `aria-level` for accessibility on headers
2. Export utility functions for testability (`groupDevicesByChild` was exported)
3. Use `aria-hidden="true"` for decorative elements
4. Handle edge cases explicitly (orphaned devices, all unenrolled)
5. 19 tests were added - aim for similar coverage

### References

- [Source: docs/epics/epic-list.md#Story-19.2 - Device Status Indicators]
- [Pattern: apps/web/src/components/devices/DevicesList.tsx:516 - Existing StatusBadge]
- [Pattern: apps/web/src/hooks/useDevices.ts:134 - formatLastSeen utility]
- [Data: apps/web/src/hooks/useDevices.ts:20 - Device interface]
- [Previous: docs/sprint-artifacts/stories/19-1-device-list-view.md - Learnings]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- Implemented `getDeviceHealthStatus` utility function with configurable thresholds (1 hour warning, 24 hour critical)
- Enhanced `StatusBadge` component with colored dot indicator, tooltip on hover, and click handler for future health panel
- Added keyboard accessibility (onFocus/onBlur for tooltip, Enter/Space key handling for click)
- Handled edge cases: future timestamps (clock skew), unenrolled/offline status precedence
- Added 19 unit tests covering all acceptance criteria

### File List

- `apps/web/src/components/devices/DevicesList.tsx` - Added health status calculation, updated StatusBadge with tooltip and click handler
- `apps/web/src/components/devices/DevicesList.test.tsx` - Added 19 new tests for Story 19.2 (getDeviceHealthStatus, StatusBadge, tooltip, click handler)
- `apps/web/src/components/devices/__tests__/DevicesList.test.tsx` - Updated existing test expectations for health status badges
