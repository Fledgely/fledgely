/**
 * Data Export Created Trigger
 *
 * Story 51.1: Data Export Request - AC4
 *
 * Firestore trigger that fires when a new data export request is created.
 * Processes the export asynchronously and generates the ZIP archive.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import { DataExportStatus, DATA_EXPORT_CONFIG, type DataExportRequest } from '@fledgely/shared'
import {
  generateExportArchive,
  generateExportDownloadUrl,
  updateExportRequest,
} from '../services/gdpr'
import { sendDataExportReadyEmail } from '../lib/email/templates/dataExportReadyEmail'

/**
 * Firestore trigger for new data export request documents.
 *
 * Story 51.1: Data Export Request - AC4, AC5
 *
 * Triggers on: dataExports/{exportId}
 *
 * When a new export request is created:
 * 1. Updates status to 'processing'
 * 2. Collects all family data
 * 3. Generates ZIP archive with screenshots
 * 4. Uploads to Cloud Storage
 * 5. Generates signed download URL
 * 6. Sends notification email
 * 7. Updates status to 'completed' or 'failed'
 */
export const onDataExportCreated = onDocumentCreated(
  {
    document: 'dataExports/{exportId}',
    region: 'us-central1',
    memory: '1GiB', // Higher memory for ZIP generation
    timeoutSeconds: 540, // 9 minutes for large exports
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.warn('onDataExportCreated: No data in event')
      return
    }

    const { exportId } = event.params
    const data = snapshot.data() as DataExportRequest

    // Only process pending exports
    if (data.status !== DataExportStatus.PENDING) {
      logger.info('Export not in pending state, skipping', {
        exportId,
        status: data.status,
      })
      return
    }

    logger.info('Processing data export request', {
      exportId,
      familyId: data.familyId,
      requestedBy: data.requestedBy,
    })

    // Update status to processing
    try {
      await updateExportRequest(exportId, {
        status: DataExportStatus.PROCESSING,
        processingStartedAt: Date.now(),
      })
    } catch (error) {
      logger.error('Failed to update export status to processing', {
        exportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return
    }

    try {
      // Generate the export archive
      const { storagePath, fileSize } = await generateExportArchive(
        exportId,
        data.familyId,
        data.requestedBy,
        data.requestedByEmail
      )

      // Calculate expiry (7 days from now)
      const completedAt = Date.now()
      const expiresAt = completedAt + DATA_EXPORT_CONFIG.LINK_EXPIRY_MS

      // Generate signed download URL
      const downloadUrl = await generateExportDownloadUrl(storagePath, expiresAt)

      // Update export request with success
      await updateExportRequest(exportId, {
        status: DataExportStatus.COMPLETED,
        completedAt,
        downloadUrl,
        expiresAt,
        fileSize,
        errorMessage: null,
      })

      logger.info('Data export completed successfully', {
        exportId,
        familyId: data.familyId,
        fileSize,
        expiresAt: new Date(expiresAt).toISOString(),
      })

      // Send notification email (AC5)
      try {
        await sendDataExportReadyEmail({
          to: data.requestedByEmail,
          downloadUrl,
          fileSize,
          expiresAt,
        })

        logger.info('Export ready email sent', {
          exportId,
          recipientUid: data.requestedBy,
        })
      } catch (emailError) {
        // Log but don't fail the export if email fails
        // SECURITY: Do not log email addresses (PII)
        logger.error('Failed to send export ready email', {
          exportId,
          recipientUid: data.requestedBy,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Data export processing failed', {
        exportId,
        familyId: data.familyId,
        error: errorMessage,
      })

      // Update export request with failure
      await updateExportRequest(exportId, {
        status: DataExportStatus.FAILED,
        completedAt: Date.now(),
        errorMessage: `Export failed: ${errorMessage}`,
      })
    }
  }
)
