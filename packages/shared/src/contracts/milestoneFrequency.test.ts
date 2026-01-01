/**
 * MilestoneFrequency Data Model Tests - Story 37.2 Task 1
 *
 * Tests for milestone-based screenshot frequency configuration.
 * AC1: Growing milestone (80+) reduces frequency to every 15 minutes
 * AC2: Maturing milestone (90+) reduces frequency to every 30 minutes
 * AC3: Ready for Independence (95+) enables hourly frequency option
 */

import { describe, it, expect } from 'vitest'
import {
  MILESTONE_FREQUENCIES,
  DEFAULT_FREQUENCY_MINUTES,
  milestoneFrequencyConfigSchema,
  getFrequencyForMilestone,
  getFrequencyDescription,
  type MilestoneFrequencyConfig,
} from './milestoneFrequency'

describe('MilestoneFrequency Data Model - Story 37.2 Task 1', () => {
  describe('AC1: Growing milestone frequency', () => {
    it('should define 15 minute frequency for growing milestone', () => {
      expect(MILESTONE_FREQUENCIES.growing).toBe(15)
    })

    it('should return 15 minutes for growing milestone', () => {
      expect(getFrequencyForMilestone('growing')).toBe(15)
    })
  })

  describe('AC2: Maturing milestone frequency', () => {
    it('should define 30 minute frequency for maturing milestone', () => {
      expect(MILESTONE_FREQUENCIES.maturing).toBe(30)
    })

    it('should return 30 minutes for maturing milestone', () => {
      expect(getFrequencyForMilestone('maturing')).toBe(30)
    })
  })

  describe('AC3: Ready for Independence frequency', () => {
    it('should define 60 minute frequency for ready-for-independence milestone', () => {
      expect(MILESTONE_FREQUENCIES['ready-for-independence']).toBe(60)
    })

    it('should return 60 minutes for ready-for-independence milestone', () => {
      expect(getFrequencyForMilestone('ready-for-independence')).toBe(60)
    })
  })

  describe('Default frequency', () => {
    it('should define default frequency of 5 minutes', () => {
      expect(DEFAULT_FREQUENCY_MINUTES).toBe(5)
    })

    it('should return default frequency when no milestone', () => {
      expect(getFrequencyForMilestone(null)).toBe(5)
    })
  })

  describe('Frequency configuration schema', () => {
    it('should validate a valid frequency config', () => {
      const config: MilestoneFrequencyConfig = {
        milestoneLevel: 'growing',
        frequencyMinutes: 15,
        description: 'Screenshots every 15 minutes',
      }

      expect(milestoneFrequencyConfigSchema.safeParse(config).success).toBe(true)
    })

    it('should reject negative frequency', () => {
      const config = {
        milestoneLevel: 'growing',
        frequencyMinutes: -5,
        description: 'Invalid',
      }

      expect(milestoneFrequencyConfigSchema.safeParse(config).success).toBe(false)
    })

    it('should reject zero frequency', () => {
      const config = {
        milestoneLevel: 'growing',
        frequencyMinutes: 0,
        description: 'Invalid',
      }

      expect(milestoneFrequencyConfigSchema.safeParse(config).success).toBe(false)
    })

    it('should reject empty description', () => {
      const config = {
        milestoneLevel: 'growing',
        frequencyMinutes: 15,
        description: '',
      }

      expect(milestoneFrequencyConfigSchema.safeParse(config).success).toBe(false)
    })
  })

  describe('Frequency descriptions', () => {
    it('should provide child-friendly description for growing', () => {
      const description = getFrequencyDescription('growing')

      expect(description).toContain('15')
      expect(description.toLowerCase()).toMatch(/minute|less|fewer/)
    })

    it('should provide child-friendly description for maturing', () => {
      const description = getFrequencyDescription('maturing')

      expect(description).toContain('30')
      expect(description.toLowerCase()).toMatch(/minute|less|fewer/)
    })

    it('should provide child-friendly description for ready-for-independence', () => {
      const description = getFrequencyDescription('ready-for-independence')

      expect(description.toLowerCase()).toMatch(/hour|60/)
    })

    it('should provide default description when no milestone', () => {
      const description = getFrequencyDescription(null)

      expect(description).toContain('5')
    })
  })

  describe('Frequency progression', () => {
    it('should have frequencies in ascending order of privacy', () => {
      expect(MILESTONE_FREQUENCIES.growing).toBeLessThan(MILESTONE_FREQUENCIES.maturing)
      expect(MILESTONE_FREQUENCIES.maturing).toBeLessThan(
        MILESTONE_FREQUENCIES['ready-for-independence']
      )
    })

    it('should have all frequencies greater than default', () => {
      expect(MILESTONE_FREQUENCIES.growing).toBeGreaterThan(DEFAULT_FREQUENCY_MINUTES)
      expect(MILESTONE_FREQUENCIES.maturing).toBeGreaterThan(DEFAULT_FREQUENCY_MINUTES)
      expect(MILESTONE_FREQUENCIES['ready-for-independence']).toBeGreaterThan(
        DEFAULT_FREQUENCY_MINUTES
      )
    })
  })

  describe('Frequency multipliers', () => {
    it('growing should be 3x less frequent than default', () => {
      expect(MILESTONE_FREQUENCIES.growing).toBe(DEFAULT_FREQUENCY_MINUTES * 3)
    })

    it('maturing should be 6x less frequent than default', () => {
      expect(MILESTONE_FREQUENCIES.maturing).toBe(DEFAULT_FREQUENCY_MINUTES * 6)
    })

    it('ready-for-independence should be 12x less frequent than default', () => {
      expect(MILESTONE_FREQUENCIES['ready-for-independence']).toBe(DEFAULT_FREQUENCY_MINUTES * 12)
    })
  })
})
