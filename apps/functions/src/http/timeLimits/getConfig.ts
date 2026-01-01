/**
 * Get Time Limit Configuration HTTP Endpoint
 *
 * Story 31.1: Countdown Warning System
 * Story 31.2: Neurodivergent Transition Accommodations
 * Story 31.3: Education Content Exemption
 *
 * Allows the extension to fetch time limit configuration for a child.
 * Returns the configured limits, warning thresholds, accommodations, and exemptions.
 *
 * Endpoint: POST /getTimeLimitConfig
 * Body: { childId: string, familyId: string }
 *
 * Returns:
 * - dailyTotal: TimeLimitSchedule | null
 * - categoryLimits: CategoryLimit[]
 * - deviceLimits: DeviceLimit[]
 * - warningThresholds: WarningThresholds
 * - accommodations: NeurodivergentAccommodations
 * - educationExemption: EducationExemption
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
 * Default neurodivergent accommodations (Story 31.2)
 */
const DEFAULT_ACCOMMODATIONS = {
  enabled: false,
  earlyWarningEnabled: true,
  earlyWarningMinutes: 30,
  gracePeriodMinutes: 5,
  calmingColorsEnabled: true,
  silentModeEnabled: false,
  gradualTransitionEnabled: true,
}

/**
 * Default education exemption settings (Story 31.3)
 */
const DEFAULT_EDUCATION_EXEMPTION = {
  enabled: false,
  customDomains: [],
  includeHomework: true,
  showExemptNotification: true,
}

/**
 * Get time limit configuration for a child.
 *
 * Story 31.1: Countdown Warning System
 * - AC4: Countdown timer in extension badge
 * - AC6: Configurable warning thresholds
 *
 * Story 31.2: Neurodivergent Accommodations
 * - AC1: Early 30-minute warning
 * - AC2: Extended grace period
 * - AC3: Calming visual design
 * - AC4: Optional audio warnings
 *
 * This endpoint is called by the extension to get the time limit config
 * including warning thresholds and accommodations for the warning system.
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
        accommodations: DEFAULT_ACCOMMODATIONS,
        educationExemption: DEFAULT_EDUCATION_EXEMPTION,
      })
      return
    }

    const data = configDoc.data()

    // Return the time limit configuration with accommodations (Story 31.2) and exemptions (Story 31.3)
    const response = {
      dailyTotal: data?.dailyTotal || null,
      categoryLimits: data?.categoryLimits || [],
      deviceLimits: data?.deviceLimits || [],
      warningThresholds: data?.warningThresholds || DEFAULT_WARNING_THRESHOLDS,
      accommodations: data?.accommodations || DEFAULT_ACCOMMODATIONS,
      educationExemption: data?.educationExemption || DEFAULT_EDUCATION_EXEMPTION,
    }

    logger.info('Time limit config fetched', {
      familyId,
      childId,
      hasLimits: !!data?.dailyTotal,
      hasAccommodations: data?.accommodations?.enabled || false,
      hasEducationExemption: data?.educationExemption?.enabled || false,
    })

    res.status(200).json(response)
  } catch (error) {
    logger.error('Failed to fetch time limit config', { error, familyId, childId })
    res.status(500).json({
      error: { code: 'internal', message: 'Failed to fetch time limit configuration' },
    })
  }
})
