# Story 3.1: Co-Parent Invitation Generation

**Status:** ready-for-dev

---

## Story

As a **parent with a family**,
I want **to generate an invitation for my co-parent**,
So that **they can join and share family management responsibilities**.

---

## Acceptance Criteria

### AC1: Family With Child Prerequisite
**Given** a parent has a family
**When** they attempt to generate a co-parent invitation
**Then** system verifies the family has at least one child
**And** if no children exist, displays message "Add a child first before inviting a co-parent"
**And** message is at 6th-grade reading level (NFR65)

### AC2: Single Pending Invitation Limit
**Given** a parent initiates co-parent invitation
**When** a pending invitation already exists for this family
**Then** system blocks new invitation creation
**And** displays the existing invitation details (created date, expiry date)
**And** offers options to resend or revoke existing invitation
**And** button meets 44x44px touch targets (NFR49)

### AC3: Invitation Token Generation
**Given** a parent initiates co-parent invitation (no existing pending)
**When** the invitation is created
**Then** system generates a unique secure token (UUID v4)
**And** token is cryptographically random
**And** token cannot be guessed or enumerated
**And** token is stored hashed in Firestore (original only in invite link)

### AC4: Invitation Document Structure
**Given** an invitation is generated
**When** stored in Firestore `invitations/{invitationId}`
**Then** document includes:
  - `id`: Firestore document ID (same as invitationId)
  - `familyId`: Reference to family being joined
  - `familyName`: Display name for invitation email/message
  - `invitedBy`: User ID of inviting parent
  - `invitedByName`: Display name for invitation email/message
  - `tokenHash`: Hashed version of secure token
  - `status`: 'pending' | 'accepted' | 'revoked' | 'expired'
  - `createdAt`: Timestamp of creation
  - `expiresAt`: Timestamp of expiry (default: createdAt + 7 days)
  - `acceptedAt`: Timestamp when accepted (null if pending)
  - `acceptedBy`: User ID who accepted (null if pending)

### AC5: Configurable Expiry
**Given** a parent generates an invitation
**When** choosing expiry settings
**Then** default expiry is 7 days from creation
**And** parent can optionally select from: 1 day, 3 days, 7 days (default), 14 days, 30 days
**And** expiry cannot exceed 30 days
**And** expiry is clearly displayed in confirmation

### AC6: Invitation Link Format
**Given** an invitation is successfully created
**When** the invite link is generated
**Then** link format is: `{app_url}/join/{invitationId}?token={secureToken}`
**And** link is displayed with copy button
**And** link is single-use (invalidated after acceptance)
**And** link shows expiry date clearly
**And** copy button confirms with "Copied!" feedback

### AC7: Invitation Success Feedback
**Given** an invitation is successfully created
**When** success is displayed
**Then** shows family name and expiry date
**And** shows shareable link with copy button
**And** offers option to "Send via Email" (Story 3.2)
**And** offers option to return to family dashboard
**And** success message is at 6th-grade reading level (NFR65)

### AC8: Invitation Creation Audit
**Given** an invitation is created
**When** the operation completes
**Then** audit entry is created in family audit log
**And** audit includes: action type, invitedBy, timestamp
**And** audit does NOT include the invitation token (security)
**And** audit is visible to all family guardians

### AC9: Error Handling
**Given** invitation creation fails
**When** an error occurs
**Then** error message is at 6th-grade reading level (NFR65)
**And** no partial state changes occur (transaction)
**And** user can retry the operation
**And** specific error codes handled:
  - `family-not-found`: "We could not find your family."
  - `no-children`: "Add a child first before inviting a co-parent."
  - `pending-exists`: "You already have a pending invitation."
  - `not-authorized`: "You don't have permission to invite co-parents."
  - `creation-failed`: "Could not create invitation. Please try again."

### AC10: Accessibility
**Given** a parent using assistive technology
**When** generating an invitation
**Then** all form elements have proper labels
**And** success/error messages use aria-live regions
**And** copy button has accessible name "Copy invitation link"
**And** all buttons meet 44x44px minimum (NFR49)
**And** color contrast meets 4.5:1 minimum (NFR45)
**And** dialog is keyboard accessible (NFR43)

---

## Tasks / Subtasks

