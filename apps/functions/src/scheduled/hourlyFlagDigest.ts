/**
 * Hourly Flag Digest Scheduled Function
 *
 * Story 41.2: Flag Notifications - AC2
 *
 * Runs every hour to process queued medium-severity flag notifications.
 * Batches flags into digest notifications for parents.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { processHourlyDigest } from '../lib/notifications/flagDigestService'

/**
 * Process hourly flag digest
 *
 * Runs every hour at minute 0 (e.g., 9:00, 10:00, 11:00)
 * Processes all pending hourly digest queue items and sends consolidated notifications.
 */
export const hourlyFlagDigest = onSchedule(
  {
    schedule: '0 * * * *', // Every hour at minute 0
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 300, // 5 minutes
  },
  async () => {
    logger.info('Starting hourly flag digest processing')

    try {
      const result = await processHourlyDigest()

      logger.info('Hourly flag digest completed', {
        usersProcessed: result.usersProcessed,
        totalFlagsProcessed: result.totalFlagsProcessed,
        successCount: result.successCount,
      })

      return
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Hourly flag digest failed', { error: errorMessage })
      throw error
    }
  }
)
