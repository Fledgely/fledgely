/**
 * MilestoneRegressionService Tests - Story 37.1 Task 5
 *
 * Tests for graceful regression when score drops.
 * AC6: Regression handled gracefully (not punitive)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkForRegressionRisk,
  applyGracePeriod,
  isMilestoneInGracePeriod,
  shouldTriggerRegression,
  getRegressionMessage,
  createRegressionNotification,
  MILESTONE_GRACE_PERIOD_DAYS,
  type GracePeriodState,
} from './milestoneRegressionService'

describe('MilestoneRegressionService - Story 37.1 Task 5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('Grace period constants', () => {
    it('should define 2-week grace period', () => {
      expect(MILESTONE_GRACE_PERIOD_DAYS).toBe(14)
    })
  })

  describe('checkForRegressionRisk', () => {
    it('should return no risk when above threshold', () => {
      const result = checkForRegressionRisk('growing', 85)

      expect(result.atRisk).toBe(false)
      expect(result.currentMilestone).toBe('growing')
    })

    it('should return at risk when below threshold', () => {
      const result = checkForRegressionRisk('growing', 75)

      expect(result.atRisk).toBe(true)
      expect(result.currentMilestone).toBe('growing')
    })

    it('should identify target milestone for regression', () => {
      const result = checkForRegressionRisk('maturing', 82)

      expect(result.atRisk).toBe(true)
      expect(result.targetMilestone).toBe('growing')
    })

    it('should return null milestone when score below all thresholds', () => {
      const result = checkForRegressionRisk('growing', 50)

      expect(result.atRisk).toBe(true)
      expect(result.targetMilestone).toBeNull()
    })

    it('should return no risk when no current milestone', () => {
      const result = checkForRegressionRisk(null, 75)

      expect(result.atRisk).toBe(false)
    })
  })

  describe('applyGracePeriod', () => {
    it('should create grace period when regression risk detected', () => {
      const state = applyGracePeriod('growing', 75, null)

      expect(state.isActive).toBe(true)
      expect(state.startDate).toBeInstanceOf(Date)
      expect(state.originalMilestone).toBe('growing')
    })

    it('should maintain existing grace period if already active', () => {
      const existingState: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-12-10'),
        originalMilestone: 'growing',
        daysElapsed: 5,
        daysRemaining: 9,
      }

      const state = applyGracePeriod('growing', 75, existingState)

      expect(state.startDate.getTime()).toBe(existingState.startDate.getTime())
    })

    it('should calculate days elapsed correctly', () => {
      const startDate = new Date('2024-12-10T12:00:00Z')
      const existingState: GracePeriodState = {
        isActive: true,
        startDate,
        originalMilestone: 'growing',
        daysElapsed: 0,
        daysRemaining: 14,
      }

      const state = applyGracePeriod('growing', 75, existingState)

      expect(state.daysElapsed).toBe(5)
      expect(state.daysRemaining).toBe(9)
    })

    it('should reset grace period when score recovers', () => {
      const existingState: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-12-10'),
        originalMilestone: 'growing',
        daysElapsed: 5,
        daysRemaining: 9,
      }

      const state = applyGracePeriod('growing', 85, existingState)

      expect(state.isActive).toBe(false)
    })
  })

  describe('isMilestoneInGracePeriod', () => {
    it('should return true when grace period is active and not expired', () => {
      const state: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-12-10'),
        originalMilestone: 'growing',
        daysElapsed: 5,
        daysRemaining: 9,
      }

      expect(isMilestoneInGracePeriod(state)).toBe(true)
    })

    it('should return false when no grace period active', () => {
      const state: GracePeriodState = {
        isActive: false,
        startDate: null,
        originalMilestone: null,
        daysElapsed: 0,
        daysRemaining: 0,
      }

      expect(isMilestoneInGracePeriod(state)).toBe(false)
    })

    it('should return false when grace period expired', () => {
      const state: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-11-01'),
        originalMilestone: 'growing',
        daysElapsed: 44,
        daysRemaining: 0,
      }

      expect(isMilestoneInGracePeriod(state)).toBe(false)
    })
  })

  describe('shouldTriggerRegression', () => {
    it('should return false when in grace period', () => {
      const state: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-12-10'),
        originalMilestone: 'growing',
        daysElapsed: 5,
        daysRemaining: 9,
      }

      expect(shouldTriggerRegression(state, 75)).toBe(false)
    })

    it('should return true when grace period expired and score still low', () => {
      const state: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-11-01'),
        originalMilestone: 'growing',
        daysElapsed: 44,
        daysRemaining: 0,
      }

      expect(shouldTriggerRegression(state, 75)).toBe(true)
    })

    it('should return false when score recovered', () => {
      const state: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-11-01'),
        originalMilestone: 'growing',
        daysElapsed: 44,
        daysRemaining: 0,
      }

      expect(shouldTriggerRegression(state, 85)).toBe(false)
    })
  })

  describe('getRegressionMessage', () => {
    it('should use compassionate language', () => {
      const message = getRegressionMessage('growing', 'maturing')

      expect(message.toLowerCase()).not.toContain('lost')
      expect(message.toLowerCase()).not.toContain('failed')
      expect(message.toLowerCase()).not.toContain('punishment')
    })

    it('should mention journey or growth', () => {
      const message = getRegressionMessage('growing', 'maturing')

      expect(message.toLowerCase()).toMatch(/journey|growth|support/)
    })

    it('should handle regression to no milestone', () => {
      const message = getRegressionMessage(null, 'growing')

      expect(message.toLowerCase()).not.toContain('lost')
      expect(message.toLowerCase()).toMatch(/journey|here.*support/)
    })
  })

  describe('createRegressionNotification', () => {
    it('should create notification for child', () => {
      const notification = createRegressionNotification('growing', 'maturing', 'child', 'Alex')

      expect(notification.type).toBe('regression')
      expect(notification.viewerType).toBe('child')
      expect(notification.message).toBeDefined()
    })

    it('should create notification for parent', () => {
      const notification = createRegressionNotification('growing', 'maturing', 'parent', 'Alex')

      expect(notification.viewerType).toBe('parent')
      expect(notification.message).toContain('Alex')
    })

    it('should use supportive language in notifications', () => {
      const notification = createRegressionNotification('growing', 'maturing', 'child', 'Alex')

      expect(notification.message.toLowerCase()).not.toContain('earned')
      expect(notification.message.toLowerCase()).not.toContain('reward')
      expect(notification.message.toLowerCase()).not.toContain('deserve')
    })

    it('should include next steps in notification', () => {
      const notification = createRegressionNotification('growing', 'maturing', 'child', 'Alex')

      expect(notification.nextSteps).toBeDefined()
      expect(notification.nextSteps.length).toBeGreaterThan(0)
    })
  })

  describe('AC6: Non-punitive regression', () => {
    it('should provide opportunity to recover during grace period', () => {
      const state = applyGracePeriod('growing', 75, null)

      // During grace period, milestone should be maintained
      expect(state.originalMilestone).toBe('growing')
      expect(state.daysRemaining).toBe(14)
    })

    it('should notify before milestone drops', () => {
      const state: GracePeriodState = {
        isActive: true,
        startDate: new Date('2024-12-10'),
        originalMilestone: 'growing',
        daysElapsed: 5,
        daysRemaining: 9,
      }

      // Grace period should still be active (not triggering regression)
      expect(shouldTriggerRegression(state, 75)).toBe(false)
    })

    it('should use compassionate messaging throughout', () => {
      const messages = [
        getRegressionMessage('growing', 'maturing'),
        getRegressionMessage(null, 'growing'),
        createRegressionNotification('growing', 'maturing', 'child', 'Alex').message,
      ]

      messages.forEach((message) => {
        expect(message.toLowerCase()).not.toContain('lost')
        expect(message.toLowerCase()).not.toContain('failed')
        expect(message.toLowerCase()).not.toContain('punishment')
        expect(message.toLowerCase()).not.toContain('punish')
      })
    })
  })
})
