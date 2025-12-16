# Story 3.3: Co-Parent Invitation Acceptance

**Status:** ready-for-dev

---

## Story

As an **invited co-parent**,
I want **to accept the invitation and join the family**,
So that **I can co-manage our children's digital activity**.

---

## Acceptance Criteria

### AC1: Join Page Landing
**Given** a person clicks a valid invitation link
**When** they arrive at the join page `/join/{invitationId}?token={token}`
**Then** system validates the invitation exists and is pending
**And** system validates the token matches (timing-safe comparison)
**And** page displays family name and inviter's name
**And** page explains what joining means in simple terms (NFR65)
**And** "Sign in with Google" button is prominently displayed
**And** page is mobile-responsive and accessible (NFR42, NFR43)

### AC2: Invalid/Expired Invitation Handling
**Given** a person clicks an invitation link
**When** the invitation is invalid, expired, already used, or revoked
**Then** system displays appropriate error message:
  - Expired: "This invitation has expired. Please ask [inviter name] to send a new one."
  - Already used: "This invitation has already been accepted."
  - Revoked: "This invitation was canceled."
  - Invalid token: "This invitation link is not valid."
**And** error messages are at 6th-grade reading level (NFR65)
**And** system suggests next steps (contact inviter)
**And** no family data is revealed for invalid invitations

### AC3: Authentication Flow (New User)
**Given** an invited person without a fledgely account
**When** they click "Sign in with Google" on the join page
**Then** Google Sign-In flow initiates (same as Story 1.1)
**And** upon successful auth, user account is created (Story 1.2)
**And** user is redirected back to complete the invitation acceptance
**And** sign-in state persists during redirect

### AC4: Authentication Flow (Existing User)
**Given** an invited person with an existing fledgely account
**When** they click "Sign in with Google" on the join page
**Then** Google Sign-In flow initiates
**And** upon successful auth, existing user is authenticated
**And** user is redirected back to complete the invitation acceptance
**And** if user is already logged in, proceed directly to acceptance

### AC5: Guardian Addition to Family
**Given** an authenticated user accepts a valid invitation
**When** the acceptance is processed
**Then** user is added as guardian to the family document
**And** user is added as guardian to ALL children in the family
**And** guardian entry includes `role: "parent"` (not "caregiver")
**And** guardian entry includes `permissions: "full"` (identical to inviter)
**And** guardian entry includes `uid`, `displayName`, `email`
**And** user's `guardianOf` array in their profile is updated

### AC6: Equal Access Guarantee
**Given** a co-parent has accepted an invitation
**When** they access family data
**Then** they have identical permissions to the inviting parent
**And** they can see all children in the family
**And** they can see all screenshots across all devices
**And** they can view all agreements
**And** they can propose agreement changes
**And** they can invite caregivers
**And** Epic 3A data symmetry rules apply immediately

### AC7: Invitation Status Update
**Given** an invitation is accepted
**When** the acceptance completes successfully
**Then** invitation status is updated to 'accepted'
**And** `acceptedAt` timestamp is recorded
**And** `acceptedBy` is set to accepting user's UID
**And** invitation can no longer be used (single-use enforced)

### AC8: Audit Trail
**Given** an invitation is accepted
**When** the acceptance completes
**Then** audit entry is created in family audit log
**And** audit includes: action type, performed by, timestamp
**And** audit includes: invitation ID, accepting user display name
**And** audit is visible to all family guardians

### AC9: Confirmation Notifications
**Given** an invitation is accepted
**When** the acceptance completes
**Then** accepting co-parent sees success confirmation page
**And** confirmation shows family name and children count
**And** confirmation has "Go to Dashboard" button
**And** inviting parent receives notification of acceptance (optional - if notifications exist)

### AC10: Prevent Self-Invitation
**Given** a user tries to accept their own invitation
**When** they authenticate with the same account that created the invitation
**Then** system displays friendly error message
**And** message explains they cannot join a family they created
**And** suggests sharing the link with their co-parent instead

