/**
 * Reverse Mode Contract - Story 52.2
 *
 * Data types and schemas for Reverse Mode functionality.
 * Enables 16+ teens to take control of what parents can see.
 *
 * AC1: Reverse Mode Visibility (16+ only)
 * AC2: Understanding Confirmation
 * AC3: Mode Switch (child controls sharing)
 * AC4: Parent Notification
 * AC5: Deactivation
 * AC6: Audit Logging (NFR42)
 *
 * FR9: System transfers account ownership to child at age 16
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/** Reverse mode feature identifier */
export const REVERSE_MODE_FEATURE = 'reverse_mode' as const

// ============================================
// Enums
// ============================================

/**
 * Status of Reverse Mode for a child.
 * - off: Not activated (normal monitoring)
 * - pending_confirmation: Awaiting confirmation acknowledgment
 * - active: Reverse mode is active (child controls sharing)
 */
export const ReverseModeStatus = {
  OFF: 'off',
  PENDING_CONFIRMATION: 'pending_confirmation',
  ACTIVE: 'active',
} as const

export type ReverseModeStatusValue = (typeof ReverseModeStatus)[keyof typeof ReverseModeStatus]

/**
 * Types of reverse mode change events for audit logging.
 */
export const ReverseModeChangeType = {
  ACTIVATED: 'activated',
  DEACTIVATED: 'deactivated',
  CONFIRMATION_STARTED: 'confirmation_started',
  CONFIRMATION_CANCELLED: 'confirmation_cancelled',
} as const

export type ReverseModeChangeTypeValue =
  (typeof ReverseModeChangeType)[keyof typeof ReverseModeChangeType]

// ============================================
// Zod Schemas
// ============================================

/**
 * Schema for sharing preferences in reverse mode.
 * When reverse mode is active, these control what parents can see.
 */
export const ReverseModeShareingPreferencesSchema = z.object({
  /** Share screen time summary with parents */
  screenTime: z.boolean().default(false),
  /** Share flagged content alerts with parents */
  flags: z.boolean().default(false),
  /** Share screenshots with parents */
  screenshots: z.boolean().default(false),
  /** Share location data with parents */
  location: z.boolean().default(false),
})

export type ReverseModeShareingPreferences = z.infer<typeof ReverseModeShareingPreferencesSchema>

/**
 * Default sharing preferences - nothing shared when reverse mode activated.
 * AC3: default after activation: nothing shared with parents
 */
export const DEFAULT_REVERSE_MODE_SHARING: ReverseModeShareingPreferences = {
  screenTime: false,
  flags: false,
  screenshots: false,
  location: false,
}

/**
 * Schema for reverse mode settings stored per child.
 */
export const ReverseModeSettingsSchema = z.object({
  /** Current status of reverse mode */
  status: z.enum(['off', 'pending_confirmation', 'active']).default('off'),
  /** When reverse mode was activated */
  activatedAt: z.date().optional(),
  /** ID of the child who activated reverse mode */
  activatedBy: z.string().optional(),
  /** When reverse mode was deactivated */
  deactivatedAt: z.date().optional(),
  /** Current sharing preferences (only relevant when active) */
  sharingPreferences: ReverseModeShareingPreferencesSchema.optional(),
})

export type ReverseModeSettings = z.infer<typeof ReverseModeSettingsSchema>

/**
 * Default reverse mode settings - off state.
 */
export const DEFAULT_REVERSE_MODE_SETTINGS: ReverseModeSettings = {
  status: 'off',
}

/**
 * Schema for reverse mode activation request.
 * AC2: activation requires understanding confirmation
 */
export const ReverseModeActivationRequestSchema = z.object({
  /** ID of the child activating reverse mode */
  childId: z.string().min(1),
  /** Whether the child acknowledged understanding */
  confirmationAcknowledged: z.boolean(),
  /** Timestamp of the confirmation */
  confirmedAt: z.date().optional(),
})

export type ReverseModeActivationRequest = z.infer<typeof ReverseModeActivationRequestSchema>

/**
 * Schema for reverse mode deactivation request.
 * AC5: can be deactivated anytime
 */
export const ReverseModeDeactivationRequestSchema = z.object({
  /** ID of the child deactivating reverse mode */
  childId: z.string().min(1),
})

export type ReverseModeDeactivationRequest = z.infer<typeof ReverseModeDeactivationRequestSchema>

/**
 * Schema for reverse mode change event for audit logging.
 * AC6: NFR42 mode changes logged
 */
