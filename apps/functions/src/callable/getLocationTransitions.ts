/**
 * Get Location Transitions Callable Function - Story 40.4
 *
 * Returns location transition history for a family.
 *
 * Acceptance Criteria:
 * - AC7: Audit trail for parents
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  getLocationTransitionsInputSchema,
  type GetLocationTransitionsResponse,
  type LocationTransition,
} from '@fledgely/shared'

interface TransitionWithZoneNames extends LocationTransition {
  fromZoneName: string | null
  toZoneName: string | null
}

/**
 * Get location transitions for a family.
 *
 * Returns paginated transition history with zone names.
 */
export const getLocationTransitions = onCall({ cors: true }, async (request) => {
  // Step 1: Verify authentication
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in')
  }

  const db = getFirestore()

  // Step 2: Validate input
  const parseResult = getLocationTransitionsInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', `Invalid input: ${parseResult.error.message}`)
  }

  const { familyId, childId, startDate, endDate, page, pageSize } = parseResult.data

  // Step 3: Verify user is member of family
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardians = familyData?.guardians || []
  const children = familyData?.children || []

  const isGuardian = guardians.some((g: { id: string }) => g.id === request.auth?.uid)
  const isChild = children.some((c: { id: string }) => c.id === request.auth?.uid)

  if (!isGuardian && !isChild) {
    throw new HttpsError('permission-denied', 'Not a member of this family')
  }

  // If child is requesting, only return their own transitions
  const effectiveChildId = isChild ? request.auth.uid : childId

  // Step 4: Build query
  let query = db
    .collection('families')
    .doc(familyId)
    .collection('locationTransitions')
    .orderBy('detectedAt', 'desc')

  if (effectiveChildId) {
    query = query.where('childId', '==', effectiveChildId) as typeof query
  }

  if (startDate) {
    query = query.where('detectedAt', '>=', Timestamp.fromDate(startDate)) as typeof query
  }

  if (endDate) {
    query = query.where('detectedAt', '<=', Timestamp.fromDate(endDate)) as typeof query
  }

  // Get total count (for pagination info)
  const countSnapshot = await query.count().get()
  const totalCount = countSnapshot.data().count

  // Apply pagination
  const offset = (page - 1) * pageSize
  const paginatedQuery = query.limit(pageSize).offset(offset)
  const transitionsSnapshot = await paginatedQuery.get()

  // Step 5: Fetch zone names for all transitions (batch to avoid N+1)
  const zoneIds = new Set<string>()
  for (const doc of transitionsSnapshot.docs) {
    const data = doc.data()
    if (data.fromZoneId) zoneIds.add(data.fromZoneId)
    if (data.toZoneId) zoneIds.add(data.toZoneId)
  }

  const zoneNames: Record<string, string> = {}
  if (zoneIds.size > 0) {
    const zoneRefs = Array.from(zoneIds).map((zoneId) =>
      db.collection('families').doc(familyId).collection('locationZones').doc(zoneId)
    )
    const zoneDocs = await db.getAll(...zoneRefs)
    for (const zoneDoc of zoneDocs) {
      if (zoneDoc.exists) {
        zoneNames[zoneDoc.id] = zoneDoc.data()?.name || 'Unknown Zone'
      }
    }
  }

  // Step 6: Transform results
  const transitions: TransitionWithZoneNames[] = transitionsSnapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      familyId: data.familyId,
      childId: data.childId,
      deviceId: data.deviceId,
      fromZoneId: data.fromZoneId,
      toZoneId: data.toZoneId,
      detectedAt: data.detectedAt?.toDate?.() || new Date(),
      gracePeriodEndsAt: data.gracePeriodEndsAt?.toDate?.() || new Date(),
      appliedAt: data.appliedAt?.toDate?.() || null,
      notificationSentAt: data.notificationSentAt?.toDate?.() || null,
      rulesApplied: data.rulesApplied || null,
      fromZoneName: data.fromZoneId ? zoneNames[data.fromZoneId] || null : null,
      toZoneName: data.toZoneId ? zoneNames[data.toZoneId] || null : null,
    }
  })

  // Step 7: Return response
  const response: GetLocationTransitionsResponse = {
    transitions,
    totalCount,
    page,
    pageSize,
    hasMore: offset + transitions.length < totalCount,
  }

  return response
})