### AC11: Prevent Duplicate Guardian
**Given** a user tries to accept an invitation for a family they're already in
**When** they authenticate and are already a guardian
**Then** system displays informational message
**And** message explains they're already a member of this family
**And** redirects to dashboard instead of adding duplicate entry

### AC12: Accessibility
**Given** a person using assistive technology
**When** they navigate the invitation acceptance flow
**Then** all interactive elements are keyboard accessible (NFR43)
**And** all buttons meet 44x44px minimum touch target (NFR49)
**And** focus order follows logical sequence
**And** success/error messages use aria-live regions
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** all text is at 6th-grade reading level (NFR65)

---

## Tasks / Subtasks

### Task 1: Update Invitation Schema for Acceptance (packages/contracts/src/invitation.schema.ts)
- [ ] 1.1 Add `AcceptInvitationInput` schema (invitationId, token)
- [ ] 1.2 Add acceptance-related error messages at 6th-grade reading level
- [ ] 1.3 Add `validateAcceptInvitationInput()` helper function
- [ ] 1.4 Export new types from packages/contracts/src/index.ts
- [ ] 1.5 Write unit tests for new schemas

### Task 2: Create Invitation Acceptance Service (apps/web/src/services/invitationService.ts)
- [ ] 2.1 Add `acceptInvitation(invitationId, token, userId)` function
- [ ] 2.2 Implement guardian addition to family document
- [ ] 2.3 Implement guardian addition to all children documents
- [ ] 2.4 Update user's `guardianOf` array in profile
- [ ] 2.5 Update invitation status to 'accepted'
- [ ] 2.6 Create audit entry for acceptance
- [ ] 2.7 Add self-invitation prevention check
- [ ] 2.8 Add duplicate guardian prevention check
- [ ] 2.9 Use batch write for atomic operation
- [ ] 2.10 Write unit tests for acceptance service

### Task 3: Create Join Page Route (apps/web/src/app/join/[invitationId]/page.tsx)
- [ ] 3.1 Create server component for initial invitation validation
- [ ] 3.2 Fetch invitation details (family name, inviter name, expiry)
- [ ] 3.3 Handle invalid/expired invitation display
- [ ] 3.4 Pass valid invitation data to client component
- [ ] 3.5 SEO: Add appropriate meta tags and page title

### Task 4: Create JoinFamily Component (apps/web/src/components/invitation/JoinFamily.tsx)
- [ ] 4.1 Display invitation details (family name, inviter name)
- [ ] 4.2 Explain what joining means in simple language
- [ ] 4.3 Implement "Sign in with Google" button
- [ ] 4.4 Handle authentication redirect flow
- [ ] 4.5 Show loading state during acceptance
- [ ] 4.6 Show success state with dashboard link
- [ ] 4.7 Show error states with friendly messages
- [ ] 4.8 44x44px minimum touch targets (NFR49)
- [ ] 4.9 aria-live regions for state changes
- [ ] 4.10 Write component tests

### Task 5: Create Acceptance Success Page (apps/web/src/components/invitation/AcceptanceSuccess.tsx)
- [ ] 5.1 Display success confirmation message
- [ ] 5.2 Show family name and children count
- [ ] 5.3 "Go to Dashboard" primary action button
- [ ] 5.4 Celebration/welcome visual (tasteful, not over-the-top)
- [ ] 5.5 Write component tests

### Task 6: Update Firestore Security Rules (packages/firebase-rules/firestore.rules)
- [ ] 6.1 Add rules for invitation acceptance (status update)
- [ ] 6.2 Add rules for guardian addition to families
- [ ] 6.3 Add rules for guardian addition to children
- [ ] 6.4 Verify token validation happens server-side only
- [ ] 6.5 Write security rules tests

