/**
 * getChildLocationHistory - Story 40.5
 *
 * Callable function for child to access their location history.
 * Child sees the same data parents see (bilateral transparency).
 *
 * Acceptance Criteria:
 * - AC3: Location History Access (bilateral transparency)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  getChildLocationHistoryInputSchema,
  formatTimeDescription,
  calculateDurationMinutes,
  LOCATION_PRIVACY_MESSAGES,
  type GetChildLocationHistoryResponse,
  type ChildLocationHistoryItem,
} from '@fledgely/shared'

/**
 * Get child's location history with pagination.
 *
 * Returns transition history with zone names - same data parents can see.
 * Child can only access their own history.
 */
export const getChildLocationHistory = onCall(async (request) => {
  const db = getFirestore()
  const { auth, data } = request

  // Validate authentication
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in')
  }

  // Validate input
  const parseResult = getChildLocationHistoryInputSchema.safeParse(data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
  }

  const { familyId, childId, page, pageSize } = parseResult.data
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

  // Verify caller is the child (bilateral transparency - same data as parents can see)
  const isChild =
    familyData.children?.some(
      (c: { id: string; uid?: string }) => c.id === childId && c.uid === callerUid
    ) ?? false
  const isGuardian =
    familyData.guardians?.some((g: { uid: string }) => g.uid === callerUid) ?? false

  if (!isChild && !isGuardian) {
    throw new HttpsError('permission-denied', 'Not authorized to view this location history')
  }

  // Check if location features are enabled
  const locationFeaturesEnabled = familyData.locationFeaturesEnabled ?? false

  if (!locationFeaturesEnabled) {
    const response: GetChildLocationHistoryResponse = {
      history: [],
      totalCount: 0,
      page: 1,
      pageSize,
      hasMore: false,
      transparencyNote: LOCATION_PRIVACY_MESSAGES.locationOff,
    }
    return response
  }

  // Get total count for pagination
  const countSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationTransitions')
    .where('childId', '==', childId)
    .count()
    .get()

  const totalCount = countSnapshot.data().count

  // Get paginated transitions
  const offset = (page - 1) * pageSize
  const transitionsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationTransitions')
    .where('childId', '==', childId)
    .orderBy('detectedAt', 'desc')
    .offset(offset)
    .limit(pageSize)
    .get()

  // Collect unique zone IDs for batch lookup
  const zoneIds = new Set<string>()
  for (const doc of transitionsSnapshot.docs) {
    const data = doc.data()
    if (data.fromZoneId) zoneIds.add(data.fromZoneId)
    if (data.toZoneId) zoneIds.add(data.toZoneId)
  }

  // Batch fetch zone names
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

  // Build history items
  const history: ChildLocationHistoryItem[] = []
  const transitions = transitionsSnapshot.docs

  for (let i = 0; i < transitions.length; i++) {
    const transition = transitions[i].data()
    const detectedAt = transition.detectedAt?.toDate?.() ?? new Date()

    // Calculate duration (time until next transition)
    let durationMinutes: number | null = null
    if (i < transitions.length - 1) {
      const nextTransition = transitions[i + 1].data()
      const nextDetectedAt = nextTransition.detectedAt?.toDate?.() ?? new Date()
      durationMinutes = calculateDurationMinutes(nextDetectedAt, detectedAt)
    }

    const item: ChildLocationHistoryItem = {
      id: transitions[i].id,
      fromZoneName: transition.fromZoneId ? (zoneNames[transition.fromZoneId] ?? null) : null,
      toZoneName: transition.toZoneId ? (zoneNames[transition.toZoneId] ?? null) : null,
      detectedAt,
      durationMinutes,
      timeDescription: formatTimeDescription(detectedAt),
    }

    history.push(item)
  }

  const response: GetChildLocationHistoryResponse = {
    history,
    totalCount,
    page,
    pageSize,
    hasMore: offset + history.length < totalCount,
    transparencyNote: LOCATION_PRIVACY_MESSAGES.transparencyNote,
  }

  return response
})
