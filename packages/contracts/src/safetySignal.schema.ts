/**
 * Safety Signal Schema
 *
 * Story 7.5.1: Hidden Safety Signal Access
 *
 * Defines schemas for child safety signal functionality.
 * Safety signals allow children to discreetly signal distress
 * to external resources without any family member knowing.
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 * - Signals stored in separate collection (NOT under /families)
 * - Uses separate encryption, NOT family encryption keys
 * - No Firestore Security Rule allows family member read access
 * - Signals do not appear in any family audit trail
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/**
 * Safety signal system constants
 */
export const SAFETY_SIGNAL_CONSTANTS = {
  /** Collection name for safety signals (isolated from family data) */
  COLLECTION: 'safety-signals',
  /** Collection name for queued signals (device-side) */
  QUEUE_COLLECTION: 'safety-signal-queue',

  // Gesture detection constants
  /** Number of taps required for logo gesture */
  TAP_COUNT_REQUIRED: 5,
  /** Maximum time window for tap gesture (ms) */
  TAP_WINDOW_MS: 3000,
  /** Number of keyboard shortcut presses required */
  KEYBOARD_PRESSES_REQUIRED: 3,
  /** Maximum time window for keyboard gesture (ms) */
  KEYBOARD_WINDOW_MS: 3000,
  /** Debounce time to prevent accidental triggers (ms) */
  DEBOUNCE_MS: 500,

  // Retry and queue constants
  /** Maximum retry attempts for signal delivery */
  MAX_RETRY_ATTEMPTS: 5,
  /** Base retry delay in milliseconds */
  BASE_RETRY_DELAY_MS: 1000,
  /** Maximum retry delay in milliseconds */
  MAX_RETRY_DELAY_MS: 30000,
  /** Queue retention in milliseconds (7 days) */
  QUEUE_RETENTION_MS: 7 * 24 * 60 * 60 * 1000,

  // Signal constants
  /** Minimum time between signals from same child (ms) - prevents abuse */
  MIN_SIGNAL_INTERVAL_MS: 60000,
  /** Signal confirmation display time (ms) */
  CONFIRMATION_DISPLAY_MS: 3000,
} as const

/**
 * Gesture type labels (internal use only - not shown to parents)
 */
export const GESTURE_TYPE_LABELS = {
  tap: 'Tap Gesture',
  keyboard: 'Keyboard Shortcut',
} as const

/**
 * Signal status labels (internal use only - not shown to parents)
 */
export const SIGNAL_STATUS_LABELS = {
  queued: 'Queued',
  sending: 'Sending',
  sent: 'Sent',
  received: 'Received',
  acknowledged: 'Acknowledged',
  failed: 'Failed',
} as const

/**
 * Device type labels
 */
export const SIGNAL_DEVICE_TYPE_LABELS = {
  web: 'Web Browser',
  chrome: 'Chrome Extension',
  android: 'Android App',
  ios: 'iOS App',
} as const

// ============================================================================
// Gesture Schemas
// ============================================================================

/**
 * Type of gesture used to trigger safety signal
 */
export const gestureTypeSchema = z.enum(['tap', 'keyboard'])

export type GestureType = z.infer<typeof gestureTypeSchema>

/**
 * Device type for signal origin
 */
export const signalDeviceTypeSchema = z.enum(['web', 'chrome', 'android', 'ios'])

export type SignalDeviceType = z.infer<typeof signalDeviceTypeSchema>

/**
 * Safety signal status
 */
export const signalStatusSchema = z.enum([
  'queued', // Signal queued locally (offline or pending)
  'sending', // Signal being sent to server
  'sent', // Signal successfully sent to server
  'received', // Signal received by external partner
  'acknowledged', // External partner acknowledged receipt
  'failed', // Signal delivery permanently failed
])

export type SignalStatus = z.infer<typeof signalStatusSchema>

/**
 * Gesture detection state for tracking tap/keyboard progress
 */
export const gestureDetectionStateSchema = z.object({
  /** Number of gesture actions detected */
  count: z.number().int().min(0),
  /** Timestamp of first action in current sequence */
  startTime: z.number().nullable(),
  /** Timestamp of last action */
  lastTime: z.number().nullable(),
  /** Type of gesture being detected */
  gestureType: gestureTypeSchema,
})

export type GestureDetectionState = z.infer<typeof gestureDetectionStateSchema>

// ============================================================================
// Safety Signal Core Schemas
// ============================================================================

/**
 * Safety signal - the core signal document
 *
 * CRITICAL: This document is stored in /safety-signals/{signalId}
 * NOT under /families or any family-accessible path.
 */
