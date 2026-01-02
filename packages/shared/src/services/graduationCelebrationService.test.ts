/**
 * Graduation Celebration Service Tests - Story 38.3 Task 3
 *
 * Tests for graduation celebration messaging.
 * AC3: Celebration message displayed: "Congratulations on graduating from monitoring!"
 */

import { describe, it, expect } from 'vitest'
import {
  getCelebrationMessage,
  getAchievementSummary,
  getTransitionMessage,
  getNextStepsMessage,
  getCertificateCongratulations,
  getFullCelebrationContent,
  CELEBRATION_MESSAGES,
} from './graduationCelebrationService'

describe('GraduationCelebrationService', () => {
  // ============================================
  // getCelebrationMessage Tests
  // ============================================

  describe('getCelebrationMessage', () => {
    it('should return child celebration message', () => {
      const message = getCelebrationMessage('child', 'Alex')
      expect(message).toContain('Congratulations')
      expect(message).toContain('graduated from monitoring')
    })

    it('should return parent celebration message with child name', () => {
      const message = getCelebrationMessage('parent', 'Alex')
      expect(message).toContain('Congratulations')
      expect(message).toContain('Alex')
      expect(message).toContain('graduated from monitoring')
    })

    it('should use different messages for child and parent', () => {
      const childMessage = getCelebrationMessage('child', 'Alex')
      const parentMessage = getCelebrationMessage('parent', 'Alex')
      expect(childMessage).not.toBe(parentMessage)
    })

    it('should personalize parent message with child name', () => {
      const message1 = getCelebrationMessage('parent', 'Jordan')
      const message2 = getCelebrationMessage('parent', 'Taylor')

      expect(message1).toContain('Jordan')
      expect(message2).toContain('Taylor')
      expect(message1).not.toContain('Taylor')
      expect(message2).not.toContain('Jordan')
    })
  })

  // ============================================
  // getAchievementSummary Tests
  // ============================================

  describe('getAchievementSummary', () => {
    it('should include months at perfect trust', () => {
      const summary = getAchievementSummary(12, 24)
      expect(summary).toContain('12')
      expect(summary).toMatch(/100%\s*trust/i)
    })

    it('should include total monitoring duration', () => {
      const summary = getAchievementSummary(12, 24)
      expect(summary).toContain('24')
      expect(summary).toMatch(/monitoring\s*(journey|duration)?/i)
    })

    it('should handle equal values', () => {
      const summary = getAchievementSummary(12, 12)
      expect(summary).toBeDefined()
      expect(summary.length).toBeGreaterThan(0)
    })

    it('should format correctly for single month', () => {
      const summary = getAchievementSummary(1, 6)
      expect(summary).toContain('1')
    })
  })

  // ============================================
  // getTransitionMessage Tests
  // ============================================

  describe('getTransitionMessage', () => {
    it('should return child transition message', () => {
      const message = getTransitionMessage('child')
      expect(message).toMatch(/alumni\s*status/i)
      expect(message).toMatch(/no\s*monitoring/i)
    })

    it('should return parent transition message', () => {
      const message = getTransitionMessage('parent')
      expect(message).toMatch(/alumni\s*status/i)
    })

    it('should use different messages for child and parent', () => {
      const childMessage = getTransitionMessage('child')
      const parentMessage = getTransitionMessage('parent')
      expect(childMessage).not.toBe(parentMessage)
    })
  })

  // ============================================
  // getNextStepsMessage Tests
  // ============================================

  describe('getNextStepsMessage', () => {
    it('should return child next steps message', () => {
      const message = getNextStepsMessage('child')
      expect(message).toMatch(/resources/i)
    })

    it('should return parent next steps message', () => {
      const message = getNextStepsMessage('parent')
      expect(message).toMatch(/resources/i)
    })

    it('should be different for child and parent', () => {
      const childMessage = getNextStepsMessage('child')
      const parentMessage = getNextStepsMessage('parent')
      expect(childMessage).not.toBe(parentMessage)
    })
  })

  // ============================================
  // getCertificateCongratulations Tests
  // ============================================

  describe('getCertificateCongratulations', () => {
    it('should include child name', () => {
      const content = getCertificateCongratulations('Alex', new Date('2025-06-15'), 12)
      expect(content.title).toBeDefined()
      expect(content.childName).toBe('Alex')
    })

    it('should format graduation date', () => {
      const content = getCertificateCongratulations('Alex', new Date('2025-06-15'), 12)
      expect(content.dateFormatted).toBeDefined()
      expect(content.dateFormatted.length).toBeGreaterThan(0)
    })

    it('should include months completed in achievement text', () => {
      const content = getCertificateCongratulations('Alex', new Date('2025-06-15'), 12)
      expect(content.achievementText).toContain('12')
    })

    it('should have all required certificate fields', () => {
      const content = getCertificateCongratulations('Jordan', new Date('2025-07-01'), 15)
      expect(content.title).toBeDefined()
      expect(content.childName).toBeDefined()
      expect(content.dateFormatted).toBeDefined()
      expect(content.achievementText).toBeDefined()
      expect(content.journeyText).toBeDefined()
    })

    it('should personalize journey text based on months', () => {
      const short = getCertificateCongratulations('Alex', new Date(), 12)
      const long = getCertificateCongratulations('Alex', new Date(), 24)
      // Both should have journey text but content may vary
      expect(short.journeyText.length).toBeGreaterThan(0)
      expect(long.journeyText.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // getFullCelebrationContent Tests
  // ============================================

  describe('getFullCelebrationContent', () => {
    it('should return complete celebration content for child', () => {
      const content = getFullCelebrationContent({
        viewerType: 'child',
        childName: 'Alex',
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringMonths: 24,
      })

      expect(content.mainMessage).toBeDefined()
      expect(content.achievementSummary).toBeDefined()
      expect(content.transitionMessage).toBeDefined()
      expect(content.nextStepsMessage).toBeDefined()
    })

    it('should return complete celebration content for parent', () => {
      const content = getFullCelebrationContent({
        viewerType: 'parent',
        childName: 'Alex',
        graduationDate: new Date('2025-06-15'),
        monthsAtPerfectTrust: 12,
        totalMonitoringMonths: 24,
      })

      expect(content.mainMessage).toBeDefined()
      expect(content.achievementSummary).toBeDefined()
      expect(content.transitionMessage).toBeDefined()
      expect(content.nextStepsMessage).toBeDefined()
    })

    it('should include child name in content', () => {
      const content = getFullCelebrationContent({
        viewerType: 'parent',
        childName: 'Jordan',
        graduationDate: new Date(),
        monthsAtPerfectTrust: 12,
        totalMonitoringMonths: 18,
      })

      expect(content.mainMessage).toContain('Jordan')
    })
  })

  // ============================================
  // CELEBRATION_MESSAGES Constants Tests
  // ============================================

  describe('CELEBRATION_MESSAGES constants', () => {
    it('should have child celebration message', () => {
      expect(CELEBRATION_MESSAGES.main.child).toBeDefined()
      expect(CELEBRATION_MESSAGES.main.child.length).toBeGreaterThan(0)
    })

    it('should have parent celebration message', () => {
      expect(CELEBRATION_MESSAGES.main.parent).toBeDefined()
      expect(CELEBRATION_MESSAGES.main.parent.length).toBeGreaterThan(0)
    })

    it('should have transition messages', () => {
      expect(CELEBRATION_MESSAGES.transition.child).toBeDefined()
      expect(CELEBRATION_MESSAGES.transition.parent).toBeDefined()
    })

    it('should have next steps messages', () => {
      expect(CELEBRATION_MESSAGES.nextSteps.child).toBeDefined()
      expect(CELEBRATION_MESSAGES.nextSteps.parent).toBeDefined()
    })

    it('should have certificate template', () => {
      expect(CELEBRATION_MESSAGES.certificate.title).toBeDefined()
    })
  })
})
