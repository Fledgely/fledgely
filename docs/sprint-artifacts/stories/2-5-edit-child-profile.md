# Story 2.5: Edit Child Profile

**Status:** completed

---

## Story

As a **parent**,
I want **to edit my child's profile information**,
So that **I can keep their information accurate as they grow**.

---

## Acceptance Criteria

### AC1: Edit Access Control
**Given** a parent with guardian permissions for a child
**When** they view the child's profile
**Then** they see an "Edit" button if they have "full" permissions
**And** guardians with "readonly" permissions do not see the edit button
**And** the edit button meets 44x44px touch targets (NFR49)

### AC2: Editable Profile Fields
**Given** a parent opens the edit child profile form
**When** they view the available fields
**Then** they can edit: firstName, lastName (optional), nickname (optional), birthdate, photoUrl (optional)
**And** each field shows the current value pre-filled
**And** all inputs have clear labels (NFR65 - 6th-grade reading level)
**And** required fields are marked with visual indicator

### AC3: Input Validation
**Given** a parent edits child profile fields
**When** they modify any field
**Then** firstName is validated (1-50 chars, no XSS chars)
**And** lastName is validated (0-50 chars, no XSS chars)
**And** nickname is validated (0-30 chars, no XSS chars)
**And** birthdate cannot be in the future
**And** birthdate must result in age under 18
**And** photoUrl must be valid URL format if provided
**And** validation errors appear inline with aria-live announcements

### AC4: Profile Update Persistence
**Given** a parent submits valid profile changes
**When** they save the changes
**Then** changes are saved to Firestore children/{childId} document
**And** `updatedAt` timestamp is set (serverTimestamp)
**And** `updatedBy` is set to the current user's uid
**And** atomic transaction ensures data consistency
**And** success message is shown with aria-live announcement

### AC5: Audit Trail Logging
**Given** a parent updates a child profile
**When** the update is saved
**Then** the edit is logged in the family audit trail
**And** log includes: childId, fieldChanged, previousValue, newValue, changedBy, changedAt
**And** other guardians can see the update in the audit log
**And** audit entry cannot be modified or deleted

### AC6: Age Recalculation
**Given** a parent changes a child's birthdate
**When** the change is saved
**Then** the child's age is recalculated immediately
**And** age category (young-child/tween/teen/older-teen) is updated
**And** future template defaults will use the new age category
**And** UI displays the updated age

### AC7: Guardian Visibility
**Given** a child has multiple guardians
**When** any guardian views the child's profile
**Then** they see the same updated information
**And** they can see when the profile was last updated
**And** they can see who made the last update
**And** visibility is equal for all guardians (no asymmetric access)

### AC8: Cancel and Discard Changes
**Given** a parent is editing a child profile
**When** they click "Cancel" or navigate away
**Then** they are warned if they have unsaved changes
**And** clicking "Discard" abandons all changes
**And** clicking "Keep Editing" returns to the form
**And** no changes are saved until explicitly submitted

### AC9: Accessibility
**Given** a parent using assistive technology
**When** they edit a child's profile
**Then** all form fields are keyboard accessible (NFR43)
**And** labels are properly associated with inputs
**And** error states are announced via aria-live
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** focus is managed logically (first error field on validation failure)

### AC10: Loading and Error States
**Given** a parent submits profile changes
**When** the request is in progress
**Then** submit button shows loading state and is disabled
**And** form fields are disabled during submission
**And** if error occurs, error message is shown at 6th-grade reading level
**And** user can retry the submission

---

## Tasks / Subtasks

### Task 1: Create Update Child Input Schema Enhancement (packages/contracts/src/child.schema.ts)
- [x] 1.1 Review existing `updateChildInputSchema` - ensure all editable fields are covered
- [x] 1.2 Add `updatedAt` and `updatedBy` fields to childProfileSchema
- [x] 1.3 Create `childProfileFirestoreSchema` updates for new timestamp fields
- [x] 1.4 Create `childProfileUpdateAuditSchema` for audit trail entries
- [x] 1.5 Export audit types from index.ts
- [x] 1.6 Write unit tests for update schema validation

