# Story 3.5: Invitation Management

**Status:** in-progress

---

## Story

As a **parent**,
I want **to view, resend, or revoke pending invitations**,
So that **I can manage who joins my family**.

---

## Acceptance Criteria

### AC1: Pending Invitation Status Display
**Given** a parent has generated a co-parent invitation
**When** they access invitation management
**Then** they see pending invitation status (sent, expires in X days)
**And** they see who the invitation was sent to (masked email if sent)
**And** they see when the invitation was created
**And** status is clearly visible (e.g., "Pending - expires in 5 days")
**And** status text is at 6th-grade reading level (NFR65)

### AC2: Resend Invitation Email
**Given** a pending invitation exists
**When** the parent clicks "Resend" button
**Then** system sends a new email with the same invitation link
**And** resend is subject to same rate limit (3 emails per hour)
**And** confirmation shows masked email address
**And** success message: "Invitation sent to j***@example.com"
**And** button meets 44x44px minimum touch target (NFR49)

### AC3: Revoke Invitation
**Given** a pending invitation exists
**When** the parent clicks "Revoke" button
**Then** confirmation dialog appears with warning text
**And** warning explains: "This will cancel the invitation. You can create a new one later."
**And** upon confirmation, invitation status changes to 'revoked'
**And** the invitation link is immediately invalidated
**And** success message confirms revocation
**And** audit trail entry is created

### AC4: Revoked Invitation Link Message
**Given** an invitation has been revoked
**When** someone visits the revoked invitation link
**Then** they see friendly "This invitation is no longer valid" message
**And** message suggests contacting the inviter for a new invitation
**And** no error stack traces or technical details are shown
**And** page is styled consistently with app design

### AC5: Invitation History
**Given** a family has had multiple invitations
**When** the parent views invitation management
**Then** they see history of past invitations (accepted, expired, revoked)
**And** each entry shows status, date, and outcome
**And** accepted invitations show who joined
**And** history is sorted by date (newest first)
**And** history has accessible labels for screen readers

### AC6: Access from Family Section on Dashboard
**Given** a parent is on the dashboard
**When** they have a pending invitation OR history exists
**Then** family section shows "Manage Invitations" link/button
**And** link opens invitation management view
**And** if no invitation exists, shows "Invite Co-Parent" button (existing Story 3.1)

### AC7: Empty State
**Given** a family has never sent any invitations
**When** the parent accesses invitation management
**Then** they see helpful empty state message
**And** message encourages inviting a co-parent
**And** "Invite Co-Parent" button is prominently displayed
**And** empty state explains benefits of co-parenting

### AC8: Error Handling
**Given** any invitation management action fails
**When** an error occurs
**Then** error message is at 6th-grade reading level (NFR65)
**And** specific error codes handled:
  - `rate-limited`: "You can only resend 3 times per hour. Try again later."
  - `invitation-not-found`: "This invitation no longer exists."
  - `not-authorized`: "You can only manage your own invitations."
  - `operation-failed`: "Something went wrong. Please try again."
**And** user can retry the operation

### AC9: Accessibility
**Given** a parent using assistive technology
**When** managing invitations
**Then** all elements have proper labels
**And** status changes are announced via aria-live
**And** confirmation dialogs trap focus correctly
**And** all buttons meet 44x44px minimum (NFR49)
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** keyboard navigation works for all features (NFR43)

### AC10: Co-Parent Can Also View Invitations
**Given** a co-parent with full permissions
**When** they access the family section
**Then** they can see pending invitations (same as primary parent)
**And** they can manage invitations they created
**And** they cannot revoke invitations created by other guardians
**And** they can create new invitations (per Story 3.1)

---

## Tasks / Subtasks

### Task 1: Create Invitation List Service Functions (apps/web/src/services/invitationService.ts)
- [ ] 1.1 Implement `getFamilyInvitations(familyId)` to fetch all invitations for a family
- [ ] 1.2 Query invitations by familyId, order by createdAt descending
- [ ] 1.3 Convert Firestore timestamps to dates properly
- [ ] 1.4 Include email tracking info (emailSentTo, emailSendCount)
- [ ] 1.5 Write unit tests for new service function

### Task 2: Create useInvitationList Hook (apps/web/src/hooks/useInvitationList.ts)
- [ ] 2.1 Create hook to manage invitation list state
- [ ] 2.2 Expose `invitations`, `pendingInvitation`, `invitationHistory`
- [ ] 2.3 Expose `loading`, `error`, `refresh` functions
- [ ] 2.4 Implement real-time updates via onSnapshot (optional, can use polling)
- [ ] 2.5 Memoize to prevent unnecessary re-renders
- [ ] 2.6 Write hook tests

### Task 3: Create InvitationManagement Component (apps/web/src/components/invitation/InvitationManagement.tsx)
- [ ] 3.1 Create main container component for invitation management
- [ ] 3.2 Display pending invitation card with status, expiry, email info
- [ ] 3.3 Add "Resend" button with loading state and rate limit handling
- [ ] 3.4 Add "Revoke" button that opens confirmation dialog
- [ ] 3.5 Display invitation history section with past invitations
- [ ] 3.6 Show empty state when no invitations exist
- [ ] 3.7 44x44px minimum touch targets (NFR49)
- [ ] 3.8 Accessible labels and aria-live announcements
- [ ] 3.9 Write component tests

