/**
 * Execute Account Deletions Scheduled Function - Story 51.4
 *
 * Runs hourly to process account deletions that have passed cooling off.
 *
 * Process:
 * 1. Find deletions where cooling off has ended
 * 2. Update status to 'processing'
 * 3. Execute full deletion (data + accounts)
 * 4. Send completion email
 * 5. Update final status
 *
 * Follows patterns from executeDataDeletions.ts
 */

import * as logger from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import {
  findAccountDeletionsReadyForProcessing,
  executeAccountDeletion,
  updateAccountDeletionRequest,
} from '../services/gdpr/accountDeletionService'
import { AccountDeletionStatus } from '@fledgely/shared'
import { sendAccountDeletionCompleteEmail } from '../lib/email/templates/accountDeletionCompleteEmail'

/**
 * Scheduled function to execute account deletions.
 *
 * Runs every hour to check for deletions that have passed cooling off.
 */
export const executeAccountDeletions = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    retryCount: 3,
    maxRetrySeconds: 60,
  },
  async () => {
    logger.info('Starting scheduled account deletion processing')

    let processedCount = 0
    let successCount = 0
    let failedCount = 0

    try {
      // Find deletions ready for processing
      const deletions = await findAccountDeletionsReadyForProcessing()

      logger.info(`Found ${deletions.length} account deletions ready for processing`)

      for (const deletion of deletions) {
        processedCount++
        const { deletionId, familyId, requestedByEmail } = deletion

        try {
          // Update status to processing
          await updateAccountDeletionRequest(deletionId, {
            status: AccountDeletionStatus.PROCESSING,
            processingStartedAt: Date.now(),
          })

          logger.info('Processing account deletion', { deletionId, familyId })

          // Execute the deletion
          const result = await executeAccountDeletion(deletion)

          if (result.errors.length === 0) {
            // Success - update status
            await updateAccountDeletionRequest(deletionId, {
              status: AccountDeletionStatus.COMPLETED,
              completedAt: Date.now(),
              processedAt: Date.now(),
              deletedAccounts: result.accountsDeleted,
            })

            // Send completion email
            try {
              await sendAccountDeletionCompleteEmail({
                to: requestedByEmail,
                deletionId,
              })
            } catch (emailError) {
              logger.error('Failed to send account deletion complete email', {
                deletionId,
                error: emailError instanceof Error ? emailError.message : 'Unknown',
              })
            }

            successCount++
            logger.info('Account deletion completed successfully', {
              deletionId,
              familyId,
              accountsDeleted: result.accountsDeleted.length,
            })
          } else {
            // Partial or full failure
            await updateAccountDeletionRequest(deletionId, {
              status: AccountDeletionStatus.FAILED,
              processedAt: Date.now(),
              errorMessage: result.errors.join('; '),
              deletedAccounts: result.accountsDeleted,
              failedAccounts: result.accountsFailed,
            })

            failedCount++
            logger.error('Account deletion failed', {
              deletionId,
              familyId,
              errors: result.errors,
            })
          }
        } catch (error) {
          // Unexpected error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          await updateAccountDeletionRequest(deletionId, {
            status: AccountDeletionStatus.FAILED,
            processedAt: Date.now(),
            errorMessage,
          })

          failedCount++
          logger.error('Account deletion threw exception', {
            deletionId,
            familyId,
            error: errorMessage,
          })
        }
      }
    } catch (error) {
      logger.error('Account deletion scheduler failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    logger.info('Scheduled account deletion processing complete', {
      processedCount,
      successCount,
      failedCount,
    })
  }
)