### Task 7: Create useInvitationAcceptance Hook (apps/web/src/hooks/useInvitationAcceptance.ts)
- [ ] 7.1 Accept invitation ID and token from URL
- [ ] 7.2 Manage authentication state
- [ ] 7.3 Manage acceptance loading state
- [ ] 7.4 Manage success/error states
- [ ] 7.5 Handle redirect after authentication
- [ ] 7.6 Write hook tests

### Task 8: Update Auth Flow for Post-Login Redirect
- [ ] 8.1 Store pending invitation in session/localStorage before auth
- [ ] 8.2 Retrieve pending invitation after successful auth
- [ ] 8.3 Automatically trigger acceptance after auth
- [ ] 8.4 Clear pending invitation after acceptance
- [ ] 8.5 Handle edge cases (auth failure, timeout)

### Task 9: Write Tests
- [ ] 9.1 Unit tests for acceptance schema
- [ ] 9.2 Unit tests for acceptance service
- [ ] 9.3 Component tests for JoinFamily
- [ ] 9.4 Component tests for AcceptanceSuccess
- [ ] 9.5 Hook tests for useInvitationAcceptance
- [ ] 9.6 Security rules tests for acceptance flow
- [ ] 9.7 Integration tests for full acceptance flow
- [ ] 9.8 Adversarial tests: self-invitation prevention
- [ ] 9.9 Adversarial tests: duplicate guardian prevention
- [ ] 9.10 Adversarial tests: token tampering
- [ ] 9.11 Accessibility tests for all components

---

## Dev Notes

### Critical Requirements

This story implements **FR2: Co-Parent Invitation Acceptance** - the final piece enabling co-parents to share family management with equal access.

**CRITICAL PATTERNS:**

1. **Token Verification** - Must use timing-safe comparison (already in verifyInvitationToken from Story 3.1)
2. **Atomic Operations** - All writes (family, children, user, invitation) must be in single batch
3. **Equal Access** - New guardian MUST have identical permissions to inviter
4. **Single-Use Link** - Invitation must be marked accepted immediately to prevent replay

### Architecture Patterns

