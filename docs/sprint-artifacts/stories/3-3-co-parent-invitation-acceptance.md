# Story 3.3: Co-Parent Invitation Acceptance

Status: done

## Story

As an **invited co-parent**,
I want **to accept the invitation and join the family**,
So that **I can co-manage our children's digital activity**.

## Acceptance Criteria

1. **AC1: Invitation Link Landing Page**
   - Given a person has received a valid co-parent invitation link
   - When they click the link (/invite/accept?token=...)
   - Then they see a landing page showing the invitation details
   - And the page displays the inviting parent's name and family name
   - And the page explains what accepting means (equal co-management)
   - And the page shows invitation expiry status

2. **AC2: Expired/Invalid Invitation Handling**
   - Given a person clicks an invitation link
   - When the invitation is expired, revoked, or already used
   - Then they see a clear error message explaining the status
   - And they see instructions to contact the inviting parent for a new invitation
   - And no login prompt is shown for invalid invitations

3. **AC3: Authentication for Acceptance**
   - Given a person views a valid invitation landing page
   - When they choose to accept the invitation
   - Then they must sign in with Google (new or existing account)
   - And existing users are recognized and prompted to confirm
   - And new users go through standard account creation (Story 1.2)

4. **AC4: Guardian Addition to Family**
   - Given an authenticated user accepts the invitation
   - When acceptance is processed
   - Then they are added as guardian to ALL children in the family
   - And they have identical permissions to the inviting parent (no hierarchy)
   - And their guardian entry includes `role: "guardian"` (same as inviter)
   - And they are added to the family document's guardians array

5. **AC5: Immediate Data Access**
   - Given a co-parent has accepted an invitation
   - When they access the family dashboard
   - Then they can immediately see all family data, screenshots, agreements
   - And they see all children in the family
   - And dashboard shows "Co-managed by [other parent name]" indicator

6. **AC6: Invitation Status Update**
   - Given acceptance is successful
   - When the process completes
   - Then invitation status is updated to 'accepted'
   - And both parents receive confirmation notification (email/in-app)
   - And invitation token is invalidated (cannot be reused)
   - And acceptedAt and acceptedBy fields are set

7. **AC7: User Profile Update**
   - Given a new or existing user accepts the invitation
   - When they join the family
   - Then their user document is updated with familyId
   - And they are redirected to the family dashboard
   - And the onboarding flow is skipped (they join an existing family)

8. **AC8: Accessibility**
   - Given the invitation acceptance flow
   - When navigating with assistive technology
   - Then all elements are keyboard accessible (NFR43)
   - And touch targets are 44px minimum (NFR49)
   - And focus indicators are visible (NFR46)
   - And error messages are announced to screen readers

## Tasks / Subtasks

