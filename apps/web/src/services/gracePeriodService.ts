/**
 * Grace Period Service - Story 35.4
 *
 * Service for managing grace period logic.
 * AC1: 14-day grace period starts automatically when agreement expires
 * AC2: Monitoring continues during grace period
 * AC5: No device lockout - just reminders
 */

import {
  isInGracePeriod as isInGracePeriodUtil,
  getGracePeriodInfo,
  isMonitoringActiveInGracePeriod,
  getGracePeriodStatusConfig,
  getGracePeriodMessage,
  type GracePeriodStatus,
  type GracePeriodUrgency,
  type AgreementForGracePeriod,
} from '@fledgely/shared'

/**
 * Agreement input type for service functions.
 */
export interface AgreementInput extends AgreementForGracePeriod {
  id: string
}

/**
 * Complete grace period state for UI.
 */
export interface GracePeriodState {
  status: GracePeriodStatus
  isInGracePeriod: boolean
  daysRemaining: number | null
  showBanner: boolean
  bannerMessage: string | null
  isMonitoringActive: boolean
  urgency: GracePeriodUrgency | null
}

/**
 * Check grace period status for an agreement (AC1).
 * Returns:
 * - 'not-started': Agreement not expired yet or no expiry date
 * - 'active': Agreement expired, within 14-day grace period
 * - 'expired': Grace period has ended
 */
export function checkGracePeriodStatus(agreement: AgreementInput): GracePeriodStatus {
  if (!agreement.expiryDate) {
    return 'not-started'
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Not expired yet
  if (expiryDate > now) {
    return 'not-started'
  }

  // Check if in grace period
  if (isInGracePeriodUtil(agreement)) {
    return 'active'
  }

  // Grace period has ended
  return 'expired'
}

/**
 * Get days remaining in grace period.
 * Returns null if agreement hasn't expired.
 * Returns 0 if grace period has ended.
 */
export function getGracePeriodDaysRemaining(agreement: AgreementInput): number | null {
  const info = getGracePeriodInfo(agreement)

  if (!info) {
    return null
  }

  return info.daysRemaining
}

/**
 * Check if grace period banner should be shown (AC3).
 * Shows banner when:
 * - Agreement has expired (in grace period)
 * - After grace period ends (to prompt renewal)
 */
export function shouldShowGracePeriodBanner(agreement: AgreementInput): boolean {
  if (!agreement.expiryDate) {
    return false
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Show banner if agreement has expired
  return expiryDate <= now
}

/**
 * Get appropriate banner message based on role and days remaining (AC3, AC6).
 */
export function getGracePeriodBannerMessage(
  daysRemaining: number,
  role: 'parent' | 'child'
): string {
  return getGracePeriodMessage(daysRemaining, role)
}

/**
 * Check if monitoring should remain active (AC2, AC5).
 * Monitoring continues during grace period (no lockout).
 */
export function isMonitoringActive(agreement: AgreementInput): boolean {
  return isMonitoringActiveInGracePeriod(agreement)
}

/**
 * Get complete grace period state for UI.
 * Combines all grace period checks into a single state object.
 */
export function getGracePeriodState(agreement: AgreementInput): GracePeriodState {
  const status = checkGracePeriodStatus(agreement)
  const isInGracePeriod = status === 'active'
  const daysRemaining = getGracePeriodDaysRemaining(agreement)
  const showBanner = shouldShowGracePeriodBanner(agreement)
  const isMonitoringActiveState = isMonitoringActive(agreement)

  let urgency: GracePeriodUrgency | null = null
  let bannerMessage: string | null = null

  if (showBanner) {
    const days = daysRemaining ?? 0
    const config = getGracePeriodStatusConfig(days)
    urgency = config.urgency
    bannerMessage = getGracePeriodBannerMessage(days, 'parent')
  }

  return {
    status,
    isInGracePeriod,
    daysRemaining,
    showBanner,
    bannerMessage,
    isMonitoringActive: isMonitoringActiveState,
    urgency,
  }
}
