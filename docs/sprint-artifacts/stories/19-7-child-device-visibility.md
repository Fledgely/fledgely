# Story 19.7: Child Device Visibility

## Status: done

## Story

As a **child**,
I want **to see which of my devices are monitored**,
So that **I always know what's being tracked (FR17)**.

## Acceptance Criteria

1. **AC1: Device List Display**
   - Given child is logged into their fledgely view
   - When viewing "My Devices" section
   - Then child sees list of their monitored devices

2. **AC2: Device Details**
   - Given device list is displayed
   - When viewing a device
   - Then child sees: name, status, last capture time

3. **AC3: Status Transparency**
   - Given device list is displayed
   - When viewing status indicators
   - Then child sees same status indicators as parent (online/offline/warning)

4. **AC4: Read-Only Access**
   - Given device list is displayed
   - When child interacts with devices
   - Then child cannot remove devices (no remove button shown)

5. **AC5: Capture History Link**
   - Given device list is displayed
   - When child clicks on a device
   - Then child can navigate to screenshot gallery filtered by that device

6. **AC6: Crisis Resources**
   - Given device list is displayed
   - When viewing the section
   - Then "Need help?" link is visible for crisis resources

## Tasks / Subtasks

### Task 1: Create ChildDeviceList Component (AC: #1, #2, #3, #4)

**Files:**

- `apps/web/src/components/child/ChildDeviceList.tsx` (new)
- `apps/web/src/components/child/ChildDeviceList.test.tsx` (new)

**Implementation:**

1.1 Create ChildDeviceList component with sky blue theme
1.2 Display device card for each device assigned to child
1.3 Show device name, status indicator, last capture time
1.4 Reuse DeviceStatusIcon from parent components for transparency
1.5 No remove button (read-only)
1.6 Add tests

### Task 2: Create useChildDevices Hook (AC: #1)

**Files:**

- `apps/web/src/hooks/useChildDevices.ts` (new)
- `apps/web/src/hooks/useChildDevices.test.ts` (new)

**Implementation:**

2.1 Create hook to fetch devices for a child
2.2 Query devices collection where childId matches
2.3 Return devices with loading/error states
2.4 Filter out unenrolled devices (status !== 'unenrolled')
2.5 Add tests

### Task 3: Add Device Click Navigation (AC: #5)

**Files:**

- `apps/web/src/components/child/ChildDeviceList.tsx` (modify)

**Implementation:**

3.1 Make device cards clickable
3.2 On click, navigate to screenshot gallery with deviceId filter
3.3 Add visual affordance (cursor pointer, hover effect)
3.4 Update tests

### Task 4: Add Crisis Resources Link (AC: #6)

**Files:**

- `apps/web/src/components/child/ChildDeviceList.tsx` (modify)

**Implementation:**

4.1 Add "Need help?" link at bottom of device list
4.2 Link to crisis allowlist or /child/help route
4.3 Style consistently with child theme
4.4 Update tests

### Task 5: Integrate into Child Dashboard (AC: all)

**Files:**

- `apps/web/src/app/child/dashboard/page.tsx` (modify)

**Implementation:**

5.1 Import ChildDeviceList component
5.2 Add "My Devices" section after welcome card
5.3 Pass childId and familyId from session
5.4 Add section heading
5.5 Update dashboard tests if needed

### Task 6: Add Integration Tests (AC: all)

**Files:**

- `apps/web/src/components/child/ChildDeviceList.test.tsx` (modify)

**Implementation:**

6.1 Test device list renders with devices
6.2 Test empty state (no devices)
6.3 Test status indicators match parent style
6.4 Test no remove button exists
6.5 Test device click navigation
6.6 Test crisis link visibility
6.7 Minimum 6 tests

## Dev Notes

### Existing Infrastructure

**Parent DevicesList Component (apps/web/src/components/devices/DevicesList.tsx):**

- Has DeviceStatusIcon for status indicators
- Shows name, status, last sync time
- Has remove button (exclude for child)

**Child Dashboard (apps/web/src/app/child/dashboard/page.tsx):**

- Uses sky blue theme (#f0f9ff, #0369a1)
- Has welcome card, gallery, audit section
- Uses ChildAuthGuard for authentication

**Child Screenshot Gallery:**

- Already supports deviceId filter in URL params
- Can navigate to /child/dashboard?deviceId=xxx

### Firestore Paths

- Devices: `families/{familyId}/devices/{deviceId}`
- Device fields: name, status, childId, lastSyncAt

### Design Patterns

**Child Theme Colors:**

- Background: #f0f9ff (sky-50)
- Primary: #0369a1 (sky-700)
- Accent: #0ea5e9 (sky-500)
- Cards: white with #e0f2fe border

**Status Indicators (same as parent):**

- Online: green dot (#22c55e)
- Offline: yellow/amber dot
- Warning: red dot

### What's Already Done vs What's Needed

| Requirement           | Already Done  | Needs Implementation       |
| --------------------- | ------------- | -------------------------- |
| Child dashboard       | ✅ Story 19B  | Add devices section        |
| Device status icons   | ✅ Story 19.2 | Reuse in child view        |
| Screenshot gallery    | ✅ Story 19B  | Add device filter          |
| Crisis resources      | ✅ Story 7.3  | Link from devices          |
| **Child device list** | ❌            | **NEW - Create component** |

### Security Considerations

- Child can only see their own devices (query filtered by childId)
- No modification actions available (read-only)
- Devices in 'unenrolled' status are hidden

### Edge Cases

1. **No devices assigned:** Show encouraging message
2. **All devices offline:** Show appropriate indicator
3. **Device just removed:** Filter by status !== 'unenrolled'
4. **Multiple devices:** List all with scrolling

### References

- [Source: docs/epics/epic-list.md#Story-19.7 - Child Device Visibility]
- [Pattern: apps/web/src/components/devices/DevicesList.tsx - Parent device list]
- [Pattern: apps/web/src/components/child/ChildScreenshotGallery.tsx - Child component style]
- [Existing: apps/web/src/app/child/dashboard/page.tsx - Child dashboard]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

N/A - Implementation complete

### Completion Notes List

- All 6 ACs implemented and tested
- AC1: Child sees list of monitored devices via `useChildDevices` hook and `ChildDeviceList` component
- AC2: Device card shows name, status indicator, last capture time
- AC3: Same status calculation as parent view (active/warning/critical/offline based on lastSeen)
- AC4: Read-only - no remove button exists (verified in tests)
- AC5: Device click navigates to screenshots filtered by deviceId via URL params
- AC6: "Need help?" crisis resources link visible at bottom
- 40 tests pass (8 hook tests + 32 component tests)
- Dashboard integration complete with deviceId filter support

**Code Review Fixes:**

- Added `isChildInFamily()` helper to Firestore security rules to allow children to read devices
- Enhanced error handling with specific messages for permission-denied, unavailable, and invalid-argument errors

### File List

**New Files:**

- `apps/web/src/hooks/useChildDevices.ts` - Hook to fetch child's monitored devices
- `apps/web/src/hooks/useChildDevices.test.ts` - 8 tests for hook
- `apps/web/src/components/child/ChildDeviceList.tsx` - Child device list component
- `apps/web/src/components/child/ChildDeviceList.test.tsx` - 32 tests for component

**Modified Files:**

- `apps/web/src/app/child/dashboard/page.tsx` - Added ChildDeviceList integration, useSearchParams for device filtering
- `packages/firebase-rules/firestore.rules` - Added isChildInFamily() for devices collection (lines 96-106)
