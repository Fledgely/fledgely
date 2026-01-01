/**
 * Regression Notification Service Tests - Story 37.6 Task 3
 *
 * Tests for supportive regression notification generation.
 * AC2: Notification: "Let's talk about what happened"
 * AC6: Regression framed as "let's work on this" not "you failed"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getChildRegressionNotification,
  getParentRegressionNotification,
  getRegressionNotification,
  getGracePeriodReminder,
  getConversationPrompt,
  getSupportiveFraming,
  getGracePeriodExplanation,
  getExplanationAcknowledgment,
  getConversationCompleteMessage,
  getResolutionOptions,
  validateSupportiveFraming,
  getAllRegressionMessages,
} from './regressionNotificationService'
import { createRegressionEvent } from '../contracts/trustRegression'

describe('RegressionNotificationService - Story 37.6 Task 3', () => {
  describe('getChildRegressionNotification (AC2)', () => {
    it('should have "Let\'s Talk" as title', () => {
      const notification = getChildRegressionNotification('Emma')

      expect(notification.title).toBe("Let's Talk")
    })

    it('should explain this is about support not punishment', () => {
      const notification = getChildRegressionNotification('Emma')

      expect(notification.message.toLowerCase()).toContain('understanding')
      expect(notification.message.toLowerCase()).toContain('support')
    })

    it('should emphasize child perspective matters', () => {
      const notification = getChildRegressionNotification('Emma')

      expect(notification.supportiveContext.toLowerCase()).toContain('perspective')
      expect(notification.supportiveContext.toLowerCase()).toContain('matters')
    })

    it('should have child viewerType', () => {
      const notification = getChildRegressionNotification('Emma')

      expect(notification.viewerType).toBe('child')
    })
  })

  describe('getParentRegressionNotification', () => {
    it('should include child name', () => {
      const notification = getParentRegressionNotification('Emma')

      expect(notification.message).toContain('Emma')
    })

    it('should emphasize supportive conversation', () => {
      const notification = getParentRegressionNotification('Emma')

      expect(notification.message.toLowerCase()).toContain('supportive')
      expect(notification.message.toLowerCase()).toContain('conversation')
    })

    it('should mention grace period', () => {
      const notification = getParentRegressionNotification('Emma')

      expect(notification.supportiveContext.toLowerCase()).toContain('2-week')
      expect(notification.supportiveContext.toLowerCase()).toContain('grace period')
    })

    it('should have parent viewerType', () => {
      const notification = getParentRegressionNotification('Emma')

      expect(notification.viewerType).toBe('parent')
    })
  })

  describe('getRegressionNotification', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should include event ID', () => {
      const event = createRegressionEvent({
        id: 'event-123',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      const notification = getRegressionNotification(event, 'Emma', 'child')

      expect(notification.eventId).toBe('event-123')
    })

    it('should include grace days remaining', () => {
      const event = createRegressionEvent({
        id: 'event-123',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      const notification = getRegressionNotification(event, 'Emma', 'child')

      expect(notification.graceDaysRemaining).toBe(14)
    })
  })

  describe('getGracePeriodReminder', () => {
    it('should return appropriate message for child with days remaining', () => {
      const reminder = getGracePeriodReminder(10, 'child')

      expect(reminder).toContain('10 days')
      expect(reminder.toLowerCase()).toContain('monitoring stays the same')
    })

    it('should return appropriate message for parent with days remaining', () => {
      const reminder = getGracePeriodReminder(10, 'parent')

      expect(reminder).toContain('10 days')
      expect(reminder.toLowerCase()).toContain('supportive conversation')
    })

    it('should return special message for 1 day remaining', () => {
      const childReminder = getGracePeriodReminder(1, 'child')
      const parentReminder = getGracePeriodReminder(1, 'parent')

      expect(childReminder).toContain('1 day')
      expect(parentReminder).toContain('1 day')
    })

    it('should return expired message for 0 days', () => {
      const childReminder = getGracePeriodReminder(0, 'child')
      const parentReminder = getGracePeriodReminder(0, 'parent')

      expect(childReminder.toLowerCase()).toContain('ended')
      expect(parentReminder.toLowerCase()).toContain('ended')
    })
  })

  describe('getConversationPrompt (AC4)', () => {
    it('should encourage child to share perspective', () => {
      const prompt = getConversationPrompt('child')

      expect(prompt.toLowerCase()).toContain('perspective')
      expect(prompt.toLowerCase()).toContain('not punishment')
    })

    it('should encourage parent to listen', () => {
      const prompt = getConversationPrompt('parent')

      expect(prompt.toLowerCase()).toContain('listen')
      expect(prompt.toLowerCase()).toContain('perspective')
    })
  })

  describe('getSupportiveFraming (AC6)', () => {
    it('should frame as "let\'s work on this" for child', () => {
      const framing = getSupportiveFraming('child')

      expect(framing.toLowerCase()).toContain("let's work on this")
      expect(framing.toLowerCase()).toContain("isn't about failure")
    })

    it('should frame as learning opportunity for parent', () => {
      const framing = getSupportiveFraming('parent')

      expect(framing.toLowerCase()).toContain('learning opportunity')
      expect(framing.toLowerCase()).toContain('not a failure')
    })
  })

  describe('getGracePeriodExplanation (AC1)', () => {
    it('should explain 2-week period for child', () => {
      const explanation = getGracePeriodExplanation('child')

      expect(explanation.toLowerCase()).toContain('2-week')
      expect(explanation.toLowerCase()).toContain('stays the same')
      expect(explanation.toLowerCase()).toContain('nothing changes automatically')
    })

    it('should explain 2-week period for parent', () => {
      const explanation = getGracePeriodExplanation('parent')

      expect(explanation.toLowerCase()).toContain('2-week')
      expect(explanation.toLowerCase()).toContain('remain unchanged')
    })
  })

  describe('getExplanationAcknowledgment (AC5)', () => {
    it('should thank child for sharing', () => {
      const ack = getExplanationAcknowledgment('child')

      expect(ack.toLowerCase()).toContain('thank you')
      expect(ack.toLowerCase()).toContain('explanation')
    })

    it('should notify parent of child explanation', () => {
      const ack = getExplanationAcknowledgment('parent')

      expect(ack.toLowerCase()).toContain('shared their perspective')
    })
  })

  describe('getConversationCompleteMessage', () => {
    it('should acknowledge child conversation', () => {
      const message = getConversationCompleteMessage('child')

      expect(message.toLowerCase()).toContain('great job')
      expect(message.toLowerCase()).toContain('families grow stronger')
    })

    it('should acknowledge parent conversation', () => {
      const message = getConversationCompleteMessage('parent')

      expect(message.toLowerCase()).toContain('thank you')
      expect(message.toLowerCase()).toContain('next steps')
    })
  })

  describe('getResolutionOptions', () => {
    it('should provide supportive resolve option for child', () => {
      const options = getResolutionOptions('child')

      expect(options.resolveMessage.toLowerCase()).toContain('trust')
    })

    it('should provide supportive revert option for child', () => {
      const options = getResolutionOptions('child')

      expect(options.revertMessage.toLowerCase()).toContain("isn't punishment")
      expect(options.revertMessage.toLowerCase()).toContain('temporary support')
    })

    it('should provide supportive options for parent', () => {
      const options = getResolutionOptions('parent')

      expect(options.resolveMessage.toLowerCase()).toContain('trust')
      expect(options.revertMessage.toLowerCase()).toContain('not punishment')
    })
  })

  describe('validateSupportiveFraming', () => {
    it('should pass supportive messages', () => {
      const result = validateSupportiveFraming(
        "Let's work on this together. Your perspective matters."
      )

      expect(result.valid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it('should fail messages with "you failed"', () => {
      const result = validateSupportiveFraming('You failed to maintain your trust level.')

      expect(result.valid).toBe(false)
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should fail messages with "consequence"', () => {
      const result = validateSupportiveFraming('This is a consequence of your behavior.')

      expect(result.valid).toBe(false)
    })

    it('should allow negated forms', () => {
      const result = validateSupportiveFraming("This isn't about failure - it's about learning.")

      expect(result.valid).toBe(true)
    })

    it('should fail "violated" without negation', () => {
      const result = validateSupportiveFraming('You violated your family agreement.')

      expect(result.valid).toBe(false)
    })
  })

  describe('getAllRegressionMessages', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return all message types', () => {
      const event = createRegressionEvent({
        id: 'event-123',
        childId: 'child-123',
        previousMilestone: 'maturing',
        currentMilestone: 'growing',
      })

      const messages = getAllRegressionMessages(event, 'Emma', 'child')

      expect(messages.notification).toBeDefined()
      expect(messages.gracePeriodReminder).toBeDefined()
      expect(messages.conversationPrompt).toBeDefined()
      expect(messages.supportiveFraming).toBeDefined()
      expect(messages.gracePeriodExplanation).toBeDefined()
    })
  })

  describe('AC Verification', () => {
    describe('AC2: "Let\'s talk about what happened"', () => {
      it('should use "Let\'s Talk" as primary title', () => {
        const notification = getChildRegressionNotification('Emma')

        expect(notification.title).toBe("Let's Talk")
      })

      it('should emphasize talking together', () => {
        const notification = getChildRegressionNotification('Emma')
        const prompt = getConversationPrompt('child')

        expect(notification.message.toLowerCase()).toContain('discuss')
        expect(prompt.toLowerCase()).toContain('talk')
      })
    })

    describe('AC6: Framing as "let\'s work on this" not "you failed"', () => {
      it('should use "let\'s work on this" language', () => {
        const framing = getSupportiveFraming('child')

        expect(framing).toContain("Let's work on this together")
      })

      it('should never contain "you failed" language', () => {
        const allMessages = [
          getChildRegressionNotification('Emma').message,
          getChildRegressionNotification('Emma').supportiveContext,
          getParentRegressionNotification('Emma').message,
          getParentRegressionNotification('Emma').supportiveContext,
          getGracePeriodReminder(10, 'child'),
          getGracePeriodReminder(10, 'parent'),
          getConversationPrompt('child'),
          getConversationPrompt('parent'),
          getSupportiveFraming('child'),
          getSupportiveFraming('parent'),
          getGracePeriodExplanation('child'),
          getGracePeriodExplanation('parent'),
        ].join(' ')

        // Check no punitive language (allowing negated forms)
        const withoutNegation = allMessages
          .replace(/isn't about failure/gi, '')
          .replace(/not a failure/gi, '')
          .replace(/isn't about punishment/gi, '')
          .replace(/isn't punishment/gi, '')
          .replace(/not punishment/gi, '')
          .replace(
            /about understanding and support - not punishment/gi,
            'about understanding and support'
          )

        expect(withoutNegation.toLowerCase()).not.toContain('you failed')
        expect(withoutNegation.toLowerCase()).not.toContain('failure')
        expect(withoutNegation.toLowerCase()).not.toContain('punishment')
      })

      it('should validate all messages pass supportive framing check', () => {
        const messages = [
          getChildRegressionNotification('Emma').message,
          getChildRegressionNotification('Emma').supportiveContext,
          getParentRegressionNotification('Emma').message,
          getParentRegressionNotification('Emma').supportiveContext,
          getConversationPrompt('child'),
          getConversationPrompt('parent'),
          getSupportiveFraming('child'),
          getSupportiveFraming('parent'),
        ]

        messages.forEach((msg) => {
          const result = validateSupportiveFraming(msg)
          expect(result.valid).toBe(true)
        })
      })
    })
  })
})
