# Story 39.2: Caregiver Permission Configuration

## Status: done

## Story

As a **parent**,
I want **to configure what each caregiver can do**,
So that **access is appropriate for their role**.

## Acceptance Criteria

1. **AC1: Permission Toggles**
   - Given caregiver account exists
   - When configuring permissions (FR75, FR76, FR77)
   - Then shows toggles for: view status, extend time, view flags
   - And toggles visually indicate current state

2. **AC2: Default Permissions**
   - Given new caregiver added
   - When viewing permissions
   - Then "View status only" is default (most restricted)
   - And other permissions are off by default

3. **AC3: Extend Time Permission**
   - Given "Extend time" permission enabled
   - When caregiver has this permission
   - Then caregiver can grant extra screen time
   - And extension limits apply per Story 39.4

4. **AC4: View Flags Permission**
   - Given "View flags" permission enabled
   - When caregiver has this permission
   - Then caregiver can see flagged content
   - And cannot take permanent actions (dismiss, escalate)

5. **AC5: Permission Changes**
   - Given parent wants to change permissions
   - When toggling any permission
   - Then change takes effect immediately
   - And audit log records permission change

6. **AC6: Child Visibility**
   - Given caregiver has permissions configured
   - When child views caregiver info
   - Then child sees caregiver permissions: "Grandma can see your status"
   - And permissions displayed in child-friendly language

## Tasks / Subtasks

### Task 1: Extend Caregiver Permission Schema (AC: #1, #2)

Update shared contracts to include permission fields.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/caregiver.test.ts` (modify)

**Implementation:**

- Add caregiverPermissionsSchema with fields: canExtendTime, canViewFlags
- Update familyCaregiverSchema to include permissions object
- Default permissions: { canExtendTime: false, canViewFlags: false }
- viewStatus is always true for caregivers (implicit, not stored)

**Tests:** ~8 tests for schema validation

### Task 2: Create Permission Update Cloud Function (AC: #5)

Cloud function to update caregiver permissions.

**Files:**

- `apps/functions/src/callable/updateCaregiverPermissions.ts` (new)
- `apps/functions/src/callable/updateCaregiverPermissions.test.ts` (new)

**Implementation:**

- updateCaregiverPermissions({ familyId, caregiverUid, permissions })
- Validate caller is guardian of family
- Update caregiver entry in family.caregivers array
- Create audit log entry for permission change
- Return updated permissions

**Tests:** ~12 tests including auth and validation

### Task 3: Create CaregiverPermissionEditor Component (AC: #1, #2, #3, #4)

UI component for editing caregiver permissions.

**Files:**

- `apps/web/src/components/caregiver/CaregiverPermissionEditor.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverPermissionEditor.test.tsx` (new)

**Implementation:**

- Toggle switches for canExtendTime and canViewFlags
- Show current permission state
- Call updateCaregiverPermissions on toggle
- Show success/error feedback
- 44px minimum touch targets (NFR49)

**Tests:** ~15 tests for component states

### Task 4: Add Permission Display to CaregiverManagementPage (AC: #1)

Show permissions in caregiver list.

**Files:**

- `apps/web/src/components/caregiver/CaregiverManagementPage.tsx` (modify)
- `apps/web/src/components/caregiver/CaregiverManagementPage.test.tsx` (modify)

**Implementation:**

- Show permission badges on each caregiver card
- "Manage" button opens CaregiverPermissionEditor modal
- Display permission icons (eye, clock, flag)

**Tests:** ~8 additional tests

### Task 5: Create Child-Facing Permission Display (AC: #6)

Show caregiver permissions to child in friendly language.

**Files:**

- `apps/web/src/components/child/CaregiverPermissionInfo.tsx` (new)
- `apps/web/src/components/child/CaregiverPermissionInfo.test.tsx` (new)

**Implementation:**

- Display "Grandma can see your status"
- If canExtendTime: "Grandma can give you extra time"
- If canViewFlags: "Grandma can see flagged items"
- Child-friendly icons and language

**Tests:** ~10 tests for display variations

### Task 6: Create Permission Change Audit Service (AC: #5)

Log all permission changes for audit trail.

**Files:**

- `apps/functions/src/services/caregiverAuditService.ts` (new)
- `apps/functions/src/services/caregiverAuditService.test.ts` (new)

**Implementation:**

- logPermissionChange(familyId, caregiverUid, changedBy, oldPermissions, newPermissions)
- Store in caregiverAuditLogs collection
- Include timestamp, action type, changes made
- NFR62: Log within 5 minutes of action

**Tests:** ~8 tests for audit logging

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Permission Structure

```typescript
const caregiverPermissionsSchema = z.object({
  canExtendTime: z.boolean().default(false),
  canViewFlags: z.boolean().default(false),
})