**Acceptance Flow:**
```typescript
// apps/web/src/services/invitationService.ts

interface AcceptInvitationResult {
  success: boolean
  errorCode?: 'self-invitation' | 'already-guardian' | 'token-invalid' | 'invitation-expired' | 'acceptance-failed'
  familyId?: string
  familyName?: string
  childrenCount?: number
}

/**
 * Accept a co-parent invitation
 *
 * Story 3.3: Co-Parent Invitation Acceptance
 *
 * Prerequisites:
 * - Invitation must be valid (pending status, not expired)
 * - Token must match (timing-safe comparison)
 * - User must NOT be the inviter (prevent self-invitation)
 * - User must NOT already be a guardian (prevent duplicates)
 *
 * Atomic Operations:
 * 1. Update invitation status to 'accepted'
 * 2. Add guardian to family document
 * 3. Add guardian to ALL children in family
 * 4. Update user's guardianOf array
 * 5. Create audit entry
 *
 * @param invitationId - Invitation document ID
 * @param token - Invitation token for verification
 * @param user - Authenticated user accepting the invitation
 */
export async function acceptInvitation(
  invitationId: string,
  token: string,
  user: { uid: string; displayName: string | null; email: string | null }
): Promise<AcceptInvitationResult> {
  // 1. Verify token
  const verifyResult = await verifyInvitationToken(invitationId, token)
  if (!verifyResult.valid || !verifyResult.invitation) {
    return { success: false, errorCode: verifyResult.errorCode as any }
  }

  const invitation = verifyResult.invitation

  // 2. Prevent self-invitation
  if (invitation.invitedBy === user.uid) {
    return { success: false, errorCode: 'self-invitation' }
  }

  // 3. Check if already a guardian
  const familyRef = doc(db, FAMILIES_COLLECTION, invitation.familyId)
  const familySnapshot = await getDoc(familyRef)
  const familyData = familySnapshot.data()
  const existingGuardians = familyData?.guardians || []

  if (existingGuardians.some((g: any) => g.uid === user.uid)) {
    return { success: false, errorCode: 'already-guardian' }
  }

  // 4. Get all children in family
  const childrenQuery = query(
    collection(db, CHILDREN_COLLECTION),
    where('familyId', '==', invitation.familyId)
  )
  const childrenSnapshot = await getDocs(childrenQuery)

  // 5. Prepare batch operation
  const batch = writeBatch(db)

  // 5a. Update invitation status
  const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
  batch.update(invitationRef, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
    acceptedBy: user.uid,
  })

  // 5b. Add guardian to family
  const newGuardian = {
    uid: user.uid,
    displayName: user.displayName || 'Co-parent',
    email: user.email,
    role: 'parent',  // NOT 'caregiver'
    permissions: 'full',  // Equal to inviter
    addedAt: serverTimestamp(),
    addedVia: 'invitation',
    invitationId,
  }
  batch.update(familyRef, {
    guardians: [...existingGuardians, newGuardian],
  })

  // 5c. Add guardian to all children
  childrenSnapshot.docs.forEach((childDoc) => {
    const childRef = doc(db, CHILDREN_COLLECTION, childDoc.id)
    const childData = childDoc.data()
    const childGuardians = childData.guardians || {}

    batch.update(childRef, {
      guardians: {
        ...childGuardians,
        [user.uid]: {
          role: 'parent',
          permissions: {
            canModifyAgreement: true,
            canViewScreenshots: true,
            canModifySafetyRules: true,
            canAddDevices: true,
          },
          custody: null, // Will be set via custody declaration flow
        },
      },
    })
  })

  // 5d. Update user's guardianOf array
  const userRef = doc(db, USERS_COLLECTION, user.uid)
  const userSnapshot = await getDoc(userRef)
  const userData = userSnapshot.data()
  const guardianOf = userData?.guardianOf || []

  const childIds = childrenSnapshot.docs.map((doc) => doc.id)
  const newGuardianOf = [...new Set([...guardianOf, ...childIds])]

  batch.update(userRef, { guardianOf: newGuardianOf })

  // 5e. Create audit entry
  const auditRef = doc(
    collection(db, FAMILIES_COLLECTION, invitation.familyId, AUDIT_LOG_SUBCOLLECTION)
  )
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'invitation_accepted',
    entityType: 'invitation',
    entityId: invitationId,
    performedBy: user.uid,
    performedAt: serverTimestamp(),
    metadata: {
      familyName: invitation.familyName,
      acceptedByName: user.displayName || 'Co-parent',
      childrenCount: childrenSnapshot.size,
    },
  })

  // 6. Execute batch
  await batch.commit()

  return {
    success: true,
    familyId: invitation.familyId,
    familyName: invitation.familyName,
    childrenCount: childrenSnapshot.size,
  }
}
```

**Join Page Pattern:**
```typescript
// apps/web/src/app/join/[invitationId]/page.tsx

import { notFound } from 'next/navigation'
import { JoinFamily } from '@/components/invitation/JoinFamily'
import { getInvitation } from '@/services/invitationService'

interface JoinPageProps {
  params: { invitationId: string }
  searchParams: { token?: string }
}

export default async function JoinPage({ params, searchParams }: JoinPageProps) {
  const { invitationId } = params
  const { token } = searchParams

  // Validate token presence
  if (!token) {
    return <InvalidInvitationPage reason="missing-token" />
  }

  // Get invitation (without revealing family data yet)
  const invitation = await getInvitation(invitationId)

  if (!invitation) {
    return <InvalidInvitationPage reason="not-found" />
  }

  if (invitation.status === 'expired' || new Date() > invitation.expiresAt) {
    return <InvalidInvitationPage
      reason="expired"
      inviterName={invitation.invitedByName}
    />
  }

  if (invitation.status === 'accepted') {
    return <InvalidInvitationPage reason="already-used" />
  }

  if (invitation.status === 'revoked') {
    return <InvalidInvitationPage reason="revoked" />
  }

  // Pass invitation info to client component
  // Token verification happens client-side during acceptance
  return (
    <JoinFamily
      invitationId={invitationId}
      token={token}
      familyName={invitation.familyName}
      inviterName={invitation.invitedByName}
      expiresAt={invitation.expiresAt}
    />
  )
}
```

