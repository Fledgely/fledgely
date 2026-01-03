/**
 * Cloud Functions for managing location zones.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian & location features enabled
 * 4. Business logic via batch write (LAST)
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC1: Location Definitions (Home 1, Home 2, School, Other)
 * - AC4: Geofence Configuration (radius 100-2000m, default 500m)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { verifyAuth } from '../shared/auth'
import {
  createLocationZoneInputSchema,
  updateLocationZoneInputSchema,
  deleteLocationZoneInputSchema,
  DEFAULT_GEOFENCE_RADIUS_METERS,
} from '@fledgely/shared'

// Response types
interface CreateLocationZoneResponse {
  success: boolean
  zoneId: string
  message: string
}

interface UpdateLocationZoneResponse {
  success: boolean
  message: string
}

interface DeleteLocationZoneResponse {
  success: boolean
  message: string
}

/**
 * Helper to verify guardian has permission to manage location zones.
 * Checks that:
 * 1. Family exists
 * 2. Caller is a guardian
 * 3. Location features are enabled
 */
async function verifyGuardianAndLocationEnabled(
  familyId: string,
  uid: string,
  db: FirebaseFirestore.Firestore
): Promise<FirebaseFirestore.DocumentSnapshot> {
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Verify caller is a guardian
  const guardianUids = familyData.guardianUids || []
  if (!guardianUids.includes(uid)) {
    throw new HttpsError('permission-denied', 'Only family guardians can manage location zones')
  }

  // Verify location features are enabled
  if (!familyData.locationFeaturesEnabled) {
    throw new HttpsError(
      'failed-precondition',
      'Location features must be enabled before creating location zones'
    )
  }

  return familyDoc
}

/**
 * Create a new location zone.
 *
 * Story 40.2: AC1, AC4
 * - Creates zone with name, type, coordinates, and radius
 * - Validates geofence radius is within allowed range
 */
export const createLocationZone = onCall<
  Parameters<typeof createLocationZoneInputSchema.parse>[0],
  Promise<CreateLocationZoneResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = createLocationZoneInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, name, type, latitude, longitude, radiusMeters, address } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD)
  await verifyGuardianAndLocationEnabled(familyId, user.uid, db)

  // 4. Business logic (LAST)
  const batch = db.batch()

  // Create zone document
  const zoneRef = db.collection('families').doc(familyId).collection('locationZones').doc()
  const now = new Date()

  batch.set(zoneRef, {
    id: zoneRef.id,
    familyId,
    name,
    type,
    latitude,
    longitude,
    radiusMeters: radiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
    address: address ?? null,
    createdAt: now,
    updatedAt: now,
  })

  // Create audit log entry
  const auditRef = db.collection('families').doc(familyId).collection('auditLog').doc()
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'location_zone_created',
    performedByUid: user.uid,
    targetZoneId: zoneRef.id,
    details: { name, type, radiusMeters: radiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS },
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  return {
    success: true,
    zoneId: zoneRef.id,
    message: `Location zone "${name}" created successfully`,
  }
})

/**
 * Update an existing location zone.
 *
 * Story 40.2: AC1, AC4
 * - Updates zone properties
 * - Validates geofence radius if provided
 */
export const updateLocationZone = onCall<
  Parameters<typeof updateLocationZoneInputSchema.parse>[0],
  Promise<UpdateLocationZoneResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = updateLocationZoneInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, zoneId, ...updates } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD)
  await verifyGuardianAndLocationEnabled(familyId, user.uid, db)

  // Verify zone exists
  const zoneRef = db.collection('families').doc(familyId).collection('locationZones').doc(zoneId)
  const zoneDoc = await zoneRef.get()

  if (!zoneDoc.exists) {
    throw new HttpsError('not-found', 'Location zone not found')
  }

  // 4. Business logic (LAST)
  const batch = db.batch()

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.type !== undefined) updateData.type = updates.type
  if (updates.latitude !== undefined) updateData.latitude = updates.latitude
  if (updates.longitude !== undefined) updateData.longitude = updates.longitude
  if (updates.radiusMeters !== undefined) updateData.radiusMeters = updates.radiusMeters
  if (updates.address !== undefined) updateData.address = updates.address

  batch.update(zoneRef, updateData)

  // Create audit log entry
  const auditRef = db.collection('families').doc(familyId).collection('auditLog').doc()
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'location_zone_updated',
    performedByUid: user.uid,
    targetZoneId: zoneId,
    details: { updatedFields: Object.keys(updates) },
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  return {
    success: true,
    message: 'Location zone updated successfully',
  }
})

/**
 * Delete a location zone.
 *
 * Story 40.2: AC1
 * - Deletes zone and associated location rules
 */
export const deleteLocationZone = onCall<
  Parameters<typeof deleteLocationZoneInputSchema.parse>[0],
  Promise<DeleteLocationZoneResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = deleteLocationZoneInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, zoneId } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD)
  await verifyGuardianAndLocationEnabled(familyId, user.uid, db)

  // Verify zone exists
  const zoneRef = db.collection('families').doc(familyId).collection('locationZones').doc(zoneId)
  const zoneDoc = await zoneRef.get()

  if (!zoneDoc.exists) {
    throw new HttpsError('not-found', 'Location zone not found')
  }

  const zoneName = zoneDoc.data()?.name || 'Unknown'

  // 4. Business logic (LAST)
  const batch = db.batch()

  // Delete zone document
  batch.delete(zoneRef)

  // Delete associated location rules for this zone
  const rulesSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationRules')
    .where('zoneId', '==', zoneId)
    .get()

  rulesSnapshot.docs.forEach((ruleDoc) => {
    batch.delete(ruleDoc.ref)
  })

  // Create audit log entry
  const auditRef = db.collection('families').doc(familyId).collection('auditLog').doc()
  batch.set(auditRef, {
    id: auditRef.id,
    action: 'location_zone_deleted',
    performedByUid: user.uid,
    targetZoneId: zoneId,
    details: { zoneName, deletedRulesCount: rulesSnapshot.size },
    createdAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()

  return {
    success: true,
    message: `Location zone "${zoneName}" deleted successfully`,
  }
})
