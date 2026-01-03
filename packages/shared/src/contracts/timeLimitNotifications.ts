/**
 * Time Limit Notification Schemas
 *
 * Story 41.3: Time Limit Notifications
 * - AC1: Time limit warning notifications
 * - AC2: Limit reached notifications
 * - AC3: Extension request notifications
 * - AC4: Child time limit notifications
 *
 * Schemas for time limit notification events and content.
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/** Time limit notification types */
export const TIME_LIMIT_NOTIFICATION_TYPES = [
  'warning',
  'limit_reached',
  'extension_request',
] as const

/** Limit types */
export const LIMIT_TYPES = ['daily_total', 'category', 'device'] as const

/** Default warning threshold in minutes */
export const DEFAULT_WARNING_MINUTES = 15

// ============================================================================
// Schemas
// ============================================================================

/** Time limit notification type enum */
export const timeLimitNotificationTypeSchema = z.enum(TIME_LIMIT_NOTIFICATION_TYPES)
export type TimeLimitNotificationType = z.infer<typeof timeLimitNotificationTypeSchema>

/** Limit type enum */
export const limitTypeSchema = z.enum(LIMIT_TYPES)
export type LimitType = z.infer<typeof limitTypeSchema>

/**
 * Schema for time limit notification events.
 *
 * Used for logging and tracking notification delivery.
 */
export const timeLimitNotificationEventSchema = z.object({
  /** Unique identifier for this notification event */
  id: z.string().min(1),
  /** Type of notification */
  type: timeLimitNotificationTypeSchema,
  /** Child this notification is about */
  childId: z.string().min(1),
  /** Child's display name */
  childName: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Device ID (for device-specific limits) */
  deviceId: z.string().min(1).optional(),
  /** Device name (for notification content) */
  deviceName: z.string().optional(),
  /** Category ID (for category-specific limits) */
  categoryId: z.string().optional(),
  /** Category name (for notification content) */
  categoryName: z.string().optional(),
  /** Type of limit being tracked */
  limitType: limitTypeSchema,
  /** Current time used in minutes */
  currentMinutes: z.number().int().min(0),
  /** Allowed time in minutes */
  allowedMinutes: z.number().int().min(1),
  /** Remaining minutes (for warnings) */
  remainingMinutes: z.number().int().min(0).optional(),
  /** Extension request ID (for extension requests) */
  extensionRequestId: z.string().optional(),
  /** Minutes requested for extension */
  extensionMinutesRequested: z.number().int().min(1).optional(),
  /** Reason provided by child for extension */
  extensionReason: z.string().max(500).optional(),
  /** When this event was created */
  createdAt: z.number(),
})

export type TimeLimitNotificationEvent = z.infer<typeof timeLimitNotificationEventSchema>

/**
 * Schema for time limit notification content sent via FCM.
 */
export const timeLimitNotificationContentSchema = z.object({
  /** Notification title */
  title: z.string().min(1),
  /** Notification body */
  body: z.string().min(1),
  /** Data payload for deep linking and actions */
  data: z.object({
    /** Type of notification for client handling */
    type: z.enum(['time_warning', 'limit_reached', 'extension_request']),
    /** Child ID for navigation */
    childId: z.string().min(1),
    /** Family ID */
    familyId: z.string().min(1),
    /** Limit type for context */
    limitType: limitTypeSchema.optional(),
    /** Extension request ID for quick actions */
    extensionRequestId: z.string().optional(),
    /** Action to perform */
    action: z.enum(['view_time', 'respond_extension']),
  }),
})

export type TimeLimitNotificationContent = z.infer<typeof timeLimitNotificationContentSchema>

/**
 * Schema for child time limit notification preferences.
 *
 * Note: Warnings are always enabled (can't be disabled by child).
 */
export const childTimeLimitNotificationPreferencesSchema = z.object({
  /** Warning notifications - always true, can't disable */
  warningNotificationsEnabled: z.literal(true).default(true),
  /** Limit reached notifications - can be toggled */
  limitReachedNotificationsEnabled: z.boolean().default(true),
})

export type ChildTimeLimitNotificationPreferences = z.infer<
  typeof childTimeLimitNotificationPreferencesSchema
>

/**
 * Schema for extension request notification params.
 */
export const extensionRequestNotificationParamsSchema = z.object({
  /** Extension request ID */
  requestId: z.string().min(1),
  /** Child making the request */
  childId: z.string().min(1),
  /** Child's display name */
  childName: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Minutes requested */
  minutesRequested: z.number().int().min(1).max(480),
  /** Optional reason from child */
  reason: z.string().max(500).optional(),
  /** Current time used in minutes */
  currentMinutes: z.number().int().min(0),
  /** Allowed time in minutes */
  allowedMinutes: z.number().int().min(1),
})

export type ExtensionRequestNotificationParams = z.infer<
  typeof extensionRequestNotificationParamsSchema
