/**
 * Get Abuse Reports - Admin Callable
 *
 * Story 51.5: Abuse Reporting - AC5, AC7, AC8
 *
 * Admin-only callable to retrieve abuse reports for triage dashboard.
 *
 * Requirements:
 * - AC5: 72-hour review timeline
 * - AC7: Secure logging (admin only access)
 * - AC8: Investigation process with status tracking
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  AbuseReportSchema,
  AbuseReportStatus,
  ABUSE_REPORT_CONFIG,
  hoursUntilSLADeadline,
  type AbuseReport,
  type AbuseReportStatusValue,
  type AbuseReportTypeValue,
} from '@fledgely/shared'

export interface GetAbuseReportsInput {
  status?: 'all' | AbuseReportStatusValue
  type?: AbuseReportTypeValue
  limit?: number
  startAfter?: string
}

export interface AbuseReportSummary {
  reportId: string
  type: AbuseReportTypeValue
  descriptionPreview: string
  status: AbuseReportStatusValue
  isAnonymous: boolean
  reporterEmail: string | null
  submittedAt: number
  hoursUntilSLA: number
  isPastSLA: boolean
  referenceNumber: string | null
}

export interface GetAbuseReportsResponse {
  reports: AbuseReportSummary[]
  hasMore: boolean
  nextCursor: string | null
}

/**
 * Check if user has admin/safety-team role.
 */
async function isAdmin(uid: string): Promise<boolean> {
  const db = getFirestore()
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) return false

  const userData = userDoc.data()
  const role = userData?.role

  return role === 'admin' || role === 'safety-team'
}

export const getAbuseReports = onCall<GetAbuseReportsInput, Promise<GetAbuseReportsResponse>>(
  { maxInstances: 10 },
  async (request: CallableRequest<GetAbuseReportsInput>): Promise<GetAbuseReportsResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid

    // Check admin access
    const hasAccess = await isAdmin(uid)
    if (!hasAccess) {
      logger.warn('Unauthorized access attempt to abuse reports', { uid })
      throw new HttpsError('permission-denied', 'Access denied')
    }

    const { status = 'all', type, limit = 20, startAfter } = request.data || {}
    const db = getFirestore()

    // Build query
    let query = db.collection(ABUSE_REPORT_CONFIG.COLLECTION_NAME).orderBy('submittedAt', 'desc')

    // Filter by status
    if (status !== 'all') {
      query = query.where('status', '==', status)
    }

    // Filter by type
    if (type) {
      query = query.where('type', '==', type)
    }

    // Pagination
    if (startAfter) {
      const startAfterDoc = await db
        .collection(ABUSE_REPORT_CONFIG.COLLECTION_NAME)
        .doc(startAfter)
        .get()
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc)
      }
    }

    // Execute query
    const snapshot = await query.limit(limit + 1).get()
    const hasMore = snapshot.docs.length > limit
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs

    const reports: AbuseReportSummary[] = []

    for (const doc of docs) {
      const data = doc.data()
      const validation = AbuseReportSchema.safeParse(data)

      if (!validation.success) {
        logger.warn('Invalid abuse report document', {
          reportId: doc.id,
          errors: validation.error.errors,
        })
        continue
      }

      const report: AbuseReport = validation.data
      const hoursRemaining = hoursUntilSLADeadline(report.submittedAt)

      reports.push({
        reportId: report.reportId,
        type: report.type,
        descriptionPreview:
          report.description.length > 150
            ? report.description.substring(0, 150) + '...'
            : report.description,
        status: report.status,
        isAnonymous: report.isAnonymous,
        reporterEmail: report.reporterEmail,
        submittedAt: report.submittedAt,
        hoursUntilSLA: hoursRemaining,
        isPastSLA: report.status === AbuseReportStatus.SUBMITTED && hoursRemaining < 0,
        referenceNumber: report.referenceNumber,
      })
    }

    logger.info('Admin retrieved abuse reports', {
      adminUid: uid,
      count: reports.length,
      status,
      type,
    })

    return {
      reports,
      hasMore,
      nextCursor: hasMore ? docs[docs.length - 1].id : null,
    }
  }
)
