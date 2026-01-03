# Story 39.5: Caregiver Flag Viewing

## Status: done

## Story

As a **caregiver with flag permission**,
I want **to view flagged content**,
So that **I can respond appropriately when babysitting**.

## Acceptance Criteria

1. **AC1: Flag Queue Access**
   - Given caregiver has "view flags" permission (FR77)
   - When accessing flag queue
   - Then caregiver sees pending flags (same as parent view)
   - And flags displayed in priority order (severity, then date)
   - And shows: thumbnail, category, severity badge, child name, timestamp

2. **AC2: Reviewed Flag Marking**
   - Given caregiver is viewing a flag
   - When caregiver marks as "reviewed"
   - Then flag status updated with reviewer info
   - And action logged: "Grandma viewed flag at 3pm"
   - And flag moves to history section

3. **AC3: Restricted Actions**
   - Given caregiver is viewing flags
   - When attempting to take permanent actions
   - Then caregiver cannot dismiss flags
   - And caregiver cannot escalate flags
   - And caregiver cannot modify flag resolution
   - And UI clearly shows "Only parents can dismiss or resolve flags"

4. **AC4: Flag Viewing Audit**
   - Given caregiver views any flag
   - When flag is displayed
   - Then viewing logged: caregiver UID, flag ID, timestamp
   - And log entry includes: "Grandma viewed flag at 3pm"
   - And log visible in parent dashboard under caregiver activity

5. **AC5: Permission Requirement**
   - Given caregiver without "view flags" permission
   - When attempting to access flag queue
   - Then UI shows "You don't have permission to view flags"
   - And flag queue route is inaccessible
   - And no flag data returned from queries

6. **AC6: Child Privacy**
   - Given caregiver can view flags for assigned children only
   - When viewing flag queue
   - Then only shows flags for children in caregiver's childIds
   - And respects child's privacy within family circle
   - And useful for: "Call me if you see anything concerning"

## Tasks / Subtasks

### Task 1: Create Caregiver Flag Viewing Schema (AC: #2, #4) [x]

Add flag viewing audit schema to shared contracts.

**Files:**

- `packages/shared/src/contracts/index.ts` (modify)
- `packages/shared/src/contracts/caregiver.test.ts` (modify)

**Implementation:**

- Add `caregiverFlagViewLogSchema`:
  - `id: z.string()`
  - `familyId: z.string()`
  - `caregiverUid: z.string()`
  - `caregiverName: z.string()`
  - `flagId: z.string()`
  - `childUid: z.string()`
  - `childName: z.string()`
  - `action: z.enum(['viewed', 'marked_reviewed'])`
  - `createdAt: z.date()`
- Export type `CaregiverFlagViewLog`

**Tests:** ~10 tests for schema validation

### Task 2: Create Log Caregiver Flag View Cloud Function (AC: #4) [x]

Cloud function to log caregiver flag viewing.

**Files:**

- `apps/functions/src/callable/logCaregiverFlagView.ts` (new)
- `apps/functions/src/callable/logCaregiverFlagView.test.ts` (new)

**Implementation:**

- `logCaregiverFlagView({ familyId, flagId, childUid, action })`
- Validate caller is caregiver with `canViewFlags` permission
- Validate caregiver has access to the child (childIds includes childUid)
- Create log entry in `families/{familyId}/caregiverFlagViewLogs/{logId}`
- Create audit log entry via caregiverAuditService
- Return success confirmation

**Tests:** ~18 tests including auth, validation, logging

### Task 3: Create Mark Flag Reviewed Cloud Function (AC: #2, #3) [x]

Cloud function for caregiver to mark flag as reviewed.

**Files:**

- `apps/functions/src/callable/markFlagReviewedByCaregiver.ts` (new)
- `apps/functions/src/callable/markFlagReviewedByCaregiver.test.ts` (new)

**Implementation:**

- `markFlagReviewedByCaregiver({ familyId, flagId })`
- Validate caller is caregiver with `canViewFlags` permission
- Validate flag belongs to child in caregiver's childIds
- Update flag document:
  - Add `caregiverReviewedAt: serverTimestamp()`
  - Add `caregiverReviewedBy: { uid, displayName }`
- Do NOT allow: status change, dismissal, escalation (those are parent-only)
- Create flag view log with action='marked_reviewed'
- Return updated flag

**Tests:** ~20 tests including permission checks, restricted actions

### Task 4: Create CaregiverFlagQueue Component (AC: #1, #3, #5) [x]

UI component for caregiver to view flag queue.

**Files:**

- `apps/web/src/components/caregiver/CaregiverFlagQueue.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverFlagQueue.test.tsx` (new)

**Implementation:**

- Reuse FlagCard component from `apps/web/src/components/flags/FlagCard.tsx`
- Filter flags by caregiver's childIds
- Tabs: "Pending" and "Reviewed by Me"
- No dismiss/escalate/resolve buttons (parent-only actions)
- "Mark as Reviewed" button available
- Show "Only parents can dismiss or resolve flags" message
- Permission denied state if canViewFlags is false
- 44px minimum touch targets (NFR49)

**Tests:** ~25 tests for component states, filtering, restricted actions

