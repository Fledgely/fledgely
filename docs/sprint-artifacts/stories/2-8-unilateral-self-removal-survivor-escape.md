# Story 2.8: Unilateral Self-Removal (Survivor Escape)

**Status:** complete

---

## Story

As a **parent in an unsafe situation**,
I want **to immediately remove my own access without waiting 30 days**,
So that **I can escape the shared account without my abuser's cooperation**.

---

## Acceptance Criteria

### AC1: Self-Removal Access Control
**Given** a parent (guardian) of a family with shared custody
**When** they view family settings or dissolution options
**Then** they see an option to "Remove myself from this family"
**And** this option is separate from the family dissolution flow
**And** the option is clearly labeled as for personal removal only
**And** the button meets 44x44px touch targets (NFR49)

### AC2: Safety Confirmation Dialog
**Given** a parent selects self-removal
**When** the confirmation dialog appears
**Then** dialog explains this will immediately revoke their access
**And** explains they will no longer see any family data
**And** explains family continues to exist for other members
**And** explains child data remains intact with other guardian(s)
**And** clearly states NO notification will be sent to other members
**And** text is at 6th-grade reading level (NFR65)
**And** dialog has accessible role and focus management

### AC3: Re-authentication Required
**Given** a parent proceeds with self-removal
**When** they confirm the action
**Then** system requires re-authentication before proceeding
**And** re-authentication uses Google Sign-In (same as regular auth)
**And** re-auth token must be fresh (within last 5 minutes)
**And** if re-auth fails, self-removal is aborted with clear error message

### AC4: Immediate Access Revocation
**Given** a parent confirms self-removal with valid re-auth
**When** the removal is processed
**Then** their access is immediately revoked (no 30-day wait)
**And** they can no longer see any family data
**And** they are removed from the family's guardians array
**And** they are removed from each child's guardians/permissions
**And** the family continues to exist normally for other guardians
**And** child data, screenshots, agreements all remain intact

### AC5: No Notification to Remaining Family
**Given** a parent completes self-removal
**When** the process completes
**Then** NO notification is sent to other family members
**And** NO in-app alert appears for other guardians
**And** NO email is sent about their departure
**And** the remaining family simply no longer sees them as guardian

### AC6: Sealed Audit Trail
**Given** a parent completes self-removal
**When** the action is logged
**Then** action is logged in a SEALED audit record
**And** sealed audit is NOT visible to remaining family members
**And** sealed audit is stored in separate collection (sealed_audits)
**And** sealed audit includes: userId, familyId, timestamp, action type
**And** sealed audit is accessible ONLY by support agents (Epic 0.5)
**And** no entry appears in the family's regular audit log

### AC7: Domestic Abuse Resources Display
**Given** self-removal completes successfully
**When** the user sees the confirmation
**Then** confirmation includes domestic abuse resource links
**And** links include National Domestic Violence Hotline (1-800-799-7233)
**And** links include local crisis resources (if available)
**And** links reference Epic 0.5 Safety Contact feature
**And** message validates their decision without judgment
**And** message explains their data is no longer visible to family

### AC8: Single Guardian Family Handling
**Given** a family has only one guardian (single parent)
**When** they attempt self-removal
**Then** system warns this will leave children without any guardian
**And** suggests using family dissolution (Story 2.7) instead
**And** if they proceed anyway, family is flagged for support review
**And** children are NOT deleted (orphaned accounts need support handling)

### AC9: User Redirection After Removal
**Given** self-removal completes
**When** user is redirected
**Then** user is redirected to dashboard/home (no family view)
**And** family selector no longer shows this family
**And** if they had multiple families, other families remain accessible
**And** if this was their only family, they see "Create Family" option

### AC10: Error Handling
**Given** self-removal fails for any reason
**When** error occurs
**Then** error message is displayed at 6th-grade reading level
**And** no partial state changes occur (transaction rollback)
**And** user can retry the removal
**And** error is logged for debugging (NOT in family audit)

