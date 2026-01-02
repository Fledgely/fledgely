/**
 * Safety Signal Contracts - Story 7.5.1 Task 1
 *
 * Data models for child safety signals.
 * AC6: Signal queuing infrastructure with isolated collection
 *
 * CRITICAL SAFETY: These signals are NEVER visible to family members.
 * Signals go to external crisis partnerships only (Story 7.5.2).
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/** Number of logo taps required to trigger signal */
export const LOGO_TAP_COUNT = 5

/** Time window in milliseconds for logo taps (3 seconds) */
export const LOGO_TAP_WINDOW_MS = 3000

/** Keyboard shortcut for safety signal */
export const KEYBOARD_SHORTCUT = 'Ctrl+Shift+H'

/** Signal status values */
export const SIGNAL_STATUS = {
  /** Signal created but not yet sent (offline) */
  QUEUED: 'queued',
  /** Signal sent, awaiting external partner acknowledgment */
  PENDING: 'pending',
  /** Signal delivered to external partner */
  SENT: 'sent',
  /** External partner confirmed receipt */
  DELIVERED: 'delivered',
  /** External partner acknowledged and will respond */
  ACKNOWLEDGED: 'acknowledged',
} as const

/** Trigger method values */
export const TRIGGER_METHOD = {
  /** Logo tapped 5 times within 3 seconds */
  LOGO_TAP: 'logo_tap',
  /** Keyboard shortcut Ctrl+Shift+H */
  KEYBOARD_SHORTCUT: 'keyboard_shortcut',
  /** Swipe pattern on mobile (future) */
  SWIPE_PATTERN: 'swipe_pattern',
} as const

/** Platform values */
export const SIGNAL_PLATFORM = {
  WEB: 'web',
  CHROME_EXTENSION: 'chrome_extension',
  ANDROID: 'android',
} as const

// ============================================
// Zod Schemas
// ============================================

/** Signal status schema */
export const signalStatusSchema = z.enum([
  SIGNAL_STATUS.QUEUED,
  SIGNAL_STATUS.PENDING,
  SIGNAL_STATUS.SENT,
  SIGNAL_STATUS.DELIVERED,
  SIGNAL_STATUS.ACKNOWLEDGED,
])

/** Trigger method schema */
export const triggerMethodSchema = z.enum([
  TRIGGER_METHOD.LOGO_TAP,
  TRIGGER_METHOD.KEYBOARD_SHORTCUT,
  TRIGGER_METHOD.SWIPE_PATTERN,
])

/** Platform schema */
export const signalPlatformSchema = z.enum([
  SIGNAL_PLATFORM.WEB,
  SIGNAL_PLATFORM.CHROME_EXTENSION,
  SIGNAL_PLATFORM.ANDROID,
])

/**
 * Safety Signal Schema
 *
 * CRITICAL: NO parent-identifying data, NO screenshots, NO activity data.
 * Signal is stored in isolated collection inaccessible to family.
 */
export const safetySignalSchema = z.object({
  /** Unique signal ID */
  id: z.string().min(1),

  /** Child who triggered the signal */
  childId: z.string().min(1),

  /** Family ID for routing (NOT for family visibility) */
  familyId: z.string().min(1),

  /** Device ID if available */
  deviceId: z.string().nullable(),

  /** When the signal was triggered */
  triggeredAt: z.date(),

  /** Whether signal was created while offline */
  offlineQueued: z.boolean(),

  /** When signal was delivered to external partner */
  deliveredAt: z.date().nullable(),

  /** Current signal status */
  status: signalStatusSchema,

  /** How the signal was triggered */
  triggerMethod: triggerMethodSchema,

  /** Platform where signal originated */
  platform: signalPlatformSchema,
})

/**
 * Safety Signal Trigger Event Schema
 *
 * Records the specific trigger action for analytics (admin only).
 */
export const safetySignalTriggerEventSchema = z.object({
  /** Unique event ID */
  id: z.string().min(1),

  /** Associated signal ID */
  signalId: z.string().min(1),

  /** Child who triggered */
  childId: z.string().min(1),

  /** How the signal was triggered */
  triggerMethod: triggerMethodSchema,

  /** Platform where triggered */
  platform: signalPlatformSchema,

  /** When triggered */
  timestamp: z.date(),
})

/**
 * Offline Signal Queue Entry Schema
 *
 * For storing signals locally when offline.
 */
export const offlineSignalQueueEntrySchema = z.object({
  /** Signal to send when online */
  signal: safetySignalSchema,

  /** Number of retry attempts */
  retryCount: z.number().int().min(0),

  /** Last retry timestamp */
  lastRetryAt: z.date().nullable(),

  /** When queued */
  queuedAt: z.date(),
})