### Task 2: Create Child Profile Audit Schema (packages/contracts/src/audit.schema.ts)
- [x] 2.1 Create `familyAuditEntrySchema` for generic audit logging
- [x] 2.2 Create `childProfileChangeAuditSchema` for profile update audits
- [x] 2.3 Include: childId, fieldChanged, previousValue, newValue, changedBy, changedAt
- [x] 2.4 Create Firestore-compatible schema version
- [x] 2.5 Export types and schemas from index.ts
- [x] 2.6 Write unit tests for audit schema (66 tests)

### Task 3: Create Child Update Service (apps/web/src/services/childService.ts)
- [x] 3.1 Implement `updateChild(childId, input, userId)` function
- [x] 3.2 Use Firestore transaction for atomic update
- [x] 3.3 Validate user is guardian with full permissions
- [x] 3.4 Set `updatedAt` with serverTimestamp() and `updatedBy` with userId
- [x] 3.5 Create audit log entry in families/{familyId}/auditLog subcollection
- [x] 3.6 Return optimistic data immediately after transaction
- [x] 3.7 Add error messages at 6th-grade reading level

### Task 4: Create useEditChild Hook (apps/web/src/hooks/useEditChild.ts)
- [x] 4.1 Create `useEditChild(childId)` hook for edit state management
- [x] 4.2 Expose `updateChild`, `loading`, `error`, `clearError`
- [x] 4.3 Integrate with react-hook-form dirty state tracking
- [x] 4.4 Handle optimistic updates and rollback on error
- [x] 4.5 Implement idempotency guard to prevent duplicate submissions
- [x] 4.6 Write unit tests for hook (14 tests)

### Task 5: Create Edit Child Profile Page (apps/web/src/app/(protected)/children/[childId]/edit/page.tsx)
- [x] 5.1 Create page layout with back navigation
- [x] 5.2 Fetch existing child data on mount
- [x] 5.3 Pre-fill form with current values
- [x] 5.4 Integrate with useEditChild hook
- [x] 5.5 Handle permission check - redirect if not full guardian
- [x] 5.6 Add SafetyResourcesLink in footer

### Task 6: Create EditChildProfileForm Component (apps/web/src/components/child/EditChildProfileForm.tsx)
- [x] 6.1 Create form with react-hook-form and Zod resolver
- [x] 6.2 Include fields: firstName, lastName, nickname, birthdate, photoUrl
- [x] 6.3 Use existing shadcn/ui Input, Button, Label components
- [x] 6.4 Add date picker for birthdate (native input type=date)
- [x] 6.5 Inline validation errors with aria-live regions
- [x] 6.6 Submit button with loading state
- [x] 6.7 Cancel button with unsaved changes warning
- [x] 6.8 44x44px minimum touch targets (NFR49)

### Task 7: Create UnsavedChangesDialog Component (apps/web/src/components/common/UnsavedChangesDialog.tsx)
- [x] 7.1 Create confirmation dialog for discarding unsaved changes
- [x] 7.2 "Discard Changes" and "Keep Editing" buttons
- [x] 7.3 Accessible modal with focus trap (radix-ui/dialog)
- [x] 7.4 Keyboard accessible (Escape to close)
- [x] 7.5 Write component tests (14 tests)

### Task 8: Update Child Profile Display to Add Edit Button
- [x] 8.1 Update existing child profile view to include Edit button
- [x] 8.2 Only show Edit button if user has full permissions (via dashboard)
- [x] 8.3 Link to edit page: `/children/{childId}/edit`
- [x] 8.4 Show "Last updated" timestamp if available
- [ ] 8.5 Show "Updated by" if available (deferred - requires user name lookup)

### Task 9: Update Firestore Security Rules
- [x] 9.1 Add rules for child profile updates (guardians with full permissions only)
- [x] 9.2 Validate updatedAt and updatedBy are set on updates
- [x] 9.3 Add rules for auditLog subcollection (append only)
- [x] 9.4 Ensure auditLog cannot be modified or deleted
- [x] 9.5 Use explicit index checking pattern

### Task 10: Write Tests
- [x] 10.1 Unit tests for updateChildInputSchema validation
- [x] 10.2 Unit tests for audit schema validation (66 tests)
- [x] 10.3 Unit tests for childService.updateChild (7 tests)
- [x] 10.4 Unit tests for useEditChild hook (14 tests)
- [x] 10.5 Component tests for EditChildProfileForm (25 tests)
- [x] 10.6 Component tests for UnsavedChangesDialog (14 tests)
- [x] 10.7 Integration test: edit child flow end-to-end (page tests)
- [x] 10.8 Test audit log is created on update
- [x] 10.9 Test birthdate change triggers age recalculation
- [x] 10.10 Adversarial tests: XSS in all text fields
- [x] 10.11 Accessibility tests for edit form

