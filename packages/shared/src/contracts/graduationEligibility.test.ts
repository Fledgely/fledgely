/**
 * Graduation Eligibility Contracts Tests - Story 38.1 Task 1
 *
 * Tests for graduation eligibility schemas and types.
 * FR38A: 100% trust for 12 months triggers graduation conversation.
 */

import { describe, it, expect } from 'vitest'
import {
  GraduationEligibilityConfigSchema,
  GraduationEligibilityStatusSchema,
  TrustScoreHistoryEntrySchema,
  GraduationMilestoneSchema,
  StreakBreakEventSchema,
  GRADUATION_TRUST_THRESHOLD,
  GRADUATION_DURATION_MONTHS,
  DEFAULT_GRADUATION_CONFIG,
  createDefaultGraduationConfig,
  createInitialEligibilityStatus,
  calculateProgressPercentage,
  getGraduationMilestones,
  isPerfectTrust,
  validateTrustScoreHistory,
  GRADUATION_MESSAGES,
} from './graduationEligibility'

describe('GraduationEligibility Contracts - Story 38.1 Task 1', () => {
  describe('FR38A Constants', () => {
    it('should define 100% trust threshold', () => {
      expect(GRADUATION_TRUST_THRESHOLD).toBe(100)
    })

    it('should define 12 month duration requirement', () => {
      expect(GRADUATION_DURATION_MONTHS).toBe(12)
    })
  })

  describe('GraduationEligibilityConfigSchema', () => {
    it('should validate valid config', () => {
      const config = {
        trustScoreThreshold: 100,
        durationMonths: 12,
        checkInterval: 'daily' as const,
      }

      const result = GraduationEligibilityConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    it('should use defaults when not provided', () => {
      const result = GraduationEligibilityConfigSchema.parse({})

      expect(result.trustScoreThreshold).toBe(100)
      expect(result.durationMonths).toBe(12)
      expect(result.checkInterval).toBe('daily')
    })

    it('should reject invalid threshold', () => {
      expect(() => GraduationEligibilityConfigSchema.parse({ trustScoreThreshold: 150 })).toThrow()
    })

    it('should reject invalid duration', () => {
      expect(() => GraduationEligibilityConfigSchema.parse({ durationMonths: 0 })).toThrow()
    })

    it('should reject invalid check interval', () => {
      expect(() => GraduationEligibilityConfigSchema.parse({ checkInterval: 'monthly' })).toThrow()
    })
  })

  describe('TrustScoreHistoryEntrySchema', () => {
    it('should validate valid history entry', () => {
      const entry = {
        date: new Date('2025-01-01'),
        score: 100,
        childId: 'child-123',
      }

      const result = TrustScoreHistoryEntrySchema.parse(entry)
      expect(result.score).toBe(100)
      expect(result.childId).toBe('child-123')
    })

    it('should reject score above 100', () => {
      expect(() =>
        TrustScoreHistoryEntrySchema.parse({
          date: new Date(),
          score: 101,
          childId: 'child-123',
        })
      ).toThrow()
    })

    it('should reject score below 0', () => {
      expect(() =>
        TrustScoreHistoryEntrySchema.parse({
          date: new Date(),
          score: -1,
          childId: 'child-123',
        })
      ).toThrow()
    })

    it('should reject empty childId', () => {
      expect(() =>
        TrustScoreHistoryEntrySchema.parse({
          date: new Date(),
          score: 100,
          childId: '',
        })
      ).toThrow()
    })
  })

  describe('GraduationEligibilityStatusSchema', () => {
    it('should validate complete status', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: new Date('2025-07-01'),
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date('2025-01-01'),
        lastCheckedAt: new Date(),
      }

      const result = GraduationEligibilityStatusSchema.parse(status)
      expect(result.monthsAtPerfectTrust).toBe(6)
      expect(result.isEligible).toBe(false)
    })

    it('should allow null eligibilityDate', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 50,
        monthsAtPerfectTrust: 0,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 0,
        streakStartDate: null,
        lastCheckedAt: new Date(),
      }

      const result = GraduationEligibilityStatusSchema.parse(status)
      expect(result.eligibilityDate).toBeNull()
    })

    it('should cap progressPercentage at 100', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 12,
        eligibilityDate: null,
        isEligible: true,
        progressPercentage: 100,
        streakStartDate: new Date('2024-01-01'),
        lastCheckedAt: new Date(),
      }

      const result = GraduationEligibilityStatusSchema.parse(status)
      expect(result.progressPercentage).toBe(100)
    })
  })

  describe('GraduationMilestoneSchema', () => {
    it('should validate milestone with celebration', () => {
      const milestone = {
        month: 6,
        label: '6 months',
        reached: true,
        reachedAt: new Date('2025-07-01'),
        celebrationMessage: 'Halfway there!',
      }

      const result = GraduationMilestoneSchema.parse(milestone)
      expect(result.reached).toBe(true)
      expect(result.celebrationMessage).toBe('Halfway there!')
    })

    it('should validate milestone without celebration', () => {
      const milestone = {
        month: 9,
        label: '9 months',
        reached: false,
      }

      const result = GraduationMilestoneSchema.parse(milestone)
      expect(result.reached).toBe(false)
      expect(result.celebrationMessage).toBeUndefined()
    })
  })

  describe('StreakBreakEventSchema', () => {
    it('should validate streak break event', () => {
      const event = {
        childId: 'child-123',
        breakDate: new Date('2025-06-15'),
        breakingScore: 95,
        monthsLost: 5,
        previousStreakStart: new Date('2025-01-01'),
      }

      const result = StreakBreakEventSchema.parse(event)
      expect(result.breakingScore).toBe(95)
      expect(result.monthsLost).toBe(5)
    })
  })

  describe('DEFAULT_GRADUATION_CONFIG', () => {
    it('should have FR38A-compliant defaults', () => {
      expect(DEFAULT_GRADUATION_CONFIG.trustScoreThreshold).toBe(100)
      expect(DEFAULT_GRADUATION_CONFIG.durationMonths).toBe(12)
      expect(DEFAULT_GRADUATION_CONFIG.checkInterval).toBe('daily')
    })
  })

  describe('createDefaultGraduationConfig', () => {
    it('should return default config', () => {
      const config = createDefaultGraduationConfig()

      expect(config.trustScoreThreshold).toBe(100)
      expect(config.durationMonths).toBe(12)
    })

    it('should return new object each time', () => {
      const config1 = createDefaultGraduationConfig()
      const config2 = createDefaultGraduationConfig()

      expect(config1).not.toBe(config2)
      expect(config1).toEqual(config2)
    })
  })

  describe('createInitialEligibilityStatus', () => {
    it('should create status with zero progress', () => {
      const status = createInitialEligibilityStatus('child-123')

      expect(status.childId).toBe('child-123')
      expect(status.currentTrustScore).toBe(0)
      expect(status.monthsAtPerfectTrust).toBe(0)
      expect(status.isEligible).toBe(false)
      expect(status.progressPercentage).toBe(0)
      expect(status.eligibilityDate).toBeNull()
      expect(status.streakStartDate).toBeNull()
    })

    it('should set lastCheckedAt to current date', () => {
      const before = new Date()
      const status = createInitialEligibilityStatus('child-123')
      const after = new Date()

      expect(status.lastCheckedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(status.lastCheckedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('calculateProgressPercentage', () => {
    it('should return 0 for 0 months', () => {
      expect(calculateProgressPercentage(0)).toBe(0)
    })

    it('should return 25 for 3 months', () => {
      expect(calculateProgressPercentage(3)).toBe(25)
    })

    it('should return 50 for 6 months', () => {
      expect(calculateProgressPercentage(6)).toBe(50)
    })

    it('should return 75 for 9 months', () => {
      expect(calculateProgressPercentage(9)).toBe(75)
    })

    it('should return 100 for 12 months', () => {
      expect(calculateProgressPercentage(12)).toBe(100)
    })

    it('should cap at 100 for more than 12 months', () => {
      expect(calculateProgressPercentage(15)).toBe(100)
    })

    it('should handle custom required months', () => {
      expect(calculateProgressPercentage(3, 6)).toBe(50)
    })

    it('should round to one decimal place', () => {
      // 7/12 = 58.333...%
      expect(calculateProgressPercentage(7)).toBe(58.3)
    })
  })

  describe('getGraduationMilestones', () => {
    it('should return all milestones unreached for 0 months', () => {
      const milestones = getGraduationMilestones(0)

      expect(milestones).toHaveLength(4)
      expect(milestones.every((m) => !m.reached)).toBe(true)
    })

    it('should mark 3-month milestone reached', () => {
      const milestones = getGraduationMilestones(3)

      expect(milestones[0].month).toBe(3)
      expect(milestones[0].reached).toBe(true)
      expect(milestones[0].celebrationMessage).toContain('3 months')
      expect(milestones[1].reached).toBe(false)
    })

    it('should mark 6-month milestone reached with halfway message', () => {
      const milestones = getGraduationMilestones(6)

      expect(milestones[1].month).toBe(6)
      expect(milestones[1].reached).toBe(true)
      expect(milestones[1].celebrationMessage).toContain('Halfway')
    })

    it('should mark 9-month milestone with almost there message', () => {
      const milestones = getGraduationMilestones(9)

      expect(milestones[2].month).toBe(9)
      expect(milestones[2].reached).toBe(true)
      expect(milestones[2].celebrationMessage).toContain('Almost there')
    })

    it('should mark all milestones reached at 12 months', () => {
      const milestones = getGraduationMilestones(12)

      expect(milestones.every((m) => m.reached)).toBe(true)
      expect(milestones[3].month).toBe(12)
      expect(milestones[3].celebrationMessage).toContain('Congratulations')
    })

    it('should handle in-between months correctly', () => {
      const milestones = getGraduationMilestones(7)

      expect(milestones[0].reached).toBe(true) // 3 months
      expect(milestones[1].reached).toBe(true) // 6 months
      expect(milestones[2].reached).toBe(false) // 9 months
      expect(milestones[3].reached).toBe(false) // 12 months
    })
  })

  describe('isPerfectTrust', () => {
    it('should return true for score of 100', () => {
      expect(isPerfectTrust(100)).toBe(true)
    })

    it('should return false for score of 99', () => {
      expect(isPerfectTrust(99)).toBe(false)
    })

    it('should return false for score of 0', () => {
      expect(isPerfectTrust(0)).toBe(false)
    })

    it('should return false for score of 95', () => {
      expect(isPerfectTrust(95)).toBe(false)
    })
  })

  describe('validateTrustScoreHistory', () => {
    it('should pass for valid history', () => {
      const history = [
        { date: new Date('2025-01-01'), score: 100, childId: 'child-123' },
        { date: new Date('2025-02-01'), score: 100, childId: 'child-123' },
        { date: new Date('2025-03-01'), score: 100, childId: 'child-123' },
      ]

      const result = validateTrustScoreHistory(history)
      expect(result.valid).toBe(true)
      expect(result.issues).toEqual([])
    })

    it('should fail for empty history', () => {
      const result = validateTrustScoreHistory([])

      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Trust score history is empty')
    })

    it('should fail for mixed childIds', () => {
      const history = [
        { date: new Date('2025-01-01'), score: 100, childId: 'child-123' },
        { date: new Date('2025-02-01'), score: 100, childId: 'child-456' },
      ]

      const result = validateTrustScoreHistory(history)
      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Trust score history contains entries for multiple children')
    })

    it('should fail for non-chronological order', () => {
      const history = [
        { date: new Date('2025-03-01'), score: 100, childId: 'child-123' },
        { date: new Date('2025-01-01'), score: 100, childId: 'child-123' },
      ]

      const result = validateTrustScoreHistory(history)
      expect(result.valid).toBe(false)
      expect(result.issues).toContain('Trust score history is not in chronological order')
    })
  })

  describe('GRADUATION_MESSAGES', () => {
    it('should have child-facing path intro', () => {
      expect(GRADUATION_MESSAGES.pathIntro).toContain('Your path to graduation')
      expect(GRADUATION_MESSAGES.pathIntro).toContain('12 months')
    })

    it('should have progress template with placeholders', () => {
      expect(GRADUATION_MESSAGES.progressTemplate).toContain('{months}')
      expect(GRADUATION_MESSAGES.progressTemplate).toContain('{remaining}')
    })

    it('should have supportive streak break message (not punitive)', () => {
      expect(GRADUATION_MESSAGES.streakBreakChild.toLowerCase()).toContain('continues')
      expect(GRADUATION_MESSAGES.streakBreakChild.toLowerCase()).not.toContain('failed')
      expect(GRADUATION_MESSAGES.streakBreakChild.toLowerCase()).not.toContain('lost')
    })

    it('should explain eligibility triggers conversation', () => {
      expect(GRADUATION_MESSAGES.notAutomatic.toLowerCase()).toContain('conversation')
      expect(GRADUATION_MESSAGES.notAutomatic.toLowerCase()).toContain('not automatic')
    })

    it('should have parent-facing messages with childName placeholder', () => {
      expect(GRADUATION_MESSAGES.parentPathIntro).toContain('{childName}')
      expect(GRADUATION_MESSAGES.parentProgress).toContain('{childName}')
      expect(GRADUATION_MESSAGES.parentEligible).toContain('{childName}')
    })
  })

  describe('AC Verification', () => {
    describe('AC1: 100% trust for 12 consecutive months', () => {
      it('should define threshold as 100', () => {
        expect(GRADUATION_TRUST_THRESHOLD).toBe(100)
      })

      it('should define duration as 12 months', () => {
        expect(GRADUATION_DURATION_MONTHS).toBe(12)
      })

      it('should require exactly 100% (not 99%)', () => {
        expect(isPerfectTrust(100)).toBe(true)
        expect(isPerfectTrust(99)).toBe(false)
      })
    })

    describe('AC2: Progress visible to child', () => {
      it('should have progress template', () => {
        expect(GRADUATION_MESSAGES.progressTemplate).toBeTruthy()
        expect(GRADUATION_MESSAGES.progressTemplate).toContain('{months}')
        expect(GRADUATION_MESSAGES.progressTemplate).toContain('{remaining}')
      })

      it('should calculate progress percentage', () => {
        expect(calculateProgressPercentage(9)).toBe(75)
      })
    })

    describe('AC3: Child sees clear path to end', () => {
      it('should have path intro message', () => {
        expect(GRADUATION_MESSAGES.pathIntro).toContain('path to graduation')
      })

      it('should show milestone markers', () => {
        const milestones = getGraduationMilestones(0)
        expect(milestones).toHaveLength(4)
        expect(milestones.map((m) => m.month)).toEqual([3, 6, 9, 12])
      })
    })

    describe('AC4: Parent sees same progress', () => {
      it('should have parent progress message', () => {
        expect(GRADUATION_MESSAGES.parentProgress).toBeTruthy()
        expect(GRADUATION_MESSAGES.parentProgress).toContain('{months}')
      })
    })

    describe('AC5: Eligibility triggers conversation, not automatic graduation', () => {
      it('should explain eligibility is not automatic', () => {
        expect(GRADUATION_MESSAGES.notAutomatic).toContain('not automatic')
        expect(GRADUATION_MESSAGES.eligibilityExplainer).toContain('conversation')
      })
    })

    describe('AC6: Motivates sustained responsible behavior', () => {
      it('should have celebratory milestone messages', () => {
        const milestones = getGraduationMilestones(12)
        expect(milestones[3].celebrationMessage).toContain('Congratulations')
      })

      it('should use supportive language for streak breaks', () => {
        expect(GRADUATION_MESSAGES.streakBreakChild).toContain('continues')
        expect(GRADUATION_MESSAGES.streakBreakChild).not.toContain('failed')
      })
    })
  })
})
