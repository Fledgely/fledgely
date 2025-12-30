# Story 0.5.4: Parent Access Severing

Status: done

## Story

As a **support agent**,
I want **to sever one parent's access without affecting the other parent or child data**,
So that **victims can be extracted cleanly while preserving family integrity**.

## Acceptance Criteria

1. **AC1: Parent access immediately revoked**
   - Given a support agent has verified a safety request via the safety dashboard
   - When they execute account severing for a specific parent
   - Then that parent's access to all family data is immediately revoked
   - And the parent's UID is removed from the family's `guardianUids` array
   - And the parent's entry is removed from the family's `guardians` array

2. **AC2: Other parent access remains intact**
   - Given a parent has been severed from a two-parent family
   - When the other parent accesses the family
   - Then their access remains completely unchanged
   - And they see all the same data as before
   - And all their permissions work as normal

3. **AC3: Child profiles and data remain intact**
   - Given a parent has been severed from a family
   - When viewing the family's children
   - Then all child profiles remain in place
   - And all child data (screenshots, agreements, etc.) remains accessible to remaining guardian(s)
   - And child accounts remain functional

4. **AC4: Severed parent can still authenticate**
   - Given a parent's access has been severed
   - When they attempt to log in to fledgely
   - Then their authentication credentials work normally (they can log in)
   - But they see "No families found" message
   - NOT "You've been removed" or any indication of severing

5. **AC5: No notification sent about severing**
   - Given a severing action is executed
   - When the operation completes
   - Then NO email notification is sent to any party
   - And NO push notification is sent to any party
   - And NO in-app notification is created for any family member

6. **AC6: Severing logged in sealed admin audit only**
   - Given a severing action is executed
   - When the operation completes
   - Then an entry is created in `adminAuditLogs` collection
   - And the entry includes: agentId, action, timestamp, familyId, severedUserId
   - And NO entry is created in the family's `auditLogs` collection
   - And NO entry appears in family-visible activity logs

7. **AC7: Integration with safety dashboard**
   - Given a support agent is viewing a safety ticket in the dashboard
   - When the ticket involves a family member needing escape
   - Then they can initiate severing from the ticket detail view
   - And severing requires identity verification completion (AC4 from Story 0.5.3)
   - And severing action is linked to the safety ticket

8. **AC8: Severing confirmation workflow**
   - Given a support agent initiates severing
   - When they attempt to execute the action
   - Then they must confirm the action (to prevent accidental clicks)
   - And the confirmation shows the family name and parent being severed
   - And the confirmation requires typing a confirmation phrase

## Tasks / Subtasks

