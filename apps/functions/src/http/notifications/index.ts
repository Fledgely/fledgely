/**
 * Notification Preferences HTTP Endpoints
 *
 * Story 27.6: Real-Time Access Notifications - AC1
 *
 * Provides endpoints to get and update notification preferences.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../services/notifications'
import type { NotificationPreferences } from '@fledgely/shared'

/**
 * Extract Bearer token from Authorization header.
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Get notification preferences HTTP endpoint.
 *
 * GET /getNotificationPreferences
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Response:
 * - 200: Notification preferences
 * - 401: Authentication required/failed
 * - 500: Server error
 */
export const getNotificationPreferencesEndpoint = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // 1. Auth - Validate Firebase Auth token
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization header required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const userUid = decodedToken.uid

    try {
      const preferences = await getNotificationPreferences(userUid)
      res.status(200).json({ preferences })
    } catch (error) {
      logger.error('Failed to get notification preferences', {
        userUid,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to get notification preferences' })
    }
  }
)

/**
 * Update notification preferences HTTP endpoint.
 *
 * POST /updateNotificationPreferences
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Body:
 * - preferences: Partial<NotificationPreferences>
 *
 * Response:
 * - 200: Updated preferences
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 500: Server error
 */
export const updateNotificationPreferencesEndpoint = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // 1. Auth - Validate Firebase Auth token
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization header required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const userUid = decodedToken.uid

    // 2. Validate request body
    const { preferences } = req.body || {}

    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({ error: 'preferences object required' })
      return
    }

    // Validate preference fields
    const validPreferences: Partial<NotificationPreferences> = {}

    if (typeof preferences.accessNotificationsEnabled === 'boolean') {
      validPreferences.accessNotificationsEnabled = preferences.accessNotificationsEnabled
    }

    if (typeof preferences.accessDigestEnabled === 'boolean') {
      validPreferences.accessDigestEnabled = preferences.accessDigestEnabled
    }

    if (
      preferences.quietHoursStart === null ||
      (typeof preferences.quietHoursStart === 'string' &&
        /^\d{2}:\d{2}$/.test(preferences.quietHoursStart))
    ) {
      validPreferences.quietHoursStart = preferences.quietHoursStart
    }

    if (
      preferences.quietHoursEnd === null ||
      (typeof preferences.quietHoursEnd === 'string' &&
        /^\d{2}:\d{2}$/.test(preferences.quietHoursEnd))
    ) {
      validPreferences.quietHoursEnd = preferences.quietHoursEnd
    }

    if (typeof preferences.notifyOnChildDataAccess === 'boolean') {
      validPreferences.notifyOnChildDataAccess = preferences.notifyOnChildDataAccess
    }

    if (typeof preferences.notifyOnOwnDataAccess === 'boolean') {
      validPreferences.notifyOnOwnDataAccess = preferences.notifyOnOwnDataAccess
    }

    try {
      await updateNotificationPreferences(userUid, validPreferences)

      // Return updated preferences
      const updatedPreferences = await getNotificationPreferences(userUid)

      logger.info('Updated notification preferences', { userUid })
      res.status(200).json({ preferences: updatedPreferences })
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        userUid,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to update notification preferences' })
    }
  }
)
