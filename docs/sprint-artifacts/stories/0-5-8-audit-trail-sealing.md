# Story 0.5.8: Audit Trail Sealing

Status: done

## Story

As **the system**,
I want **audit trail entries related to escape actions to be sealed from abuser view**,
So that **victims' safety planning isn't revealed through activity logs**.

## Acceptance Criteria

1. **AC1: Escape action entries sealed from abuser**
   - Given an escape action has been executed
   - When the abuser (remaining family member) views the family audit trail
   - Then entries related to escape actions are not visible
   - And the audit trail shows no suspicious gaps (timestamps remain continuous)

2. **AC2: Sealed entries preserved in compliance storage**
   - Given escape-related audit entries are sealed
   - When compliance or legal needs arise
   - Then sealed entries are preserved in a separate sealed_audit collection
   - And entries retain all original data plus sealing metadata

3. **AC3: Legal/compliance access only**
   - Given sealed audit entries exist
   - When support/legal requests access with documented authorization
   - Then entries are accessible via admin function with proper audit logging
   - And access is limited to authorized roles only

4. **AC4: No suspicious gaps**
   - Given audit entries are sealed
   - When family members view the audit log
   - Then the timeline appears continuous (no obvious "missing" entries)
   - And sealing extends to any analytics, reports, or exports

5. **AC5: Seal persistence**
   - Given audit entries are sealed
   - When time passes
   - Then seal persists indefinitely unless legally compelled to unseal
   - And unsealing requires documented legal authorization

6. **AC6: Integration with existing escape actions**
   - Given an escape action is executed (Story 0.5.4, 0.5.5, 0.5.6)
   - When the action completes successfully
   - Then related audit entries are automatically sealed
   - And the sealing operation is logged to admin audit only

7. **AC7: Audit log querying respects seals**
   - Given a family has sealed audit entries
   - When any family member queries audit logs (dataViewAuditService, auditLog HTTP endpoint)
   - Then sealed entries are filtered out of results
   - And query code does not leak seal existence

## Tasks / Subtasks

