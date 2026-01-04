/**
 * Get Breach Incidents - Admin Callable
 *
 * Story 51.6: Breach Notification - AC5
 *
 * Admin-only callable to retrieve breach incidents.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore, Query, DocumentData } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  BreachIncidentSchema,
  BREACH_NOTIFICATION_CONFIG,
  hoursUntilNotificationDeadline,
  isDeadlineApproaching,
  isDeadlinePassed,
  type BreachIncidentStatusValue,
  type BreachSeverityValue,
  type AffectedDataTypeValue,
} from '@fledgely/shared'

interface BreachIncidentSummary {
  incidentId: string
  title: string
  severity: BreachSeverityValue
  status: BreachIncidentStatusValue
  affectedDataTypes: AffectedDataTypeValue[]
  affectedUserCount: number
  detectedAt: number
  hoursUntilDeadline: number
  isDeadlineApproaching: boolean
  isDeadlinePassed: boolean
  regulatorNotifiedAt: number | null
  userNotificationsSentAt: number | null
}

interface GetBreachIncidentsInput {
  status?: 'all' | BreachIncidentStatusValue
  limit?: number
  startAfter?: string
}

interface GetBreachIncidentsResponse {
  incidents: BreachIncidentSummary[]
  hasMore: boolean
  nextCursor: string | null
}

/**
 * Check if user has admin role.
 */
async function isAdmin(uid: string): Promise<boolean> {
  const db = getFirestore()
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) return false

  const userData = userDoc.data()
  const role = userData?.role

  return role === 'admin'
}

export const getBreachIncidents = onCall<
  GetBreachIncidentsInput,
  Promise<GetBreachIncidentsResponse>
>(
  { maxInstances: 10 },
  async (
    request: CallableRequest<GetBreachIncidentsInput>
  ): Promise<GetBreachIncidentsResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid

    // Check admin access
    const hasAccess = await isAdmin(uid)
    if (!hasAccess) {
      logger.warn('Unauthorized access to breach incidents', { uid })
      throw new HttpsError('permission-denied', 'Admin access required')
    }

    const { status = 'all', limit = 20, startAfter } = request.data || {}
    const db = getFirestore()

    try {
      let query: Query<DocumentData> = db
        .collection(BREACH_NOTIFICATION_CONFIG.INCIDENTS_COLLECTION)
        .orderBy('detectedAt', 'desc')

      // Apply status filter
      if (status !== 'all') {
        query = query.where('status', '==', status)
      }

      // Apply pagination
      if (startAfter) {
        const startDoc = await db
          .collection(BREACH_NOTIFICATION_CONFIG.INCIDENTS_COLLECTION)
          .doc(startAfter)
          .get()
        if (startDoc.exists) {
          query = query.startAfter(startDoc)
        }
      }

      // Limit + 1 to check for more
      query = query.limit(limit + 1)

      const snapshot = await query.get()
      const hasMore = snapshot.docs.length > limit
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs

      const incidents: BreachIncidentSummary[] = []

      for (const doc of docs) {
        const validation = BreachIncidentSchema.safeParse(doc.data())
        if (!validation.success) {
          logger.warn('Invalid breach incident data', { docId: doc.id })
          continue
        }

        const incident = validation.data

        incidents.push({
          incidentId: incident.incidentId,
          title: incident.title,
          severity: incident.severity,
          status: incident.status,
          affectedDataTypes: incident.affectedDataTypes,
          affectedUserCount: incident.affectedUserCount,
          detectedAt: incident.detectedAt,
          hoursUntilDeadline: hoursUntilNotificationDeadline(incident.detectedAt),
          isDeadlineApproaching: isDeadlineApproaching(incident.detectedAt),
          isDeadlinePassed: isDeadlinePassed(incident.detectedAt),
          regulatorNotifiedAt: incident.regulatorNotifiedAt,
          userNotificationsSentAt: incident.userNotificationsSentAt,
        })
      }

      const nextCursor = docs.length > 0 ? docs[docs.length - 1].id : null

      return { incidents, hasMore, nextCursor }
    } catch (error) {
      logger.error('Failed to get breach incidents', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to get incidents')
    }
  }
)
