/**
 * Agreement Grace Period Types and Constants - Story 35.4
 *
 * Types, schemas, and utilities for grace period handling.
 * AC1: 14-day grace period starts automatically when agreement expires
 * AC2: Monitoring continues during grace period
 */

import { z } from 'zod'

/**
 * Grace period duration in days (AC1).
 */
export const GRACE_PERIOD_DAYS = 14

/**
 * Grace period status options.
 */
export const gracePeriodStatusSchema = z.enum(['not-started', 'active', 'expired'])

export type GracePeriodStatus = z.infer<typeof gracePeriodStatusSchema>

/**
 * Grace period status constants.
 */
export const GRACE_PERIOD_STATUS = {
  NOT_STARTED: 'not-started',
  ACTIVE: 'active',
  EXPIRED: 'expired',
} as const

/**
 * Grace period info schema.
 */
export const gracePeriodInfoSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  daysRemaining: z.number(),
  status: gracePeriodStatusSchema,
})

export type GracePeriodInfo = z.infer<typeof gracePeriodInfoSchema>

/**
 * Grace period messages for UI display (AC3, AC6).
 */
export const GRACE_PERIOD_MESSAGES = {
  PARENT_BANNER:
    'Your agreement has expired. Please renew within {days} days to continue monitoring.',
  CHILD_BANNER: 'Your agreement needs renewal. Ask your parent to renew it.',
  URGENT: 'Urgent: Only {days} days left to renew your agreement!',
  MONITORING_ACTIVE: 'Monitoring continues during the grace period.',
  EXPIRED_PARENT: 'Grace period has ended. Renew now to resume monitoring.',
  EXPIRED_CHILD: 'Your agreement has expired. Monitoring is paused.',
} as const

/**
 * Grace period urgency levels.
 */
export type GracePeriodUrgency = 'normal' | 'warning' | 'critical' | 'expired'

/**
 * Grace period status configuration.
 */
export interface GracePeriodStatusConfig {
  urgency: GracePeriodUrgency
  color: 'yellow' | 'orange' | 'red' | 'gray'
  label: string
}

/**
 * Agreement type for grace period checks.
 */
export interface AgreementForGracePeriod {
  expiryDate: Date | null
  status: string
}

/**
 * Calculate the grace period end date.
 * Grace period is 14 days after the expiry date.
 */
export function getGracePeriodEndDate(expiryDate: Date): Date {
  const endDate = new Date(expiryDate)
  endDate.setDate(endDate.getDate() + GRACE_PERIOD_DAYS)
  return endDate
}

/**
 * Calculate days remaining in grace period.
 * Returns 0 if grace period has ended.
 */
export function getDaysRemainingInGracePeriod(gracePeriodEnd: Date): number {
  const now = new Date()
  const diff = gracePeriodEnd.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return Math.max(0, days)
}

/**
 * Check if agreement is currently in grace period (AC1).
 * Returns true if:
 * - Agreement has an expiry date
 * - Agreement has expired
 * - Less than 14 days have passed since expiry
 */
export function isInGracePeriod(agreement: AgreementForGracePeriod): boolean {
  if (!agreement.expiryDate) {
    return false
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Not expired yet
  if (expiryDate > now) {
    return false
  }

  // Check if within grace period
  const gracePeriodEnd = getGracePeriodEndDate(expiryDate)
  return now <= gracePeriodEnd
}

/**
 * Check if grace period has expired.
 * Returns true if agreement expired more than 14 days ago.
 */
export function hasGracePeriodExpired(agreement: AgreementForGracePeriod): boolean {
  if (!agreement.expiryDate) {
    return false
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Not expired yet
  if (expiryDate > now) {
    return false
  }

  // Check if grace period has ended
  const gracePeriodEnd = getGracePeriodEndDate(expiryDate)
  return now > gracePeriodEnd
}

/**
 * Get grace period information for an agreement.
 * Returns null if agreement hasn't expired yet.
 */
export function getGracePeriodInfo(agreement: AgreementForGracePeriod): GracePeriodInfo | null {
  if (!agreement.expiryDate) {
    return null
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Not expired yet - no grace period info
  if (expiryDate > now) {
    return null
  }

  const startDate = expiryDate
  const endDate = getGracePeriodEndDate(expiryDate)
  const daysRemaining = getDaysRemainingInGracePeriod(endDate)

  let status: GracePeriodStatus
  if (now <= endDate) {
    status = 'active'
  } else {
    status = 'expired'
  }

  return {
    startDate,
    endDate,
    daysRemaining,
    status,
  }
}

/**
 * Check if monitoring should remain active (AC2).
 * Monitoring continues if:
 * - Agreement hasn't expired yet
 * - Agreement is in grace period
 */
export function isMonitoringActiveInGracePeriod(agreement: AgreementForGracePeriod): boolean {
  // No expiry date means monitoring is always active
  if (!agreement.expiryDate) {
    return true
  }

  const now = new Date()
  const expiryDate = new Date(agreement.expiryDate)

  // Not expired yet - monitoring active
  if (expiryDate > now) {
    return true
  }

  // In grace period - monitoring still active (AC2)
  return isInGracePeriod(agreement)
}

/**
 * Get grace period status configuration for UI styling.
 * Urgency levels based on days remaining:
 * - Normal (yellow): 14-8 days
 * - Warning (orange): 7-3 days
 * - Critical (red): 2-1 days
 * - Expired (gray): 0 days
 */
export function getGracePeriodStatusConfig(daysRemaining: number): GracePeriodStatusConfig {
  if (daysRemaining === 0) {
    return {
      urgency: 'expired',
      color: 'gray',
      label: 'Grace period ended',
    }
  }

  if (daysRemaining <= 2) {
    return {
      urgency: 'critical',
      color: 'red',
      label: 'Renew immediately',
    }
  }

  if (daysRemaining <= 7) {
    return {
      urgency: 'warning',
      color: 'orange',
      label: 'Renew soon',
    }
  }

  return {
    urgency: 'normal',
    color: 'yellow',
    label: 'Renewal needed',
  }
}

/**
 * Format grace period message with days remaining.
 */
export function formatGracePeriodMessage(template: string, daysRemaining: number): string {
  return template.replace('{days}', String(daysRemaining))
}

/**
 * Get appropriate message for user role.
 */
export function getGracePeriodMessage(daysRemaining: number, role: 'parent' | 'child'): string {
  if (daysRemaining === 0) {
    return role === 'parent'
      ? GRACE_PERIOD_MESSAGES.EXPIRED_PARENT
      : GRACE_PERIOD_MESSAGES.EXPIRED_CHILD
  }

  if (role === 'child') {
    return GRACE_PERIOD_MESSAGES.CHILD_BANNER
  }

  if (daysRemaining <= 3) {
    return formatGracePeriodMessage(GRACE_PERIOD_MESSAGES.URGENT, daysRemaining)
  }

  return formatGracePeriodMessage(GRACE_PERIOD_MESSAGES.PARENT_BANNER, daysRemaining)
}
