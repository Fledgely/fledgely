# Story 2.8: Unilateral Self-Removal (Survivor Escape)

Status: Done

## Story

As a **parent in an unsafe situation**,
I want **to immediately remove my own access without waiting 30 days**,
so that **I can escape the shared account without my abuser's cooperation**.

## Acceptance Criteria

1. **AC1: Immediate self-removal option**
   - Given a guardian of a family
   - When they navigate to family settings or profile
   - Then they see a "Remove myself from this family" option
   - And the option is clearly distinguished from "Delete family" (Story 2.7)

2. **AC2: Safety confirmation with resources**
   - Given a guardian selects self-removal
   - When the confirmation modal appears
   - Then it displays domestic abuse resources (links to Epic 0.5 safety channel)
   - And uses neutral, non-alarming language
   - And requires explicit confirmation ("I understand this is immediate")

3. **AC3: Immediate access revocation**
   - Given a guardian confirms self-removal
   - When the action is executed
   - Then their access is immediately revoked (no 30-day wait)
   - And they are signed out from the application
   - And they can no longer see any family data

4. **AC4: Other parent access remains intact**
   - Given a guardian removes themselves
   - When the action completes
   - Then the other parent's access remains completely intact
   - And child data remains intact
   - And family functionality continues for remaining guardians

5. **AC5: Guardian entry removal**
   - Given a guardian removes themselves
   - When the action completes
   - Then their guardian entry is removed from the family document
   - And their UID is removed from guardianUids array
   - And their UID is removed from all child guardianUids arrays

6. **AC6: Silent departure (no notifications)**
   - Given a guardian removes themselves
   - When the action completes
   - Then NO notification is sent to other family members
   - And no email, push, or in-app alert is generated
   - And the remaining guardian sees no indication of departure in normal UI

7. **AC7: Sealed audit only**
   - Given a guardian removes themselves
   - When the action completes
   - Then the action is logged in sealed audit only (Story 0.5.8)
   - And the action is NOT visible in family auditLogs
   - And only safety-team/legal-compliance can access the sealed log

8. **AC8: Post-removal user experience**
   - Given a guardian has removed themselves
   - When they next access the application
   - Then they see "No families found" (same as new user)
   - And they do NOT see "You were removed" or any removal indication
   - And they can create a new family if desired

## Tasks / Subtasks