### Task 5: Create CaregiverFlagDetailView Component (AC: #1, #2, #3) [x]

UI component for caregiver to view individual flag details.

**Files:**

- `apps/web/src/components/caregiver/CaregiverFlagDetailView.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverFlagDetailView.test.tsx` (new)

**Implementation:**

- Reuse FlagInfoPanel, AIReasoningPanel from existing flag components
- Show: screenshot, category, severity, AI reasoning, timestamp
- "Mark as Reviewed" button
- Hide parent-only actions: dismiss, escalate, resolve
- Show note: "Contact parent about concerning content"
- Call logCaregiverFlagView on mount (view logging)
- Accessibility: proper aria-labels, keyboard navigation

**Tests:** ~20 tests for display, actions, logging

### Task 6: Add Flag Viewing to Caregiver Dashboard (AC: #1, #5, #6) [x]

Integrate flag queue into caregiver's main view.

**Files:**

- `apps/web/src/components/caregiver/CaregiverQuickView.tsx` (modify)
- `apps/web/src/components/caregiver/CaregiverQuickView.test.tsx` (modify)
- `apps/web/src/components/caregiver/index.ts` (modify)

**Implementation:**

- Add "Flagged Content" section if canViewFlags is true
- Show pending flag count badge
- Link to CaregiverFlagQueue component
- Hide section entirely if no flag permission
- Show only flags for children in childIds
- Real-time updates via onSnapshot

**Tests:** ~15 tests for dashboard integration

### Task 7: Create Caregiver Flag View Audit Display (AC: #4) [x]

Parent can see all caregiver flag viewing activity.

**Files:**

- `apps/web/src/components/caregiver/CaregiverFlagAuditView.tsx` (new)
- `apps/web/src/components/caregiver/CaregiverFlagAuditView.test.tsx` (new)

**Implementation:**

- List view of caregiver flag view logs
- Columns: caregiver name, child name, flag category, action, timestamp
- Filter by caregiver, child, date range
- Sort by most recent first
- Format: "Grandma viewed Violence flag for Emma at 3:00 PM"
- Integrates with CaregiverExtensionAuditView in parent dashboard

**Tests:** ~15 tests for list display, filtering

### Task 8: Update Child Permission Info for Flag Viewing (AC: #6) [x]

Update child-facing display to show flag viewing permission.
**Note:** Pre-completed in Story 39.2 - canViewFlags display already exists.

**Files:**

- `apps/web/src/components/child/CaregiverPermissionInfo.tsx` (modify)
- `apps/web/src/components/child/CaregiverPermissionInfo.test.tsx` (modify)

**Implementation:**

- Add display for canViewFlags: "[Name] can see flagged items"
- Child-friendly language explaining what this means
- Maintains transparency about caregiver access

**Tests:** ~5 additional tests for flag permission display

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

From existing Epic 39 patterns:

- "All types from Zod Only" - extend existing caregiver schemas
- "Firebase SDK Direct" - use `doc()`, `getDoc()`, `collection()` directly
- "Functions Delegate to Services" - Cloud Functions for business logic

### Existing Infrastructure to Leverage

**From Epic 22 (Flag Queue):**

- `FlagQueue.tsx` - Reference for queue layout and tabs
- `FlagCard.tsx` - Reuse for displaying flag cards
- `FlagDetailModal.tsx` - Reference for detail view pattern
- `FlagInfoPanel.tsx`, `AIReasoningPanel.tsx` - Reuse for flag details
- `flagService.ts` - Query patterns for flags

**From Story 39.2 (Permission Configuration):**

- `caregiverPermissionsSchema` - Has `canViewFlags` field
- `CaregiverPermissionEditor.tsx` - Already handles canViewFlags toggle
- `caregiverAuditService.ts` - Use for logging flag views

**From Story 39.4 (PIN Extension):**

- `CaregiverExtensionAuditView.tsx` - Pattern for audit display
- Real-time onSnapshot patterns

### Flag Document Structure

```typescript
// Existing flag document structure (from Epic 22)
interface FlagDocument {
  id: string
  familyId: string
  childUid: string
  screenshotId: string
  category: ConcernCategory
  severity: ConcernSeverity
  aiReasoning: string
  status: 'pending' | 'reviewed' | 'dismissed' | 'escalated'
  createdAt: Date
  // New fields for caregiver viewing
  caregiverReviewedAt?: Date
  caregiverReviewedBy?: {
    uid: string
    displayName: string
  }
}
```

### Caregiver Flag View Log Structure

```typescript
const caregiverFlagViewLogSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  caregiverUid: z.string(),
  caregiverName: z.string(),
  flagId: z.string(),
  childUid: z.string(),
  childName: z.string(),
  action: z.enum(['viewed', 'marked_reviewed']),
  flagCategory: z.string(), // For display without re-fetching flag
  flagSeverity: z.string(),
  createdAt: z.date(),
})
```

### Permission Check Pattern