### Task 4: Create InvitationCard Component (apps/web/src/components/invitation/InvitationCard.tsx)
- [ ] 4.1 Create reusable card component for displaying invitation details
- [ ] 4.2 Show status badge (Pending, Accepted, Revoked, Expired)
- [ ] 4.3 Show "Expires in X days" or "Expired on [date]"
- [ ] 4.4 Show masked email if sent
- [ ] 4.5 Show who accepted (for accepted invitations)
- [ ] 4.6 Conditional action buttons based on status and ownership
- [ ] 4.7 Write component tests

### Task 5: Create RevokeConfirmDialog Component (apps/web/src/components/invitation/RevokeConfirmDialog.tsx)
- [ ] 5.1 Create confirmation dialog for revoking invitation
- [ ] 5.2 Clear warning text at 6th-grade reading level
- [ ] 5.3 "Cancel" and "Revoke" buttons
- [ ] 5.4 Loading state during revocation
- [ ] 5.5 Focus trap for accessibility
- [ ] 5.6 Write component tests

### Task 6: Update Join Page for Revoked/Expired States (apps/web/src/app/join/[invitationId]/page.tsx)
- [ ] 6.1 Add handling for 'revoked' status
- [ ] 6.2 Show friendly "invitation no longer valid" message
- [ ] 6.3 Show appropriate message for expired invitations
- [ ] 6.4 Suggest contacting inviter for new invitation
- [ ] 6.5 Style consistently with app design
- [ ] 6.6 Write tests for revoked/expired states

### Task 7: Update Dashboard Family Section
- [ ] 7.1 Add invitation status indicator to family section
- [ ] 7.2 Show "Pending invitation" badge if one exists
- [ ] 7.3 Add "Manage Invitations" button/link when invitations exist
- [ ] 7.4 Keep existing "Invite Co-Parent" button when no pending invitation
- [ ] 7.5 Write integration tests

### Task 8: Create Invitation Management Page/Modal
- [ ] 8.1 Decide: full page (/family/invitations) vs modal from dashboard
- [ ] 8.2 Implement chosen approach with routing
- [ ] 8.3 Integrate InvitationManagement component
- [ ] 8.4 Handle navigation back to dashboard
- [ ] 8.5 Write integration tests

### Task 9: Write Comprehensive Tests
- [ ] 9.1 Unit tests for getFamilyInvitations service function
- [ ] 9.2 Unit tests for useInvitationList hook
- [ ] 9.3 Component tests for InvitationManagement
- [ ] 9.4 Component tests for InvitationCard
- [ ] 9.5 Component tests for RevokeConfirmDialog
- [ ] 9.6 Integration tests for full flow (view, resend, revoke)
- [ ] 9.7 Adversarial test: non-owner cannot revoke
- [ ] 9.8 Adversarial test: rate limit enforcement on resend
- [ ] 9.9 Accessibility tests for all new components

---

## Dev Notes

### Critical Requirements

This story implements invitation lifecycle management - the ability to view, resend, and revoke co-parent invitations. This completes the invitation workflow started in Stories 3.1-3.4.

**CRITICAL PATTERNS:**

1. **Ownership Check** - Only the invitation creator OR guardians with full permissions can revoke
2. **Rate Limiting** - Resend uses existing rate limit (3/hour) from Story 3.2
3. **Audit Trail** - All revocations must be logged
4. **Friendly Error Pages** - Revoked links should show user-friendly messages

### Architecture Patterns

**Service Function for Fetching Family Invitations:**
```typescript
// apps/web/src/services/invitationService.ts (ADD to existing file)

/**
 * Get all invitations for a family
 *
 * Story 3.5: Invitation Management
 *
 * @param familyId - Family ID to fetch invitations for
 * @returns Array of invitations sorted by createdAt desc
 */
export async function getFamilyInvitations(
  familyId: string
): Promise<Invitation[]> {
  const invitationsQuery = query(
    collection(db, INVITATIONS_COLLECTION),
    where('familyId', '==', familyId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(invitationsQuery)

  return snapshot.docs.map((doc) =>
    convertFirestoreInvitation(doc.data(), doc.id)
  )
}
```

**Hook Pattern:**
```typescript
// apps/web/src/hooks/useInvitationList.ts

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getFamilyInvitations } from '@/services/invitationService'
import type { Invitation } from '@fledgely/contracts'

export interface UseInvitationListReturn {
  /** All invitations for the family */
  invitations: Invitation[]
  /** Current pending invitation (if any) */
  pendingInvitation: Invitation | null
  /** Past invitations (accepted, revoked, expired) */
  invitationHistory: Invitation[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Refresh the invitation list */
  refresh: () => Promise<void>
}

export function useInvitationList(familyId: string | null): UseInvitationListReturn {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!familyId) {
      setInvitations([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await getFamilyInvitations(familyId)
      setInvitations(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch invitations'))
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  // Derived state
  const pendingInvitation = useMemo(() => {
    return invitations.find(
      (inv) => inv.status === 'pending' && new Date() < inv.expiresAt
    ) || null
  }, [invitations])

  const invitationHistory = useMemo(() => {
    return invitations.filter(
      (inv) => inv.status !== 'pending' || new Date() >= inv.expiresAt
    )
  }, [invitations])

  return {
    invitations,
    pendingInvitation,
    invitationHistory,
    loading,
    error,
    refresh: fetchInvitations,
  }
}
```

