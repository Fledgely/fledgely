/**
 * Graduation Progress Message Service Tests - Story 38.1 Task 3
 *
 * Tests for progress message generation.
 * AC2: Progress visible to child
 * AC4: Parent sees same progress
 * AC6: Motivates sustained behavior
 */

import { describe, it, expect } from 'vitest'
import {
  getChildProgressMessage,
  getParentProgressMessage,
  getMilestoneMessage,
  getMotivationalMessage,
  getStreakBreakMessage,
  getEligibilityExplanation,
  getPathOverview,
  formatProgressDisplay,
  getAllGraduationMessages,
} from './graduationProgressMessageService'
import { GraduationEligibilityStatus } from '../contracts/graduationEligibility'

describe('GraduationProgressMessageService - Story 38.1 Task 3', () => {
  // Helper to create status
  function createStatus(
    monthsAtPerfectTrust: number,
    currentTrustScore: number = 100,
    isEligible: boolean = false
  ): GraduationEligibilityStatus {
    return {
      childId: 'child-123',
      currentTrustScore,
      monthsAtPerfectTrust,
      eligibilityDate: null,
      isEligible,
      progressPercentage: Math.min(100, (monthsAtPerfectTrust / 12) * 100),
      streakStartDate: new Date(),
      lastCheckedAt: new Date(),
    }
  }

  describe('getChildProgressMessage (AC2)', () => {
    it('should show path intro for 0 months', () => {
      const status = createStatus(0)
      const message = getChildProgressMessage(status)

      expect(message.toLowerCase()).toContain('path to graduation')
      expect(message).toContain('12 months')
    })

    it('should show progress with months remaining', () => {
      const status = createStatus(3)
      const message = getChildProgressMessage(status)

      expect(message).toContain('3')
      expect(message).toContain('9')
    })

    it('should show halfway message at 6 months', () => {
      const status = createStatus(6)
      const message = getChildProgressMessage(status)

      expect(message.toLowerCase()).toContain('halfway')
    })

    it('should show almost there at 9 months', () => {
      const status = createStatus(9)
      const message = getChildProgressMessage(status)

      // Uses the almostThere constant from GRADUATION_MESSAGES
      expect(message).toContain('9 months')
      expect(message).toContain('3 months')
    })

    it('should show congratulations when eligible', () => {
      const status = createStatus(12, 100, true)
      const message = getChildProgressMessage(status)

      expect(message.toLowerCase()).toContain('congratulations')
    })
  })

  describe('getParentProgressMessage (AC4)', () => {
    it('should include child name', () => {
      const status = createStatus(6)
      const message = getParentProgressMessage(status, 'Emma')

      expect(message).toContain('Emma')
    })

    it('should show path intro for 0 months', () => {
      const status = createStatus(0)
      const message = getParentProgressMessage(status, 'Emma')

      expect(message).toContain('Emma')
      expect(message).toContain('12 months')
    })

    it('should show progress with months', () => {
      const status = createStatus(6)
      const message = getParentProgressMessage(status, 'Emma')

      expect(message).toContain('Emma')
      expect(message).toContain('6 months')
    })

    it('should show eligible message at 12 months', () => {
      const status = createStatus(12, 100, true)
      const message = getParentProgressMessage(status, 'Emma')

      expect(message).toContain('Emma')
      expect(message.toLowerCase()).toContain('eligibility')
    })
  })

  describe('getMilestoneMessage', () => {
    it('should return null for non-milestone months', () => {
      expect(getMilestoneMessage(2, 'child')).toBeNull()
      expect(getMilestoneMessage(5, 'child')).toBeNull()
      expect(getMilestoneMessage(7, 'parent')).toBeNull()
    })

    it('should return message for 3-month milestone', () => {
      const childMsg = getMilestoneMessage(3, 'child')
      const parentMsg = getMilestoneMessage(3, 'parent')

      expect(childMsg).toContain('3 months')
      expect(parentMsg).toContain('3 months')
    })

    it('should return halfway message for 6 months', () => {
      const childMsg = getMilestoneMessage(6, 'child')
      const parentMsg = getMilestoneMessage(6, 'parent')

      expect(childMsg?.toLowerCase()).toContain('halfway')
      expect(parentMsg?.toLowerCase()).toContain('halfway')
    })

    it('should return almost there message for 9 months', () => {
      const childMsg = getMilestoneMessage(9, 'child')
      const parentMsg = getMilestoneMessage(9, 'parent')

      expect(childMsg?.toLowerCase()).toContain('almost')
      expect(parentMsg?.toLowerCase()).toContain('graduation')
    })

    it('should return congratulations for 12 months', () => {
      const childMsg = getMilestoneMessage(12, 'child')
      const parentMsg = getMilestoneMessage(12, 'parent')

      expect(childMsg?.toLowerCase()).toContain('congratulations')
      expect(parentMsg?.toLowerCase()).toContain('eligible')
    })
  })

  describe('getMotivationalMessage (AC6)', () => {
    it('should show eligible message when eligible', () => {
      const status = createStatus(12, 100, true)

      const childMsg = getMotivationalMessage(status, 'child')
      const parentMsg = getMotivationalMessage(status, 'parent')

      expect(childMsg.toLowerCase()).toContain('responsibility')
      expect(parentMsg.toLowerCase()).toContain('maturity')
    })

    it('should show supportive message when score drops', () => {
      const status = createStatus(6, 95)
      const childMsg = getMotivationalMessage(status, 'child')

      expect(childMsg.toLowerCase()).toContain('continues')
      expect(childMsg.toLowerCase()).not.toContain('failed')
    })

    it('should show almost there when close', () => {
      const status = createStatus(10)
      const childMsg = getMotivationalMessage(status, 'child')

      expect(childMsg).toContain('2')
      expect(childMsg.toLowerCase()).toContain('almost')
    })

    it('should show steady progress message mid-journey', () => {
      const status = createStatus(5)
      const childMsg = getMotivationalMessage(status, 'child')

      expect(childMsg.toLowerCase()).toContain('closer')
    })

    it('should show encouragement at start', () => {
      const status = createStatus(2)
      const childMsg = getMotivationalMessage(status, 'child')

      expect(childMsg.toLowerCase()).toContain('closer')
    })
  })

  describe('getStreakBreakMessage', () => {
    it('should be supportive for child', () => {
      const message = getStreakBreakMessage('child', 0)

      expect(message.toLowerCase()).toContain('continues')
      expect(message.toLowerCase()).not.toContain('failed')
      expect(message.toLowerCase()).not.toContain('lost')
    })

    it('should be supportive for parent', () => {
      const message = getStreakBreakMessage('parent', 0)

      expect(message.toLowerCase()).toContain('paused')
      expect(message.toLowerCase()).not.toContain('failed')
    })

    it('should acknowledge months lost gracefully', () => {
      const childMsg = getStreakBreakMessage('child', 5)
      const parentMsg = getStreakBreakMessage('parent', 5)

      expect(childMsg.toLowerCase()).toContain('continues')
      expect(parentMsg.toLowerCase()).toContain('opportunity')
    })
  })

  describe('getEligibilityExplanation (AC5)', () => {
    it('should explain eligibility triggers conversation for child', () => {
      const message = getEligibilityExplanation('child')

      expect(message.toLowerCase()).toContain('conversation')
      expect(message.toLowerCase()).toContain('not automatic')
    })

    it('should explain for parent', () => {
      const message = getEligibilityExplanation('parent')

      expect(message.toLowerCase()).toContain('conversation')
      expect(message.toLowerCase()).toContain('demonstrated')
    })
  })

  describe('getPathOverview (AC3)', () => {
    it('should explain full path for child', () => {
      const message = getPathOverview('child')

      expect(message).toContain('12')
      expect(message).toContain('100%')
      expect(message.toLowerCase()).toContain('independence')
    })

    it('should explain for parent', () => {
      const message = getPathOverview('parent')

      expect(message).toContain('12')
      expect(message.toLowerCase()).toContain('responsibility')
    })
  })

  describe('formatProgressDisplay', () => {
    it('should format 0 months correctly', () => {
      const status = createStatus(0)
      const display = formatProgressDisplay(status)

      expect(display.percentage).toBe('0%')
      expect(display.months).toBe('0/12 months')
      expect(display.remaining).toBe('12 months to go')
    })

    it('should format 6 months correctly', () => {
      const status = createStatus(6)
      const display = formatProgressDisplay(status)

      expect(display.percentage).toBe('50%')
      expect(display.months).toBe('6/12 months')
      expect(display.remaining).toBe('6 months to go')
    })

    it('should format 12 months as eligible', () => {
      const status = createStatus(12, 100, true)
      const display = formatProgressDisplay(status)

      expect(display.percentage).toBe('100%')
      expect(display.months).toBe('12/12 months')
      expect(display.remaining).toBe('Eligible!')
    })
  })

  describe('getAllGraduationMessages', () => {
    it('should return all message types for child', () => {
      const status = createStatus(6)
      const messages = getAllGraduationMessages(status, 'Emma', 'child')

      expect(messages.progressMessage).toBeTruthy()
      expect(messages.motivationalMessage).toBeTruthy()
      expect(messages.pathOverview).toBeTruthy()
      expect(messages.milestoneMessage).toBeTruthy() // 6 is a milestone
      expect(messages.eligibilityExplanation).toBeTruthy()
    })

    it('should return all message types for parent', () => {
      const status = createStatus(6)
      const messages = getAllGraduationMessages(status, 'Emma', 'parent')

      expect(messages.progressMessage).toContain('Emma')
      expect(messages.motivationalMessage).toBeTruthy()
    })

    it('should return null milestone for non-milestone months', () => {
      const status = createStatus(7)
      const messages = getAllGraduationMessages(status, 'Emma', 'child')

      expect(messages.milestoneMessage).toBeNull()
    })
  })

  describe('AC Verification', () => {
    describe('AC2: Progress visible - "9 months at 100% trust - 3 months to graduation eligibility"', () => {
      it('should match expected format', () => {
        const status = createStatus(9)
        const message = getChildProgressMessage(status)

        expect(message).toContain('9 months')
        expect(message).toContain('100% trust')
        expect(message).toContain('3 months')
      })
    })

    describe('AC3: Child sees clear path to end', () => {
      it('should explain the full path', () => {
        const overview = getPathOverview('child')

        expect(overview).toContain('12')
        expect(overview.toLowerCase()).toContain('independence')
        expect(overview.toLowerCase()).toContain('graduation')
      })
    })

    describe('AC4: Parent sees same progress', () => {
      it('should show same months as child', () => {
        const status = createStatus(9)
        const childMsg = getChildProgressMessage(status)
        const parentMsg = getParentProgressMessage(status, 'Emma')

        expect(childMsg).toContain('9')
        expect(parentMsg).toContain('9')
      })
    })

    describe('AC6: Motivates sustained responsible behavior', () => {
      it('should use encouraging language', () => {
        const status = createStatus(3)
        const message = getMotivationalMessage(status, 'child')

        expect(message.toLowerCase()).not.toContain('must')
        expect(message.toLowerCase()).not.toContain('required')
        // Should be motivational, not demanding
      })

      it('should celebrate progress', () => {
        const message = getMilestoneMessage(6, 'child')

        expect(message?.toLowerCase()).toContain('halfway')
        expect(message?.toLowerCase()).toContain('amazing')
      })
    })
  })
})
