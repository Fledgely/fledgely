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
  getChildAuditLog,
  generateCSVExport,
  generateTextExport,
  queryEventsForExport,
  getFamilyName,
  type AuditLogFilters,
  type ExportFilters,
  type ExportWatermark,
} from '../../services/audit'
import { createAuditEventNonBlocking } from '../../services/audit'
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

/**
 * Response from child audit log endpoint
 */
export interface ChildAuditLogResponse {
  events: Array<{
    id: string
    actorFamilyName: string
    actorType: string
    accessType: string
    resourceType: string
    resourceId: string | null
    timestamp: number
    friendlyMessage: string
    screenshotThumbnail?: {
      id: string
      timestamp: number
    }
  }>
  noRecentAccess: boolean
  lastAccessDate: number | null
}

/**
 * Child audit log HTTP endpoint
 *
 * Story 27.3: Child Audit Log View - AC1, AC2, AC3
 *
 * GET /childAuditLog?childId={childId}&familyId={familyId}&limit={n}
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Query Parameters:
 * - childId: required - Child whose audit log to retrieve
 * - familyId: required - Family ID for context
 * - limit: optional - Max records to return (default 20, max 50)
 *
 * Response:
 * - 200: Child-friendly audit log data
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 403: Not authorized (must be child or family guardian)
 * - 404: Child not found
 * - 500: Server error
 */
export const childAuditLog = onRequest(
  {
    cors: true,
    maxInstances: 10,
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
      logger.warn('Invalid auth token for child audit', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const requesterId = decodedToken.uid

    // 2. Validation (SECOND) - Validate request params
    const { childId, familyId, limit } = req.query

    if (!childId || typeof childId !== 'string') {
      res.status(400).json({ error: 'childId parameter required' })
      return
    }

    if (!familyId || typeof familyId !== 'string') {
      res.status(400).json({ error: 'familyId parameter required' })
      return
    }

    const queryLimit = Math.min(Math.max(parseInt(limit as string) || 20, 1), 50)

    const db = getFirestore()

    // 3. Permission (THIRD) - Verify user is the child or a family guardian
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      res.status(404).json({ error: 'Family not found' })
      return
    }

    const familyData = familyDoc.data()
    const guardianUids = familyData?.guardianUids || []
    const childUids = familyData?.childUids || []

    // Check if requester is the child themselves or a guardian
    const isChild = childUids.includes(requesterId)
    const isGuardian = guardianUids.includes(requesterId)

    if (!isChild && !isGuardian) {
      logger.warn('Unauthorized child audit log access attempt', {
        requesterId,
        childId,
        familyId,
      })
      res.status(403).json({ error: 'Not authorized to view this audit log' })
      return
    }

    // If requester is a child, they can only view their own audit log
    if (isChild && requesterId !== childId) {
      logger.warn('Child attempting to view another child audit log', {
        requesterId,
        childId,
        familyId,
      })
      res.status(403).json({ error: 'Not authorized to view this audit log' })
      return
    }

    // 4. Business logic (LAST) - Query and return child-friendly audit data
    try {
      const result = await getChildAuditLog(childId, familyId, queryLimit)

      const response: ChildAuditLogResponse = {
        events: result.events.map((event) => ({
          id: event.id,
          actorFamilyName: event.actorFamilyName,
          actorType: event.actorType,
          accessType: event.accessType,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          timestamp: event.timestamp,
          friendlyMessage: event.friendlyMessage,
          screenshotThumbnail: event.screenshotThumbnail,
        })),
        noRecentAccess: result.noRecentAccess,
        lastAccessDate: result.lastAccessDate,
      }

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to query child audit log', {
        childId,
        familyId,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to retrieve audit log' })
    }
  }
)

/**
 * Export audit log HTTP endpoint
 *
 * Story 27.5: Audit Log Search and Export - AC2, AC3, AC5, AC6
 *
 * GET /exportAuditLog?familyId={familyId}&format={csv|txt}&...filters
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Query Parameters:
 * - familyId: required - Family whose audit log to export
 * - format: required - Export format ('csv' or 'txt')
 * - startDate: optional - Filter start timestamp (epoch ms)
 * - endDate: optional - Filter end timestamp (epoch ms)
 * - actorUid: optional - Filter by specific family member
 * - resourceType: optional - Filter by resource type
 * - childId: optional - Filter by child
 *
 * Response:
 * - 200: File download with appropriate content-type
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 403: Not a guardian of this family
 * - 404: Family not found
 * - 500: Server error
 */
export const exportAuditLog = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 120,
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
      logger.warn('Invalid auth token for audit export', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const requesterId = decodedToken.uid
    const requesterEmail = decodedToken.email || 'unknown@email.com'

    // 2. Validation (SECOND) - Validate request params
    const { familyId, format, startDate, endDate, actorUid, resourceType, childId } = req.query

    if (!familyId || typeof familyId !== 'string') {
      res.status(400).json({ error: 'familyId parameter required' })
      return
    }

    if (!format || (format !== 'csv' && format !== 'txt')) {
      res.status(400).json({ error: 'format parameter required (csv or txt)' })
      return
    }

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
      logger.warn('Unauthorized audit export attempt', {
        requesterId,
        familyId,
      })
      res.status(403).json({ error: 'Not authorized to export this audit log' })
      return
    }

    // 4. Business logic (LAST) - Generate and return export
    try {
      // Build filters
      const filters: ExportFilters = {}

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

      if (actorUid && typeof actorUid === 'string') {
        filters.actorUid = actorUid
      }

      if (resourceType && typeof resourceType === 'string') {
        filters.resourceType = resourceType
      }

      if (childId && typeof childId === 'string') {
        filters.childId = childId
      }

      // Query events
      const events = await queryEventsForExport(familyId, filters)

      // Generate export ID
      const exportId = `exp_${Date.now()}_${requesterId.slice(0, 8)}`

      // Create watermark
      const watermark: ExportWatermark = {
        exportId,
        requestorUid: requesterId,
        requestorEmail: requesterEmail,
        exportTimestamp: Date.now(),
        familyId,
        eventCount: events.length,
      }

      // Generate export content
      let content: string
      let contentType: string
      let filename: string

      if (format === 'csv') {
        content = await generateCSVExport(events, watermark)
        contentType = 'text/csv'
        filename = `audit-log-${familyId}-${exportId}.csv`
      } else {
        const familyName = await getFamilyName(familyId)
        content = await generateTextExport(events, watermark, familyName)
        contentType = 'text/plain'
        filename = `audit-log-${familyId}-${exportId}.txt`
      }

      // Log the export event to audit trail (AC6)
      await createAuditEventNonBlocking({
        actorUid: requesterId,
        actorType: 'guardian',
        actorEmail: requesterEmail,
        accessType: 'export',
        resourceType: 'audit_export',
        resourceId: exportId,
        familyId,
        childId: filters.childId || null,
        deviceId: null,
        sessionId: null,
        userAgent: req.headers['user-agent'] || null,
        ipAddressHash: null,
        metadata: {
          format,
          eventCount: events.length,
          filters,
        },
      })

      logger.info('Audit log exported', {
        exportId,
        familyId,
        requesterId,
        format,
        eventCount: events.length,
      })

      // Send response with appropriate headers
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.status(200).send(content)
    } catch (error) {
      logger.error('Failed to export audit log', {
        familyId,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to export audit log' })
    }
  }
)
