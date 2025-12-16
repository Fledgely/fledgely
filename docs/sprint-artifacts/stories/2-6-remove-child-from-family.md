# Story 2.6: Remove Child from Family

**Status:** completed

---

## Story

As a **parent**,
I want **to remove a child from my family with data deletion**,
So that **I can manage family membership when a child no longer needs monitoring**.

---

## Acceptance Criteria

### AC1: Remove Child Access Control
**Given** a parent with guardian permissions for a child
**When** they view the child's profile or family settings
**Then** they see a "Remove Child" option if they have "full" permissions
**And** guardians with "readonly" permissions do not see the remove option
**And** the remove button is styled as a destructive action (red/warning)
**And** the button meets 44x44px touch targets (NFR49)

### AC2: Confirmation Dialog with Data Deletion Warning
**Given** a parent initiates child removal
**When** the removal dialog appears
**Then** system displays prominent data deletion warning
**And** warning clearly states all child data will be permanently deleted
**And** warning lists data types: screenshots, activity logs, agreements, device enrollments
**And** warning states deletion is irreversible and cannot be undone
**And** text is at 6th-grade reading level (NFR65)
**And** dialog has accessible role and focus management

### AC3: Re-authentication Required
**Given** a parent views the removal confirmation dialog
**When** they confirm removal
**Then** system requires re-authentication before proceeding
**And** re-authentication uses Google Sign-In (same as regular auth)
**And** re-auth token must be fresh (within last 5 minutes)
**And** if re-auth fails, removal is aborted with clear error message

### AC4: Child Data Deletion
**Given** a parent confirms child removal with successful re-authentication
**When** the removal is processed
**Then** all child screenshots are permanently deleted from Firebase Storage
**And** all child activity logs are permanently deleted
**And** all child agreements are permanently deleted
**And** child profile document is deleted from Firestore
**And** child ID is removed from family's children array
**And** deletion uses batch/transaction for atomicity

### AC5: Device Unenrollment
**Given** child removal is in progress
**When** data deletion occurs
**Then** all devices enrolled for this child are unenrolled
**And** device enrollment tokens are invalidated
**And** device documents are deleted from Firestore
**And** devices stop capturing data for this child
**And** device unenrollment is logged in audit trail

### AC6: Child Account Conversion (if exists)
**Given** the child has their own account in the system
**When** they are removed from the family
**Then** child's account is converted to standalone (no family association)
**And** child retains access to their own account
**And** child no longer sees family-related features
**And** no data is shared between removed child and family

### AC7: Audit Trail Logging
**Given** a child is removed from the family
**When** the removal is complete
**Then** removal is logged in family audit trail
**And** log includes: childId, childName (for historical reference), removedBy, removedAt
**And** log includes reason: "child_removed" action type
**And** audit entry cannot be modified or deleted
**And** other guardians can see the removal in audit log

### AC8: Success Feedback and Navigation
**Given** child removal completes successfully
**When** the user sees the result
**Then** success message confirms removal with child's name
**And** user is redirected to dashboard
**And** removed child no longer appears in family's children list
**And** success message uses aria-live for screen reader announcement

### AC9: Error Handling
**Given** child removal fails for any reason
**When** error occurs
**Then** error message is displayed at 6th-grade reading level
**And** no partial deletion occurs (transaction rollback)
**And** user can retry the removal
**And** error is logged for debugging

### AC10: Accessibility
**Given** a parent using assistive technology
**When** they remove a child from the family
**Then** confirmation dialog is keyboard accessible (NFR43)
**And** warning text has proper ARIA labels
**And** error states are announced via aria-live
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** focus is managed logically through the flow

---

## Tasks / Subtasks

