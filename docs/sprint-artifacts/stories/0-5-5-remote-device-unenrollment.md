# Story 0.5.5: Remote Device Unenrollment

Status: done

## Story

As a **support agent**,
I want **to remotely unenroll specific devices from monitoring without notification**,
So that **escaped devices immediately stop reporting to the family**.

## Acceptance Criteria

1. **AC1: Silent device unenrollment command**
   - Given a support agent is processing an escape request
   - When they request silent unenrollment of specified device(s)
   - Then online devices receive unenrollment command within 60 seconds
   - And the device document status is set to 'unenrolled'
   - And the unenrollment is tied to the safety ticket

2. **AC2: Immediate capture cessation**
   - Given a device receives the unenrollment command
   - When the extension next polls `verifyDeviceEnrollment`
   - Then the response indicates `valid: false, status: 'revoked'`
   - And the extension stops capturing and uploading immediately
   - And the extension deletes local cached screenshots and queue

3. **AC3: Offline device queuing**
   - Given a device is offline when unenrollment is requested
   - When the device comes online and polls `verifyDeviceEnrollment`
   - Then it receives the revoked status
   - And the unenrollment applies immediately upon connection

4. **AC4: No notification to any party**
   - Given a device unenrollment is executed
   - When the operation completes
   - Then NO email notification is sent to any family member
   - And NO push notification is sent to any family member
   - And NO in-app notification is created
   - And NO audit log entry appears in family-visible logs

5. **AC5: Neutral user experience on device**
   - Given a device has been unenrolled via safety channel
   - When the child views the device monitoring indicator
   - Then they see "Device no longer monitored" (neutral message)
   - NOT "Removed by support" or any indication of safety action

6. **AC6: Admin audit logging only**
   - Given a device unenrollment is executed
   - When the operation completes
   - Then an entry is created in `adminAuditLogs` collection
   - And the entry includes: agentId, action, timestamp, familyId, deviceId(s), ticketId
   - And NO entry is created in family-visible audit logs

7. **AC7: Integration with safety dashboard**
   - Given a support agent is viewing a safety ticket
   - When the ticket involves an escape request
   - Then they can view and unenroll devices associated with the family
   - And the action is available from the ticket detail view
   - And unenrollment requires identity verification completion (minimum 2 of 4 checks)

8. **AC8: Batch device unenrollment**
   - Given a family has multiple enrolled devices
   - When the support agent initiates unenrollment
   - Then they can select multiple devices to unenroll at once
   - And all selected devices are unenrolled atomically
   - And the action is logged as a single admin audit entry

## Tasks / Subtasks