**Revoked Invitation Join Page Update:**
```typescript
// Update apps/web/src/app/join/[invitationId]/page.tsx

// In the component, after getting invitation preview:
if (preview.status === 'revoked') {
  return (
    <div className="text-center p-8">
      <h1 className="text-2xl font-semibold mb-4">
        Invitation No Longer Valid
      </h1>
      <p className="text-muted-foreground mb-6">
        This invitation has been cancelled. Please contact{' '}
        {preview.invitedByName} for a new invitation.
      </p>
      <Button onClick={() => router.push('/')}>
        Go to Home
      </Button>
    </div>
  )
}
```

### NFR Compliance

| NFR | Requirement | Implementation |
|-----|-------------|----------------|
| NFR42 | Mobile-first responsive | TailwindCSS responsive classes |
| NFR43 | Keyboard accessible | Focus management, tab navigation |
| NFR45 | 4.5:1 contrast ratio | Use existing design system |
| NFR49 | 44x44px touch targets | min-h-[44px] min-w-[44px] classes |
| NFR65 | 6th-grade reading level | Simple language throughout |

### Project Structure Notes

**Files to Create:**
- `apps/web/src/hooks/useInvitationList.ts` - New hook
- `apps/web/src/hooks/useInvitationList.test.ts` - Hook tests
- `apps/web/src/components/invitation/InvitationManagement.tsx` - Main component
- `apps/web/src/components/invitation/InvitationManagement.test.tsx` - Tests
- `apps/web/src/components/invitation/InvitationCard.tsx` - Card component
- `apps/web/src/components/invitation/InvitationCard.test.tsx` - Tests
- `apps/web/src/components/invitation/RevokeConfirmDialog.tsx` - Dialog
- `apps/web/src/components/invitation/RevokeConfirmDialog.test.tsx` - Tests

**Files to Modify:**
- `apps/web/src/services/invitationService.ts` - Add getFamilyInvitations
- `apps/web/src/services/invitationService.test.ts` - Add tests
- `apps/web/src/components/invitation/index.ts` - Export new components
- `apps/web/src/app/join/[invitationId]/page.tsx` - Handle revoked state
- `apps/web/src/app/(protected)/dashboard/page.tsx` - Add invitation indicator

### Previous Story Intelligence

**From Story 3.1-3.4:**
- `revokeInvitation` function already exists in invitationService.ts
- `sendInvitationEmail` handles rate limiting (3/hour)
- InvitationDialog component exists for creating invitations
- Family section on dashboard already shows guardian count
- useOtherGuardians hook pattern for fetching related data

**Files to Reference:**
- `apps/web/src/services/invitationService.ts` - Existing invitation functions
- `apps/web/src/components/invitation/InvitationDialog.tsx` - Dialog patterns
- `apps/web/src/components/invitation/JoinFamily.tsx` - Join flow component
- `apps/web/src/hooks/useOtherGuardians.ts` - Hook patterns
- `apps/web/src/components/family/CoManagedIndicator.tsx` - UI patterns

### Git Intelligence (Recent Commits)

```
3926003 chore(sprint): mark Story 3.4 as done
7af2493 feat(story-3.4): implement equal access verification for co-parents
db2eafc chore(sprint): mark Story 3.3 as done
de3cc9d feat(story-3.3): implement co-parent invitation acceptance
703778d chore(sprint): mark Story 3.2 as done
```

Recent patterns: Co-parent invitation flow, guardian permissions, dashboard integration.

### Dependencies

**Already Installed (no new dependencies needed):**
- All required packages from previous invitation stories
- Firebase SDK, Zod, React Hook Form, Radix UI components
- shadcn/ui components

### Security Considerations

1. **Ownership Verification** - Only invitation creator or family guardians with full permissions can revoke
2. **Cross-Family Isolation** - Firestore rules must verify family membership
3. **Rate Limiting** - Resend email uses existing rate limit from Story 3.2
4. **Audit Trail** - All revocations logged with performer ID

---

## References

- [Source: docs/epics/epic-list.md#story-35-invitation-management] - Acceptance criteria
- [Source: apps/web/src/services/invitationService.ts] - Existing invitation service
- [Source: apps/web/src/components/invitation/InvitationDialog.tsx] - Dialog patterns
- [Source: docs/sprint-artifacts/stories/3-1-co-parent-invitation-generation.md] - Story 3.1 context
- [Source: docs/sprint-artifacts/stories/3-2-invitation-delivery.md] - Story 3.2 context
- [Source: docs/sprint-artifacts/stories/3-4-equal-access-verification.md] - Story 3.4 context

---

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

### Completion Notes List

### File List
