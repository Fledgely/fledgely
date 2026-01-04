/**
 * Child Notification Preferences Schema
 *
 * Story 41.7: Child Notification Preferences
 * - AC1: Required notifications (time limits, agreement changes)
 * - AC2: Optional notifications (trust score, weekly summary)
 * - AC3: Quiet hours for non-urgent
 * - AC5: Age-appropriate defaults
 *
 * Critical Privacy: Parents CANNOT view or modify child notification preferences.
 * These are stored under children/{childId}/ NOT users/{parentId}/
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/** Time format validation (HH:mm) */
const timeFormatSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format')

/** Default quiet hours times for children */
export const CHILD_QUIET_HOURS_DEFAULTS = {
  /** Default quiet hours start (9 PM for children) */
  start: '21:00',
  /** Default quiet hours end (7 AM) */
  end: '07:00',
} as const

/** Child notification type identifiers */
export const CHILD_NOTIFICATION_TYPES = {
  /** Required: Time limit warnings - cannot be disabled */
  TIME_LIMIT_WARNING: 'time_limit_warning',
  /** Required: Agreement changes - cannot be disabled */
  AGREEMENT_CHANGE: 'agreement_change',
  /** Optional: Trust score changes */
  TRUST_SCORE_CHANGE: 'trust_score_change',
  /** Optional: Weekly summary */
  WEEKLY_SUMMARY: 'weekly_summary',
} as const

export type ChildNotificationPreferenceType =
  (typeof CHILD_NOTIFICATION_TYPES)[keyof typeof CHILD_NOTIFICATION_TYPES]

/** Required notification types that cannot be disabled */
export const REQUIRED_CHILD_NOTIFICATION_TYPES: ChildNotificationPreferenceType[] = [
  CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING,
  CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE,
]

/** Optional notification types that can be toggled */
export const OPTIONAL_CHILD_NOTIFICATION_TYPES: ChildNotificationPreferenceType[] = [
  CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE,
  CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY,
]

// ============================================================================
// Age Bracket Logic
// ============================================================================

/** Age brackets for notification defaults */
export const AGE_BRACKETS = {
  /** Ages 8-12: Minimal notifications */
  YOUNG: { min: 8, max: 12 },
  /** Ages 13-15: Moderate notifications */
  TEEN: { min: 13, max: 15 },
  /** Ages 16+: Full notifications */
  OLDER_TEEN: { min: 16, max: 99 },
} as const

/**
 * Default notification settings by age bracket
 */
