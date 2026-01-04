/**
 * Fleeing Mode Notification Suppressions
 *
 * Story 41.8: Fleeing Mode Notification Suppression - AC1, AC2, AC3
 *
 * Features:
 * - Check if notification should be suppressed during fleeing mode
 * - Import isInFleeingMode from loginNotification.ts
 * - Suppress location-related notifications only
 * - Regular notifications continue (flags, time limits, sync)
 */

import * as logger from 'firebase-functions/logger'
import { isInFleeingMode } from './loginNotification'
import {
  isFleeingModeSuppressedType,
  logFleeingModeSuppression,
  type FleeingModeSuppressedType,
} from '../safety/fleeingModeAudit'

// Re-export for convenience
export { isInFleeingMode }

/**
 * Result of checking notification suppression
 */
export interface SuppressionCheckResult {
  /** Whether notification should be suppressed */
  suppressed: boolean
  /** Reason for suppression (if suppressed) */
  reason?: 'fleeing_mode' | 'other'
}

/**
 * Check if a notification should be suppressed due to fleeing mode.
 *
 * Only location-related notifications are suppressed during fleeing mode.
 * Other notifications (flags, time limits, sync) continue normally.
 *
 * @param familyId - Family ID to check
 * @param notificationType - Type of notification to check
 * @returns Suppression check result
 */
export async function shouldSuppressForFleeingMode(
  familyId: string,
  notificationType: string
): Promise<SuppressionCheckResult> {
  // Only location-related types can be suppressed
  if (!isFleeingModeSuppressedType(notificationType)) {
    return { suppressed: false }
  }

  // Check if family is in fleeing mode
  const fleeingMode = await isInFleeingMode(familyId)

  if (fleeingMode) {
    logger.info('Notification suppressed due to fleeing mode', {
      familyId,
      notificationType,
    })

    return {
      suppressed: true,
      reason: 'fleeing_mode',
    }
  }

  return { suppressed: false }
}

/**
 * Check and suppress location notification, logging to safety audit.
 *
 * This is a convenience function that combines the check and logging.
 *
 * @param familyId - Family ID
 * @param notificationType - Notification type
 * @param eventData - Event data to log (will be sanitized)
 * @returns true if notification was suppressed
 */
export async function suppressLocationNotification(
  familyId: string,
  notificationType: string,
  eventData: {
    childId?: string
    deviceId?: string
    transitionId?: string
    [key: string]: unknown
  } = {}
): Promise<boolean> {
  // Check if should suppress
  const result = await shouldSuppressForFleeingMode(familyId, notificationType)

  if (result.suppressed && isFleeingModeSuppressedType(notificationType)) {
    // Log suppression to safety audit
    await logFleeingModeSuppression({
      familyId,
      notificationType: notificationType as FleeingModeSuppressedType,
      eventData,
    })

    return true
  }

  return false
}

/**
 * Check if notification can proceed (opposite of suppress).
 *
 * This is useful for conditional notification logic.
 *
 * @param familyId - Family ID
 * @param notificationType - Notification type
 * @returns true if notification can proceed
 */
export async function canSendNotification(
  familyId: string,
  notificationType: string
): Promise<boolean> {
  const result = await shouldSuppressForFleeingMode(familyId, notificationType)
  return !result.suppressed
}