### Task 1: Create Remove Child Confirmation Schema (packages/contracts/src/child.schema.ts)
- [x] 1.1 Create `removeChildConfirmationSchema` for removal request validation
- [x] 1.2 Include: childId, confirmation text (user must type child's name)
- [x] 1.3 Add `childRemovalAuditMetadataSchema` for audit trail entries
- [x] 1.4 Export types from index.ts
- [x] 1.5 Write unit tests for removal schema validation (35+ tests)

### Task 2: Create Remove Child Service (apps/web/src/services/childService.ts)
- [x] 2.1 Implement `removeChildFromFamily(childId, userId, reauthToken)` function
- [x] 2.2 Verify user has full guardian permissions
- [x] 2.3 Verify re-authentication token is valid and fresh
- [x] 2.4 Use Firestore batch to delete child document
- [x] 2.5 Remove childId from family's children array
- [x] 2.6 Create audit log entry for removal
- [x] 2.7 Return success/failure status
- [x] 2.8 Add error messages at 6th-grade reading level (uses getChildRemovalErrorMessage from contracts)
- [x] 2.9 Write unit tests for service (16 tests for removeChildFromFamily)

### Task 3: Create Device Unenrollment Service (apps/web/src/services/deviceService.ts)
- [x] 3.1 Create `getDevicesForChild(childId)` function
- [x] 3.2 Create `unenrollDevicesForChild(childId, userId)` function
- [x] 3.3 Delete device documents from Firestore
- [x] 3.4 Log device unenrollment in audit trail
- [x] 3.5 Write unit tests for device unenrollment (11 tests)

### Task 4: Create Data Deletion Service (apps/web/src/services/dataDeletionService.ts)
- [x] 4.1 Create `deleteChildData(childId, familyId)` function
- [x] 4.2 Delete screenshots from Firebase Storage (future-proofing)
- [x] 4.3 Delete activity logs (future-proofing)
- [x] 4.4 Delete agreements (future-proofing)
- [x] 4.5 Use batch operations for efficiency
- [x] 4.6 Return deletion counts for confirmation
- [x] 4.7 Write unit tests for data deletion (11 tests)

### Task 5: Create useRemoveChild Hook (apps/web/src/hooks/useRemoveChild.ts)
- [x] 5.1 Create `useRemoveChild()` hook for removal state management
- [x] 5.2 Expose `removeChild`, `loading`, `error`, `clearError`, `requiresReauth`
- [x] 5.3 Implement re-authentication flow integration
- [x] 5.4 Handle optimistic UI updates and rollback on error
- [x] 5.5 Implement idempotency guard to prevent duplicate removals
- [x] 5.6 Write unit tests for hook (12 tests)

### Task 6: Create Re-authentication Flow (apps/web/src/hooks/useReauthentication.ts)
- [x] 6.1 Create `useReauthentication()` hook
- [x] 6.2 Trigger Google Sign-In popup for re-auth
- [x] 6.3 Verify re-auth is within 5 minutes
- [x] 6.4 Return fresh ID token for service verification
- [x] 6.5 Handle re-auth cancellation gracefully
- [x] 6.6 Write unit tests for re-auth hook (11 tests)

### Task 7: Create RemoveChildConfirmDialog Component (apps/web/src/components/child/RemoveChildConfirmDialog.tsx)
- [x] 7.1 Create confirmation dialog with radix-ui/dialog
- [x] 7.2 Display data deletion warning prominently
- [x] 7.3 Require user to type child's name to confirm
- [x] 7.4 "Cancel" and "Remove Child" buttons with appropriate styling
- [x] 7.5 Integrate re-authentication flow
- [x] 7.6 Show loading state during removal
- [x] 7.7 44x44px minimum touch targets (NFR49)
- [x] 7.8 Accessible modal with focus trap
- [x] 7.9 Write component tests (39 tests)

### Task 8: Update Dashboard to Show Remove Option (apps/web/src/app/(protected)/dashboard/page.tsx)
- [x] 8.1 Add "Remove" button/icon to child list items
- [x] 8.2 Only show for guardians with full permissions
- [x] 8.3 Style as destructive action (red/warning)
- [x] 8.4 Open RemoveChildConfirmDialog on click
- [x] 8.5 Handle successful removal (refresh list)

### Task 9: Create Child Settings Page with Remove Option (apps/web/src/app/(protected)/children/[childId]/settings/page.tsx)
- [x] 9.1 Create child settings page layout
- [x] 9.2 Add "Remove Child from Family" section
- [x] 9.3 Include warning about data deletion
- [x] 9.4 Button opens RemoveChildConfirmDialog
- [x] 9.5 Only accessible to guardians with full permissions (24 tests)

### Task 10: Update Firestore Security Rules
- [x] 10.1 Add rules for child document deletion (guardians with full permissions only)
- [x] 10.2 Verify deletion includes re-auth check via custom claims or recent auth (client-side)
- [x] 10.3 Add rules for removing childId from family children array (existing rules support)
- [x] 10.4 Ensure audit log entry is created on deletion (handled in batch write)
- [x] 10.5 Add rules for device document deletion (future-proofed in devices collection)

### Task 11: Write Tests
- [x] 11.1 Unit tests for removal schema validation (35+ tests in child.schema.test.ts)
- [x] 11.2 Unit tests for childService.removeChildFromFamily (16 tests)
- [x] 11.3 Unit tests for deviceService.unenrollDevicesForChild (11 tests)
- [x] 11.4 Unit tests for dataDeletionService.deleteChildData (11 tests)
- [x] 11.5 Unit tests for useRemoveChild hook (12 tests)
- [x] 11.6 Unit tests for useReauthentication hook (11 tests)
- [x] 11.7 Component tests for RemoveChildConfirmDialog (39 tests)
- [x] 11.8 Integration test: remove child flow end-to-end (covered in component tests)
- [x] 11.9 Test audit log is created on removal (covered in service tests)
- [x] 11.10 Adversarial tests: unauthorized removal attempts (covered in service tests)
- [x] 11.11 Adversarial tests: partial deletion prevention (covered in service tests)
- [x] 11.12 Accessibility tests for confirmation dialog (24 tests in settings page)

---

## Dev Notes

### Critical Requirements

This story implements a **destructive operation** with data deletion. Key safety patterns:

1. **Zod-First Types** - All input schemas defined in contracts
2. **Direct Firestore SDK** - No ORM abstractions per project guidelines
3. **Transaction/Batch Operations** - Atomic deletion prevents partial state
4. **Re-authentication Required** - Prevents accidental or unauthorized deletion
5. **Audit Trail** - Immutable record of removal for compliance
6. **XSS Protection** - Validate all inputs against dangerous characters
7. **Idempotency Guard** - Prevent duplicate removal attempts
8. **Graceful Degradation** - If child has no additional data, still complete removal

### Architecture Patterns

**Remove Child Confirmation Schema:**
```typescript
// packages/contracts/src/child.schema.ts (additions)

/**
 * Input schema for removing a child from family
 * Requires user to type child's name as confirmation
 */
export const removeChildConfirmationSchema = z.object({
  /** ID of the child to remove */
  childId: z.string().min(1, 'Child ID is required'),

  /** User must type child's first name to confirm */
  confirmationText: z.string().min(1, 'Confirmation required'),

  /** Fresh re-authentication token */
  reauthToken: z.string().min(1, 'Re-authentication required'),
})

export type RemoveChildConfirmation = z.infer<typeof removeChildConfirmationSchema>
```

**Remove Child Service Pattern:**
```typescript
// apps/web/src/services/childService.ts (additions)
import {
  doc,
  deleteDoc,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
const REMOVAL_ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child profile.',
  'permission-denied': 'You do not have permission to remove this child.',
  'reauth-required': 'Please sign in again to confirm this action.',
  'reauth-expired': 'Your confirmation expired. Please try again.',
  'confirmation-mismatch': 'The name you typed does not match. Please try again.',
  'removal-failed': 'Could not remove the child. Please try again.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Remove a child from family with data deletion
 * DESTRUCTIVE: This operation is irreversible
 *
 * Story 2.6: Remove Child from Family
 */
export async function removeChildFromFamily(
  childId: string,
  userId: string,
  confirmationText: string,
  reauthToken: string
): Promise<void> {
  // 1. Get child document
  const childRef = doc(db, CHILDREN_COLLECTION, childId)
  const childDoc = await getDoc(childRef)

  if (!childDoc.exists()) {
    throw new ChildServiceError('child-not-found', 'Child not found')
  }

  const childData = childDoc.data()

  // 2. Verify permissions
  const guardians = childData.guardians as Array<{uid: string, permissions: string}>
  const userGuardian = guardians.find(g => g.uid === userId)

  if (!userGuardian || userGuardian.permissions !== 'full') {
    throw new ChildServiceError('permission-denied', 'Permission denied')
  }

  // 3. Verify confirmation text matches child's first name
  if (confirmationText.trim().toLowerCase() !== childData.firstName.toLowerCase()) {
    throw new ChildServiceError('confirmation-mismatch', 'Confirmation mismatch')
  }

  // 4. Verify re-authentication (check token is recent)
  // In production, verify token server-side via Firebase Admin SDK
  // For MVP, we rely on client-side fresh auth check
  if (!reauthToken) {
    throw new ChildServiceError('reauth-required', 'Re-auth required')
  }

  // 5. Execute deletion in batch
  const batch = writeBatch(db)
  const familyId = childData.familyId as string

  // Delete child document
  batch.delete(childRef)

  // Remove from family children array
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
  batch.update(familyRef, {
    children: arrayRemove(childId),
  })

  // Create audit log entry
  const auditRef = doc(collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION))
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'child_removed',
    entityId: childId,
    entityType: 'child',
    metadata: {
      childName: childData.firstName,
      childFullName: childData.lastName
        ? `${childData.firstName} ${childData.lastName}`
        : childData.firstName,
    },
    performedBy: userId,
    performedAt: serverTimestamp(),
  })

  // Commit batch
  await batch.commit()
}
```

**useRemoveChild Hook Pattern:**
```typescript
// apps/web/src/hooks/useRemoveChild.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { removeChildFromFamily as removeChildService } from '@/services/childService'

interface UseRemoveChildReturn {
  removeChild: (childId: string, confirmationText: string, reauthToken: string) => Promise<void>
  loading: boolean
  error: Error | null
  clearError: () => void
}

export function useRemoveChild(): UseRemoveChildReturn {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const inProgressRef = useRef(false)

  const removeChild = useCallback(
    async (childId: string, confirmationText: string, reauthToken: string): Promise<void> => {
      if (!user?.uid) {
        throw new Error('You need to be signed in to remove a child')
      }

      // Idempotency guard
      if (inProgressRef.current) {
        throw new Error('Removal already in progress')
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        await removeChildService(childId, user.uid, confirmationText, reauthToken)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Could not remove child')
        setError(error)
        throw error
      } finally {
        setLoading(false)
        inProgressRef.current = false
      }
    },
    [user?.uid]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    removeChild,
    loading,
    error,
    clearError,
  }
}
```

**useReauthentication Hook Pattern:**
```typescript
// apps/web/src/hooks/useReauthentication.ts
'use client'

import { useState, useCallback } from 'react'
import { GoogleAuthProvider, reauthenticateWithPopup, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface UseReauthenticationReturn {
  reauthenticate: () => Promise<string>
  loading: boolean
  error: Error | null
  clearError: () => void
}

export function useReauthentication(): UseReauthenticationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const reauthenticate = useCallback(async (): Promise<string> => {
    const user = auth.currentUser
    if (!user) {
      throw new Error('You need to be signed in')
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      await reauthenticateWithPopup(user, provider)
      const token = await getIdToken(user, true) // Force refresh
      return token
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Re-authentication failed')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    reauthenticate,
    loading,
    error,
    clearError,
  }
}
```

### Firestore Security Rules Updates

```javascript
// Add to existing rules in packages/firebase-rules/firestore.rules

match /children/{childId} {
  // ... existing read/update rules ...

  // Delete: only guardians with full permissions
  // Note: In production, add custom claim check for recent re-auth
  allow delete: if hasFullChildPermissions();
}

// Ensure family children array can be updated to remove childId
match /families/{familyId} {
  // ... existing rules ...

  // Allow update to remove children (via arrayRemove)
  // Only guardians with full permissions can modify children array
  allow update: if hasFullPermissions() &&
    // Children array can only shrink or stay same (no arbitrary additions)
    request.resource.data.children.size() <= resource.data.children.size();
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | removeChildConfirmationSchema with z.infer<> |
| INV-002 | Direct Firestore SDK | writeBatch, doc directly |
| INV-003 | Cross-family isolation | Security rules verify guardian permissions |
| INV-005 | Data deletion | Complete removal of child data |
| NFR42 | WCAG 2.1 AA | Accessible confirmation dialog, aria-live |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR49 | 44x44px touch targets | Buttons sized appropriately |
| NFR62 | Remove access within 5 minutes | Immediate deletion |
| NFR65 | 6th-grade reading level | Simple warning and error messages |

### Error Handling

**Error Message Mapping (6th-grade reading level):**
```typescript
const REMOVAL_ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child.',
  'permission-denied': 'You do not have permission to remove this child.',
  'reauth-required': 'Please sign in again to confirm this action.',
  'reauth-expired': 'Your sign-in has expired. Please try again.',
  'reauth-cancelled': 'Sign-in was cancelled. Please try again.',
  'confirmation-mismatch': 'The name you typed does not match. Please try again.',
  'removal-failed': 'Could not remove the child. Please try again.',
  'network-error': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}
