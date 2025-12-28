# Story 3A.1: Data Symmetry Enforcement

Status: done

## Story

As a **co-parent**,
I want **to see exactly the same data as my co-parent sees**,
So that **neither parent has an information advantage in custody situations**.

## Acceptance Criteria

1. **AC1: Identical Data Access**
   - Given two parents are guardians of the same child
   - When either parent views screenshots, activity, or any child data
   - Then both parents see identical data with identical timestamps
   - And no data is filtered, delayed, or modified based on which parent is viewing

2. **AC2: Security Rules Enforce Read Equality**
   - Given Firestore Security Rules are configured
   - When either parent reads child data
   - Then read is allowed for both parents equally
   - And rule pattern: "both parents have access or neither does"

3. **AC3: Viewing Timestamps Logged**
   - Given a parent views child data (screenshots, activity)
   - When the view action occurs
   - Then a viewing timestamp is logged per-parent in audit trail
   - And logged data includes: parentUid, childId, dataType, viewedAt

4. **AC4: Simultaneous Data Visibility**
   - Given new child data is created (screenshot, activity, flag)
   - When the data becomes available
   - Then both parents see it simultaneously (no "first viewer" advantage)
   - And data visibility is atomic - visible to both or neither

5. **AC5: Access Revocation Symmetry**
   - Given one parent's access is revoked
   - When the revocation is processed
   - Then data becomes inaccessible to BOTH parents until resolved
   - Note: This is a future consideration for Story 3.6 legal parent petition flow
   - MVP: Document this behavior in security rules comments

6. **AC6: Accessibility**
   - Given the data symmetry features
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)

## Tasks / Subtasks

