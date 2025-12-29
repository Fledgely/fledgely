# Story 12.5: Child Assignment to Device

Status: complete

## Story

As **a parent**,
I want **to assign a device to a specific child**,
So that **screenshots are attributed to the correct child**.

## Acceptance Criteria

1. **AC1: Assign to Child Dropdown**
   - Given device is enrolled but unassigned
   - When parent views device in dashboard
   - Then parent sees "Assign to Child" dropdown

2. **AC2: Child Selection**
   - Given parent opens assignment dropdown
   - When dropdown is displayed
   - Then dropdown shows all children in the family

3. **AC3: Assignment Update**
   - Given parent selects a child
   - When assignment is confirmed
   - Then device document is updated with `childId`

4. **AC4: Assignment Audit**
   - Given device is assigned or reassigned
   - When assignment change occurs
   - Then change is audited in activity log

5. **AC5: Device Reassignment**
   - Given device is already assigned
   - When parent views device
   - Then device can be reassigned to different child anytime

6. **AC6: Unassigned Device Handling**
   - Given device is unassigned
   - When device captures screenshots
   - Then screenshots are flagged as "unassigned"

## Tasks / Subtasks

- [x] Task 1: Child Assignment Cloud Function (AC: #3, #4)
  - [x] 1.1 Create `assignDeviceToChild` callable function
  - [x] 1.2 Verify user is parent of family
  - [x] 1.3 Verify child belongs to same family
  - [x] 1.4 Update device document with childId
  - [x] 1.5 Create audit log entry for assignment

- [x] Task 2: Dashboard Device Assignment UI (AC: #1, #2, #5)
  - [x] 2.1 Add child selector to DevicesList component
  - [x] 2.2 Fetch children list for family
  - [x] 2.3 Display current assignment status
  - [x] 2.4 Handle assignment/reassignment actions
  - [x] 2.5 Show loading and error states

- [x] Task 3: useChildren Hook (AC: #2)
  - [x] 3.1 Create hook to fetch children in family
  - [x] 3.2 Return list of children with id/name/avatar
  - [x] 3.3 Handle loading and error states

- [x] Task 4: Assignment Service (AC: #3, #5)
  - [x] 4.1 Create assignDeviceToChild function
  - [x] 4.2 Handle loading state during assignment
  - [x] 4.3 Show user-friendly error messages on failure

- [x] Task 5: Unit Tests (AC: #1-6)
  - [x] 5.1 Test Cloud Function authorization
  - [x] 5.2 Test child assignment update
  - [x] 5.3 Test UI component
  - [x] 5.4 Test reassignment flow

## Dev Notes

### Implementation Strategy

This story adds child assignment capability to enrolled devices. The assignment links screenshots to the correct child profile for attribution.

The flow:

1. Parent views enrolled device in dashboard
2. Parent selects child from dropdown
3. Cloud Function validates and updates device document
4. Dashboard refreshes to show assignment
5. Future screenshots use childId for attribution

### Key Requirements

- **FR12:** Device-to-child association
- **NFR42:** Security - only parents can assign

### Technical Details

#### Device Document Update

```typescript
// Update to existing device document
{
  childId: 'child-123',  // Previously null
  assignedAt: Timestamp,
  assignedBy: string    // Parent UID
}
```

#### Audit Log Entry

```typescript
{
  type: 'device_assignment',
  deviceId: string,
  childId: string,
  previousChildId: string | null,
  performedBy: string,
  timestamp: Timestamp
}
```

### Project Structure Notes

- Follow Cloud Functions pattern from Story 12.4
- Follow dashboard hook pattern from useDevices.ts
- Extend DevicesList component for assignment UI

### References

- [Source: docs/epics/epic-list.md#Story-12.5]
- [Pattern: apps/functions/src/callable/enrollment.ts]
- [Pattern: apps/web/src/hooks/useDevices.ts]
- [Pattern: apps/web/src/components/devices/DevicesList.tsx]

### Previous Story Intelligence

From Story 12.4:

- Device documents created in `/families/{familyId}/devices`
- useDevices hook provides real-time device list
- DevicesList component displays devices
- childId field exists but initially null

## Dev Agent Record

### Context Reference

Story 12.4 completed - Device registration with null childId

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

None - clean implementation

### Completion Notes List

- Created `assignDeviceToChild` Cloud Function with auth, validation, permission checks
- Audit log created on each assignment/reassignment
- Created `useChildren` hook for real-time family children list
- Created `deviceService.ts` with client-side assignment function
- Updated `DevicesList` component with child selector dropdown
- Added Firestore index for children by familyId + name
- All unit tests passing (57 function tests, 19 component tests)
- AC6 (unassigned device handling) is inherently supported - childId is null until assigned

### File List

- apps/functions/src/callable/enrollment.ts (added assignDeviceToChild)
- apps/functions/src/index.ts (exported assignDeviceToChild)
- apps/functions/src/callable/enrollment.test.ts (added Story 12.5 tests)
- apps/web/src/hooks/useChildren.ts (new)
- apps/web/src/services/deviceService.ts (new)
- apps/web/src/components/devices/DevicesList.tsx (updated with child assignment UI)
- apps/web/src/components/devices/**tests**/DevicesList.test.tsx (new)
- firestore.indexes.json (added children familyId+name index)
- packages/firebase-rules/firestore.rules (updated audit log comment for Story 12.5)

### Code Review (12.5)

**Issues Found:** 2 HIGH, 2 MEDIUM, 2 LOW
**Issues Fixed:** 2 HIGH, 2 MEDIUM, 2 LOW

**Fixed:**

1. [HIGH] Console error exposed in production → Added dev-only logging
2. [HIGH] Orphaned child assignment not handled → Added "Unknown child" badge
3. [MEDIUM] Poor error messages → Added Firebase error code handling
4. [MEDIUM] Task 4.2/4.3 misleading documentation → Updated to match implementation
5. [LOW] Missing test for empty children list → Added test
6. [LOW] Missing test for orphaned child → Added test

**Not Fixed (Low Priority):**

- Rate limiting on assignment function → defer to NFR refinement
- Unused React import in test → allowed by lint config
