/**
 * Pattern Alert HTTP Endpoints
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC3
 *
 * Provides endpoints for fetching and dismissing pattern alerts.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import { getPendingAlertsForGuardian, markAlertAsRead } from '../../services/patterns'

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Get pending pattern alerts for the current user.
 *
 * GET /getPatternAlerts
 *
 * Response:
 * - 200: { alerts: PatternAlert[] }
 * - 401: Not authenticated
 */
export const getPatternAlerts = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Authenticate
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token for pattern alerts', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    try {
      const alerts = await getPendingAlertsForGuardian(decodedToken.uid)
      res.status(200).json({ alerts })
    } catch (error) {
      logger.error('Failed to get pattern alerts', {
        uid: decodedToken.uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to get alerts' })
    }
  }
)

/**
 * Dismiss (mark as read) a pattern alert.
 *
 * POST /dismissPatternAlert
 * Body: { alertId: string }
 *
 * Response:
 * - 200: { success: true }
 * - 400: Missing alertId
 * - 401: Not authenticated
 */
export const dismissPatternAlert = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Authenticate
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token for dismissing alert', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    // Validate body
    const { alertId } = req.body
    if (!alertId || typeof alertId !== 'string') {
      res.status(400).json({ error: 'alertId required' })
      return
    }

    try {
      await markAlertAsRead(alertId)
      logger.info('Pattern alert dismissed', {
        alertId,
        uid: decodedToken.uid,
      })
      res.status(200).json({ success: true })
    } catch (error) {
      logger.error('Failed to dismiss pattern alert', {
        alertId,
        uid: decodedToken.uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to dismiss alert' })
    }
  }
)