### AC11: Accessibility
**Given** a parent using assistive technology
**When** they perform self-removal
**Then** all dialogs are keyboard accessible (NFR43)
**And** confirmation warnings have proper ARIA labels
**And** process steps are announced via aria-live
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** focus is managed logically through the flow

---

## Tasks / Subtasks

### Task 1: Create Self-Removal Schemas (packages/contracts/src/selfRemoval.schema.ts)
- [x] 1.1 Create `selfRemovalConfirmationSchema` for user confirmation
- [x] 1.2 Create `selfRemovalResultSchema` for operation result
- [x] 1.3 Create `sealedAuditEntrySchema` for sealed audit records
- [x] 1.4 Add error messages at 6th-grade reading level
- [x] 1.5 Export types from index.ts
- [x] 1.6 Write unit tests for schema validation (36 tests passing)

### Task 2: Create Sealed Audit Service (apps/web/src/services/sealedAuditService.ts)
- [x] 2.1 Implement `createSealedAuditEntry(entry)` function
- [x] 2.2 Store in separate `sealed_audits` collection
- [x] 2.3 Ensure entries are NOT queryable from family context
- [x] 2.4 Add metadata: userId, familyId, action, timestamp
- [x] 2.5 Write unit tests for sealed audit

### Task 3: Create Self-Removal Service (apps/web/src/services/selfRemovalService.ts)
- [x] 3.1 Implement `removeSelfFromFamily(familyId, userId, reauthToken)` function
- [x] 3.2 Verify user is a guardian of the family
- [x] 3.3 Verify re-authentication token is valid and fresh
- [x] 3.4 Remove user from family.guardians array
- [x] 3.5 Remove user from each child's guardian permissions
- [x] 3.6 Handle single-guardian family warning/flagging
- [x] 3.7 Create sealed audit entry (NOT regular audit)
- [x] 3.8 Do NOT trigger any notifications
- [x] 3.9 Use batch/transaction for atomic operation
- [x] 3.10 Write unit tests for service

### Task 4: Create useSelfRemoval Hook (apps/web/src/hooks/useSelfRemoval.ts)
- [x] 4.1 Create `useSelfRemoval()` hook for state management
- [x] 4.2 Expose `removeSelf`, `loading`, `error`, `clearError`
- [x] 4.3 Expose `requiresReauth`, `setRequiresReauth`
- [x] 4.4 Implement idempotency guard (prevent double-click)
- [x] 4.5 Write unit tests for hook (14 tests passing)

### Task 5: Create SelfRemovalDialog Component
- [x] 5.1 Create dialog component with multi-step flow
- [x] 5.2 Step 1: Explanation of what self-removal means
- [x] 5.3 Step 2: Re-authentication confirmation
- [x] 5.4 Step 3: Processing state
- [x] 5.5 Step 4: Success with domestic abuse resources
- [x] 5.6 Handle single-guardian warning
- [x] 5.7 Integrate with useReauthentication hook
- [x] 5.8 44x44px minimum touch targets (NFR49)
- [x] 5.9 Accessible modal with focus trap
- [x] 5.10 Write component tests

### Task 6: Update Firestore Security Rules
- [x] 6.1 Add rules for sealed_audits collection (support agent read only)
- [x] 6.2 Add rules for self-removal operation
- [x] 6.3 Ensure sealed audits cannot be read by family members
- [x] 6.4 Test security rules with emulator

### Task 7: Link from Dissolution Flow
- [x] 7.1 Add "Remove myself only" option in dissolution dialog (AC10 from Story 2.7)
- [x] 7.2 Link to self-removal flow from dissolution explanation
- [x] 7.3 Ensure clear distinction between dissolution and self-removal

### Task 8: Write Tests
- [x] 8.1 Unit tests for self-removal schemas
- [x] 8.2 Unit tests for sealed audit service
- [x] 8.3 Unit tests for self-removal service
- [x] 8.4 Unit tests for useSelfRemoval hook
- [x] 8.5 Component tests for SelfRemovalDialog
- [x] 8.6 Adversarial tests: cross-family self-removal attempts
- [x] 8.7 Adversarial tests: sealed audit access attempts
- [x] 8.8 Accessibility tests for dialog

