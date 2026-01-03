/**
 * Location Update HTTP Handler - Story 40.4
 *
 * Receives location updates from devices and matches them to zones.
 *
 * Acceptance Criteria:
 * - AC1: Transition Detection
 * - AC6: Location Detection (GPS + WiFi)
 */

import { onRequest, type Request } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  locationUpdateInputSchema,
  isWithinZone,
  LOCATION_UPDATE_MIN_INTERVAL_MS,
  LOCATION_MAX_ACCURACY_METERS,
  LOCATION_TRANSITION_GRACE_PERIOD_MS,
  type LocationUpdateResponse,
  type LocationZone,
} from '@fledgely/shared'
import type { Response } from 'express'

interface AuthenticatedDevice {
  deviceId: string
  familyId: string
  childId: string
}

/**
 * Verify device enrollment token and return device info.
 */
async function verifyDeviceToken(
  db: FirebaseFirestore.Firestore,
  authHeader: string | undefined
): Promise<AuthenticatedDevice | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)

  // Query enrolled devices by token
  const devicesSnapshot = await db
    .collectionGroup('enrolledDevices')
    .where('enrollmentToken', '==', token)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (devicesSnapshot.empty) {
    return null
  }

  const deviceDoc = devicesSnapshot.docs[0]
  const data = deviceDoc.data()

  return {
    deviceId: deviceDoc.id,
    familyId: data.familyId,
    childId: data.childId,
  }
}

/**
 * Check if device can send location update (rate limiting).
 */
async function canUpdateLocation(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  deviceId: string
): Promise<boolean> {
  const locationRef = db
    .collection('families')
    .doc(familyId)
    .collection('deviceLocations')
    .doc(deviceId)

  const locationDoc = await locationRef.get()

  if (!locationDoc.exists) {
    return true
  }

  const data = locationDoc.data()
  const lastUpdate = data?.updatedAt?.toDate?.() ?? new Date(0)
  const timeSinceUpdate = Date.now() - lastUpdate.getTime()

  return timeSinceUpdate >= LOCATION_UPDATE_MIN_INTERVAL_MS
}

/**
 * Match location coordinates to a family's location zones.
 * Returns the first matching zone or null if no match.
 */
async function matchLocationToZone(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  latitude: number,
  longitude: number
): Promise<LocationZone | null> {
  const zonesSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationZones')
    .get()

  if (zonesSnapshot.empty) {
    return null
  }

  // Find first zone that contains the location
  for (const zoneDoc of zonesSnapshot.docs) {
    const zone = zoneDoc.data() as LocationZone

    if (isWithinZone(latitude, longitude, zone.latitude, zone.longitude, zone.radiusMeters)) {
      return { ...zone, id: zoneDoc.id }
    }
  }

  return null
}

/**
 * Get current zone for device.
 */
async function getCurrentZone(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  deviceId: string
): Promise<string | null> {
  const locationRef = db
    .collection('families')
    .doc(familyId)
    .collection('deviceLocations')
    .doc(deviceId)

  const locationDoc = await locationRef.get()

  if (!locationDoc.exists) {
    return null
  }

  return locationDoc.data()?.zoneId ?? null
}

/**
 * Create a location transition record.
 */
async function createTransition(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  childId: string,
  deviceId: string,
  fromZoneId: string | null,
  toZoneId: string | null
): Promise<string> {
  const now = new Date()
  const gracePeriodEndsAt = new Date(now.getTime() + LOCATION_TRANSITION_GRACE_PERIOD_MS)

  const transitionRef = db
    .collection('families')
    .doc(familyId)
    .collection('locationTransitions')
    .doc()

  await transitionRef.set({
    id: transitionRef.id,
    familyId,
    childId,
    deviceId,
    fromZoneId,
    toZoneId,
    detectedAt: Timestamp.fromDate(now),
    gracePeriodEndsAt: Timestamp.fromDate(gracePeriodEndsAt),
    appliedAt: null,
    notificationSentAt: null,
    rulesApplied: null,
  })

  return transitionRef.id
}

/**
 * Update device location in Firestore.
 */
async function updateDeviceLocation(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  childId: string,
  deviceId: string,
  latitude: number,
  longitude: number,
  accuracyMeters: number,
  zoneId: string | null
): Promise<void> {
  const locationRef = db
    .collection('families')
    .doc(familyId)
    .collection('deviceLocations')
    .doc(deviceId)

  await locationRef.set(
    {
      deviceId,
      familyId,
      childId,
      latitude,
      longitude,
      accuracyMeters,
      zoneId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Location Update HTTP Handler.
 *
 * Receives location updates from devices and:
 * 1. Validates device authentication
 * 2. Rate limits updates (1 per minute)
 * 3. Matches location to configured zones
 * 4. Creates transitions when zone changes
 * 5. Returns matched zone info
 */
export const locationUpdate = onRequest({ cors: true }, async (req: Request, res: Response) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const db = getFirestore()

  // Step 1: Verify device authentication
  const device = await verifyDeviceToken(db, req.headers.authorization)

  if (!device) {
    res.status(401).json({ error: 'Unauthorized: Invalid or missing device token' })
    return
  }

  // Step 2: Validate input
  const parseResult = locationUpdateInputSchema.safeParse(req.body)

  if (!parseResult.success) {
    res.status(400).json({ error: `Invalid input: ${parseResult.error.message}` })
    return
  }

  const { latitude, longitude, accuracyMeters } = parseResult.data

  // Step 3: Check rate limiting
  const canUpdate = await canUpdateLocation(db, device.familyId, device.deviceId)

  if (!canUpdate) {
    const response: LocationUpdateResponse = {
      success: false,
      zoneId: null,
      zoneName: null,
      transitionTriggered: false,
      message: 'Rate limited: Please wait before sending another update',
    }
    res.status(429).json(response)
    return
  }

  // Step 4: Check location accuracy (AC5 - unclear location)
  if (accuracyMeters > LOCATION_MAX_ACCURACY_METERS) {
    // Location too inaccurate - don't trigger transition
    await updateDeviceLocation(
      db,
      device.familyId,
      device.childId,
      device.deviceId,
      latitude,
      longitude,
      accuracyMeters,
      null // No zone match for inaccurate location
    )

    const response: LocationUpdateResponse = {
      success: true,
      zoneId: null,
      zoneName: null,
      transitionTriggered: false,
      message: 'Location accuracy too low to determine zone',
    }
    res.status(200).json(response)
    return
  }

  // Step 5: Match location to zone
  const matchedZone = await matchLocationToZone(db, device.familyId, latitude, longitude)

  // Step 6: Get current zone to detect transition
  const currentZoneId = await getCurrentZone(db, device.familyId, device.deviceId)
  const newZoneId = matchedZone?.id ?? null

  // Step 7: Check if transition needed
  let transitionTriggered = false

  if (currentZoneId !== newZoneId) {
    await createTransition(
      db,
      device.familyId,
      device.childId,
      device.deviceId,
      currentZoneId,
      newZoneId
    )
    transitionTriggered = true
  }

  // Step 8: Update device location
  await updateDeviceLocation(
    db,
    device.familyId,
    device.childId,
    device.deviceId,
    latitude,
    longitude,
    accuracyMeters,
    newZoneId
  )

  // Step 9: Return response
  const response: LocationUpdateResponse = {
    success: true,
    zoneId: newZoneId,
    zoneName: matchedZone?.name ?? null,
    transitionTriggered,
    message: transitionTriggered
      ? `Location changed to ${matchedZone?.name ?? 'unknown'}`
      : 'Location updated',
  }

  res.status(200).json(response)
})
