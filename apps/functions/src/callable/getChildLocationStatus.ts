/**
 * getChildLocationStatus - Story 40.5
 *
 * Callable function for child to get their current location status.
 *
 * Acceptance Criteria:
 * - AC2: Current Location Status Display
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  getChildLocationStatusInputSchema,
  type ChildLocationStatus,
  LOCATION_PRIVACY_MESSAGES,
} from '@fledgely/shared'

/**
 * Get child's current location status.
 *
 * Returns the child's current zone with owner name (e.g., "At: Home (Mom's)").
 * Child can only access their own status.
 */
export const getChildLocationStatus = onCall(async (request) => {
  const db = getFirestore()
  const { auth, data } = request

  // Validate authentication
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  // Validate input
  const parseResult = getChildLocationStatusInputSchema.safeParse(data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
  }

  const { familyId, childId } = parseResult.data
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

  // Verify caller is either the child or a guardian
  const isChild =
    familyData.children?.some(
      (c: { id: string; uid?: string }) => c.id === childId && c.uid === callerUid
    ) ?? false
  const isGuardian =
    familyData.guardians?.some((g: { uid: string }) => g.uid === callerUid) ?? false

  if (!isChild && !isGuardian) {
    throw new HttpsError('permission-denied', 'Not authorized to view this location status')
  }

  // Check if location features are enabled
  const locationFeaturesEnabled = familyData.locationFeaturesEnabled ?? false

  if (!locationFeaturesEnabled) {
    const status: ChildLocationStatus = {
      currentZoneId: null,
      currentZoneName: null,
      zoneOwnerName: null,
      lastUpdatedAt: new Date(),
      locationFeaturesEnabled: false,
    }
    return { status, message: LOCATION_PRIVACY_MESSAGES.locationOff }
  }

  // Get the child's most recent device location
  const deviceLocationsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('deviceLocations')
    .where('childId', '==', childId)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  if (deviceLocationsSnapshot.empty) {
    const status: ChildLocationStatus = {
      currentZoneId: null,
      currentZoneName: null,
      zoneOwnerName: null,
      lastUpdatedAt: new Date(),
      locationFeaturesEnabled: true,
    }
    return { status, message: LOCATION_PRIVACY_MESSAGES.unknownLocation }
  }

  const deviceLocation = deviceLocationsSnapshot.docs[0].data()
  const zoneId = deviceLocation.zoneId
  const updatedAt = deviceLocation.updatedAt?.toDate?.() ?? new Date()

  if (!zoneId) {
    const status: ChildLocationStatus = {
      currentZoneId: null,
      currentZoneName: null,
      zoneOwnerName: null,
      lastUpdatedAt: updatedAt,
      locationFeaturesEnabled: true,
    }
    return { status, message: LOCATION_PRIVACY_MESSAGES.unknownLocation }
  }

  // Get zone details
  const zoneDoc = await db
    .collection('families')
    .doc(familyId)
    .collection('locationZones')
    .doc(zoneId)
    .get()

  if (!zoneDoc.exists) {
    const status: ChildLocationStatus = {
      currentZoneId: zoneId,
      currentZoneName: null,
      zoneOwnerName: null,
      lastUpdatedAt: updatedAt,
      locationFeaturesEnabled: true,
    }
    return { status, message: LOCATION_PRIVACY_MESSAGES.unknownLocation }
  }

  const zoneData = zoneDoc.data()
  const zoneName = zoneData?.name ?? 'Unknown'
  const ownerUid = zoneData?.createdByUid

  // Get owner name from guardians
  let ownerName: string | null = null
  if (ownerUid) {
    const guardian = familyData.guardians?.find(
      (g: { uid: string; name?: string }) => g.uid === ownerUid
    )
    ownerName = guardian?.name ?? null
  }

  const status: ChildLocationStatus = {
    currentZoneId: zoneId,
    currentZoneName: zoneName,
    zoneOwnerName: ownerName,
    lastUpdatedAt: updatedAt,
    locationFeaturesEnabled: true,
  }

  const message = ownerName
    ? LOCATION_PRIVACY_MESSAGES.currentLocation(zoneName, ownerName)
    : `At: ${zoneName}`

  return { status, message }
})
