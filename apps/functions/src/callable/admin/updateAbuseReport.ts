/**
 * Update Abuse Report - Admin Callable
 *
 * Story 51.5: Abuse Reporting - AC5, AC6, AC8
 *
 * Admin-only callable to update abuse report status and resolution.
 *
 * Requirements:
 * - AC5: 72-hour review timeline
 * - AC6: Follow-up option (notify reporter)
 * - AC8: Investigation process with actions recorded
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  AbuseReportSchema,
  AbuseReportStatus,
  UpdateAbuseReportInputSchema,
  ABUSE_REPORT_CONFIG,
  type AbuseReport,
  type UpdateAbuseReportInput,
} from '@fledgely/shared'
import { sendAbuseReportUpdateEmail } from '../../lib/email/templates/abuseReportUpdateEmail'

export interface UpdateAbuseReportResponse {
  success: boolean
  message: string
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

export const updateAbuseReport = onCall<UpdateAbuseReportInput, Promise<UpdateAbuseReportResponse>>(
  { maxInstances: 10 },
  async (request: CallableRequest<UpdateAbuseReportInput>): Promise<UpdateAbuseReportResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid

    // Check admin access
    const hasAccess = await isAdmin(uid)
    if (!hasAccess) {
      logger.warn('Unauthorized update attempt on abuse report', { uid })
      throw new HttpsError('permission-denied', 'Access denied')
    }

    // Validate input
    const validation = UpdateAbuseReportInputSchema.safeParse(request.data)
    if (!validation.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', validation.error.errors)
    }

    const input = validation.data
    const db = getFirestore()

    // Get existing report
    const reportRef = db.collection(ABUSE_REPORT_CONFIG.COLLECTION_NAME).doc(input.reportId)
    const reportDoc = await reportRef.get()

    if (!reportDoc.exists) {
      throw new HttpsError('not-found', 'Report not found')
    }

    const reportValidation = AbuseReportSchema.safeParse(reportDoc.data())
    if (!reportValidation.success) {
      throw new HttpsError('internal', 'Invalid report data')
    }

    const existingReport: AbuseReport = reportValidation.data
    const now = Date.now()

    // Build update object
    const updates: Partial<AbuseReport> = {
      status: input.status,
    }

    // Handle status transitions
    if (
      input.status === AbuseReportStatus.TRIAGING &&
      existingReport.status === AbuseReportStatus.SUBMITTED
    ) {
      updates.triagedAt = now
      updates.triagedBy = uid
      if (input.notes) {
        updates.triageNotes = input.notes
      }
    }

    if (
      input.status === AbuseReportStatus.RESOLVED ||
      input.status === AbuseReportStatus.DISMISSED
    ) {
      updates.resolvedAt = now
      updates.resolvedBy = uid
      if (input.resolution) {
        updates.resolution = input.resolution
      }
      if (input.actionsTaken && input.actionsTaken.length > 0) {
        updates.actionsTaken = input.actionsTaken
      }
    }

    // Update the report
    await reportRef.update(updates)

    logger.info('Admin updated abuse report', {
      adminUid: uid,
      reportId: input.reportId,
      oldStatus: existingReport.status,
      newStatus: input.status,
    })

    // Send update email if requested and reporter wants follow-up (AC6)
    if (
      input.notifyReporter &&
      !existingReport.isAnonymous &&
      existingReport.reporterEmail &&
      existingReport.wantsFollowUp &&
      existingReport.referenceNumber
    ) {
      try {
        await sendAbuseReportUpdateEmail({
          to: existingReport.reporterEmail,
          referenceNumber: existingReport.referenceNumber,
          status: input.status,
          updateMessage: input.resolution,
        })

        // Mark reporter as notified
        await reportRef.update({ reporterNotified: true })

        logger.info('Sent abuse report update email', {
          reportId: input.reportId,
          to: existingReport.reporterEmail,
        })
      } catch (emailError) {
        logger.error('Failed to send abuse report update email', {
          reportId: input.reportId,
          error: emailError instanceof Error ? emailError.message : 'Unknown',
        })
        // Don't fail the update if email fails
      }
    }

    return {
      success: true,
      message: 'Report updated successfully',
    }
  }
)