---

## Dev Notes

### Critical Requirements

This story implements **FR-SA4: Unilateral Self-Removal (Survivor Escape)**. This is a **life-safety feature** for victims of domestic abuse who need to escape a shared family account.

**CRITICAL SAFETY PATTERNS:**

1. **No Notification** - NEVER notify other family members about departure
2. **Sealed Audit** - NEVER log to family-visible audit trail
3. **Immediate Effect** - No cooling period (unlike dissolution)
4. **Resources Provided** - Always show domestic abuse resources
5. **No Judgment** - Language must be supportive, not questioning

### Architecture Patterns

**Sealed Audit Entry Schema:**
```typescript
// packages/contracts/src/selfRemoval.schema.ts

import { z } from 'zod'

/**
 * Sealed audit entry - NEVER visible to family members
 * Only accessible by support agents (Epic 0.5)
 *
 * CRITICAL: This collection has separate Firestore rules
 * that prevent family member access
 */
export const sealedAuditEntrySchema = z.object({
  /** Unique entry ID (Firestore document ID) */
  id: z.string().min(1),

  /** Type of sealed action */
  action: z.enum(['guardian_self_removed', 'safety_escape_initiated']),

  /** User who performed the action */
  userId: z.string().min(1),

  /** Family the action affected */
  familyId: z.string().min(1),

  /** When the action occurred */
  performedAt: z.date(),

  /** Additional context (optional) */
  metadata: z.record(z.unknown()).optional(),
})

export type SealedAuditEntry = z.infer<typeof sealedAuditEntrySchema>

/**
 * Self-removal confirmation input
 */
export const selfRemovalConfirmationSchema = z.object({
  familyId: z.string().min(1, 'Family ID is required'),
  reauthToken: z.string().min(1, 'Re-authentication required'),
  acknowledgeNoReturn: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge this action' }),
  }),
})

export type SelfRemovalConfirmation = z.infer<typeof selfRemovalConfirmationSchema>

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
export const SELF_REMOVAL_ERROR_MESSAGES: Record<string, string> = {
  'family-not-found': 'We could not find this family.',
  'not-a-guardian': 'You are not a member of this family.',
  'reauth-required': 'Please sign in again to confirm this action.',
  'reauth-expired': 'Your sign-in has expired. Please try again.',
  'removal-failed': 'Could not remove you from the family. Please try again.',
  'single-guardian': 'You are the only guardian. Consider family dissolution instead.',
  default: 'Something went wrong. Please try again.',
}

export function getSelfRemovalErrorMessage(code: string): string {
  return SELF_REMOVAL_ERROR_MESSAGES[code] || SELF_REMOVAL_ERROR_MESSAGES.default
}
```

