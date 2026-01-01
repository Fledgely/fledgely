/**
 * FrequencyReductionService Tests - Story 37.2 Task 2
 *
 * Tests for calculating and applying frequency reductions.
 * AC1: Growing milestone reduces to 15 minutes
 * AC2: Maturing milestone reduces to 30 minutes
 * AC3: Ready for Independence reduces to 60 minutes
 * AC4: Changes apply automatically upon milestone achievement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateFrequencyChange,
  applyFrequencyReduction,
  getFrequencyChangeMessage,
  createFrequencyUpdate,
} from './frequencyReductionService'
import { DEFAULT_FREQUENCY_MINUTES, MILESTONE_FREQUENCIES } from '../contracts/milestoneFrequency'

describe('FrequencyReductionService - Story 37.2 Task 2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('calculateFrequencyChange', () => {
    it('should calculate change from default to growing', () => {
      const change = calculateFrequencyChange('child-1', null, 'growing')

      expect(change.childId).toBe('child-1')
      expect(change.previousFrequency).toBe(DEFAULT_FREQUENCY_MINUTES)
      expect(change.newFrequency).toBe(MILESTONE_FREQUENCIES.growing)
      expect(change.newMilestone).toBe('growing')
    })

    it('should calculate change from growing to maturing', () => {
      const change = calculateFrequencyChange('child-1', 'growing', 'maturing')

      expect(change.previousFrequency).toBe(MILESTONE_FREQUENCIES.growing)
      expect(change.newFrequency).toBe(MILESTONE_FREQUENCIES.maturing)
      expect(change.reductionMinutes).toBe(15) // 30 - 15
    })

    it('should calculate change from maturing to ready-for-independence', () => {
      const change = calculateFrequencyChange('child-1', 'maturing', 'ready-for-independence')

      expect(change.previousFrequency).toBe(MILESTONE_FREQUENCIES.maturing)
      expect(change.newFrequency).toBe(MILESTONE_FREQUENCIES['ready-for-independence'])
      expect(change.reductionMinutes).toBe(30) // 60 - 30
    })

    it('should indicate reduction occurred', () => {
      const change = calculateFrequencyChange('child-1', null, 'growing')

      expect(change.isReduction).toBe(true)
    })

    it('should indicate no reduction for same milestone', () => {
      const change = calculateFrequencyChange('child-1', 'growing', 'growing')

      expect(change.isReduction).toBe(false)
      expect(change.reductionMinutes).toBe(0)
    })

    it('should indicate increase for regression', () => {
      const change = calculateFrequencyChange('child-1', 'maturing', 'growing')

      expect(change.isReduction).toBe(false)
      expect(change.previousFrequency).toBe(30)
      expect(change.newFrequency).toBe(15)
    })
  })

  describe('applyFrequencyReduction', () => {
    it('should apply growing milestone reduction', () => {
      const update = applyFrequencyReduction('child-1', 'growing', null)

      expect(update.childId).toBe('child-1')
      expect(update.newFrequencyMinutes).toBe(15)
      expect(update.appliedMilestone).toBe('growing')
      expect(update.success).toBe(true)
    })

    it('should apply maturing milestone reduction', () => {
      const update = applyFrequencyReduction('child-1', 'maturing', 'growing')

      expect(update.newFrequencyMinutes).toBe(30)
      expect(update.appliedMilestone).toBe('maturing')
    })

    it('should apply ready-for-independence reduction', () => {
      const update = applyFrequencyReduction('child-1', 'ready-for-independence', 'maturing')

      expect(update.newFrequencyMinutes).toBe(60)
      expect(update.appliedMilestone).toBe('ready-for-independence')
    })

    it('should include timestamp', () => {
      const update = applyFrequencyReduction('child-1', 'growing', null)

      expect(update.appliedAt).toBeInstanceOf(Date)
    })

    it('should include change record', () => {
      const update = applyFrequencyReduction('child-1', 'growing', null)

      expect(update.change).toBeDefined()
      expect(update.change.previousFrequency).toBe(5)
      expect(update.change.newFrequency).toBe(15)
    })
  })

  describe('getFrequencyChangeMessage', () => {
    it('should use developmental language for growing milestone', () => {
      const message = getFrequencyChangeMessage('growing', 5, 15, 'child')

      expect(message.toLowerCase()).toMatch(/recogniz|growth|growing/)
      expect(message.toLowerCase()).not.toContain('earned')
      expect(message.toLowerCase()).not.toContain('reward')
    })

    it('should include frequency numbers in message', () => {
      const message = getFrequencyChangeMessage('growing', 5, 15, 'child')

      expect(message).toContain('15')
    })

    it('should have different message for parent view', () => {
      const childMessage = getFrequencyChangeMessage('growing', 5, 15, 'child')
      const parentMessage = getFrequencyChangeMessage('growing', 5, 15, 'parent')

      expect(childMessage).not.toBe(parentMessage)
    })

    it('should be celebratory for reduction', () => {
      const message = getFrequencyChangeMessage('maturing', 15, 30, 'child')

      expect(message.toLowerCase()).toMatch(/congratulat|celebrat|recogniz|great|wonderful/)
    })
  })

  describe('createFrequencyUpdate', () => {
    it('should create complete update record', () => {
      const update = createFrequencyUpdate('child-1', 'growing', null)

      expect(update.childId).toBe('child-1')
      expect(update.newFrequencyMinutes).toBe(15)
      expect(update.previousFrequencyMinutes).toBe(5)
      expect(update.appliedMilestone).toBe('growing')
      expect(update.appliedAt).toBeInstanceOf(Date)
    })

    it('should track previous milestone', () => {
      const update = createFrequencyUpdate('child-1', 'maturing', 'growing')

      expect(update.previousMilestone).toBe('growing')
      expect(update.appliedMilestone).toBe('maturing')
    })

    it('should calculate percentage reduction', () => {
      const update = createFrequencyUpdate('child-1', 'growing', null)

      // 5 to 15 = 3x less frequent = 67% fewer screenshots
      expect(update.reductionPercentage).toBeCloseTo(67, 0)
    })
  })

  describe('AC4: Automatic application', () => {
    it('should apply change immediately', () => {
      const update = applyFrequencyReduction('child-1', 'growing', null)

      expect(update.success).toBe(true)
      expect(update.appliedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })

    it('should support all milestone transitions', () => {
      // No milestone to growing
      let update = applyFrequencyReduction('child-1', 'growing', null)
      expect(update.newFrequencyMinutes).toBe(15)

      // Growing to maturing
      update = applyFrequencyReduction('child-1', 'maturing', 'growing')
      expect(update.newFrequencyMinutes).toBe(30)

      // Maturing to ready-for-independence
      update = applyFrequencyReduction('child-1', 'ready-for-independence', 'maturing')
      expect(update.newFrequencyMinutes).toBe(60)
    })
  })

  describe('Regression handling', () => {
    it('should handle regression to lower milestone', () => {
      const update = applyFrequencyReduction('child-1', 'growing', 'maturing')

      expect(update.newFrequencyMinutes).toBe(15)
      expect(update.change.isReduction).toBe(false)
    })

    it('should handle regression to no milestone', () => {
      const update = applyFrequencyReduction('child-1', null, 'growing')

      expect(update.newFrequencyMinutes).toBe(5)
      expect(update.appliedMilestone).toBeNull()
    })
  })
})