- [x] Task 1: Create severParentAccess callable function (AC: #1, #2, #3, #5, #6)
  - [x] 1.1 Create `apps/functions/src/callable/admin/severParentAccess.ts`
  - [x] 1.2 Require safety-team role in custom claims
  - [x] 1.3 Validate input: ticketId, familyId, parentUid
  - [x] 1.4 Verify ticket exists and has sufficient identity verification
  - [x] 1.5 Remove parent UID from family's `guardianUids` array using `FieldValue.arrayRemove`
  - [x] 1.6 Remove parent entry from family's `guardians` array (filter by uid)
  - [x] 1.7 Do NOT modify child documents (they reference family, not specific parent)
  - [x] 1.8 Log action to adminAuditLogs with full context
  - [x] 1.9 NO audit log entry in family's auditLogs
  - [x] 1.10 NO notification to any party
  - [x] 1.11 Return success response with minimal details

- [x] Task 2: Create severParentAccess input schema (AC: #1, #7, #8)
  - [x] 2.1 Add `severParentAccessInputSchema` to `packages/shared/src/contracts/index.ts`
  - [x] 2.2 Define fields: ticketId, familyId, parentUid, confirmationPhrase
  - [x] 2.3 Confirmation phrase should be: "SEVER {parentEmail}"
  - [x] 2.4 Add type exports

- [x] Task 3: Add admin audit action types (AC: #6)
  - [x] 3.1 Update `apps/functions/src/utils/adminAudit.ts`
  - [x] 3.2 Add new action type: 'sever_parent_access'
  - [x] 3.3 Add new resource type: 'family' (existing: safety_ticket, safety_document, safety_dashboard)

- [x] Task 4: Create SafetySeverParentModal component (AC: #7, #8)
  - [x] 4.1 Create `apps/web/src/components/admin/SafetySeverParentModal.tsx`
  - [x] 4.2 Display confirmation dialog with family name, parent email
  - [x] 4.3 Require typing confirmation phrase (case-sensitive match)
  - [x] 4.4 Show list of verification items completed (from ticket)
  - [x] 4.5 Show warning about action being irreversible
  - [x] 4.6 Disable confirm button until phrase matches
  - [x] 4.7 Use calming but serious styling (not alarming red)

- [x] Task 5: Create useSeverParentAccess hook (AC: #1, #8)
  - [x] 5.1 Create `apps/web/src/hooks/useSeverParentAccess.ts`
  - [x] 5.2 Call severParentAccess callable function
  - [x] 5.3 Handle loading and error states
  - [x] 5.4 Return success state for UI updates

- [x] Task 6: Integrate severing into SafetyTicketDetail page (AC: #7)
  - [x] 6.1 Modify `apps/web/src/app/admin/safety/[ticketId]/page.tsx`
  - [x] 6.2 Add "Sever Parent Access" action button when applicable
  - [x] 6.3 Only show button when identity verification threshold met (minimum 2 of 4 checks)
  - [x] 6.4 Clicking button opens SafetySeverParentModal
  - [x] 6.5 After successful severing, update ticket status and add internal note

- [x] Task 7: Create getFamilyForSevering callable function (AC: #7)
  - [x] 7.1 Create `apps/functions/src/callable/admin/getFamilyForSevering.ts`
  - [x] 7.2 Require safety-team role
  - [x] 7.3 Accept ticketId (lookup userId from ticket)
  - [x] 7.4 Return family info: id, name, guardians array with minimal info (uid, email, role)
  - [x] 7.5 Return which parent is requesting escape (if userId on ticket matches a guardian)
  - [x] 7.6 Log access in admin audit

- [x] Task 8: Add unit tests (AC: #1-8)
  - [x] 8.1 Test severParentAccess validates input schema
  - [x] 8.2 Test severParentAccess requires safety-team role
  - [x] 8.3 Test severParentAccess removes parent from guardianUids
  - [x] 8.4 Test severParentAccess removes parent from guardians array
  - [x] 8.5 Test severing does NOT modify child documents
  - [x] 8.6 Test severing creates adminAuditLog entry
  - [x] 8.7 Test severing does NOT create family auditLog entry
  - [x] 8.8 Test severParentAccess requires confirmation phrase
  - [x] 8.9 Test SafetySeverParentModal renders confirmation UI
  - [x] 8.10 Test SafetySeverParentModal disables confirm until phrase matches
  - [x] 8.11 Test useSeverParentAccess handles success/error
  - [x] 8.12 Test getFamilyForSevering returns correct family data
  - [x] 8.13 Minimum 15 tests required (96 tests implemented)

## Dev Notes

### Implementation Strategy

This story implements the critical capability to remove an abusive parent's access to the family while preserving the family for the remaining guardian and children. This is a **life-safety feature** that enables domestic abuse victims to escape safely.

**CRITICAL SAFETY REQUIREMENTS:**

1. **Immediate Revocation**: Access must be revoked atomically - no partial states where severed parent could still see some data
2. **No Notification Leakage**: NO emails, push notifications, SMS, or in-app notifications of any kind
3. **No Audit Trail Leakage**: Family audit logs must NOT contain any reference to severing
4. **Neutral User Experience**: Severed parent sees "No families found" - NOT "You've been removed" or any indication of severing
5. **Data Integrity**: Child profiles and all family data remain intact for remaining guardian(s)

### Dependencies

**Story Dependencies:**

- Story 0.5.1: Secure Safety Contact Channel (creates /safetyTickets collection)
- Story 0.5.2: Safety Request Documentation Upload (creates /safetyDocuments collection)
- Story 0.5.3: Support Agent Escape Dashboard (provides identity verification checklist)

**External Dependencies:**

- Firebase Firestore (families collection structure)
- Firebase Auth (user authentication unchanged)
- Admin audit logging system (from Story 0.5.3)
- Safety team role checking (from Story 0.5.3)

**Future Stories That Depend On This:**

- Story 0.5.5: Remote Device Unenrollment (may be triggered alongside severing)
- Story 0.5.6: Location Feature Emergency Disable (may be triggered alongside severing)

### Existing Code to Leverage

**From Story 0.5.3:**

- `apps/functions/src/utils/safetyTeamAuth.ts` - Role verification helper
- `apps/functions/src/utils/adminAudit.ts` - Admin audit logging
- `apps/functions/src/callable/admin/updateSafetyTicket.ts` - Pattern for admin callable functions
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Ticket detail page to extend

**From Family Management (Epic 2):**

- `packages/shared/src/contracts/index.ts` - familySchema, guardianUids structure
- `packages/firebase-rules/firestore.rules` - guardianUids access patterns

### Data Model Understanding

**Family Document Structure:**

```typescript
interface Family {
  id: string
  name: string
  guardians: Array<{
    uid: string
    email: string
    displayName: string
    role: 'primary' | 'co-parent'
    addedAt: Date
  }>
  guardianUids: string[] // Denormalized for Firestore rules
  createdAt: Date
  updatedAt: Date
}
```

**Severing Operation:**

1. Remove parent UID from `guardianUids` array
2. Remove parent entry from `guardians` array (filter by uid)
3. Family document remains valid with remaining guardian(s)
4. Child documents unchanged (they reference familyId, not specific parents)

### Callable Function Pattern

```typescript
// apps/functions/src/callable/admin/severParentAccess.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

const severParentAccessInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  parentUid: z.string().min(1),
  confirmationPhrase: z.string().min(1),
})

export const severParentAccess = onCall({ cors: true }, async (request) => {
  // 1. Verify safety-team role
  const context = await requireSafetyTeamRole(request, 'sever_parent_access')

  // 2. Validate input
  const parseResult = severParentAccessInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid parameters')
  }
  const { ticketId, familyId, parentUid, confirmationPhrase } = parseResult.data

  // 3. Verify ticket exists and has identity verification
  const ticketRef = db.collection('safetyTickets').doc(ticketId)
  const ticket = await ticketRef.get()
  if (!ticket.exists) {
    throw new HttpsError('not-found', 'Ticket not found')
  }
  const ticketData = ticket.data()

  // Check minimum verification threshold (2 of 4)
  const verification = ticketData?.verification || {}
  const verifiedCount = [
    verification.phoneVerified,
    verification.idDocumentVerified,
    verification.accountMatchVerified,
    verification.securityQuestionsVerified,
  ].filter(Boolean).length

  if (verifiedCount < 2) {
    throw new HttpsError('failed-precondition', 'Insufficient identity verification')
  }

  // 4. Get family and verify parent exists
  const familyRef = db.collection('families').doc(familyId)
  const family = await familyRef.get()
  if (!family.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }
  const familyData = family.data()

  const parentToSever = familyData?.guardians?.find((g: { uid: string }) => g.uid === parentUid)
  if (!parentToSever) {
    throw new HttpsError('not-found', 'Parent not found in family')
  }

  // 5. Verify confirmation phrase
  const expectedPhrase = `SEVER ${parentToSever.email}`
  if (confirmationPhrase !== expectedPhrase) {
    throw new HttpsError('invalid-argument', 'Confirmation phrase does not match')
  }

  // 6. Ensure at least one guardian remains
  if (familyData?.guardianUids?.length <= 1) {
    throw new HttpsError('failed-precondition', 'Cannot sever last guardian')
  }

  // 7. Execute severing - atomic update
  await familyRef.update({
    guardianUids: FieldValue.arrayRemove(parentUid),
    guardians: familyData?.guardians?.filter((g: { uid: string }) => g.uid !== parentUid),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // 8. Log to admin audit ONLY (CRITICAL: NO family audit)
  await logAdminAction({
    agentId: context.agentId,
    agentEmail: context.agentEmail,
    action: 'sever_parent_access',
    resourceType: 'family',
    resourceId: familyId,
    metadata: {
      ticketId,
      severedParentUid: parentUid,
      severedParentEmail: parentToSever.email,
      remainingGuardians: familyData?.guardianUids?.length - 1,
    },
    ipAddress: context.ipAddress,
  })

  // 9. Update safety ticket with internal note
  await ticketRef.update({
    internalNotes: FieldValue.arrayUnion({
      id: `note_sever_${Date.now()}`,
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      content: `Parent access severed: ${parentToSever.email} removed from family "${familyData?.name}"`,
      createdAt: new Date(),
    }),
    history: FieldValue.arrayUnion({
      action: 'parent_access_severed',
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      timestamp: FieldValue.serverTimestamp(),
      details: `Family: ${familyId}, Parent: ${parentUid}`,
    }),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // CRITICAL: NO notification to any party
  // CRITICAL: NO family audit log entry

  return {
    success: true,
    message: 'Access severed successfully',
  }
})
```

### Severing Modal Component

```typescript
// apps/web/src/components/admin/SafetySeverParentModal.tsx
export interface SafetySeverParentModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string
  family: {
    id: string
    name: string
    guardians: Array<{
      uid: string
      email: string
      displayName: string
      role: string
    }>
  }
  parentToSever: {
    uid: string
    email: string
    displayName: string
  }
  verificationStatus: {
    phoneVerified: boolean
    idDocumentVerified: boolean
    accountMatchVerified: boolean
    securityQuestionsVerified: boolean
  }
  onSuccess: () => void
}
```

### Security Considerations

1. **Role Verification**: Every callable checks safety-team claim
2. **Confirmation Phrase**: Prevents accidental severing
3. **Verification Threshold**: Requires identity verification before severing
4. **Audit Completeness**: Admin audit captures full context
5. **Data Integrity**: Family document updates are atomic
6. **No Cross-Contamination**: Family audit remains untouched

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/callable/admin/severParentAccess.ts` - Severing callable function
- `apps/functions/src/callable/admin/severParentAccess.test.ts` - Function tests
- `apps/functions/src/callable/admin/getFamilyForSevering.ts` - Family lookup callable
- `apps/functions/src/callable/admin/getFamilyForSevering.test.ts` - Function tests
- `apps/web/src/components/admin/SafetySeverParentModal.tsx` - Confirmation modal
- `apps/web/src/components/admin/SafetySeverParentModal.test.tsx` - Component tests
- `apps/web/src/hooks/useSeverParentAccess.ts` - Severing hook
- `apps/web/src/hooks/useSeverParentAccess.test.ts` - Hook tests

**Files to Modify:**

- `packages/shared/src/contracts/index.ts` - Add severParentAccessInputSchema
- `apps/functions/src/utils/adminAudit.ts` - Add new action type
- `apps/functions/src/index.ts` - Export new callable functions
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Add severing action button
- `docs/sprint-artifacts/sprint-status.yaml` - Update story status

### Testing Requirements

**Unit Tests (minimum 15):**

1. severParentAccessInputSchema validates correct input
2. severParentAccessInputSchema rejects missing fields
3. severParentAccess requires safety-team role
4. severParentAccess requires minimum 2 verification checks
5. severParentAccess validates confirmation phrase
6. severParentAccess removes parent from guardianUids
7. severParentAccess removes parent from guardians array
8. severParentAccess prevents severing last guardian
9. severParentAccess creates adminAuditLog entry
10. severParentAccess does NOT create family auditLog (code review)
11. getFamilyForSevering returns family with guardians
12. SafetySeverParentModal renders confirmation UI
13. SafetySeverParentModal disables button until phrase matches
14. useSeverParentAccess handles success
15. useSeverParentAccess handles error

**Integration Tests (code review verification):**

1. CRITICAL: Verify NO family audit log entry created
2. CRITICAL: Verify NO notification sent
3. Verify severed parent cannot access family data
4. Verify remaining guardian can access family normally

### Edge Cases

1. **Single guardian family**: Prevent severing - must have at least one guardian remaining
2. **Guardian not found**: Return neutral error (don't reveal family structure)
3. **Verification incomplete**: Block severing until threshold met
4. **Wrong confirmation phrase**: Reject with clear error
5. **Network error during severing**: Must be atomic - no partial state
6. **Ticket already resolved**: Allow severing (victim may need help after initial resolution)
7. **Parent already severed**: Return idempotent success (no error)

### Accessibility Requirements

- Modal has proper ARIA labels and role="dialog"
- Confirmation input has clear label and instructions
- Focus trapped in modal when open
- Escape key closes modal
- Error messages announced to screen readers
- Warning text uses semantic markup

### Previous Story Intelligence

**From Story 0.5.3:**

- Admin callable functions use `requireSafetyTeamRole` for access control
- Admin audit uses `logAdminAction` from `utils/adminAudit.ts`
- Identity verification is stored in ticket's `verification` object
- Internal notes use `FieldValue.arrayUnion` to append
- History entries track all agent actions

**From Story 0.5.1 & 0.5.2:**

- NO audit logging for safety features
- Neutral success/error messages
- Safety data is isolated from family data

### References

- [Source: docs/epics/epic-list.md#Story-0.5.4 - Parent Access Severing acceptance criteria]
- [Source: Story 0.5.3 - Support Agent Escape Dashboard patterns]
- [Source: Story 0.5.1 - Safety callable function patterns]
- [Source: docs/architecture/implementation-patterns-consistency-rules.md - Naming and structure patterns]
- [Source: packages/firebase-rules/firestore.rules - guardianUids access patterns]
- [Source: packages/shared/src/contracts/index.ts - familySchema structure]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- All 8 tasks completed successfully
- 96 unit tests implemented and passing (50 functions + 46 web)
- Build passes with no errors
- Critical safety requirements verified: NO family audit logs, NO notifications

### File List

**Created:**

- `apps/functions/src/callable/admin/severParentAccess.ts` - Main severing callable
- `apps/functions/src/callable/admin/severParentAccess.test.ts` - 24 tests
- `apps/functions/src/callable/admin/getFamilyForSevering.ts` - Family lookup callable
- `apps/functions/src/callable/admin/getFamilyForSevering.test.ts` - 26 tests
- `apps/web/src/components/admin/SafetySeverParentModal.tsx` - Confirmation modal
- `apps/web/src/components/admin/SafetySeverParentModal.test.tsx` - 31 tests
- `apps/web/src/hooks/useSeverParentAccess.ts` - Severing hook
- `apps/web/src/hooks/useSeverParentAccess.test.ts` - 15 tests

**Modified:**

- `packages/shared/src/contracts/index.ts` - Added severing schemas
- `apps/functions/src/utils/adminAudit.ts` - Added new action/resource types
- `apps/functions/src/index.ts` - Exported new callable functions
- `apps/web/src/app/admin/safety/[ticketId]/page.tsx` - Integrated severing button and modal
