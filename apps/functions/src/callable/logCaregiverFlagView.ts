/**
 * Cloud Function for logging caregiver flag viewing.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is caregiver with canViewFlags
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC4: Flag viewing audit log
 * - AC5: Permission requirement (canViewFlags)
 * - AC6: Child privacy (only assigned children)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { logCaregiverFlagViewInputSchema } from '@fledgely/shared'

// Response type
interface LogCaregiverFlagViewResponse {
  success: boolean
  logId: string
  message: string
}

/**
 * Log a caregiver viewing or reviewing a flag.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a caregiver in the family with canViewFlags permission
 * - Caregiver is assigned to the child whose flag is being viewed
 *
 * Then:
 * - Creates log entry in caregiverFlagViewLogs subcollection
 * - Creates audit log entry
 * - Returns success confirmation
 */
export const logCaregiverFlagView = onCall<
  Parameters<typeof logCaregiverFlagViewInputSchema.parse>[0],
  Promise<LogCaregiverFlagViewResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = logCaregiverFlagViewInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, flagId, childUid, action, flagCategory, flagSeverity } = parseResult.data

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

  // Get child name for the log
  const childRef = familyRef.collection('children').doc(childUid)
  const childDoc = await childRef.get()
  const childName = childDoc.exists
    ? childDoc.data()?.displayName || 'Unknown Child'
    : 'Unknown Child'

  // 4. Business logic - create log entry (LAST)
  const batch = db.batch()

  // Create flag view log
  const logRef = familyRef.collection('caregiverFlagViewLogs').doc()
  const logEntry = {
    id: logRef.id,
    familyId,
    caregiverUid: user.uid,
    caregiverName: caregiver.displayName || user.email || 'Unknown Caregiver',
    flagId,
    childUid,
    childName,
    action,
    flagCategory,
    flagSeverity,
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
    action: action === 'marked_reviewed' ? 'flag_marked_reviewed' : 'flag_viewed',
    changes: {
      flagId,
      childUid,
      childName,
      flagCategory,
      flagSeverity,
    },
    createdAt: FieldValue.serverTimestamp(),
  }
  batch.set(auditRef, auditEntry)

  await batch.commit()

  const actionText = action === 'marked_reviewed' ? 'marked as reviewed' : 'viewed'

  return {
    success: true,
    logId: logRef.id,
    message: `Flag ${actionText} and logged successfully`,
  }
})