export interface ChildNotificationDefaults {
  trustScoreChangesEnabled: boolean
  weeklySummaryEnabled: boolean
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - birthDate.getFullYear()
  const monthDiff = now.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/**
 * Get age-appropriate notification defaults based on birth date.
 *
 * @param birthDate - Child's birth date
 * @returns Default notification settings for the age bracket
 */
export function getAgeAppropriateDefaults(birthDate: Date): ChildNotificationDefaults {
  const age = calculateAge(birthDate)

  if (age < 13) {
    // Ages 8-12: Minimal - reduce notification overwhelm
    return {
      trustScoreChangesEnabled: false,
      weeklySummaryEnabled: false,
    }
  } else if (age < 16) {
    // Ages 13-15: Moderate - trust score helps engagement
    return {
      trustScoreChangesEnabled: true,
      weeklySummaryEnabled: false,
    }
  } else {
    // Ages 16+: Full - preparing for independence
    return {
      trustScoreChangesEnabled: true,
      weeklySummaryEnabled: true,
    }
  }
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for child notification preferences.
 *
 * Stored at: children/{childId}/settings/notificationPreferences
 *
 * Note: Required notifications (time limits, agreement changes) are always
 * enabled and cannot be modified. This schema enforces that constraint.
 */
export const childNotificationPreferencesSchema = z.object({
  /** Unique identifier (same as childId) */
  id: z.string().min(1),
  /** Child this belongs to */
  childId: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),

  // Required notifications - always true, cannot be disabled (AC1)
  /** Time limit warnings - REQUIRED, cannot be disabled */
  timeLimitWarningsEnabled: z.literal(true).default(true),
  /** Agreement changes - REQUIRED, cannot be disabled */
  agreementChangesEnabled: z.literal(true).default(true),

  // Optional notifications (AC2)
  /** Trust score change notifications - optional */
  trustScoreChangesEnabled: z.boolean().default(false),
  /** Weekly activity summary - optional */
  weeklySummaryEnabled: z.boolean().default(false),

  // Quiet hours (AC3)
  /** Whether quiet hours are enabled */
  quietHoursEnabled: z.boolean().default(false),
  /** Quiet hours start time (HH:mm) */
  quietHoursStart: timeFormatSchema.default(CHILD_QUIET_HOURS_DEFAULTS.start),
  /** Quiet hours end time (HH:mm) */
  quietHoursEnd: timeFormatSchema.default(CHILD_QUIET_HOURS_DEFAULTS.end),

  // Timestamps
  /** When preferences were last updated */
  updatedAt: z.date(),
  /** When preferences were created */
  createdAt: z.date(),
})

/**
 * Schema for updating child notification preferences.
 *
 * Only includes optional fields - required notifications cannot be changed.
 */
export const childNotificationPreferencesUpdateSchema = z.object({
  // Optional notifications only - required ones not included
  trustScoreChangesEnabled: z.boolean().optional(),
  weeklySummaryEnabled: z.boolean().optional(),

  // Quiet hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: timeFormatSchema.optional(),
  quietHoursEnd: timeFormatSchema.optional(),
})

/**
 * Schema for get child notification preferences input.
 */
export const getChildNotificationPreferencesInputSchema = z.object({
  /** Child ID to get preferences for */
  childId: z.string().min(1),
  /** Family ID for validation */
  familyId: z.string().min(1),
})

/**
 * Schema for update child notification preferences input.
 */
export const updateChildNotificationPreferencesInputSchema = z.object({
  /** Child ID */
  childId: z.string().min(1),
  /** Family ID for validation */
  familyId: z.string().min(1),
  /** Preferences to update (only optional fields) */
  preferences: childNotificationPreferencesUpdateSchema,
})

// ============================================================================
// Types
// ============================================================================

export type ChildNotificationPreferences = z.infer<typeof childNotificationPreferencesSchema>
export type ChildNotificationPreferencesUpdate = z.infer<
  typeof childNotificationPreferencesUpdateSchema
>
export type GetChildNotificationPreferencesInput = z.infer<
  typeof getChildNotificationPreferencesInputSchema
>
export type UpdateChildNotificationPreferencesInput = z.infer<
  typeof updateChildNotificationPreferencesInputSchema
>

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default child notification preferences.
 *
 * @param childId - Child's ID
 * @param familyId - Family's ID
 * @param birthDate - Child's birth date for age-appropriate defaults
 */
export function createDefaultChildNotificationPreferences(
  childId: string,
  familyId: string,
  birthDate: Date
): ChildNotificationPreferences {
  const defaults = getAgeAppropriateDefaults(birthDate)
  const now = new Date()

  return {
    id: childId,
    childId,
    familyId,
    // Required - always true
    timeLimitWarningsEnabled: true,
    agreementChangesEnabled: true,
    // Optional - based on age
    trustScoreChangesEnabled: defaults.trustScoreChangesEnabled,
    weeklySummaryEnabled: defaults.weeklySummaryEnabled,
    // Quiet hours - disabled by default
    quietHoursEnabled: false,
    quietHoursStart: CHILD_QUIET_HOURS_DEFAULTS.start,
    quietHoursEnd: CHILD_QUIET_HOURS_DEFAULTS.end,
    // Timestamps
    updatedAt: now,
    createdAt: now,
  }
}

/**
 * Apply partial updates to existing child preferences.
 *
 * Only updates allowed optional fields - required fields are ignored.
 */
export function applyChildPreferencesUpdate(
  existing: ChildNotificationPreferences,
  update: ChildNotificationPreferencesUpdate
): ChildNotificationPreferences {
  return {
    ...existing,
    // Required - always true, never updated
    timeLimitWarningsEnabled: true,
    agreementChangesEnabled: true,
    // Optional - can be updated
    trustScoreChangesEnabled: update.trustScoreChangesEnabled ?? existing.trustScoreChangesEnabled,
    weeklySummaryEnabled: update.weeklySummaryEnabled ?? existing.weeklySummaryEnabled,
    // Quiet hours
    quietHoursEnabled: update.quietHoursEnabled ?? existing.quietHoursEnabled,
    quietHoursStart: update.quietHoursStart ?? existing.quietHoursStart,
    quietHoursEnd: update.quietHoursEnd ?? existing.quietHoursEnd,
    // Update timestamp
    updatedAt: new Date(),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if current time is within child's quiet hours.
 *
 * @param preferences - Child's notification preferences
 * @param now - Current date/time (defaults to now)
 * @returns true if in quiet hours, false otherwise
 */
export function isInChildQuietHours(
  preferences: ChildNotificationPreferences,
  now: Date = new Date()
): boolean {
  if (!preferences.quietHoursEnabled) {
    return false
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHours, startMins] = preferences.quietHoursStart.split(':').map(Number)
  const [endHours, endMins] = preferences.quietHoursEnd.split(':').map(Number)
  const startMinutes = startHours * 60 + startMins
  const endMinutes = endHours * 60 + endMins

  // Handle overnight quiet hours (e.g., 21:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  // Same-day quiet hours (e.g., 08:00 to 15:00 for school)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Check if a notification should be delivered to the child.
 *
 * @param preferences - Child's notification preferences
 * @param notificationType - Type of notification
 * @param now - Current time for quiet hours check
 * @returns true if notification should be delivered now
 */
export function shouldDeliverChildNotification(
  preferences: ChildNotificationPreferences,
  notificationType: ChildNotificationPreferenceType,
  now: Date = new Date()
): { deliver: boolean; reason?: string } {
  // Required notifications always deliver (bypass quiet hours)
  if (REQUIRED_CHILD_NOTIFICATION_TYPES.includes(notificationType)) {
    return { deliver: true }
  }

  // Check if optional notification is enabled
  switch (notificationType) {
    case CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE:
      if (!preferences.trustScoreChangesEnabled) {
        return { deliver: false, reason: 'trust_score_disabled' }
      }
      break
    case CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY:
      if (!preferences.weeklySummaryEnabled) {
        return { deliver: false, reason: 'weekly_summary_disabled' }
      }
      break
  }

  // Check quiet hours for optional notifications
  if (isInChildQuietHours(preferences, now)) {
    return { deliver: false, reason: 'quiet_hours' }
  }

  return { deliver: true }
}

/**
 * Check if a notification type is required (cannot be disabled).
 */
export function isRequiredChildNotificationType(
  notificationType: ChildNotificationPreferenceType
): boolean {
  return REQUIRED_CHILD_NOTIFICATION_TYPES.includes(notificationType)
}

/**
 * Get human-readable description of child notification preferences.
 */
export function getChildPreferencesDescription(
  preferences: ChildNotificationPreferences
): string[] {
  const descriptions: string[] = []

  // Required notifications
  descriptions.push('Time limit warnings: Always on (required)')
  descriptions.push('Agreement changes: Always on (required)')

  // Optional notifications
  descriptions.push(
    `Trust score changes: ${preferences.trustScoreChangesEnabled ? 'Enabled' : 'Disabled'}`
  )
  descriptions.push(`Weekly summary: ${preferences.weeklySummaryEnabled ? 'Enabled' : 'Disabled'}`)

  // Quiet hours
  if (preferences.quietHoursEnabled) {
    descriptions.push(`Quiet hours: ${preferences.quietHoursStart} - ${preferences.quietHoursEnd}`)
  } else {
    descriptions.push('Quiet hours: Disabled')
  }

  return descriptions
}