**Self-Removal Service Pattern:**
```typescript
// apps/web/src/services/selfRemovalService.ts

import {
  doc,
  getDoc,
  writeBatch,
  collection,
  serverTimestamp,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getSelfRemovalErrorMessage } from '@fledgely/contracts'

const FAMILIES_COLLECTION = 'families'
const CHILDREN_COLLECTION = 'children'
const SEALED_AUDITS_COLLECTION = 'sealed_audits' // Separate collection!

/**
 * Remove current user from family (Survivor Escape)
 *
 * CRITICAL: This function must:
 * 1. NOT create any family-visible audit entries
 * 2. NOT trigger any notifications
 * 3. Use sealed_audits collection for logging
 *
 * Story 2.8: Unilateral Self-Removal
 */
export async function removeSelfFromFamily(
  familyId: string,
  userId: string,
  reauthToken: string
): Promise<{ success: boolean; isSingleGuardian: boolean }> {
  // 1. Get family document
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
  const familyDoc = await getDoc(familyRef)

  if (!familyDoc.exists()) {
    throw new SelfRemovalServiceError('family-not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardians = familyData.guardians as Array<{ uid: string }>

  // 2. Verify user is a guardian
  const userGuardian = guardians.find(g => g.uid === userId)
  if (!userGuardian) {
    throw new SelfRemovalServiceError('not-a-guardian', 'Not a guardian')
  }

  // 3. Verify re-authentication
  if (!reauthToken) {
    throw new SelfRemovalServiceError('reauth-required', 'Re-auth required')
  }

  // 4. Check if single guardian (warning case)
  const isSingleGuardian = guardians.length === 1

  // 5. Execute removal in batch (atomic)
  const batch = writeBatch(db)

  // Remove from family guardians
  batch.update(familyRef, {
    guardians: arrayRemove(userGuardian),
    updatedAt: serverTimestamp(),
  })

  // If single guardian, flag family for support review
  if (isSingleGuardian) {
    batch.update(familyRef, {
      'flags.orphanedByEscape': true,
      'flags.orphanedAt': serverTimestamp(),
    })
  }

  // Remove from each child's guardian permissions
  const children = familyData.children as string[]
  for (const childId of children) {
    const childRef = doc(db, FAMILIES_COLLECTION, familyId, CHILDREN_COLLECTION, childId)
    batch.update(childRef, {
      [`guardianPermissions.${userId}`]: null, // Remove their permissions
      updatedAt: serverTimestamp(),
    })
  }

  // Create SEALED audit entry (NOT regular audit!)
  const sealedAuditRef = doc(collection(db, SEALED_AUDITS_COLLECTION))
  batch.set(sealedAuditRef, {
    id: sealedAuditRef.id,
    action: 'guardian_self_removed',
    userId,
    familyId,
    performedAt: serverTimestamp(),
    metadata: {
      wasOnlyGuardian: isSingleGuardian,
      remainingGuardians: guardians.length - 1,
    },
  })

  // DO NOT create any entry in family audit log!
  // DO NOT trigger any notifications!

  await batch.commit()

  return { success: true, isSingleGuardian }
}
```

**Firestore Security Rules for Sealed Audits:**
```javascript
// Add to packages/firebase-rules/firestore.rules

// Sealed audits - NEVER accessible by family members
match /sealed_audits/{auditId} {
  // Only support agents can read
  allow read: if request.auth.token.role == 'support_agent';

  // Only server can write (via Admin SDK in production)
  // For client-side, allow write if user is removing themselves
  allow create: if request.auth != null &&
    request.resource.data.userId == request.auth.uid &&
    request.resource.data.action == 'guardian_self_removed';

  // Never allow updates or deletes
  allow update, delete: if false;
}
```