>

/**
 * Schema for time limit warning notification params.
 */
export const timeLimitWarningParamsSchema = z.object({
  /** Child approaching limit */
  childId: z.string().min(1),
  /** Child's display name */
  childName: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Type of limit */
  limitType: limitTypeSchema,
  /** Device ID (for device limits) */
  deviceId: z.string().optional(),
  /** Device name (for device limits) */
  deviceName: z.string().optional(),
  /** Category ID (for category limits) */
  categoryId: z.string().optional(),
  /** Category name (for category limits) */
  categoryName: z.string().optional(),
  /** Current minutes used */
  currentMinutes: z.number().int().min(0),
  /** Allowed minutes */
  allowedMinutes: z.number().int().min(1),
  /** Minutes remaining */
  remainingMinutes: z.number().int().min(0),
})

export type TimeLimitWarningParams = z.infer<typeof timeLimitWarningParamsSchema>

/**
 * Schema for limit reached notification params.
 */
export const limitReachedParamsSchema = z.object({
  /** Child who reached limit */
  childId: z.string().min(1),
  /** Child's display name */
  childName: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Type of limit reached */
  limitType: limitTypeSchema,
  /** Device ID (for device limits) */
  deviceId: z.string().optional(),
  /** Device name (for device limits) */
  deviceName: z.string().optional(),
  /** Category ID (for category limits) */
  categoryId: z.string().optional(),
  /** Category name (for category limits) */
  categoryName: z.string().optional(),
  /** Current minutes used */
  currentMinutes: z.number().int().min(0),
  /** Allowed minutes */
  allowedMinutes: z.number().int().min(1),
})

export type LimitReachedParams = z.infer<typeof limitReachedParamsSchema>

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build warning notification content for parents.
 */
export function buildParentWarningContent(
  params: TimeLimitWarningParams
): TimeLimitNotificationContent {
  const { childName, remainingMinutes, limitType, deviceName, categoryName } = params

  let context = ''
  if (limitType === 'device' && deviceName) {
    context = ` on ${deviceName}`
  } else if (limitType === 'category' && categoryName) {
    context = ` for ${categoryName}`
  }

  return {
    title: 'Screen Time Warning',
    body: `${childName}'s screen time${context}: ${remainingMinutes} minutes remaining`,
    data: {
      type: 'time_warning',
      childId: params.childId,
      familyId: params.familyId,
      limitType: params.limitType,
      action: 'view_time',
    },
  }
}

/**
 * Build limit reached notification content for parents.
 */
export function buildParentLimitReachedContent(
  params: LimitReachedParams
): TimeLimitNotificationContent {
  const { childName, currentMinutes, allowedMinutes, limitType, deviceName, categoryName } = params

  let limitDesc = 'daily'
  if (limitType === 'device' && deviceName) {
    limitDesc = deviceName
  } else if (limitType === 'category' && categoryName) {
    limitDesc = categoryName
  }

  const hours = Math.floor(allowedMinutes / 60)
  const mins = allowedMinutes % 60
  const allowedStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`

  const usedHours = Math.floor(currentMinutes / 60)
  const usedMins = currentMinutes % 60
  const usedStr =
    usedHours > 0 ? `${usedHours}h${usedMins > 0 ? ` ${usedMins}m` : ''}` : `${usedMins}m`

  return {
    title: 'Screen Time Limit Reached',
    body: `${childName} reached their ${limitDesc} limit (${usedStr} used of ${allowedStr} allowed)`,
    data: {
      type: 'limit_reached',
      childId: params.childId,
      familyId: params.familyId,
      limitType: params.limitType,
      action: 'view_time',
    },
  }
}

/**
 * Build extension request notification content for parents.
 */
export function buildExtensionRequestContent(
  params: ExtensionRequestNotificationParams
): TimeLimitNotificationContent {
  const { childName, minutesRequested, reason, requestId } = params

  let body = `${childName} is requesting ${minutesRequested} more minutes`
  if (reason) {
    body += ` - "${reason}"`
  }

  return {
    title: 'Time Extension Request',
    body,
    data: {
      type: 'extension_request',
      childId: params.childId,
      familyId: params.familyId,
      extensionRequestId: requestId,
      action: 'respond_extension',
    },
  }
}

/**
 * Build warning notification content for child.
 */
export function buildChildWarningContent(remainingMinutes: number): {
  title: string
  body: string
} {
  return {
    title: 'Screen Time Reminder',
    body: `You have ${remainingMinutes} minutes of screen time left today!`,
  }
}

/**
 * Build limit reached notification content for child.
 */
export function buildChildLimitReachedContent(): { title: string; body: string } {
  return {
    title: 'Screen Time Done',
    body: 'Your screen time for today is complete. Great job!',
  }
}

/**
 * Format minutes as human-readable string.
 */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}m`
  }
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}
