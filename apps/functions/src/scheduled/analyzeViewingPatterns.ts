/**
 * Weekly Viewing Pattern Analysis
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC6
 *
 * Scheduled function that runs weekly to analyze viewing patterns
 * across all eligible families and generate alerts for asymmetric patterns.
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import {
  getEligibleFamilies,
  analyzeViewingPatterns,
  storePatternAnalysis,
  canSendAlert,
} from '../services/patterns'
import { shouldGenerateAlert, createPatternAlert } from '../services/patterns'

/**
 * Weekly pattern analysis scheduled function.
 *
 * Runs every Sunday at 9 AM UTC to analyze the previous week's viewing patterns.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC1, AC2, AC3, AC6
 */
export const analyzeViewingPatternsScheduled = onSchedule(
  {
    schedule: '0 9 * * 0', // Every Sunday at 9 AM UTC
    timeZone: 'UTC',
    retryCount: 3,
    maxInstances: 1,
    timeoutSeconds: 540, // 9 minutes
  },
  async (_event: ScheduledEvent) => {
    logger.info('Starting weekly viewing pattern analysis')

    const startTime = Date.now()
    let familiesProcessed = 0
    let analysesCreated = 0
    let alertsGenerated = 0
    let errors = 0

    try {
      // Get all eligible families (multiple guardians, past setup period)
      const eligibleFamilies = await getEligibleFamilies()
      logger.info(`Found ${eligibleFamilies.length} eligible families for analysis`)

      for (const familyId of eligibleFamilies) {
        try {
          // Analyze viewing patterns for the past week
          const analysis = await analyzeViewingPatterns(familyId, 7)

          // Store the analysis
          await storePatternAnalysis(analysis)
          analysesCreated++

          // Check if we should generate an alert
          const alertDecision = shouldGenerateAlert(analysis)

          if (
            alertDecision.shouldAlert &&
            alertDecision.recipientUid &&
            alertDecision.highActivityGuardian
          ) {
            // Check if we can send an alert (throttling)
            const canSend = await canSendAlert(familyId)

            if (canSend) {
              await createPatternAlert(
                analysis,
                alertDecision.recipientUid,
                alertDecision.highActivityGuardian,
                alertDecision.recipientCount || 0
              )
              alertsGenerated++

              logger.info('Pattern alert generated', {
                familyId,
                recipientUid: alertDecision.recipientUid,
                asymmetryRatio: analysis.asymmetryRatio,
              })
            } else {
              logger.debug('Alert throttled - recent alert exists', { familyId })
            }
          }

          familiesProcessed++
        } catch (error) {
          errors++
          logger.error('Failed to analyze family', {
            familyId,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      const duration = Date.now() - startTime
      logger.info('Weekly pattern analysis complete', {
        familiesProcessed,
        analysesCreated,
        alertsGenerated,
        errors,
        durationMs: duration,
      })
    } catch (error) {
      logger.error('Weekly pattern analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
)
