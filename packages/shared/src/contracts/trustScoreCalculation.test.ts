/**
 * Trust Score Calculation Tests - Story 36.2
 *
 * Tests for trust score calculation utilities.
 * AC4: Calculation weighted toward recent behavior (last 30 days)
 * AC5: Starting score: 70 (benefit of the doubt)
 * AC6: Calculation transparent (child can see why)
 */

import { describe, it, expect } from 'vitest'
import {
  RECENCY_WEIGHT_LAST_7_DAYS,
  RECENCY_WEIGHT_LAST_14_DAYS,
  RECENCY_WEIGHT_LAST_30_DAYS,
  RECENCY_WEIGHT_OLDER,
  RECENCY_DAYS_7,
  RECENCY_DAYS_14,
  RECENCY_DAYS_30,
  MAX_DAILY_INCREASE,
  MAX_DAILY_DECREASE,
  getRecencyWeight,
  applyRecencyWeight,
  getPositiveContribution,
  getNeutralContribution,
  getConcerningContribution,
  calculateWeightedFactorContribution,
  generateScoreBreakdown,
  clampDailyDelta,
  calculateNewScore,
  scoreBreakdownSchema,
  scoreCalculationResultSchema,
} from './trustScoreCalculation'
import {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  TRUST_SCORE_DEFAULT,
  type TrustFactor,
} from './trustScore'