- [x] Task 1: Add self-removal action to web UI (AC: #1, #2)
  - [x] 1.1 Add "Remove myself from this family" option to family settings/profile
  - [x] 1.2 Create SelfRemovalModal component with safety resources
  - [x] 1.3 Use neutral language (no "escape", "abuse", "danger" terms)
  - [x] 1.4 Add explicit confirmation checkbox and button
  - [x] 1.5 Link to safety contact channel (Epic 0.5)

- [x] Task 2: Create selfRemoveFromFamily callable function (AC: #3, #4, #5, #6, #7)
  - [x] 2.1 Create /apps/functions/src/callable/selfRemoveFromFamily.ts
  - [x] 2.2 Validate caller is authenticated and a guardian of the family
  - [x] 2.3 Remove user from family.guardianUids and family.guardians arrays
  - [x] 2.4 Remove user from all children's guardianUids arrays
  - [x] 2.5 Clear user's familyId in user document
  - [x] 2.6 Use Firestore transaction for atomicity
  - [x] 2.7 CRITICAL: DO NOT send any notifications
  - [x] 2.8 CRITICAL: DO NOT log to family auditLogs

- [x] Task 3: Implement sealed audit logging for self-removal (AC: #7)
  - [x] 3.1 Create sealed audit entry for self-removal action
  - [x] 3.2 Use existing sealAuditEntry infrastructure (Story 0.5.8)
  - [x] 3.3 Store sealReason as 'escape_action'
  - [x] 3.4 Include user context in sealed entry metadata

- [x] Task 4: Add admin audit type for self-removal (AC: #7)
  - [x] 4.1 Add 'self_remove_from_family' to AdminAuditAction type
  - [x] 4.2 Log to adminAuditLogs for compliance tracking

- [x] Task 5: Handle post-removal user state (AC: #8)
  - [x] 5.1 Ensure user sees "No families found" after removal
  - [x] 5.2 Verify no "removed" indication appears anywhere
  - [x] 5.3 Verify user can create new family normally

- [x] Task 6: Add web hook for sign-out after removal (AC: #3)
  - [x] 6.1 Call self-removal function from modal confirmation
  - [x] 6.2 Sign out user after successful removal
  - [x] 6.3 Redirect to home/login page

- [x] Task 7: Add unit tests (AC: #1-8)
  - [x] 7.1 Test self-removal button visibility
  - [x] 7.2 Test confirmation modal with safety resources
  - [x] 7.3 Test immediate access revocation
  - [x] 7.4 Test other parent access remains intact
  - [x] 7.5 Test guardian removal from family and children
  - [x] 7.6 Test NO notifications are sent
  - [x] 7.7 Test sealed audit logging
  - [x] 7.8 Test admin audit logging
  - [x] 7.9 Test post-removal user experience
  - [x] 7.10 Test cannot remove if last guardian
  - [x] 7.11 Test transaction atomicity
  - [x] 7.12 Minimum 20 tests required (48 tests implemented)

## Dev Notes

### Implementation Strategy

This story differs from Story 0.5.4 (Parent Access Severing) in critical ways:

| Aspect         | Story 0.5.4 (Admin Severing)       | Story 2.8 (Self-Removal)     |
| -------------- | ---------------------------------- | ---------------------------- |
| Initiator      | Safety team admin                  | User themselves              |
| Verification   | 2-of-4 identity checks             | Just authentication          |
| Target         | Removes OTHER parent (abuser)      | Removes SELF (victim)        |
| Ticket         | Required (linked to safety ticket) | Not required                 |
| Stealth window | Yes (72-hour)                      | Not needed (self-action)     |
| Sealed audit   | Seals REMAINING user entries       | Seals DEPARTING user entries |

### Key Safety Patterns to Reuse

From `apps/functions/src/callable/admin/severParentAccess.ts`:

```typescript
// Guardian removal pattern
await familyRef.update({
  guardianUids: FieldValue.arrayRemove(parentUid),
  guardians: familyData?.guardians?.filter((g: { uid: string }) => g.uid !== parentUid),
  updatedAt: FieldValue.serverTimestamp(),
})
```

From `apps/functions/src/lib/audit/sealedAudit.ts`:

- Use `sealAuditEntry()` for creating sealed entries
- Seal reason should be `'escape_action'`

### CRITICAL Safety Requirements

1. **NO Notifications** - Unlike Story 2.7 (dissolution), self-removal must be completely silent to protect the departing user.

2. **NO Family Audit** - The action must NOT appear in family auditLogs that remaining guardians can see.

3. **Sealed Audit Only** - Log to sealedAuditEntries and adminAuditLogs only.

4. **Neutral UX** - Post-removal experience shows "No families found" - same as a new user who never had a family.

5. **Cannot Remove Last Guardian** - Must prevent removal if user is the only guardian (family would be orphaned).

### Differences from Story 2.7 (Dissolution)

- Story 2.7 has 30-day cooling period - Story 2.8 is immediate
- Story 2.7 notifies all guardians - Story 2.8 notifies nobody
- Story 2.7 deletes family - Story 2.8 leaves family intact
- Story 2.7 requires guardian acknowledgment - Story 2.8 requires only self-confirmation

### Admin Audit Type Addition

Add to `apps/functions/src/utils/adminAudit.ts`:

```typescript
export type AdminAuditAction =
  | ... existing types ...
  | 'self_remove_from_family' // Story 2.8
```

### Shared Contracts Update

Add to `packages/shared/src/contracts/index.ts`:

```typescript
// Story 2.8: Self-removal input schema
export const selfRemoveFromFamilyInputSchema = z.object({
  familyId: z.string().min(1),
  confirmationPhrase: z.string().min(1), // e.g., "I understand this is immediate"
})
export type SelfRemoveFromFamilyInput = z.infer<typeof selfRemoveFromFamilyInputSchema>

// Story 2.8: Self-removal response schema
export const selfRemoveFromFamilyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
export type SelfRemoveFromFamilyResponse = z.infer<typeof selfRemoveFromFamilyResponseSchema>
```

### Project Structure Notes

- Cloud Function: `apps/functions/src/callable/selfRemoveFromFamily.ts`
- Web Component: `apps/web/src/components/family/SelfRemovalModal.tsx`
- Uses existing sealed audit infrastructure from Story 0.5.8
- Uses existing admin audit from Story 0.5.3

### References

- [Source: docs/epics/epic-list.md#Story 2.8] - Story requirements
- [Source: docs/sprint-artifacts/stories/0-5-4-parent-access-severing.md] - Guardian removal pattern
- [Source: docs/sprint-artifacts/stories/0-5-8-audit-trail-sealing.md] - Sealed audit infrastructure
- [Source: apps/functions/src/lib/audit/sealedAudit.ts] - Sealed audit implementation
- [Source: apps/functions/src/lib/audit/escapeAuditSealer.ts] - Escape audit sealer
- [Source: apps/functions/src/utils/adminAudit.ts] - Admin audit types
- [Source: packages/shared/src/contracts/index.ts] - Zod schemas

---

## Dev Agent Record

### Context Reference

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- All 48 tests pass (29 function tests + 19 component tests)
- Cloud function imports schemas from @fledgely/shared (not duplicated)
- Cloud function implements transactional guardian removal
- Children queried from families/{familyId}/children subcollection (not top-level)
- Sealed audit via sealEscapeRelatedEntries (seals past user audit entries)
- Admin audit logs to adminAuditLogs for compliance
- Modal uses neutral language (no alarming terms)
- Modal moved to family/ subdirectory per project structure
- No notifications sent (AC6)
- Code review fixes applied

### File List

- `apps/functions/src/callable/selfRemoveFromFamily.ts` - Main cloud function
- `apps/functions/src/callable/selfRemoveFromFamily.test.ts` - Function tests (29 tests)
- `apps/functions/src/index.ts` - Export added
- `apps/web/src/components/family/SelfRemovalModal.tsx` - UI component
- `apps/web/src/components/family/SelfRemovalModal.test.tsx` - Component tests (21 tests)
- `packages/shared/src/contracts/index.ts` - Added schemas
- `packages/shared/src/index.ts` - Added exports
- `apps/functions/src/utils/adminAudit.ts` - Added audit action type
- `apps/web/src/components/safety/SafetyContactForm.tsx` - Fixed type error (type, petitionInfo)
- `apps/web/src/components/safety/SafetyContactForm.test.tsx` - Fixed test expectations
- `apps/functions/src/callable/admin/grantLegalParentAccess.ts` - Fixed TypeScript ChildData interface
- `apps/functions/src/callable/admin/grantLegalParentAccess.test.ts` - Fixed unused variable errors
