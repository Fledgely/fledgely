/**
 * Renewal Reminder Service - Story 35.2
 *
 * Service for managing renewal reminder states and calculations.
 * AC1: Reminder at 30 days
 * AC2: Reminder at 7 days
 * AC3: Reminder at 1 day
 * AC5: One-tap "Renew now" action
 * AC6: Snooze option
 */

import {
  getReminderType,
  getReminderConfig,
  calculateSnoozeExpiry,
  RENEWAL_REMINDER_MESSAGES,
  type ReminderType,
} from '@fledgely/shared'

/**
 * Urgency level for reminder display styling.
 */
export type ReminderUrgency = 'info' | 'warning' | 'critical'

/**
 * Active reminder information.
 */
export interface ActiveReminder {
  type: ReminderType
  message: string
  daysUntilExpiry: number
  urgency: ReminderUrgency
  canSnooze: boolean
}

/**
 * Display information for a reminder.
 */
export interface ReminderDisplayInfo {
  message: string
  urgency: ReminderUrgency
  actionLabel: string
  snoozeLabel: string | null
}

/**
 * Get the currently active reminder for an agreement.
 *
 * @param expiryDate - Agreement expiry date
 * @param snoozeInfo - Optional snooze state
 * @returns Active reminder or null
 */
export function getActiveReminder(expiryDate: Date | null): ActiveReminder | null {
  if (!expiryDate) {
    return null
  }

  const type = getReminderType(expiryDate)
  if (!type) {
    return null
  }

  const config = getReminderConfig(type)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  return {
    type,
    message: config.message,
    daysUntilExpiry,
    urgency: config.urgency,
    canSnooze: config.canSnooze,
  }
}

/**
 * Get display information for a reminder.
 *
 * @param expiryDate - Agreement expiry date
 * @param variant - 'parent' or 'child' for appropriate messaging
 * @returns Display info or null
 */
export function getReminderDisplayInfo(
  expiryDate: Date | null,
  variant: 'parent' | 'child' = 'parent'
): ReminderDisplayInfo | null {
  if (!expiryDate) {
    return null
  }

  const type = getReminderType(expiryDate)
  if (!type) {
    return null
  }

  const config = getReminderConfig(type)

  const message = variant === 'child' ? config.childMessage : config.message

  return {
    message,
    urgency: config.urgency,
    actionLabel: RENEWAL_REMINDER_MESSAGES.renewNow,
    snoozeLabel: config.canSnooze ? RENEWAL_REMINDER_MESSAGES.snooze : null,
  }
}

/**
 * Check if a reminder type can be snoozed.
 *
 * @param type - Reminder type
 * @returns True if snooze is allowed
 */
export function canSnoozeReminder(type: ReminderType): boolean {
  const config = getReminderConfig(type)
  return config.canSnooze
}

/**
 * Format a reminder message with days count.
 *
 * @param type - Reminder type
 * @param days - Days until expiry
 * @returns Formatted message
 */
export function formatReminderMessage(type: ReminderType, days: number): string {
  if (type === '1-day' && days === 1) {
    return 'Your agreement expires tomorrow!'
  }

  if (type === '1-day') {
    return `Your agreement expires in ${days} days!`
  }

  if (type === '7-day') {
    return `Your agreement expires in ${days} days. Time to renew!`
  }

  return `Your agreement expires in ${days} days. Consider renewing soon.`
}

/**
 * Get the urgency level for a reminder type.
 *
 * @param type - Reminder type
 * @returns Urgency level
 */
export function getReminderUrgency(type: ReminderType): ReminderUrgency {
  const config = getReminderConfig(type)
  return config.urgency
}

/**
 * Get a human-readable display of when snooze expires.
 *
 * @param snoozedAt - When reminder was snoozed
 * @returns Display string
 */
export function getSnoozeExpiryDisplay(snoozedAt: Date): string {
  const expiryDate = calculateSnoozeExpiry(snoozedAt)
  const formatted = expiryDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return `Snoozed until ${formatted} (3 days)`
}
