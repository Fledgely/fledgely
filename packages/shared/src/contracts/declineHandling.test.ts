/**
 * Decline Handling Constants Tests - Story 34.5
 *
 * Tests for decline reason constants and messaging.
 * AC1: Decline reason required
 * AC2: Respectful language
 * AC5, AC6: Positive messaging after decline
 */

import { describe, it, expect } from 'vitest'
import {
  DECLINE_REASONS,
  DECLINE_MESSAGES,
  AFTER_DECLINE_MESSAGES,
  declineReasonIdSchema,
} from './index'

describe('Decline Handling Constants - Story 34.5', () => {
  describe('DECLINE_REASONS', () => {
    it('should have at least 5 predefined reasons', () => {
      expect(DECLINE_REASONS.length).toBeGreaterThanOrEqual(5)
    })

    it('should include "not ready" option', () => {
      const notReadyReason = DECLINE_REASONS.find((r) => r.id === 'not-ready')
      expect(notReadyReason).toBeDefined()
      expect(notReadyReason?.label).toContain('not ready')
    })

    it('should include "custom" option for other reasons', () => {
      const customReason = DECLINE_REASONS.find((r) => r.id === 'custom')
      expect(customReason).toBeDefined()
    })

    it('should have respectful, non-punitive labels', () => {
      for (const reason of DECLINE_REASONS) {
        // None should contain negative words
        expect(reason.label.toLowerCase()).not.toContain('reject')
        expect(reason.label.toLowerCase()).not.toContain('refuse')
        expect(reason.label.toLowerCase()).not.toContain('never')
      }
    })

    it('should have unique ids', () => {
      const ids = DECLINE_REASONS.map((r) => r.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('declineReasonIdSchema', () => {
    it('should validate valid reason ids', () => {
      expect(declineReasonIdSchema.safeParse('not-ready').success).toBe(true)
      expect(declineReasonIdSchema.safeParse('need-discussion').success).toBe(true)
      expect(declineReasonIdSchema.safeParse('custom').success).toBe(true)
    })

    it('should reject invalid reason ids', () => {
      expect(declineReasonIdSchema.safeParse('invalid-reason').success).toBe(false)
      expect(declineReasonIdSchema.safeParse('').success).toBe(false)
    })
  })

  describe('DECLINE_MESSAGES', () => {
    it('should have a header with supportive tone', () => {
      expect(DECLINE_MESSAGES.header).toBeDefined()
      expect(DECLINE_MESSAGES.header.toLowerCase()).not.toContain('reject')
    })

    it('should have a subheader encouraging thoughtful response', () => {
      expect(DECLINE_MESSAGES.subheader).toBeDefined()
      expect(DECLINE_MESSAGES.subheader.toLowerCase()).toContain('conversation')
    })

    it('should have a custom prompt for other reasons', () => {
      expect(DECLINE_MESSAGES.customPrompt).toBeDefined()
    })

    it('should have minimum character requirement for custom reason', () => {
      expect(DECLINE_MESSAGES.customMinChars).toBeGreaterThanOrEqual(10)
    })
  })

  describe('AFTER_DECLINE_MESSAGES', () => {
    describe('proposer messages', () => {
      it('should have a non-final title', () => {
        expect(AFTER_DECLINE_MESSAGES.proposer.title).toBeDefined()
        expect(AFTER_DECLINE_MESSAGES.proposer.title.toLowerCase()).not.toContain('rejected')
      })

      it('should emphasize conversation continues', () => {
        expect(AFTER_DECLINE_MESSAGES.proposer.body.toLowerCase()).toContain('conversation')
      })

      it('should provide suggestions for next steps', () => {
        expect(AFTER_DECLINE_MESSAGES.proposer.suggestions).toBeDefined()
        expect(AFTER_DECLINE_MESSAGES.proposer.suggestions.length).toBeGreaterThanOrEqual(2)
      })

      it('should include try again messaging', () => {
        expect(AFTER_DECLINE_MESSAGES.proposer.tryAgain).toBeDefined()
      })

      it('should include cooldown information', () => {
        expect(AFTER_DECLINE_MESSAGES.proposer.cooldownInfo).toBeDefined()
        expect(AFTER_DECLINE_MESSAGES.proposer.cooldownInfo).toContain('7')
      })
    })

    describe('responder messages', () => {
      it('should thank for thoughtful response', () => {
        expect(AFTER_DECLINE_MESSAGES.responder.title).toBeDefined()
      })

      it('should suggest continued dialogue', () => {
        expect(AFTER_DECLINE_MESSAGES.responder.next).toBeDefined()
        expect(AFTER_DECLINE_MESSAGES.responder.next.toLowerCase()).toContain('discuss')
      })
    })
  })

  describe('DECLINE_NOTIFICATION', () => {
    it('should have supportive notification content', () => {
      expect(AFTER_DECLINE_MESSAGES.notification).toBeDefined()
      expect(AFTER_DECLINE_MESSAGES.notification.title).toBeDefined()
    })

    it('should suggest proposing again', () => {
      expect(AFTER_DECLINE_MESSAGES.notification.supportive).toBeDefined()
      // "later" or "again" both indicate the option to retry
      expect(
        AFTER_DECLINE_MESSAGES.notification.supportive.toLowerCase().includes('later') ||
          AFTER_DECLINE_MESSAGES.notification.supportive.toLowerCase().includes('again')
      ).toBe(true)
    })
  })
})
