/**
 * Cloud Function for granting caregiver access extension.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic (LAST)
 *
 * Implements Story 19D.4 acceptance criteria:
 * - AC4: Parent can grant one-time access extension
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

// Input validation schema
const grantExtensionInputSchema = z.object({
  familyId: z.string().min(1),
  caregiverId: z.string().min(1),
  durationMinutes: z.number().int().min(1).max(1440), // Max 24 hours
})

// Response type
interface GrantExtensionResponse {
  success: boolean
  expiresAt: string // ISO date string
  grantedAt: string // ISO date string
}

/**
 * Grant one-time access extension to a caregiver.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid (familyId, caregiverId, durationMinutes)
 * - User is a guardian in this family
 * - Caregiver exists in family's caregivers array
 *
 * Then:
 * - Stores extension in family.caregiverExtensions.{caregiverId}
 */
export const grantCaregiverExtension = onCall<
  z.infer<typeof grantExtensionInputSchema>,
  Promise<GrantExtensionResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = grantExtensionInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid input: please provide family ID, caregiver ID, and duration'
    )
  }

  const { familyId, caregiverId, durationMinutes } = parseResult.data
  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is a guardian
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardianUids: string[] = familyData?.guardianUids ?? []

  if (!guardianUids.includes(user.uid)) {
    throw new HttpsError('permission-denied', 'Only family guardians can grant extensions')
  }

  // Verify caregiver exists in family
  const caregiverUids: string[] = familyData?.caregiverUids ?? []
  if (!caregiverUids.includes(caregiverId)) {
    throw new HttpsError('not-found', 'Caregiver not found in family')
  }

  // 4. Business Logic (LAST)
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(now.toMillis() + durationMinutes * 60 * 1000)

  await db
    .collection('families')
    .doc(familyId)
    .update({
      [`caregiverExtensions.${caregiverId}`]: {
        grantedAt: now,
        expiresAt: expiresAt,
        grantedByUid: user.uid,
        grantedByName: user.displayName ?? user.email ?? 'Unknown',
      },
    })

  // Log to audit trail
  try {
    await db.collection('auditLogs').add({
      type: 'caregiver_extension_granted',
      familyId,
      caregiverId,
      grantedByUid: user.uid,
      grantedByEmail: user.email,
      durationMinutes,
      expiresAt,
      grantedAt: now,
    })
  } catch (err) {
    // Audit logging failure shouldn't fail the extension grant
    console.warn('[grantCaregiverExtension] Failed to log audit:', err)
  }

  return {
    success: true,
    expiresAt: expiresAt.toDate().toISOString(),
    grantedAt: now.toDate().toISOString(),
  }
})

export default grantCaregiverExtension
