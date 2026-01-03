/**
 * requestLocationDisable - Story 40.5
 *
 * Callable function for child to request location features be disabled.
 *
 * Acceptance Criteria:
 * - AC6: Request Disable Feature
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  requestLocationDisableInputSchema,
  LOCATION_PRIVACY_MESSAGES,
  LOCATION_DISABLE_REQUEST_MESSAGES,
  type LocationDisableRequest,
} from '@fledgely/shared'

/**
 * Request location features be disabled.
 *
 * Child submits request with optional reason.
 * Guardians receive notification of the request.
 */
export const requestLocationDisable = onCall(async (request) => {
  const db = getFirestore()
  const { auth, data } = request

  // Validate authentication
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  // Validate input
  const parseResult = requestLocationDisableInputSchema.safeParse(data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
  }

  const { familyId, reason } = parseResult.data
  const callerUid = auth.uid

  // Get family document to verify access
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  if (!familyData) {
    throw new HttpsError('not-found', 'Family data not found')
  }

  // Find the child making the request
  const child = familyData.children?.find(
    (c: { uid?: string; id: string; name: string }) => c.uid === callerUid
  )

  if (!child) {
    throw new HttpsError('permission-denied', 'Only children can request location disable')
  }

  // Check if location features are even enabled
  const locationFeaturesEnabled = familyData.locationFeaturesEnabled ?? false

  if (!locationFeaturesEnabled) {
    throw new HttpsError('failed-precondition', 'Location features are not enabled')
  }

  // Check for existing pending request
  const existingRequestSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationDisableRequests')
    .where('childId', '==', child.id)
    .where('status', '==', 'pending')
    .limit(1)
    .get()

  if (!existingRequestSnapshot.empty) {
    throw new HttpsError('already-exists', 'A pending request already exists')
  }

  // Create the request
  const now = Timestamp.now()
  const requestRef = db
    .collection('families')
    .doc(familyId)
    .collection('locationDisableRequests')
    .doc()

  const disableRequest: Omit<LocationDisableRequest, 'createdAt' | 'resolvedAt'> & {
    createdAt: Timestamp
    resolvedAt: null
  } = {
    id: requestRef.id,
    childId: child.id,
    familyId,
    reason: reason ?? null,
    status: 'pending',
    createdAt: now,
    resolvedAt: null,
    resolvedByUid: null,
    responseMessage: null,
  }

  await requestRef.set(disableRequest)

  // Create notifications for all guardians
  const guardians = familyData.guardians || []
  const childName = child.name || 'Your child'

  for (const guardian of guardians) {
    const message = reason
      ? LOCATION_DISABLE_REQUEST_MESSAGES.withReason(childName, reason)
      : LOCATION_DISABLE_REQUEST_MESSAGES.requestReceived(childName)

    await db
      .collection('families')
      .doc(familyId)
      .collection('notifications')
      .doc()
      .set({
        type: 'location_disable_request',
        recipientType: 'guardian',
        recipientId: guardian.id || guardian.uid,
        requestId: requestRef.id,
        childId: child.id,
        message,
        createdAt: now,
        readAt: null,
      })
  }

  // Log to audit trail
  await db.collection('families').doc(familyId).collection('auditLog').doc().set({
    type: 'location_disable_requested',
    actorUid: callerUid,
    actorType: 'child',
    childId: child.id,
    requestId: requestRef.id,
    hasReason: !!reason,
    createdAt: now,
  })

  return {
    requestId: requestRef.id,
    message: LOCATION_PRIVACY_MESSAGES.requestSent,
    status: 'pending',
  }
})
