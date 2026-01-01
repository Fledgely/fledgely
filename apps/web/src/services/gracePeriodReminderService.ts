/**
 * Grace Period Reminder Service - Story 35.4
 *
 * Service for daily reminder system during grace period.
 * AC4: Daily reminders during grace period
 */

/**
 * Grace period reminder types.
 */
export const GRACE_PERIOD_REMINDER_TYPES = {
  DAILY: 'daily',
  URGENT: 'urgent',
  FINAL: 'final',
  EXPIRED: 'expired',
} as const

export type GracePeriodReminderType =
  (typeof GRACE_PERIOD_REMINDER_TYPES)[keyof typeof GRACE_PERIOD_REMINDER_TYPES]

/**
 * Grace period reminder data.
 */
export interface GracePeriodReminder {
  agreementId: string
  familyId: string
  daysRemaining: number
  type: GracePeriodReminderType
  message: string
  createdAt: Date
}

/**
 * Agreement input for reminder creation.
 */
export interface AgreementForReminder {
  id: string
  familyId: string
  expiryDate: Date
}

/**
 * Reminder schedule entry.
 */
export interface ReminderScheduleEntry {
  day: number
  type: GracePeriodReminderType
}

/**
 * Check if a daily reminder should be sent (AC4).
 * Sends one reminder per day during grace period.
 */
export function shouldSendDailyReminder(lastReminderDate: Date | null): boolean {
  if (!lastReminderDate) {
    return true
  }

  const now = new Date()
  const lastReminder = new Date(lastReminderDate)

  // Check if last reminder was on a different day
  return (
    now.getDate() !== lastReminder.getDate() ||
    now.getMonth() !== lastReminder.getMonth() ||
    now.getFullYear() !== lastReminder.getFullYear()
  )
}

/**
 * Get reminder type based on days remaining.
 * - Daily: 14-4 days
 * - Urgent: 3-2 days
 * - Final: 1 day
 * - Expired: 0 days
 */
export function getGracePeriodReminderType(daysRemaining: number): GracePeriodReminderType {
  if (daysRemaining === 0) {
    return 'expired'
  }
  if (daysRemaining === 1) {
    return 'final'
  }
  if (daysRemaining <= 3) {
    return 'urgent'
  }
  return 'daily'
}

/**
 * Get reminder message based on days remaining.
 */
function getReminderMessage(daysRemaining: number): string {
  if (daysRemaining === 0) {
    return 'Your agreement grace period has ended. Renew now to resume monitoring.'
  }
  if (daysRemaining === 1) {
    return 'FINAL REMINDER: Your agreement expires tomorrow! Renew now to continue monitoring.'
  }
  if (daysRemaining <= 3) {
    return `URGENT: Only ${daysRemaining} days left to renew your agreement!`
  }
  return `Your agreement expired. Please renew within ${daysRemaining} days to continue monitoring.`
}

/**
 * Create a grace period reminder for an agreement.
 */
export function createGracePeriodReminder(
  agreement: AgreementForReminder,
  daysRemaining: number
): GracePeriodReminder {
  const type = getGracePeriodReminderType(daysRemaining)
  const message = getReminderMessage(daysRemaining)

  return {
    agreementId: agreement.id,
    familyId: agreement.familyId,
    daysRemaining,
    type,
    message,
    createdAt: new Date(),
  }
}

/**
 * Get the reminder schedule for grace period.
 * Returns a list of reminder entries for each day.
 */
export function getGracePeriodReminderSchedule(
  totalDaysRemaining: number
): ReminderScheduleEntry[] {
  const schedule: ReminderScheduleEntry[] = []

  for (let day = totalDaysRemaining; day >= 1; day--) {
    schedule.push({
      day,
      type: getGracePeriodReminderType(day),
    })
  }

  return schedule
}