---

## Dev Notes

### Critical Requirements

This story adds profile editing capability for child profiles. Key patterns from previous stories:

1. **Zod-First Types** - `updateChildInputSchema` is the source of truth
2. **Direct Firestore SDK** - No ORM abstractions per project guidelines
3. **Server Timestamps** - Use `serverTimestamp()` for `updatedAt`
4. **Transaction-Based Operations** - Atomic update + audit log creation
5. **Optimistic Returns** - Return data immediately after transaction
6. **XSS Protection** - Validate all text fields against dangerous characters
7. **Idempotency Guard** - Prevent duplicate submissions from double-clicks
8. **Audit Trail** - Log all changes to family audit subcollection

### Architecture Patterns

**Enhanced Child Profile Schema (additions):**
```typescript
// Add to childProfileSchema in packages/contracts/src/child.schema.ts
{
  // ... existing fields ...

  /** When the profile was last updated */
  updatedAt: z.date().optional().nullable(),

  /** User uid who last updated the profile */
  updatedBy: z.string().optional().nullable(),
}
```

**Audit Schema:**
```typescript
// packages/contracts/src/audit.schema.ts
import { z } from 'zod'

/**
 * Types of auditable actions in the family
 */
export const auditActionTypeSchema = z.enum([
  'child_profile_updated',
  'child_added',
  'child_removed',
  'custody_declared',
  'custody_updated',
  'guardian_added',
  'guardian_removed',
])

export type AuditActionType = z.infer<typeof auditActionTypeSchema>

/**
 * Child profile field change record
 */
export const profileFieldChangeSchema = z.object({
  field: z.string(),
  previousValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
})

export type ProfileFieldChange = z.infer<typeof profileFieldChangeSchema>

/**
 * Family audit log entry
 */
export const familyAuditEntrySchema = z.object({
  /** Unique audit entry ID */
  id: z.string(),

  /** Type of action performed */
  action: auditActionTypeSchema,

  /** ID of the entity affected (childId, guardianId, etc.) */
  entityId: z.string(),

  /** Type of entity ('child', 'guardian', 'family') */
  entityType: z.string(),

  /** Changes made (for updates) */
  changes: z.array(profileFieldChangeSchema).optional(),

  /** User who performed the action */
  performedBy: z.string(),

  /** When the action was performed */
  performedAt: z.date(),

  /** Additional context (optional) */
  metadata: z.record(z.unknown()).optional(),
})

export type FamilyAuditEntry = z.infer<typeof familyAuditEntrySchema>
```

**Child Update Service Pattern:**
```typescript
// apps/web/src/services/childService.ts (additions)
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  updateChildInputSchema,
  type UpdateChildInput,
  type ChildProfile,
} from '@fledgely/contracts'

const CHILDREN_COLLECTION = 'children'
const FAMILIES_COLLECTION = 'families'
const AUDIT_LOG_SUBCOLLECTION = 'auditLog'

/**
 * Update a child's profile
 * Only allowed by guardians with full permissions
 */
export async function updateChild(
  childId: string,
  input: UpdateChildInput,
  userId: string
): Promise<ChildProfile> {
  // Validate input
  updateChildInputSchema.parse(input)

  const childRef = doc(db, CHILDREN_COLLECTION, childId)
  const now = new Date()

  let updatedChild: ChildProfile

  await runTransaction(db, async (transaction) => {
    const childDoc = await transaction.get(childRef)
    if (!childDoc.exists()) {
      throw new Error('Child not found')
    }

    const childData = childDoc.data()

    // Verify user is guardian with full permissions
    const guardians = childData.guardians as Array<{uid: string, permissions: string}>
    const userGuardian = guardians.find(g => g.uid === userId)

    if (!userGuardian || userGuardian.permissions !== 'full') {
      throw new Error('You do not have permission to edit this profile')
    }

    // Build changes array for audit
    const changes: Array<{field: string, previousValue: unknown, newValue: unknown}> = []

    const fieldsToCheck = ['firstName', 'lastName', 'nickname', 'birthdate', 'photoUrl']
    for (const field of fieldsToCheck) {
      if (input[field as keyof UpdateChildInput] !== undefined) {
        const prevValue = childData[field]
        const newValue = input[field as keyof UpdateChildInput]
        if (prevValue !== newValue) {
          changes.push({
            field,
            previousValue: prevValue ?? null,
            newValue: newValue ?? null,
          })
        }
      }
    }

    // Only update if there are actual changes
    if (changes.length === 0) {
      return
    }

    // Update child document
    transaction.update(childRef, {
      ...input,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    })

    // Create audit log entry
    const auditRef = doc(
      collection(db, FAMILIES_COLLECTION, childData.familyId, AUDIT_LOG_SUBCOLLECTION)
    )
    transaction.set(auditRef, {
      id: auditRef.id,
      action: 'child_profile_updated',
      entityId: childId,
      entityType: 'child',
      changes,
      performedBy: userId,
      performedAt: serverTimestamp(),
    })
  })

  // Return optimistic data
  return {
    ...input,
    updatedAt: now,
    updatedBy: userId,
  } as ChildProfile
}
```