export const ReverseModeChangeEventSchema = z.object({
  /** Unique event ID */
  id: z.string().min(1),
  /** ID of the child whose mode changed */
  childId: z.string().min(1),
  /** ID of the family */
  familyId: z.string().min(1),
  /** Type of change */
  changeType: z.enum([
    'activated',
    'deactivated',
    'confirmation_started',
    'confirmation_cancelled',
  ]),
  /** When the change occurred */
  timestamp: z.date(),
  /** Previous status */
  previousStatus: z.enum(['off', 'pending_confirmation', 'active']),
  /** New status */
  newStatus: z.enum(['off', 'pending_confirmation', 'active']),
  /** IP address of requester (for audit) */
  ipAddress: z.string().optional(),
  /** User agent of requester (for audit) */
  userAgent: z.string().optional(),
})

export type ReverseModeChangeEvent = z.infer<typeof ReverseModeChangeEventSchema>

/**
 * Schema for reverse mode confirmation dialog content.
 */
export const ReverseModeConfirmationContentSchema = z.object({
  /** Dialog title */
  title: z.string(),
  /** Introduction text */
  introduction: z.string(),
  /** Steps explaining what reverse mode does */
  steps: z.array(
    z.object({
      step: z.number(),
      title: z.string(),
      description: z.string(),
    })
  ),
  /** Confirmation checkbox label */
  confirmationLabel: z.string(),
  /** Confirm button text */
  confirmButtonText: z.string(),
  /** Cancel button text */
  cancelButtonText: z.string(),
})

export type ReverseModeConfirmationContent = z.infer<typeof ReverseModeConfirmationContentSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique reverse mode event ID.
 */
export function generateReverseModeEventId(): string {
  return `rm-event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a reverse mode change event for audit logging.
 */
export function createReverseModeChangeEvent(
  childId: string,
  familyId: string,
  changeType: ReverseModeChangeTypeValue,
  previousStatus: ReverseModeStatusValue,
  newStatus: ReverseModeStatusValue,
  ipAddress?: string,
  userAgent?: string
): ReverseModeChangeEvent {
  return {
    id: generateReverseModeEventId(),
    childId,
    familyId,
    changeType,
    timestamp: new Date(),
    previousStatus,
    newStatus,
    ipAddress,
    userAgent,
  }
}

/**
 * Check if reverse mode is active.
 */
export function isReverseModeActive(settings: ReverseModeSettings | null | undefined): boolean {
  return settings?.status === 'active'
}

/**
 * Check if reverse mode is pending confirmation.
 */
export function isReverseModePending(settings: ReverseModeSettings | null | undefined): boolean {
  return settings?.status === 'pending_confirmation'
}

/**
 * Get default sharing preferences when reverse mode is activated.
 */
export function getDefaultSharingPreferences(): ReverseModeShareingPreferences {
  return { ...DEFAULT_REVERSE_MODE_SHARING }
}

// ============================================
// Confirmation Dialog Content
// ============================================

/**
 * Get the confirmation dialog content for reverse mode activation.
 * AC2: activation requires understanding confirmation
 */
export function getReverseModeConfirmationContent(): ReverseModeConfirmationContent {
  return {
    title: 'Activate Reverse Mode',
    introduction:
      'Reverse Mode puts you in control. Before activating, please understand what this means:',
    steps: [
      {
        step: 1,
        title: 'You Control What Parents See',
        description:
          "Once activated, your parents won't be able to see your activity unless you choose to share it with them. By default, nothing is shared.",
      },
      {
        step: 2,
        title: 'Default: Nothing Shared',
        description:
          'When you turn on Reverse Mode, screen time, flags, screenshots, and location data will all be hidden from parents. You can change this anytime.',
      },
      {
        step: 3,
        title: 'You Can Turn It Off Anytime',
        description:
          'Reverse Mode is not permanent. You can deactivate it at any time to return to normal monitoring. Your parents will be notified when you activate or deactivate.',
      },
    ],
    confirmationLabel: 'I understand what Reverse Mode does and want to activate it',
    confirmButtonText: 'Activate Reverse Mode',
    cancelButtonText: 'Cancel',
  }
}

// ============================================
// Notification Messages
// ============================================

/** Parent notification when teen activates reverse mode (AC4) */
export const PARENT_REVERSE_MODE_ACTIVATED_MESSAGE = 'Teen has activated reverse mode'

/** Parent notification when teen deactivates reverse mode */
export const PARENT_REVERSE_MODE_DEACTIVATED_MESSAGE = 'Teen has deactivated reverse mode'

/** Parent notification with child name */
export function getParentReverseModeActivatedMessage(childName: string): string {
  return `${childName} has activated Reverse Mode`
}

/** Parent notification with child name for deactivation */
export function getParentReverseModeDeactivatedMessage(childName: string): string {
  return `${childName} has deactivated Reverse Mode`
}

/** Link to supporting independence resources */
export const SUPPORTING_INDEPENDENCE_LINK = '/help/supporting-teen-independence'