### Task 1: Create Invitation Schemas (packages/contracts/src/invitation.schema.ts)
- [ ] 1.1 Create `invitationStatusSchema` enum: 'pending', 'accepted', 'revoked', 'expired'
- [ ] 1.2 Create `invitationSchema` for complete invitation document
- [ ] 1.3 Create `invitationFirestoreSchema` for Firestore compatibility (Timestamps)
- [ ] 1.4 Create `createInvitationInputSchema` for invitation creation
- [ ] 1.5 Create `invitationExpiryOptionSchema` for expiry dropdown
- [ ] 1.6 Add error messages at 6th-grade reading level
- [ ] 1.7 Add helper functions: `isInvitationExpired`, `isInvitationPending`
- [ ] 1.8 Export types from packages/contracts/src/index.ts
- [ ] 1.9 Write unit tests for all schemas (target: 30+ tests)

### Task 2: Create Invitation Service (apps/web/src/services/invitationService.ts)
- [ ] 2.1 Implement `createCoParentInvitation(familyId, expiryDays?)` function
- [ ] 2.2 Verify user is guardian with full permissions
- [ ] 2.3 Verify family has at least one child
- [ ] 2.4 Check for existing pending invitation (return it if exists)
- [ ] 2.5 Generate secure UUID v4 token
- [ ] 2.6 Hash token before storage (SHA-256)
- [ ] 2.7 Store invitation in `invitations/{invitationId}` collection
- [ ] 2.8 Create audit entry in family audit log
- [ ] 2.9 Return invitation details with unhashed token (for link)
- [ ] 2.10 Implement `getExistingPendingInvitation(familyId)` function
- [ ] 2.11 Use batch/transaction for atomic operation
- [ ] 2.12 Write unit tests for service

### Task 3: Create useInvitation Hook (apps/web/src/hooks/useInvitation.ts)
- [ ] 3.1 Create `useInvitation()` hook for state management
- [ ] 3.2 Expose `createInvitation`, `loading`, `error`, `clearError`
- [ ] 3.3 Expose `invitation` state (created invitation with token)
- [ ] 3.4 Expose `existingInvitation` state (pending invitation if exists)
- [ ] 3.5 Expose `checkExistingInvitation(familyId)` function
- [ ] 3.6 Implement idempotency guard (prevent double-click)
- [ ] 3.7 Write unit tests for hook

### Task 4: Create InvitationDialog Component (apps/web/src/components/invitation/InvitationDialog.tsx)
- [ ] 4.1 Create dialog component with multi-step flow
- [ ] 4.2 Step 1: Confirm intent + expiry selection dropdown
- [ ] 4.3 Step 2: Processing state with loading indicator
- [ ] 4.4 Step 3: Success with invite link and copy button
- [ ] 4.5 Handle existing pending invitation display
- [ ] 4.6 Implement copy-to-clipboard with feedback
- [ ] 4.7 44x44px minimum touch targets (NFR49)
- [ ] 4.8 Accessible modal with focus trap
- [ ] 4.9 aria-live announcements for state changes
- [ ] 4.10 Write component tests

### Task 5: Create InvitationLink Component (apps/web/src/components/invitation/InvitationLink.tsx)
- [ ] 5.1 Create component to display invitation link
- [ ] 5.2 Show link in readable format with copy button
- [ ] 5.3 Show expiry date/time clearly
- [ ] 5.4 "Copied!" feedback on successful copy
- [ ] 5.5 Fallback for browsers without clipboard API
- [ ] 5.6 Accessible copy button with proper label
- [ ] 5.7 Write component tests

### Task 6: Update Firestore Security Rules
- [ ] 6.1 Add rules for `invitations/{invitationId}` collection
- [ ] 6.2 Allow read by family guardians
- [ ] 6.3 Allow create by family guardians with full permissions
- [ ] 6.4 Allow update only for status changes (accept/revoke)
- [ ] 6.5 Prevent token hash from being read by non-creators
- [ ] 6.6 Test security rules with emulator

### Task 7: Add Invitation Button to Family Settings
- [ ] 7.1 Add "Invite Co-Parent" button to family settings page
- [ ] 7.2 Show existing pending invitation if present
- [ ] 7.3 Disable button with explanation if no children
- [ ] 7.4 Link to InvitationDialog
- [ ] 7.5 Write integration tests

### Task 8: Write Tests
- [ ] 8.1 Unit tests for invitation schemas
- [ ] 8.2 Unit tests for invitation service
- [ ] 8.3 Unit tests for useInvitation hook
- [ ] 8.4 Component tests for InvitationDialog
- [ ] 8.5 Component tests for InvitationLink
- [ ] 8.6 Adversarial tests: cross-family invitation attempts
- [ ] 8.7 Adversarial tests: expired invitation handling
- [ ] 8.8 Adversarial tests: duplicate invitation prevention
- [ ] 8.9 Accessibility tests for dialog