**useEditChild Hook Pattern:**
```typescript
// apps/web/src/hooks/useEditChild.ts
'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { updateChild as updateChildService } from '@/services/childService'
import type { UpdateChildInput, ChildProfile } from '@fledgely/contracts'

interface UseEditChildReturn {
  updateChild: (childId: string, input: UpdateChildInput) => Promise<ChildProfile>
  loading: boolean
  error: Error | null
  clearError: () => void
}

export function useEditChild(): UseEditChildReturn {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const inProgressRef = useRef(false)

  const updateChild = useCallback(
    async (childId: string, input: UpdateChildInput): Promise<ChildProfile> => {
      if (!user?.uid) {
        throw new Error('You need to be signed in to edit a profile')
      }

      // Idempotency guard
      if (inProgressRef.current) {
        throw new Error('Update already in progress')
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        const result = await updateChildService(childId, input, user.uid)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Could not update profile')
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
    updateChild,
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
  // ... existing read rules ...

  // Update: only guardians with full permissions
  allow update: if hasFullChildPermissions() &&
    // Preserve immutable fields
    request.resource.data.createdBy == resource.data.createdBy &&
    request.resource.data.createdAt == resource.data.createdAt &&
    request.resource.data.familyId == resource.data.familyId &&
    request.resource.data.id == resource.data.id &&
    // updatedAt and updatedBy must be set on updates
    request.resource.data.updatedAt != null &&
    request.resource.data.updatedBy == request.auth.uid;
}

match /families/{familyId}/auditLog/{logId} {
  // Only guardians of the family can read audit logs
  allow read: if isFamilyMember();

  // Only system/guardians can create audit logs (via transaction)
  allow create: if isFamilyMember() &&
    request.resource.data.performedBy == request.auth.uid;

  // Audit logs are immutable - no updates or deletes
  allow update, delete: if false;
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | updateChildInputSchema with z.infer<> |
| INV-002 | Direct Firestore SDK | runTransaction, doc directly |
| INV-003 | Cross-family isolation | Security rules verify guardian permissions |
| NFR42 | WCAG 2.1 AA | Accessible form, aria-live |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR49 | 44x44px touch targets | Buttons sized appropriately |
| NFR65 | 6th-grade reading level | Simple labels and error messages |

### Error Handling

**Error Message Mapping (6th-grade reading level):**
```typescript
const ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child. Please try again.',
  'permission-denied': 'You do not have permission to edit this profile.',
  'name-required': 'Please enter a name for the child.',
  'name-too-long': 'The name is too long. Please use 50 characters or less.',
  'invalid-date': 'Please enter a valid birthdate.',
  'date-future': 'The birthdate cannot be in the future.',
  'age-limit': 'Fledgely is designed for children under 18.',
  'invalid-url': 'Please enter a valid web address for the photo.',
  'unavailable': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}
