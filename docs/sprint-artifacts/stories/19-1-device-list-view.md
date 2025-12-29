# Story 19.1: Device List View

Status: done

## Story

As a **parent**,
I want **to see all enrolled devices in my dashboard**,
So that **I can monitor device status at a glance**.

## Acceptance Criteria

1. **AC1: All enrolled devices listed**
   - Given parent is logged into dashboard
   - When viewing devices section
   - Then all enrolled devices are displayed (excluding unenrolled)

2. **AC2: Device information display**
   - Given devices are listed
   - When viewing a device
   - Then each device shows: name/model, type (Chromebook/Android), assigned child

3. **AC3: Devices grouped by child**
   - Given multiple devices exist
   - When viewing device list
   - Then devices are grouped under their assigned child
   - And each group shows child name as header

4. **AC4: Unassigned devices section**
   - Given some devices have no assigned child
   - When viewing device list
   - Then unassigned devices appear in separate "Unassigned Devices" section
   - And this section appears after child-grouped devices

5. **AC5: Real-time updates**
   - Given device list is displayed
   - When a device syncs or changes
   - Then list updates in real-time without page refresh

6. **AC6: Empty state**
   - Given no devices are enrolled
   - When viewing devices section
   - Then "Add your first device" CTA is displayed

## Tasks / Subtasks

