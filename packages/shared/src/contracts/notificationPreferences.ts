/**
 * Notification Preferences Schema
 *
 * Story 41.1: Notification Preferences Configuration
 * - AC1: Flag notification toggles
 * - AC2: Time limit notification toggles
 * - AC3: Sync status toggles
 * - AC4: Quiet hours configuration
 * - AC5: Per-child preferences (FR152)
 * - AC6: Reasonable defaults
 *
 * Each guardian has their own notification preferences per child.
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/** Default notification preferences */
export const NOTIFICATION_DEFAULTS = {
  /** Critical flags always on by default */
  criticalFlagsEnabled: true,
  /** Medium flags go to hourly digest by default */
  mediumFlagsMode: 'digest' as const,
  /** Low flags off by default to reduce noise */
  lowFlagsEnabled: false,
  /** Time limit warnings on by default */
  timeLimitWarningsEnabled: true,
  /** Limit reached notifications on by default */
  limitReachedEnabled: true,
  /** Extension request notifications on by default */
  extensionRequestsEnabled: true,
  /** Sync alerts on by default */
  syncAlertsEnabled: true,
  /** Default sync threshold is 4 hours */
  syncThresholdHours: 4 as const,
  /** Device status notifications on by default (Story 41.4) */
  deviceStatusEnabled: true,
  /** Device sync recovery notifications off by default (Story 41.4) */
  deviceSyncRecoveryEnabled: false,
  /** Quiet hours off by default */
  quietHoursEnabled: false,
} as const

/** Default quiet hours times */
export const QUIET_HOURS_DEFAULTS = {
  /** Default quiet hours start (10 PM) */
  start: '22:00',
  /** Default quiet hours end (7 AM) */
  end: '07:00',
} as const

/** Available sync threshold options in hours */
export const SYNC_THRESHOLD_OPTIONS = [1, 4, 12, 24] as const

/** Medium flags mode options */
export const MEDIUM_FLAGS_MODE_OPTIONS = ['immediate', 'digest', 'off'] as const

// ============================================================================
// Schemas
// ============================================================================

/** Time format validation (HH:mm) */
const timeFormatSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:mm format')

/** Sync threshold hours enum */
export const syncThresholdHoursSchema = z.union([
  z.literal(1),
  z.literal(4),
  z.literal(12),
  z.literal(24),
])

/** Medium flags mode enum */
export const mediumFlagsModeSchema = z.enum(['immediate', 'digest', 'off'])

/**
 * Schema for parent notification preferences.
 *
 * Stored at: users/{userId}/parentNotificationPreferences/{childId|'default'}
 *
 * Note: This is distinct from notificationPreferencesSchema (Story 27.6) which
 * handles access notifications. This schema handles flags, time limits, sync alerts.
 */
export const parentNotificationPreferencesSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Guardian who owns these preferences */
  userId: z.string().min(1),
  /** Family these preferences belong to */
  familyId: z.string().min(1),
  /** Child these preferences apply to (null = family-wide defaults) */
  childId: z.string().min(1).nullable(),

  // Flag notifications (AC1)
  /** Whether critical flag notifications are enabled */
  criticalFlagsEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.criticalFlagsEnabled),
  /** How medium flags are delivered: immediate, digest, or off */
  mediumFlagsMode: mediumFlagsModeSchema.default(NOTIFICATION_DEFAULTS.mediumFlagsMode),
  /** Whether low flag notifications are enabled */
  lowFlagsEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.lowFlagsEnabled),

  // Time limit notifications (AC2)
  /** Whether time limit warning notifications are enabled */
  timeLimitWarningsEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.timeLimitWarningsEnabled),
  /** Whether limit reached notifications are enabled */
  limitReachedEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.limitReachedEnabled),
  /** Whether extension request notifications are enabled */
  extensionRequestsEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.extensionRequestsEnabled),

  // Sync alerts (AC3)
  /** Whether sync status alerts are enabled */
  syncAlertsEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.syncAlertsEnabled),
  /** Hours without sync before alert (1, 4, 12, or 24) */
  syncThresholdHours: syncThresholdHoursSchema.default(NOTIFICATION_DEFAULTS.syncThresholdHours),

  // Device status notifications (Story 41.4)
  /** Whether device status notifications are enabled */
  deviceStatusEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.deviceStatusEnabled),
  /** Whether to notify when device comes back online */
  deviceSyncRecoveryEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.deviceSyncRecoveryEnabled),

  // Quiet hours (AC4)
  /** Whether quiet hours are enabled */
  quietHoursEnabled: z.boolean().default(NOTIFICATION_DEFAULTS.quietHoursEnabled),
  /** Weekday quiet hours start time (HH:mm) */
  quietHoursStart: timeFormatSchema.default(QUIET_HOURS_DEFAULTS.start),
  /** Weekday quiet hours end time (HH:mm) */
  quietHoursEnd: timeFormatSchema.default(QUIET_HOURS_DEFAULTS.end),
  /** Whether weekend has different quiet hours */
  quietHoursWeekendDifferent: z.boolean().default(false),
  /** Weekend quiet hours start time (HH:mm), null if same as weekday */
  quietHoursWeekendStart: timeFormatSchema.nullable().default(null),
  /** Weekend quiet hours end time (HH:mm), null if same as weekday */
  quietHoursWeekendEnd: timeFormatSchema.nullable().default(null),

  // Timestamps
  /** When preferences were last updated */
  updatedAt: z.date(),
  /** When preferences were created */
  createdAt: z.date(),
})

