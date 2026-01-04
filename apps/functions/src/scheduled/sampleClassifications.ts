/**
 * Classification Sampling Scheduled Job
 *
 * Story 20.6: Classification Accuracy Monitoring - AC1, AC4
 *
 * Daily scheduled job that:
 * 1. Samples classifications for human review
 * 2. Calculates daily accuracy metrics
 * 3. Checks accuracy threshold and creates alerts
 */

import * as functions from 'firebase-functions/v2/scheduler'
import * as logger from 'firebase-functions/logger'
import { selectRandomSamplesForReview } from '../services/classification/accuracySampling'
import { calculateDailyAccuracy } from '../services/classification/accuracyCalculator'
import { checkAccuracyThreshold } from '../services/classification/accuracyAlerting'
import { formatDateString, DEFAULT_DAILY_SAMPLE_SIZE } from '@fledgely/shared'

/**
 * Scheduled job for classification accuracy monitoring.
 *
 * Runs daily at 4 AM UTC.
 *
 * AC1: Samples classifications flagged for human review (daily at 4 AM)
 * AC4: Alert triggered if accuracy drops below 90%
 */
export const sampleClassificationsScheduled = functions.onSchedule(
  {
    schedule: '0 4 * * *', // 4 AM UTC daily
    timeZone: 'UTC',
    region: 'us-central1',
  },
  async () => {
    logger.info('Starting daily classification sampling job')

    try {
      // 1. Sample new classifications for review
      const samples = await selectRandomSamplesForReview(DEFAULT_DAILY_SAMPLE_SIZE)
      logger.info('Sampled classifications for review', {
        sampleCount: samples.length,
      })

      // 2. Calculate accuracy for yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = formatDateString(yesterday)

      try {
        const metric = await calculateDailyAccuracy(yesterdayStr)
        logger.info('Calculated daily accuracy', {
          date: yesterdayStr,
          accuracy: metric.accuracy,
          totalReviewed: metric.totalReviewed,
        })
      } catch (error) {
        logger.warn('Failed to calculate daily accuracy', {
          date: yesterdayStr,
          error,
        })
      }

      // 3. Check accuracy threshold and create alert if needed
      const alert = await checkAccuracyThreshold()
      if (alert) {
        logger.warn('Accuracy alert created', {
          alertId: alert.id,
          status: alert.status,
          currentAccuracy: alert.currentAccuracy,
        })
      }

      logger.info('Daily classification sampling job completed', {
        samplesCreated: samples.length,
        alertCreated: !!alert,
      })
    } catch (error) {
      logger.error('Daily classification sampling job failed', { error })
      throw error
    }
  }
)
