/**
 * Audit Query Service
 *
 * Story 27.2: Parent Audit Log View - AC1, AC3, AC4, AC6
 *
 * Provides query capabilities for audit events with:
 * - Pagination (cursor-based)
 * - Filtering by actor, resource type, date range
 * - Actor name resolution
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import type { AuditEvent, AuditResourceType } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Filter options for audit log queries.
 */
export interface AuditLogFilters {
  /** Filter by specific actor UID */
  actorUid?: string
  /** Filter by resource type */
  resourceType?: AuditResourceType
  /** Start of date range (epoch ms) */
  startDate?: number
  /** End of date range (epoch ms) */
  endDate?: number
}

/**
 * Pagination options for audit log queries.
 */
export interface AuditLogPagination {
  /** Number of items per page */
  limit: number
  /** Cursor for pagination (last document timestamp) */
  cursor?: number
}

/**
 * Enriched audit event with actor display name.
 */
export interface EnrichedAuditEvent extends AuditEvent {
  actorDisplayName: string
}

/**
 * Result of an audit log query.
 */
export interface AuditLogQueryResult {
  events: EnrichedAuditEvent[]
  nextCursor: number | null
  hasMore: boolean
  totalEstimate?: number
}

/**
 * Cache for user display names to reduce lookups.
 */
const userNameCache = new Map<string, string>()

/**
 * Get display name for an actor UID.
 *
 * @param uid - Actor user ID
 * @returns Display name or fallback
 */
async function getActorDisplayName(uid: string): Promise<string> {
  // Check cache first
  if (userNameCache.has(uid)) {
    return userNameCache.get(uid)!
  }

  const db = getDb()

  try {
    const userDoc = await db.collection('users').doc(uid).get()

    if (userDoc.exists) {
      const userData = userDoc.data()
      const displayName = userData?.displayName || userData?.email || uid
      userNameCache.set(uid, displayName)
      return displayName
    }
  } catch {
    // Fallback to UID if lookup fails
  }

  return uid
}

/**
 * Batch resolve actor display names for efficiency.
 *
 * @param uids - Array of user IDs
 * @returns Map of uid to display name
 */
async function batchResolveActorNames(uids: string[]): Promise<Map<string, string>> {
  const db = getDb()
  const results = new Map<string, string>()

  // Filter to only uncached UIDs
  const uncachedUids = uids.filter((uid) => !userNameCache.has(uid))

  if (uncachedUids.length > 0) {
    // Firestore limits 'in' queries to 30 items
    const chunks: string[][] = []
    for (let i = 0; i < uncachedUids.length; i += 30) {
      chunks.push(uncachedUids.slice(i, i + 30))
    }

    for (const chunk of chunks) {
      const snapshot = await db.collection('users').where('__name__', 'in', chunk).get()

      snapshot.docs.forEach((doc) => {
        const userData = doc.data()
        const displayName = userData?.displayName || userData?.email || doc.id
        userNameCache.set(doc.id, displayName)
      })
    }
  }

  // Build results from cache
  uids.forEach((uid) => {
    results.set(uid, userNameCache.get(uid) || uid)
  })

  return results
}

/**
 * Query audit events for a family.
 *
 * Story 27.2: AC1 - Chronological display (newest first)
 * Story 27.2: AC3 - Comprehensive coverage (all family events)
 * Story 27.2: AC4 - Filter capabilities
 * Story 27.2: AC6 - Pagination
 *
 * @param familyId - Family ID to query
 * @param filters - Optional filter options
 * @param pagination - Pagination options
 * @returns Query result with enriched events
 */
export async function getAuditLogForFamily(
  familyId: string,
  filters: AuditLogFilters = {},
  pagination: AuditLogPagination = { limit: 25 }
): Promise<AuditLogQueryResult> {
  const db = getDb()

  // Build base query
  let query = db
    .collection('auditEvents')
    .where('familyId', '==', familyId)
    .orderBy('timestamp', 'desc')

  // Apply filters
  if (filters.actorUid) {
    query = query.where('actorUid', '==', filters.actorUid)
  }

  if (filters.resourceType) {
    query = query.where('resourceType', '==', filters.resourceType)
  }

  if (filters.startDate) {
    query = query.where('timestamp', '>=', filters.startDate)
  }

  if (filters.endDate) {
    query = query.where('timestamp', '<=', filters.endDate)
  }

  // Apply pagination
  if (pagination.cursor) {
    query = query.startAfter(pagination.cursor)
  }

  // Fetch one extra to check for more
  const snapshot = await query.limit(pagination.limit + 1).get()

  const hasMore = snapshot.docs.length > pagination.limit
  const docs = hasMore ? snapshot.docs.slice(0, pagination.limit) : snapshot.docs

  // Extract events
  const events = docs.map((doc) => doc.data() as AuditEvent)

  // Batch resolve actor names
  const actorUids = [...new Set(events.map((e) => e.actorUid))]
  const actorNames = await batchResolveActorNames(actorUids)

  // Enrich events with display names
  const enrichedEvents: EnrichedAuditEvent[] = events.map((event) => ({
    ...event,
    actorDisplayName: actorNames.get(event.actorUid) || event.actorUid,
  }))

  // Calculate next cursor
  const lastEvent = events[events.length - 1]
  const nextCursor = hasMore && lastEvent ? lastEvent.timestamp : null

  return {
    events: enrichedEvents,
    nextCursor,
    hasMore,
  }
}

/**
 * Check if family has any external (non-family) access.
 *
 * Story 27.2: AC5 - Reassurance message
 *
 * @param familyId - Family ID to check
 * @returns True if only family members have accessed data
 */
export async function hasOnlyFamilyAccess(familyId: string): Promise<boolean> {
  const db = getDb()

  // Check for any system or admin access
  const externalSnapshot = await db
    .collection('auditEvents')
    .where('familyId', '==', familyId)
    .where('actorType', 'in', ['admin', 'system'])
    .limit(1)
    .get()

  return externalSnapshot.empty
}

/**
 * Get family members for filter dropdown.
 *
 * @param familyId - Family ID
 * @returns List of family members with UIDs and names
 */
export async function getFamilyMembersForFilter(
  familyId: string
): Promise<Array<{ uid: string; displayName: string; role: string }>> {
  const db = getDb()

  // Get family document for guardian and child lists
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    return []
  }

  const familyData = familyDoc.data()!
  const members: Array<{ uid: string; displayName: string; role: string }> = []

  // Add guardians
  const guardianUids = familyData.guardianUids || []
  for (const uid of guardianUids) {
    const displayName = await getActorDisplayName(uid)
    members.push({ uid, displayName, role: 'guardian' })
  }

  // Add children
  const childrenSnapshot = await db.collection('children').where('familyId', '==', familyId).get()

  for (const childDoc of childrenSnapshot.docs) {
    const childData = childDoc.data()
    members.push({
      uid: childDoc.id,
      displayName: childData.name || 'Child',
      role: 'child',
    })
  }

  // Add caregivers if any
  const caregiversSnapshot = await db
    .collection('caregiverAccess')
    .where('familyId', '==', familyId)
    .where('status', '==', 'active')
    .get()

  for (const caregiverDoc of caregiversSnapshot.docs) {
    const caregiverData = caregiverDoc.data()
    const displayName = await getActorDisplayName(caregiverData.caregiverUid)
    members.push({
      uid: caregiverData.caregiverUid,
      displayName,
      role: 'caregiver',
    })
  }

  return members
}
