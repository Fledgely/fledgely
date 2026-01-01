/**
 * DevelopmentalMessagingService Tests - Story 37.5 Task 2
 *
 * Tests for developmental messaging service.
 * AC1: Language uses "recognition" not "reward"
 * AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
 * AC3: Emphasis: privacy is inherent, monitoring is temporary support
 * AC4: Messaging validated with child rights advocate principles
 */

import { describe, it, expect } from 'vitest'
import {
  getMilestoneMessage,
  getMilestoneHeading,
  getReductionMessage,
  getFullReductionNotification,
  getRegressionMessage,
  validateDevelopmentalFraming,
  validateChildRightsPrinciples,
  getPrivacyRightsReminder,
  getTemporaryNatureMessage,
  getGrowthRecognitionMessage,
  getShameReducingMessage,
  getShameReducingContext,
  getTrustMilestoneNotification,
  getChildDevelopmentalContext,
  getParentEducationContext,
} from './developmentalMessagingService'

describe('DevelopmentalMessagingService - Story 37.5 Task 2', () => {
  describe('getMilestoneMessage', () => {
    it('should return child-focused message for child viewer', () => {
      const message = getMilestoneMessage('growing', 'Emma', 'child')
      expect(message).toContain('recognizing')
    })

    it('should return parent-focused message with child name', () => {
      const message = getMilestoneMessage('growing', 'Emma', 'parent')
      expect(message).toContain('Emma')
    })

    it('should return different messages for each milestone', () => {
      const growing = getMilestoneMessage('growing', 'Emma', 'child')
      const maturing = getMilestoneMessage('maturing', 'Emma', 'child')
      const ready = getMilestoneMessage('readyForIndependence', 'Emma', 'child')

      expect(growing).not.toBe(maturing)
      expect(maturing).not.toBe(ready)
    })

    it('should use recognition language for child (AC1)', () => {
      const message = getMilestoneMessage('readyForIndependence', 'Emma', 'child')
      expect(message.toLowerCase()).toContain('recognize')
    })
  })

  describe('getMilestoneHeading', () => {
    it('should return child heading', () => {
      expect(getMilestoneHeading('growing', 'child')).toBe('Growing Together')
    })

    it('should return parent heading', () => {
      expect(getMilestoneHeading('growing', 'parent')).toBe("Recognizing Your Child's Growth")
    })

    it('should return maturity heading', () => {
      expect(getMilestoneHeading('maturing', 'child')).toBe('Maturing Responsibility')
    })

    it('should return independence heading', () => {
      expect(getMilestoneHeading('readyForIndependence', 'child')).toBe('Ready for Independence')
    })
  })

  describe('getReductionMessage', () => {
    it('should return screenshot frequency message for child', () => {
      const message = getReductionMessage('screenshotFrequency', 'Emma', 'child')
      expect(message).toContain('fewer screenshots')
      expect(message).toContain('maturity')
    })

    it('should return screenshot frequency message for parent', () => {
      const message = getReductionMessage('screenshotFrequency', 'Emma', 'parent')
      expect(message).toContain('Emma')
      expect(message).toContain('development')
    })

    it('should return notification-only message', () => {
      const message = getReductionMessage('notificationOnly', 'Emma', 'child')
      expect(message).toContain('notification-only')
      expect(message).toContain('trust')
    })

    it('should return automatic reduction message', () => {
      const message = getReductionMessage('automaticReduction', 'Emma', 'child')
      expect(message).toContain('automatically')
      expect(message).toContain('6 months')
    })
  })

  describe('getFullReductionNotification', () => {
    it('should return complete notification for screenshot frequency', () => {
      const notification = getFullReductionNotification('screenshotFrequency', 'Emma', 'child')

      expect(notification.title).toBe('Screenshot Frequency Reducing')
      expect(notification.message).toContain('maturity')
      expect(notification.context).toBe('reduction')
      expect(notification.viewerType).toBe('child')
    })

    it('should return notification-only notification', () => {
      const notification = getFullReductionNotification('notificationOnly', 'Emma', 'child')

      expect(notification.title).toBe('Notification-Only Mode Activated')
    })

    it('should return automatic reduction notification', () => {
      const notification = getFullReductionNotification('automaticReduction', 'Emma', 'parent')

      expect(notification.title).toBe('Automatic Reduction Applied')
      expect(notification.viewerType).toBe('parent')
    })
  })

  describe('getRegressionMessage', () => {
    it('should return supportive initial message for child', () => {
      const message = getRegressionMessage('initial', 'Emma', 'child')

      expect(message).toContain("Let's talk")
      expect(message).toContain('together')
      expect(message.toLowerCase()).not.toContain('failed')
    })

    it('should return conversation-first message for parent', () => {
      const message = getRegressionMessage('conversation', 'Emma', 'parent')

      expect(message).toContain('Emma')
      expect(message).toContain('talk')
      expect(message).toContain('before')
    })

    it('should explain grace period for child', () => {
      const message = getRegressionMessage('gracePeriod', 'Emma', 'child')

      expect(message).toContain('2-week')
      expect(message).toContain('grace period')
    })

    it('should emphasize support for child', () => {
      const message = getRegressionMessage('support', 'Emma', 'child')

      expect(message).toContain("isn't about punishment")
      expect(message).toContain('support')
    })

    it('should use no punitive language (unless negated)', () => {
      const types = ['initial', 'conversation', 'gracePeriod', 'support'] as const
      types.forEach((type) => {
        const message = getRegressionMessage(type, 'Emma', 'child').toLowerCase()
        // Allow negated usage like "isn't about punishment"
        if (!message.includes("isn't about punishment") && !message.includes('not punishment')) {
          expect(message).not.toContain('punishment')
        }
        expect(message).not.toContain('failed')
        expect(message).not.toContain('consequence')
      })
    })
  })

  describe('validateDevelopmentalFraming (AC4)', () => {
    it('should validate message with approved language', () => {
      const result = validateDevelopmentalFraming("We're recognizing your growth and maturity")

      expect(result.valid).toBe(true)
      expect(result.approvedWordsFound).toContain('recognizing')
      expect(result.approvedWordsFound).toContain('growth')
      expect(result.approvedWordsFound).toContain('maturity')
    })

    it('should flag message with discouraged language', () => {
      const result = validateDevelopmentalFraming("You've earned more privacy")

      expect(result.valid).toBe(false)
      expect(result.discouragedWordsFound).toContain('earned')
      expect(result.issues.length).toBeGreaterThan(0)
    })

    it('should allow negated discouraged words', () => {
      const result = validateDevelopmentalFraming('This is not as a reward, but recognition')

      expect(result.valid).toBe(true)
    })

    it('should flag multiple issues', () => {
      const result = validateDevelopmentalFraming("You've earned this reward for your behavior")

      expect(result.valid).toBe(false)
      expect(result.discouragedWordsFound).toContain('earned')
      expect(result.discouragedWordsFound).toContain('reward')
      expect(result.discouragedWordsFound).toContain('behavior')
    })

    it('should pass empty approved if no approved words', () => {
      const result = validateDevelopmentalFraming('Hello there')

      expect(result.approvedWordsFound).toEqual([])
    })
  })

  describe('validateChildRightsPrinciples (AC4)', () => {
    it('should pass good developmental framing', () => {
      expect(
        validateChildRightsPrinciples("We're recognizing your growth by reducing monitoring")
      ).toBe(true)
    })

    it('should fail earned/reward language', () => {
      expect(validateChildRightsPrinciples("You've earned more privacy as a reward")).toBe(false)
    })

    it('should pass short messages without approved words', () => {
      expect(validateChildRightsPrinciples('Hello!')).toBe(true)
    })

    it('should validate real milestone messages', () => {
      const message = getMilestoneMessage('growing', 'Emma', 'child')
      expect(validateChildRightsPrinciples(message)).toBe(true)
    })
  })

  describe('getPrivacyRightsReminder (AC3)', () => {
    it('should return child rights reminder', () => {
      const message = getPrivacyRightsReminder('child')

      expect(message).toContain('right')
      expect(message).toContain('temporary')
    })

    it('should return parent rights reminder', () => {
      const message = getPrivacyRightsReminder('parent')

      expect(message).toContain('right')
    })
  })

  describe('getTemporaryNatureMessage (AC3)', () => {
    it('should emphasize temporary for child', () => {
      const message = getTemporaryNatureMessage('child')

      expect(message).toContain('not permanent')
    })

    it('should emphasize temporary for parent', () => {
      const message = getTemporaryNatureMessage('parent')

      expect(message).toContain('temporary')
    })
  })

  describe('getGrowthRecognitionMessage', () => {
    it('should emphasize not a reward for child', () => {
      const message = getGrowthRecognitionMessage('child')

      expect(message).toContain('not as a reward')
      expect(message).toContain('recognition')
    })

    it('should explain approach for parent', () => {
      const message = getGrowthRecognitionMessage('parent')

      expect(message).toContain('not rewarding behavior')
    })
  })

  describe('getShameReducingMessage (AC6)', () => {
    it('should normalize monitoring', () => {
      const message = getShameReducingMessage('monitoringNormal', 'child')

      expect(message).toContain('normal')
    })

    it('should frame as support', () => {
      const message = getShameReducingMessage('supportNotSurveillance', 'child')

      expect(message).toContain('support')
      expect(message).toContain("isn't surveillance")
    })

    it('should reduce shame', () => {
      const message = getShameReducingMessage('noShame', 'child')

      expect(message).toContain('no shame')
    })
  })

  describe('getShameReducingContext (AC6)', () => {
    it('should return all shame-reducing messages for child', () => {
      const messages = getShameReducingContext('child')

      expect(messages.length).toBe(3)
      expect(messages.some((m) => m.includes('normal'))).toBe(true)
      expect(messages.some((m) => m.includes('support'))).toBe(true)
      expect(messages.some((m) => m.includes('no shame'))).toBe(true)
    })

    it('should return all messages for parent', () => {
      const messages = getShameReducingContext('parent')

      expect(messages.length).toBe(3)
    })
  })

  describe('getTrustMilestoneNotification', () => {
    it('should return complete notification', () => {
      const notification = getTrustMilestoneNotification('growing', 'Emma', 'child')

      expect(notification.heading).toBe('Growing Together')
      expect(notification.message).toContain('recognizing')
      expect(notification.rightsReminder).toContain('right')
    })

    it('should personalize for parent', () => {
      const notification = getTrustMilestoneNotification('maturing', 'Emma', 'parent')

      expect(notification.message).toContain('Emma')
    })
  })

  describe('getChildDevelopmentalContext (AC5)', () => {
    it('should return context for helping children understand rights', () => {
      const context = getChildDevelopmentalContext()

      expect(context.privacyMessage).toContain('right')
      expect(context.temporaryMessage).toContain('not permanent')
      expect(context.shameReduction).toContain('no shame')
    })
  })

  describe('getParentEducationContext', () => {
    it('should return context for helping parents understand approach', () => {
      const context = getParentEducationContext()

      expect(context.developmentalApproach).toContain('not rewarding')
      expect(context.temporaryNature).toContain('temporary')
      expect(context.supportFraming).toContain('support')
    })
  })

  describe('AC Verification', () => {
    describe('AC1: Language uses "recognition" not "reward"', () => {
      it('should use recognition in all milestone messages', () => {
        const milestones = ['growing', 'maturing', 'readyForIndependence'] as const
        milestones.forEach((m) => {
          const message = getMilestoneMessage(m, 'Emma', 'child')
          const validation = validateDevelopmentalFraming(message)
          expect(validation.valid).toBe(true)
        })
      })
    })

    describe('AC2: Examples follow correct framing', () => {
      it('should not use "earned privacy" framing', () => {
        const badExample = "You've earned privacy"
        const validation = validateDevelopmentalFraming(badExample)
        expect(validation.valid).toBe(false)
      })

      it('should use "recognizing maturity" framing', () => {
        const goodExample = 'Recognizing your maturity'
        const validation = validateDevelopmentalFraming(goodExample)
        expect(validation.valid).toBe(true)
        expect(validation.approvedWordsFound).toContain('maturity')
      })
    })

    describe('AC3: Privacy is inherent, monitoring is temporary', () => {
      it('should emphasize rights', () => {
        const reminder = getPrivacyRightsReminder('child')
        expect(reminder).toContain('right')
      })

      it('should emphasize temporary nature', () => {
        const message = getTemporaryNatureMessage('child')
        expect(message).toContain('not permanent')
      })
    })

    describe('AC4: Messaging validated with child rights principles', () => {
      it('should validate all milestone messages pass framing check', () => {
        const milestones = ['growing', 'maturing', 'readyForIndependence'] as const
        milestones.forEach((m) => {
          const childMsg = getMilestoneMessage(m, 'Emma', 'child')
          const parentMsg = getMilestoneMessage(m, 'Emma', 'parent')
          const childResult = validateDevelopmentalFraming(childMsg)
          const parentResult = validateDevelopmentalFraming(parentMsg)
          // Messages should not contain discouraged language
          expect(childResult.discouragedWordsFound).toEqual([])
          expect(parentResult.discouragedWordsFound).toEqual([])
        })
      })

      it('should validate all reduction messages pass framing check', () => {
        const reductions = [
          'screenshotFrequency',
          'notificationOnly',
          'automaticReduction',
        ] as const
        reductions.forEach((r) => {
          const msg = getReductionMessage(r, 'Emma', 'child')
          const result = validateDevelopmentalFraming(msg)
          expect(result.discouragedWordsFound).toEqual([])
        })
      })

      it('should validate regression messages use negated discouraged words only', () => {
        const regressions = ['initial', 'conversation', 'gracePeriod', 'support'] as const
        regressions.forEach((r) => {
          const msg = getRegressionMessage(r, 'Emma', 'child')
          const result = validateDevelopmentalFraming(msg)
          // Regression messages may contain negated discouraged words like "isn't about punishment"
          // which are acceptable - the validation should still pass
          // The key check: messages should pass validation (valid: true)
          expect(result.valid).toBe(true)
        })
      })
    })
  })
})