```typescript
// In Cloud Functions
async function validateCaregiverFlagPermission(
  familyId: string,
  caregiverUid: string,
  childUid: string
): Promise<{ valid: boolean; error?: string; caregiver?: FamilyCaregiver }> {
  const family = await getDoc(doc(db, 'families', familyId))
  const caregiver = family.data()?.caregivers?.find((c) => c.uid === caregiverUid)

  if (!caregiver) {
    return { valid: false, error: 'Not a caregiver in this family' }
  }

  if (!caregiver.permissions?.canViewFlags) {
    return { valid: false, error: 'No flag viewing permission' }
  }

  if (!caregiver.childIds.includes(childUid)) {
    return { valid: false, error: 'Not assigned to this child' }
  }

  return { valid: true, caregiver }
}
```

### Restricted Actions Enforcement

```typescript
// CaregiverFlagDetailView - Hide parent-only actions
const PARENT_ONLY_ACTIONS = ['dismiss', 'escalate', 'resolve', 'change_status']

// Show message instead of buttons
<div style={styles.restrictedMessage}>
  <span>&#x1F6C8;</span> Only parents can dismiss or resolve flags
</div>
```

### File Structure

```
packages/shared/src/contracts/
└── index.ts                                    # UPDATE: add caregiverFlagViewLogSchema

apps/functions/src/callable/
├── logCaregiverFlagView.ts                     # NEW
├── logCaregiverFlagView.test.ts                # NEW
├── markFlagReviewedByCaregiver.ts              # NEW
└── markFlagReviewedByCaregiver.test.ts         # NEW

apps/web/src/components/caregiver/
├── CaregiverFlagQueue.tsx                      # NEW
├── CaregiverFlagQueue.test.tsx                 # NEW
├── CaregiverFlagDetailView.tsx                 # NEW
├── CaregiverFlagDetailView.test.tsx            # NEW
├── CaregiverFlagAuditView.tsx                  # NEW
├── CaregiverFlagAuditView.test.tsx             # NEW
├── CaregiverDashboard.tsx                      # UPDATE: add flag section
└── CaregiverDashboard.test.tsx                 # UPDATE

apps/web/src/components/child/
├── CaregiverPermissionInfo.tsx                 # UPDATE: add flag permission
└── CaregiverPermissionInfo.test.tsx            # UPDATE
```

### Testing Requirements

- Unit test schema validation for flag view log
- Unit test permission validation (canViewFlags, childIds)
- Unit test restricted action enforcement
- Component tests for CaregiverFlagQueue states
- Component tests for flag filtering by childIds
- Component tests for "Mark as Reviewed" flow
- Component tests for permission denied state
- Integration test: full flag viewing and logging flow

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR62: Caregiver access audit logging (within 5 minutes)

### References

- [Source: docs/epics/epic-list.md#Story-39.5]
- [Source: docs/epics/epic-list.md#Epic-39]
- [Source: docs/prd/functional-requirements.md#FR77]
- [Source: apps/web/src/components/flags/FlagQueue.tsx]
- [Source: apps/web/src/components/flags/FlagCard.tsx]
- [Source: Story 39.2 for permission patterns]
- [Source: Story 39.4 for audit view patterns]

## Dev Agent Record

### Context Reference

- Epic: 39 (Caregiver Full Features)
- Story Key: 39-5-caregiver-flag-viewing
- Dependencies: Story 39.2 (Caregiver Permission Configuration) - COMPLETE

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

**packages/shared:**

- `src/contracts/index.ts` - Added caregiverFlagViewLogSchema, logCaregiverFlagViewInputSchema, markFlagReviewedByCaregiverInputSchema
- `src/contracts/caregiver.test.ts` - Added schema validation tests

**apps/functions:**

- `src/index.ts` - Export new Cloud Functions
- `src/callable/logCaregiverFlagView.ts` - NEW: Log caregiver flag viewing
- `src/callable/logCaregiverFlagView.test.ts` - NEW: 15 tests
- `src/callable/markFlagReviewedByCaregiver.ts` - NEW: Mark flag as reviewed
- `src/callable/markFlagReviewedByCaregiver.test.ts` - NEW: 18 tests

**apps/web:**

- `src/components/caregiver/CaregiverFlagQueue.tsx` - NEW: Flag queue component
- `src/components/caregiver/CaregiverFlagQueue.test.tsx` - NEW: 13 tests
- `src/components/caregiver/CaregiverFlagDetailView.tsx` - NEW: Flag detail view
- `src/components/caregiver/CaregiverFlagDetailView.test.tsx` - NEW: 17 tests
- `src/components/caregiver/CaregiverFlagAuditView.tsx` - NEW: Audit log display
- `src/components/caregiver/CaregiverFlagAuditView.test.tsx` - NEW: 16 tests
- `src/components/caregiver/CaregiverQuickView.tsx` - Added flag section integration
- `src/components/caregiver/CaregiverQuickView.test.tsx` - Added 5 flag integration tests
- `src/components/caregiver/index.ts` - Export new components

## Change Log

| Date       | Change                                               |
| ---------- | ---------------------------------------------------- |
| 2026-01-03 | Story created (ready-for-dev)                        |
| 2026-01-03 | All 8 tasks implemented, tests passing (done)        |
| 2026-01-03 | Code review: Fixed 9 issues, added date range filter |