// ============================================
// Types
// ============================================

export type SignalStatus = z.infer<typeof signalStatusSchema>
export type TriggerMethod = z.infer<typeof triggerMethodSchema>
export type SignalPlatform = z.infer<typeof signalPlatformSchema>
export type SafetySignal = z.infer<typeof safetySignalSchema>
export type SafetySignalTriggerEvent = z.infer<typeof safetySignalTriggerEventSchema>
export type OfflineSignalQueueEntry = z.infer<typeof offlineSignalQueueEntrySchema>

// ============================================
// Factory Functions
// ============================================

/**
 * Generate a unique signal ID.
 */
export function generateSignalId(): string {
  return `sig_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generate a unique trigger event ID.
 */
export function generateTriggerEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Create a new safety signal.
 *
 * AC6: Signal includes childId, timestamp, deviceId, offlineQueued flag.
 *
 * @param childId - Child triggering the signal
 * @param familyId - Family ID for routing
 * @param triggerMethod - How the signal was triggered
 * @param platform - Platform where triggered
 * @param isOffline - Whether currently offline
 * @param deviceId - Optional device ID
 * @returns New SafetySignal
 */
export function createSafetySignal(
  childId: string,
  familyId: string,
  triggerMethod: TriggerMethod,
  platform: SignalPlatform,
  isOffline: boolean,
  deviceId: string | null = null
): SafetySignal {
  const signal: SafetySignal = {
    id: generateSignalId(),
    childId,
    familyId,
    deviceId,
    triggeredAt: new Date(),
    offlineQueued: isOffline,
    deliveredAt: null,
    status: isOffline ? SIGNAL_STATUS.QUEUED : SIGNAL_STATUS.PENDING,
    triggerMethod,
    platform,
  }

  return safetySignalSchema.parse(signal)
}

/**
 * Create a trigger event for analytics.
 *
 * @param signalId - Associated signal ID
 * @param childId - Child who triggered
 * @param triggerMethod - How triggered
 * @param platform - Platform
 * @returns New SafetySignalTriggerEvent
 */
export function createTriggerEvent(
  signalId: string,
  childId: string,
  triggerMethod: TriggerMethod,
  platform: SignalPlatform
): SafetySignalTriggerEvent {
  const event: SafetySignalTriggerEvent = {
    id: generateTriggerEventId(),
    signalId,
    childId,
    triggerMethod,
    platform,
    timestamp: new Date(),
  }

  return safetySignalTriggerEventSchema.parse(event)
}

/**
 * Create an offline queue entry.
 *
 * @param signal - Signal to queue
 * @returns New OfflineSignalQueueEntry
 */
export function createOfflineQueueEntry(signal: SafetySignal): OfflineSignalQueueEntry {
  const entry: OfflineSignalQueueEntry = {
    signal,
    retryCount: 0,
    lastRetryAt: null,
    queuedAt: new Date(),
  }

  return offlineSignalQueueEntrySchema.parse(entry)
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a safety signal.
 */
export function validateSafetySignal(data: unknown): SafetySignal {
  return safetySignalSchema.parse(data)
}

/**
 * Check if data is a valid safety signal.
 */
export function isSafetySignal(data: unknown): data is SafetySignal {
  return safetySignalSchema.safeParse(data).success
}

/**
 * Validate a trigger event.
 */
export function validateTriggerEvent(data: unknown): SafetySignalTriggerEvent {
  return safetySignalTriggerEventSchema.parse(data)
}

/**
 * Check if data is a valid trigger event.
 */
export function isTriggerEvent(data: unknown): data is SafetySignalTriggerEvent {
  return safetySignalTriggerEventSchema.safeParse(data).success
}

// ============================================
// Status Transition Helpers
// ============================================

/**
 * Valid status transitions.
 */
export const VALID_STATUS_TRANSITIONS: Record<SignalStatus, SignalStatus[]> = {
  [SIGNAL_STATUS.QUEUED]: [SIGNAL_STATUS.PENDING],
  [SIGNAL_STATUS.PENDING]: [SIGNAL_STATUS.SENT],
  [SIGNAL_STATUS.SENT]: [SIGNAL_STATUS.DELIVERED],
  [SIGNAL_STATUS.DELIVERED]: [SIGNAL_STATUS.ACKNOWLEDGED],
  [SIGNAL_STATUS.ACKNOWLEDGED]: [], // Terminal state
}

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(from: SignalStatus, to: SignalStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to)
}

/**
 * Get next valid status.
 */
export function getNextStatus(current: SignalStatus): SignalStatus | null {
  const validNext = VALID_STATUS_TRANSITIONS[current]
  return validNext.length > 0 ? validNext[0] : null
}
