/**
 * Re-enable Safe Escape Cloud Function - Story 40.3
 *
 * Re-enables location features after Safe Escape was activated.
 * CRITICAL: Only the person who activated can re-enable.
 *
 * Acceptance Criteria:
 * - AC5: Only activator can re-enable
 */

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { reenableSafeEscapeInputSchema } from '@fledgely/shared'

/**
 * Re-enable location features for the family
 */
async function reenableLocationFeatures(
  db: FirebaseFirestore.Firestore,
  familyId: string
): Promise<void> {
  const settingsRef = db.collection('families').doc(familyId).collection('settings').doc('location')

  await settingsRef.set(
    {
      locationFeaturesEnabled: true,
      disabledAt: null,
      disabledReason: null,
      reenabledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Re-enable Safe Escape - ONLY ACTIVATOR CAN RE-ENABLE
 *
 * This ensures the person who needed to escape has full control
 * over when location features are restored.
 */
export const reenableSafeEscape = onCall(
  { cors: true },
  async (request: CallableRequest<unknown>) => {
    // Step 1: Verify authentication
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in')
    }

    const callerId = request.auth.uid

    // Step 2: Validate input
    const parseResult = reenableSafeEscapeInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', `Invalid input: ${parseResult.error.message}`)
    }

    const { familyId, activationId } = parseResult.data
    const db = getFirestore()

    // Step 3: Get the activation record
    const activationRef = db
      .collection('families')
      .doc(familyId)
      .collection('safeEscapeActivations')
      .doc(activationId)

    const activationDoc = await activationRef.get()

    if (!activationDoc.exists) {
      throw new HttpsError('not-found', 'Safe Escape activation not found')
    }

    const activation = activationDoc.data()

    // Step 4: Verify caller is the original activator (AC5 - CRITICAL)
    if (activation?.activatedBy !== callerId) {
      throw new HttpsError(
        'permission-denied',
        'Only the person who activated Safe Escape can re-enable location features'
      )
    }

    // Step 5: Check if already re-enabled
    if (activation?.reenabledAt) {
      return {
        success: true,
        message: 'Location features were already re-enabled',
      }
    }

    // Step 6: Re-enable location features
    await reenableLocationFeatures(db, familyId)

    // Step 7: Update activation record
    await activationRef.update({
      reenabledAt: FieldValue.serverTimestamp(),
      reenabledBy: callerId,
    })

    return {
      success: true,
      message: 'Location features re-enabled',
    }
  }
)
