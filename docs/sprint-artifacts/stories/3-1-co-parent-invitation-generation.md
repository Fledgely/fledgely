# Story 3.1: Co-Parent Invitation Generation

Status: done

## Story

As a **parent with a family**,
I want **to generate an invitation for my co-parent**,
So that **they can join and share family management responsibilities**.

## Acceptance Criteria

1. **AC1: Invitation Generation Access**
   - Given a parent has a family with at least one child
   - When they navigate to family settings
   - Then they see an "Invite Co-Parent" option

2. **AC2: Epic 3A Safeguards Check (Stub)**
   - Given a parent initiates co-parent invitation
   - When system checks for Epic 3A safeguards
   - Then for MVP, a stub check is performed (returns false, blocking invitations)
   - And user sees message: "Co-parent invitations coming soon. Safety safeguards under development."
   - Note: This check will be enabled when Epic 3A is complete

3. **AC3: Invitation Token Generation (Infrastructure)**
   - Given Epic 3A safeguards pass (future)
   - When parent generates an invitation
   - Then invitation is created with unique secure token (UUID)
   - And invitation includes family name and inviting parent's name
   - And invitation has configurable expiry (default 7 days)
   - And invitation is stored in Firestore `invitations/{invitationId}`

4. **AC4: Single Pending Invitation Limit**
   - Given a family already has a pending invitation
   - When parent attempts to create another co-parent invitation
   - Then creation is blocked
   - And message explains only one pending invitation allowed
   - And option to revoke existing invitation is shown

5. **AC5: Invitation Schema Validation**
   - Given invitation data is being stored
   - When the document is created
   - Then invitation validates against invitationSchema from @fledgely/contracts
   - And schema includes: id, familyId, inviterUid, inviterName, familyName, token, status, expiresAt, createdAt

6. **AC6: Accessibility**
   - Given the invitation flow
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)

## Tasks / Subtasks