---

## Dev Notes

### Critical Requirements

This story implements **FR2: Co-Parent Invitation** - the first step in enabling shared family management.

**CRITICAL PATTERNS:**

1. **Secure Token Handling** - Token is ONLY returned once at creation time, stored hashed
2. **Single Pending Limit** - Prevent spam/confusion with one active invitation per family
3. **Audit Trail** - All invitation actions logged (but NOT the token)
4. **Family Prerequisite** - Must have children before co-parent makes sense

### Architecture Patterns

**Invitation Schema:**
```typescript
// packages/contracts/src/invitation.schema.ts

import { z } from 'zod'

/**
 * Invitation status enum
 */
export const invitationStatusSchema = z.enum([
  'pending',   // Awaiting acceptance
  'accepted',  // Co-parent joined
  'revoked',   // Canceled by inviting parent
  'expired',   // Past expiry date
])

export type InvitationStatus = z.infer<typeof invitationStatusSchema>

/**
 * Expiry options for invitation
 */
export const invitationExpiryDaysSchema = z.enum(['1', '3', '7', '14', '30'])

export type InvitationExpiryDays = z.infer<typeof invitationExpiryDaysSchema>

/**
 * Complete invitation document as stored in Firestore
 */
export const invitationSchema = z.object({
  /** Unique invitation identifier (Firestore document ID) */
  id: z.string().min(1, 'Invitation ID is required'),

  /** Reference to family being joined */
  familyId: z.string().min(1, 'Family ID is required'),

  /** Display name of family (for invitation message) */
  familyName: z.string().min(1, 'Family name is required'),

  /** User ID of inviting parent */
  invitedBy: z.string().min(1, 'Inviter ID is required'),

  /** Display name of inviting parent */
  invitedByName: z.string().min(1, 'Inviter name is required'),

  /** SHA-256 hash of secure token (original not stored) */
  tokenHash: z.string().min(1, 'Token hash is required'),

  /** Current status of invitation */
  status: invitationStatusSchema,

  /** When invitation was created */
  createdAt: z.date(),

  /** When invitation expires */
  expiresAt: z.date(),

  /** When invitation was accepted (null if pending) */
  acceptedAt: z.date().nullable(),

  /** User ID who accepted (null if pending) */
  acceptedBy: z.string().nullable(),
})

export type Invitation = z.infer<typeof invitationSchema>

/**
 * Input schema for creating a new invitation
 */
export const createInvitationInputSchema = z.object({
  familyId: z.string().min(1, 'Family ID is required'),
  expiryDays: invitationExpiryDaysSchema.default('7'),
})

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
export const INVITATION_ERROR_MESSAGES: Record<string, string> = {
  'family-not-found': 'We could not find your family.',
  'no-children': 'Add a child first before inviting a co-parent.',
  'pending-exists': 'You already have a pending invitation.',
  'not-authorized': 'You don\'t have permission to invite co-parents.',
  'creation-failed': 'Could not create invitation. Please try again.',
  'invalid-expiry': 'Please choose how long the invitation should last.',
  default: 'Something went wrong. Please try again.',
}

export function getInvitationErrorMessage(code: string): string {
  return INVITATION_ERROR_MESSAGES[code] || INVITATION_ERROR_MESSAGES.default
}

/**
 * Check if an invitation has expired
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  return invitation.status === 'expired' || new Date() > invitation.expiresAt
}

/**
 * Check if an invitation is still pending
 */
export function isInvitationPending(invitation: Invitation): boolean {
  return invitation.status === 'pending' && !isInvitationExpired(invitation)
}
```

