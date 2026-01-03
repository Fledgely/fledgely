/**
 * Cloud Function for revoking temporary access from caregivers.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian of family
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.3: Temporary Caregiver Access
 * - AC5: Early revocation with immediate effect
 * - AC6: All temporary access logged
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

// Input validation schema
const revokeTemporaryAccessInputSchema = z.object({
  familyId: z.string().min(1, 'familyId is required'),
  grantId: z.string().min(1, 'grantId is required'),
  reason: z.string().max(200).optional(),
})

// Response type
interface RevokeTemporaryAccessResponse {
  success: boolean
  grantId: string
  status: string
  revokedAt: string
}

/**
 * Revoke temporary access from a caregiver.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian of the family
 * - Grant exists and is active or pending
 *
 * Then:
 * - Updates grant status to 'revoked'
 * - Sets revocation details
 * - Creates audit log entry
 * - Returns revocation confirmation
 */
export const revokeTemporaryAccess = onCall<
  z.infer<typeof revokeTemporaryAccessInputSchema>,
  Promise<RevokeTemporaryAccessResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = revokeTemporaryAccessInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, grantId, reason } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is guardian of family
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Verify caller is a guardian
  const isGuardian = familyData.guardians?.some((g: { uid: string }) => g.uid === user.uid)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only guardians can revoke temporary access')
  }

  // Get the grant document
  const grantRef = familyRef.collection('temporaryAccessGrants').doc(grantId)
  const grantDoc = await grantRef.get()

  if (!grantDoc.exists) {
    throw new HttpsError('not-found', 'Temporary access grant not found')
  }

  const grantData = grantDoc.data()!

  // Verify grant is in a revocable state
  if (grantData.status === 'revoked') {
    throw new HttpsError('failed-precondition', 'Grant has already been revoked')
  }

  if (grantData.status === 'expired') {
    throw new HttpsError('failed-precondition', 'Grant has already expired')
  }

  // 4. Business logic - revoke the grant (LAST)
  const revokedAt = new Date()

  // Create batch for atomic updates
  const batch = db.batch()

  // Update grant document
  batch.update(grantRef, {
    status: 'revoked',
    revokedAt,
    revokedByUid: user.uid,
    revokedReason: reason || null,
  })

  // Create audit log entry (Story 39.3 AC6)
  const auditLogRef = db.collection('caregiverAuditLogs').doc()
  batch.set(auditLogRef, {
    id: auditLogRef.id,
    familyId,
    caregiverUid: grantData.caregiverUid,
    action: 'temporary_access_revoked',
    changedByUid: user.uid,
    changes: {
      grantId,
      previousStatus: grantData.status,
      reason: reason || null,
    },
    createdAt: FieldValue.serverTimestamp(),
  })

  // Commit all changes atomically
  await batch.commit()

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Temporary access revoked: familyId=${familyId}, grantId=${grantId}, caregiverUid=${grantData.caregiverUid}, revokedBy=${user.uid}`
  )

  return {
    success: true,
    grantId,
    status: 'revoked',
    revokedAt: revokedAt.toISOString(),
  }
})