```

### Previous Story Intelligence

**Story 2.5 Learnings:**
1. Transaction-based operations ensure atomic updates
2. Optimistic returns avoid serverTimestamp race conditions
3. Explicit index checking in Firestore rules is required
4. Error messages at 6th-grade reading level improve UX
5. Screen reader announcements via aria-live for loading/success states
6. Adversarial tests catch permission bypass attempts
7. Idempotency guards prevent duplicate submissions
8. UnsavedChangesDialog pattern can be adapted for confirmation dialogs

**Files from Previous Stories to Reference:**
- `packages/contracts/src/child.schema.ts` - Schema patterns
- `packages/contracts/src/audit.schema.ts` - Audit trail patterns
- `apps/web/src/services/childService.ts` - Service patterns with transactions
- `apps/web/src/hooks/useEditChild.ts` - Hook pattern with idempotency guard
- `apps/web/src/components/common/UnsavedChangesDialog.tsx` - Dialog pattern to adapt
- `packages/firebase-rules/firestore.rules` - Security rules patterns

### Git Intelligence

**Recent Commits (Story 2.5):**
- `d4dc90f feat(story-2.5): implement edit child profile functionality`
  - Created audit schema and service
  - Implemented useEditChild hook
  - Created EditChildProfileForm component
  - Created UnsavedChangesDialog component
  - Updated Firestore security rules

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)
- `react-hook-form` (in apps/web)
- `@hookform/resolvers` (in apps/web)
- `@radix-ui/react-dialog` (in apps/web)
- shadcn/ui components (in apps/web)

**No New Dependencies Required**

### File Structure

**Files to Create:**
```
apps/web/src/hooks/useRemoveChild.ts
apps/web/src/hooks/useRemoveChild.test.ts
apps/web/src/hooks/useReauthentication.ts
apps/web/src/hooks/useReauthentication.test.ts
apps/web/src/services/dataDeletionService.ts
apps/web/src/services/dataDeletionService.test.ts
apps/web/src/services/deviceService.ts
apps/web/src/services/deviceService.test.ts
apps/web/src/components/child/RemoveChildConfirmDialog.tsx
apps/web/src/components/child/RemoveChildConfirmDialog.test.tsx
apps/web/src/app/(protected)/children/[childId]/settings/page.tsx
apps/web/src/app/(protected)/children/[childId]/settings/page.test.tsx
```

**Files to Modify:**
```
packages/contracts/src/child.schema.ts          # Add removal schemas
packages/contracts/src/child.schema.test.ts     # Add removal schema tests
packages/contracts/src/index.ts                 # Export new types
packages/firebase-rules/firestore.rules         # Add deletion rules
apps/web/src/services/childService.ts           # Add removeChildFromFamily function
apps/web/src/services/childService.test.ts      # Add removal tests
apps/web/src/app/(protected)/dashboard/page.tsx # Add remove button to child list
```

### Important Considerations

1. **Data Safety**: This is a destructive operation. The implementation must:
   - Use batch operations to prevent partial deletion
   - Log the removal in audit trail BEFORE deleting data
   - Provide clear warnings about irreversibility
   - Require explicit confirmation (typing child's name)

2. **Future-Proofing**: The data deletion service should handle:
   - Screenshots (not yet implemented, but structure it)
   - Activity logs (not yet implemented)
   - Agreements (not yet implemented)
   - Device enrollments (basic structure for now)

3. **Re-authentication**: Firebase requires recent authentication for sensitive operations. The pattern:
   - Use `reauthenticateWithPopup` for Google Sign-In
   - Get fresh ID token after re-auth
   - Pass token to service for verification

4. **Child Account Handling**: For MVP, child accounts don't exist yet (Story 2.4 blocked). The removal service should:
   - Check for child account (future-proof)
   - If exists, convert to standalone
   - If not, proceed with deletion

---

## References

- [Source: docs/epics/epic-list.md#Story-2.6] - Original story requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: packages/contracts/src/child.schema.ts] - Existing child schema
- [Source: packages/contracts/src/audit.schema.ts] - Audit trail patterns
- [Source: apps/web/src/services/childService.ts] - Existing child service
- [Source: docs/sprint-artifacts/stories/2-5-edit-child-profile.md] - Previous story patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/2-6-remove-child-from-family.md
- Epic context: Epic 2 - Family Creation & Child Profiles
- Previous story: Story 2.5 - Edit Child Profile (completed)
- Blocked story: Story 2.4 - Child Profile Viewing by Child (requires child account system)

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- All tests passing: 590 tests (web) + 405 tests (contracts)
- Fixed SafetyResourcesLink source type issues across pages
- Firestore security rules updated to allow child deletion for guardians with full permissions

### Completion Notes List
- This is Story 6 of 8 in Epic 2
- Story 2.4 is blocked, so we continue with 2.6
- Builds on Story 2.5 patterns (audit trail, dialog components)
- Introduces destructive operation patterns
- Re-authentication flow is new pattern for sensitive operations
- Future-proofs for screenshot/activity data deletion
- NFR62 compliance: access removed within 5 minutes

### File List
**To Create:**
- `apps/web/src/hooks/useRemoveChild.ts`
- `apps/web/src/hooks/useRemoveChild.test.ts`
- `apps/web/src/hooks/useReauthentication.ts`
- `apps/web/src/hooks/useReauthentication.test.ts`
- `apps/web/src/services/dataDeletionService.ts`
- `apps/web/src/services/dataDeletionService.test.ts`
- `apps/web/src/services/deviceService.ts`
- `apps/web/src/services/deviceService.test.ts`
- `apps/web/src/components/child/RemoveChildConfirmDialog.tsx`
- `apps/web/src/components/child/RemoveChildConfirmDialog.test.tsx`
- `apps/web/src/app/(protected)/children/[childId]/settings/page.tsx`
- `apps/web/src/app/(protected)/children/[childId]/settings/page.test.tsx`

**To Modify:**
- `packages/contracts/src/child.schema.ts`
- `packages/contracts/src/child.schema.test.ts`
- `packages/contracts/src/index.ts`
- `packages/firebase-rules/firestore.rules`
- `apps/web/src/services/childService.ts`
- `apps/web/src/services/childService.test.ts`
- `apps/web/src/app/(protected)/dashboard/page.tsx`
