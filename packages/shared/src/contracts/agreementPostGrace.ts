/**
 * Agreement Post-Grace Period Types and Constants - Story 35.5
 *
 * Types, schemas, and utilities for post-grace period handling.
 * AC1: Monitoring pauses after grace period
 * AC2: Existing data preserved
 * AC3: Time limits no longer enforced
 * AC5: Can renew at any time
 * AC6: No punitive device restrictions
 */

import { z } from 'zod'
import { hasGracePeriodExpired, isInGracePeriod } from './agreementGracePeriod'

/**
 * Post-grace period status options.
 */
export const postGraceStatusSchema = z.enum(['active', 'grace-period', 'monitoring-paused'])

export type PostGraceStatus = z.infer<typeof postGraceStatusSchema>

/**
 * Post-grace status constants.
 */
export const POST_GRACE_STATUS = {
  ACTIVE: 'active',
  GRACE_PERIOD: 'grace-period',
  MONITORING_PAUSED: 'monitoring-paused',
} as const

/**
 * Post-grace period behavior configuration.
 * Defines what happens after grace period ends.
 */
export const POST_GRACE_BEHAVIOR = {
  /** AC1: No new screenshots captured */
  PAUSE_SCREENSHOTS: true,
  /** AC2: Existing data is preserved */
  PRESERVE_DATA: true,
  /** AC3: Time limits stop being enforced */
  DISABLE_TIME_LIMITS: true,
  /** AC5: Can always renew to resume */
  ALLOW_RENEWAL: true,
  /** AC6: Device continues to work normally */
  NO_DEVICE_RESTRICTIONS: true,
} as const

/**
 * Post-grace period messages for notifications (AC4).
 */
export const POST_GRACE_MESSAGES = {
  PARENT_NOTIFICATION:
    'Monitoring is currently paused. Your data is safe. Renew your agreement when ready to resume.',
  CHILD_NOTIFICATION:
    'Your agreement has expired. Talk to your parent about renewing it. Your device works normally.',
  DATA_PRESERVED: 'Your existing screenshots and history are safe and accessible.',
  RENEWAL_AVAILABLE: 'You can renew your agreement at any time to resume monitoring.',
  NO_RESTRICTIONS: 'Your device continues to work normally with no restrictions.',
} as const

/**
 * Agreement type for post-grace checks.
 */
export interface AgreementForPostGrace {
  expiryDate: Date | null
  status: string
}

/**
 * Check if monitoring is currently paused (AC1).
 * Monitoring pauses when the grace period has ended.
 */
export function isMonitoringPaused(agreement: AgreementForPostGrace): boolean {
  return hasGracePeriodExpired(agreement)
}

/**
 * Get the current post-grace status.
 */
export function getPostGraceStatus(agreement: AgreementForPostGrace): PostGraceStatus {
  if (!agreement.expiryDate) {
    return 'active'
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Not expired yet
  if (expiryDate > now) {
    return 'active'
  }

  // Check if in grace period
  if (isInGracePeriod(agreement)) {
    return 'grace-period'
  }

  // Grace period has ended
  return 'monitoring-paused'
}

/**
 * Check if monitoring can be resumed (AC5).
 * Always true - renewal is always available.
 */
export function canResumeMonitoring(_agreement: AgreementForPostGrace): boolean {
  return POST_GRACE_BEHAVIOR.ALLOW_RENEWAL
}

/**
 * Check if screenshots should be captured (AC1).
 * Returns false when monitoring is paused.
 */
export function shouldCaptureScreenshots(agreement: AgreementForPostGrace): boolean {
  return !isMonitoringPaused(agreement)
}

/**
 * Check if time limits should be enforced (AC3).
 * Returns false when monitoring is paused.
 */
export function shouldEnforceTimeLimits(agreement: AgreementForPostGrace): boolean {
  return !isMonitoringPaused(agreement)
}

/**
 * Get appropriate post-grace message for user role (AC4).
 */
export function getPostGraceMessage(role: 'parent' | 'child'): string {
  return role === 'parent'
    ? POST_GRACE_MESSAGES.PARENT_NOTIFICATION
    : POST_GRACE_MESSAGES.CHILD_NOTIFICATION
}

/**
 * Get the reason monitoring is paused.
 */
export function getMonitoringPauseReason(agreement: AgreementForPostGrace): string | null {
  if (!isMonitoringPaused(agreement)) {
    return null
  }

  return 'Agreement grace period has ended. Renew to resume monitoring.'
}

/**
 * Get requirements to resume monitoring.
 */
export function getResumeRequirements(): string[] {
  return [
    'Parent initiates renewal',
    'Both parent and child consent to renewed agreement',
    'New expiry date is set',
  ]
}
