/**
 * Cloud Function for requesting location feature opt-in.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian
 * 4. Business logic via batch write (LAST)
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In (both parents must consent)
 *
 * Creates a pending opt-in request that requires second guardian approval.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { requestLocationOptInInputSchema, LOCATION_OPT_IN_EXPIRY_MS } from '@fledgely/shared'

// Response type
interface RequestLocationOptInResponse {
  success: boolean
  requestId: string
  message: string
}

/**
 * Request location feature opt-in.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian in the family
 * - Location features are not already enabled
 * - No pending request exists
 *
 * Then:
 * - Creates pending opt-in request document
 * - Sets expiry to 72 hours from now
 * - Returns request ID for tracking
 */
export const requestLocationOptIn = onCall<
  Parameters<typeof requestLocationOptInInputSchema.parse>[0],
  Promise<RequestLocationOptInResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = requestLocationOptInInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId } = parseResult.data

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
    throw new HttpsError('permission-denied', 'Only family guardians can request location opt-in')
  }

  // Check if location features are already enabled
  if (familyData.locationFeaturesEnabled) {
    throw new HttpsError('already-exists', 'Location features are already enabled')
  }

  // Check for existing pending request
  const existingRequests = await familyRef
    .collection('locationOptInRequests')
    .where('status', '==', 'pending')
    .get()

  if (!existingRequests.empty) {
    throw new HttpsError('already-exists', 'A pending location opt-in request already exists')
  }

  // 4. Business logic - create opt-in request (LAST)
  const batch = db.batch()

  // Create request document
  const requestRef = familyRef.collection('locationOptInRequests').doc()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCATION_OPT_IN_EXPIRY_MS)

  batch.set(requestRef, {
    id: requestRef.id,
    familyId,
    requestedByUid: user.uid,
    status: 'pending',
    approvedByUid: null,
    createdAt: now,
    expiresAt,
    resolvedAt: null,
  })

  // Commit the batch
  await batch.commit()

  return {
    success: true,
    requestId: requestRef.id,
    message: `Location opt-in request created. Pending approval from another guardian.`,
  }
})
