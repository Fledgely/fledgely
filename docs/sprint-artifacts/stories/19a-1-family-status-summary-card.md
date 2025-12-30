# Story 19A.1: Family Status Summary Card

Status: done

## Story

As a **busy parent**,
I want **a simple summary showing if everything is okay**,
So that **I don't have to dig through the dashboard**.

## Acceptance Criteria

1. **AC1: Status card visibility**
   - Given parent opens dashboard
   - When home view loads
   - Then prominent status card shows overall family status

2. **AC2: Green "All Good" state**
   - Given all devices are syncing and no alerts exist
   - When viewing status card
   - Then card displays green indicator with "All Good" message
   - And shows number of children and devices monitored

3. **AC3: Yellow "Needs Attention" state**
   - Given minor issues exist (sync delay > 1 hour, low battery < 20%)
   - When viewing status card
   - Then card displays yellow indicator with "Needs Attention" message
   - And shows summary of issues

4. **AC4: Red "Action Required" state**
   - Given critical issues exist (monitoring stopped, device offline > 24h, tampering detected)
   - When viewing status card
   - Then card displays red indicator with "Action Required" message
   - And shows urgent action summary

5. **AC5: Last update timestamp**
   - Given status card is displayed
   - When viewing card
   - Then last update timestamp is visible
   - And timestamp shows relative time (e.g., "Updated 2 min ago")

6. **AC6: Tap to expand details**
   - Given status card is displayed
   - When parent taps/clicks the card
   - Then card expands or navigates to details breakdown
   - And shows per-child and per-device status summary

## Tasks / Subtasks

