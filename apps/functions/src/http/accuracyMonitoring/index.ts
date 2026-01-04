/**
 * Classification Accuracy Monitoring HTTP Endpoints
 *
 * Story 20.6: Classification Accuracy Monitoring - AC3
 *
 * HTTP endpoints for the accuracy monitoring review workflow.
 */

import * as functions from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import {
  type SubmitReviewInput,
  type GetReviewQueueResponse,
  type GetAccuracyMetricsResponse,
  submitReviewInputSchema,
  determineAlertStatus,
} from '@fledgely/shared'
import {
  getReviewQueue,
  submitReview,
  skipReviewItem,
} from '../../services/classification/accuracySampling'
import {
  calculateRollingAccuracy,
  getAllCategoryAccuracy,
  getCategoriesNeedingImprovement,
  getAccuracyTrend,
  getLatestAccuracyMetric,
} from '../../services/classification/accuracyCalculator'
import { getActiveAlerts } from '../../services/classification/accuracyAlerting'

/**
 * Verify the request has a valid admin/ops token.
 * In production, this should check for specific admin roles.
 */
async function verifyOpsAccess(
  authHeader: string | undefined
): Promise<{ uid: string; email?: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  try {
    const decodedToken = await getAuth().verifyIdToken(token)
    // In production, check for admin/ops role claims
    return { uid: decodedToken.uid, email: decodedToken.email }
  } catch {
    return null
  }
}

/**
 * GET /getReviewQueue
 *
 * Returns pending classification review items.
 *
 * AC1: Sample classifications flagged for human review
 */
export const getReviewQueueEndpoint = functions.onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Only allow GET
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify ops access
    const user = await verifyOpsAccess(req.headers.authorization)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      const limit = parseInt(req.query.limit as string) || 50
      const { items, totalPending } = await getReviewQueue(limit)

      const response: GetReviewQueueResponse = {
        items,
        totalPending,
      }

      logger.info('Review queue fetched', {
        items: items.length,
        totalPending,
        requestedBy: user.uid,
      })

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to fetch review queue', { error })
      res.status(500).json({ error: 'Failed to fetch review queue' })
    }
  }
)

/**
 * POST /submitReview
 *
 * Submit a review for a classification.
 *
 * AC2: Accuracy calculated from reviewed samples
 * AC6: Feedback loop for model improvement
 */
export const submitReviewEndpoint = functions.onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify ops access
    const user = await verifyOpsAccess(req.headers.authorization)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      // Validate input
      const parseResult = submitReviewInputSchema.safeParse(req.body)
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid input',
          details: parseResult.error.issues,
        })
        return
      }

      const input: SubmitReviewInput = parseResult.data
      const result = await submitReview(input, user.uid)

      if (!result.success) {
        res.status(400).json({ error: result.message })
        return
      }

      logger.info('Review submitted', {
        reviewQueueId: input.reviewQueueId,
        isCorrect: input.isCorrect,
        reviewedBy: user.uid,
      })

      res.status(200).json(result)
    } catch (error) {
      logger.error('Failed to submit review', { error })
      res.status(500).json({ error: 'Failed to submit review' })
    }
  }
)

/**
 * POST /skipReview
 *
 * Skip a review queue item.
 */
export const skipReviewEndpoint = functions.onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify ops access
    const user = await verifyOpsAccess(req.headers.authorization)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      const { reviewQueueId } = req.body

      if (!reviewQueueId || typeof reviewQueueId !== 'string') {
        res.status(400).json({ error: 'reviewQueueId is required' })
        return
      }

      const result = await skipReviewItem(reviewQueueId, user.uid)

      if (!result.success) {
        res.status(400).json({ error: result.message })
        return
      }

      logger.info('Review skipped', {
        reviewQueueId,
        skippedBy: user.uid,
      })

      res.status(200).json(result)
    } catch (error) {
      logger.error('Failed to skip review', { error })
      res.status(500).json({ error: 'Failed to skip review' })
    }
  }
)

/**
 * GET /getAccuracyMetrics
 *
 * Returns accuracy metrics for the dashboard.
 *
 * AC3: Accuracy dashboard visible to ops team
 */
export const getAccuracyMetricsEndpoint = functions.onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Only allow GET
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Verify ops access
    const user = await verifyOpsAccess(req.headers.authorization)
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    try {
      const trendDays = parseInt(req.query.trendDays as string) || 30

      // Get all metrics in parallel
      const [
        rollingResult,
        perCategoryAccuracy,
        categoriesNeedingImprovement,
        dailyTrend,
        activeAlerts,
        latestMetric,
        reviewQueue,
      ] = await Promise.all([
        calculateRollingAccuracy(),
        getAllCategoryAccuracy(),
        getCategoriesNeedingImprovement(),
        getAccuracyTrend(trendDays),
        getActiveAlerts(),
        getLatestAccuracyMetric(),
        getReviewQueue(1), // Just to get pending count
      ])

      // Calculate overall accuracy (use latest metric if available)
      const overallAccuracy = latestMetric?.accuracy ?? rollingResult.accuracy

      const response: GetAccuracyMetricsResponse = {
        overallAccuracy,
        rollingAccuracy7Day: rollingResult.accuracy,
        perCategoryAccuracy,
        categoriesNeedingImprovement,
        dailyTrend,
        alertStatus: determineAlertStatus(rollingResult.accuracy),
        activeAlerts,
        totalSamplesReviewed: rollingResult.totalReviewed,
        pendingReviewsCount: reviewQueue.totalPending,
      }

      logger.info('Accuracy metrics fetched', {
        overallAccuracy,
        rollingAccuracy: rollingResult.accuracy,
        activeAlerts: activeAlerts.length,
        requestedBy: user.uid,
      })

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to fetch accuracy metrics', { error })
      res.status(500).json({ error: 'Failed to fetch accuracy metrics' })
    }
  }
)
