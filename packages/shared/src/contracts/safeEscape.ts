/**
 * Safe Escape Schema - Story 40.3
 *
 * Defines schemas for the "Safe Escape" / "Fleeing Mode" feature
 * that allows any family member to instantly disable location features
 * when they feel unsafe.
 *
 * Acceptance Criteria:
 * - AC1: Instant activation, no confirmation delay
 * - AC2: Silent operation - no notifications for 72 hours
 * - AC3: Location history clearing
 * - AC4: Delayed neutral notification after 72 hours
 * - AC5: Only activator can re-enable
 * - AC6: Children have same protections as adults
 */

import { z } from 'zod'

/**
 * 72 hours in milliseconds - the silent period before notification
 */
export const SAFE_ESCAPE_SILENT_PERIOD_MS = 72 * 60 * 60 * 1000

/**
 * 72 hours in hours - for display purposes
 */
export const SAFE_ESCAPE_SILENT_PERIOD_HOURS = 72

/**
 * Safe escape activation record schema
 */
export const safeEscapeActivationSchema = z.object({
  /** Unique activation ID */
  id: z.string().min(1),
  /** Family this activation belongs to */
  familyId: z.string().min(1),
  /** User ID of person who activated (parent or child) */
  activatedBy: z.string().min(1),
  /** Timestamp when activated */
  activatedAt: z.date(),
  /** Timestamp when 72-hour notification was sent (null if not yet sent) */
  notificationSentAt: z.date().nullable(),
  /** Whether location history was cleared on activation */
  clearedLocationHistory: z.boolean().default(true),
  /** Timestamp when re-enabled (null if still active) */
  reenabledAt: z.date().nullable(),
  /** User ID who re-enabled (must match activatedBy) */
  reenabledBy: z.string().min(1).nullable(),
})

export type SafeEscapeActivation = z.infer<typeof safeEscapeActivationSchema>

/**
 * Input schema for activating safe escape
 */
export const activateSafeEscapeInputSchema = z.object({
  /** Family ID to activate safe escape for */
  familyId: z.string().min(1),
})

export type ActivateSafeEscapeInput = z.infer<typeof activateSafeEscapeInputSchema>

/**
 * Response schema for activate safe escape
 */
export const activateSafeEscapeResponseSchema = z.object({
  /** Whether activation succeeded */
  success: z.boolean(),
  /** Activation ID */
  activationId: z.string().min(1),
  /** Status message */
  message: z.string(),
  /** Timestamp when notification will be sent */
  notificationScheduledAt: z.date(),
})

export type ActivateSafeEscapeResponse = z.infer<typeof activateSafeEscapeResponseSchema>

/**
 * Input schema for re-enabling after safe escape
 */
export const reenableSafeEscapeInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Activation ID to re-enable */
  activationId: z.string().min(1),
})

export type ReenableSafeEscapeInput = z.infer<typeof reenableSafeEscapeInputSchema>

/**
 * Response schema for re-enable safe escape
 */
export const reenableSafeEscapeResponseSchema = z.object({
  /** Whether re-enable succeeded */
  success: z.boolean(),
  /** Status message */
  message: z.string(),
})

export type ReenableSafeEscapeResponse = z.infer<typeof reenableSafeEscapeResponseSchema>

/**
 * Schema for safe escape status (visible only to activator)
 */
export const safeEscapeStatusSchema = z.object({
  /** Whether safe escape is currently active */
  isActive: z.boolean(),
  /** Activation record if active */
  activation: safeEscapeActivationSchema.nullable(),
  /** Hours remaining until notification */
  hoursUntilNotification: z.number().min(0).nullable(),
  /** Whether current user can re-enable (only if they activated) */
  canReenable: z.boolean(),
})

export type SafeEscapeStatus = z.infer<typeof safeEscapeStatusSchema>

/**
 * Calculate hours remaining until notification is sent
 */
export function calculateHoursUntilNotification(activatedAt: Date): number {
  const notificationTime = new Date(activatedAt.getTime() + SAFE_ESCAPE_SILENT_PERIOD_MS)
  const now = new Date()
  const remainingMs = notificationTime.getTime() - now.getTime()
  return Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000)))
}

/**
 * Check if notification should be sent (72 hours passed)
 */
export function shouldSendNotification(activatedAt: Date): boolean {
  const notificationTime = new Date(activatedAt.getTime() + SAFE_ESCAPE_SILENT_PERIOD_MS)
  return new Date() >= notificationTime
}

/**
 * Neutral notification message (no indication of emergency)
 */
export const SAFE_ESCAPE_NOTIFICATION_MESSAGE = 'Location features paused'

/**
 * Child-friendly activation messages
 */
export const SAFE_ESCAPE_CHILD_MESSAGES = {
  buttonLabel: 'I Need to Hide',
  activatedMessage: "You're hidden. Location features are off.",
  countdownMessage: (hours: number) =>
    `Your family will see "Location paused" in ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
  reenableLabel: 'Turn Location Back On',
} as const

/**
 * Adult activation messages
 */
export const SAFE_ESCAPE_ADULT_MESSAGES = {
  buttonLabel: 'Safe Escape',
  activatedMessage: 'Safe Escape active. All location features disabled.',
  countdownMessage: (hours: number) =>
    `Neutral notification in ${hours} ${hours === 1 ? 'hour' : 'hours'}`,
  reenableLabel: 'Re-enable Location Features',
} as const
