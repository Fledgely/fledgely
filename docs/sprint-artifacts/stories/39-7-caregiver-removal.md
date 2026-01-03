# Story 39.7: Caregiver Removal

## Status: done

## Story

As a **parent**,
I want **to remove caregiver access**,
So that **I can manage who has access to my family**.

## Acceptance Criteria

1. **AC1: Immediate Access Revocation**
   - Given caregiver access needs to be removed
   - When parent removes caregiver
   - Then access revoked immediately (within 5 minutes per NFR62)
   - And leverages existing `useCaregiverRevocation` hook (Story 19D.5)

2. **AC2: Caregiver Notification**
   - Given caregiver access is revoked
   - When caregiver attempts to access family
   - Then caregiver sees "Your access has been removed" (existing AccessRevoked component)
   - And no reason displayed unless parent opted to share

3. **AC3: Child Notification**
   - Given caregiver has been removed
   - When child views their dashboard
   - Then child notified: "Grandma is no longer a caregiver"
   - And notification uses child-friendly language (NFR65: 6th-grade reading level)
   - And notification appears in child's activity feed

4. **AC4: Historical Log Preservation**
   - Given caregiver is removed
   - When viewing historical audit logs
   - Then caregiver's past actions remain visible
   - And caregiver name anonymized to "Former Caregiver" in future queries
   - And original caregiver UID preserved for data integrity
   - And anonymization applies only to removed caregiver's display name

5. **AC5: Re-invitation Support**
   - Given caregiver was previously removed
   - When parent wants to re-add same caregiver
   - Then parent can send new invitation
   - And previous removal doesn't block new invitation
   - And new invitation creates fresh caregiver record

6. **AC6: Optional Removal Reason**
   - Given parent is removing caregiver
   - When completing the removal flow
   - Then parent can optionally provide reason
   - And reason stored in audit log (not shared with caregiver)
   - And UI encourages but doesn't require reason

## Tasks / Subtasks

### Task 1: Create Child Notification for Caregiver Removal (AC: #3) [x]

Add notification to child when caregiver is removed.

**Files:**

- `apps/web/src/components/child/CaregiverRemovedNotification.tsx` (new)
- `apps/web/src/components/child/CaregiverRemovedNotification.test.tsx` (new)

**Implementation:**

- Create child-friendly notification component
- Display: "Grandma is no longer a caregiver"
- Use simple language (6th-grade level per NFR65)
- Include optional brief explanation
- Integrate with child activity/notification system
- Dismissible after reading

**Tests:** ~10 tests for component rendering and accessibility

### Task 2: Create Removal Reason Input Component (AC: #6) [x]

Add optional reason input to the revocation flow.

**Files:**

- `apps/web/src/components/caregiver/RemovalReasonInput.tsx` (new)
- `apps/web/src/components/caregiver/RemovalReasonInput.test.tsx` (new)

**Implementation:**

- Optional text area for removal reason
- Placeholder: "Why are you removing this caregiver? (optional)"
- Character limit: 500
- Clear note that reason is private and not shared with caregiver
- Skip button for immediate removal

**Tests:** ~8 tests for input validation and skip functionality

### Task 3: Extend Revocation Hook with Reason (AC: #6) [x]

Extend `useCaregiverRevocation` to accept optional reason.

**Files:**

- `apps/web/src/hooks/useCaregiverRevocation.ts` (modify)
- `apps/web/src/hooks/useCaregiverRevocation.test.ts` (modify)

**Implementation:**

- Add `reason?: string` parameter to `revokeCaregiver` function
- Include reason in audit log metadata
- Maintain backward compatibility (reason is optional)
- Update TypeScript types

**Tests:** ~5 additional tests for reason handling

### Task 4: Implement Caregiver Name Anonymization (AC: #4) [x]

Anonymize removed caregiver's display name in historical queries.

**Files:**

- `apps/web/src/services/caregiverActivityService.ts` (modify)
- `apps/web/src/services/caregiverActivityService.test.ts` (modify)

**Implementation:**

- Add `removedCaregiversMap` parameter to query functions
- When caregiver UID is in removed map, display "Former Caregiver"
- Preserve original data in Firestore (no mutation)
- Only affects display layer, not storage
- Add helper: `anonymizeCaregiverName(uid, name, removedCaregivers)`

**Tests:** ~6 tests for anonymization logic

### Task 5: Create Cloud Function for Removal with Child Notification (AC: #1, #3) [x]

Server-side removal that creates child notification.

**Files:**

- `apps/functions/src/callable/removeCaregiverWithNotification.ts` (new)
- `apps/functions/src/callable/removeCaregiverWithNotification.test.ts` (new)

**Implementation:**

- Wrap existing revocation logic
- Create notification document: `families/{familyId}/childNotifications/{id}`
- Notification schema:
  - `type: 'caregiver_removed'`
  - `childUids: string[]` (all children who had this caregiver)
  - `caregiverName: string`
  - `createdAt: Timestamp`
  - `readBy: string[]`
- Include removal reason in audit log (not in notification)

**Tests:** ~12 tests for function and notification creation

### Task 6: Update RevokeAccessButton to Include Reason (AC: #6) [x]

Integrate reason input into existing revocation button.

