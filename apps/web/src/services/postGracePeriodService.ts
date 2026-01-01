/**
 * Post-Grace Period Service - Story 35.5
 *
 * Service for managing post-grace period logic.
 * AC1: Monitoring pauses after grace period
 * AC3: Time limits no longer enforced
 * AC4: Both parties notified
 * AC5: Can renew at any time
 * AC6: No punitive device restrictions
 */

import {
  isMonitoringPaused,
  shouldEnforceTimeLimits,
  shouldCaptureScreenshots,
  canResumeMonitoring,
  getPostGraceMessage,
  type AgreementForPostGrace,
} from '@fledgely/shared'

/**
 * Agreement input type for service functions.
 */
export interface AgreementInput extends AgreementForPostGrace {
  id: string
}

/**
 * Monitoring status.
 */
export type MonitoringStatus = 'active' | 'paused'

/**
 * Time limit enforcement status.
 */
export type TimeLimitStatus = 'enforced' | 'suspended'

/**
 * Complete operational status.
 */
export interface AgreementOperationalStatus {
  monitoringStatus: MonitoringStatus
  timeLimitsEnforced: boolean
  screenshotsEnabled: boolean
  canRenew: boolean
  pauseReason: string | null
}

/**
 * Check monitoring status (AC1).
 */
export function checkMonitoringStatus(agreement: AgreementInput): MonitoringStatus {
  return isMonitoringPaused(agreement) ? 'paused' : 'active'
}

/**
 * Get time limit enforcement status (AC3).
 */
export function getTimeLimitEnforcementStatus(agreement: AgreementInput): TimeLimitStatus {
  return shouldEnforceTimeLimits(agreement) ? 'enforced' : 'suspended'
}

/**
 * Get post-grace notification for user (AC4).
 * Returns null if agreement is not in post-grace period.
 */
export function getPostGraceNotification(
  agreement: AgreementInput,
  role: 'parent' | 'child'
): string | null {
  if (!isMonitoringPaused(agreement)) {
    return null
  }

  return getPostGraceMessage(role)
}

/**
 * Check if agreement can be renewed (AC5).
 * Always returns true - renewal is always available.
 */
export function canRenewAgreement(_agreement: AgreementInput): boolean {
  return canResumeMonitoring(_agreement)
}

/**
 * Get complete operational status for an agreement.
 */
export function getAgreementOperationalStatus(
  agreement: AgreementInput
): AgreementOperationalStatus {
  const isPaused = isMonitoringPaused(agreement)

  return {
    monitoringStatus: isPaused ? 'paused' : 'active',
    timeLimitsEnforced: shouldEnforceTimeLimits(agreement),
    screenshotsEnabled: shouldCaptureScreenshots(agreement),
    canRenew: canResumeMonitoring(agreement),
    pauseReason: isPaused ? 'Agreement grace period has ended. Renew to resume monitoring.' : null,
  }
}