export const safetySignalSchema = z.object({
  /** Unique signal ID */
  id: z.string().min(1),
  /** Child ID (reference only - no family data) */
  childId: z.string().min(1),
  /** Timestamp when signal was triggered */
  triggeredAt: z.date(),
  /** Device type where signal was triggered */
  deviceType: signalDeviceTypeSchema,
  /** Type of gesture used */
  gestureType: gestureTypeSchema,
  /** Current signal status */
  status: signalStatusSchema,
  /** Jurisdiction for routing (state/country code) */
  jurisdiction: z.string().nullable(),
  /** Encrypted payload (additional context, encrypted separately) */
  encryptedPayload: z.string().nullable(),
  /** Timestamp when signal was sent to external partner */
  sentAt: z.date().nullable(),
  /** Timestamp when external partner acknowledged */
  acknowledgedAt: z.date().nullable(),
  /** Number of delivery attempts */
  deliveryAttempts: z.number().int().min(0),
  /** Last error message (if failed) */
  lastError: z.string().nullable(),
})

export type SafetySignal = z.infer<typeof safetySignalSchema>

/**
 * Firestore-compatible safety signal schema
 */
export const safetySignalFirestoreSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  triggeredAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  deviceType: signalDeviceTypeSchema,
  gestureType: gestureTypeSchema,
  status: signalStatusSchema,
  jurisdiction: z.string().nullable(),
  encryptedPayload: z.string().nullable(),
  sentAt: z
    .custom<{ toDate: () => Date }>(
      (val) =>
        val === null || (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .nullable(),
  acknowledgedAt: z
    .custom<{ toDate: () => Date }>(
      (val) =>
        val === null || (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .nullable(),
  deliveryAttempts: z.number().int().min(0),
  lastError: z.string().nullable(),
})

export type SafetySignalFirestore = z.infer<typeof safetySignalFirestoreSchema>

// ============================================================================
// Queue Schemas (Client-Side)
// ============================================================================

/**
 * Queued safety signal - stored locally when offline
 *
 * This is stored in encrypted IndexedDB on the device.
 */
export const queuedSafetySignalSchema = z.object({
  /** Local queue ID */
  queueId: z.string().min(1),
  /** Child ID */
  childId: z.string().min(1),
  /** Timestamp when signal was triggered (ISO string) */
  triggeredAt: z.string(),
  /** Device type */
  deviceType: signalDeviceTypeSchema,
  /** Gesture type used */
  gestureType: gestureTypeSchema,
  /** Jurisdiction for routing */
  jurisdiction: z.string().nullable(),
  /** Number of send attempts */
  attempts: z.number().int().min(0),
  /** Last attempt timestamp (ISO string) */
  lastAttemptAt: z.string().nullable(),
  /** Next scheduled retry (ISO string) */
  nextRetryAt: z.string().nullable(),
  /** Queue entry creation time (ISO string) */
  createdAt: z.string(),
})

export type QueuedSafetySignal = z.infer<typeof queuedSafetySignalSchema>

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input for triggering a safety signal
 */
export const triggerSafetySignalInputSchema = z.object({
  /** Child ID triggering the signal */
  childId: z.string().min(1, 'Child ID is required'),
  /** Device type */
  deviceType: signalDeviceTypeSchema,
  /** Gesture type used */
  gestureType: gestureTypeSchema,
  /** Jurisdiction (state/country) - optional, will be detected if not provided */
  jurisdiction: z.string().nullable().optional(),
})

export type TriggerSafetySignalInput = z.infer<typeof triggerSafetySignalInputSchema>

/**
 * Response after triggering a safety signal
 *
 * CRITICAL: This response contains NO identifying information
 * that could leak to parents through logs or errors.
 */
export const triggerSafetySignalResponseSchema = z.object({
  /** Whether the signal was queued successfully */
  success: z.boolean(),
  /** Queue ID for local tracking (NOT the server signal ID) */
  queueId: z.string().nullable(),
  /** Whether the signal was sent immediately or queued */
  queued: z.boolean(),
})

export type TriggerSafetySignalResponse = z.infer<typeof triggerSafetySignalResponseSchema>

// ============================================================================
// Gesture Configuration Schema
// ============================================================================

/**
 * Configuration for gesture detection
 *
 * Used to customize gesture behavior per platform if needed.
 */
export const gestureConfigSchema = z.object({
  /** Number of taps required for logo gesture */
  tapCountRequired: z.number().int().min(3).max(10).default(5),
  /** Maximum time window for tap gesture (ms) */
  tapWindowMs: z.number().int().min(1000).max(10000).default(3000),
  /** Number of keyboard shortcut presses required */
  keyboardPressesRequired: z.number().int().min(2).max(5).default(3),
  /** Maximum time window for keyboard gesture (ms) */
  keyboardWindowMs: z.number().int().min(1000).max(10000).default(3000),
  /** Debounce time to prevent accidental triggers (ms) */
  debounceMs: z.number().int().min(100).max(2000).default(500),
})

export type GestureConfig = z.infer<typeof gestureConfigSchema>

/**
 * Default gesture configuration
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  tapCountRequired: SAFETY_SIGNAL_CONSTANTS.TAP_COUNT_REQUIRED,
  tapWindowMs: SAFETY_SIGNAL_CONSTANTS.TAP_WINDOW_MS,
  keyboardPressesRequired: SAFETY_SIGNAL_CONSTANTS.KEYBOARD_PRESSES_REQUIRED,
  keyboardWindowMs: SAFETY_SIGNAL_CONSTANTS.KEYBOARD_WINDOW_MS,
  debounceMs: SAFETY_SIGNAL_CONSTANTS.DEBOUNCE_MS,
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get gesture type label
 */
export function getGestureTypeLabel(type: GestureType): string {
  return GESTURE_TYPE_LABELS[type]
}

/**
 * Get signal status label
 */
export function getSignalStatusLabel(status: SignalStatus): string {
  return SIGNAL_STATUS_LABELS[status]
}

/**
 * Get signal device type label
 */
export function getSignalDeviceTypeLabel(deviceType: SignalDeviceType): string {
  return SIGNAL_DEVICE_TYPE_LABELS[deviceType]
}

/**
 * Convert Firestore safety signal to regular schema
 */
export function convertFirestoreToSafetySignal(data: SafetySignalFirestore): SafetySignal {
  return {
    id: data.id,
    childId: data.childId,
    triggeredAt: data.triggeredAt.toDate(),
    deviceType: data.deviceType,
    gestureType: data.gestureType,
    status: data.status,
    jurisdiction: data.jurisdiction,
    encryptedPayload: data.encryptedPayload,
    sentAt: data.sentAt?.toDate() ?? null,
    acknowledgedAt: data.acknowledgedAt?.toDate() ?? null,
    deliveryAttempts: data.deliveryAttempts,
    lastError: data.lastError,
  }
}

/**
 * Safely parse safety signal
 */
export function safeParseSafetySignal(input: unknown): SafetySignal | null {
  const result = safetySignalSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse queued safety signal
 */
export function safeParseQueuedSafetySignal(input: unknown): QueuedSafetySignal | null {
  const result = queuedSafetySignalSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse trigger safety signal input
 */
export function safeParseTriggerSafetySignalInput(
  input: unknown
): TriggerSafetySignalInput | null {
  const result = triggerSafetySignalInputSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Validate trigger safety signal input
 */
export function validateTriggerSafetySignalInput(input: unknown): TriggerSafetySignalInput {
  return triggerSafetySignalInputSchema.parse(input)
}

/**
 * Check if gesture detection is complete
 */
export function isGestureComplete(state: GestureDetectionState, config: GestureConfig): boolean {
  const requiredCount =
    state.gestureType === 'tap' ? config.tapCountRequired : config.keyboardPressesRequired

  return state.count >= requiredCount
}

/**
 * Check if gesture sequence has timed out
 */
export function isGestureTimedOut(state: GestureDetectionState, config: GestureConfig): boolean {
  if (!state.startTime || !state.lastTime) {
    return false
  }

  const window =
    state.gestureType === 'tap' ? config.tapWindowMs : config.keyboardWindowMs

  const elapsed = state.lastTime - state.startTime
  return elapsed > window
}

/**
 * Calculate next retry delay with exponential backoff
 */
export function calculateRetryDelay(attempts: number): number {
  const baseDelay = SAFETY_SIGNAL_CONSTANTS.BASE_RETRY_DELAY_MS
  const maxDelay = SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_DELAY_MS

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempts)
  const jitter = Math.random() * 0.2 * exponentialDelay // 20% jitter
  const delay = exponentialDelay + jitter

  return Math.min(delay, maxDelay)
}

/**
 * Check if signal can be retried
 */
export function canRetrySignal(signal: QueuedSafetySignal): boolean {
  return signal.attempts < SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_ATTEMPTS
}

/**
 * Create initial gesture detection state
 */
export function createInitialGestureState(gestureType: GestureType): GestureDetectionState {
  return {
    count: 0,
    startTime: null,
    lastTime: null,
    gestureType,
  }
}

/**
 * Reset gesture detection state
 */
export function resetGestureState(state: GestureDetectionState): GestureDetectionState {
  return {
    count: 0,
    startTime: null,
    lastTime: null,
    gestureType: state.gestureType,
  }
}

/**
 * Increment gesture detection state
 */
export function incrementGestureState(
  state: GestureDetectionState,
  timestamp: number
): GestureDetectionState {
  return {
    ...state,
    count: state.count + 1,
    startTime: state.startTime ?? timestamp,
    lastTime: timestamp,
  }
}

/**
 * Generate a queue ID for local signal storage
 */
export function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}
