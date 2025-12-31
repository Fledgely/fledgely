/**
 * Send Check-In Reminders Scheduled Function
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC6
 *
 * Runs daily to send reminders for check-ins that haven't been completed
 * within 3 days of the initial prompt.
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { getPendingCheckInsNeedingReminder, markReminderSent } from '../services/health'

/**
 * Daily scheduled function to send check-in reminders.
 *
 * Runs at 10 AM UTC daily (1 hour after generation) to send reminders.
 */
export const sendCheckInReminders = onSchedule(
  {
    schedule: '0 10 * * *', // 10 AM UTC daily
    timeZone: 'UTC',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async (_event: ScheduledEvent) => {
    logger.info('Starting check-in reminder sending')

    try {
      // Get check-ins that need reminders
      const pendingCheckIns = await getPendingCheckInsNeedingReminder()

      logger.info('Found check-ins needing reminders', {
        count: pendingCheckIns.length,
      })

      let successCount = 0
      let errorCount = 0

      // Send reminder for each pending check-in
      for (const checkIn of pendingCheckIns) {
        try {
          // TODO: Send actual notification (FCM, email, etc.)
          // For now, we just mark the reminder as sent
          logger.info('Would send reminder notification', {
            checkInId: checkIn.id,
            recipientUid: checkIn.recipientUid,
            recipientType: checkIn.recipientType,
          })

          await markReminderSent(checkIn.id)
          successCount++
        } catch (error) {
          errorCount++
          logger.error('Failed to send reminder', {
            checkInId: checkIn.id,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      logger.info('Check-in reminder sending complete', {
        totalPending: pendingCheckIns.length,
        successCount,
        errorCount,
      })
    } catch (error) {
      logger.error('Check-in reminder sending failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
)
