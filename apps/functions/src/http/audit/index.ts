/**
 * Family Audit Log HTTP Endpoint
 *
 * Story 27.2: Parent Audit Log View
 *
 * Provides query endpoints to retrieve and display family-wide audit data.
 * Shows who has accessed family data, when, and what they accessed.
 *
 * Key Features:
 * - Family guardian verification for access
 * - Chronological display (newest first)
 * - Filter by person, resource type, date range
 * - Pagination support
 * - Reassurance message when only family accessed data
 *
 * Follows Cloud Functions Template pattern:
 * 1. Auth (FIRST) - validate Firebase Auth token
 * 2. Validation (SECOND) - validate request params
 * 3. Permission (THIRD) - verify caller is family guardian
 * 4. Business logic (LAST) - query and return audit data
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import {
  getAuditLogForFamily,
  hasOnlyFamilyAccess,
  getFamilyMembersForFilter,
  type AuditLogFilters,
} from '../../services/audit'
import type { AuditResourceType } from '@fledgely/shared'

/**
 * Response from family audit log endpoint
 */
export interface FamilyAuditLogResponse {
  events: Array<{
    id: string
    actorUid: string
    actorDisplayName: string
    actorType: string
    accessType: string
    resourceType: string
    resourceId: string | null
    childId: string | null
    timestamp: number
    deviceId: string | null
    userAgent: string | null
  }>
  hasMore: boolean
  nextCursor: number | null
  onlyFamilyAccess: boolean
  familyMembers: Array<{
    uid: string
    displayName: string
    role: string
  }>
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Family audit log HTTP endpoint
 *
 * GET /familyAuditLog?familyId={familyId}&limit={n}&cursor={timestamp}&...
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Query Parameters:
 * - familyId: required - Family whose audit log to retrieve
 * - limit: optional - Max records to return (default 25, max 100)
 * - cursor: optional - Cursor for pagination (timestamp)
 * - actorUid: optional - Filter by specific family member
 * - resourceType: optional - Filter by resource type
 * - startDate: optional - Filter start timestamp (epoch ms)
 * - endDate: optional - Filter end timestamp (epoch ms)
 *
 * Response:
 * - 200: Audit log data
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 403: Not a guardian of this family
 * - 404: Family not found
 * - 500: Server error
 */
export const familyAuditLog = onRequest(
  {
    cors: true,
    maxInstances: 20,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // 1. Auth (FIRST) - Validate Firebase Auth token
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization header required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const requesterId = decodedToken.uid

    // 2. Validation (SECOND) - Validate request params
    const { familyId, limit, cursor, actorUid, resourceType, startDate, endDate } = req.query

    if (!familyId || typeof familyId !== 'string') {
      res.status(400).json({ error: 'familyId parameter required' })
      return
    }

    const queryLimit = Math.min(Math.max(parseInt(limit as string) || 25, 1), 100)

    const db = getFirestore()

    // 3. Permission (THIRD) - Verify user is family guardian
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      res.status(404).json({ error: 'Family not found' })
      return
    }

    const familyData = familyDoc.data()
    const guardianUids = familyData?.guardianUids || []

    if (!guardianUids.includes(requesterId)) {
      logger.warn('Unauthorized family audit log access attempt', {
        requesterId,
        familyId,
      })
      res.status(403).json({ error: 'Not authorized to view this family audit log' })
      return
    }

    // 4. Business logic (LAST) - Query and return audit data

    try {
      // Build filters
      const filters: AuditLogFilters = {}

      if (actorUid && typeof actorUid === 'string') {
        filters.actorUid = actorUid
      }

      if (resourceType && typeof resourceType === 'string') {
        filters.resourceType = resourceType as AuditResourceType
      }

      if (startDate && typeof startDate === 'string') {
        const startTs = parseInt(startDate)
        if (!isNaN(startTs)) {
          filters.startDate = startTs
        }
      }

      if (endDate && typeof endDate === 'string') {
        const endTs = parseInt(endDate)
        if (!isNaN(endTs)) {
          filters.endDate = endTs
        }
      }

      // Build pagination
      const pagination = {
        limit: queryLimit,
        cursor: cursor && typeof cursor === 'string' ? parseInt(cursor) : undefined,
      }

      // Query audit events
      const result = await getAuditLogForFamily(familyId, filters, pagination)

      // Check if only family accessed data (for reassurance message)
      const onlyFamilyAccess = await hasOnlyFamilyAccess(familyId)

      // Get family members for filter dropdown
      const familyMembers = await getFamilyMembersForFilter(familyId)

      // Format response
      const response: FamilyAuditLogResponse = {
        events: result.events.map((event) => ({
          id: event.id,
          actorUid: event.actorUid,
          actorDisplayName: event.actorDisplayName,
          actorType: event.actorType,
          accessType: event.accessType,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          childId: event.childId,
          timestamp: event.timestamp,
          deviceId: event.deviceId,
          userAgent: event.userAgent,
        })),
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        onlyFamilyAccess,
        familyMembers,
      }

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to query family audit log', {
        familyId,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to retrieve audit log' })
    }
  }
)
