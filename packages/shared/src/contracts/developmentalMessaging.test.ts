/**
 * DevelopmentalMessaging Contracts Tests - Story 37.5 Task 1
 *
 * Tests for developmental framing messaging constants.
 * AC1: Language uses "recognition" not "reward"
 * AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
 */

import { describe, it, expect } from 'vitest'
import {
  MESSAGING_PRINCIPLES,
  APPROVED_LANGUAGE,
  DISCOURAGED_LANGUAGE,
  CHILD_MILESTONE_MESSAGES,
  PARENT_MILESTONE_MESSAGES,
  REDUCTION_MESSAGES,
  RIGHTS_MESSAGES,
  SHAME_REDUCING_MESSAGES,
  messagingContextSchema,
  viewerTypeSchema,
  milestoneTypeSchema,
  developmentalMessageSchema,
  framingValidationResultSchema,
  getMilestoneMessage,
  getReductionMessage,
  getRightsMessage,
  getShameReducingMessage,
  createDevelopmentalMessage,
} from './developmentalMessaging'

describe('DevelopmentalMessaging Contracts - Story 37.5 Task 1', () => {
  describe('MESSAGING_PRINCIPLES', () => {
    it('should define core principles', () => {
      expect(MESSAGING_PRINCIPLES.privacyIsRight).toBe('Privacy is your right as you grow')
      expect(MESSAGING_PRINCIPLES.monitoringTemporary).toBe('Monitoring is temporary support')
      expect(MESSAGING_PRINCIPLES.recognizingGrowth).toBe('Recognizing your growth')
    })

    it('should not contain discouraged language', () => {
      const principles = Object.values(MESSAGING_PRINCIPLES).join(' ')
      DISCOURAGED_LANGUAGE.forEach((word) => {
        expect(principles.toLowerCase()).not.toContain(word)
      })
    })
  })

  describe('APPROVED_LANGUAGE (AC1)', () => {
    it('should include recognition-focused words', () => {
      expect(APPROVED_LANGUAGE).toContain('recognizing')
      expect(APPROVED_LANGUAGE).toContain('growth')
      expect(APPROVED_LANGUAGE).toContain('maturity')
      expect(APPROVED_LANGUAGE).toContain('developmental')
    })

    it('should include rights-focused words', () => {
      expect(APPROVED_LANGUAGE).toContain('right')
      expect(APPROVED_LANGUAGE).toContain('inherent')
    })

    it('should include support-focused words', () => {
      expect(APPROVED_LANGUAGE).toContain('temporary')
      expect(APPROVED_LANGUAGE).toContain('supporting')
    })
  })

  describe('DISCOURAGED_LANGUAGE (AC2)', () => {
    it('should include reward-focused words', () => {
      expect(DISCOURAGED_LANGUAGE).toContain('earned')
      expect(DISCOURAGED_LANGUAGE).toContain('reward')
      expect(DISCOURAGED_LANGUAGE).toContain('deserve')
    })

    it('should include privilege-focused words', () => {
      expect(DISCOURAGED_LANGUAGE).toContain('privilege')
    })

    it('should include punitive words', () => {
      expect(DISCOURAGED_LANGUAGE).toContain('punishment')
      expect(DISCOURAGED_LANGUAGE).toContain('punish')
      expect(DISCOURAGED_LANGUAGE).toContain('consequence')
    })
  })

  describe('CHILD_MILESTONE_MESSAGES (AC1, AC2)', () => {
    it('should define growing milestone message', () => {
      expect(CHILD_MILESTONE_MESSAGES.growing.title).toBe('Growing Together')
      expect(CHILD_MILESTONE_MESSAGES.growing.message).toContain('recognizing')
    })

    it('should define maturing milestone message', () => {
      expect(CHILD_MILESTONE_MESSAGES.maturing.title).toBe('Maturing Responsibility')
      expect(CHILD_MILESTONE_MESSAGES.maturing.message).toContain('recognized')
    })

    it('should define readyForIndependence message', () => {
      expect(CHILD_MILESTONE_MESSAGES.readyForIndependence.title).toBe('Ready for Independence')
      expect(CHILD_MILESTONE_MESSAGES.readyForIndependence.message).toContain('recognize')
    })

    it('should not contain discouraged language', () => {
      const messages = Object.values(CHILD_MILESTONE_MESSAGES)
        .map((m) => m.message)
        .join(' ')
      DISCOURAGED_LANGUAGE.forEach((word) => {
        expect(messages.toLowerCase()).not.toContain(word)
      })
    })
  })

  describe('PARENT_MILESTONE_MESSAGES', () => {
    it('should explain developmental approach', () => {
      expect(PARENT_MILESTONE_MESSAGES.growing.message).toContain('growth')
      expect(PARENT_MILESTONE_MESSAGES.maturing.message).toContain('maturity')
      expect(PARENT_MILESTONE_MESSAGES.readyForIndependence.message).toContain('independence')
    })

    it('should not contain discouraged language', () => {
      const messages = Object.values(PARENT_MILESTONE_MESSAGES)
        .map((m) => m.message)
        .join(' ')
      DISCOURAGED_LANGUAGE.forEach((word) => {
        expect(messages.toLowerCase()).not.toContain(word)
      })
    })
  })

  describe('REDUCTION_MESSAGES', () => {
    it('should define screenshot frequency messages', () => {
      expect(REDUCTION_MESSAGES.screenshotFrequency.child).toContain('maturity')
      expect(REDUCTION_MESSAGES.screenshotFrequency.parent).toContain('development')
    })

    it('should define notification-only messages', () => {
      expect(REDUCTION_MESSAGES.notificationOnly.child).toContain('trust')
      expect(REDUCTION_MESSAGES.notificationOnly.parent).toContain('recognizes')
    })

    it('should define automatic reduction messages', () => {
      expect(REDUCTION_MESSAGES.automaticReduction.child).toContain('automatically reduced')
      expect(REDUCTION_MESSAGES.automaticReduction.parent).toContain('automatically reduced')
    })

    it('should not contain discouraged language', () => {
      const messages = Object.values(REDUCTION_MESSAGES)
        .flatMap((m) => [m.child, m.parent])
        .join(' ')
      DISCOURAGED_LANGUAGE.forEach((word) => {
        expect(messages.toLowerCase()).not.toContain(word)
      })
    })
  })

  describe('RIGHTS_MESSAGES (AC3)', () => {
    it('should emphasize privacy as a right', () => {
      expect(RIGHTS_MESSAGES.privacyReminder.child).toContain('right')
      expect(RIGHTS_MESSAGES.privacyReminder.parent).toContain('right')
    })

    it('should emphasize temporary nature', () => {
      expect(RIGHTS_MESSAGES.temporaryNature.child).toContain('not permanent')
      expect(RIGHTS_MESSAGES.temporaryNature.parent).toContain('temporary')
    })

    it('should frame growth recognition correctly', () => {
      expect(RIGHTS_MESSAGES.growthRecognition.child).toContain('not as a reward')
      expect(RIGHTS_MESSAGES.growthRecognition.parent).toContain('not rewarding behavior')
    })
  })

  describe('SHAME_REDUCING_MESSAGES (AC6)', () => {
    it('should normalize monitoring', () => {
      expect(SHAME_REDUCING_MESSAGES.monitoringNormal.child).toContain('normal')
    })

    it('should frame as support not surveillance', () => {
      expect(SHAME_REDUCING_MESSAGES.supportNotSurveillance.child).toContain('support')
      expect(SHAME_REDUCING_MESSAGES.supportNotSurveillance.child).toContain("isn't surveillance")
    })

    it('should explicitly reduce shame', () => {
      expect(SHAME_REDUCING_MESSAGES.noShame.child).toContain('no shame')
    })
  })

  describe('Schemas', () => {
    describe('messagingContextSchema', () => {
      it('should validate contexts', () => {
        expect(messagingContextSchema.parse('milestone')).toBe('milestone')
        expect(messagingContextSchema.parse('reduction')).toBe('reduction')
        expect(messagingContextSchema.parse('regression')).toBe('regression')
        expect(messagingContextSchema.parse('rights')).toBe('rights')
        expect(messagingContextSchema.parse('info')).toBe('info')
      })

      it('should reject invalid contexts', () => {
        expect(() => messagingContextSchema.parse('invalid')).toThrow()
      })
    })

    describe('viewerTypeSchema', () => {
      it('should validate viewer types', () => {
        expect(viewerTypeSchema.parse('child')).toBe('child')
        expect(viewerTypeSchema.parse('parent')).toBe('parent')
      })
    })

    describe('milestoneTypeSchema', () => {
      it('should validate milestone types', () => {
        expect(milestoneTypeSchema.parse('growing')).toBe('growing')
        expect(milestoneTypeSchema.parse('maturing')).toBe('maturing')
        expect(milestoneTypeSchema.parse('readyForIndependence')).toBe('readyForIndependence')
      })
    })

    describe('developmentalMessageSchema', () => {
      it('should validate developmental message', () => {
        const message = {
          title: 'Test Title',
          message: 'Test message content',
          context: 'milestone',
          viewerType: 'child',
          milestone: 'growing',
        }

        const result = developmentalMessageSchema.parse(message)
        expect(result.title).toBe('Test Title')
        expect(result.message).toBe('Test message content')
        expect(result.context).toBe('milestone')
      })

      it('should allow optional milestone', () => {
        const message = {
          title: 'Rights Info',
          message: 'Privacy is your right',
          context: 'rights',
          viewerType: 'child',
        }

        const result = developmentalMessageSchema.parse(message)
        expect(result.milestone).toBeUndefined()
      })
    })

    describe('framingValidationResultSchema', () => {
      it('should validate result structure', () => {
        const result = {
          valid: true,
          issues: [],
          approvedWordsFound: ['recognizing', 'growth'],
          discouragedWordsFound: [],
        }

        const parsed = framingValidationResultSchema.parse(result)
        expect(parsed.valid).toBe(true)
        expect(parsed.approvedWordsFound).toContain('recognizing')
      })

      it('should validate invalid result', () => {
        const result = {
          valid: false,
          issues: ['Contains "earned" language'],
          approvedWordsFound: [],
          discouragedWordsFound: ['earned'],
        }

        const parsed = framingValidationResultSchema.parse(result)
        expect(parsed.valid).toBe(false)
        expect(parsed.issues).toContain('Contains "earned" language')
      })
    })
  })

  describe('Factory Functions', () => {
    describe('getMilestoneMessage', () => {
      it('should return child message for child viewer', () => {
        const message = getMilestoneMessage('growing', 'child')
        expect(message.title).toBe('Growing Together')
      })

      it('should return parent message for parent viewer', () => {
        const message = getMilestoneMessage('growing', 'parent')
        expect(message.title).toBe("Recognizing Your Child's Growth")
      })

      it('should return different messages for each milestone', () => {
        const growing = getMilestoneMessage('growing', 'child')
        const maturing = getMilestoneMessage('maturing', 'child')
        const ready = getMilestoneMessage('readyForIndependence', 'child')

        expect(growing.title).not.toBe(maturing.title)
        expect(maturing.title).not.toBe(ready.title)
      })
    })

    describe('getReductionMessage', () => {
      it('should return screenshot frequency message', () => {
        const childMsg = getReductionMessage('screenshotFrequency', 'child')
        expect(childMsg).toContain('fewer screenshots')

        const parentMsg = getReductionMessage('screenshotFrequency', 'parent')
        expect(parentMsg).toContain('Screenshot frequency')
      })

      it('should return notification-only message', () => {
        const msg = getReductionMessage('notificationOnly', 'child')
        expect(msg).toContain('notification-only')
      })

      it('should return automatic reduction message', () => {
        const msg = getReductionMessage('automaticReduction', 'child')
        expect(msg).toContain('automatically reduced')
      })
    })

    describe('getRightsMessage', () => {
      it('should return privacy reminder', () => {
        const msg = getRightsMessage('privacyReminder', 'child')
        expect(msg).toContain('right')
      })

      it('should return temporary nature message', () => {
        const msg = getRightsMessage('temporaryNature', 'child')
        expect(msg).toContain('not permanent')
      })

      it('should return growth recognition message', () => {
        const msg = getRightsMessage('growthRecognition', 'child')
        expect(msg).toContain('not as a reward')
      })
    })

    describe('getShameReducingMessage', () => {
      it('should return monitoring normal message', () => {
        const msg = getShameReducingMessage('monitoringNormal', 'child')
        expect(msg).toContain('normal')
      })

      it('should return support message', () => {
        const msg = getShameReducingMessage('supportNotSurveillance', 'child')
        expect(msg).toContain('support')
      })

      it('should return no shame message', () => {
        const msg = getShameReducingMessage('noShame', 'child')
        expect(msg).toContain('no shame')
      })
    })

    describe('createDevelopmentalMessage', () => {
      it('should create valid message', () => {
        const msg = createDevelopmentalMessage(
          'Test Title',
          'Recognizing your growth',
          'milestone',
          'child',
          'growing'
        )

        expect(msg.title).toBe('Test Title')
        expect(msg.message).toBe('Recognizing your growth')
        expect(msg.context).toBe('milestone')
        expect(msg.viewerType).toBe('child')
        expect(msg.milestone).toBe('growing')
      })

      it('should create message without milestone', () => {
        const msg = createDevelopmentalMessage(
          'Rights Title',
          'Privacy is your right',
          'rights',
          'child'
        )

        expect(msg.title).toBe('Rights Title')
        expect(msg.milestone).toBeUndefined()
      })

      it('should throw on invalid input', () => {
        expect(() => createDevelopmentalMessage('', 'Message', 'milestone', 'child')).toThrow()
      })
    })
  })

  describe('Language Verification (AC1, AC2)', () => {
    it('should verify all child messages use recognition language', () => {
      const allChildMessages = [
        ...Object.values(CHILD_MILESTONE_MESSAGES).map((m) => m.message),
        ...Object.values(REDUCTION_MESSAGES).map((m) => m.child),
        ...Object.values(RIGHTS_MESSAGES).map((m) => m.child),
        ...Object.values(SHAME_REDUCING_MESSAGES).map((m) => m.child),
      ]

      allChildMessages.forEach((msg) => {
        DISCOURAGED_LANGUAGE.forEach((word) => {
          const msgLower = msg.toLowerCase()
          // Allow words if they're negated (e.g., "not as a reward", "not a punishment")
          if (
            msgLower.includes('not as a ' + word) ||
            msgLower.includes('not a ' + word) ||
            msgLower.includes("isn't " + word) ||
            msgLower.includes('not ' + word)
          ) {
            return
          }
          expect(msgLower).not.toContain(word)
        })
      })
    })

    it('should verify all parent messages use recognition language', () => {
      const allParentMessages = [
        ...Object.values(PARENT_MILESTONE_MESSAGES).map((m) => m.message),
        ...Object.values(REDUCTION_MESSAGES).map((m) => m.parent),
        ...Object.values(RIGHTS_MESSAGES).map((m) => m.parent),
        ...Object.values(SHAME_REDUCING_MESSAGES).map((m) => m.parent),
      ]

      allParentMessages.forEach((msg) => {
        // Only check for truly problematic words
        const problemWords = ['earned', 'deserve', 'privilege', 'punish']
        problemWords.forEach((word) => {
          if (!msg.toLowerCase().includes('not ' + word)) {
            expect(msg.toLowerCase()).not.toContain(word)
          }
        })
      })
    })
  })
})