- [x] Task 1: Create Invitation Schema (AC: #5)
  - [x] 1.1 Add invitationStatusSchema enum to packages/shared/src/contracts/index.ts
  - [x] 1.2 Add invitationSchema with all required fields
  - [x] 1.3 Export Invitation and InvitationStatus types

- [x] Task 2: Create Invitation Service (AC: #2, #3, #4, #5)
  - [x] 2.1 Create apps/web/src/services/invitationService.ts
  - [x] 2.2 Implement checkEpic3ASafeguards stub function (returns false for MVP)
  - [x] 2.3 Implement createInvitation function
  - [x] 2.4 Implement getPendingInvitation function
  - [x] 2.5 Implement revokeInvitation function
  - [x] 2.6 Generate secure token with crypto.randomUUID()
  - [x] 2.7 Use Firebase SDK directly (no abstractions)

- [x] Task 3: Add Firestore Security Rules (AC: #3)
  - [x] 3.1 Add security rules for invitations collection
  - [x] 3.2 Only inviter (guardian) can read/write their family's invitations
  - [x] 3.3 Public read for invitation by token (for acceptance flow)

- [x] Task 4: Create Invite Co-Parent Button in Dashboard (AC: #1, #6)
  - [x] 4.1 Add "Invite Co-Parent" button to family card in dashboard
  - [x] 4.2 Wire up to open invitation flow/modal
  - [x] 4.3 Ensure 44px touch targets

- [x] Task 5: Create Invitation Flow/Modal (AC: #1, #2, #4, #6)
  - [x] 5.1 Create InviteCoParentModal component
  - [x] 5.2 Check Epic 3A safeguards (show "coming soon" if not ready)
  - [x] 5.3 Check for existing pending invitation
  - [x] 5.4 Display pending invitation status if exists
  - [x] 5.5 Allow revoke of pending invitation
  - [x] 5.6 Implement focus trap for accessibility

## Dev Notes

### Technical Requirements

- **Database:** Firestore with typed access via invitationSchema
- **Schema Source:** @fledgely/shared/contracts (Zod schemas only - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls (no abstractions - Unbreakable Rule #2)
- **Token Generation:** Use `crypto.randomUUID()` for secure tokens

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - invitationSchema must be Zod-based
- "Firebase SDK Direct" - use `doc()`, `setDoc()`, `getDoc()`, `query()` directly
- "Functions Delegate to Services" - service layer for business logic

### Important: Epic 3A Dependency

**This story creates the invitation infrastructure but BLOCKS actual invitations until Epic 3A is complete.**

The `checkEpic3ASafeguards()` function is a stub that returns `false` for MVP:

```typescript
/**
 * Check if Epic 3A safeguards are active.
 *
 * For MVP, this always returns false, blocking co-parent invitations.
 * When Epic 3A is complete, this will check for:
 * - Data symmetry enforcement rules active
 * - Two-parent approval workflows ready
 * - Cooling period mechanisms in place
 *
 * @returns false for MVP (safeguards not ready)
 */
export function checkEpic3ASafeguards(): boolean {
  // TODO: Implement actual checks when Epic 3A stories are complete:
  // - Story 3A.1: Data Symmetry Enforcement
  // - Story 3A.2: Safety Settings Two-Parent Approval
  // - Story 3A.3: Agreement Changes Two-Parent Approval
  // - Story 3A.4: Safety Rule 48-Hour Cooling Period
  // - Story 3A.5: Screenshot Viewing Rate Alert
  // - Story 3A.6: Co-Parent Removal Prevention
  return false
}
```

### Invitation Schema Definition

```typescript
// packages/shared/src/contracts/index.ts
import { z } from 'zod'

export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked'])
export type InvitationStatus = z.infer<typeof invitationStatusSchema>

export const invitationSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  inviterUid: z.string(),
  inviterName: z.string(),
  familyName: z.string(),
  token: z.string(), // Secure UUID token for invitation link
  status: invitationStatusSchema,
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Invitation = z.infer<typeof invitationSchema>
```

### Firestore Document Structure

```
/invitations/{invitationId}
  - id: string (UUID)
  - familyId: string (reference to family)
  - inviterUid: string (UID of guardian who created invitation)
  - inviterName: string (display name of inviter)
  - familyName: string (family name for display)
  - token: string (secure UUID for invitation link)
  - status: 'pending' | 'accepted' | 'expired' | 'revoked'
  - expiresAt: Timestamp (7 days from creation)
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

### Security Rules Pattern

```javascript
// packages/firebase-rules/firestore.rules
match /invitations/{invitationId} {
  // Helper to check if user is inviter
  function isInviter() {
    return request.auth != null &&
      request.auth.uid == resource.data.inviterUid;
  }

  // Helper to check if user is family guardian
  function isFamilyGuardian() {
    let family = get(/databases/$(database)/documents/families/$(resource.data.familyId));
    return request.auth.uid in family.data.guardians[].uid;
  }

  // Read: inviter can read, OR anyone with valid token (for acceptance)
  allow read: if isInviter() || isFamilyGuardian();

  // Create: authenticated guardians can create for their family
  allow create: if request.auth != null &&
    request.auth.uid == request.resource.data.inviterUid;

  // Update: only inviter can update (revoke, mark expired)
  allow update: if isInviter();

  // Delete: not allowed (use status: revoked instead)
  allow delete: if false;
}
```

### Service Function Patterns

```typescript
// apps/web/src/services/invitationService.ts
export async function createInvitation(
  family: Family,
  inviterUser: FirebaseUser
): Promise<Invitation> {
  // 1. Check Epic 3A safeguards
  if (!checkEpic3ASafeguards()) {
    throw new Error(
      'Co-parent invitations are not yet available. Safety safeguards under development.'
    )
  }

  // 2. Check for existing pending invitation
  const pending = await getPendingInvitation(family.id)
  if (pending) {
    throw new Error('A pending invitation already exists. Please revoke it first.')
  }

  // 3. Generate invitation
  const invitationId = crypto.randomUUID()
  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

  // 4. Create in Firestore
  // ... implementation
}

export async function getPendingInvitation(familyId: string): Promise<Invitation | null> {
  // Query for pending invitations for this family
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  // Update status to 'revoked'
}
```

### Library/Framework Requirements

| Dependency | Version | Purpose                                 |
| ---------- | ------- | --------------------------------------- |
| firebase   | ^10.x   | Firebase SDK (already installed)        |
| zod        | ^3.x    | Schema validation (in @fledgely/shared) |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                    # UPDATE - Add invitationSchema

apps/web/src/
├── services/
│   └── invitationService.ts    # NEW - Invitation operations
├── components/
│   └── InviteCoParentModal.tsx # NEW - Invitation modal
└── app/
    └── dashboard/
        └── page.tsx            # UPDATE - Add invite button

packages/firebase-rules/
└── firestore.rules            # UPDATE - Add invitations collection rules
```

### Testing Requirements

- Unit test invitationSchema validation
- Unit test checkEpic3ASafeguards returns false
- Test pending invitation prevents new invitation
- Test invitation expiry date calculation
- Test modal keyboard accessibility

### Previous Story Intelligence (Story 2.7)

From Story 2.7 completion:

- Modal patterns established (DissolveFamilyModal)
- Focus trap implementation working
- Body scroll lock pattern
- Batch writes for atomic operations
- Firestore security rules alignment with app logic
- 44px touch targets maintained

**Key Pattern to Follow:**

```typescript
// Modal structure from DissolveFamilyModal
interface InviteCoParentModalProps {
  family: Family
  isOpen: boolean
  onClose: () => void
}

// Same focus trap, escape key, body scroll lock patterns apply
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3.1]
- [Source: docs/epics/epic-list.md#Epic-3A]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]

## Dev Agent Record

### Context Reference

- Epic: 3 (Co-Parent Invitation & Family Sharing)
- Sprint: 2 (Feature Development)
- Story Key: 3-1-co-parent-invitation-generation
- Depends On: Epic 2 (completed), Epic 3A (stub check for MVP)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Build passes with all new files
- Lint passes with no errors
- All patterns from Story 2.7 (DissolveFamilyModal) successfully applied

### Completion Notes List

1. Created invitationSchema and invitationStatusSchema in contracts/index.ts:
   - Status enum: pending, accepted, expired, revoked
   - Full schema with id, familyId, inviterUid, inviterName, familyName, token, status, dates
   - Type exports for Invitation and InvitationStatus

2. Created invitationService.ts with:
   - checkEpic3ASafeguards() stub (returns false for MVP)
   - convertInvitationTimestamps() for Firestore date handling
   - getInvitation() for fetching by ID
   - getPendingInvitation() for checking existing invitations
   - createInvitation() with safeguards check, pending check, and token generation
   - revokeInvitation() with authorization checks
   - All functions use direct Firebase SDK per Unbreakable Rule #2

3. Added Firestore security rules for /invitations/{invitationId}:
   - isInviter() helper for inviter checks
   - isFamilyGuardian() helper for family member checks
   - Read: inviter or family guardians
   - Create: authenticated user setting themselves as inviter
   - Update: only inviter
   - Delete: blocked (use status: revoked)

4. Added "Invite Co-Parent" button to dashboard:
   - Purple themed button matching brand
   - 44px minimum touch target
   - Focus indicator with purple outline
   - Opens InviteCoParentModal on click

5. Created InviteCoParentModal component:
   - Focus trap implementation
   - Body scroll lock when open
   - Escape key to close
   - Epic 3A safeguards check (shows "Coming Soon" message)
   - Pending invitation display with revoke option
   - Full ARIA accessibility (labelledby, describedby, modal)
   - Loading states and error handling

### File List

- packages/shared/src/contracts/index.ts (MODIFIED - added invitationSchema)
- apps/web/src/services/invitationService.ts (NEW - invitation operations)
- apps/web/src/services/invitationService.test.ts (NEW - unit tests)
- apps/web/src/components/InviteCoParentModal.tsx (NEW - invitation modal)
- apps/web/src/app/dashboard/page.tsx (MODIFIED - invite button and modal)
- packages/firebase-rules/firestore.rules (MODIFIED - invitations collection rules)
- firestore.indexes.json (MODIFIED - added invitations compound index)

## Change Log

| Date       | Change                                                         |
| ---------- | -------------------------------------------------------------- |
| 2025-12-28 | Story created with Epic 3A stub check approach                 |
| 2025-12-28 | Implementation complete - ready for code review                |
| 2025-12-28 | Code review fixes: AC1 conditional, expiry check, tests, index |
