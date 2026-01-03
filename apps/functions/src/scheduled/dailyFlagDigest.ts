/**
 * Daily Flag Digest Scheduled Function
 *
 * Story 41.2: Flag Notifications - AC3
 *
 * Runs daily to process queued low-severity flag notifications.
 * Also catches any unprocessed hourly items as a fallback.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { processDailyDigest } from '../lib/notifications/flagDigestService'

/**
 * Process daily flag digest
 *
 * Runs daily at 8:00 PM UTC (adjust based on user timezone preferences)
 * Processes all pending daily digest queue items and sends consolidated notifications.
 * Also includes any unprocessed hourly items as a fallback.
 */
export const dailyFlagDigest = onSchedule(
  {
    schedule: '0 20 * * *', // Every day at 8:00 PM UTC
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 540, // 9 minutes
  },
  async () => {
    logger.info('Starting daily flag digest processing')

    try {
      const result = await processDailyDigest()

      logger.info('Daily flag digest completed', {
        usersProcessed: result.usersProcessed,
        totalFlagsProcessed: result.totalFlagsProcessed,
        successCount: result.successCount,
      })

      return
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Daily flag digest failed', { error: errorMessage })
      throw error
    }
  }
)
