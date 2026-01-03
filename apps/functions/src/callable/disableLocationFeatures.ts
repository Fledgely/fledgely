/**
 * Cloud Function for disabling location features.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian
 * 4. Business logic via batch write (LAST)
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC5: Instant Disable by Any Guardian (single guardian can disable immediately)
 * - AC6: Fleeing Mode Integration (no notifications for 72 hours)
 *
 * Key difference from enable: Only ONE guardian needed to disable (not two).
 * This is a safety feature - any guardian can instantly revoke location tracking.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { disableLocationFeaturesInputSchema } from '@fledgely/shared'

// Response type
interface DisableLocationFeaturesResponse {
  success: boolean
  notificationId: string | null
  message: string
}

/**
 * Disable location features (single guardian action).
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian in the family
 * - Location features are currently enabled
 *
 * Then:
 * - Disables location features on family document
 * - Records who disabled and when
 * - Creates child notification (unless fleeing mode)
 * - If fleeing mode: suppresses notifications for 72 hours
 */
export const disableLocationFeatures = onCall<
  Parameters<typeof disableLocationFeaturesInputSchema.parse>[0],
  Promise<DisableLocationFeaturesResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = disableLocationFeaturesInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, isFleeingMode } = parseResult.data

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
    throw new HttpsError('permission-denied', 'Only family guardians can disable location features')
  }

  // Verify location features are enabled
  if (!familyData.locationFeaturesEnabled) {
    throw new HttpsError('failed-precondition', 'Location features are not enabled')
  }

  // 4. Business logic - disable location features (LAST)
  const batch = db.batch()
  const now = new Date()

  // Build update object
  const familyUpdate: Record<string, unknown> = {
    locationFeaturesEnabled: false,
    locationDisabledAt: now,
    locationDisabledByUid: user.uid,
  }

  // If fleeing mode, record activation (AC6)
  if (isFleeingMode) {
    familyUpdate.fleeingModeActivatedAt = now
    familyUpdate.fleeingModeActivatedByUid = user.uid
  }

  batch.update(familyRef, familyUpdate)

  let notificationId: string | null = null

  // Create child notification ONLY if NOT fleeing mode (AC6)
  if (!isFleeingMode) {
    const childIds = familyData.childIds || []
    const notificationRef = familyRef.collection('childNotifications').doc()
    notificationId = notificationRef.id

    batch.set(notificationRef, {
      id: notificationRef.id,
      type: 'location_features_disabled',
      childUids: childIds,
      message:
        'Location features have been turned off. Your rules will no longer change based on where you are.',
      createdAt: now,
      readBy: [],
    })
  }

  // Commit the batch
  await batch.commit()

  return {
    success: true,
    notificationId,
    message: isFleeingMode
      ? 'Location features disabled (fleeing mode - no notifications sent).'
      : 'Location features disabled successfully.',
  }
})
