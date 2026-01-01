/**
 * Trust Regression Contracts Tests - Story 37.6 Task 1
 *
 * Tests for trust regression Zod schemas and types.
 * AC1: 2-week grace period before monitoring increases
 * AC3: Conversation-first approach, not automatic punishment
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  TrustRegressionConfigSchema,
  RegressionEventSchema,
  RegressionNotificationSchema,
  ChildExplanationInputSchema,
  ConversationRecordSchema,
  RegressionStatusSchema,
  DEFAULT_REGRESSION_CONFIG,
  createDefaultRegressionConfig,
  createRegressionEvent,
  validateRegression,
  calculateGraceDaysRemaining,
  isInGracePeriod,
  isConversationRequired,
  REGRESSION_MESSAGES,
} from './trustRegression'

describe('Trust Regression Contracts - Story 37.6 Task 1', () => {
  describe('RegressionStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(RegressionStatusSchema.parse('grace_period')).toBe('grace_period')
      expect(RegressionStatusSchema.parse('awaiting_conversation')).toBe('awaiting_conversation')
      expect(RegressionStatusSchema.parse('resolved')).toBe('resolved')
      expect(RegressionStatusSchema.parse('reverted')).toBe('reverted')
    })

    it('should reject invalid status', () => {
      expect(() => RegressionStatusSchema.parse('punished')).toThrow()
      expect(() => RegressionStatusSchema.parse('failed')).toThrow()
    })
  })

  describe('TrustRegressionConfigSchema', () => {
    it('should parse valid config', () => {
      const config = TrustRegressionConfigSchema.parse({
        gracePeriodDays: 14,
        conversationFirst: true,
        childCanExplain: true,
        autoRevertAfterGrace: false,
      })

      expect(config.gracePeriodDays).toBe(14)
      expect(config.conversationFirst).toBe(true)
      expect(config.childCanExplain).toBe(true)
      expect(config.autoRevertAfterGrace).toBe(false)
    })

    it('should enforce minimum grace period of 7 days', () => {
      expect(() =>
        TrustRegressionConfigSchema.parse({
          gracePeriodDays: 3,
          conversationFirst: true,
          childCanExplain: true,
        })
      ).toThrow()
    })

    it('should enforce maximum grace period of 30 days', () => {
      expect(() =>
        TrustRegressionConfigSchema.parse({
          gracePeriodDays: 60,
          conversationFirst: true,
          childCanExplain: true,
        })
      ).toThrow()
    })

    it('should always require conversation first', () => {
      // conversationFirst must be true
      expect(() =>
        TrustRegressionConfigSchema.parse({
          gracePeriodDays: 14,
          conversationFirst: false, // Not allowed
          childCanExplain: true,
        })
      ).toThrow()
    })

    it('should always allow child to explain', () => {
      // childCanExplain must be true
      expect(() =>
        TrustRegressionConfigSchema.parse({
          gracePeriodDays: 14,
          conversationFirst: true,
          childCanExplain: false, // Not allowed
        })
      ).toThrow()
    })
  })

  describe('RegressionEventSchema', () => {
    const validEvent = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      childId: 'child-123',
      previousMilestone: 'maturing',
      currentMilestone: 'growing',
      occurredAt: new Date(),
      graceExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status: 'grace_period',
      conversationHeld: false,
      updatedAt: new Date(),
    }

    it('should parse valid regression event', () => {
      const event = RegressionEventSchema.parse(validEvent)

      expect(event.id).toBe(validEvent.id)
      expect(event.childId).toBe('child-123')
      expect(event.previousMilestone).toBe('maturing')
      expect(event.currentMilestone).toBe('growing')
      expect(event.status).toBe('grace_period')
      expect(event.conversationHeld).toBe(false)
    })

    it('should allow optional child explanation', () => {
      const eventWithExplanation = {
        ...validEvent,
        childExplanation: 'I was having a hard week at school.',
      }

      const event = RegressionEventSchema.parse(eventWithExplanation)
      expect(event.childExplanation).toBe('I was having a hard week at school.')
    })

    it('should allow optional parent notes', () => {
      const eventWithNotes = {
        ...validEvent,
        parentNotes: 'We discussed stress management strategies.',
      }

      const event = RegressionEventSchema.parse(eventWithNotes)
      expect(event.parentNotes).toBe('We discussed stress management strategies.')
    })

    it('should require valid milestone types', () => {
      expect(() =>
        RegressionEventSchema.parse({
          ...validEvent,
          previousMilestone: 'invalid',
        })
      ).toThrow()
    })
  })

  describe('RegressionNotificationSchema', () => {
    it('should parse valid child notification', () => {
      const notification = RegressionNotificationSchema.parse({
        title: "Let's Talk",
        message: 'Something happened that we should discuss.',
        supportiveContext: 'This is about support, not punishment.',
        callToAction: 'Share Your Thoughts',
        viewerType: 'child',
        graceDaysRemaining: 12,
      })

      expect(notification.viewerType).toBe('child')
      expect(notification.graceDaysRemaining).toBe(12)
    })

    it('should parse valid parent notification', () => {
      const notification = RegressionNotificationSchema.parse({
        title: 'Conversation Needed',
        message: "Emma's trust score has changed.",
        supportiveContext: 'A 2-week grace period applies.',
        callToAction: 'Start Conversation',
        viewerType: 'parent',
        eventId: '123e4567-e89b-12d3-a456-426614174000',
      })

      expect(notification.viewerType).toBe('parent')
    })
  })

  describe('ChildExplanationInputSchema', () => {
    it('should parse valid explanation', () => {
      const input = ChildExplanationInputSchema.parse({
        explanation: 'I was stressed about exams and made some poor choices.',
        providedAt: new Date(),
      })

      expect(input.explanation).toContain('stressed')
    })

    it('should require non-empty explanation', () => {
      expect(() =>
        ChildExplanationInputSchema.parse({
          explanation: '',
          providedAt: new Date(),
        })
      ).toThrow()
    })

    it('should limit explanation length', () => {
      const longExplanation = 'a'.repeat(2001)
      expect(() =>
        ChildExplanationInputSchema.parse({
          explanation: longExplanation,
          providedAt: new Date(),
        })
      ).toThrow()
    })
  })

  describe('ConversationRecordSchema', () => {
    it('should parse valid conversation record', () => {
      const record = ConversationRecordSchema.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        heldAt: new Date(),
        outcome: 'resolve',
      })

      expect(record.outcome).toBe('resolve')
    })

    it('should accept all valid outcomes', () => {
      expect(
        ConversationRecordSchema.parse({
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          heldAt: new Date(),
          outcome: 'revert',
        }).outcome
      ).toBe('revert')

      expect(
        ConversationRecordSchema.parse({
          eventId: '123e4567-e89b-12d3-a456-426614174000',
          heldAt: new Date(),
          outcome: 'pending',
        }).outcome
      ).toBe('pending')
    })

    it('should allow optional parent notes', () => {
      const record = ConversationRecordSchema.parse({
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        heldAt: new Date(),
        parentNotes: 'Good conversation about responsibility.',
        outcome: 'resolve',
      })

      expect(record.parentNotes).toContain('responsibility')
    })
  })

  describe('DEFAULT_REGRESSION_CONFIG (AC1)', () => {
    it('should have 14-day grace period', () => {
      expect(DEFAULT_REGRESSION_CONFIG.gracePeriodDays).toBe(14)
    })

    it('should always require conversation first (AC3)', () => {
      expect(DEFAULT_REGRESSION_CONFIG.conversationFirst).toBe(true)
    })

    it('should always allow child to explain', () => {
      expect(DEFAULT_REGRESSION_CONFIG.childCanExplain).toBe(true)
    })

    it('should not auto-revert by default', () => {
      expect(DEFAULT_REGRESSION_CONFIG.autoRevertAfterGrace).toBe(false)
    })
  })

  describe('createDefaultRegressionConfig', () => {
    it('should return default config', () => {
      const config = createDefaultRegressionConfig()

      expect(config.gracePeriodDays).toBe(14)
      expect(config.conversationFirst).toBe(true)
    })

    it('should return new object each time', () => {
      const config1 = createDefaultRegressionConfig()
      const config2 = createDefaultRegressionConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('createRegressionEvent', () => {
    it('should create event with 2-week grace period', () => {
      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      expect(event.status).toBe('grace_period')
      expect(event.conversationHeld).toBe(false)

      // Grace period should be ~14 days
      const graceDays = Math.round(
        (event.graceExpiresAt.getTime() - event.occurredAt.getTime()) / (24 * 60 * 60 * 1000)
      )
      expect(graceDays).toBe(14)
    })

    it('should allow custom grace period', () => {
      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'readyForIndependence',
        currentMilestone: 'maturing',
        gracePeriodDays: 21,
      })

      const graceDays = Math.round(
        (event.graceExpiresAt.getTime() - event.occurredAt.getTime()) / (24 * 60 * 60 * 1000)
      )
      expect(graceDays).toBe(21)
    })
  })

  describe('validateRegression', () => {
    it('should validate regression from higher to lower milestone', () => {
      expect(validateRegression('maturing', 'growing')).toBe(true)
      expect(validateRegression('readyForIndependence', 'maturing')).toBe(true)
      expect(validateRegression('readyForIndependence', 'growing')).toBe(true)
    })

    it('should reject progression (not regression)', () => {
      expect(validateRegression('growing', 'maturing')).toBe(false)
      expect(validateRegression('maturing', 'readyForIndependence')).toBe(false)
    })

    it('should reject same milestone', () => {
      expect(validateRegression('growing', 'growing')).toBe(false)
      expect(validateRegression('maturing', 'maturing')).toBe(false)
    })

    it('should reject invalid milestones', () => {
      expect(validateRegression('invalid', 'growing')).toBe(false)
      expect(validateRegression('maturing', 'invalid')).toBe(false)
    })
  })

  describe('calculateGraceDaysRemaining', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should calculate days remaining correctly', () => {
      const now = new Date('2025-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      expect(calculateGraceDaysRemaining(event)).toBe(14)

      // Advance 7 days
      vi.setSystemTime(new Date('2025-01-08T12:00:00Z'))
      expect(calculateGraceDaysRemaining(event)).toBe(7)
    })

    it('should return 0 when grace period expired', () => {
      const now = new Date('2025-01-01T12:00:00Z')
      vi.setSystemTime(now)

      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      // Advance 15 days
      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
      expect(calculateGraceDaysRemaining(event)).toBe(0)
    })
  })

  describe('isInGracePeriod', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return true when in grace period', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))

      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      expect(isInGracePeriod(event)).toBe(true)
    })

    it('should return false when grace period expired', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))

      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      vi.setSystemTime(new Date('2025-01-16T12:00:00Z'))
      expect(isInGracePeriod(event)).toBe(false)
    })

    it('should return false when status is not grace_period', () => {
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))

      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })
      event.status = 'resolved'

      expect(isInGracePeriod(event)).toBe(false)
    })
  })

  describe('isConversationRequired', () => {
    it('should require conversation when not held', () => {
      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      expect(isConversationRequired(event)).toBe(true)
    })

    it('should not require conversation when already held', () => {
      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })
      event.conversationHeld = true

      expect(isConversationRequired(event)).toBe(false)
    })

    it('should not require conversation when resolved', () => {
      const event = createRegressionEvent({
        id: '123e4567-e89b-12d3-a456-426614174000',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })
      event.status = 'resolved'

      expect(isConversationRequired(event)).toBe(false)
    })
  })

  describe('REGRESSION_MESSAGES (AC6: supportive framing)', () => {
    it('should have "Let\'s Talk" as child title', () => {
      expect(REGRESSION_MESSAGES.childTitle).toBe("Let's Talk")
    })

    it('should not contain standalone punishment language', () => {
      const allMessages = Object.values(REGRESSION_MESSAGES).join(' ')

      expect(allMessages.toLowerCase()).not.toContain('failed')
      // Allow "isn't about punishment" and "isn't punishment" but not standalone
      const withoutNegation = allMessages
        .replace(/isn't about punishment/gi, '')
        .replace(/isn't punishment/gi, '')
        .replace(/not punishment/gi, '')
      expect(withoutNegation.toLowerCase()).not.toContain('punishment')
      expect(withoutNegation.toLowerCase()).not.toContain('punish')
      expect(allMessages.toLowerCase()).not.toContain('consequence')
      expect(allMessages.toLowerCase()).not.toContain('violated')
    })

    it('should emphasize support not punishment', () => {
      expect(REGRESSION_MESSAGES.notPunishment).toContain('support')
      expect(REGRESSION_MESSAGES.childSupportive).toContain('perspective matters')
    })

    it('should frame as "let\'s work on this"', () => {
      expect(REGRESSION_MESSAGES.letWorkOnThis).toContain('work on this together')
    })

    it('should emphasize child explanation matters', () => {
      expect(REGRESSION_MESSAGES.yourExplanationMatters).toContain('explanation matters')
    })

    it('should explain grace period to parents', () => {
      expect(REGRESSION_MESSAGES.gracePeriodExplainer).toContain('2-week')
      expect(REGRESSION_MESSAGES.noAutoChanges).toContain('conversation')
    })
  })
})