- [x] Task 1: Create Invitation Acceptance Page (AC: #1, #2, #8)
  - [x] 1.1 Create apps/web/src/app/invite/accept/page.tsx
  - [x] 1.2 Extract token from URL query parameter
  - [x] 1.3 Fetch invitation by token (new service function)
  - [x] 1.4 Display invitation details (inviter name, family name, expiry)
  - [x] 1.5 Handle expired/invalid/used invitation states with clear messages
  - [x] 1.6 Ensure 44px touch targets and focus indicators

- [x] Task 2: Create Invitation Lookup Service Function (AC: #1, #2)
  - [x] 2.1 Add getInvitationByToken to invitationService.ts
  - [x] 2.2 Query by token field
  - [x] 2.3 Check invitation status (pending only)
  - [x] 2.4 Check expiration date
  - [x] 2.5 Return invitation or null with error reason

- [x] Task 3: Create Accept Invitation Cloud Function (AC: #4, #5, #6, #7)
  - [x] 3.1 Create apps/functions/src/callable/acceptInvitation.ts
  - [x] 3.2 Validate invitation exists, is pending, and not expired
  - [x] 3.3 Add accepting user as guardian to all children in family
  - [x] 3.4 Add accepting user to family guardians array
  - [x] 3.5 Update user document with familyId
  - [x] 3.6 Update invitation status to 'accepted'
  - [x] 3.7 Use batch write for atomicity
  - [x] 3.8 Export function in apps/functions/src/index.ts

- [x] Task 4: Update Schemas and Types (AC: #6)
  - [x] 4.1 Add acceptedAt field to invitationSchema (optional date)
  - [x] 4.2 Add acceptedByUid field to invitationSchema (optional string)
  - [x] 4.3 Add acceptInvitationInputSchema for Cloud Function input

- [x] Task 5: Implement Authentication Flow on Acceptance Page (AC: #3, #7)
  - [x] 5.1 Add "Accept Invitation" button that triggers Google Sign-In
  - [x] 5.2 After sign-in, call acceptInvitation Cloud Function
  - [x] 5.3 Handle new user profile creation (reuse Story 1.2 pattern)
  - [x] 5.4 Redirect to dashboard on success
  - [x] 5.5 Show error state if acceptance fails

- [x] Task 6: Update Firestore Security Rules (AC: #4)
  - [x] 6.1 Add read rule for invitation by token (public read for pending)
  - [x] 6.2 Cloud Function uses Admin SDK (bypasses security rules)

- [x] Task 7: Update Dashboard to Show Co-Parent (AC: #5)
  - [x] 7.1 Display "Co-managed" badge when family has multiple guardians
  - [x] 7.2 Show guardian count in family settings

- [x] Task 8: Add Unit Tests (AC: All)
  - [x] 8.1 Test invitation lookup by token
  - [x] 8.2 Test expired invitation handling
  - [x] 8.3 Test Cloud Function input validation
  - [x] 8.4 Test guardian addition logic

## Dev Notes

### Technical Requirements

- **Cloud Functions:** Firebase Cloud Functions v2 for atomic acceptance
- **Batch Writes:** Use batch writes to ensure atomicity across collections
- **Schema Source:** @fledgely/contracts (Zod schemas - Unbreakable Rule #1)
- **Firebase Access:** Direct SDK calls on client, Admin SDK in functions (Unbreakable Rule #2)
- **Functions Pattern:** Thin function → service delegation (Unbreakable Rule #5)
- **Firestore Index:** Required composite index on `invitations` collection for `token` field (auto-created on first query in dev)

### Note on AC6 (Confirmation Notification)

AC6 specifies "Both parents receive confirmation notification (email/in-app)". This implementation:

- ✅ Logs the acceptance for audit trail
- ⏳ Email notification to inviter deferred to Story 3.5 (Invitation Management) which covers notification features

### Architecture Compliance

From project_context.md:

- "All types from Zod Only" - extend invitationSchema for new fields
- "Firebase SDK Direct" - use `httpsCallable()` for client-side calls
- "Functions Delegate to Services" - Cloud Function should delegate to service
- Cloud Functions Template: Auth → Validation → Permission → Business Logic

### Accept Invitation Cloud Function Pattern

```typescript
// apps/functions/src/callable/acceptInvitation.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

const acceptInvitationInputSchema = z.object({
  token: z.string().min(1),
})

export const acceptInvitation = onCall(async (request) => {
  // 1. Auth
  const user = verifyAuth(request.auth)

  // 2. Validation
  const parseResult = acceptInvitationInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input')
  }
  const { token } = parseResult.data

  const db = getFirestore()

  // 3. Find invitation by token
  const invitationsRef = db.collection('invitations')
  const snapshot = await invitationsRef.where('token', '==', token).limit(1).get()

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Invitation not found')
  }

  const invitationDoc = snapshot.docs[0]
  const invitation = invitationDoc.data()

  // 4. Permission/validation checks
  if (invitation.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Invitation is no longer valid')
  }
  if (invitation.expiresAt.toDate() < new Date()) {
    throw new HttpsError('failed-precondition', 'Invitation has expired')
  }

  // 5. Business logic - batch write for atomicity
  const batch = db.batch()
  const familyId = invitation.familyId

  // Update invitation
  batch.update(invitationDoc.ref, {
    status: 'accepted',
    acceptedAt: FieldValue.serverTimestamp(),
    acceptedByUid: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add to family guardians
  const familyRef = db.collection('families').doc(familyId)
  batch.update(familyRef, {
    guardians: FieldValue.arrayUnion({
      uid: user.uid,
      role: 'guardian',
      addedAt: new Date(),
    }),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add to all children's guardians
  const childrenSnapshot = await db.collection('children').where('familyId', '==', familyId).get()

  for (const childDoc of childrenSnapshot.docs) {
    batch.update(childDoc.ref, {
      guardians: FieldValue.arrayUnion({
        uid: user.uid,
        role: 'guardian',
        addedAt: new Date(),
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  // Update accepting user's profile
  const userRef = db.collection('users').doc(user.uid)
  batch.update(userRef, {
    familyId,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  // Log success (no PII per project standards)
  console.log(`Invitation accepted: invitationId=${invitationDoc.id}, userId=${user.uid}`)

  return {
    success: true,
    familyId,
    message: 'You have joined the family successfully!',
  }
})
```

### Invitation Acceptance Page Pattern

```typescript
// apps/web/src/app/invite/accept/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getInvitationByToken, acceptInvitation } from '@/services/invitationService'
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided')
      setLoading(false)
      return
    }

    getInvitationByToken(token)
      .then(setInvitation)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleAccept = async () => {
    if (!token) return

    setAccepting(true)
    try {
      // Sign in if not already
      const auth = getFirebaseAuth()
      if (!auth.currentUser) {
        await signInWithPopup(auth, getGoogleProvider())
      }

      // Accept invitation
      const result = await acceptInvitation(token)
      if (result.success) {
        router.push('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  // ... render UI
}
```

### Schema Updates

```typescript
// packages/shared/src/contracts/index.ts
export const invitationSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  inviterUid: z.string(),
  inviterName: z.string(),
  familyName: z.string(),
  token: z.string(),
  status: invitationStatusSchema,
  recipientEmail: z.string().email().nullable(),
  emailSentAt: z.date().nullable(),
  acceptedAt: z.date().nullable(), // Story 3.3 field
  acceptedByUid: z.string().nullable(), // Story 3.3 field
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const acceptInvitationInputSchema = z.object({
  token: z.string().min(1),
})
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>
```

### Client-Side Service Function

```typescript
// apps/web/src/services/invitationService.ts

/**
 * Get invitation by token for acceptance page.
 *
 * @param token - The secure token from the invitation link
 * @returns The invitation if valid, or throws with error reason
 */
export async function getInvitationByToken(token: string): Promise<Invitation> {
  const db = getFirestoreDb()
  const invitationsRef = collection(db, 'invitations')
  const tokenQuery = query(invitationsRef, where('token', '==', token))
  const snapshot = await getDocs(tokenQuery)

  if (snapshot.empty) {
    throw new Error('Invitation not found or has expired')
  }

  const doc = snapshot.docs[0]
  const data = doc.data()
  const invitation = invitationSchema.parse(convertInvitationTimestamps(data))

  if (invitation.status !== 'pending') {
    if (invitation.status === 'accepted') {
      throw new Error('This invitation has already been used')
    }
    if (invitation.status === 'revoked') {
      throw new Error('This invitation has been revoked')
    }
    if (invitation.status === 'expired') {
      throw new Error('This invitation has expired')
    }
    throw new Error('Invitation is no longer valid')
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error('This invitation has expired')
  }

  return invitation
}

/**
 * Accept an invitation via Cloud Function.
 *
 * @param token - The invitation token
 * @returns Result with success status
 */
export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  const functions = getFirebaseFunctions()
  const acceptInvitationFn = httpsCallable<
    { token: string },
    { success: boolean; familyId: string; message: string }
  >(functions, 'acceptInvitation')

  const result = await acceptInvitationFn({ token })
  return result.data
}
```

### Firestore Security Rules Update

```javascript
// packages/firebase-rules/firestore.rules
match /invitations/{invitationId} {
  // Allow public read for pending invitations by token (for acceptance page)
  // This is safe because token is unguessable UUID
  allow read: if resource.data.status == 'pending';

  // Existing rules...
}
```

### Library/Framework Requirements

| Dependency         | Version | Purpose                          |
| ------------------ | ------- | -------------------------------- |
| firebase           | ^10.x   | Firebase SDK (already installed) |
| firebase-admin     | ^12.x   | Admin SDK for Cloud Functions    |
| firebase-functions | ^5.x    | Cloud Functions v2               |
| zod                | ^3.x    | Schema validation                |

### File Structure Requirements

```
packages/shared/src/contracts/
└── index.ts                         # UPDATE - Add acceptedAt, acceptedByUid fields

apps/functions/
├── src/
│   ├── index.ts                     # UPDATE - Export acceptInvitation
│   └── callable/
│       └── acceptInvitation.ts      # NEW - Accept invitation Cloud Function

apps/web/src/
├── services/
│   └── invitationService.ts         # UPDATE - Add getInvitationByToken, acceptInvitation
├── app/
│   └── invite/
│       └── accept/
│           └── page.tsx             # NEW - Invitation acceptance page
└── app/
    └── dashboard/
        └── page.tsx                 # UPDATE - Show co-parent indicator

packages/firebase-rules/
└── firestore.rules                  # UPDATE - Add public read for pending invitations
```

### Testing Requirements

- Unit test getInvitationByToken with valid token
- Unit test getInvitationByToken with expired token (throws)
- Unit test getInvitationByToken with used token (throws)
- Unit test Cloud Function input validation
- Unit test Cloud Function permission checks
- Test batch write atomicity (all-or-nothing)
- Test user profile update with familyId

### Previous Story Intelligence (Story 3.2)

From Story 3.2 completion:

- Email service infrastructure created
- Cloud Functions pattern established (Auth → Validation → Permission → Business Logic)
- verifyAuth utility ready to use
- Invitation schema has recipientEmail and emailSentAt fields
- getFirebaseFunctions() added to firebase.ts
- httpsCallable pattern for client → Cloud Function calls

**Key Patterns to Follow:**

```typescript
// Cloud Function pattern from sendInvitation.ts
export const acceptInvitation = onCall<...>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = schema.safeParse(request.data)

  // 3. Permission (THIRD) - verify invitation exists and is valid

  // 4. Business logic (LAST) - batch write for atomicity
})

// Client-side callable pattern from invitationService.ts
export async function acceptInvitation(token: string) {
  const functions = getFirebaseFunctions()
  const fn = httpsCallable<InputType, OutputType>(functions, 'acceptInvitation')
  return fn({ token })
}
```

### NFR References

- NFR43: All interactive elements keyboard accessible
- NFR45: Color contrast 4.5:1 minimum
- NFR46: Visible focus indicators
- NFR49: 44x44px minimum touch target

### References

- [Source: docs/epics/epic-list.md#Story-3.3]
- [Source: docs/epics/epic-list.md#Story-3.4]
- [Source: docs/project_context.md#The-5-Unbreakable-Rules]
- [Source: docs/project_context.md#Cloud-Functions-Template]
- [Source: docs/sprint-artifacts/stories/3-1-co-parent-invitation-generation.md]
- [Source: docs/sprint-artifacts/stories/3-2-invitation-delivery.md]

## Dev Agent Record

### Context Reference

- Epic: 3 (Co-Parent Invitation & Family Sharing)
- Sprint: 2 (Feature Development)
- Story Key: 3-3-co-parent-invitation-acceptance
- Depends On: Story 3.1 (completed), Story 3.2 (completed)

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

| File                                                 | Action   | Purpose                                                                                       |
| ---------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| packages/shared/src/contracts/index.ts               | Modified | Added acceptedAt, acceptedByUid fields to invitationSchema; added acceptInvitationInputSchema |
| apps/functions/src/callable/acceptInvitation.ts      | Created  | Cloud Function for accepting invitations with batch writes                                    |
| apps/functions/src/callable/acceptInvitation.test.ts | Created  | Unit tests for acceptInvitation Cloud Function                                                |
| apps/functions/src/index.ts                          | Modified | Export acceptInvitation function                                                              |
| apps/web/src/services/invitationService.ts           | Modified | Added getInvitationByToken, acceptInvitation, InvitationErrorReason type                      |
| apps/web/src/services/invitationService.test.ts      | Modified | Added tests for Story 3.3 schema fields and acceptInvitationInputSchema                       |
| apps/web/src/app/invite/accept/page.tsx              | Created  | Invitation acceptance landing page with Google Sign-In                                        |
| apps/web/src/app/dashboard/page.tsx                  | Modified | Added "Co-managed" badge for multi-guardian families                                          |
| packages/firebase-rules/firestore.rules              | Modified | Allow public read for pending invitations                                                     |

## Change Log

| Date       | Change                                                         |
| ---------- | -------------------------------------------------------------- |
| 2025-12-28 | Story created (ready-for-dev)                                  |
| 2025-12-28 | Story implementation completed                                 |
| 2025-12-28 | Code review - Added self-invitation and existing family checks |
