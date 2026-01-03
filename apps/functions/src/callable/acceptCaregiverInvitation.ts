/**
 * Cloud Function for accepting caregiver invitations.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify invitation is valid
 * 4. Business logic via batch write (LAST)
 *
 * Implements Story 19D.1 acceptance criteria:
 * - AC3: Caregiver completes Google Sign-In to accept
 * - AC4: Caregiver sees onboarding explaining limited access
 * - AC6: Invitation expires in 7 days if not accepted
 *
 * Story 39.1 additions:
 * - AC1: Copy relationship from invitation to family caregiver entry
 * - AC4: Create notification for each child when caregiver joins
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

// Input validation schema - mirrors @fledgely/shared/contracts/acceptCaregiverInvitationInputSchema
// Note: Cloud Functions currently can't use workspace packages directly, so we duplicate
// the schema here. Both should be kept in sync.
const acceptCaregiverInvitationInputSchema = z.object({
  token: z.string().min(1),
})

// Response type - matches acceptCaregiverInvitationResultSchema
interface AcceptCaregiverInvitationResponse {
  success: boolean
  familyId: string
  familyName: string
  childNames: string[]
  role: 'status_viewer'
}

/**
 * Accept a caregiver invitation.
 *
 * Validates that:
 * - User is authenticated (AC3: Google Sign-In required)
 * - Input is valid (token provided)
 * - Invitation exists and is pending
 * - Invitation has not expired (AC6)
 * - User is not already a guardian or caregiver
 *
 * Then:
 * - Updates invitation status to 'accepted'
 * - Adds caregiver to family document with status_viewer role
 * - Returns family info for onboarding (AC4)
 */
export const acceptCaregiverInvitation = onCall<
  z.infer<typeof acceptCaregiverInvitationInputSchema>,
  Promise<AcceptCaregiverInvitationResponse>
>(async (request) => {
  // 1. Auth (FIRST) - AC3: Google Sign-In required
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = acceptCaregiverInvitationInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: token is required')
  }
  const { token } = parseResult.data

  const db = getFirestore()

  // 3. Permission/data retrieval (THIRD) - Find invitation by token
  const invitationsRef = db.collection('caregiverInvitations')
  const snapshot = await invitationsRef.where('token', '==', token).limit(1).get()

  if (snapshot.empty) {
    throw new HttpsError('not-found', 'Invitation not found')
  }

  const invitationDoc = snapshot.docs[0]
  const invitationData = invitationDoc.data()

  // Verify invitation is pending
  if (invitationData.status !== 'pending') {
    if (invitationData.status === 'accepted') {
      throw new HttpsError('failed-precondition', 'This invitation has already been accepted')
    }
    if (invitationData.status === 'revoked') {
      throw new HttpsError('failed-precondition', 'This invitation has been cancelled')
    }
    throw new HttpsError('failed-precondition', 'This invitation is no longer valid')
  }

  // Verify invitation hasn't expired (AC6)
  const expiresAt = invitationData.expiresAt?.toDate?.() || new Date(invitationData.expiresAt)
  if (expiresAt < new Date()) {
    // Update status to expired
    await invitationDoc.ref.update({
      status: 'expired',
      updatedAt: FieldValue.serverTimestamp(),
    })
    throw new HttpsError('failed-precondition', 'This invitation has expired')
  }

  // Get family document
  const familyId = invitationData.familyId
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Check if user is already a guardian
  const isGuardian = familyData.guardians?.some((g: { uid: string }) => g.uid === user.uid)
  if (isGuardian) {
    throw new HttpsError('failed-precondition', 'You are already a guardian in this family')
  }

  // Check if user is already a caregiver
  const isCaregiver = familyData.caregivers?.some((c: { uid: string }) => c.uid === user.uid)
  if (isCaregiver) {
    throw new HttpsError('failed-precondition', 'You are already a caregiver in this family')
  }

  // Get child names for the onboarding response (AC4)
  const childIds = invitationData.childIds || []
  const childrenSnapshot = await db.collection('children').where('familyId', '==', familyId).get()

  const childNames: string[] = []
  childrenSnapshot.docs.forEach((childDoc) => {
    if (childIds.includes(childDoc.id)) {
      const childData = childDoc.data()
      childNames.push(childData.name || 'Child')
    }
  })

  // 4. Business logic - batch write for atomicity (LAST)
  const batch = db.batch()

  // Update invitation status to 'accepted'
  batch.update(invitationDoc.ref, {
    status: 'accepted',
    acceptedAt: FieldValue.serverTimestamp(),
    acceptedByUid: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Add caregiver to family document
  const caregiverEntry = {
    uid: user.uid,
    email: user.email || invitationData.recipientEmail,
    displayName: user.displayName || null,
    role: 'status_viewer', // AC2: Status Viewer role only
    relationship: invitationData.relationship, // Story 39.1 AC1: Relationship type
    customRelationship: invitationData.customRelationship || null, // Story 39.1 AC1: Custom text for "other"
    childIds: invitationData.childIds, // AC5: Which children they can view
    addedAt: new Date(),
    addedByUid: invitationData.inviterUid,
  }

  // Initialize caregivers array if it doesn't exist
  const caregivers = familyData.caregivers || []
  caregivers.push(caregiverEntry)

  const caregiverUids = familyData.caregiverUids || []
  caregiverUids.push(user.uid)

  batch.update(familyRef, {
    caregivers,
    caregiverUids,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Note: Unlike guardians, caregivers do NOT get added to child documents
  // They only view status, not manage children

  // Story 39.1 AC4: Create notification for each child
  // Format relationship for display in notification message
  const relationshipLabels: Record<string, string> = {
    grandparent: 'Grandparent',
    aunt_uncle: 'Aunt/Uncle',
    babysitter: 'Babysitter',
    other: invitationData.customRelationship || 'Caregiver',
  }
  const relationshipLabel = relationshipLabels[invitationData.relationship as string] || 'Caregiver'
  const caregiverDisplayName =
    user.displayName || invitationData.recipientEmail?.split('@')[0] || 'A caregiver'

  for (const childId of childIds) {
    const notificationRef = db.collection('children').doc(childId).collection('notifications').doc()

    batch.set(notificationRef, {
      type: 'caregiver_added',
      caregiverUid: user.uid,
      caregiverName: caregiverDisplayName,
      caregiverRelationship: invitationData.relationship,
      customRelationship: invitationData.customRelationship || null,
      message: `${caregiverDisplayName} (${relationshipLabel}) has been added as a caregiver`,
      createdAt: FieldValue.serverTimestamp(),
      read: false,
    })
  }

  // Commit all changes atomically
  await batch.commit()

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Caregiver invitation accepted: invitationId=${invitationDoc.id}, userId=${user.uid}, familyId=${familyId}`
  )

  // Return info for onboarding (AC4)
  return {
    success: true,
    familyId,
    familyName: familyData.name || 'Your family',
    childNames,
    role: 'status_viewer',
  }
})
