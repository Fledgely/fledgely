/**
 * Renewal Reminder Types and Constants - Story 35.2
 *
 * Types, schemas, and utilities for renewal reminder configuration.
 * AC1: Reminder at 30 days
 * AC2: Reminder at 7 days
 * AC3: Reminder at 1 day
 * AC6: Snooze option (3 days)
 */

import { z } from 'zod'

/**
 * Reminder threshold constants in days.
 * AC1, AC2, AC3: 30 days, 7 days, 1 day
 */
export const REMINDER_THRESHOLDS = {
  THIRTY_DAYS: 30,
  SEVEN_DAYS: 7,
  ONE_DAY: 1,
} as const

/**
 * Snooze duration in days.
 * AC6: "Remind me in 3 days"
 */
export const SNOOZE_DURATION_DAYS = 3

/**
 * Schema for reminder type options.
 */
export const reminderTypeSchema = z.enum(['30-day', '7-day', '1-day'])

export type ReminderType = z.infer<typeof reminderTypeSchema>

/**
 * Schema for reminder status.
 */
export const reminderStatusSchema = z.enum(['pending', 'shown', 'dismissed', 'snoozed', 'actioned'])

export type ReminderStatus = z.infer<typeof reminderStatusSchema>

/**
 * Snooze information for a reminder.
 */
export interface SnoozeInfo {
  snoozedAt: Date
  reminderType: ReminderType
}

/**
 * Reminder configuration with metadata.
 */
export interface ReminderConfig {
  type: ReminderType
  thresholdDays: number
  message: string
  childMessage: string
  urgency: 'info' | 'warning' | 'critical'
  canSnooze: boolean
}

/**
 * Reminder messages for each threshold.
 * AC1, AC2, AC3: Messages for 30-day, 7-day, 1-day
 */
export const REMINDER_MESSAGES = {
  '30-day': 'Agreement expires in 30 days',
  '7-day': 'Renew your agreement this week',
  '1-day': 'Agreement expires tomorrow',
  child: {
    '30-day': "Your agreement expires in about a month. Let's talk about renewing it!",
    '7-day': 'Time to renew your agreement this week!',
    '1-day': 'Your agreement expires tomorrow! Talk to your parent about renewing.',
  },
  snooze: 'Remind me in 3 days',
  renewNow: 'Renew Now',
} as const

/**
 * Available reminder configurations.
 */
export const REMINDER_CONFIGS: ReminderConfig[] = [
  {
    type: '30-day',
    thresholdDays: REMINDER_THRESHOLDS.THIRTY_DAYS,
    message: REMINDER_MESSAGES['30-day'],
    childMessage: REMINDER_MESSAGES.child['30-day'],
    urgency: 'info',
    canSnooze: true,
  },
  {
    type: '7-day',
    thresholdDays: REMINDER_THRESHOLDS.SEVEN_DAYS,
    message: REMINDER_MESSAGES['7-day'],
    childMessage: REMINDER_MESSAGES.child['7-day'],
    urgency: 'warning',
    canSnooze: true,
  },
  {
    type: '1-day',
    thresholdDays: REMINDER_THRESHOLDS.ONE_DAY,
    message: REMINDER_MESSAGES['1-day'],
    childMessage: REMINDER_MESSAGES.child['1-day'],
    urgency: 'critical',
    canSnooze: false, // Too urgent to snooze
  },
] as const

/**
 * Get the reminder type based on days until expiry.
 * Logic:
 * - >= 30 days: "30-day" reminder (info)
 * - >= 7 and < 30 days: "7-day" reminder (warning)
 * - >= 1 and < 7 days: "1-day" reminder (critical)
 * - < 1 day: null (expired)
 *
 * @param expiryDate - The agreement expiry date
 * @returns The reminder type or null if expired/no-expiry
 */
export function getReminderType(expiryDate: Date | null): ReminderType | null {
  if (!expiryDate) {
    return null
  }

  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 1) {
    return null // Expired
  }

  // 1-6 days: critical "1-day" reminder
  if (daysUntilExpiry < REMINDER_THRESHOLDS.SEVEN_DAYS) {
    return '1-day'
  }

  // 7-29 days: warning "7-day" reminder
  if (daysUntilExpiry < REMINDER_THRESHOLDS.THIRTY_DAYS) {
    return '7-day'
  }

  // 30+ days: info "30-day" reminder
  return '30-day'
}

/**
 * Calculate when a snooze period expires.
 *
 * @param snoozedAt - When the reminder was snoozed
 * @returns Date when snooze expires
 */
export function calculateSnoozeExpiry(snoozedAt: Date): Date {
  const expiry = new Date(snoozedAt)
  expiry.setDate(expiry.getDate() + SNOOZE_DURATION_DAYS)
  return expiry
}

/**
 * Check if a snooze period has expired.
 *
 * @param snoozedAt - When the reminder was snoozed
 * @returns True if snooze period has passed
 */
export function isSnoozeExpired(snoozedAt: Date): boolean {
  const now = new Date()
  const expiry = calculateSnoozeExpiry(snoozedAt)
  return now >= expiry
}

/**
 * Determine if a reminder should be shown.
 *
 * @param expiryDate - The agreement expiry date
 * @param snoozeInfo - Optional snooze information
 * @returns True if reminder should be shown
 */
export function shouldShowReminder(expiryDate: Date | null, snoozeInfo?: SnoozeInfo): boolean {
  if (!expiryDate) {
    return false
  }

  const currentType = getReminderType(expiryDate)

  if (!currentType) {
    return false // Expired or no reminder due
  }

  // If snoozed, check if snooze expired or if we're in a different reminder zone
  if (snoozeInfo) {
    const { snoozedAt, reminderType: snoozedType } = snoozeInfo

    // If we're now in a different (more urgent) reminder zone, show it
    if (currentType !== snoozedType) {
      return true
    }

    // Same reminder type - check if snooze expired
    return isSnoozeExpired(snoozedAt)
  }

  return true
}

/**
 * Get the reminder configuration for a type.
 *
 * @param type - The reminder type
 * @returns The reminder configuration
 */
export function getReminderConfig(type: ReminderType): ReminderConfig {
  const config = REMINDER_CONFIGS.find((c) => c.type === type)
  if (!config) {
    throw new Error(`Unknown reminder type: ${type}`)
  }
  return config
}