/**
 * Schema for updating notification preferences.
 */
export const notificationPreferencesUpdateSchema = z.object({
  /** Child to update preferences for (null = family defaults) */
  childId: z.string().min(1).nullable().optional(),
  /** Apply these preferences to all children */
  applyToAllChildren: z.boolean().optional(),

  // Flag notifications
  criticalFlagsEnabled: z.boolean().optional(),
  mediumFlagsMode: mediumFlagsModeSchema.optional(),
  lowFlagsEnabled: z.boolean().optional(),

  // Time limit notifications
  timeLimitWarningsEnabled: z.boolean().optional(),
  limitReachedEnabled: z.boolean().optional(),
  extensionRequestsEnabled: z.boolean().optional(),

  // Sync alerts
  syncAlertsEnabled: z.boolean().optional(),
  syncThresholdHours: syncThresholdHoursSchema.optional(),

  // Device status notifications (Story 41.4)
  deviceStatusEnabled: z.boolean().optional(),
  deviceSyncRecoveryEnabled: z.boolean().optional(),

  // Quiet hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: timeFormatSchema.optional(),
  quietHoursEnd: timeFormatSchema.optional(),
  quietHoursWeekendDifferent: z.boolean().optional(),
  quietHoursWeekendStart: timeFormatSchema.nullable().optional(),
  quietHoursWeekendEnd: timeFormatSchema.nullable().optional(),
})

/**
 * Schema for get notification preferences input.
 */
export const getNotificationPreferencesInputSchema = z.object({
  /** Family ID to get preferences for */
  familyId: z.string().min(1),
  /** Child ID to get preferences for (null = family defaults) */
  childId: z.string().min(1).nullable().optional(),
})

/**
 * Schema for update notification preferences input.
 */
export const updateNotificationPreferencesInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Preferences to update */
  preferences: notificationPreferencesUpdateSchema,
})

// ============================================================================
// Types
// ============================================================================

export type ParentNotificationPreferences = z.infer<typeof parentNotificationPreferencesSchema>
export type NotificationPreferencesUpdate = z.infer<typeof notificationPreferencesUpdateSchema>
export type GetNotificationPreferencesInput = z.infer<typeof getNotificationPreferencesInputSchema>
export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesInputSchema
>

export type MediumFlagsMode = z.infer<typeof mediumFlagsModeSchema>
export type SyncThresholdHours = z.infer<typeof syncThresholdHoursSchema>

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default notification preferences for a user.
 */
export function createDefaultNotificationPreferences(
  userId: string,
  familyId: string,
  childId: string | null = null
): ParentNotificationPreferences {
  const now = new Date()
  return {
    id: childId ? `${userId}-${childId}` : `${userId}-default`,
    userId,
    familyId,
    childId,
    ...NOTIFICATION_DEFAULTS,
    quietHoursStart: QUIET_HOURS_DEFAULTS.start,
    quietHoursEnd: QUIET_HOURS_DEFAULTS.end,
    quietHoursWeekendDifferent: false,
    quietHoursWeekendStart: null,
    quietHoursWeekendEnd: null,
    updatedAt: now,
    createdAt: now,
  }
}

/**
 * Apply partial updates to existing preferences.
 */