**Invitation Service Pattern:**
```typescript
// apps/web/src/services/invitationService.ts

import {
  doc,
  getDoc,
  getDocs,
  query,
  where,
  collection,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { v4 as uuidv4 } from 'uuid'
import type { Invitation, CreateInvitationInput } from '@fledgely/contracts'

const FAMILIES_COLLECTION = 'families'
const INVITATIONS_COLLECTION = 'invitations'
const AUDIT_COLLECTION = 'audit_log'

/**
 * Hash a token using SHA-256
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a co-parent invitation
 *
 * Story 3.1: Co-Parent Invitation Generation
 */
export async function createCoParentInvitation(
  input: CreateInvitationInput,
  userId: string,
  userName: string
): Promise<{ invitation: Invitation; token: string }> {
  const { familyId, expiryDays } = input

  // 1. Get family document
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
  const familyDoc = await getDoc(familyRef)

  if (!familyDoc.exists()) {
    throw new InvitationServiceError('family-not-found', 'Family not found')
  }

  const familyData = familyDoc.data()

  // 2. Verify user is a guardian with full permissions
  const guardian = familyData.guardians?.find((g: { uid: string }) => g.uid === userId)
  if (!guardian || guardian.permissions !== 'full') {
    throw new InvitationServiceError('not-authorized', 'Not authorized')
  }

  // 3. Verify family has at least one child
  if (!familyData.children || familyData.children.length === 0) {
    throw new InvitationServiceError('no-children', 'No children in family')
  }

  // 4. Check for existing pending invitation
  const existingInvitation = await getExistingPendingInvitation(familyId)
  if (existingInvitation) {
    throw new InvitationServiceError('pending-exists', 'Pending invitation exists')
  }

  // 5. Generate secure token
  const token = uuidv4()
  const tokenHash = await hashToken(token)

  // 6. Calculate expiry
  const now = new Date()
  const expiryMs = parseInt(expiryDays) * 24 * 60 * 60 * 1000
  const expiresAt = new Date(now.getTime() + expiryMs)

  // 7. Create invitation document
  const invitationRef = doc(collection(db, INVITATIONS_COLLECTION))
  const invitationId = invitationRef.id

  const invitationData = {
    id: invitationId,
    familyId,
    familyName: familyData.name || 'Your Family',
    invitedBy: userId,
    invitedByName: userName,
    tokenHash,
    status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    acceptedAt: null,
    acceptedBy: null,
  }

  // 8. Create batch for atomic operation
  const batch = writeBatch(db)

  // Write invitation
  batch.set(invitationRef, invitationData)

  // Create audit entry (without token!)
  const auditRef = doc(collection(db, FAMILIES_COLLECTION, familyId, AUDIT_COLLECTION))
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'co_parent_invitation_created',
    performedBy: userId,
    performedAt: serverTimestamp(),
    metadata: {
      invitationId,
      expiryDays,
    },
  })

  await batch.commit()

  // 9. Return invitation with original token (only time it's returned!)
  const invitation: Invitation = {
    id: invitationId,
    familyId,
    familyName: familyData.name || 'Your Family',
    invitedBy: userId,
    invitedByName: userName,
    tokenHash, // Note: this is hashed
    status: 'pending',
    createdAt: now,
    expiresAt,
    acceptedAt: null,
    acceptedBy: null,
  }

  return { invitation, token }
}

/**
 * Get existing pending invitation for a family
 */
export async function getExistingPendingInvitation(
  familyId: string
): Promise<Invitation | null> {
  const invitationsRef = collection(db, INVITATIONS_COLLECTION)
  const q = query(
    invitationsRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending')
  )

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  // Check if any are not expired
  for (const doc of snapshot.docs) {
    const data = doc.data()
    const expiresAt = data.expiresAt.toDate()
    if (new Date() < expiresAt) {
      return {
        id: data.id,
        familyId: data.familyId,
        familyName: data.familyName,
        invitedBy: data.invitedBy,
        invitedByName: data.invitedByName,
        tokenHash: data.tokenHash,
        status: data.status,
        createdAt: data.createdAt.toDate(),
        expiresAt,
        acceptedAt: data.acceptedAt?.toDate() || null,
        acceptedBy: data.acceptedBy,
      }
    }
  }

  return null
}

/**
 * Service error class
 */
export class InvitationServiceError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'InvitationServiceError'
  }
}
```

