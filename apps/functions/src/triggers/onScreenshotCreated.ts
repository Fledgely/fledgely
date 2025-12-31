/**
 * Screenshot Created Trigger
 *
 * Story 20.1: Classification Service Architecture - AC1
 *
 * Firestore trigger that fires when a new screenshot document is created.
 * Queues the screenshot for AI classification.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { CloudTasksClient } from '@google-cloud/tasks'
import * as logger from 'firebase-functions/logger'
import { CLASSIFICATION_CONFIG, type ClassificationJob } from '@fledgely/shared'
import { buildClassificationJob, needsClassification } from '../services/classification'

/**
 * Cloud Tasks client for queueing classification jobs.
 */
let tasksClient: CloudTasksClient | null = null

function getTasksClient(): CloudTasksClient {
  if (!tasksClient) {
    tasksClient = new CloudTasksClient()
  }
  return tasksClient
}

/**
 * Firestore trigger for new screenshot documents.
 *
 * Story 20.1: Classification Service Architecture - AC1, AC5
 *
 * Triggers on: children/{childId}/screenshots/{screenshotId}
 *
 * When a new screenshot is uploaded:
 * 1. Validates the document has required fields
 * 2. Queues a Cloud Tasks job for classification
 * 3. Sets initial classification status to 'pending'
 */
export const onScreenshotCreated = onDocumentCreated(
  {
    document: 'children/{childId}/screenshots/{screenshotId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.warn('onScreenshotCreated: No data in event')
      return
    }

    const { childId, screenshotId } = event.params
    const data = snapshot.data()

    logger.info('Screenshot created, processing for classification', {
      childId,
      screenshotId,
    })

    // Check if classification is needed
    if (!needsClassification(data)) {
      logger.info('Screenshot already classified or processing', {
        screenshotId,
        status: data?.classification?.status,
      })
      return
    }

    // Build classification job
    const job = buildClassificationJob(data, screenshotId)
    if (!job) {
      logger.error('Failed to build classification job', { screenshotId })
      return
    }

    try {
      // Set initial classification status
      await snapshot.ref.update({
        classification: {
          status: 'pending',
          retryCount: 0,
        },
      })

      // Queue classification task
      await queueClassificationTask(job)

      logger.info('Classification job queued successfully', {
        screenshotId,
        childId,
        familyId: job.familyId,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to queue classification job', {
        screenshotId,
        error: errorMessage,
      })

      // Mark as failed if queueing fails
      await snapshot.ref.update({
        classification: {
          status: 'failed',
          error: `Failed to queue: ${errorMessage}`,
          retryCount: 0,
        },
      })
    }
  }
)

/**
 * Queue a classification task to Cloud Tasks.
 *
 * Story 20.1: Classification Service Architecture - AC5
 *
 * @param job - Classification job to queue
 */
async function queueClassificationTask(job: ClassificationJob): Promise<void> {
  const client = getTasksClient()
  const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT
  const location = CLASSIFICATION_CONFIG.LOCATION
  const queue = CLASSIFICATION_CONFIG.QUEUE_NAME

  if (!project) {
    throw new Error('GCP project not configured')
  }

  // Build the Cloud Tasks queue path
  const parent = client.queuePath(project, location, queue)

  // Build the task
  const task = {
    httpRequest: {
      httpMethod: 'POST' as const,
      url: `https://${location}-${project}.cloudfunctions.net/processClassification`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(job)).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + 1, // Schedule 1 second from now
    },
  }

  try {
    await client.createTask({ parent, task })
  } catch (error) {
    // If queue doesn't exist or other issue, fall back to direct processing
    // This allows development without Cloud Tasks queue setup
    logger.warn('Cloud Tasks queue unavailable, falling back to direct processing', {
      error: error instanceof Error ? error.message : String(error),
    })

    // Import and call directly for fallback
    const { classifyScreenshot } = await import('../services/classification')
    await classifyScreenshot(job)
  }
}
