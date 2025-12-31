/**
 * Classification Task HTTP Handler
 *
 * Story 20.1: Classification Service Architecture - AC5
 *
 * HTTP endpoint for processing queued classification tasks.
 * Called by Cloud Tasks queue.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  classificationJobSchema,
  CLASSIFICATION_CONFIG,
  calculateBackoffDelay,
} from '@fledgely/shared'
import { classifyScreenshot } from '../../services/classification'

/**
 * HTTP handler for classification tasks.
 *
 * Story 20.1: Classification Service Architecture - AC5, AC6
 *
 * This endpoint is called by Cloud Tasks to process classification jobs.
 * It handles:
 * - Validating the job payload
 * - Calling the classification service
 * - Handling retries with exponential backoff
 */
export const processClassification = onRequest(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120, // Allow extra time for classification + retries
    maxInstances: 10, // Limit concurrent classifications
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Validate Cloud Tasks header (in production)
    const taskQueueHeader = req.headers['x-cloudtasks-queuename']
    const isLocalDev = process.env.FUNCTIONS_EMULATOR === 'true'
    const isTestEnv = process.env.NODE_ENV === 'test'

    if (!isLocalDev && !isTestEnv && !taskQueueHeader) {
      logger.warn('Request missing Cloud Tasks header - rejecting unauthorized request')
      res.status(403).json({ error: 'Unauthorized - Cloud Tasks header required' })
      return
    }

    // Parse and validate job payload
    let job
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      job = classificationJobSchema.parse(body)
    } catch (parseError) {
      logger.error('Invalid classification job payload', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
      })
      res.status(400).json({ error: 'Invalid job payload' })
      return
    }

    const { childId, screenshotId, retryCount = 0 } = job

    logger.info('Processing classification job', {
      screenshotId,
      childId,
      retryCount,
    })

    // Check if screenshot still exists and needs classification
    const db = getFirestore()
    const screenshotRef = db
      .collection('children')
      .doc(childId)
      .collection('screenshots')
      .doc(screenshotId)

    const screenshotDoc = await screenshotRef.get()

    if (!screenshotDoc.exists) {
      logger.warn('Screenshot document no longer exists', { screenshotId })
      res.status(200).json({ success: true, message: 'Screenshot not found, skipping' })
      return
    }

    const data = screenshotDoc.data()

    // Skip if already completed
    if (data?.classification?.status === 'completed') {
      logger.info('Screenshot already classified, skipping', { screenshotId })
      res.status(200).json({ success: true, message: 'Already classified' })
      return
    }

    // Execute classification
    const result = await classifyScreenshot(job)

    if (result.success) {
      res.status(200).json({
        success: true,
        result: result.result,
      })
      return
    }

    // Handle failure - check if should retry
    if (retryCount < CLASSIFICATION_CONFIG.MAX_RETRIES) {
      const delay = calculateBackoffDelay(retryCount)

      logger.warn('Classification failed, will retry', {
        screenshotId,
        retryCount,
        nextRetryIn: delay,
        error: result.error,
      })

      // Return 503 to trigger Cloud Tasks retry
      // Cloud Tasks will use its own retry mechanism
      res.status(503).json({
        success: false,
        error: result.error,
        retryCount,
        message: 'Classification failed, retry scheduled',
      })
      return
    }

    // Max retries exhausted
    logger.error('Classification failed after max retries', {
      screenshotId,
      retryCount,
      error: result.error,
    })

    // Create audit log entry for permanent failure
    await logClassificationError(job, result.error || 'Unknown error')

    res.status(200).json({
      success: false,
      error: result.error,
      message: 'Classification failed after max retries',
    })
  }
)

/**
 * Log classification error to audit collection.
 *
 * Story 20.1: Classification Service Architecture - AC6
 *
 * @param job - Classification job that failed
 * @param error - Error message
 */
async function logClassificationError(
  job: { screenshotId: string; childId: string; familyId: string },
  error: string
): Promise<void> {
  const db = getFirestore()

  try {
    await db.collection('classificationErrors').add({
      screenshotId: job.screenshotId,
      childId: job.childId,
      familyId: job.familyId,
      error,
      timestamp: Date.now(),
      resolved: false,
    })
  } catch (logError) {
    logger.error('Failed to log classification error', {
      screenshotId: job.screenshotId,
      logError: logError instanceof Error ? logError.message : String(logError),
    })
  }
}
