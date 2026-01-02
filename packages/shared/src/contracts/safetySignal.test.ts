/**
 * Safety Signal Contracts Tests - Story 7.5.1 Task 1
 *
 * Tests for safety signal data models.
 * AC6: Signal queuing infrastructure with isolated collection
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  LOGO_TAP_COUNT,
  LOGO_TAP_WINDOW_MS,
  KEYBOARD_SHORTCUT,
  SIGNAL_STATUS,
  TRIGGER_METHOD,
  SIGNAL_PLATFORM,
  // Schemas
  signalStatusSchema,
  triggerMethodSchema,
  signalPlatformSchema,
  safetySignalSchema,
  safetySignalTriggerEventSchema,
  offlineSignalQueueEntrySchema,
  // Types
  type SafetySignal,
  type SafetySignalTriggerEvent,
  type OfflineSignalQueueEntry,
  // Factory functions
  generateSignalId,
  generateTriggerEventId,
  createSafetySignal,
  createTriggerEvent,
  createOfflineQueueEntry,
  // Validation functions
  validateSafetySignal,
  isSafetySignal,
  validateTriggerEvent,
  isTriggerEvent,
  // Status transitions
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
  getNextStatus,
} from './safetySignal'

describe('Safety Signal Contracts', () => {
  // ============================================
  // Constants Tests
  // ============================================

  describe('Constants', () => {
    it('should have correct logo tap count', () => {
      expect(LOGO_TAP_COUNT).toBe(5)
    })

    it('should have correct logo tap window (3 seconds)', () => {
      expect(LOGO_TAP_WINDOW_MS).toBe(3000)
    })

    it('should have correct keyboard shortcut', () => {
      expect(KEYBOARD_SHORTCUT).toBe('Ctrl+Shift+H')
    })

    it('should have all signal status values', () => {
      expect(SIGNAL_STATUS.QUEUED).toBe('queued')
      expect(SIGNAL_STATUS.PENDING).toBe('pending')
      expect(SIGNAL_STATUS.SENT).toBe('sent')
      expect(SIGNAL_STATUS.DELIVERED).toBe('delivered')
      expect(SIGNAL_STATUS.ACKNOWLEDGED).toBe('acknowledged')
    })

    it('should have all trigger method values', () => {
      expect(TRIGGER_METHOD.LOGO_TAP).toBe('logo_tap')
      expect(TRIGGER_METHOD.KEYBOARD_SHORTCUT).toBe('keyboard_shortcut')
      expect(TRIGGER_METHOD.SWIPE_PATTERN).toBe('swipe_pattern')
    })

    it('should have all platform values', () => {
      expect(SIGNAL_PLATFORM.WEB).toBe('web')
      expect(SIGNAL_PLATFORM.CHROME_EXTENSION).toBe('chrome_extension')
      expect(SIGNAL_PLATFORM.ANDROID).toBe('android')
    })
  })

  // ============================================
  // Schema Validation Tests
  // ============================================

  describe('signalStatusSchema', () => {
    it('should validate all valid status values', () => {
      expect(signalStatusSchema.parse('queued')).toBe('queued')
      expect(signalStatusSchema.parse('pending')).toBe('pending')
      expect(signalStatusSchema.parse('sent')).toBe('sent')
      expect(signalStatusSchema.parse('delivered')).toBe('delivered')
      expect(signalStatusSchema.parse('acknowledged')).toBe('acknowledged')
    })

    it('should reject invalid status values', () => {
      expect(() => signalStatusSchema.parse('invalid')).toThrow()
      expect(() => signalStatusSchema.parse('')).toThrow()
      expect(() => signalStatusSchema.parse(null)).toThrow()
    })
  })

  describe('triggerMethodSchema', () => {
    it('should validate all valid trigger methods', () => {
      expect(triggerMethodSchema.parse('logo_tap')).toBe('logo_tap')
      expect(triggerMethodSchema.parse('keyboard_shortcut')).toBe('keyboard_shortcut')
      expect(triggerMethodSchema.parse('swipe_pattern')).toBe('swipe_pattern')
    })

    it('should reject invalid trigger methods', () => {
      expect(() => triggerMethodSchema.parse('click')).toThrow()
      expect(() => triggerMethodSchema.parse('')).toThrow()
    })
  })

  describe('signalPlatformSchema', () => {
    it('should validate all valid platforms', () => {
      expect(signalPlatformSchema.parse('web')).toBe('web')
      expect(signalPlatformSchema.parse('chrome_extension')).toBe('chrome_extension')
      expect(signalPlatformSchema.parse('android')).toBe('android')
    })

    it('should reject invalid platforms', () => {
      expect(() => signalPlatformSchema.parse('ios')).toThrow()
      expect(() => signalPlatformSchema.parse('')).toThrow()
    })
  })

  describe('safetySignalSchema', () => {
    const validSignal: SafetySignal = {
      id: 'sig_123',
      childId: 'child_456',
      familyId: 'family_789',
      deviceId: 'device_abc',
      triggeredAt: new Date(),
      offlineQueued: false,
      deliveredAt: null,
      status: 'pending',
      triggerMethod: 'logo_tap',
      platform: 'web',
    }

    it('should validate a valid signal', () => {
      expect(safetySignalSchema.parse(validSignal)).toEqual(validSignal)
    })

    it('should accept null deviceId', () => {
      const signalWithNullDevice = { ...validSignal, deviceId: null }
      expect(safetySignalSchema.parse(signalWithNullDevice).deviceId).toBeNull()
    })

    it('should require non-empty id', () => {
      expect(() => safetySignalSchema.parse({ ...validSignal, id: '' })).toThrow()
    })

    it('should require non-empty childId', () => {
      expect(() => safetySignalSchema.parse({ ...validSignal, childId: '' })).toThrow()
    })

    it('should require non-empty familyId', () => {
      expect(() => safetySignalSchema.parse({ ...validSignal, familyId: '' })).toThrow()
    })

    it('should require valid triggeredAt date', () => {
      expect(() => safetySignalSchema.parse({ ...validSignal, triggeredAt: 'invalid' })).toThrow()
    })

    it('should require boolean offlineQueued', () => {
      expect(() => safetySignalSchema.parse({ ...validSignal, offlineQueued: 'true' })).toThrow()
    })

    it('should accept null deliveredAt', () => {
      expect(safetySignalSchema.parse({ ...validSignal, deliveredAt: null }).deliveredAt).toBeNull()
    })

    it('should accept valid deliveredAt date', () => {
      const delivered = new Date()
      expect(
        safetySignalSchema.parse({ ...validSignal, deliveredAt: delivered }).deliveredAt
      ).toEqual(delivered)
    })
  })

  describe('safetySignalTriggerEventSchema', () => {
    const validEvent: SafetySignalTriggerEvent = {
      id: 'evt_123',
      signalId: 'sig_456',
      childId: 'child_789',
      triggerMethod: 'keyboard_shortcut',
      platform: 'chrome_extension',
      timestamp: new Date(),
    }

    it('should validate a valid trigger event', () => {
      expect(safetySignalTriggerEventSchema.parse(validEvent)).toEqual(validEvent)
    })

    it('should require non-empty id', () => {
      expect(() => safetySignalTriggerEventSchema.parse({ ...validEvent, id: '' })).toThrow()
    })

    it('should require non-empty signalId', () => {
      expect(() => safetySignalTriggerEventSchema.parse({ ...validEvent, signalId: '' })).toThrow()
    })

    it('should require valid timestamp', () => {
      expect(() =>
        safetySignalTriggerEventSchema.parse({ ...validEvent, timestamp: 'invalid' })
      ).toThrow()
    })
  })

  describe('offlineSignalQueueEntrySchema', () => {
    const validSignal: SafetySignal = {
      id: 'sig_123',
      childId: 'child_456',
      familyId: 'family_789',
      deviceId: null,
      triggeredAt: new Date(),
      offlineQueued: true,
      deliveredAt: null,
      status: 'queued',
      triggerMethod: 'logo_tap',
      platform: 'android',
    }

    const validEntry: OfflineSignalQueueEntry = {
      signal: validSignal,
      retryCount: 0,
      lastRetryAt: null,
      queuedAt: new Date(),
    }

    it('should validate a valid queue entry', () => {
      expect(offlineSignalQueueEntrySchema.parse(validEntry)).toEqual(validEntry)
    })

    it('should require non-negative retryCount', () => {
      expect(() => offlineSignalQueueEntrySchema.parse({ ...validEntry, retryCount: -1 })).toThrow()
    })

    it('should accept null lastRetryAt', () => {
      expect(
        offlineSignalQueueEntrySchema.parse({ ...validEntry, lastRetryAt: null }).lastRetryAt
      ).toBeNull()
    })

    it('should accept valid lastRetryAt date', () => {
      const retryDate = new Date()
      expect(
        offlineSignalQueueEntrySchema.parse({ ...validEntry, lastRetryAt: retryDate }).lastRetryAt
      ).toEqual(retryDate)
    })
  })

  // ============================================
  // Factory Function Tests
  // ============================================

  describe('generateSignalId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateSignalId()
      const id2 = generateSignalId()
      expect(id1).not.toBe(id2)
    })

    it('should start with sig_ prefix', () => {
      const id = generateSignalId()
      expect(id.startsWith('sig_')).toBe(true)
    })

    it('should be non-empty', () => {
      const id = generateSignalId()
      expect(id.length).toBeGreaterThan(4)
    })
  })

  describe('generateTriggerEventId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateTriggerEventId()
      const id2 = generateTriggerEventId()
      expect(id1).not.toBe(id2)
    })

    it('should start with evt_ prefix', () => {
      const id = generateTriggerEventId()
      expect(id.startsWith('evt_')).toBe(true)
    })
  })

  describe('createSafetySignal', () => {
    it('should create signal with all required fields', () => {
      const signal = createSafetySignal('child_123', 'family_456', 'logo_tap', 'web', false)

      expect(signal.childId).toBe('child_123')
      expect(signal.familyId).toBe('family_456')
      expect(signal.triggerMethod).toBe('logo_tap')
      expect(signal.platform).toBe('web')
      expect(signal.offlineQueued).toBe(false)
      expect(signal.id).toBeDefined()
      expect(signal.triggeredAt).toBeInstanceOf(Date)
    })

    it('should set status to pending when online', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(signal.status).toBe('pending')
    })

    it('should set status to queued when offline', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      expect(signal.status).toBe('queued')
      expect(signal.offlineQueued).toBe(true)
    })

    it('should set deviceId when provided', () => {
      const signal = createSafetySignal(
        'child',
        'family',
        'keyboard_shortcut',
        'chrome_extension',
        false,
        'device_123'
      )
      expect(signal.deviceId).toBe('device_123')
    })

    it('should set deviceId to null when not provided', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(signal.deviceId).toBeNull()
    })

    it('should set deliveredAt to null initially', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(signal.deliveredAt).toBeNull()
    })

    it('should validate against schema', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(() => safetySignalSchema.parse(signal)).not.toThrow()
    })
  })

  describe('createTriggerEvent', () => {
    it('should create event with all required fields', () => {
      const event = createTriggerEvent('sig_123', 'child_456', 'keyboard_shortcut', 'web')

      expect(event.signalId).toBe('sig_123')
      expect(event.childId).toBe('child_456')
      expect(event.triggerMethod).toBe('keyboard_shortcut')
      expect(event.platform).toBe('web')
      expect(event.id).toBeDefined()
      expect(event.timestamp).toBeInstanceOf(Date)
    })

    it('should validate against schema', () => {
      const event = createTriggerEvent('sig', 'child', 'logo_tap', 'android')
      expect(() => safetySignalTriggerEventSchema.parse(event)).not.toThrow()
    })
  })

  describe('createOfflineQueueEntry', () => {
    it('should create entry with signal and initial values', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      const entry = createOfflineQueueEntry(signal)

      expect(entry.signal).toEqual(signal)
      expect(entry.retryCount).toBe(0)
      expect(entry.lastRetryAt).toBeNull()
      expect(entry.queuedAt).toBeInstanceOf(Date)
    })

    it('should validate against schema', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', true)
      const entry = createOfflineQueueEntry(signal)
      expect(() => offlineSignalQueueEntrySchema.parse(entry)).not.toThrow()
    })
  })

  // ============================================
  // Validation Function Tests
  // ============================================

  describe('validateSafetySignal', () => {
    it('should return valid signal', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(validateSafetySignal(signal)).toEqual(signal)
    })

    it('should throw for invalid data', () => {
      expect(() => validateSafetySignal({ invalid: 'data' })).toThrow()
    })
  })

  describe('isSafetySignal', () => {
    it('should return true for valid signal', () => {
      const signal = createSafetySignal('child', 'family', 'logo_tap', 'web', false)
      expect(isSafetySignal(signal)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isSafetySignal({ invalid: 'data' })).toBe(false)
      expect(isSafetySignal(null)).toBe(false)
      expect(isSafetySignal(undefined)).toBe(false)
    })
  })

  describe('validateTriggerEvent', () => {
    it('should return valid event', () => {
      const event = createTriggerEvent('sig', 'child', 'logo_tap', 'web')
      expect(validateTriggerEvent(event)).toEqual(event)
    })

    it('should throw for invalid data', () => {
      expect(() => validateTriggerEvent({ invalid: 'data' })).toThrow()
    })
  })

  describe('isTriggerEvent', () => {
    it('should return true for valid event', () => {
      const event = createTriggerEvent('sig', 'child', 'logo_tap', 'web')
      expect(isTriggerEvent(event)).toBe(true)
    })

    it('should return false for invalid data', () => {
      expect(isTriggerEvent({ invalid: 'data' })).toBe(false)
    })
  })

  // ============================================
  // Status Transition Tests
  // ============================================

  describe('VALID_STATUS_TRANSITIONS', () => {
    it('should allow queued -> pending', () => {
      expect(VALID_STATUS_TRANSITIONS.queued).toContain('pending')
    })

    it('should allow pending -> sent', () => {
      expect(VALID_STATUS_TRANSITIONS.pending).toContain('sent')
    })

    it('should allow sent -> delivered', () => {
      expect(VALID_STATUS_TRANSITIONS.sent).toContain('delivered')
    })

    it('should allow delivered -> acknowledged', () => {
      expect(VALID_STATUS_TRANSITIONS.delivered).toContain('acknowledged')
    })

    it('should have no transitions from acknowledged (terminal)', () => {
      expect(VALID_STATUS_TRANSITIONS.acknowledged).toHaveLength(0)
    })
  })

  describe('isValidStatusTransition', () => {
    it('should return true for valid transitions', () => {
      expect(isValidStatusTransition('queued', 'pending')).toBe(true)
      expect(isValidStatusTransition('pending', 'sent')).toBe(true)
      expect(isValidStatusTransition('sent', 'delivered')).toBe(true)
      expect(isValidStatusTransition('delivered', 'acknowledged')).toBe(true)
    })

    it('should return false for invalid transitions', () => {
      expect(isValidStatusTransition('queued', 'sent')).toBe(false)
      expect(isValidStatusTransition('pending', 'queued')).toBe(false)
      expect(isValidStatusTransition('acknowledged', 'pending')).toBe(false)
    })

    it('should return false for same-state transitions', () => {
      expect(isValidStatusTransition('queued', 'queued')).toBe(false)
      expect(isValidStatusTransition('pending', 'pending')).toBe(false)
    })
  })

  describe('getNextStatus', () => {
    it('should return next status for non-terminal states', () => {
      expect(getNextStatus('queued')).toBe('pending')
      expect(getNextStatus('pending')).toBe('sent')
      expect(getNextStatus('sent')).toBe('delivered')
      expect(getNextStatus('delivered')).toBe('acknowledged')
    })

    it('should return null for terminal state', () => {
      expect(getNextStatus('acknowledged')).toBeNull()
    })
  })
})