- [x] Task 1: Implement Device Grouping Logic (AC: #3, #4)
  - [x] 1.1 Create `groupDevicesByChild` utility function in DevicesList.tsx
  - [x] 1.2 Group devices using `device.childId` property
  - [x] 1.3 Sort children alphabetically by name
  - [x] 1.4 Collect unassigned devices (childId === null) separately
  - [x] 1.5 Handle edge case: orphaned assignments (childId exists but child deleted)

- [x] Task 2: Create Child Group Header Component (AC: #3)
  - [x] 2.1 Create `ChildGroupHeader` sub-component in DevicesList.tsx
  - [x] 2.2 Display child name and optional avatar/photo
  - [x] 2.3 Show device count for the child (e.g., "Emma (2 devices)")
  - [x] 2.4 Apply consistent styling with existing components

- [x] Task 3: Create Unassigned Section Header (AC: #4)
  - [x] 3.1 Create "Unassigned Devices" header component
  - [x] 3.2 Show count of unassigned devices
  - [x] 3.3 Add subtle visual distinction (different background/border)

- [x] Task 4: Update DevicesList Rendering (AC: #1, #2, #3, #4)
  - [x] 4.1 Modify DevicesList to use grouped rendering
  - [x] 4.2 Render child sections with headers followed by their devices
  - [x] 4.3 Render unassigned section at the end
  - [x] 4.4 Maintain all existing device item functionality (assignment dropdown, status, buttons)
  - [x] 4.5 Ensure real-time updates preserve grouping (AC: #5)

- [x] Task 5: Update Empty State (AC: #6)
  - [x] 5.1 Verify existing empty state message is appropriate
  - [x] 5.2 Consider adding "Add your first device" button/link if not present
  - [x] 5.3 Ensure empty state is accessible (ARIA)

- [x] Task 6: Add Unit Tests (AC: #1-6)
  - [x] 6.1 Test device grouping by child
  - [x] 6.2 Test unassigned devices in separate section
  - [x] 6.3 Test empty state display
  - [x] 6.4 Test orphaned assignment handling
  - [x] 6.5 Test sorting (children alphabetically)
  - [x] 6.6 Minimum 10 tests (19 tests added)

## Dev Notes

### Implementation Strategy

Story 19.1 requires modifying the existing `DevicesList` component to add grouping logic. The component already has:

- Real-time device loading via `useDevices` hook
- Child loading via `useChildren` hook
- Device item rendering with all actions (assign, remove, emergency code)

The key change is restructuring from a flat list to grouped sections.

### Existing Code to Modify

**Primary file:** `apps/web/src/components/devices/DevicesList.tsx`

The component currently renders a flat list:

```typescript
{activeDevices.map((device) => (
  <div key={device.deviceId} style={styles.deviceItem}>
    {/* ... device content ... */}
  </div>
))}
```

Must change to grouped rendering:

```typescript
{/* Child sections */}
{childGroups.map(({ child, devices }) => (
  <div key={child.id}>
    <ChildGroupHeader child={child} deviceCount={devices.length} />
    {devices.map((device) => (
      <div key={device.deviceId} style={styles.deviceItem}>
        {/* ... existing device content ... */}
      </div>
    ))}
  </div>
))}

{/* Unassigned section */}
{unassignedDevices.length > 0 && (
  <div>
    <UnassignedHeader count={unassignedDevices.length} />
    {unassignedDevices.map((device) => (
      <div key={device.deviceId} style={styles.deviceItem}>
        {/* ... existing device content ... */}
      </div>
    ))}
  </div>
)}
```

### Data Structures

**Device interface** (from `useDevices.ts`):

```typescript
interface Device {
  deviceId: string
  type: 'chromebook' | 'android'
  enrolledAt: Date
  enrolledBy: string
  childId: string | null  // KEY: null means unassigned
  name: string
  lastSeen: Date
  status: 'active' | 'offline' | 'unenrolled'
  metadata: { ... }
}
```

**Child interface** (from `useChildren.ts`):

```typescript
interface ChildSummary {
  id: string
  name: string
  photoURL: string | null
}
```

### Grouping Algorithm

```typescript
function groupDevicesByChild(
  devices: Device[],
  children: ChildSummary[]
): { childGroups: { child: ChildSummary; devices: Device[] }[]; unassigned: Device[] } {
  // Create map of childId -> devices
  const devicesByChild = new Map<string, Device[]>()
  const unassigned: Device[] = []

  for (const device of devices) {
    if (device.childId === null) {
      unassigned.push(device)
    } else {
      const existing = devicesByChild.get(device.childId) || []
      existing.push(device)
      devicesByChild.set(device.childId, existing)
    }
  }

  // Build ordered groups (children sorted alphabetically)
  const sortedChildren = [...children].sort((a, b) => a.name.localeCompare(b.name))
  const childGroups = sortedChildren
    .filter((child) => devicesByChild.has(child.id))
    .map((child) => ({
      child,
      devices: devicesByChild.get(child.id)!,
    }))

  return { childGroups, unassigned }
}
```

### Styling Additions

Add to existing `styles` object:

```typescript
const styles = {
  // ... existing styles ...

  groupSection: {
    marginBottom: '24px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '8px',
  },
  groupHeaderAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
  },
  groupHeaderName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  groupHeaderCount: {
    fontSize: '13px',
    color: '#6b7280',
    marginLeft: '8px',
  },
  unassignedHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #fbbf24',
    marginBottom: '8px',
  },
  unassignedHeaderText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
  },
}
```

### Edge Cases

1. **Orphaned assignments**: Device has `childId` but child was deleted
   - Show in "Unknown child" section OR treat as unassigned
   - Existing code has this pattern: `const isOrphaned = device.childId && !assignedChild`

2. **Child with no devices**: Don't show empty sections
   - Only render child headers for children that have assigned devices

3. **All devices unassigned**: Only show unassigned section (no child groups)

4. **Empty state**: No devices at all - show CTA message

### Project Structure Notes

**Files to modify:**

- `apps/web/src/components/devices/DevicesList.tsx` - Add grouping logic and section headers

**Files to update tests:**

- `apps/web/src/components/devices/DevicesList.test.tsx` - Add grouping tests

**No new files needed** - all changes contained within existing component.

### References

- [Source: docs/epics/epic-list.md#Epic-19 - Device Status & Monitoring Health]
- [Pattern: apps/web/src/components/devices/DevicesList.tsx - Existing component]
- [Pattern: apps/web/src/hooks/useDevices.ts - Device interface]
- [Pattern: apps/web/src/hooks/useChildren.ts - Child interface]
- [Architecture: docs/architecture/project-structure-boundaries.md]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

1. **groupDevicesByChild utility**: Created exported function that groups devices into three categories: child-assigned (sorted alphabetically by child name), orphaned (childId exists but child deleted), and unassigned (childId === null).

2. **ChildGroupHeader component**: Displays child avatar (with photo or initial), name, and device count. Uses ARIA role="heading" for accessibility.

3. **UnassignedHeader component**: Shows "Unassigned Devices" with amber styling and device count. Uses package box emoji for visual distinction.

4. **OrphanedHeader component**: Added "Unknown Child" section with red warning styling for devices whose assigned child was deleted.

5. **Grouped rendering**: Modified DevicesList to render child groups first (alphabetically), then orphaned section, then unassigned section. Extracted `renderDeviceItem` to avoid duplication.

6. **Empty state updated**: Changed to "No devices enrolled yet." with "Add your first device" CTA button. Added ARIA role="status" and aria-live="polite".

7. **Test coverage**: 19 new tests covering grouping logic, empty states, and all edge cases.

8. **Existing tests updated**: Modified old tests in `__tests__/DevicesList.test.tsx` to account for new rendering order due to grouping.

### File List

**Files Modified:**

- `apps/web/src/components/devices/DevicesList.tsx` - Added grouping logic, header components, styles
- `apps/web/src/components/devices/__tests__/DevicesList.test.tsx` - Updated for new rendering order

**Files Created:**

- `apps/web/src/components/devices/DevicesList.test.tsx` - 19 new unit tests for Story 19.1
