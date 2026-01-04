/**
 * Scheduled Export Cleanup Function
 *
 * Story 51.1: Data Export Request - AC6
 *
 * Runs daily to:
 * - Update status to 'expired' for exports past their expiry date
 * - Delete ZIP files from Cloud Storage
 * - Keep Firestore metadata for audit purposes
 *
 * Key Design Decisions:
 * 1. Preserve Metadata: Keep Firestore documents for audit trail
 * 2. Delete Storage: Remove ZIP files to free storage space
 * 3. Batch Processing: Process in batches to avoid timeout
 * 4. Idempotent: Safe to run multiple times
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { DataExportStatus, DATA_EXPORT_CONFIG } from '@fledgely/shared'
import { findExpiredExports, updateExportRequest, deleteExportFile } from '../services/gdpr'

/**
 * Maximum number of exports to process in a single run.
 */
const MAX_EXPORTS = 100

/**
 * Scheduled function to cleanup expired data exports.
 *
 * Story 51.1 AC6: Link expires after 7 days
 *
 * Runs daily at 4 AM UTC to:
 * - Find completed exports where expiresAt < now
 * - Update status to 'expired'
 * - Delete the ZIP file from Cloud Storage
 */
export const cleanupExpiredExports = onSchedule(
  {
    schedule: '0 4 * * *', // Daily at 4 AM UTC (1 hour after screenshot cleanup)
    timeZone: 'UTC',
    retryCount: 3,
    memory: '256MiB',
    timeoutSeconds: 300, // 5 minutes
  },
  async (_event) => {
    const startTime = Date.now()
    let totalCleaned = 0
    let totalFailed = 0

    logger.info('Export cleanup started')

    try {
      // Find expired exports
      const expiredExports = await findExpiredExports()

      if (expiredExports.length === 0) {
        logger.info('No expired exports to process')
        return
      }

      logger.info('Found expired exports to process', { count: expiredExports.length })

      // Process each expired export
      for (const exportRequest of expiredExports.slice(0, MAX_EXPORTS)) {
        try {
          // Delete the ZIP file from Cloud Storage
          const storagePath = `${DATA_EXPORT_CONFIG.STORAGE_PATH_PREFIX}/${exportRequest.familyId}/${exportRequest.exportId}.zip`
          await deleteExportFile(storagePath)

          // Update status to expired (keep metadata for audit)
          await updateExportRequest(exportRequest.exportId, {
            status: DataExportStatus.EXPIRED,
            downloadUrl: null, // Clear the download URL
          })

          logger.info('Export cleaned up', {
            exportId: exportRequest.exportId,
            familyId: exportRequest.familyId,
            originalExpiresAt: exportRequest.expiresAt
              ? new Date(exportRequest.expiresAt).toISOString()
              : 'unknown',
          })

          totalCleaned++
        } catch (error) {
          logger.error('Failed to cleanup export', {
            exportId: exportRequest.exportId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          totalFailed++
        }
      }

      const durationMs = Date.now() - startTime

      logger.info('Export cleanup completed', {
        totalCleaned,
        totalFailed,
        durationMs,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime

      logger.error('Export cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalCleaned,
        totalFailed,
        durationMs,
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