**Firestore Security Rules for Invitations:**
```javascript
// Add to packages/firebase-rules/firestore.rules

// Invitations collection
match /invitations/{invitationId} {
  // Anyone with a valid token can read (for acceptance flow)
  // But tokenHash should not be exposed - use Cloud Function for validation

  // Family guardians can read their invitations
  allow read: if request.auth != null &&
    exists(/databases/$(database)/documents/families/$(resource.data.familyId)/guardians/$(request.auth.uid));

  // Family guardians with full permissions can create
  allow create: if request.auth != null &&
    request.resource.data.invitedBy == request.auth.uid &&
    get(/databases/$(database)/documents/families/$(request.resource.data.familyId)).data.guardians.hasAny([{
      uid: request.auth.uid,
      permissions: 'full'
    }]);

  // Only status can be updated (for accept/revoke)
  allow update: if request.auth != null &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'acceptedAt', 'acceptedBy']);

  // Never delete - just update status
  allow delete: if false;
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

**Story 2.8 Learnings:**
1. Multi-step dialogs with clear progress indication work well
2. Re-authentication pattern established for sensitive operations
3. Idempotency guards prevent duplicate submissions
4. Error messages at 6th-grade reading level
5. Batch operations for atomic updates
6. Sealed vs regular audit patterns

**Key Difference from Story 2.8:**
- Invitations are NOT sealed (visible to family)
- Invitations use standard audit trail
- Token security is critical (hash before storage)

**Files from Previous Stories to Reference:**
- `packages/contracts/src/selfRemoval.schema.ts` - Schema patterns
- `packages/contracts/src/family.schema.ts` - Guardian structure
- `apps/web/src/services/selfRemovalService.ts` - Service patterns
- `apps/web/src/hooks/useSelfRemoval.ts` - Hook patterns
- `apps/web/src/components/dissolution/SelfRemovalDialog.tsx` - Dialog patterns

### Dependencies

**Already Installed:**
- `firebase` (in apps/web)
- `zod` (in packages/contracts)
- `react-hook-form` (in apps/web)
- `@hookform/resolvers` (in apps/web)
- `@radix-ui/react-dialog` (in apps/web)
- shadcn/ui components (in apps/web)
- `uuid` - MAY NEED TO INSTALL for secure token generation

**Check/Install:**
```bash
# Check if uuid is installed
cd apps/web && npm list uuid

# If not installed:
npm install uuid
npm install -D @types/uuid
```

### File Structure

**Files to Create:**
```
packages/contracts/src/invitation.schema.ts
packages/contracts/src/invitation.schema.test.ts
apps/web/src/services/invitationService.ts
apps/web/src/services/invitationService.test.ts
apps/web/src/hooks/useInvitation.ts
apps/web/src/hooks/useInvitation.test.ts
apps/web/src/components/invitation/InvitationDialog.tsx
apps/web/src/components/invitation/InvitationDialog.test.tsx
apps/web/src/components/invitation/InvitationLink.tsx
apps/web/src/components/invitation/InvitationLink.test.tsx
apps/web/src/components/invitation/index.ts
```

**Files to Modify:**
```
packages/contracts/src/index.ts                 # Export invitation types
packages/firebase-rules/firestore.rules         # Add invitation rules
apps/web/src/components/family/FamilySettings.tsx  # Add invite button
```

### Important Considerations

1. **Token Security**: The invitation token is the ONLY secret. Store it hashed, return it once at creation, never log it.

2. **Single Pending Limit**: This simplifies UX and prevents invitation spam. User must revoke existing before creating new.

3. **Expiry Handling**: Invitations expire automatically. Consider a scheduled function to update status, or check at read time.

4. **Audit Visibility**: Unlike sealed audits (Story 2.8), invitation audits ARE visible to family members.

5. **Link Format**: Use the pattern `{app_url}/join/{invitationId}?token={token}` - the join page will validate both parts.

6. **Epic 3A Dependency**: Per acceptance criteria, Story 3.1 should verify Epic 3A safeguards are active before allowing invitation. However, Epic 3A is still in backlog, so we should implement this as a TODO/placeholder check that can be enabled later.

### Epic 3A Safeguard Note

The acceptance criteria mention: "system verifies Epic 3A safeguards are active (blocking if not)"

Since Epic 3A (Shared Custody Safeguards) is still in backlog, implement this as:
```typescript
// TODO: Epic 3A - Verify shared custody safeguards are active
// For now, proceed with invitation creation
// When Epic 3A is implemented, this check will block if safeguards are not in place
const epic3ASafeguardsActive = true // Placeholder until Epic 3A
```

This allows the invitation flow to work now, with the safeguard check ready to be implemented in Epic 3A.

---

## References

- [Source: docs/epics/epic-list.md#Story-3.1] - Original story requirements
- [Source: docs/epics/epic-list.md#Epic-3] - Epic context
- [Source: docs/sprint-artifacts/stories/2-8-unilateral-self-removal-survivor-escape.md] - Previous story patterns
- [Source: packages/contracts/src/family.schema.ts] - Guardian structure
- [Source: docs/archive/architecture.md] - Architecture decisions

---

## Dev Agent Record

### Context Reference
- Story context: docs/sprint-artifacts/stories/3-1-co-parent-invitation-generation.md
- Epic context: Epic 3 - Co-Parent Invitation & Family Sharing
- Previous epic: Epic 2 - Family Creation & Child Profiles (completed)
- Related stories: Story 3.2 (Invitation Delivery), Story 3.3 (Invitation Acceptance)

### Agent Model Used
{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log

| Date | Change | Files |
|------|--------|-------|