**Authentication Redirect Pattern:**
```typescript
// apps/web/src/hooks/useInvitationAcceptance.ts

export function useInvitationAcceptance(
  invitationId: string,
  token: string
) {
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Store pending invitation before auth redirect
  const handleSignIn = async () => {
    // Store in sessionStorage to survive redirect
    sessionStorage.setItem('pendingInvitation', JSON.stringify({
      invitationId,
      token,
    }))
    await signInWithGoogle()
  }

  // Check for pending invitation after auth
  useEffect(() => {
    if (user && !authLoading) {
      const pending = sessionStorage.getItem('pendingInvitation')
      if (pending) {
        const { invitationId: pendingId, token: pendingToken } = JSON.parse(pending)
        if (pendingId === invitationId && pendingToken === token) {
          sessionStorage.removeItem('pendingInvitation')
          acceptInvitationFlow()
        }
      }
    }
  }, [user, authLoading])

  const acceptInvitationFlow = async () => {
    if (!user) return

    setAccepting(true)
    setError(null)

    try {
      const result = await acceptInvitation(invitationId, token, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
      })

      if (result.success) {
        setAccepted(true)
        // Store success info for display
        // Then redirect or show success
      } else {
        setError(getInvitationErrorMessage(result.errorCode || 'default'))
      }
    } catch (err) {
      setError(getInvitationErrorMessage('default'))
    } finally {
      setAccepting(false)
    }
  }

  return {
    user,
    authLoading,
    accepting,
    accepted,
    error,
    handleSignIn,
    acceptInvitationFlow,
  }
}
```

### NFR Compliance Checklist

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| INV-001 | Types from Zod only | All schemas with z.infer<> |
| INV-002 | Direct Firestore SDK | writeBatch, doc directly |
| INV-003 | Cross-family isolation | Security rules verify guardian status |
| NFR42 | WCAG 2.1 AA | Accessible forms, aria-live announcements |
| NFR43 | Keyboard accessible | All elements tab-navigable |
| NFR45 | 4.5:1 color contrast | Use existing design system |
| NFR49 | 44x44px touch targets | Buttons and inputs sized appropriately |
| NFR65 | 6th-grade reading level | Simple language in all messages |

### Previous Story Intelligence

**Stories 3.1 & 3.2 Patterns to Reuse:**
1. `verifyInvitationToken()` - Already has timing-safe comparison
2. `InvitationError` class for typed errors
3. Batch operations with audit entries
4. Error message functions at 6th-grade level
5. Firestore Timestamp handling
6. Collection constants (INVITATIONS_COLLECTION, etc.)

**Key Additions for Story 3.3:**
- Guardian addition logic to family + children
- Post-auth redirect handling
- Self-invitation prevention
- Duplicate guardian prevention
- Success confirmation page

**Files from Stories 3.1 & 3.2 to Extend:**
- `packages/contracts/src/invitation.schema.ts` - Add acceptance schemas
- `apps/web/src/services/invitationService.ts` - Add acceptInvitation function

### Security Considerations

1. **Token Never Stored Client-Side** - Token is in URL only, used once, then discarded
2. **Timing-Safe Comparison** - Prevents timing attacks on token verification
3. **Server-Side Validation** - Join page validates invitation existence server-side
4. **No Family Data Leak** - Invalid invitations don't reveal family info
5. **Atomic Operations** - All writes succeed or none do

### Test Scenarios (Adversarial)

