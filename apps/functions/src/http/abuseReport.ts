/**
 * Abuse Report HTTP Handlers - Story 51.5
 *
 * Public endpoint for submitting abuse reports.
 * No authentication required (AC1).
 *
 * Features:
 * - Anonymous reporting option
 * - Reference number for tracking
 * - Secure storage with admin-only access
 */

import * as logger from 'firebase-functions/logger'
import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import {
  AbuseReportSubmissionSchema,
  AbuseReportStatus,
  ABUSE_REPORT_CONFIG,
  generateReferenceNumber,
  type AbuseReport,
  type SubmitAbuseReportResponse,
} from '@fledgely/shared'
import { sendAbuseReportConfirmationEmail } from '../lib/email/templates/abuseReportConfirmationEmail'

// ============================================================================
// SUBMIT ABUSE REPORT (PUBLIC)
// ============================================================================

/**
 * Public endpoint for submitting abuse reports.
 * No authentication required.
 */
export const submitAbuseReport = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    try {
      // Validate input
      const validation = AbuseReportSubmissionSchema.safeParse(req.body)
      if (!validation.success) {
        logger.warn('Invalid abuse report submission', {
          errors: validation.error.errors,
        })
        res.status(400).json({
          success: false,
          message: 'Invalid report data',
          errors: validation.error.errors,
        })
        return
      }

      const input = validation.data

      // Validate non-anonymous reports have email
      if (!input.isAnonymous && !input.reporterEmail) {
        res.status(400).json({
          success: false,
          message: 'Email is required for non-anonymous reports',
        })
        return
      }

      // Generate report ID and reference number
      const now = Date.now()
      const reportId = `abuse_${now}_${Math.random().toString(36).substring(2, 8)}`
      const referenceNumber = input.isAnonymous ? null : generateReferenceNumber()

      // Hash IP address for spam prevention (don't store raw IP)
      const ipHash = createHash('sha256')
        .update(req.ip || 'unknown')
        .digest('hex')
        .substring(0, 16)

      // Create report document
      const report: AbuseReport = {
        reportId,
        type: input.type,
        description: input.description,
        evidenceUrls: input.evidenceUrls || [],
        isAnonymous: input.isAnonymous,
        reporterEmail: input.isAnonymous ? null : input.reporterEmail || null,
        reporterName: input.isAnonymous ? null : input.reporterName || null,
        wantsFollowUp: input.wantsFollowUp,
        status: AbuseReportStatus.SUBMITTED,
        submittedAt: now,
        ipHash,
        userAgent: req.headers['user-agent'] || undefined,
        referenceNumber,
        triagedAt: null,
        triagedBy: null,
        triageNotes: null,
        resolvedAt: null,
        resolvedBy: null,
        resolution: null,
        actionsTaken: [],
        reporterNotified: false,
      }

      // Store in Firestore
      const db = getFirestore()
      await db.collection(ABUSE_REPORT_CONFIG.COLLECTION_NAME).doc(reportId).set(report)

      logger.info('Abuse report submitted', {
        reportId,
        type: input.type,
        isAnonymous: input.isAnonymous,
        hasReferenceNumber: !!referenceNumber,
      })

      // Send confirmation email if not anonymous and email provided
      if (!input.isAnonymous && input.reporterEmail) {
        try {
          await sendAbuseReportConfirmationEmail({
            to: input.reporterEmail,
            referenceNumber: referenceNumber!,
            reportType: input.type,
          })
        } catch (emailError) {
          logger.error('Failed to send abuse report confirmation email', {
            reportId,
            error: emailError instanceof Error ? emailError.message : 'Unknown',
          })
          // Continue - email failure shouldn't fail the report submission
        }
      }

      const response: SubmitAbuseReportResponse = {
        success: true,
        message: input.isAnonymous
          ? 'Thank you for your report. It will be reviewed within 72 hours.'
          : `Thank you for your report. Your reference number is ${referenceNumber}. We will review it within 72 hours.`,
        referenceNumber: referenceNumber || undefined,
      }

      res.status(201).json(response)
    } catch (error) {
      logger.error('Error submitting abuse report', {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({
        success: false,
        message: 'Failed to submit report. Please try again later.',
      })
    }
  }
)