- [x] Task 1: Create getDevicesForFamily callable function (AC: #7)
  - [x] 1.1 Create `apps/functions/src/callable/admin/getDevicesForFamily.ts`
  - [x] 1.2 Require safety-team role via `requireSafetyTeamRole`
  - [x] 1.3 Accept ticketId parameter
  - [x] 1.4 Look up userId from ticket, then find their familyId
  - [x] 1.5 Return list of active devices: deviceId, name, type, childId, lastSeen, status
  - [x] 1.6 Log access in admin audit

- [x] Task 2: Create unenrollDevicesForSafety callable function (AC: #1, #4, #6, #8)
  - [x] 2.1 Create `apps/functions/src/callable/admin/unenrollDevicesForSafety.ts`
  - [x] 2.2 Require safety-team role via `requireSafetyTeamRole`
  - [x] 2.3 Validate input: ticketId, familyId, deviceIds array
  - [x] 2.4 Verify ticket exists and has minimum 2 of 4 identity verification checks
  - [x] 2.5 Batch update all specified device documents: status = 'unenrolled', unenrolledAt, unenrolledBy (with safety flag)
  - [x] 2.6 Add 'safetyUnenrollment: true' flag to distinguish from normal removal
  - [x] 2.7 Log action to adminAuditLogs with full context (single entry for batch)
  - [x] 2.8 NO family audit log entry (CRITICAL)
  - [x] 2.9 NO notification to any party (CRITICAL)
  - [x] 2.10 Update ticket with internal note about devices unenrolled

- [x] Task 3: Add input schemas to shared contracts (AC: #1, #7)
  - [x] 3.1 Add `unenrollDevicesForSafetyInputSchema` to `packages/shared/src/contracts/index.ts`
  - [x] 3.2 Define fields: ticketId, familyId, deviceIds (string array)
  - [x] 3.3 Add response type exports

- [x] Task 4: Create SafetyDeviceUnenrollSection component (AC: #7, #8)
  - [x] 4.1 Create `apps/web/src/components/admin/SafetyDeviceUnenrollSection.tsx`
  - [x] 4.2 Display list of family devices with checkboxes
  - [x] 4.3 Show device name, type, assigned child, last seen
  - [x] 4.4 Allow multi-select for batch unenrollment
  - [x] 4.5 Show warning about irreversible action
  - [x] 4.6 Require confirmation before executing

- [x] Task 5: Create useDevicesForFamily hook (AC: #7)
  - [x] 5.1 Create `apps/web/src/hooks/useDevicesForFamily.ts`
  - [x] 5.2 Call getDevicesForFamily callable function
  - [x] 5.3 Handle loading and error states
  - [x] 5.4 Return device list for UI

- [x] Task 6: Create useUnenrollDevices hook (AC: #1, #8)
  - [x] 6.1 Create `apps/web/src/hooks/useUnenrollDevices.ts`
  - [x] 6.2 Call unenrollDevicesForSafety callable function
  - [x] 6.3 Handle loading and error states
  - [x] 6.4 Return success state for UI updates

- [x] Task 7: Integrate into SafetyTicketDetail page (AC: #7)
  - [x] 7.1 Modify `apps/web/src/app/admin/safety/[ticketId]/page.tsx`
  - [x] 7.2 Add SafetyDeviceUnenrollSection below parent severing section
  - [x] 7.3 Only show when identity verification threshold met (minimum 2 of 4)
  - [x] 7.4 Load devices on section mount
  - [x] 7.5 Update UI after successful unenrollment

- [x] Task 8: Add unit tests (AC: #1-8)
  - [x] 8.1 Test getDevicesForFamily requires safety-team role
  - [x] 8.2 Test getDevicesForFamily returns device list
  - [x] 8.3 Test unenrollDevicesForSafety validates input
  - [x] 8.4 Test unenrollDevicesForSafety requires safety-team role
  - [x] 8.5 Test unenrollDevicesForSafety requires minimum 2 verification checks
  - [x] 8.6 Test unenrollDevicesForSafety updates device status to 'unenrolled'
  - [x] 8.7 Test unenrollDevicesForSafety sets safetyUnenrollment flag
  - [x] 8.8 Test unenrollDevicesForSafety creates adminAuditLog entry
  - [x] 8.9 Test unenrollDevicesForSafety does NOT create family audit log
  - [x] 8.10 Test unenrollDevicesForSafety handles batch of devices
  - [x] 8.11 Test SafetyDeviceUnenrollSection renders device list
  - [x] 8.12 Test SafetyDeviceUnenrollSection allows multi-select
  - [x] 8.13 Test useDevicesForFamily handles success/error
  - [x] 8.14 Test useUnenrollDevices handles success/error
  - [x] 8.15 Minimum 15 tests required (106 total tests added)

## Dev Notes

### Implementation Strategy

This story implements the capability to remotely unenroll specific devices from monitoring as part of the safe escape pathway. The existing `removeDevice` callable function handles normal device removal by parents, but this story adds a safety-team-only function that:

1. Operates without any notification or family audit logging
2. Requires safety ticket with identity verification
3. Adds a `safetyUnenrollment: true` flag to distinguish from normal removal
4. Supports batch unenrollment for efficiency

**CRITICAL SAFETY REQUIREMENTS:**

1. **No Notification Leakage**: NO emails, push notifications, SMS, or in-app notifications
2. **No Audit Trail Leakage**: Family audit logs must NOT contain any reference to unenrollment
3. **Neutral User Experience**: Device shows "no longer monitored" - NOT "removed by support"
4. **Immediate Effect**: Online devices receive revoked status within 60 seconds (next poll cycle)

### Device Polling Behavior

The Chrome extension already polls `verifyDeviceEnrollment` to check enrollment validity. When status is 'unenrolled', the response is `valid: false, status: 'revoked'`. The extension should:

1. Stop all capture immediately
2. Delete local screenshot queue
3. Show neutral "no longer monitored" state

This behavior already exists in the extension for normal device removal - safety unenrollment leverages the same mechanism.

### Dependencies

**Story Dependencies:**

- Story 0.5.3: Support Agent Escape Dashboard (provides identity verification checklist, safety-team role)
- Story 0.5.4: Parent Access Severing (may be triggered alongside unenrollment)
- Story 12.4: Device Registration in Firestore (device document structure)
- Story 12.6: Enrollment State Persistence (verifyDeviceEnrollment endpoint)

**External Dependencies:**

- Firebase Firestore (families/{familyId}/devices/{deviceId} structure)
- Admin audit logging system (from Story 0.5.3)
- Safety team role checking (from Story 0.5.3)

### Existing Code to Leverage

**From Story 0.5.3:**

- `apps/functions/src/utils/safetyTeamAuth.ts` - Role verification helper
- `apps/functions/src/utils/adminAudit.ts` - Admin audit logging
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Ticket detail page to extend

**From Enrollment (Story 12.x):**

- `apps/functions/src/callable/enrollment.ts` - Device document structure, removeDevice pattern
- `verifyDeviceEnrollment` endpoint already returns 'revoked' for unenrolled devices
- Device interface: deviceId, type, status, childId, lastSeen, etc.

**From Story 0.5.4:**

- Pattern for admin callable functions requiring safety-team role
- Pattern for NO notification and NO family audit logging
- Pattern for verification threshold checking

### Data Model Understanding

**Device Document Structure (from enrollment.ts):**

```typescript
interface Device {
  deviceId: string
  type: 'chromebook' | 'android'
  enrolledAt: Timestamp
  enrolledBy: string
  childId: string | null
  name: string
  lastSeen: Timestamp
  status: 'active' | 'offline' | 'unenrolled'
  metadata: { ... }
  // Story 13.1: TOTP fields
  totpSecret: string
  totpCreatedAt: Timestamp
  totpAlgorithm: 'SHA1'
  totpDigits: 6
  totpPeriod: 30
}
```

**Safety Unenrollment adds:**

```typescript
{
  status: 'unenrolled',
  unenrolledAt: Timestamp,
  unenrolledBy: string, // agentId, not userId
  safetyUnenrollment: true, // Distinguishes from normal removal
  safetyTicketId: string, // Links to safety ticket
}
```

### Callable Function Pattern

```typescript
// apps/functions/src/callable/admin/unenrollDevicesForSafety.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const unenrollDevicesForSafetyInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  deviceIds: z.array(z.string().min(1)).min(1).max(50),
})

export const unenrollDevicesForSafety = onCall({ cors: true }, async (request) => {
  // 1. Verify safety-team role
  const context = await requireSafetyTeamRole(request, 'unenroll_devices_for_safety')

  // 2. Validate input
  const parseResult = unenrollDevicesForSafetyInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid parameters')
  }
  const { ticketId, familyId, deviceIds } = parseResult.data

  // 3. Verify ticket and verification threshold
  // ... similar to severParentAccess

  // 4. Batch update devices
  const batch = db.batch()
  for (const deviceId of deviceIds) {
    const deviceRef = db.doc(`families/${familyId}/devices/${deviceId}`)
    batch.update(deviceRef, {
      status: 'unenrolled',
      unenrolledAt: FieldValue.serverTimestamp(),
      unenrolledBy: context.agentId,
      safetyUnenrollment: true,
      safetyTicketId: ticketId,
    })
  }
  await batch.commit()

  // 5. Log to admin audit ONLY (single entry for batch)
  await logAdminAction({ ... })

  // CRITICAL: NO notification
  // CRITICAL: NO family audit log

  return { success: true, message: 'Devices unenrolled' }
})
```

### Security Considerations

1. **Role Verification**: Every callable checks safety-team claim
2. **Verification Threshold**: Requires minimum 2 of 4 identity checks
3. **Audit Completeness**: Admin audit captures full context including all deviceIds
4. **No Cross-Contamination**: Family audit remains untouched
5. **Batch Atomicity**: All devices in batch unenrolled or none

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/callable/admin/getDevicesForFamily.ts` - Device lookup callable
- `apps/functions/src/callable/admin/getDevicesForFamily.test.ts` - Function tests
- `apps/functions/src/callable/admin/unenrollDevicesForSafety.ts` - Unenrollment callable
- `apps/functions/src/callable/admin/unenrollDevicesForSafety.test.ts` - Function tests
- `apps/web/src/components/admin/SafetyDeviceUnenrollSection.tsx` - Device list component
- `apps/web/src/components/admin/SafetyDeviceUnenrollSection.test.tsx` - Component tests
- `apps/web/src/hooks/useDevicesForFamily.ts` - Device lookup hook
- `apps/web/src/hooks/useDevicesForFamily.test.ts` - Hook tests
- `apps/web/src/hooks/useUnenrollDevices.ts` - Unenrollment hook
- `apps/web/src/hooks/useUnenrollDevices.test.ts` - Hook tests

**Files to Modify:**

- `packages/shared/src/contracts/index.ts` - Add unenrollment schemas
- `apps/functions/src/utils/adminAudit.ts` - Add 'unenroll_devices_for_safety' action type
- `apps/functions/src/index.ts` - Export new callable functions
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Add device section

### Testing Requirements

**Unit Tests (minimum 15):**

1. getDevicesForFamily validates input schema
2. getDevicesForFamily requires safety-team role
3. getDevicesForFamily returns device list with correct fields
4. unenrollDevicesForSafetyInputSchema validates correct input
5. unenrollDevicesForSafetyInputSchema rejects empty deviceIds
6. unenrollDevicesForSafety requires safety-team role
7. unenrollDevicesForSafety requires minimum 2 verification checks
8. unenrollDevicesForSafety updates device status to 'unenrolled'
9. unenrollDevicesForSafety sets safetyUnenrollment flag
10. unenrollDevicesForSafety handles batch of devices
11. unenrollDevicesForSafety creates adminAuditLog entry
12. unenrollDevicesForSafety does NOT create family auditLog (code review)
13. SafetyDeviceUnenrollSection renders device list
14. SafetyDeviceUnenrollSection allows multi-select
15. useDevicesForFamily handles success
16. useUnenrollDevices handles success/error

**Integration Tests (code review verification):**

1. CRITICAL: Verify NO family audit log entry created
2. CRITICAL: Verify NO notification sent
3. Verify device status changes to 'unenrolled'
4. Verify safetyUnenrollment flag is set

### Edge Cases

1. **No devices enrolled**: Show "No devices found" message
2. **All devices already unenrolled**: Return idempotent success
3. **Some devices already unenrolled**: Skip those, unenroll remaining
4. **Device not found**: Skip missing devices, unenroll found ones
5. **Network error during batch**: Transaction should rollback
6. **Verification incomplete**: Block unenrollment until threshold met
7. **Empty deviceIds array**: Reject with validation error

### Accessibility Requirements

- Device list has proper table semantics
- Checkboxes have accessible labels
- Confirmation has clear instructions
- Error messages announced to screen readers
- Keyboard navigation for device selection

### Previous Story Intelligence

**From Story 0.5.4:**

- Admin callable functions use `requireSafetyTeamRole` for access control
- Admin audit uses `logAdminAction` from `utils/adminAudit.ts`
- Identity verification threshold: minimum 2 of 4 checks
- Pattern for NO notification and NO family audit logging
- Internal notes use `FieldValue.arrayUnion` to append

**From Story 0.5.3:**

- Safety ticket structure with verification object
- Identity verification fields: phoneVerified, idDocumentVerified, accountMatchVerified, securityQuestionsVerified

### References

- [Source: docs/epics/epic-list.md#Story-0.5.5 - Remote Device Unenrollment acceptance criteria]
- [Source: Story 0.5.4 - Parent Access Severing patterns for admin callables]
- [Source: Story 0.5.3 - Support Agent Escape Dashboard patterns]
- [Source: apps/functions/src/callable/enrollment.ts - Device document structure and removeDevice pattern]
- [Source: apps/functions/src/http/sync/health.ts - Device health sync pattern]
- [Source: docs/architecture/implementation-patterns-consistency-rules.md - Naming and structure patterns]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Implemented getDevicesForFamily callable function for device lookup via safety ticket
- Implemented unenrollDevicesForSafety callable function for batch device unenrollment
- Added Zod schemas for input/output validation in shared contracts
- Created SafetyDeviceUnenrollSection component with multi-select checkboxes and confirmation flow
- Created useDevicesForFamily hook for device list fetching
- Created useUnenrollDevices hook for batch unenrollment operations
- Integrated device unenrollment section into SafetyTicketDetail page (shown when verification >= 2/4)
- CRITICAL: No notification sent on unenrollment (verified by code review)
- CRITICAL: No family audit log written (verified by code review)
- Added 106 unit tests (19 for getDevicesForFamily, 44 for unenrollDevicesForSafety, 26 for component, 17 for hooks)
- All 2701 tests pass (549 functions + 2152 web)
- Build succeeds without errors

### File List

**New Files:**

- apps/functions/src/callable/admin/getDevicesForFamily.ts
- apps/functions/src/callable/admin/getDevicesForFamily.test.ts
- apps/functions/src/callable/admin/unenrollDevicesForSafety.ts
- apps/functions/src/callable/admin/unenrollDevicesForSafety.test.ts
- apps/web/src/components/admin/SafetyDeviceUnenrollSection.tsx
- apps/web/src/components/admin/SafetyDeviceUnenrollSection.test.tsx
- apps/web/src/hooks/useDevicesForFamily.ts
- apps/web/src/hooks/useDevicesForFamily.test.ts
- apps/web/src/hooks/useUnenrollDevices.ts
- apps/web/src/hooks/useUnenrollDevices.test.ts

**Modified Files:**

- packages/shared/src/contracts/index.ts - Added device unenrollment schemas
- apps/functions/src/utils/adminAudit.ts - Added new action and resource types
- apps/functions/src/index.ts - Exported new callable functions
- apps/web/src/app/admin/safety/[ticketId]/page.tsx - Added device unenrollment section
