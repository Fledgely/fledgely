/**
 * Cloud Function for removing a caregiver with child notification.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.7: Caregiver Removal
 * - AC1: Immediate Access Revocation (within 5 minutes per NFR62)
 * - AC3: Child Notification ("Grandma is no longer a caregiver")
 * - AC6: Optional removal reason stored in audit log
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { removeCaregiverWithNotificationInputSchema } from '@fledgely/shared'

// Response type
interface RemoveCaregiverWithNotificationResponse {
  success: boolean
  notificationId: string
  message: string
}

/**
 * Remove a caregiver and create child notification.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian in the family
 * - Caregiver exists in the family
 *
 * Then:
 * - Removes caregiver from family.caregivers array
 * - Creates child notification document
 * - Creates audit log entry with optional reason
 * - Returns success confirmation
 */
export const removeCaregiverWithNotification = onCall<
  Parameters<typeof removeCaregiverWithNotificationInputSchema.parse>[0],
  Promise<RemoveCaregiverWithNotificationResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = removeCaregiverWithNotificationInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, caregiverUid, caregiverEmail, reason } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is guardian
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Verify caller is a guardian
  const guardianUids = familyData.guardianUids || []
  if (!guardianUids.includes(user.uid)) {
    throw new HttpsError('permission-denied', 'Only family guardians can remove caregivers')
  }

  // Find the caregiver in the family
  const caregivers = familyData.caregivers || []
  const caregiver = caregivers.find((c: { uid: string }) => c.uid === caregiverUid)

  if (!caregiver) {
    throw new HttpsError('not-found', 'Caregiver not found in family')
  }

  // Get caregiver's assigned children
  const childIds = caregiver.childIds || []
  const caregiverName = caregiver.displayName || caregiver.email || 'A caregiver'

  // 4. Business logic - remove caregiver and create notification (LAST)
  const batch = db.batch()

  // Remove caregiver from family document
  const updatedCaregivers = caregivers.filter((c: { uid: string }) => c.uid !== caregiverUid)
  const updatedCaregiverUids = (familyData.caregiverUids || []).filter(
    (uid: string) => uid !== caregiverUid
  )

  batch.update(familyRef, {
    caregivers: updatedCaregivers,
    caregiverUids: updatedCaregiverUids,
  })

  // Create child notification (AC3)
  const notificationRef = familyRef.collection('childNotifications').doc()
  const childFriendlyMessage = `${caregiverName} is no longer a caregiver`
  const notification = {
    id: notificationRef.id,
    type: 'caregiver_removed',
    childUids: childIds,
    message: childFriendlyMessage,
    caregiverName,
    createdAt: FieldValue.serverTimestamp(),
    readBy: [],
  }
  batch.set(notificationRef, notification)

  // Create audit log entry with optional reason (AC6)
  const auditRef = db.collection('caregiverAuditLogs').doc()
  const auditEntry: Record<string, unknown> = {
    id: auditRef.id,
    familyId,
    caregiverUid,
    caregiverName,
    action: 'caregiver_removed',
    changedByUid: user.uid,
    changes: {
      removedEmail: caregiverEmail,
      removedChildIds: childIds,
    },
    createdAt: FieldValue.serverTimestamp(),
  }

  // Include reason in audit log if provided (AC6)
  if (reason) {
    auditEntry.changes = {
      ...(auditEntry.changes as Record<string, unknown>),
      removalReason: reason,
    }
  }

  batch.set(auditRef, auditEntry)

  // Try to delete the invitation document if it exists
  try {
    const invitationRef = db.collection('caregiverInvitations').doc(`${familyId}_${caregiverEmail}`)
    const invitationDoc = await invitationRef.get()
    if (invitationDoc.exists) {
      batch.delete(invitationRef)
    }
  } catch (inviteError) {
    // Invitation deletion is best-effort, log but don't fail
    // eslint-disable-next-line no-console
    console.warn('[RemoveCaregiver] Could not delete invitation:', inviteError)
  }

  await batch.commit()

  return {
    success: true,
    notificationId: notificationRef.id,
    message: `${caregiverName} has been removed and children notified`,
  }
})
