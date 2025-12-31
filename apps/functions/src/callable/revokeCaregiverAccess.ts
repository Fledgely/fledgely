/**
 * Cloud Function for revoking caregiver access.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic via service (LAST)
 *
 * Implements Story 19D.5 acceptance criteria:
 * - AC1: Revoke access within 5 minutes (NFR62) - immediate in practice
 * - AC2: Terminate caregiver's current session
 * - AC5: Log revocation in audit trail
 * - AC6: Allow re-invitation after revocation
 *
 * This provides server-side enforcement of revocation,
 * complementing the client-side implementation.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

// Input validation schema
const revokeCaregiverAccessInputSchema = z.object({
  familyId: z.string().min(1),
  caregiverId: z.string().min(1),
  caregiverEmail: z.string().email(),
})

// Response type
interface RevokeCaregiverAccessResponse {
  success: boolean
  message: string
  sessionTerminated: boolean
}

/**
 * Revoke caregiver access from a family.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid (familyId, caregiverId, caregiverEmail)
 * - User is a guardian in this family
 * - Caregiver exists in family's caregivers array
 *
 * Then:
 * - Removes caregiver from family document (atomic)
 * - Deletes caregiver invitation if exists
 * - Invalidates caregiver's session token
 * - Logs revocation to audit trail
 * - Updates caregiver's user document to remove family access
 */
export const revokeCaregiverAccess = onCall<
  z.infer<typeof revokeCaregiverAccessInputSchema>,
  Promise<RevokeCaregiverAccessResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = revokeCaregiverAccessInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid input: please provide family ID, caregiver ID, and caregiver email'
    )
  }

  const { familyId, caregiverId, caregiverEmail } = parseResult.data
  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is a guardian
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardianUids: string[] = familyData?.guardianUids ?? []

  if (!guardianUids.includes(user.uid)) {
    throw new HttpsError('permission-denied', 'Only family guardians can revoke caregiver access')
  }

  // 4. Business Logic (LAST)

  // Find the caregiver in the family
  const caregivers = familyData?.caregivers ?? []
  const caregiverToRemove = caregivers.find(
    (c: { uid: string; email: string }) => c.uid === caregiverId
  )

  if (!caregiverToRemove) {
    throw new HttpsError('not-found', 'Caregiver not found in family')
  }

  // Use a transaction for atomic operations
  let sessionTerminated = false

  await db.runTransaction(async (transaction) => {
    const familyRef = db.collection('families').doc(familyId)

    // Re-verify family exists and caregiver is still present (prevents TOCTOU race)
    const familySnapshot = await transaction.get(familyRef)
    if (!familySnapshot.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const currentData = familySnapshot.data()
    const currentCaregivers = currentData?.caregivers ?? []
    const stillExists = currentCaregivers.some((c: { uid: string }) => c.uid === caregiverId)

    if (!stillExists) {
      // Already revoked (idempotent) - don't throw, just return
      return
    }

    // 4a + 4b. Atomic update: remove caregiver AND extensions in single update call
    transaction.update(familyRef, {
      caregivers: FieldValue.arrayRemove(caregiverToRemove),
      caregiverUids: FieldValue.arrayRemove(caregiverId),
      [`caregiverExtensions.${caregiverId}`]: FieldValue.delete(),
    })
  })

  // 4c. Delete invitation document if exists (outside transaction, best-effort)
  try {
    const invitationId = `${familyId}_${caregiverEmail}`
    const invitationRef = db.collection('caregiverInvitations').doc(invitationId)
    const invitationDoc = await invitationRef.get()

    if (invitationDoc.exists) {
      await invitationRef.delete()
    }
  } catch (err) {
    // Best-effort, don't fail the revocation
    console.warn('[revokeCaregiverAccess] Could not delete invitation:', err)
  }

  // 4d. Invalidate caregiver's session (AC2: Session termination)
  try {
    // Update the caregiver's session document to mark as revoked
    const sessionRef = db.collection('caregiverSessions').doc(caregiverId)
    const sessionDoc = await sessionRef.get()

    if (sessionDoc.exists) {
      await sessionRef.update({
        revokedAt: Timestamp.now(),
        revokedByFamilyId: familyId,
        revokedByUid: user.uid,
        isActive: false,
      })
      sessionTerminated = true
    }

    // Also update the user's document to remove this family access
    const caregiverUserRef = db.collection('users').doc(caregiverId)
    const caregiverUserDoc = await caregiverUserRef.get()

    if (caregiverUserDoc.exists) {
      const userData = caregiverUserDoc.data()
      const caregiverFamilyIds: string[] = userData?.caregiverFamilyIds ?? []

      if (caregiverFamilyIds.includes(familyId)) {
        await caregiverUserRef.update({
          caregiverFamilyIds: FieldValue.arrayRemove(familyId),
        })
      }
    }
  } catch (err) {
    // Session termination is best-effort for MVP
    console.warn('[revokeCaregiverAccess] Could not terminate session:', err)
  }

  // 4e. Log revocation in audit trail (AC5)
  try {
    await db.collection('auditLogs').add({
      type: 'caregiver_revoked',
      familyId,
      caregiverId,
      caregiverEmail,
      revokedByUid: user.uid,
      revokedByEmail: user.email,
      revokedAt: Timestamp.now(),
      sessionTerminated,
    })
  } catch (err) {
    // Audit logging is critical but we don't fail the revocation
    console.error('[revokeCaregiverAccess] Failed to log audit:', err)
  }

  return {
    success: true,
    message: `Caregiver access revoked successfully`,
    sessionTerminated,
  }
})

export default revokeCaregiverAccess