**Files:**

- `apps/web/src/components/settings/RevokeAccessButton.tsx` (modify)
- `apps/web/src/components/settings/RevokeAccessButton.test.tsx` (modify)

**Implementation:**

- Add RemovalReasonInput before confirmation
- Pass reason to useCaregiverRevocation hook
- Two-step flow: 1) Optional reason, 2) Confirm revocation
- "Skip & Remove Now" option for immediate removal

**Tests:** ~8 additional tests for reason flow

### Task 7: Create Child Notification Display (AC: #3) [x]

Display caregiver removal notifications in child dashboard.

**Files:**

- `apps/web/src/components/child/ChildNotificationList.tsx` (modify or new)
- `apps/web/src/components/child/ChildNotificationList.test.tsx` (modify or new)

**Implementation:**

- Subscribe to `families/{familyId}/childNotifications`
- Filter to current child's notifications
- Display CaregiverRemovedNotification for 'caregiver_removed' type
- Mark as read when viewed
- Sort by createdAt descending

**Tests:** ~10 tests for notification display and read tracking

### Task 8: Update Component Exports (AC: All) [x]

Export new components.

**Files:**

- `apps/web/src/components/caregiver/index.ts` (modify)
- `apps/web/src/components/child/index.ts` (modify if exists)

**Implementation:**

- Export RemovalReasonInput
- Export CaregiverRemovedNotification
- Export ChildNotificationList if new

**Tests:** No additional tests (export verification)

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)

### Architecture Compliance

From existing Epic 39 patterns:

- "All types from Zod Only" - extend existing schemas as needed
- "Firebase SDK Direct" - use `doc()`, `getDoc()`, `collection()` directly
- "Functions Delegate to Services" - Cloud Functions for business logic

### Existing Infrastructure to Leverage

**From Story 19D.5 (Caregiver Quick Revocation):**

- `useCaregiverRevocation.ts` - Core revocation logic (extend, don't replace)
- `AccessRevoked.tsx` - Caregiver-facing revocation message
- `RevokeAccessButton.tsx` - Parent's revocation UI
- `revokeCaregiverAccess` Cloud Function - Server-side revocation

**From Story 39.6 (Caregiver Action Logging):**

- `caregiverActivityService.ts` - Activity queries (add anonymization)
- `CaregiverActivityDashboard.tsx` - Dashboard showing caregiver activity

### Child Notification Schema

```typescript
// families/{familyId}/childNotifications/{notificationId}
interface ChildNotification {
  id: string
  type: 'caregiver_removed' | 'other_types_later'
  childUids: string[] // Which children should see this
  message: string // "Grandma is no longer a caregiver"
  caregiverName?: string // For caregiver_removed type
  createdAt: Timestamp
  readBy: string[] // UIDs of children who have read
}
```

### Anonymization Logic

```typescript
function formatCaregiverName(
  caregiverUid: string,
  caregiverName: string,
  removedCaregivers: Set<string>
): string {
  if (removedCaregivers.has(caregiverUid)) {
    return 'Former Caregiver'
  }
  return caregiverName
}
```

### File Structure

```
apps/web/src/components/
├── caregiver/
│   ├── RemovalReasonInput.tsx                  # NEW
│   └── RemovalReasonInput.test.tsx             # NEW
├── child/
│   ├── CaregiverRemovedNotification.tsx        # NEW
│   ├── CaregiverRemovedNotification.test.tsx   # NEW
│   ├── ChildNotificationList.tsx               # NEW
│   └── ChildNotificationList.test.tsx          # NEW
├── settings/
│   └── RevokeAccessButton.tsx                  # MODIFY

apps/web/src/hooks/
└── useCaregiverRevocation.ts                   # MODIFY

apps/web/src/services/
└── caregiverActivityService.ts                 # MODIFY

apps/functions/src/callable/
├── removeCaregiverWithNotification.ts          # NEW
└── removeCaregiverWithNotification.test.ts     # NEW
```

### Testing Requirements

- Unit test notification component rendering
- Unit test anonymization logic
- Unit test reason input validation
- Component tests for revocation flow with reason
- Integration test: full removal with child notification
- Test backward compatibility of revocation hook

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR49: 44x44px minimum touch target
- NFR62: Caregiver access revocation within 5 minutes
- NFR65: Text at 6th-grade reading level for child views

### References

- [Source: docs/epics/epic-list.md#Story-39.7]
- [Source: docs/epics/epic-list.md#Epic-39]
- [Source: Story 19D.5 for revocation patterns]
- [Source: Story 39.6 for activity service patterns]
- [Source: apps/web/src/hooks/useCaregiverRevocation.ts]
- [Source: apps/web/src/components/caregiver/AccessRevoked.tsx]

## Dev Agent Record

### Context Reference

- Epic: 39 (Caregiver Full Features)
- Story Key: 39-7-caregiver-removal
- Dependencies: Story 19D.5 (Caregiver Quick Revocation) - COMPLETE
- Dependencies: Story 39.6 (Caregiver Action Logging) - COMPLETE

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

## Change Log

| Date       | Change                        |
| ---------- | ----------------------------- |
| 2026-01-03 | Story created (ready-for-dev) |