// In familyCaregiverSchema, add:
permissions: caregiverPermissionsSchema.default({
  canExtendTime: false,
  canViewFlags: false,
})
```

### Audit Log Structure

```typescript
const caregiverAuditLogSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  caregiverUid: z.string(),
  action: z.enum(['permission_change', 'time_extension', 'flag_viewed']),
  changedByUid: z.string(),
  changes: z.record(z.unknown()),
  createdAt: z.date(),
})
```

### Child-Friendly Permission Text

| Permission             | Child sees                       |
| ---------------------- | -------------------------------- |
| viewStatus (always on) | "[Name] can see your status"     |
| canExtendTime          | "[Name] can give you extra time" |
| canViewFlags           | "[Name] can see flagged items"   |

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR62: Caregiver access audit logging (within 5 minutes)

### References

- [Source: docs/epics/epic-list.md#Story-39.2]
- [Source: Story 39.1 for caregiver structure]

## Dev Agent Record

### Context Reference

- Epic: 39 (Caregiver Full Features)
- Story Key: 39-2-caregiver-permission-configuration
- Dependencies: Story 39.1 (Caregiver Account Creation) - COMPLETE

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

- All 6 tasks completed with comprehensive test coverage
- Task 1: Added caregiverPermissionsSchema and DEFAULT_CAREGIVER_PERMISSIONS to contracts
- Task 2: Created updateCaregiverPermissions Cloud Function with guardian validation
- Task 3: Created CaregiverPermissionEditor component with toggle switches
- Task 4: Updated CaregiverManagementPage with permission badges and editor modal
- Task 5: Created CaregiverPermissionInfo child-facing component
- Task 6: Created caregiverAuditService for permission change logging
- Tests: 209 total tests passing across all story components

### File List

- `packages/shared/src/contracts/index.ts` - Added caregiverPermissionsSchema (modified)
- `packages/shared/src/contracts/caregiver.test.ts` - Added 11 permission tests (modified)
- `apps/functions/src/callable/updateCaregiverPermissions.ts` - Cloud function (new)
- `apps/functions/src/callable/updateCaregiverPermissions.test.ts` - 34 tests (new)
- `apps/functions/src/services/caregiverAuditService.ts` - Audit logging service (new)
- `apps/functions/src/services/caregiverAuditService.test.ts` - 29 tests (new)
- `apps/functions/src/index.ts` - Export updateCaregiverPermissions (modified)
- `apps/web/src/components/caregiver/CaregiverPermissionEditor.tsx` - UI component (new)
- `apps/web/src/components/caregiver/CaregiverPermissionEditor.test.tsx` - 34 tests (new)
- `apps/web/src/components/caregiver/CaregiverManagementPage.tsx` - Permission display (modified)
- `apps/web/src/components/child/CaregiverPermissionInfo.tsx` - Child display (new)
- `apps/web/src/components/child/CaregiverPermissionInfo.test.tsx` - 20 tests (new)

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-03 | Story created (ready-for-dev) |
| 2026-01-03 | Story completed (done)        |
