/**
 * Safety Signal Schema Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 1
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  SAFETY_SIGNAL_CONSTANTS,
  GESTURE_TYPE_LABELS,
  SIGNAL_STATUS_LABELS,
  SIGNAL_DEVICE_TYPE_LABELS,
  DEFAULT_GESTURE_CONFIG,
  // Schemas
  gestureTypeSchema,
  signalDeviceTypeSchema,
  signalStatusSchema,
  gestureDetectionStateSchema,
  safetySignalSchema,
  queuedSafetySignalSchema,
  triggerSafetySignalInputSchema,
  triggerSafetySignalResponseSchema,
  gestureConfigSchema,
  // Helper functions
  getGestureTypeLabel,
  getSignalStatusLabel,
  getSignalDeviceTypeLabel,
  convertFirestoreToSafetySignal,
  safeParseSafetySignal,
  safeParseQueuedSafetySignal,
  safeParseTriggerSafetySignalInput,
  validateTriggerSafetySignalInput,
  isGestureComplete,
  isGestureTimedOut,
  calculateRetryDelay,
  canRetrySignal,
  createInitialGestureState,
  resetGestureState,
  incrementGestureState,
  generateQueueId,
  // Types
  type GestureType,
  type SignalDeviceType,
  type SignalStatus,
  type GestureDetectionState,
  type SafetySignal,
  type QueuedSafetySignal,
  type GestureConfig,
} from './safetySignal.schema'

// ============================================================================
// Constants Tests
// ============================================================================

describe('Safety Signal Constants', () => {
  it('has required gesture detection constants', () => {
    expect(SAFETY_SIGNAL_CONSTANTS.TAP_COUNT_REQUIRED).toBe(5)
    expect(SAFETY_SIGNAL_CONSTANTS.TAP_WINDOW_MS).toBe(3000)
    expect(SAFETY_SIGNAL_CONSTANTS.KEYBOARD_PRESSES_REQUIRED).toBe(3)
    expect(SAFETY_SIGNAL_CONSTANTS.KEYBOARD_WINDOW_MS).toBe(3000)
    expect(SAFETY_SIGNAL_CONSTANTS.DEBOUNCE_MS).toBe(500)
  })

  it('has required queue constants', () => {
    expect(SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_ATTEMPTS).toBe(5)
    expect(SAFETY_SIGNAL_CONSTANTS.BASE_RETRY_DELAY_MS).toBe(1000)
    expect(SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_DELAY_MS).toBe(30000)
    expect(SAFETY_SIGNAL_CONSTANTS.QUEUE_RETENTION_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('has collection names', () => {
    expect(SAFETY_SIGNAL_CONSTANTS.COLLECTION).toBe('safety-signals')
    expect(SAFETY_SIGNAL_CONSTANTS.QUEUE_COLLECTION).toBe('safety-signal-queue')
  })

  it('has gesture type labels', () => {
    expect(GESTURE_TYPE_LABELS.tap).toBe('Tap Gesture')
    expect(GESTURE_TYPE_LABELS.keyboard).toBe('Keyboard Shortcut')
  })

  it('has signal status labels', () => {
    expect(SIGNAL_STATUS_LABELS.queued).toBe('Queued')
    expect(SIGNAL_STATUS_LABELS.sent).toBe('Sent')
    expect(SIGNAL_STATUS_LABELS.failed).toBe('Failed')
  })

  it('has device type labels', () => {
    expect(SIGNAL_DEVICE_TYPE_LABELS.web).toBe('Web Browser')
    expect(SIGNAL_DEVICE_TYPE_LABELS.chrome).toBe('Chrome Extension')
    expect(SIGNAL_DEVICE_TYPE_LABELS.android).toBe('Android App')
    expect(SIGNAL_DEVICE_TYPE_LABELS.ios).toBe('iOS App')
  })

  it('has default gesture config matching constants', () => {
    expect(DEFAULT_GESTURE_CONFIG.tapCountRequired).toBe(SAFETY_SIGNAL_CONSTANTS.TAP_COUNT_REQUIRED)
    expect(DEFAULT_GESTURE_CONFIG.tapWindowMs).toBe(SAFETY_SIGNAL_CONSTANTS.TAP_WINDOW_MS)
    expect(DEFAULT_GESTURE_CONFIG.keyboardPressesRequired).toBe(
      SAFETY_SIGNAL_CONSTANTS.KEYBOARD_PRESSES_REQUIRED
    )
  })
})

// ============================================================================
// Enum Schema Tests
// ============================================================================

describe('Gesture Type Schema', () => {
  it('accepts valid gesture types', () => {
    expect(gestureTypeSchema.parse('tap')).toBe('tap')
    expect(gestureTypeSchema.parse('keyboard')).toBe('keyboard')
  })

  it('rejects invalid gesture types', () => {
    expect(() => gestureTypeSchema.parse('swipe')).toThrow()
    expect(() => gestureTypeSchema.parse('')).toThrow()
    expect(() => gestureTypeSchema.parse(123)).toThrow()
  })
})

describe('Signal Device Type Schema', () => {
  it('accepts valid device types', () => {
    expect(signalDeviceTypeSchema.parse('web')).toBe('web')
    expect(signalDeviceTypeSchema.parse('chrome')).toBe('chrome')
    expect(signalDeviceTypeSchema.parse('android')).toBe('android')
    expect(signalDeviceTypeSchema.parse('ios')).toBe('ios')
  })

  it('rejects invalid device types', () => {
    expect(() => signalDeviceTypeSchema.parse('windows')).toThrow()
    expect(() => signalDeviceTypeSchema.parse('')).toThrow()
  })
})

describe('Signal Status Schema', () => {
  it('accepts all valid statuses', () => {
    const validStatuses: SignalStatus[] = [
      'queued',
      'sending',
      'sent',
      'received',
      'acknowledged',
      'failed',
    ]
    for (const status of validStatuses) {
      expect(signalStatusSchema.parse(status)).toBe(status)
    }
  })

  it('rejects invalid statuses', () => {
    expect(() => signalStatusSchema.parse('pending')).toThrow()
    expect(() => signalStatusSchema.parse('complete')).toThrow()
  })
})

// ============================================================================
// Gesture Detection State Tests
// ============================================================================

describe('Gesture Detection State Schema', () => {
  it('accepts valid gesture detection state', () => {
    const state: GestureDetectionState = {
      count: 3,
      startTime: Date.now(),
      lastTime: Date.now(),
      gestureType: 'tap',
    }

    const result = gestureDetectionStateSchema.parse(state)
    expect(result.count).toBe(3)
    expect(result.gestureType).toBe('tap')
  })

  it('accepts state with null times', () => {
    const state: GestureDetectionState = {
      count: 0,
      startTime: null,
      lastTime: null,
      gestureType: 'keyboard',
    }

    const result = gestureDetectionStateSchema.parse(state)
    expect(result.count).toBe(0)
    expect(result.startTime).toBeNull()
    expect(result.lastTime).toBeNull()
  })

  it('rejects negative count', () => {
    expect(() =>
      gestureDetectionStateSchema.parse({
        count: -1,
        startTime: null,
        lastTime: null,
        gestureType: 'tap',
      })
    ).toThrow()
  })
})

// ============================================================================
// Safety Signal Schema Tests
// ============================================================================

describe('Safety Signal Schema', () => {
  const validSignal: SafetySignal = {
    id: 'signal-123',
    childId: 'child-456',
    triggeredAt: new Date(),
    deviceType: 'web',
    gestureType: 'tap',
    status: 'queued',
    jurisdiction: 'US-CA',
    encryptedPayload: null,
    sentAt: null,
    acknowledgedAt: null,
    deliveryAttempts: 0,
    lastError: null,
  }

  it('accepts valid safety signal', () => {
    const result = safetySignalSchema.parse(validSignal)
    expect(result.id).toBe('signal-123')
    expect(result.childId).toBe('child-456')
    expect(result.status).toBe('queued')
  })

  it('accepts signal with all fields populated', () => {
    const fullSignal: SafetySignal = {
      ...validSignal,
      encryptedPayload: 'encrypted-data',
      sentAt: new Date(),
      acknowledgedAt: new Date(),
      deliveryAttempts: 3,
      lastError: 'Connection timeout',
    }

    const result = safetySignalSchema.parse(fullSignal)
    expect(result.encryptedPayload).toBe('encrypted-data')
    expect(result.deliveryAttempts).toBe(3)
  })

  it('rejects signal with missing required fields', () => {
    expect(() =>
      safetySignalSchema.parse({
        ...validSignal,
        id: '',
      })
    ).toThrow()

    expect(() =>
      safetySignalSchema.parse({
        ...validSignal,
        childId: '',
      })
    ).toThrow()
  })

  it('rejects signal with invalid status', () => {
    expect(() =>
      safetySignalSchema.parse({
        ...validSignal,
        status: 'invalid',
      })
    ).toThrow()
  })
})

// ============================================================================
// Queued Safety Signal Schema Tests
// ============================================================================

describe('Queued Safety Signal Schema', () => {
  const validQueuedSignal: QueuedSafetySignal = {
    queueId: 'queue_123',
    childId: 'child-456',
    triggeredAt: new Date().toISOString(),
    deviceType: 'web',
    gestureType: 'tap',
    jurisdiction: 'US-CA',
    attempts: 0,
    lastAttemptAt: null,
    nextRetryAt: null,
    createdAt: new Date().toISOString(),
  }

  it('accepts valid queued signal', () => {
    const result = queuedSafetySignalSchema.parse(validQueuedSignal)
    expect(result.queueId).toBe('queue_123')
    expect(result.attempts).toBe(0)
  })

  it('accepts queued signal with retry info', () => {
    const signalWithRetry: QueuedSafetySignal = {
      ...validQueuedSignal,
      attempts: 2,
      lastAttemptAt: new Date().toISOString(),
      nextRetryAt: new Date().toISOString(),
    }

    const result = queuedSafetySignalSchema.parse(signalWithRetry)
    expect(result.attempts).toBe(2)
  })

  it('rejects queued signal with missing queueId', () => {
    expect(() =>
      queuedSafetySignalSchema.parse({
        ...validQueuedSignal,
        queueId: '',
      })
    ).toThrow()
  })
})

// ============================================================================
// Trigger Input/Response Schema Tests
// ============================================================================

describe('Trigger Safety Signal Input Schema', () => {
  it('accepts valid input', () => {
    const input = {
      childId: 'child-123',
      deviceType: 'web',
      gestureType: 'tap',
    }

    const result = triggerSafetySignalInputSchema.parse(input)
    expect(result.childId).toBe('child-123')
  })

  it('accepts input with optional jurisdiction', () => {
    const input = {
      childId: 'child-123',
      deviceType: 'android',
      gestureType: 'keyboard',
      jurisdiction: 'US-NY',
    }

    const result = triggerSafetySignalInputSchema.parse(input)
    expect(result.jurisdiction).toBe('US-NY')
  })

  it('rejects input without childId', () => {
    expect(() =>
      triggerSafetySignalInputSchema.parse({
        deviceType: 'web',
        gestureType: 'tap',
      })
    ).toThrow()
  })
})

describe('Trigger Safety Signal Response Schema', () => {
  it('accepts successful response', () => {
    const response = {
      success: true,
      queueId: 'queue_123',
      queued: true,
    }

    const result = triggerSafetySignalResponseSchema.parse(response)
    expect(result.success).toBe(true)
  })

  it('accepts response with null queueId', () => {
    const response = {
      success: false,
      queueId: null,
      queued: false,
    }

    const result = triggerSafetySignalResponseSchema.parse(response)
    expect(result.queueId).toBeNull()
  })
})

// ============================================================================
// Gesture Config Schema Tests
// ============================================================================

describe('Gesture Config Schema', () => {
  it('accepts valid gesture config', () => {
    const config = {
      tapCountRequired: 5,
      tapWindowMs: 3000,
      keyboardPressesRequired: 3,
      keyboardWindowMs: 3000,
      debounceMs: 500,
    }

    const result = gestureConfigSchema.parse(config)
    expect(result.tapCountRequired).toBe(5)
  })

  it('applies default values', () => {
    const result = gestureConfigSchema.parse({})
    expect(result.tapCountRequired).toBe(5)
    expect(result.tapWindowMs).toBe(3000)
    expect(result.keyboardPressesRequired).toBe(3)
  })

  it('rejects tap count below minimum', () => {
    expect(() =>
      gestureConfigSchema.parse({
        tapCountRequired: 2, // min is 3
      })
    ).toThrow()
  })

  it('rejects tap count above maximum', () => {
    expect(() =>
      gestureConfigSchema.parse({
        tapCountRequired: 15, // max is 10
      })
    ).toThrow()
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Label Helper Functions', () => {
  it('getGestureTypeLabel returns correct labels', () => {
    expect(getGestureTypeLabel('tap')).toBe('Tap Gesture')
    expect(getGestureTypeLabel('keyboard')).toBe('Keyboard Shortcut')
  })

  it('getSignalStatusLabel returns correct labels', () => {
    expect(getSignalStatusLabel('queued')).toBe('Queued')
    expect(getSignalStatusLabel('sent')).toBe('Sent')
    expect(getSignalStatusLabel('failed')).toBe('Failed')
  })

  it('getSignalDeviceTypeLabel returns correct labels', () => {
    expect(getSignalDeviceTypeLabel('web')).toBe('Web Browser')
    expect(getSignalDeviceTypeLabel('chrome')).toBe('Chrome Extension')
    expect(getSignalDeviceTypeLabel('android')).toBe('Android App')
    expect(getSignalDeviceTypeLabel('ios')).toBe('iOS App')
  })
})

describe('Firestore Conversion', () => {
  it('converts Firestore signal to regular signal', () => {
    const triggeredAt = new Date('2024-01-15T10:00:00Z')
    const firestoreSignal = {
      id: 'signal-123',
      childId: 'child-456',
      triggeredAt: { toDate: () => triggeredAt },
      deviceType: 'web' as const,
      gestureType: 'tap' as const,
      status: 'sent' as const,
      jurisdiction: 'US-CA',
      encryptedPayload: null,
      sentAt: null,
      acknowledgedAt: null,
      deliveryAttempts: 1,
      lastError: null,
    }

    const result = convertFirestoreToSafetySignal(firestoreSignal)
    expect(result.triggeredAt).toEqual(triggeredAt)
    expect(result.id).toBe('signal-123')
  })
})

describe('Safe Parse Functions', () => {
  it('safeParseSafetySignal returns signal on valid input', () => {
    const signal = {
      id: 'signal-123',
      childId: 'child-456',
      triggeredAt: new Date(),
      deviceType: 'web',
      gestureType: 'tap',
      status: 'queued',
      jurisdiction: null,
      encryptedPayload: null,
      sentAt: null,
      acknowledgedAt: null,
      deliveryAttempts: 0,
      lastError: null,
    }

    const result = safeParseSafetySignal(signal)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('signal-123')
  })

  it('safeParseSafetySignal returns null on invalid input', () => {
    const result = safeParseSafetySignal({ invalid: 'data' })
    expect(result).toBeNull()
  })

  it('safeParseQueuedSafetySignal returns signal on valid input', () => {
    const signal = {
      queueId: 'queue_123',
      childId: 'child-456',
      triggeredAt: new Date().toISOString(),
      deviceType: 'web',
      gestureType: 'tap',
      jurisdiction: null,
      attempts: 0,
      lastAttemptAt: null,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
    }

    const result = safeParseQueuedSafetySignal(signal)
    expect(result).not.toBeNull()
  })

  it('safeParseTriggerSafetySignalInput returns input on valid data', () => {
    const input = {
      childId: 'child-123',
      deviceType: 'web',
      gestureType: 'tap',
    }

    const result = safeParseTriggerSafetySignalInput(input)
    expect(result).not.toBeNull()
    expect(result?.childId).toBe('child-123')
  })

  it('validateTriggerSafetySignalInput throws on invalid input', () => {
    expect(() => validateTriggerSafetySignalInput({})).toThrow()
  })
})

// ============================================================================
// Gesture Detection Helper Tests
// ============================================================================

describe('Gesture Detection Helpers', () => {
  const config: GestureConfig = DEFAULT_GESTURE_CONFIG

  describe('isGestureComplete', () => {
    it('returns true when tap count reached', () => {
      const state: GestureDetectionState = {
        count: 5,
        startTime: Date.now(),
        lastTime: Date.now(),
        gestureType: 'tap',
      }

      expect(isGestureComplete(state, config)).toBe(true)
    })

    it('returns false when tap count not reached', () => {
      const state: GestureDetectionState = {
        count: 4,
        startTime: Date.now(),
        lastTime: Date.now(),
        gestureType: 'tap',
      }

      expect(isGestureComplete(state, config)).toBe(false)
    })

    it('returns true when keyboard count reached', () => {
      const state: GestureDetectionState = {
        count: 3,
        startTime: Date.now(),
        lastTime: Date.now(),
        gestureType: 'keyboard',
      }

      expect(isGestureComplete(state, config)).toBe(true)
    })
  })

  describe('isGestureTimedOut', () => {
    it('returns false when within window', () => {
      const now = Date.now()
      const state: GestureDetectionState = {
        count: 3,
        startTime: now,
        lastTime: now + 1000, // 1 second elapsed
        gestureType: 'tap',
      }

      expect(isGestureTimedOut(state, config)).toBe(false)
    })

    it('returns true when window exceeded', () => {
      const now = Date.now()
      const state: GestureDetectionState = {
        count: 3,
        startTime: now,
        lastTime: now + 4000, // 4 seconds elapsed, window is 3 seconds
        gestureType: 'tap',
      }

      expect(isGestureTimedOut(state, config)).toBe(true)
    })

    it('returns false when times are null', () => {
      const state: GestureDetectionState = {
        count: 0,
        startTime: null,
        lastTime: null,
        gestureType: 'tap',
      }

      expect(isGestureTimedOut(state, config)).toBe(false)
    })
  })

  describe('createInitialGestureState', () => {
    it('creates state for tap gesture', () => {
      const state = createInitialGestureState('tap')
      expect(state.count).toBe(0)
      expect(state.startTime).toBeNull()
      expect(state.lastTime).toBeNull()
      expect(state.gestureType).toBe('tap')
    })

    it('creates state for keyboard gesture', () => {
      const state = createInitialGestureState('keyboard')
      expect(state.gestureType).toBe('keyboard')
    })
  })

  describe('resetGestureState', () => {
    it('resets state while preserving gesture type', () => {
      const state: GestureDetectionState = {
        count: 3,
        startTime: Date.now(),
        lastTime: Date.now(),
        gestureType: 'tap',
      }

      const reset = resetGestureState(state)
      expect(reset.count).toBe(0)
      expect(reset.startTime).toBeNull()
      expect(reset.lastTime).toBeNull()
      expect(reset.gestureType).toBe('tap')
    })
  })

  describe('incrementGestureState', () => {
    it('increments count and sets times', () => {
      const state: GestureDetectionState = {
        count: 0,
        startTime: null,
        lastTime: null,
        gestureType: 'tap',
      }

      const now = Date.now()
      const incremented = incrementGestureState(state, now)

      expect(incremented.count).toBe(1)
      expect(incremented.startTime).toBe(now)
      expect(incremented.lastTime).toBe(now)
    })

    it('preserves startTime on subsequent increments', () => {
      const startTime = Date.now()
      const state: GestureDetectionState = {
        count: 2,
        startTime,
        lastTime: startTime + 500,
        gestureType: 'tap',
      }

      const laterTime = startTime + 1000
      const incremented = incrementGestureState(state, laterTime)

      expect(incremented.count).toBe(3)
      expect(incremented.startTime).toBe(startTime) // Preserved
      expect(incremented.lastTime).toBe(laterTime)
    })
  })
})

// ============================================================================
// Retry Helper Tests
// ============================================================================

describe('Retry Helpers', () => {
  describe('calculateRetryDelay', () => {
    it('returns base delay for first attempt', () => {
      const delay = calculateRetryDelay(0)
      // Base delay with up to 20% jitter
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(1200)
    })

    it('returns exponentially increasing delay', () => {
      const delay0 = calculateRetryDelay(0)
      const delay1 = calculateRetryDelay(1)
      const delay2 = calculateRetryDelay(2)

      // Each should be roughly double (with jitter)
      expect(delay1).toBeGreaterThan(delay0)
      expect(delay2).toBeGreaterThan(delay1)
    })

    it('caps delay at maximum', () => {
      const delay = calculateRetryDelay(10)
      expect(delay).toBeLessThanOrEqual(SAFETY_SIGNAL_CONSTANTS.MAX_RETRY_DELAY_MS)
    })
  })

  describe('canRetrySignal', () => {
    it('returns true when under max attempts', () => {
      const signal: QueuedSafetySignal = {
        queueId: 'queue_123',
        childId: 'child-456',
        triggeredAt: new Date().toISOString(),
        deviceType: 'web',
        gestureType: 'tap',
        jurisdiction: null,
        attempts: 3,
        lastAttemptAt: null,
        nextRetryAt: null,
        createdAt: new Date().toISOString(),
      }

      expect(canRetrySignal(signal)).toBe(true)
    })

    it('returns false when at max attempts', () => {
      const signal: QueuedSafetySignal = {
        queueId: 'queue_123',
        childId: 'child-456',
        triggeredAt: new Date().toISOString(),
        deviceType: 'web',
        gestureType: 'tap',
        jurisdiction: null,
        attempts: 5,
        lastAttemptAt: null,
        nextRetryAt: null,
        createdAt: new Date().toISOString(),
      }

      expect(canRetrySignal(signal)).toBe(false)
    })
  })
})

// ============================================================================
// Queue ID Generation Tests
// ============================================================================

describe('generateQueueId', () => {
  it('generates unique IDs', () => {
    const id1 = generateQueueId()
    const id2 = generateQueueId()
    expect(id1).not.toBe(id2)
  })

  it('generates IDs with queue_ prefix', () => {
    const id = generateQueueId()
    expect(id.startsWith('queue_')).toBe(true)
  })

  it('generates IDs of reasonable length', () => {
    const id = generateQueueId()
    // queue_ + timestamp + _ + random (9 chars)
    expect(id.length).toBeGreaterThan(15)
    expect(id.length).toBeLessThan(40)
  })
})