- [x] Task 1: Create sealed audit infrastructure (AC: #2, #3)
  - [x] 1.1 Create `apps/functions/src/lib/audit/sealedAudit.ts` for seal management
  - [x] 1.2 Add `sealedAuditEntries` collection schema in Firestore
  - [x] 1.3 Implement `sealAuditEntry(auditLogId, familyId, reason)` to seal entries
  - [x] 1.4 Implement `getSealedEntriesForFamily(familyId)` for admin access
  - [x] 1.5 Ensure sealed collection is not queryable by family members (security rules)

- [x] Task 2: Create seal activation helper (AC: #6)
  - [x] 2.1 Create `apps/functions/src/lib/audit/escapeAuditSealer.ts`
  - [x] 2.2 Implement `sealEscapeRelatedEntries(familyId, escapedUserIds, ticketId)`
  - [x] 2.3 Identify entries to seal: actions by escaped users during escape window
  - [x] 2.4 Copy entries to sealedAuditEntries with sealing metadata
  - [x] 2.5 Delete original entries from auditLogs (maintains no-gaps appearance)

- [x] Task 3: Integrate sealing with escape actions (AC: #6)
  - [x] 3.1 Modify `severParentAccess.ts` to call seal function on success
  - [x] 3.2 Modify `unenrollDevicesForSafety.ts` to call seal function on success
  - [x] 3.3 Modify `disableLocationFeaturesForSafety.ts` to call seal function on success
  - [x] 3.4 Ensure sealing happens AFTER stealth window activation

- [x] Task 4: Update audit log queries to respect seals (AC: #7)
  - [x] 4.1 Review `dataViewAuditService.ts` - already queries family-scoped auditLogs
  - [x] 4.2 Review `auditLog.ts` HTTP endpoint - ensure no leakage
  - [x] 4.3 Add `isSealedFamily(familyId)` check if needed for additional filtering
  - [x] 4.4 Ensure sealed entries are removed from source, not filtered at query time

- [x] Task 5: Add admin sealed entry access (AC: #3)
  - [x] 5.1 Create `apps/functions/src/callable/admin/getSealedAuditEntries.ts`
  - [x] 5.2 Accept ticketId, familyId, authorization documentation
  - [x] 5.3 Validate agent has legal_compliance role
  - [x] 5.4 Return sealed entries with full audit trail of access
  - [x] 5.5 Log access to admin audit

- [x] Task 6: Add Firestore security rules (AC: #2, #3)
  - [x] 6.1 Add `sealedAuditEntries` collection rules (all access denied)
  - [x] 6.2 Ensure only Admin SDK can read/write sealed entries
  - [x] 6.3 Document rule purpose in comments

- [x] Task 7: Add schemas and types (AC: #2)
  - [x] 7.1 Add sealed audit schemas to `packages/shared/src/contracts/index.ts`
  - [x] 7.2 Define `sealedAuditEntrySchema` with original entry data + seal metadata
  - [x] 7.3 Add 'seal_audit_entries' and 'access_sealed_audit' to AdminAuditAction
  - [x] 7.4 Add 'sealed_audit' to AdminAuditResourceType

- [x] Task 8: Add unit tests (AC: #1-7)
  - [x] 8.1 Test sealAuditEntry copies entry to sealed collection
  - [x] 8.2 Test sealAuditEntry deletes original entry
  - [x] 8.3 Test sealEscapeRelatedEntries finds relevant entries
  - [x] 8.4 Test getSealedEntriesForFamily returns all sealed for family
  - [x] 8.5 Test integration with severParentAccess triggers sealing
  - [x] 8.6 Test integration with unenrollDevicesForSafety triggers sealing
  - [x] 8.7 Test integration with disableLocationFeaturesForSafety triggers sealing
  - [x] 8.8 Test security rules block family access to sealedAuditEntries
  - [x] 8.9 Test admin access requires proper role
  - [x] 8.10 Test admin access is logged to admin audit
  - [x] 8.11 Minimum 15 tests required (75 tests implemented)

## Dev Notes

### Implementation Strategy

This story implements audit trail sealing to protect victim safety during escape actions. The key insight is that we need to **remove entries from the visible audit log entirely** rather than just filtering them - this prevents any metadata leakage that could reveal the existence of sealed entries.

**Key Design:**

1. **Move-and-Delete Pattern**: Sealed entries are MOVED to a separate `sealedAuditEntries` collection and DELETED from `auditLogs`. This ensures:
   - No suspicious gaps in timestamps (entry simply doesn't exist)
   - No metadata leakage (no "sealed: true" field for abuser to notice)
   - Complete isolation of sensitive data

2. **Sealed Entry Structure**: Each sealed entry preserves:
   - Original audit entry data verbatim
   - Sealing metadata (when, why, ticketId, agentId)
   - Immutable legal hold flag

3. **Compliance Storage**: Sealed entries are preserved indefinitely for potential legal needs:
   - Protection order disputes
   - Custody proceedings
   - Criminal investigations
   - Regulatory compliance

4. **Integration Point**: Sealing happens AFTER stealth window activation in each escape action, ensuring:
   - Stealth window prevents notifications
   - Audit sealing prevents log inspection
   - Both protections work together

**CRITICAL SAFETY REQUIREMENTS:**

1. **No Seal Visibility**: Family members must NEVER see any indication that entries were sealed
2. **Admin Audit Only**: Sealing operations logged to adminAuditLogs only
3. **Compliance Access Logging**: Every access to sealed entries creates audit record
4. **Indefinite Retention**: Sealed entries never auto-deleted (unlike stealth queue)

### Data Model Design

**Sealed Audit Entry Schema:**

```typescript
// Collection: sealedAuditEntries/{entryId}
{
  id: string,                    // Same ID as original auditLog entry
  familyId: string,              // Family context

  // Original entry data (verbatim copy)
  originalEntry: {
    viewerUid: string,
    childId: string | null,
    dataType: string,
    viewedAt: Timestamp,
    sessionId: string | null,
    deviceId: string | null,
    metadata: object | null,
  },

  // Sealing metadata
  sealedAt: Timestamp,
  sealedByTicketId: string,      // Safety ticket that triggered seal
  sealedByAgentId: string,       // Agent who executed escape action
  sealReason: 'escape_action',   // Why it was sealed

  // Legal hold
  legalHold: boolean,            // Default true, cannot be removed except by legal
  accessLog: [{                  // Every access recorded
    accessedAt: Timestamp,
    accessedByAgentId: string,
    accessReason: string,
  }],
}
```

**Family Document Additions (optional, for optimization):**

```typescript
{
  // Existing family fields...

  // Story 0.5.8: Audit Trail Sealing (optional flag)
  hasSealed AuditEntries: boolean,  // Fast check if sealing exists
}
```

### Dependencies

**Story Dependencies:**

- Story 0.5.4: Parent Access Severing (integration point)
- Story 0.5.5: Remote Device Unenrollment (integration point)
- Story 0.5.6: Location Feature Emergency Disable (integration point)
- Story 0.5.7: 72-Hour Notification Stealth (sealing happens after stealth activation)

**Existing Code to Leverage:**

- `apps/functions/src/utils/adminAudit.ts` - Add new action types
- `apps/functions/src/callable/admin/severParentAccess.ts` - Add seal call
- `apps/functions/src/callable/admin/unenrollDevicesForSafety.ts` - Add seal call
- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts` - Add seal call
- `packages/firebase-rules/firestore.rules` - Add sealedAuditEntries rules

**Collections Involved:**

- `auditLogs` - Source collection (entries deleted after sealing)
- `sealedAuditEntries` - Destination collection (sealed entries stored here)
- `adminAuditLogs` - Sealing operations logged here

### Sealing Logic Pattern

```typescript
// apps/functions/src/lib/audit/escapeAuditSealer.ts
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

interface SealEscapeEntriesOptions {
  familyId: string
  escapedUserIds: string[]
  ticketId: string
  agentId: string
  agentEmail: string | null
  ipAddress: string | null
}

export async function sealEscapeRelatedEntries(options: SealEscapeEntriesOptions): Promise<number> {
  const { familyId, escapedUserIds, ticketId, agentId, agentEmail, ipAddress } = options

  // Find all audit entries for this family by escaped users
  // Note: We seal entries by the ESCAPED user (victim), not by the abuser
  // This removes any evidence of the victim's recent activity
  const auditQuery = db
    .collection('auditLogs')
    .where('familyId', '==', familyId)
    .where('viewerUid', 'in', escapedUserIds)

  const snapshot = await auditQuery.get()

  if (snapshot.empty) return 0

  const batch = db.batch()
  let sealedCount = 0

  for (const doc of snapshot.docs) {
    const originalEntry = doc.data()

    // Create sealed entry
    const sealedRef = db.collection('sealedAuditEntries').doc(doc.id)
    batch.set(sealedRef, {
      id: doc.id,
      familyId,
      originalEntry,
      sealedAt: Timestamp.now(),
      sealedByTicketId: ticketId,
      sealedByAgentId: agentId,
      sealReason: 'escape_action',
      legalHold: true,
      accessLog: [],
    })

    // Delete original entry
    batch.delete(doc.ref)

    sealedCount++
  }

  await batch.commit()

  // Log to admin audit ONLY
  await logAdminAction({
    agentId,
    agentEmail,
    action: 'seal_audit_entries',
    resourceType: 'sealed_audit',
    resourceId: familyId,
    metadata: {
      ticketId,
      escapedUserIds,
      entriesSealed: sealedCount,
    },
    ipAddress,
  })

  return sealedCount
}
```

### Security Considerations

1. **Complete Isolation**: sealedAuditEntries has `allow read, write: if false` - only Admin SDK
2. **No Filter Leakage**: Entries are DELETED from source, not filtered - prevents metadata leakage
3. **Access Logging**: Every sealed entry access creates immutable audit record
4. **Role Validation**: Admin functions verify legal_compliance role before returning sealed data
5. **Indefinite Retention**: No auto-delete - sealed entries preserved for legal needs

### Testing Requirements

**Unit Tests (minimum 15):**

1. sealAuditEntry creates entry in sealedAuditEntries
2. sealAuditEntry deletes original from auditLogs
3. sealAuditEntry preserves all original fields
4. sealAuditEntry adds sealing metadata
5. sealEscapeRelatedEntries finds entries by escapedUserIds
6. sealEscapeRelatedEntries handles empty result
7. sealEscapeRelatedEntries uses batch for atomic operation
8. getSealedEntriesForFamily returns all sealed for family
9. getSealedEntriesForFamily logs access
10. severParentAccess triggers sealing
11. unenrollDevicesForSafety triggers sealing
12. disableLocationFeaturesForSafety triggers sealing
13. Security rules block family access to sealedAuditEntries
14. Admin access requires legal_compliance role
15. Admin access creates audit log entry

### Project Structure Notes

**Files to Create:**

- `apps/functions/src/lib/audit/sealedAudit.ts` - Core sealing operations
- `apps/functions/src/lib/audit/escapeAuditSealer.ts` - Escape action integration
- `apps/functions/src/callable/admin/getSealedAuditEntries.ts` - Admin access function
- Test files for each module

**Files to Modify:**

- `apps/functions/src/callable/admin/severParentAccess.ts` - Add seal call
- `apps/functions/src/callable/admin/unenrollDevicesForSafety.ts` - Add seal call
- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts` - Add seal call
- `apps/functions/src/utils/adminAudit.ts` - Add action types
- `apps/functions/src/index.ts` - Export admin function
- `packages/shared/src/contracts/index.ts` - Add sealed schemas
- `packages/shared/src/index.ts` - Add exports
- `packages/firebase-rules/firestore.rules` - Add sealedAuditEntries rules

### Edge Cases

1. **No audit entries to seal**: Return 0, no error
2. **Multiple escape actions on same family**: Idempotent - already sealed entries skipped
3. **Large number of entries**: Use batched writes (500 limit per batch)
4. **Concurrent sealing**: Use transactions if needed for consistency
5. **Escaped user has no recent activity**: Normal - seal still runs, seals 0 entries

### Previous Story Learnings (from Story 0.5.7)

1. **Design Decision**: Use helper functions in lib/ rather than standalone callables - reduces network hops
2. **Test Pattern**: Use specification-based testing to avoid Firestore mock hoisting issues
3. **Guardian Scope**: Consider whether to seal entries for ALL family members or just escaped users
4. **Integration Order**: Stealth window first, then sealing - order matters for complete protection

### References

- [Source: docs/epics/epic-list.md#Story-0.5.8 - Audit Trail Sealing acceptance criteria]
- [Source: Story 0.5.4 - Parent Access Severing patterns for escape actions]
- [Source: Story 0.5.5 - Remote Device Unenrollment patterns for escape actions]
- [Source: Story 0.5.6 - Location Feature Emergency Disable patterns for escape actions]
- [Source: Story 0.5.7 - 72-Hour Notification Stealth patterns for stealth infrastructure]
- [Source: apps/functions/src/utils/adminAudit.ts - Admin audit logging patterns]
- [Source: apps/web/src/services/dataViewAuditService.ts - Data view audit service patterns]

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

### Completion Notes List

- Implementation complete with 75 unit tests (exceeds 15 minimum requirement)
- All acceptance criteria implemented
- Move-and-delete pattern implemented for complete audit isolation
- Sealing integrated with all three escape actions (severParentAccess, unenrollDevicesForSafety, disableLocationFeaturesForSafety)
- Sealing occurs AFTER stealth window activation as required
- Firestore security rules block all client access to sealedAuditEntries

### File List

**New Files:**

- `apps/functions/src/lib/audit/sealedAudit.ts` - Core sealed audit management functions
- `apps/functions/src/lib/audit/sealedAudit.test.ts` - Tests for sealed audit (29 tests)
- `apps/functions/src/lib/audit/escapeAuditSealer.ts` - Escape action integration
- `apps/functions/src/lib/audit/escapeAuditSealer.test.ts` - Tests for escape sealer (22 tests)
- `apps/functions/src/callable/admin/getSealedAuditEntries.ts` - Admin access function
- `apps/functions/src/callable/admin/getSealedAuditEntries.test.ts` - Tests for admin access (24 tests)

**Modified Files:**

- `apps/functions/src/utils/adminAudit.ts` - Added seal_audit_entries and access_sealed_audit action types
- `apps/functions/src/callable/admin/severParentAccess.ts` - Added sealing integration
- `apps/functions/src/callable/admin/unenrollDevicesForSafety.ts` - Added sealing integration
- `apps/functions/src/callable/admin/disableLocationFeaturesForSafety.ts` - Added sealing integration
- `apps/functions/src/index.ts` - Exported getSealedAuditEntries
- `packages/shared/src/contracts/index.ts` - Added sealed audit schemas
- `packages/shared/src/index.ts` - Added sealed audit exports
- `packages/firebase-rules/firestore.rules` - Added sealedAuditEntries collection rules
