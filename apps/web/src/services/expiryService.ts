/**
 * Expiry Service - Story 35.1
 *
 * Service for calculating and validating expiry dates.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC2: Age-based recommendations
 * AC4: Annual review for no-expiry
 */

import {
  EXPIRY_DURATIONS,
  isExpiringSoon,
  getDaysUntilExpiry,
  getAnnualReviewDate,
  getRecommendedExpiry,
  type ExpiryDuration,
  type ExpiryDurationConfig,
} from '@fledgely/shared'

/**
 * Warning level for expiry status.
 */
export type ExpiryWarningLevel = 'none' | 'warning' | 'critical' | 'expired'

/**
 * Result of expiry date validation.
 */
export interface ExpiryValidationResult {
  valid: boolean
  error?: string
}

/**
 * Expiry recommendation result.
 */
export interface ExpiryRecommendation {
  duration: ExpiryDuration
  reason: string
}

const CRITICAL_THRESHOLD_DAYS = 7
const WARNING_THRESHOLD_DAYS = 30

/**
 * Get the configuration for an expiry duration.
 */
export function getExpiryConfig(duration: ExpiryDuration): ExpiryDurationConfig {
  const config = EXPIRY_DURATIONS.find((d) => d.id === duration)
  if (!config) {
    throw new Error(`Unknown expiry duration: ${duration}`)
  }
  return config
}

/**
 * Validate an expiry date.
 * Returns valid: true for future dates or null (no expiry).
 */
export function validateExpiryDate(expiryDate: Date | null): ExpiryValidationResult {
  // Null is valid for no-expiry agreements
  if (expiryDate === null) {
    return { valid: true }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  // Expiry must be in the future (after today)
  if (expiry <= now) {
    return {
      valid: false,
      error: 'Expiry date must be in the future',
    }
  }

  return { valid: true }
}

/**
 * Format the expiry status for display.
 */
export function formatExpiryStatus(expiryDate: Date | null): string {
  if (expiryDate === null) {
    return 'No expiry date set'
  }

  const daysRemaining = getDaysUntilExpiry(expiryDate)

  if (daysRemaining === null) {
    return 'No expiry date set'
  }

  if (daysRemaining < 0) {
    return `Expired on ${formatDate(expiryDate)}`
  }

  const formattedDate = formatDate(expiryDate)

  if (isExpiringSoon(expiryDate)) {
    return `Expiring soon - ${formattedDate} (${daysRemaining} days remaining)`
  }

  return `Expires ${formattedDate}`
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get the warning level for an expiry date.
 */
export function getExpiryWarningLevel(expiryDate: Date | null): ExpiryWarningLevel {
  if (expiryDate === null) {
    return 'none'
  }

  const daysRemaining = getDaysUntilExpiry(expiryDate)

  if (daysRemaining === null) {
    return 'none'
  }

  if (daysRemaining < 0) {
    return 'expired'
  }

  if (daysRemaining <= CRITICAL_THRESHOLD_DAYS) {
    return 'critical'
  }

  if (daysRemaining <= WARNING_THRESHOLD_DAYS) {
    return 'warning'
  }

  return 'none'
}

/**
 * Calculate the next annual review date.
 */
export function calculateNextReviewDate(startDate?: Date): Date {
  return getAnnualReviewDate(startDate)
}

/**
 * Get an expiry duration recommendation based on child age.
 */
export function getExpiryRecommendation(childAge: number): ExpiryRecommendation {
  const duration = getRecommendedExpiry(childAge)

  if (duration === '6-months') {
    return {
      duration,
      reason: 'For younger children under 13, we recommend more frequent reviews.',
    }
  }

  return {
    duration,
    reason: 'For teens 13+, annual reviews work well as they develop independence.',
  }
}
