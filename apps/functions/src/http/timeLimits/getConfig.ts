/**
 * Get Time Limit Configuration HTTP Endpoint
 *
 * Story 31.1: Countdown Warning System
 *
 * Allows the extension to fetch time limit configuration for a child.
 * Returns the configured limits and warning thresholds.
 *
 * Endpoint: POST /getTimeLimitConfig
 * Body: { childId: string, familyId: string }
 *
 * Returns:
 * - dailyTotal: TimeLimitSchedule | null
 * - categoryLimits: CategoryLimit[]
 * - deviceLimits: DeviceLimit[]
 * - warningThresholds: WarningThresholds
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

/**
 * Default warning thresholds (matches schema defaults)
 */
const DEFAULT_WARNING_THRESHOLDS = {
  firstWarningMinutes: 15,
  secondWarningMinutes: 5,
  finalWarningMinutes: 1,
  showCountdownBadge: true,
  showToastNotifications: true,
}

/**
 * Get time limit configuration for a child.
 *
 * Story 31.1: Countdown Warning System
 * - AC4: Countdown timer in extension badge
 * - AC6: Configurable warning thresholds
 *
 * This endpoint is called by the extension to get the time limit config
 * including warning thresholds for the countdown warning system.
 */
export const getTimeLimitConfig = onRequest({ cors: true }, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: { code: 'method-not-allowed', message: 'Method not allowed' },
    })
    return
  }

  const { childId, familyId } = req.body

  // Validate required parameters
  if (!familyId || typeof familyId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'familyId is required' },
    })
    return
  }

  if (!childId || typeof childId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'childId is required' },
    })
    return
  }

  const db = getFirestore()

  try {
    // Get time limit config from Firestore
    // Path: /families/{familyId}/children/{childId}/timeLimits/config
    const configRef = db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(childId)
      .collection('timeLimits')
      .doc('config')

    const configDoc = await configRef.get()

    if (!configDoc.exists) {
      // No time limits configured - return defaults
      logger.info('No time limit config found, returning defaults', { familyId, childId })
      res.status(200).json({
        dailyTotal: null,
        categoryLimits: [],
        deviceLimits: [],
        warningThresholds: DEFAULT_WARNING_THRESHOLDS,
      })
      return
    }

    const data = configDoc.data()

    // Return the time limit configuration
    const response = {
      dailyTotal: data?.dailyTotal || null,
      categoryLimits: data?.categoryLimits || [],
      deviceLimits: data?.deviceLimits || [],
      warningThresholds: data?.warningThresholds || DEFAULT_WARNING_THRESHOLDS,
    }

    logger.info('Time limit config fetched', {
      familyId,
      childId,
      hasLimits: !!data?.dailyTotal,
    })

    res.status(200).json(response)
  } catch (error) {
    logger.error('Failed to fetch time limit config', { error, familyId, childId })
    res.status(500).json({
      error: { code: 'internal', message: 'Failed to fetch time limit configuration' },
    })
  }
})