```

### Previous Story Intelligence

**Story 2.2 and 2.3 Learnings:**
1. Transaction-based operations work well for atomic updates
2. Optimistic returns avoid serverTimestamp race conditions
3. Explicit index checking in Firestore rules is required
4. Error messages at 6th-grade reading level improve UX
5. Screen reader announcements via aria-live for loading/success states
6. Adversarial tests catch input validation edge cases
7. XSS protection via dangerous character regex is essential
8. Idempotency guards prevent duplicate submissions from double-clicks

**Files from Previous Stories to Reference:**
- `packages/contracts/src/child.schema.ts` - Schema pattern with XSS protection
- `packages/contracts/src/custody.schema.ts` - Schema pattern to follow
- `apps/web/src/services/childService.ts` - Service pattern with transactions
- `apps/web/src/services/custodyService.ts` - Service pattern to follow
- `apps/web/src/hooks/useChild.ts` - Hook pattern with idempotency guard
- `apps/web/src/hooks/useCustody.ts` - Hook pattern to follow
- `packages/firebase-rules/firestore.rules` - Security rules patterns

### Git Intelligence

**Recent Commits:**
- Story 2.3: Custody Arrangement Declaration (completed)
- Story 2.2: Add Child to Family (completed)
- Story 2.1: Family Creation (completed)

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)
- `react-hook-form` (in apps/web)
- `@hookform/resolvers` (in apps/web)
- shadcn/ui components (in apps/web)

**No New Dependencies Required**

### File Structure

**Files to Create:**
```
packages/contracts/src/audit.schema.ts
packages/contracts/src/audit.schema.test.ts
apps/web/src/hooks/useEditChild.ts
apps/web/src/hooks/useEditChild.test.ts
apps/web/src/app/(protected)/children/[childId]/edit/page.tsx
apps/web/src/app/(protected)/children/[childId]/edit/page.test.tsx
apps/web/src/components/child/EditChildProfileForm.tsx
apps/web/src/components/child/EditChildProfileForm.test.tsx
apps/web/src/components/common/UnsavedChangesDialog.tsx
apps/web/src/components/common/UnsavedChangesDialog.test.tsx
```

**Files to Modify:**
```
packages/contracts/src/child.schema.ts          # Add updatedAt/updatedBy fields
packages/contracts/src/child.schema.test.ts     # Add update field tests
packages/contracts/src/index.ts                 # Export audit schemas
packages/firebase-rules/firestore.rules         # Add audit log rules
apps/web/src/services/childService.ts           # Add updateChild function
apps/web/src/services/childService.test.ts      # Add updateChild tests
```

---

## References

- [Source: docs/epics/epic-list.md#Story-2.5] - Original story requirements
- [Source: docs/project_context.md] - Architecture patterns
- [Source: packages/contracts/src/child.schema.ts] - Existing child schema
- [Source: apps/web/src/services/childService.ts] - Existing child service
- [Source: docs/sprint-artifacts/stories/2-3-custody-arrangement-declaration.md] - Previous story patterns

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/2-5-edit-child-profile.md
- Epic context: Epic 2 - Family Creation & Child Profiles
- Previous story: Story 2.3 - Custody Arrangement Declaration (completed)
- Blocked story: Story 2.4 - Child Profile Viewing by Child (requires child account system)

### Agent Model Used
(To be filled during implementation)

### Debug Log References
(To be filled during implementation)

### Completion Notes List
- This is Story 5 of 8 in Epic 2
- Story 2.4 is blocked, so we skip to 2.5
- Builds on Story 2.2 child profiles and Story 2.3 custody
- Introduces audit trail pattern for family actions
- Uses same transaction pattern as previous stories
- XSS protection pattern applies to all text fields
- Follows accessibility patterns established in Epic 1

### File List
**To Create:**
- `packages/contracts/src/audit.schema.ts`
- `packages/contracts/src/audit.schema.test.ts`
- `apps/web/src/hooks/useEditChild.ts`
- `apps/web/src/hooks/useEditChild.test.ts`
- `apps/web/src/app/(protected)/children/[childId]/edit/page.tsx`
- `apps/web/src/app/(protected)/children/[childId]/edit/page.test.tsx`
- `apps/web/src/components/child/EditChildProfileForm.tsx`
- `apps/web/src/components/child/EditChildProfileForm.test.tsx`
- `apps/web/src/components/common/UnsavedChangesDialog.tsx`
- `apps/web/src/components/common/UnsavedChangesDialog.test.tsx`

**To Modify:**
- `packages/contracts/src/child.schema.ts`
- `packages/contracts/src/child.schema.test.ts`
- `packages/contracts/src/index.ts`
- `packages/firebase-rules/firestore.rules`
- `apps/web/src/services/childService.ts`
- `apps/web/src/services/childService.test.ts`