- [x] Task 1: Verify Existing Security Rules for Read Symmetry (AC: #1, #2)
  - [x] 1.1 Review firestore.rules for children collection
  - [x] 1.2 Confirm both guardians have identical read permissions
  - [x] 1.3 Add inline documentation explaining symmetry principle
  - [x] 1.4 Create test verifying both guardians can read same data

- [x] Task 2: Create Data View Audit Service (AC: #3)
  - [x] 2.1 Create apps/web/src/services/dataViewAuditService.ts
  - [x] 2.2 Define dataViewAuditSchema in contracts/index.ts
  - [x] 2.3 Implement logDataView function that writes to Firestore
  - [x] 2.4 Store audit entries in /auditLogs/{logId} collection
  - [x] 2.5 Add security rules for audit logs (write-only for guardians)

- [x] Task 3: Integrate View Logging in Dashboard (AC: #3)
  - [x] 3.1 Add view logging when dashboard loads children data
  - [x] 3.2 Add view logging when child profile is viewed
  - [x] 3.3 Include dataType in log (e.g., 'children_list', 'child_profile')
  - [x] 3.4 Ensure logging doesn't block data display

- [x] Task 4: Verify Simultaneous Data Visibility (AC: #4)
  - [x] 4.1 Review existing data creation patterns
  - [x] 4.2 Document that Firestore listeners provide real-time sync to all guardians
  - [x] 4.3 Create test for simultaneous visibility (both users see new data)

- [x] Task 5: Document Access Revocation Symmetry (AC: #5)
  - [x] 5.1 Add comments to security rules about future revocation handling
  - [x] 5.2 Document behavior in story notes for future Story 3.6 implementation

- [x] Task 6: Create Unit Tests (AC: All)
  - [x] 6.1 Test dataViewAuditSchema validation
  - [x] 6.2 Test logDataView function
  - [x] 6.3 Test security rules for audit collection
  - [x] 6.4 Test guardian read equality

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via Zod schemas
- **Schema Source:** @fledgely/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Audit Trail:** New collection /auditLogs/{logId} for view tracking

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - dataViewAuditSchema must be Zod-based
- "Firebase SDK Direct" - use `doc()`, `setDoc()`, `addDoc()`, `collection()` directly
- "Functions Delegate to Services" - audit service for business logic

### Critical: Data Symmetry Principle

**The core principle of Epic 3A is that in shared custody families, both parents have IDENTICAL access to all family data.**

This story ensures:

1. Existing security rules already enforce read symmetry (verified)
2. View actions are audited for transparency
3. Future features will maintain this symmetry

### Current Security Rules Analysis

From `packages/firebase-rules/firestore.rules`:

```javascript
// Children collection - ALREADY SYMMETRIC
match /children/{childId} {
  function isChildGuardian() {
    return request.auth != null &&
      request.auth.uid in resource.data.guardians[].uid;
  }

  // Read: only child guardians can read
  // Both guardians are in guardians[] array, so both have equal read access
  allow read: if isChildGuardian();
}
```

**Analysis:** The existing rules already enforce data symmetry! Both guardians in the `guardians[]` array have identical read permissions. No changes needed for AC1/AC2.

### Data View Audit Schema

```typescript
// packages/shared/src/contracts/index.ts
export const dataViewAuditSchema = z.object({
  id: z.string(),
  viewerUid: z.string(),
  childId: z.string().nullable(), // null for family-level views
  familyId: z.string(),
  dataType: z.enum([
    'children_list',
    'child_profile',
    'screenshots',
    'activity',
    'agreements',
    'flags',
  ]),
  viewedAt: z.date(),
  sessionId: z.string().nullable(), // Optional session correlation
})
export type DataViewAudit = z.infer<typeof dataViewAuditSchema>
```

### Audit Log Firestore Structure

```
/auditLogs/{logId}
  - id: string (auto-generated)
  - viewerUid: string (UID of guardian who viewed)
  - childId: string | null (child being viewed, or null for family-level)
  - familyId: string (family context)
  - dataType: string (what type of data was viewed)
  - viewedAt: Timestamp
  - sessionId: string | null (optional correlation)
```

### Security Rules for Audit Logs

```javascript
// Append-only audit logs for data viewing
match /auditLogs/{logId} {
  // Helper: Check if user is a guardian of the family
  function isFamilyGuardian() {
    let family = get(/databases/$(database)/documents/families/$(resource.data.familyId));
    return request.auth != null &&
      request.auth.uid in family.data.guardians[].uid;
  }

  // Read: Family guardians can read audit logs for their family
  // This enables Story 3A.5 (Screenshot Viewing Rate Alert) later
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/families/$(request.resource.data.familyId)).data.guardians[request.auth.uid] != null;

  // Create: Guardians can log their own views only
  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.viewerUid &&
    isFamilyGuardian();

  // Update/Delete: Not allowed (audit trail immutability)
  allow update, delete: if false;
}
```

### Data View Audit Service Pattern

```typescript
// apps/web/src/services/dataViewAuditService.ts
import { getFirestoreDb } from '@/lib/firebase'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import type { DataViewAudit } from '@fledgely/shared/contracts'

/**
 * Log a data view action to the audit trail.
 *
 * This supports Epic 3A data symmetry by creating a transparent
 * record of who viewed what data and when.
 *
 * @param params - View audit parameters
 */
export async function logDataView(params: {
  viewerUid: string
  childId: string | null
  familyId: string
  dataType: DataViewAudit['dataType']
  sessionId?: string
}): Promise<void> {
  const db = getFirestoreDb()
  const auditLogsRef = collection(db, 'auditLogs')

  await addDoc(auditLogsRef, {
    viewerUid: params.viewerUid,
    childId: params.childId,
    familyId: params.familyId,
    dataType: params.dataType,
    viewedAt: Timestamp.now(),
    sessionId: params.sessionId ?? null,
  })
}
```

### Integration in Dashboard

```typescript
// apps/web/src/app/dashboard/page.tsx
// Add view logging when children are loaded

useEffect(() => {
  if (family && user) {
    // Log that user is viewing family dashboard with children list
    logDataView({
      viewerUid: user.uid,
      childId: null, // Family-level view
      familyId: family.id,
      dataType: 'children_list',
    }).catch((err) => {
      // Non-blocking - don't fail dashboard for audit logging issues
      console.error('Failed to log data view:', err)
    })
  }
}, [family, user])
```

### Important: Existing Symmetry Verification

The existing security rules in `firestore.rules` already enforce data symmetry:

1. **Children Collection:** Both guardians in `guardians[]` array have read access
2. **Family Collection:** Both guardians in `guardians[]` array have read access
3. **Guardian Removal Prevention:** Story 3.4 already prevents guardian removal

**This story primarily adds:**

- Audit logging for transparency
- Documentation of symmetry principle
- Tests to verify symmetry

### Library/Framework Requirements

| Dependency | Version | Purpose                          |
| ---------- | ------- | -------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed) |
| zod        | ^3.x    | Schema validation                |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add dataViewAuditSchema

apps/web/src/
├── services/
│   ├── dataViewAuditService.ts    # NEW - Audit logging service
│   └── dataViewAuditService.test.ts # NEW - Unit tests
├── app/
│   └── dashboard/
│       └── page.tsx            # UPDATE - Integrate view logging

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add auditLogs collection rules
```

### Testing Requirements

- Unit test dataViewAuditSchema validation
- Unit test logDataView function (with mocked Firestore)
- Test security rules: guardian can create their own audit log
- Test security rules: guardian cannot create audit log for another user
- Test security rules: audit logs are immutable (no update/delete)
- Integration test: verify both guardians see same child data

### Previous Story Intelligence (Story 3.4)

From Story 3.4 completion:

- Guardian removal prevention is already implemented
- Security rules prevent guardian array from shrinking
- GuardianBadge component shows "Co-managed with [Name]"
- FamilyContext provides `family.guardians` data

**Key Patterns to Reuse:**

- Security rules helper function pattern
- Service layer for business logic
- Non-blocking async operations in useEffect

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3A.1]
- [Source: docs/epics/epic-list.md#Epic-3A]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: packages/firebase-rules/firestore.rules]
- [Source: docs/sprint-artifacts/stories/3-4-equal-access-verification.md]

## Dev Agent Record

### Context Reference

- Epic: 3A (Shared Custody Safeguards)
- Sprint: 2 (Feature Development)
- Story Key: 3a-1-data-symmetry-enforcement
- Depends On: Epic 3 (completed), Story 3.4 (completed)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Verified existing Firestore security rules already enforce data symmetry - both guardians in guardians[] array have identical read permissions
- Added comprehensive documentation comments to firestore.rules explaining Epic 3A data symmetry principle
- Created dataViewTypeSchema and dataViewAuditSchema Zod schemas in contracts/index.ts
- Created dataViewAuditService.ts with logDataView and logDataViewNonBlocking functions
- Added auditLogs collection security rules: guardians can read family logs, create own logs, no update/delete (immutable)
- Integrated non-blocking view logging in dashboard/page.tsx (children_list) and [childId]/edit/page.tsx (child_profile)
- Created 11 data symmetry verification tests in dataSymmetryVerification.test.ts
- Created 12 audit service tests in dataViewAuditService.test.ts
- Created 8 schema validation tests in packages/shared dataViewAudit.test.ts
- All 119 web tests pass, 53 functions tests pass, 8 shared tests pass, build passes

### File List

- packages/firebase-rules/firestore.rules (MODIFIED - added data symmetry docs, auditLogs rules)
- packages/shared/src/contracts/index.ts (MODIFIED - added dataViewTypeSchema, dataViewAuditSchema)
- packages/shared/src/contracts/dataViewAudit.test.ts (NEW - schema validation tests)
- apps/web/src/services/dataViewAuditService.ts (NEW - audit logging service with dataType validation)
- apps/web/src/services/dataViewAuditService.test.ts (NEW - audit service tests, 13 tests)
- apps/web/src/services/dataSymmetryVerification.test.ts (NEW - symmetry verification tests)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - integrated view logging)
- apps/web/src/app/family/children/[childId]/edit/page.tsx (MODIFIED - integrated view logging)
- docs/sprint-artifacts/sprint-status.yaml (MODIFIED - updated story status)

## Change Log

| Date       | Change                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| 2025-12-28 | Story created (ready-for-dev)                                                                             |
| 2025-12-28 | Implementation complete, ready for code review                                                            |
| 2025-12-28 | Code review complete: Fixed mock path mismatch, added dataType validation, updated File List. Story done. |
