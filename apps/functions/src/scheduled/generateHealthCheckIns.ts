/**
 * Generate Health Check-Ins Scheduled Function
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC1
 *
 * Runs daily to generate health check-ins for eligible families.
 * A family is eligible when:
 * - Created 30+ days ago
 * - Check-ins are enabled
 * - Next check-in is due based on configured frequency
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { getEligibleFamiliesForCheckIn, createCheckInsForFamily } from '../services/health'

/**
 * Daily scheduled function to generate health check-ins.
 *
 * Runs at 9 AM UTC daily to check for families needing check-ins.
 */
export const generateHealthCheckIns = onSchedule(
  {
    schedule: '0 9 * * *', // 9 AM UTC daily
    timeZone: 'UTC',
    memory: '256MiB',
    timeoutSeconds: 300,
  },
  async (_event: ScheduledEvent) => {
    logger.info('Starting health check-in generation')

    try {
      // Get families that are eligible for check-ins
      const eligibleFamilies = await getEligibleFamiliesForCheckIn()

      logger.info('Found eligible families', {
        count: eligibleFamilies.length,
      })

      let successCount = 0
      let errorCount = 0

      // Generate check-ins for each eligible family
      for (const familyId of eligibleFamilies) {
        try {
          const checkInIds = await createCheckInsForFamily(familyId)

          if (checkInIds.length > 0) {
            successCount++
            logger.debug('Created check-ins for family', {
              familyId,
              checkInCount: checkInIds.length,
            })
          }
        } catch (error) {
          errorCount++
          logger.error('Failed to create check-ins for family', {
            familyId,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      logger.info('Health check-in generation complete', {
        eligibleFamilies: eligibleFamilies.length,
        successCount,
        errorCount,
      })
    } catch (error) {
      logger.error('Health check-in generation failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
)