describe('Trust Score Calculation - Story 36.2', () => {
  describe('constants', () => {
    describe('recency weight constants (AC4)', () => {
      it('should have full weight for last 7 days', () => {
        expect(RECENCY_WEIGHT_LAST_7_DAYS).toBe(1.0)
      })

      it('should have 75% weight for 8-14 days', () => {
        expect(RECENCY_WEIGHT_LAST_14_DAYS).toBe(0.75)
      })

      it('should have 50% weight for 15-30 days', () => {
        expect(RECENCY_WEIGHT_LAST_30_DAYS).toBe(0.5)
      })

      it('should have 25% weight for older than 30 days', () => {
        expect(RECENCY_WEIGHT_OLDER).toBe(0.25)
      })

      it('should have correct day thresholds', () => {
        expect(RECENCY_DAYS_7).toBe(7)
        expect(RECENCY_DAYS_14).toBe(14)
        expect(RECENCY_DAYS_30).toBe(30)
      })
    })

    describe('daily change limits', () => {
      it('should have max daily increase of 5', () => {
        expect(MAX_DAILY_INCREASE).toBe(5)
      })

      it('should have max daily decrease of 10', () => {
        expect(MAX_DAILY_DECREASE).toBe(10)
      })
    })
  })

  describe('getRecencyWeight', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    it('should return full weight for today', () => {
      const occurredAt = new Date('2024-06-15T08:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_LAST_7_DAYS)
    })

    it('should return full weight for 7 days ago', () => {
      const occurredAt = new Date('2024-06-08T10:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_LAST_7_DAYS)
    })

    it('should return 75% weight for 8 days ago', () => {
      const occurredAt = new Date('2024-06-07T09:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_LAST_14_DAYS)
    })

    it('should return 75% weight for 14 days ago', () => {
      const occurredAt = new Date('2024-06-01T10:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_LAST_14_DAYS)
    })

    it('should return 50% weight for 15 days ago', () => {
      const occurredAt = new Date('2024-05-31T09:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_LAST_30_DAYS)
    })

    it('should return 50% weight for 30 days ago', () => {
      const occurredAt = new Date('2024-05-16T10:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_LAST_30_DAYS)
    })

    it('should return 25% weight for 31 days ago', () => {
      const occurredAt = new Date('2024-05-15T09:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_OLDER)
    })

    it('should return 25% weight for 60 days ago', () => {
      const occurredAt = new Date('2024-04-16T10:00:00Z')
      expect(getRecencyWeight(occurredAt, referenceDate)).toBe(RECENCY_WEIGHT_OLDER)
    })

    it('should default to current time if no reference date provided', () => {
      const now = new Date()
      const justNow = new Date(now.getTime() - 1000) // 1 second ago
      expect(getRecencyWeight(justNow)).toBe(RECENCY_WEIGHT_LAST_7_DAYS)
    })
  })

  describe('applyRecencyWeight', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    it('should apply full weight to recent factors', () => {
      const factor: TrustFactor = {
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date('2024-06-14T10:00:00Z'), // 1 day ago
      }
      expect(applyRecencyWeight(factor, referenceDate)).toBe(5)
    })

    it('should apply 75% weight to 10-day-old factors', () => {
      const factor: TrustFactor = {
        type: 'focus-mode-usage',
        category: 'positive',
        value: 4,
        description: 'Using focus mode',
        occurredAt: new Date('2024-06-05T10:00:00Z'), // 10 days ago
      }
      expect(applyRecencyWeight(factor, referenceDate)).toBe(3) // 4 * 0.75 = 3
    })

    it('should apply 50% weight to 20-day-old factors', () => {
      const factor: TrustFactor = {
        type: 'no-bypass-attempts',
        category: 'positive',
        value: 2,
        description: 'No bypass attempts',
        occurredAt: new Date('2024-05-26T10:00:00Z'), // 20 days ago
      }
      expect(applyRecencyWeight(factor, referenceDate)).toBe(1) // 2 * 0.5 = 1
    })

    it('should apply 25% weight to 40-day-old factors', () => {
      const factor: TrustFactor = {
        type: 'bypass-attempt',
        category: 'concerning',
        value: -8,
        description: 'Bypass attempt',
        occurredAt: new Date('2024-05-06T10:00:00Z'), // 40 days ago
      }
      expect(applyRecencyWeight(factor, referenceDate)).toBe(-2) // -8 * 0.25 = -2
    })

    it('should round to 2 decimal places', () => {
      const factor: TrustFactor = {
        type: 'focus-mode-usage',
        category: 'positive',
        value: 3,
        description: 'Focus mode',
        occurredAt: new Date('2024-06-05T10:00:00Z'), // 10 days ago
      }
      expect(applyRecencyWeight(factor, referenceDate)).toBe(2.25) // 3 * 0.75 = 2.25
    })
  })

  describe('contribution functions (AC1, AC2, AC3)', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    const createFactor = (
      type: TrustFactor['type'],
      category: TrustFactor['category'],
      value: number,
      daysAgo: number
    ): TrustFactor => ({
      type,
      category,
      value,
      description: `Test ${type}`,
      occurredAt: new Date(referenceDate.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    })

    describe('getPositiveContribution (AC1)', () => {
      it('should sum positive factors only', () => {
        const factors: TrustFactor[] = [
          createFactor('time-limit-compliance', 'positive', 5, 1),
          createFactor('focus-mode-usage', 'positive', 3, 1),
          createFactor('bypass-attempt', 'concerning', -5, 1),
        ]

        expect(getPositiveContribution(factors, referenceDate)).toBe(8) // 5 + 3
      })

      it('should apply recency weight to positive factors', () => {
        const factors: TrustFactor[] = [
          createFactor('time-limit-compliance', 'positive', 10, 10), // 10 * 0.75 = 7.5
        ]

        expect(getPositiveContribution(factors, referenceDate)).toBe(7.5)
      })

      it('should return 0 for empty array', () => {
        expect(getPositiveContribution([], referenceDate)).toBe(0)
      })
    })

    describe('getNeutralContribution (AC2)', () => {
      it('should sum neutral factors only', () => {
        const factors: TrustFactor[] = [
          createFactor('normal-app-usage', 'neutral', 0, 1),
          createFactor('time-limit-compliance', 'positive', 5, 1),
        ]

        expect(getNeutralContribution(factors, referenceDate)).toBe(0)
      })

      it('should return 0 for empty array', () => {
        expect(getNeutralContribution([], referenceDate)).toBe(0)
      })
    })

    describe('getConcerningContribution (AC3)', () => {
      it('should sum concerning factors only', () => {
        const factors: TrustFactor[] = [
          createFactor('bypass-attempt', 'concerning', -5, 1),
          createFactor('monitoring-disabled', 'concerning', -3, 1),
          createFactor('time-limit-compliance', 'positive', 5, 1),
        ]

        expect(getConcerningContribution(factors, referenceDate)).toBe(-8) // -5 + -3
      })

      it('should apply recency weight to concerning factors', () => {
        const factors: TrustFactor[] = [
          createFactor('bypass-attempt', 'concerning', -10, 10), // -10 * 0.75 = -7.5
        ]

        expect(getConcerningContribution(factors, referenceDate)).toBe(-7.5)
      })

      it('should return 0 for empty array', () => {
        expect(getConcerningContribution([], referenceDate)).toBe(0)
      })
    })

    describe('calculateWeightedFactorContribution', () => {
      it('should sum all factors with recency weighting', () => {
        const factors: TrustFactor[] = [
          createFactor('time-limit-compliance', 'positive', 5, 1), // 5 * 1.0 = 5
          createFactor('bypass-attempt', 'concerning', -5, 10), // -5 * 0.75 = -3.75
          createFactor('normal-app-usage', 'neutral', 0, 1), // 0
        ]

        expect(calculateWeightedFactorContribution(factors, referenceDate)).toBe(1.25) // 5 - 3.75
      })
    })
  })

  describe('generateScoreBreakdown (AC6)', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    const createFactor = (
      type: TrustFactor['type'],
      category: TrustFactor['category'],
      value: number,
      daysAgo: number
    ): TrustFactor => ({
      type,
      category,
      value,
      description: `Test ${type}`,
      occurredAt: new Date(referenceDate.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    })

    it('should provide transparent breakdown', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5, 1),
        createFactor('focus-mode-usage', 'positive', 3, 1),
        createFactor('bypass-attempt', 'concerning', -5, 1),
        createFactor('normal-app-usage', 'neutral', 0, 1),
      ]

      const breakdown = generateScoreBreakdown(factors, referenceDate)

      expect(breakdown.positivePoints).toBe(8)
      expect(breakdown.neutralPoints).toBe(0)
      expect(breakdown.concerningPoints).toBe(-5)
      expect(breakdown.finalDelta).toBe(3)
    })

    it('should calculate average recency multiplier', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5, 1), // weight 1.0
        createFactor('focus-mode-usage', 'positive', 3, 10), // weight 0.75
      ]

      const breakdown = generateScoreBreakdown(factors, referenceDate)

      expect(breakdown.recencyMultiplier).toBe(0.88) // (1.0 + 0.75) / 2 = 0.875 rounded
    })

    it('should handle empty factors array', () => {
      const breakdown = generateScoreBreakdown([], referenceDate)

      expect(breakdown.positivePoints).toBe(0)
      expect(breakdown.neutralPoints).toBe(0)
      expect(breakdown.concerningPoints).toBe(0)
      expect(breakdown.recencyMultiplier).toBe(1.0)
      expect(breakdown.finalDelta).toBe(0)
    })

    it('should validate against schema', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5, 1)]

      const breakdown = generateScoreBreakdown(factors, referenceDate)
      const result = scoreBreakdownSchema.safeParse(breakdown)

      expect(result.success).toBe(true)
    })
  })

  describe('clampDailyDelta', () => {
    it('should not change delta within limits', () => {
      expect(clampDailyDelta(3)).toBe(3)
      expect(clampDailyDelta(-5)).toBe(-5)
      expect(clampDailyDelta(0)).toBe(0)
    })

    it('should clamp positive delta to max increase', () => {
      expect(clampDailyDelta(10)).toBe(MAX_DAILY_INCREASE)
      expect(clampDailyDelta(100)).toBe(MAX_DAILY_INCREASE)
    })

    it('should clamp negative delta to max decrease', () => {
      expect(clampDailyDelta(-15)).toBe(-MAX_DAILY_DECREASE)
      expect(clampDailyDelta(-100)).toBe(-MAX_DAILY_DECREASE)
    })

    it('should handle exact limits', () => {
      expect(clampDailyDelta(MAX_DAILY_INCREASE)).toBe(MAX_DAILY_INCREASE)
      expect(clampDailyDelta(-MAX_DAILY_DECREASE)).toBe(-MAX_DAILY_DECREASE)
    })
  })

  describe('calculateNewScore (AC5)', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    const createFactor = (
      type: TrustFactor['type'],
      category: TrustFactor['category'],
      value: number,
      daysAgo: number = 1
    ): TrustFactor => ({
      type,
      category,
      value,
      description: `Test ${type}`,
      occurredAt: new Date(referenceDate.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    })

    it('should calculate new score from positive factors', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.previousScore).toBe(70)
      expect(result.newScore).toBe(75)
      expect(result.breakdown.positivePoints).toBe(5)
    })

    it('should calculate new score from concerning factors', () => {
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -5)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.previousScore).toBe(70)
      expect(result.newScore).toBe(65)
      expect(result.breakdown.concerningPoints).toBe(-5)
    })

    it('should handle mixed factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.newScore).toBe(72) // 70 + 5 - 3
    })

    it('should clamp increase to daily limit', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10), // Would be +10, clamped to +5
      ]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.newScore).toBe(75) // 70 + 5 (clamped)
      expect(result.breakdown.finalDelta).toBe(5)
    })

    it('should clamp decrease to daily limit', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -15), // Would be -15, clamped to -10
      ]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.newScore).toBe(60) // 70 - 10 (clamped)
      expect(result.breakdown.finalDelta).toBe(-10)
    })

    it('should not go below minimum score', () => {
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -10)]

      const result = calculateNewScore(5, factors, referenceDate)

      expect(result.newScore).toBe(TRUST_SCORE_MIN)
    })

    it('should not go above maximum score', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateNewScore(98, factors, referenceDate)

      expect(result.newScore).toBe(TRUST_SCORE_MAX)
    })

    it('should include all metadata in result', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.factorsApplied).toEqual(factors)
      expect(result.calculatedAt).toEqual(referenceDate)
      expect(result.breakdown).toBeDefined()
    })

    it('should validate against schema', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)
      const validation = scoreCalculationResultSchema.safeParse(result)

      expect(validation.success).toBe(true)
    })

    it('should start from default score of 70 (AC5)', () => {
      expect(TRUST_SCORE_DEFAULT).toBe(70)

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, [], referenceDate)

      expect(result.previousScore).toBe(70)
      expect(result.newScore).toBe(70)
    })
  })

  describe('recency weighting integration (AC4)', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    const createFactor = (
      type: TrustFactor['type'],
      category: TrustFactor['category'],
      value: number,
      daysAgo: number
    ): TrustFactor => ({
      type,
      category,
      value,
      description: `Test ${type}`,
      occurredAt: new Date(referenceDate.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    })

    it('should weight recent behavior more heavily', () => {
      // Same factor value, different ages
      const recentFactor = createFactor('time-limit-compliance', 'positive', 4, 1) // 4 * 1.0 = 4
      const olderFactor = createFactor('time-limit-compliance', 'positive', 4, 40) // 4 * 0.25 = 1

      const recentResult = calculateNewScore(TRUST_SCORE_DEFAULT, [recentFactor], referenceDate)
      const olderResult = calculateNewScore(TRUST_SCORE_DEFAULT, [olderFactor], referenceDate)

      expect(recentResult.newScore).toBe(74) // 70 + 4
      expect(olderResult.newScore).toBe(71) // 70 + 1
    })

    it('should calculate mixed age factors correctly', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 4, 1), // 4 * 1.0 = 4
        createFactor('focus-mode-usage', 'positive', 4, 10), // 4 * 0.75 = 3
        createFactor('no-bypass-attempts', 'positive', 4, 20), // 4 * 0.5 = 2
        createFactor('bypass-attempt', 'concerning', -4, 40), // -4 * 0.25 = -1
      ]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      // Total: 4 + 3 + 2 - 1 = 8, clamped to 5
      expect(result.newScore).toBe(75) // 70 + 5 (clamped)
    })

    it('should show recency in breakdown for transparency (AC6)', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 10, 1), // 10 * 1.0 = 10
        createFactor('bypass-attempt', 'concerning', -10, 40), // -10 * 0.25 = -2.5
      ]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors, referenceDate)

      expect(result.breakdown.positivePoints).toBe(10)
      expect(result.breakdown.concerningPoints).toBe(-2.5)
      // Net: 10 - 2.5 = 7.5, clamped to 5
      expect(result.breakdown.finalDelta).toBe(5)
    })
  })
})
