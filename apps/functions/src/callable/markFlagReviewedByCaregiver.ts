/**
 * Cloud Function for caregiver to mark a flag as reviewed.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is caregiver with canViewFlags
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC2: Reviewed Flag Marking
 * - AC3: Restricted Actions (cannot dismiss/escalate/resolve)
 * - AC5: Permission requirement (canViewFlags)
 * - AC6: Child privacy (only assigned children)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { markFlagReviewedByCaregiverInputSchema } from '@fledgely/shared'

// Response type
interface MarkFlagReviewedByCaregiverResponse {
  success: boolean
  flagId: string
  message: string
}

/**
 * Mark a flag as reviewed by a caregiver.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a caregiver in the family with canViewFlags permission
 * - Flag exists
 * - Flag belongs to child in caregiver's childIds
 *
 * Then:
 * - Updates flag with caregiverReviewedAt and caregiverReviewedBy
 * - Creates log entry in caregiverFlagViewLogs subcollection
 * - Creates audit log entry
 * - Returns success confirmation
 *
 * RESTRICTED ACTIONS (AC3):
 * - Does NOT change flag status
 * - Does NOT dismiss flag
 * - Does NOT escalate flag
 * - Does NOT resolve flag
 * - Only parents can perform these actions
 */
export const markFlagReviewedByCaregiver = onCall<
  Parameters<typeof markFlagReviewedByCaregiverInputSchema.parse>[0],
  Promise<MarkFlagReviewedByCaregiverResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = markFlagReviewedByCaregiverInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, flagId, childUid } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is caregiver with canViewFlags
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Find the caregiver in the family
  const caregivers = familyData.caregivers || []
  const caregiver = caregivers.find((c: { uid: string }) => c.uid === user.uid)

  if (!caregiver) {
    throw new HttpsError('permission-denied', 'You are not a caregiver in this family')
  }

  // Check canViewFlags permission
  if (!caregiver.permissions?.canViewFlags) {
    throw new HttpsError('permission-denied', 'You do not have permission to view flags')
  }

  // Check if caregiver is assigned to this child (AC6: Child privacy)
  if (!caregiver.childIds?.includes(childUid)) {
    throw new HttpsError('permission-denied', 'You are not assigned to this child')
  }

  // Get the flag from children/{childUid}/flags/{flagId}
  const flagRef = db.collection('children').doc(childUid).collection('flags').doc(flagId)
  const flagDoc = await flagRef.get()

  if (!flagDoc.exists) {
    throw new HttpsError('not-found', 'Flag not found')
  }

  const flagData = flagDoc.data()!

  // Get child name for the log (from family subcollection)
  const childRef = familyRef.collection('children').doc(childUid)
  const childDoc = await childRef.get()
  const childName = childDoc.exists
    ? childDoc.data()?.displayName || 'Unknown Child'
    : 'Unknown Child'

  // 4. Business logic - update flag and create log entries (LAST)
  const batch = db.batch()

  // Update flag with caregiver review info ONLY (AC3: no status change)
  batch.update(flagRef, {
    caregiverReviewedAt: FieldValue.serverTimestamp(),
    caregiverReviewedBy: {
      uid: user.uid,
      displayName: caregiver.displayName || user.email || 'Unknown Caregiver',
    },
  })

  // Create flag view log with marked_reviewed action
  const logRef = familyRef.collection('caregiverFlagViewLogs').doc()
  const logEntry = {
    id: logRef.id,
    familyId,
    caregiverUid: user.uid,
    caregiverName: caregiver.displayName || user.email || 'Unknown Caregiver',
    flagId,
    childUid,
    childName,
    action: 'marked_reviewed',
    flagCategory: flagData.category || 'Unknown',
    flagSeverity: flagData.severity || 'unknown',
    createdAt: FieldValue.serverTimestamp(),
  }
  batch.set(logRef, logEntry)

  // Create audit log entry
  const auditRef = db.collection('caregiverAuditLogs').doc()
  const auditEntry = {
    id: auditRef.id,
    familyId,
    caregiverUid: user.uid,
    caregiverName: caregiver.displayName || 'Unknown',
    action: 'flag_marked_reviewed',
    changes: {
      flagId,
      childUid,
      childName,
      flagCategory: flagData.category,
      flagSeverity: flagData.severity,
    },
    createdAt: FieldValue.serverTimestamp(),
  }
  batch.set(auditRef, auditEntry)

  await batch.commit()

  return {
    success: true,
    flagId,
    message: `Flag marked as reviewed by ${caregiver.displayName || 'caregiver'}`,
  }
})
