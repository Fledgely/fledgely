/**
 * Cloud Function for accepting co-parent invitations.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify invitation is valid
 * 4. Business logic via batch write (LAST)
 *
 * Implements Story 3.3 acceptance criteria:
 * - AC4: Guardian Addition to Family
 * - AC5: Immediate Data Access
 * - AC6: Invitation Status Update
 * - AC7: User Profile Update
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

// Input validation schema - mirrors @fledgely/shared/contracts/acceptInvitationInputSchema
// Note: Cloud Functions currently can't use workspace packages directly, so we duplicate
// the schema here. Both should be kept in sync.
const acceptInvitationInputSchema = z.object({
  token: z.string().min(1),
})

// Response type
interface AcceptInvitationResponse {
  success: boolean
  familyId: string
  message: string
}

/**
 * Accept a co-parent invitation.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid (token provided)
 * - Invitation exists and is pending
 * - Invitation has not expired
 *
 * Then performs atomic batch write to:
 * - Update invitation status to 'accepted'
 * - Add user as guardian to family document
 * - Add user as guardian to all children in family
 * - Update user's profile with familyId
 */
export const acceptInvitation = onCall<
  z.infer<typeof acceptInvitationInputSchema>,
  Promise<AcceptInvitationResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = acceptInvitationInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: token is required')
  }
  const { token } = parseResult.data

  const db = getFirestore()

  // 3. Permission/data retrieval (THIRD) - Find invitation by token
  const invitationsRef = db.collection('invitations')
  const snapshot = await invitationsRef.where('token', '==', token).limit(1).get()

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Invitation not found')
  }

  const invitationDoc = snapshot.docs[0]
  const invitationData = invitationDoc.data()

  // Verify invitation is pending
  if (invitationData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This invitation is no longer valid')
  }

  // Verify invitation hasn't expired
  const expiresAt = invitationData.expiresAt?.toDate?.() || new Date(invitationData.expiresAt)
  if (expiresAt < new Date()) {
    throw new HttpsError('failed-precondition', 'This invitation has expired')
  }

  // Prevent inviter from accepting their own invitation
  if (invitationData.inviterUid === user.uid) {
    throw new HttpsError('failed-precondition', 'You cannot accept your own invitation')
  }

  // Check if user already has a family
  const existingUserRef = db.collection('users').doc(user.uid)
  const existingUserDoc = await existingUserRef.get()
  if (existingUserDoc.exists && existingUserDoc.data()?.familyId) {
    throw new HttpsError(
      'failed-precondition',
      'You are already a member of a family. Leave your current family first.'
    )
  }

  // 4. Business logic - batch write for atomicity (LAST)
  const batch = db.batch()
  const familyId = invitationData.familyId

  // Verify family exists
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()
  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  // Update invitation status to 'accepted' (AC6)
  batch.update(invitationDoc.ref, {
    status: 'accepted',
    acceptedAt: FieldValue.serverTimestamp(),
    acceptedByUid: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add user to family guardians array (AC4)
  // Use 'guardian' role (same as inviter, no hierarchy)
  const guardianEntry = {
    uid: user.uid,
    role: 'guardian',
    addedAt: new Date(),
  }
  batch.update(familyRef, {
    guardians: FieldValue.arrayUnion(guardianEntry),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add user as guardian to all children in family (AC4)
  const childrenSnapshot = await db.collection('children').where('familyId', '==', familyId).get()

  for (const childDoc of childrenSnapshot.docs) {
    batch.update(childDoc.ref, {
      guardians: FieldValue.arrayUnion(guardianEntry),
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  // Update user's profile with familyId (AC7)
  // Note: existingUserDoc was already retrieved above to check for existing family
  if (existingUserDoc.exists) {
    // Existing user - just update familyId
    batch.update(existingUserRef, {
      familyId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  } else {
    // New user - will be created by auth flow, but we should handle this edge case
    // The user document should exist after Google Sign-In (created in Story 1.2)
    // If it doesn't, the client should handle profile creation first
    throw new HttpsError(
      'failed-precondition',
      'Please complete account setup before accepting the invitation'
    )
  }

  // Commit all changes atomically
  await batch.commit()

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Invitation accepted: invitationId=${invitationDoc.id}, userId=${user.uid}, familyId=${familyId}`
  )

  return {
    success: true,
    familyId,
    message: 'You have joined the family successfully!',
  }
})
