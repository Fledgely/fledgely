/**
 * Cloud Function for approving location feature opt-in.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is different guardian
 * 4. Business logic via batch write (LAST)
 *
 * Story 40.1: Location-Based Rule Opt-In
 * - AC1: Explicit Dual-Guardian Opt-In (second guardian approves)
 * - AC3: Child Notification (notify children when enabled)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import { approveLocationOptInInputSchema } from '@fledgely/shared'

// Response type
interface ApproveLocationOptInResponse {
  success: boolean
  notificationId: string
  message: string
}

/**
 * Approve location feature opt-in request.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian in the family
 * - Caller is NOT the requester (dual-consent requirement)
 * - Request exists and is pending
 * - Request has not expired
 *
 * Then:
 * - Updates request status to approved
 * - Enables location features on family document
 * - Creates child notification
 * - Returns success confirmation
 */
export const approveLocationOptIn = onCall<
  Parameters<typeof approveLocationOptInInputSchema.parse>[0],
  Promise<ApproveLocationOptInResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = approveLocationOptInInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, requestId } = parseResult.data

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
    throw new HttpsError('permission-denied', 'Only family guardians can approve location opt-in')
  }

  // Get and validate the request
  const requestRef = familyRef.collection('locationOptInRequests').doc(requestId)
  const requestDoc = await requestRef.get()

  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Opt-in request not found')
  }

  const requestData = requestDoc.data()!

  // Verify caller is not the requester (dual-consent requirement)
  if (requestData.requestedByUid === user.uid) {
    throw new HttpsError('permission-denied', 'Cannot approve your own request')
  }

  // Verify request is pending
  if (requestData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Request is not pending')
  }

  // Verify request has not expired
  const expiresAt =
    requestData.expiresAt instanceof Date ? requestData.expiresAt : requestData.expiresAt.toDate()
  if (expiresAt < new Date()) {
    throw new HttpsError('failed-precondition', 'Request has expired')
  }

  // 4. Business logic - approve request and enable location (LAST)
  const batch = db.batch()
  const now = new Date()

  // Update request to approved
  batch.update(requestRef, {
    status: 'approved',
    approvedByUid: user.uid,
    resolvedAt: now,
  })

  // Enable location features on family document
  batch.update(familyRef, {
    locationFeaturesEnabled: true,
    locationEnabledAt: now,
    locationEnabledByUids: [requestData.requestedByUid, user.uid],
    locationDisabledAt: null,
    locationDisabledByUid: null,
    childNotifiedAt: now,
  })

  // Create child notification (AC3)
  const childIds = familyData.childIds || []
  const notificationRef = familyRef.collection('childNotifications').doc()

  batch.set(notificationRef, {
    id: notificationRef.id,
    type: 'location_features_enabled',
    childUids: childIds,
    message:
      'Your family turned on location features. This means your rules might change based on where you are (like at school or at home).',
    createdAt: now,
    readBy: [],
  })

  // Commit the batch
  await batch.commit()

  return {
    success: true,
    notificationId: notificationRef.id,
    message: 'Location features enabled successfully. Children have been notified.',
  }
})