**Domestic Abuse Resources Component:**
```typescript
// apps/web/src/components/safety/DomesticAbuseResources.tsx

/**
 * Display domestic abuse resources after self-removal
 *
 * Resources shown:
 * - National Domestic Violence Hotline: 1-800-799-7233
 * - Text START to 88788
 * - thehotline.org
 *
 * Story 2.8: Unilateral Self-Removal
 */
export function DomesticAbuseResources() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950">
      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
        Support Resources
      </h3>
      <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
        If you are in an unsafe situation, help is available:
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        <li>
          <strong>National Domestic Violence Hotline:</strong>{' '}
          <a href="tel:1-800-799-7233" className="underline">
            1-800-799-7233
          </a>
        </li>
        <li>
          <strong>Text:</strong> START to 88788
        </li>
        <li>
          <strong>Online:</strong>{' '}
          <a
            href="https://www.thehotline.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            thehotline.org
          </a>
        </li>
      </ul>
      <p className="mt-3 text-xs text-blue-700 dark:text-blue-300">
        Your safety matters. These resources are confidential.
      </p>
    </div>
  )
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | All schemas with z.infer<> |
| INV-002 | Direct Firestore SDK | writeBatch, doc directly |
| INV-003 | Cross-family isolation | Security rules verify guardian status |
| NFR42 | WCAG 2.1 AA | Accessible dialogs, aria-live announcements |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR49 | 44x44px touch targets | Buttons sized appropriately |
| NFR65 | 6th-grade reading level | Simple explanation and error messages |

### Previous Story Intelligence

**Story 2.7 Learnings:**
1. Re-authentication pattern with `useReauthentication` hook works well
2. Multi-step dialogs with clear progress indication
3. Batch operations for atomic updates
4. Idempotency guards prevent duplicate submissions
5. Error messages at 6th-grade reading level

**Key Difference from Story 2.7:**
- Dissolution notifies everyone and has 30-day cooling period
- Self-removal is SILENT and IMMEDIATE
- Dissolution logs to family audit; Self-removal logs to SEALED audit

**Files from Previous Stories to Reference:**
- `packages/contracts/src/dissolution.schema.ts` - Schema patterns
- `apps/web/src/services/dissolutionService.ts` - Service patterns
- `apps/web/src/hooks/useDissolution.ts` - Hook patterns
- `apps/web/src/hooks/useReauthentication.ts` - Re-auth pattern
- `apps/web/src/components/dissolution/DissolutionInitiateDialog.tsx` - Dialog patterns
- `packages/contracts/src/safety-request.schema.ts` - Safety data isolation patterns

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
packages/contracts/src/selfRemoval.schema.ts
packages/contracts/src/selfRemoval.schema.test.ts
apps/web/src/services/sealedAuditService.ts
apps/web/src/services/sealedAuditService.test.ts
apps/web/src/services/selfRemovalService.ts
apps/web/src/services/selfRemovalService.test.ts
apps/web/src/hooks/useSelfRemoval.ts
apps/web/src/hooks/useSelfRemoval.test.ts
apps/web/src/components/dissolution/SelfRemovalDialog.tsx
apps/web/src/components/dissolution/SelfRemovalDialog.test.tsx
apps/web/src/components/safety/DomesticAbuseResources.tsx
```

**Files to Modify:**
```
packages/contracts/src/index.ts                 # Export new types
packages/firebase-rules/firestore.rules         # Add sealed_audits rules
apps/web/src/components/dissolution/index.ts    # Export SelfRemovalDialog
apps/web/src/components/dissolution/DissolutionInitiateDialog.tsx  # Add self-removal link
```

### Important Considerations

1. **Safety-First Design**: This feature exists specifically for abuse survivors. Every design decision must prioritize their safety over convenience for other users.

2. **Sealed Audit Isolation**: The `sealed_audits` collection MUST be completely separate and have different security rules. Family members should NEVER be able to query or access these records.

3. **No Notification Pattern**: Unlike every other family action, this one must NOT trigger any notification mechanism. Double-check there are no Firebase triggers that might send notifications.

4. **Single Guardian Handling**: When the last guardian leaves, children become "orphaned" in the system. This is flagged for support review (Epic 0.5 support agent dashboard) rather than automatically deleting.

5. **Resources Are Critical**: The domestic abuse resources shown after self-removal may be the last touchpoint before someone exits the app. Make them prominent and helpful.

6. **Language Matters**: All text must be supportive and non-judgmental. Never question why someone is leaving or suggest they reconsider.

---

## References

- [Source: docs/epics/epic-list.md#Story-2.8] - Original story requirements
- [Source: docs/epics/epic-summary.md#FR-SA4] - Domestic Abuse Survivor feature
- [Source: docs/sprint-artifacts/stories/2-7-family-dissolution-initiation.md] - Previous story patterns
- [Source: packages/contracts/src/safety-request.schema.ts] - Safety data isolation patterns
- [Source: apps/web/src/hooks/useReauthentication.ts] - Re-auth pattern

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/2-8-unilateral-self-removal-survivor-escape.md
- Epic context: Epic 2 - Family Creation & Child Profiles
- Previous story: Story 2.7 - Family Dissolution Initiation (completed)
- Related epic: Epic 0.5 - Safe Account Escape (completed)

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change | Files |
|------|--------|-------|
