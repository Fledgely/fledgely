/**
 * Screenshot Audit Log HTTP Endpoint
 * Story 18.7: Screenshot Access Audit Log
 *
 * Provides query endpoints to retrieve and display screenshot view audit data.
 * Supports both summary (aggregated by viewer/date) and detailed views.
 *
 * Key Features:
 * - Family membership verification for access
 * - Summary aggregation by viewer and date
 * - Detailed view with individual access times
 * - Pagination support
 *
 * Follows Cloud Functions Template pattern:
 * 1. Auth (FIRST) - validate Firebase Auth token
 * 2. Validation (SECOND) - validate request params
 * 3. Permission (THIRD) - verify family membership
 * 4. Business logic (LAST) - query and return audit data
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'

/**
 * Audit record from screenshotViews collection
 */
export interface AuditRecord {
  viewId: string
  viewerId: string
  viewerEmail: string | null
  screenshotId: string
  childId: string
  timestamp: number
}

/**
 * Summary of views by a single viewer
 */
export interface ViewerSummary {
  viewerId: string
  viewerEmail: string | null
  totalViews: number
  viewsByDate: Array<{ date: string; count: number }>
}

/**
 * Response from audit log endpoint
 */
export interface AuditLogResponse {
  mode: 'summary' | 'detail'
  childId: string
  summary?: ViewerSummary[]
  records?: AuditRecord[]
  hasMore: boolean
  nextCursor?: string
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
 * Convert timestamp to date string (YYYY-MM-DD)
 */
function timestampToDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0]
}

/**
 * Screenshot audit log HTTP endpoint
 *
 * GET /auditLog?childId={childId}&mode={summary|detail}&limit={n}&startAfter={cursor}
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Query Parameters:
 * - childId: required - Child whose audit log to retrieve
 * - mode: optional - 'summary' (default) or 'detail'
 * - limit: optional - Max records to return (default 100, max 500)
 * - startAfter: optional - Cursor for pagination (viewId)
 * - startDate: optional - Filter start timestamp
 * - endDate: optional - Filter end timestamp
 *
 * Response:
 * - 200: Audit log data
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 403: Not authorized to view this child's audit log
 * - 404: Child not found
 * - 500: Server error
 */
export const auditLog = onRequest(
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
    const { childId, mode, limit, startAfter, startDate, endDate } = req.query

    if (!childId || typeof childId !== 'string') {
      res.status(400).json({ error: 'childId parameter required' })
      return
    }

    const queryMode = mode === 'detail' ? 'detail' : 'summary'
    const queryLimit = Math.min(Math.max(parseInt(limit as string) || 100, 1), 500)

    const db = getFirestore()

    // 3. Permission (THIRD) - Verify user is family member
    // First, get the child document to find familyId
    const childRef = db.collection('children').doc(childId)
    const childDoc = await childRef.get()

    if (!childDoc.exists) {
      res.status(404).json({ error: 'Child not found' })
      return
    }

    const childData = childDoc.data()
    const familyId = childData?.familyId

    if (!familyId) {
      res.status(500).json({ error: 'Child has no family association' })
      return
    }

    // Check if user is a member of this family
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      res.status(404).json({ error: 'Family not found' })
      return
    }

    const familyData = familyDoc.data()
    const memberIds = familyData?.memberIds || []

    if (!memberIds.includes(requesterId)) {
      logger.warn('Unauthorized audit log access attempt', {
        requesterId,
        childId,
      })
      res.status(403).json({ error: "Not authorized to view this child's audit log" })
      return
    }

    // 4. Business logic (LAST) - Query and return audit data

    try {
      // Build query for screenshotViews
      let query = childRef.collection('screenshotViews').orderBy('timestamp', 'desc')

      // Apply date filters if provided
      if (endDate && typeof endDate === 'string') {
        const endTs = parseInt(endDate)
        if (!isNaN(endTs)) {
          query = query.where('timestamp', '<=', endTs)
        }
      }
      if (startDate && typeof startDate === 'string') {
        const startTs = parseInt(startDate)
        if (!isNaN(startTs)) {
          query = query.where('timestamp', '>=', startTs)
        }
      }

      // Apply pagination cursor
      if (startAfter && typeof startAfter === 'string') {
        const cursorDoc = await childRef.collection('screenshotViews').doc(startAfter).get()
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc)
        }
      }

      // Limit query
      query = query.limit(queryLimit + 1) // +1 to check if there are more

      const snapshot = await query.get()

      // Check if there are more results
      const hasMore = snapshot.docs.length > queryLimit
      const docs = hasMore ? snapshot.docs.slice(0, queryLimit) : snapshot.docs

      // Map to audit records
      const records: AuditRecord[] = docs.map((doc) => {
        const data = doc.data()
        return {
          viewId: doc.id,
          viewerId: data.viewerId,
          viewerEmail: data.viewerEmail || null,
          screenshotId: data.screenshotId,
          childId: data.childId,
          timestamp: data.timestamp,
        }
      })

      if (queryMode === 'detail') {
        // Return detailed records
        const response: AuditLogResponse = {
          mode: 'detail',
          childId,
          records,
          hasMore,
          nextCursor: hasMore && docs.length > 0 ? docs[docs.length - 1].id : undefined,
        }
        res.status(200).json(response)
        return
      }

      // Summary mode - aggregate by viewer and date
      const viewerMap = new Map<
        string,
        {
          viewerId: string
          viewerEmail: string | null
          dateMap: Map<string, number>
        }
      >()

      for (const record of records) {
        let viewer = viewerMap.get(record.viewerId)
        if (!viewer) {
          viewer = {
            viewerId: record.viewerId,
            viewerEmail: record.viewerEmail,
            dateMap: new Map(),
          }
          viewerMap.set(record.viewerId, viewer)
        }

        const dateStr = timestampToDateString(record.timestamp)
        viewer.dateMap.set(dateStr, (viewer.dateMap.get(dateStr) || 0) + 1)
      }

      // Convert to summary format
      const summary: ViewerSummary[] = Array.from(viewerMap.values()).map((viewer) => {
        const viewsByDate = Array.from(viewer.dateMap.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => b.date.localeCompare(a.date)) // Most recent first

        return {
          viewerId: viewer.viewerId,
          viewerEmail: viewer.viewerEmail,
          totalViews: viewsByDate.reduce((sum, d) => sum + d.count, 0),
          viewsByDate,
        }
      })

      // Sort by total views descending
      summary.sort((a, b) => b.totalViews - a.totalViews)

      const response: AuditLogResponse = {
        mode: 'summary',
        childId,
        summary,
        hasMore,
        nextCursor: hasMore && docs.length > 0 ? docs[docs.length - 1].id : undefined,
      }

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to query audit log', {
        childId,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to retrieve audit log' })
    }
  }
)