```typescript
// e2e/adversarial/invitation-acceptance.adversarial.ts

describe('Invitation Acceptance Security', () => {
  test('cannot accept own invitation (self-invitation)', async () => {
    // Create invitation as User A
    // Try to accept as User A
    // Should fail with 'self-invitation' error
  })

  test('cannot accept invitation twice (already-guardian)', async () => {
    // Accept invitation successfully
    // Generate new invitation for same family
    // Try to accept as same user
    // Should fail with 'already-guardian' error
  })

  test('cannot accept with tampered token', async () => {
    // Get valid invitation
    // Modify token by 1 character
    // Should fail with 'invalid-token' error
  })

  test('cannot accept expired invitation', async () => {
    // Create invitation with 1-day expiry
    // Fast-forward time past expiry
    // Try to accept
    // Should fail with 'expired' error
  })

  test('cannot accept revoked invitation', async () => {
    // Create and revoke invitation
    // Try to accept revoked invitation
    // Should fail appropriately
  })
})
```

### Dependencies

**Already Installed (from Stories 3.1 & 3.2):**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)
- `uuid` (in apps/web)
- shadcn/ui components (in apps/web)

### File Structure

**Files to Create:**
```
apps/web/src/app/join/[invitationId]/page.tsx
apps/web/src/components/invitation/JoinFamily.tsx
apps/web/src/components/invitation/JoinFamily.test.tsx
apps/web/src/components/invitation/AcceptanceSuccess.tsx
apps/web/src/components/invitation/AcceptanceSuccess.test.tsx
apps/web/src/components/invitation/InvalidInvitation.tsx
apps/web/src/components/invitation/InvalidInvitation.test.tsx
apps/web/src/hooks/useInvitationAcceptance.ts
apps/web/src/hooks/useInvitationAcceptance.test.ts
```

**Files to Modify:**
```
packages/contracts/src/invitation.schema.ts      # Add acceptance schemas
packages/contracts/src/invitation.schema.test.ts # Add acceptance tests
packages/contracts/src/index.ts                  # Export new types
apps/web/src/services/invitationService.ts       # Add acceptInvitation
apps/web/src/services/invitationService.test.ts  # Add acceptance tests
packages/firebase-rules/firestore.rules          # Add acceptance rules
packages/firebase-rules/__tests__/               # Add acceptance rule tests
```

### Important Considerations

1. **Equal Access from Day One** - New co-parent must have identical permissions immediately. No "pending approval" state.

2. **Epic 3A Readiness** - Data symmetry safeguards should apply as soon as second guardian joins. Verify Epic 3A prerequisites are met or gracefully handled.

3. **Children Without Accounts** - Children don't need accounts to be managed. Guardians are added to child documents regardless of child account status.

4. **Session Persistence** - Auth state must survive the Google Sign-In redirect. Use sessionStorage for pending invitation.

5. **Error Recovery** - If acceptance fails mid-batch, ensure clean state. User should be able to retry.

---

## References

- [Source: docs/epics/epic-list.md#Story-3.3] - Original story requirements
- [Source: docs/epics/epic-list.md#Epic-3] - Epic context
- [Source: docs/archive/architecture.md#ADR-001] - Child-centric data model
- [Source: docs/sprint-artifacts/stories/3-1-co-parent-invitation-generation.md] - Story 3.1 patterns
- [Source: docs/sprint-artifacts/stories/3-2-invitation-delivery.md] - Story 3.2 patterns
- [Source: packages/contracts/src/invitation.schema.ts] - Invitation schema
- [Source: apps/web/src/services/invitationService.ts] - Invitation service

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/3-3-co-parent-invitation-acceptance.md
- Epic context: Epic 3 - Co-Parent Invitation & Family Sharing
- Previous stories: Story 3.1 (Generation), Story 3.2 (Delivery)
- Related stories: Story 3.4 (Equal Access Verification)

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change | Files |
|------|--------|-------|
