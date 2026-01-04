/**
 * Scheduled Data Deletion Processing Function
 *
 * Story 51.2: Data Deletion Request - AC6
 *
 * Runs hourly to:
 * - Find deletions where cooling off period has ended
 * - Execute permanent deletion of all family data
 * - Send confirmation email
 * - Update deletion status
 *
 * Key Design Decisions:
 * 1. Hourly execution for timely processing
 * 2. Process in batches to avoid timeout
 * 3. Continue processing even if one deletion fails
 * 4. Send email notification on completion (AC7)
 * 5. Idempotent: Safe to run multiple times
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { DataDeletionStatus } from '@fledgely/shared'
import {
  findDeletionsReadyForProcessing,
  updateDeletionRequest,
  executeFamilyDeletion,
} from '../services/gdpr'
import { sendDeletionCompleteEmail } from '../lib/email/templates/dataDeletionCompleteEmail'

/**
 * Scheduled function to execute data deletions after cooling off.
 *
 * Story 51.2 AC6: Automatic deletion after 14-day cooling off
 * Story 51.2 AC7: Confirmation email when deletion complete
 *
 * Runs every hour to:
 * - Find deletions past cooling off period
 * - Update status to 'processing'
 * - Execute permanent deletion
 * - Update status to 'completed' or 'failed'
 * - Send confirmation email
 */
export const executeDataDeletions = onSchedule(
  {
    schedule: '0 * * * *', // Every hour at minute 0
    timeZone: 'UTC',
    retryCount: 3,
    memory: '512MiB', // Higher memory for deletion operations
    timeoutSeconds: 540, // 9 minutes for large deletions
  },
  async (_event) => {
    const startTime = Date.now()
    let totalProcessed = 0
    let totalSucceeded = 0
    let totalFailed = 0

    logger.info('Data deletion processing started')

    try {
      // Find deletions ready for processing
      const readyDeletions = await findDeletionsReadyForProcessing()

      if (readyDeletions.length === 0) {
        logger.info('No deletions ready for processing')
        return
      }

      logger.info('Found deletions ready for processing', { count: readyDeletions.length })

      // Process each deletion
      for (const deletion of readyDeletions) {
        totalProcessed++
        const { deletionId, familyId, requestedByEmail } = deletion

        logger.info('Processing deletion', { deletionId, familyId })

        try {
          // Update status to processing
          await updateDeletionRequest(deletionId, {
            status: DataDeletionStatus.PROCESSING,
            processingStartedAt: Date.now(),
          })

          // Execute the deletion
          const result = await executeFamilyDeletion(familyId)
          result.deletionId = deletionId

          // Check if deletion had errors
          if (result.errors.length > 0) {
            logger.warn('Deletion completed with errors', {
              deletionId,
              familyId,
              errorCount: result.errors.length,
              errors: result.errors.slice(0, 5), // Log first 5 errors
            })
          }

          // Update status to completed
          await updateDeletionRequest(deletionId, {
            status: DataDeletionStatus.COMPLETED,
            completedAt: Date.now(),
            processedAt: Date.now(),
            errorMessage:
              result.errors.length > 0 ? `Completed with ${result.errors.length} errors` : null,
          })

          logger.info('Deletion completed', {
            deletionId,
            familyId,
            recordsDeleted: result.recordsDeleted,
            storageDeleted: result.storageDeleted,
          })

          // Send confirmation email (AC7)
          try {
            await sendDeletionCompleteEmail({
              to: requestedByEmail,
              familyId,
              deletionId,
              completedAt: Date.now(),
            })

            logger.info('Deletion complete email sent', {
              deletionId,
              familyId,
            })
          } catch (emailError) {
            // Log but don't fail the deletion if email fails
            // SECURITY: Do not log email addresses (PII)
            logger.error('Failed to send deletion complete email', {
              deletionId,
              familyId,
              error: emailError instanceof Error ? emailError.message : 'Unknown error',
            })
          }

          totalSucceeded++
        } catch (error) {
          totalFailed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          logger.error('Deletion processing failed', {
            deletionId,
            familyId,
            error: errorMessage,
          })

          // Update status to failed
          try {
            await updateDeletionRequest(deletionId, {
              status: DataDeletionStatus.FAILED,
              completedAt: Date.now(),
              processedAt: Date.now(),
              errorMessage: `Deletion failed: ${errorMessage}`,
            })
          } catch (updateError) {
            logger.error('Failed to update deletion status to failed', {
              deletionId,
              error: updateError instanceof Error ? updateError.message : 'Unknown error',
            })
          }
        }
      }

      const durationMs = Date.now() - startTime

      logger.info('Data deletion processing completed', {
        totalProcessed,
        totalSucceeded,
        totalFailed,
        durationMs,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime

      logger.error('Data deletion processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalProcessed,
        totalSucceeded,
        totalFailed,
        durationMs,
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
