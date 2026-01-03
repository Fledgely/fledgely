/**
 * Tests for Safe Escape Schema - Story 40.3
 *
 * Acceptance Criteria:
 * - AC1: Instant activation schema
 * - AC2: Silent period constants (72 hours)
 * - AC4: Notification timing utilities
 * - AC5: Re-enable authorization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  safeEscapeActivationSchema,
  activateSafeEscapeInputSchema,
  activateSafeEscapeResponseSchema,
  reenableSafeEscapeInputSchema,
  reenableSafeEscapeResponseSchema,
  safeEscapeStatusSchema,
  SAFE_ESCAPE_SILENT_PERIOD_MS,
  SAFE_ESCAPE_SILENT_PERIOD_HOURS,
  SAFE_ESCAPE_NOTIFICATION_MESSAGE,
  SAFE_ESCAPE_CHILD_MESSAGES,
  SAFE_ESCAPE_ADULT_MESSAGES,
  calculateHoursUntilNotification,
  shouldSendNotification,
} from './safeEscape'

describe('Safe Escape Schema - Story 40.3', () => {
  describe('Constants', () => {
    it('defines 72-hour silent period in milliseconds', () => {
      expect(SAFE_ESCAPE_SILENT_PERIOD_MS).toBe(72 * 60 * 60 * 1000)
    })

    it('defines 72-hour silent period in hours', () => {
      expect(SAFE_ESCAPE_SILENT_PERIOD_HOURS).toBe(72)
    })

    it('has neutral notification message (AC4)', () => {
      expect(SAFE_ESCAPE_NOTIFICATION_MESSAGE).toBe('Location features paused')
      // Should NOT contain words like "emergency", "escape", "danger"
      expect(SAFE_ESCAPE_NOTIFICATION_MESSAGE.toLowerCase()).not.toContain('emergency')
      expect(SAFE_ESCAPE_NOTIFICATION_MESSAGE.toLowerCase()).not.toContain('escape')
      expect(SAFE_ESCAPE_NOTIFICATION_MESSAGE.toLowerCase()).not.toContain('danger')
    })
  })

  describe('Child-Friendly Messages (NFR65)', () => {
    it('has child-friendly button label', () => {
      expect(SAFE_ESCAPE_CHILD_MESSAGES.buttonLabel).toBe('I Need to Hide')
    })

    it('has child-friendly activated message', () => {
      expect(SAFE_ESCAPE_CHILD_MESSAGES.activatedMessage).toBe(
        "You're hidden. Location features are off."
      )
    })

    it('generates child-friendly countdown message', () => {
      expect(SAFE_ESCAPE_CHILD_MESSAGES.countdownMessage(24)).toBe(
        'Your family will see "Location paused" in 24 hours'
      )
      expect(SAFE_ESCAPE_CHILD_MESSAGES.countdownMessage(1)).toBe(
        'Your family will see "Location paused" in 1 hour'
      )
    })

    it('has child-friendly re-enable label', () => {
      expect(SAFE_ESCAPE_CHILD_MESSAGES.reenableLabel).toBe('Turn Location Back On')
    })
  })

  describe('Adult Messages', () => {
    it('has adult button label', () => {
      expect(SAFE_ESCAPE_ADULT_MESSAGES.buttonLabel).toBe('Safe Escape')
    })

    it('has adult activated message', () => {
      expect(SAFE_ESCAPE_ADULT_MESSAGES.activatedMessage).toBe(
        'Safe Escape active. All location features disabled.'
      )
    })

    it('generates adult countdown message', () => {
      expect(SAFE_ESCAPE_ADULT_MESSAGES.countdownMessage(48)).toBe(
        'Neutral notification in 48 hours'
      )
      expect(SAFE_ESCAPE_ADULT_MESSAGES.countdownMessage(1)).toBe('Neutral notification in 1 hour')
    })
  })

  describe('safeEscapeActivationSchema', () => {
    const validActivation = {
      id: 'activation-123',
      familyId: 'family-456',
      activatedBy: 'user-789',
      activatedAt: new Date('2026-01-01T00:00:00Z'),
      notificationSentAt: null,
      clearedLocationHistory: true,
      reenabledAt: null,
      reenabledBy: null,
    }

    it('validates a complete activation record', () => {
      const result = safeEscapeActivationSchema.safeParse(validActivation)
      expect(result.success).toBe(true)
    })

    it('validates activation with notification sent', () => {
      const result = safeEscapeActivationSchema.safeParse({
        ...validActivation,
        notificationSentAt: new Date('2026-01-04T00:00:00Z'),
      })
      expect(result.success).toBe(true)
    })

    it('validates re-enabled activation', () => {
      const result = safeEscapeActivationSchema.safeParse({
        ...validActivation,
        reenabledAt: new Date('2026-01-02T00:00:00Z'),
        reenabledBy: 'user-789', // Same as activatedBy
      })
      expect(result.success).toBe(true)
    })

    it('requires non-empty id', () => {
      const result = safeEscapeActivationSchema.safeParse({
        ...validActivation,
        id: '',
      })
      expect(result.success).toBe(false)
    })

    it('requires non-empty familyId', () => {
      const result = safeEscapeActivationSchema.safeParse({
        ...validActivation,
        familyId: '',
      })
      expect(result.success).toBe(false)
    })

    it('requires non-empty activatedBy', () => {
      const result = safeEscapeActivationSchema.safeParse({
        ...validActivation,
        activatedBy: '',
      })
      expect(result.success).toBe(false)
    })

    it('requires activatedAt to be a date', () => {
      const result = safeEscapeActivationSchema.safeParse({
        ...validActivation,
        activatedAt: 'not-a-date',
      })
      expect(result.success).toBe(false)
    })

    it('defaults clearedLocationHistory to true', () => {
      const input = {
        id: 'activation-123',
        familyId: 'family-456',
        activatedBy: 'user-789',
        activatedAt: new Date(),
        notificationSentAt: null,
        reenabledAt: null,
        reenabledBy: null,
      }
      const result = safeEscapeActivationSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.clearedLocationHistory).toBe(true)
      }
    })
  })

  describe('activateSafeEscapeInputSchema', () => {
    it('validates valid input', () => {
      const result = activateSafeEscapeInputSchema.safeParse({
        familyId: 'family-123',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty familyId', () => {
      const result = activateSafeEscapeInputSchema.safeParse({
        familyId: '',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing familyId', () => {
      const result = activateSafeEscapeInputSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('activateSafeEscapeResponseSchema', () => {
    it('validates successful response', () => {
      const result = activateSafeEscapeResponseSchema.safeParse({
        success: true,
        activationId: 'activation-123',
        message: 'Safe Escape activated',
        notificationScheduledAt: new Date('2026-01-04T00:00:00Z'),
      })
      expect(result.success).toBe(true)
    })

    it('requires all fields', () => {
      const result = activateSafeEscapeResponseSchema.safeParse({
        success: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('reenableSafeEscapeInputSchema (AC5)', () => {
    it('validates valid input', () => {
      const result = reenableSafeEscapeInputSchema.safeParse({
        familyId: 'family-123',
        activationId: 'activation-456',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty familyId', () => {
      const result = reenableSafeEscapeInputSchema.safeParse({
        familyId: '',
        activationId: 'activation-456',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty activationId', () => {
      const result = reenableSafeEscapeInputSchema.safeParse({
        familyId: 'family-123',
        activationId: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('reenableSafeEscapeResponseSchema', () => {
    it('validates successful response', () => {
      const result = reenableSafeEscapeResponseSchema.safeParse({
        success: true,
        message: 'Location features re-enabled',
      })
      expect(result.success).toBe(true)
    })

    it('validates failure response', () => {
      const result = reenableSafeEscapeResponseSchema.safeParse({
        success: false,
        message: 'Only the person who activated can re-enable',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('safeEscapeStatusSchema', () => {
    it('validates inactive status', () => {
      const result = safeEscapeStatusSchema.safeParse({
        isActive: false,
        activation: null,
        hoursUntilNotification: null,
        canReenable: false,
      })
      expect(result.success).toBe(true)
    })

    it('validates active status with countdown', () => {
      const result = safeEscapeStatusSchema.safeParse({
        isActive: true,
        activation: {
          id: 'activation-123',
          familyId: 'family-456',
          activatedBy: 'user-789',
          activatedAt: new Date(),
          notificationSentAt: null,
          clearedLocationHistory: true,
          reenabledAt: null,
          reenabledBy: null,
        },
        hoursUntilNotification: 48,
        canReenable: true,
      })
      expect(result.success).toBe(true)
    })

    it('rejects negative hoursUntilNotification', () => {
      const result = safeEscapeStatusSchema.safeParse({
        isActive: true,
        activation: {
          id: 'activation-123',
          familyId: 'family-456',
          activatedBy: 'user-789',
          activatedAt: new Date(),
          notificationSentAt: null,
          clearedLocationHistory: true,
          reenabledAt: null,
          reenabledBy: null,
        },
        hoursUntilNotification: -5,
        canReenable: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('calculateHoursUntilNotification', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 72 hours when just activated', () => {
      const now = new Date('2026-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(calculateHoursUntilNotification(activatedAt)).toBe(72)
    })

    it('returns 48 hours after 24 hours', () => {
      const now = new Date('2026-01-02T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(calculateHoursUntilNotification(activatedAt)).toBe(48)
    })

    it('returns 0 hours after 72 hours', () => {
      const now = new Date('2026-01-04T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(calculateHoursUntilNotification(activatedAt)).toBe(0)
    })

    it('returns 0 for past activations', () => {
      const now = new Date('2026-01-10T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(calculateHoursUntilNotification(activatedAt)).toBe(0)
    })

    it('rounds up partial hours', () => {
      const now = new Date('2026-01-01T13:30:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      // 72 - 1.5 = 70.5, rounds up to 71
      expect(calculateHoursUntilNotification(activatedAt)).toBe(71)
    })
  })

  describe('shouldSendNotification', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns false immediately after activation', () => {
      const now = new Date('2026-01-01T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(shouldSendNotification(activatedAt)).toBe(false)
    })

    it('returns false before 72 hours', () => {
      const now = new Date('2026-01-04T11:59:59Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(shouldSendNotification(activatedAt)).toBe(false)
    })

    it('returns true at exactly 72 hours', () => {
      const now = new Date('2026-01-04T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(shouldSendNotification(activatedAt)).toBe(true)
    })

    it('returns true after 72 hours', () => {
      const now = new Date('2026-01-05T12:00:00Z')
      vi.setSystemTime(now)
      const activatedAt = new Date('2026-01-01T12:00:00Z')
      expect(shouldSendNotification(activatedAt)).toBe(true)
    })
  })
})