export function applyPreferencesUpdate(
  existing: ParentNotificationPreferences,
  update: NotificationPreferencesUpdate
): ParentNotificationPreferences {
  return {
    ...existing,
    criticalFlagsEnabled: update.criticalFlagsEnabled ?? existing.criticalFlagsEnabled,
    mediumFlagsMode: update.mediumFlagsMode ?? existing.mediumFlagsMode,
    lowFlagsEnabled: update.lowFlagsEnabled ?? existing.lowFlagsEnabled,
    timeLimitWarningsEnabled: update.timeLimitWarningsEnabled ?? existing.timeLimitWarningsEnabled,
    limitReachedEnabled: update.limitReachedEnabled ?? existing.limitReachedEnabled,
    extensionRequestsEnabled: update.extensionRequestsEnabled ?? existing.extensionRequestsEnabled,
    syncAlertsEnabled: update.syncAlertsEnabled ?? existing.syncAlertsEnabled,
    syncThresholdHours: update.syncThresholdHours ?? existing.syncThresholdHours,
    deviceStatusEnabled: update.deviceStatusEnabled ?? existing.deviceStatusEnabled,
    deviceSyncRecoveryEnabled:
      update.deviceSyncRecoveryEnabled ?? existing.deviceSyncRecoveryEnabled,
    quietHoursEnabled: update.quietHoursEnabled ?? existing.quietHoursEnabled,
    quietHoursStart: update.quietHoursStart ?? existing.quietHoursStart,
    quietHoursEnd: update.quietHoursEnd ?? existing.quietHoursEnd,
    quietHoursWeekendDifferent:
      update.quietHoursWeekendDifferent ?? existing.quietHoursWeekendDifferent,
    quietHoursWeekendStart:
      update.quietHoursWeekendStart !== undefined
        ? update.quietHoursWeekendStart
        : existing.quietHoursWeekendStart,
    quietHoursWeekendEnd:
      update.quietHoursWeekendEnd !== undefined
        ? update.quietHoursWeekendEnd
        : existing.quietHoursWeekendEnd,
    updatedAt: new Date(),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if current time is within quiet hours.
 *
 * @param preferences - User's notification preferences
 * @param now - Current date/time (defaults to now)
 * @returns true if in quiet hours, false otherwise
 */
export function isInQuietHours(
  preferences: ParentNotificationPreferences,
  now: Date = new Date()
): boolean {
  if (!preferences.quietHoursEnabled) {
    return false
  }

  const isWeekend = now.getDay() === 0 || now.getDay() === 6
  const useWeekendHours = isWeekend && preferences.quietHoursWeekendDifferent

  const startTime = useWeekendHours
    ? (preferences.quietHoursWeekendStart ?? preferences.quietHoursStart)
    : preferences.quietHoursStart
  const endTime = useWeekendHours
    ? (preferences.quietHoursWeekendEnd ?? preferences.quietHoursEnd)
    : preferences.quietHoursEnd

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [startHours, startMins] = startTime.split(':').map(Number)
  const [endHours, endMins] = endTime.split(':').map(Number)
  const startMinutes = startHours * 60 + startMins
  const endMinutes = endHours * 60 + endMins

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  // Same-day quiet hours (e.g., 12:00 to 14:00)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Check if a notification should be sent based on preferences.
 *
 * @param preferences - User's notification preferences
 * @param notificationType - Type of notification
 * @param severity - Severity level (for flags)
 * @returns true if notification should be sent
 */
export function shouldSendNotification(
  preferences: ParentNotificationPreferences,
  notificationType:
    | 'critical_flag'
    | 'medium_flag'
    | 'low_flag'
    | 'time_warning'
    | 'limit_reached'
    | 'extension_request'
    | 'sync_alert'
): boolean {
  switch (notificationType) {
    case 'critical_flag':
      // Critical notifications always bypass quiet hours
      return preferences.criticalFlagsEnabled
    case 'medium_flag':
      return preferences.mediumFlagsMode !== 'off'
    case 'low_flag':
      return preferences.lowFlagsEnabled
    case 'time_warning':
      return preferences.timeLimitWarningsEnabled
    case 'limit_reached':
      return preferences.limitReachedEnabled
    case 'extension_request':
      return preferences.extensionRequestsEnabled
    case 'sync_alert':
      return preferences.syncAlertsEnabled
    default:
      return true
  }
}

/**
 * Get human-readable description of notification preferences.
 */
export function getPreferencesDescription(preferences: ParentNotificationPreferences): string[] {
  const descriptions: string[] = []

  if (preferences.criticalFlagsEnabled) {
    descriptions.push('Critical flags: Immediate notification')
  }

  if (preferences.mediumFlagsMode === 'immediate') {
    descriptions.push('Medium flags: Immediate notification')
  } else if (preferences.mediumFlagsMode === 'digest') {
    descriptions.push('Medium flags: Hourly digest')
  } else {
    descriptions.push('Medium flags: Off')
  }

  if (preferences.lowFlagsEnabled) {
    descriptions.push('Low flags: Enabled')
  }

  if (preferences.timeLimitWarningsEnabled) {
    descriptions.push('Time limit warnings: Enabled')
  }

  if (preferences.syncAlertsEnabled) {
    descriptions.push(`Sync alerts: After ${preferences.syncThresholdHours}h`)
  }

  if (preferences.quietHoursEnabled) {
    descriptions.push(`Quiet hours: ${preferences.quietHoursStart} - ${preferences.quietHoursEnd}`)
  }

  return descriptions
}
