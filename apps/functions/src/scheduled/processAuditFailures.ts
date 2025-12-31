/**
 * Process Audit Failures Scheduled Function
 *
 * Story 27.1: Audit Event Capture - AC5
 *
 * Runs hourly to retry failed audit event writes from the dead-letter queue.
 * Ensures reliable audit capture even when initial writes fail.
 *
 * Schedule: Every hour at minute 15 (0:15, 1:15, etc.)
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { retryDeadLetterEntries, cleanupDeadLetterEntries } from '../services/audit'

/**
 * Maximum entries to process per run.
 * Keeps execution time reasonable.
 */
const MAX_ENTRIES_PER_RUN = 500

/**
 * Days to retain resolved/abandoned entries before cleanup.
 */
const CLEANUP_RETENTION_DAYS = 30

/**
 * Retry audit failures from dead-letter queue and cleanup old entries.
 *
 * Story 27.1: AC5 - Reliable writes with retry mechanism
 *
 * Schedule: Hourly at minute 15
 */
export const processAuditFailures = onSchedule(
  {
    schedule: '15 * * * *', // Every hour at minute 15
    timeZone: 'UTC',
    retryCount: 2,
    memory: '256MiB',
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()

    try {
      logger.info('Starting audit failures processing')

      // Retry pending failures
      const successCount = await retryDeadLetterEntries(MAX_ENTRIES_PER_RUN)

      // Cleanup old resolved/abandoned entries
      const cleanedCount = await cleanupDeadLetterEntries(
        CLEANUP_RETENTION_DAYS,
        MAX_ENTRIES_PER_RUN
      )

      logger.info('Audit failures processing completed', {
        successCount,
        cleanedCount,
        durationMs: Date.now() - startTime,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Audit failures processing failed', {
        error: errorMessage,
        durationMs: Date.now() - startTime,
      })
      throw error // Trigger retry
    }
  }
)