- [x] Task 1: Create FamilyStatusCard component (AC: #1, #2, #3, #4, #5)
  - [x] 1.1 Create `apps/web/src/components/dashboard/FamilyStatusCard.tsx`
  - [x] 1.2 Implement card layout with status indicator, message, and stats
  - [x] 1.3 Add timestamp display with relative time formatting
  - [x] 1.4 Style card to be prominent (larger than other cards, top position)

- [x] Task 2: Create useFamilyStatus hook (AC: #2, #3, #4)
  - [x] 2.1 Create `apps/web/src/hooks/useFamilyStatus.ts`
  - [x] 2.2 Aggregate device status from useDevices hook
  - [x] 2.3 Calculate overall status (green/yellow/red) based on rules:
    - Green: All devices online, synced within 1 hour, no alerts
    - Yellow: Any device sync > 1 hour, battery < 20%, minor alerts
    - Red: Any device offline > 24h, monitoring stopped, tampering
  - [x] 2.4 Return status, message, childCount, deviceCount, issues array

- [x] Task 3: Implement status calculation logic (AC: #2, #3, #4)
  - [x] 3.1 Define status severity levels and thresholds
  - [x] 3.2 Aggregate all device health metrics from useDevices
  - [x] 3.3 Check for critical issues (offline > 24h, monitoring stopped)
  - [x] 3.4 Check for warning issues (sync delay, low battery)
  - [x] 3.5 Return worst-case status across all devices

- [x] Task 4: Add tap-to-expand functionality (AC: #6)
  - [x] 4.1 Add click handler to card component
  - [x] 4.2 Toggle expanded state to show details
  - [x] 4.3 In expanded view, list per-child status rows
  - [x] 4.4 Add aria-expanded for accessibility

- [x] Task 5: Integrate into Dashboard layout (AC: #1)
  - [x] 5.1 Add FamilyStatusCard to dashboard home page
  - [x] 5.2 Position at top of dashboard, above devices section
  - [x] 5.3 Ensure responsive layout (full width on mobile)

- [x] Task 6: Add unit tests (AC: #1-6)
  - [x] 6.1 Test green status when all devices healthy
  - [x] 6.2 Test yellow status with sync delay
  - [x] 6.3 Test red status with device offline
  - [x] 6.4 Test timestamp display
  - [x] 6.5 Test expand/collapse functionality
  - [x] 6.6 Test accessibility (ARIA)
  - [x] 6.7 Minimum 12 tests required (35 tests added)

## Dev Notes

### Implementation Strategy

This story creates a new summary component for the dashboard. The key is to:

1. Aggregate existing device status data from `useDevices` hook
2. Calculate an overall family status based on severity rules
3. Display in a prominent card at the top of the dashboard

### Existing Code to Leverage

**Device data source:** `apps/web/src/hooks/useDevices.ts`

- Already provides real-time device list with status
- Has `healthMetrics` with sync timestamps, battery level, network status

**Dashboard location:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`

- Existing dashboard page where card will be added

**Styling pattern:** Follow existing inline styles from `DevicesList.tsx`

- Use React.CSSProperties for consistency
- Follow existing color scheme (green: #22c55e, yellow: #eab308, red: #ef4444)

### Status Calculation Rules

```typescript
type FamilyStatus = 'good' | 'attention' | 'action'

interface StatusResult {
  status: FamilyStatus
  message: string
  childCount: number
  deviceCount: number
  activeDeviceCount: number
  issues: StatusIssue[]
  lastUpdated: Date
}

// Priority (highest to lowest):
// 1. RED: Any monitoring stopped, device offline > 24h, tampering
// 2. YELLOW: Any sync delay > 1h, battery < 20%
// 3. GREEN: All devices healthy

const THRESHOLDS = {
  OFFLINE_CRITICAL_HOURS: 24,
  SYNC_WARNING_MINUTES: 60,
  BATTERY_WARNING_PERCENT: 20,
}
```

### Component Structure

```typescript
// FamilyStatusCard.tsx
interface FamilyStatusCardProps {
  familyId: string
}

export function FamilyStatusCard({ familyId }: FamilyStatusCardProps) {
  const { status, message, childCount, deviceCount, issues, lastUpdated } = useFamilyStatus(familyId)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      role="button"
      aria-expanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      style={cardStyles[status]}
    >
      <StatusIndicator status={status} />
      <StatusMessage message={message} />
      <Stats childCount={childCount} deviceCount={deviceCount} />
      <Timestamp lastUpdated={lastUpdated} />
      {isExpanded && <ExpandedDetails issues={issues} />}
    </div>
  )
}
```

### Styling Patterns

```typescript
const statusColors = {
  good: { bg: '#dcfce7', border: '#22c55e', text: '#166534', icon: '#22c55e' },
  attention: { bg: '#fef9c3', border: '#eab308', text: '#854d0e', icon: '#eab308' },
  action: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: '#ef4444' },
}

const cardStyles: Record<FamilyStatus, React.CSSProperties> = {
  good: {
    backgroundColor: statusColors.good.bg,
    border: `2px solid ${statusColors.good.border}`,
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  // ... similar for attention, action
}
```

### Project Structure Notes

**Files to create:**

- `apps/web/src/components/dashboard/FamilyStatusCard.tsx` - Main component
- `apps/web/src/hooks/useFamilyStatus.ts` - Status aggregation hook
- `apps/web/src/components/dashboard/FamilyStatusCard.test.tsx` - Tests

**Files to modify:**

- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Add card to layout

### Previous Story Intelligence

From Story 19.1-19.4 implementation:

- Use inline styles with React.CSSProperties (no Tailwind classes)
- Status badges use dot + text pattern (see StatusBadge in DevicesList)
- Tests should mock useDevices and useChildren hooks
- Use data-testid attributes for test targeting
- Relative time formatting: use `formatLastSeen` from useDevices

### Dependencies

**Required hooks to import:**

- `useDevices` - from `src/hooks/useDevices`
- `useChildren` - from `src/hooks/useChildren`
- `useFamily` - from `src/hooks/useFamily` (for family context)

**No new packages needed** - all functionality uses existing patterns.

### Edge Cases

1. **No devices enrolled:** Show green "Ready to enroll" message
2. **All devices offline:** Red status, "All devices offline"
3. **Mixed status:** Show worst-case status with issue count
4. **Loading state:** Show skeleton card while data loads
5. **Error state:** Show error message with retry option

### Accessibility Requirements

- Card must be keyboard accessible (focusable, activatable with Enter/Space)
- Use role="button" and aria-expanded for expansion
- Color should not be the only indicator (include text labels)
- Touch target minimum 44x44px (NFR49)
- Screen reader friendly status announcements

### References

- [Source: docs/epics/epic-list.md#Epic-19A - Quick Status View]
- [Pattern: apps/web/src/components/devices/DevicesList.tsx - Styling patterns]
- [Pattern: apps/web/src/hooks/useDevices.ts - Device status data]
- [Architecture: docs/project_context.md - UI Components section]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None

### Completion Notes List

1. **useFamilyStatus hook** (`apps/web/src/hooks/useFamilyStatus.ts`):
   - Aggregates device status from useDevices and useChildren hooks
   - Calculates overall family status (good/attention/action) based on severity rules
   - Returns status, message, childCount, deviceCount, activeDeviceCount, issues array, lastUpdated
   - Thresholds: OFFLINE_CRITICAL_HOURS: 24, SYNC_WARNING_MINUTES: 60, BATTERY_WARNING_PERCENT: 20

2. **FamilyStatusCard component** (`apps/web/src/components/dashboard/FamilyStatusCard.tsx`):
   - Prominent card with color-coded status (green/yellow/red)
   - Shows status icon, message, child/device counts, and timestamp
   - Tap-to-expand functionality for issue details
   - Full accessibility: role="button", aria-expanded, keyboard navigation (Enter/Space)
   - Loading skeleton and error states handled

3. **Dashboard integration** (`apps/web/src/app/dashboard/page.tsx`):
   - Added FamilyStatusCard import and positioned above Family card
   - Only renders when family exists

4. **Test coverage** (35 tests total):
   - 20 tests for FamilyStatusCard component (AC1-6, edge cases)
   - 15 tests for useFamilyStatus hook (status calculation, counts, edge cases)

5. **All acceptance criteria satisfied**:
   - AC1: Status card visible at top of dashboard
   - AC2: Green "All Good" state with child/device counts
   - AC3: Yellow "Needs Attention" for warnings
   - AC4: Red "Action Required" for critical issues
   - AC5: Relative timestamp display
   - AC6: Tap-to-expand with per-issue breakdown

### File List

**Files Created:**

- apps/web/src/hooks/useFamilyStatus.ts
- apps/web/src/hooks/useFamilyStatus.test.ts
- apps/web/src/components/dashboard/FamilyStatusCard.tsx
- apps/web/src/components/dashboard/FamilyStatusCard.test.tsx
- apps/web/src/components/dashboard/index.ts

**Files Modified:**

- apps/web/src/app/dashboard/page.tsx (added FamilyStatusCard import and usage)
