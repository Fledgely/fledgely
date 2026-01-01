/**
 * Agreement Expiry Types and Constants - Story 35.1
 *
 * Types, schemas, and utilities for agreement expiry configuration.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC2: Age-based recommendations
 * AC4: Annual review for no-expiry agreements
 */

import { z } from 'zod'

/**
 * Schema for expiry duration options.
 * AC1: 3 months, 6 months, 1 year, "No expiry"
 */
export const expiryDurationSchema = z.enum(['3-months', '6-months', '1-year', 'no-expiry'])

export type ExpiryDuration = z.infer<typeof expiryDurationSchema>

/**
 * Expiry duration configuration.
 */
export interface ExpiryDurationConfig {
  id: ExpiryDuration
  label: string
  months: number | null
  description: string
}

/**
 * Available expiry duration options with metadata.
 * AC1: Expiry options
 */
export const EXPIRY_DURATIONS: ExpiryDurationConfig[] = [
  {
    id: '3-months',
    label: '3 months',
    months: 3,
    description: 'Good for trial periods or younger children',
  },
  {
    id: '6-months',
    label: '6 months',
    months: 6,
    description: 'Recommended for children under 13',
  },
  {
    id: '1-year',
    label: '1 year',
    months: 12,
    description: 'Recommended for teens 13+',
  },
  {
    id: 'no-expiry',
    label: 'No expiry',
    months: null,
    description: 'Annual review reminder will still be sent',
  },
] as const

/**
 * Labels for each expiry duration.
 */
export const EXPIRY_DURATION_LABELS: Record<ExpiryDuration, string> = {
  '3-months': '3 months',
  '6-months': '6 months',
  '1-year': '1 year',
  'no-expiry': 'No expiry',
} as const

/**
 * UI messaging for expiry configuration.
 */
export const EXPIRY_MESSAGES = {
  selector: {
    header: 'Agreement Duration',
    description: 'Choose how long this agreement should last before review.',
    recommendedLabel: 'Recommended',
  },
  recommendations: {
    youngerChildren: 'For children under 13, we recommend reviewing every 6 months.',
    teens: 'For teens 13+, annual reviews work well.',
  },
  display: {
    expiresOn: 'Expires on',
    noExpiry: 'This agreement has no expiry date.',
    daysRemaining: (days: number) => (days === 1 ? '1 day remaining' : `${days} days remaining`),
    expiringSoon: 'Expiring soon',
    expired: 'This agreement has expired',
  },
  annualReview: 'Annual review reminder scheduled',
} as const

/**
 * Age threshold for teen recommendations.
 */
const TEEN_AGE_THRESHOLD = 13

/**
 * Get the recommended expiry duration based on child's age.
 * AC2: 6 months for younger children, 1 year for teens
 *
 * @param childAge - Age of the child in years
 * @returns Recommended expiry duration
 */
export function getRecommendedExpiry(childAge: number): ExpiryDuration {
  if (childAge < TEEN_AGE_THRESHOLD) {
    return '6-months'
  }
  return '1-year'
}

/**
 * Calculate the expiry date based on duration.
 *
 * @param duration - The expiry duration option
 * @param startDate - The start date (defaults to now)
 * @returns The calculated expiry date, or null for no-expiry
 */
export function calculateExpiryDate(
  duration: ExpiryDuration,
  startDate: Date = new Date()
): Date | null {
  const config = EXPIRY_DURATIONS.find((d) => d.id === duration)

  if (!config || config.months === null) {
    return null
  }

  const expiryDate = new Date(startDate)
  expiryDate.setMonth(expiryDate.getMonth() + config.months)

  return expiryDate
}

/**
 * Check if an agreement is expiring soon.
 *
 * @param expiryDate - The expiry date
 * @param thresholdDays - Days before expiry to consider "soon" (default 30)
 * @returns True if expiring within threshold
 */
export function isExpiringSoon(expiryDate: Date | null, thresholdDays: number = 30): boolean {
  if (!expiryDate) {
    return false
  }

  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return daysUntilExpiry > 0 && daysUntilExpiry <= thresholdDays
}

/**
 * Get the number of days until expiry.
 *
 * @param expiryDate - The expiry date
 * @returns Days remaining, or null for no-expiry
 */
export function getDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) {
    return null
  }

  const now = new Date()
  return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get the annual review date for no-expiry agreements.
 * AC4: "No expiry" still prompts annual review reminder
 *
 * @param startDate - The agreement start date (defaults to now)
 * @returns Date for annual review reminder
 */
export function getAnnualReviewDate(startDate: Date = new Date()): Date {
  const reviewDate = new Date(startDate)
  reviewDate.setFullYear(reviewDate.getFullYear() + 1)
  return reviewDate
}
