/**
 * Trust Score Calculation Integration Tests - Story 36.2
 *
 * Integration tests for complete trust score calculation flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScoreCalculation } from '../../../hooks/useScoreCalculation'
import { initializeTrustScore, addFactorToScore } from '../../../services/trustScoreService'
import {
  performDailyUpdate,
  calculateProjectedScore,
  getScoreBreakdown,
  checkScoreMilestone,
  calculateScoreTrend,
} from '../../../services/trustScoreCalculationService'
import {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  TRUST_SCORE_DEFAULT,
  type TrustFactor,
  calculateNewScore,
  getRecencyWeight,
  RECENCY_WEIGHT_LAST_7_DAYS,
  RECENCY_WEIGHT_LAST_14_DAYS,
  RECENCY_WEIGHT_LAST_30_DAYS,
  RECENCY_WEIGHT_OLDER,
  MAX_DAILY_INCREASE,
  MAX_DAILY_DECREASE,
  formatScoreChange,
  generateBreakdownText,
  generateImprovementTips,
  generateEncouragement,
} from '@fledgely/shared'

describe('Trust Score Calculation Integration - Story 36.2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const createFactor = (
    type: TrustFactor['type'],
    category: TrustFactor['category'],
    value: number,
    daysAgo: number = 0
  ): TrustFactor => ({
    type,
    category,
    value,
    description: `Test ${type}`,
    occurredAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
  })

  describe('starting score initialization (AC5)', () => {
    it('should start with default score of 70', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.currentScore).toBe(70)
      expect(TRUST_SCORE_DEFAULT).toBe(70)
    })

    it('should use default in hook', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.currentScore).toBe(70)
    })
  })

  describe('positive factors increase score (AC1)', () => {
    it('should increase score from time limit compliance', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(75)
    })

    it('should increase score from focus mode usage', () => {
      const factors: TrustFactor[] = [createFactor('focus-mode-usage', 'positive', 3)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(73)
    })

    it('should increase score from no bypass attempts', () => {
      const factors: TrustFactor[] = [createFactor('no-bypass-attempts', 'positive', 2)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(72)
    })

    it('should combine multiple positive factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('focus-mode-usage', 'positive', 3),
        createFactor('no-bypass-attempts', 'positive', 2),
      ]

      // Total: 10, but clamped to MAX_DAILY_INCREASE = 5
      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(75) // 70 + 5 (clamped)
    })
  })

  describe('neutral factors do not change score (AC2)', () => {
    it('should not change score from normal app usage', () => {
      const factors: TrustFactor[] = [createFactor('normal-app-usage', 'neutral', 0)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(70)
    })
  })

  describe('concerning factors decrease score (AC3)', () => {
    it('should decrease score from bypass attempt', () => {
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -5)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(65)
    })

    it('should decrease score from monitoring disabled', () => {
      const factors: TrustFactor[] = [createFactor('monitoring-disabled', 'concerning', -3)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(67)
    })

    it('should be logged not punished harshly', () => {
      // Even with large concerning value, clamped to MAX_DAILY_DECREASE
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -15)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(60) // 70 - 10 (clamped)
    })
  })

  describe('recency weighting (AC4)', () => {
    it('should give full weight to factors within 7 days', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 3)
      const weight = getRecencyWeight(factor.occurredAt)

      expect(weight).toBe(RECENCY_WEIGHT_LAST_7_DAYS)
    })

    it('should give 75% weight to factors 8-14 days old', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 10)
      const weight = getRecencyWeight(factor.occurredAt)

      expect(weight).toBe(RECENCY_WEIGHT_LAST_14_DAYS)
    })

    it('should give 50% weight to factors 15-30 days old', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 20)
      const weight = getRecencyWeight(factor.occurredAt)

      expect(weight).toBe(RECENCY_WEIGHT_LAST_30_DAYS)
    })

    it('should give 25% weight to factors older than 30 days', () => {
      const factor = createFactor('time-limit-compliance', 'positive', 10, 45)
      const weight = getRecencyWeight(factor.occurredAt)

      expect(weight).toBe(RECENCY_WEIGHT_OLDER)
    })

    it('should weight recent behavior more heavily in calculations', () => {
      // Recent factor with value 4 should contribute more than old factor with value 4
      const recentFactor = createFactor('time-limit-compliance', 'positive', 4, 1)
      const oldFactor = createFactor('time-limit-compliance', 'positive', 4, 40)

      const recentResult = calculateNewScore(TRUST_SCORE_DEFAULT, [recentFactor])
      const oldResult = calculateNewScore(TRUST_SCORE_DEFAULT, [oldFactor])

      expect(recentResult.newScore).toBeGreaterThan(oldResult.newScore)
    })

    it('should calculate correctly with mixed age factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 4, 1), // 4 * 1.0 = 4
        createFactor('focus-mode-usage', 'positive', 4, 10), // 4 * 0.75 = 3
        createFactor('no-bypass-attempts', 'positive', 4, 20), // 4 * 0.5 = 2
        createFactor('bypass-attempt', 'concerning', -4, 40), // -4 * 0.25 = -1
      ]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      // Total: 4 + 3 + 2 - 1 = 8, clamped to 5
      expect(result.newScore).toBe(75)
    })
  })

  describe('daily update restriction', () => {
    it('should block update within 24 hours', () => {
      const trustScore = initializeTrustScore('child-123')
      // Just created, lastUpdatedAt is now

      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = performDailyUpdate(trustScore, factors)

      expect(result).toBeNull()
    })

    it('should allow update after 24 hours', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.lastUpdatedAt = new Date('2024-06-14T08:00:00Z') // 26 hours ago

      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = performDailyUpdate(trustScore, factors)

      expect(result).not.toBeNull()
      expect(result!.currentScore).toBe(75)
    })
  })

  describe('score clamping to range', () => {
    it('should not go below minimum (0)', () => {
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -10)]

      const result = calculateNewScore(5, factors)

      expect(result.newScore).toBe(TRUST_SCORE_MIN)
    })

    it('should not go above maximum (100)', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateNewScore(98, factors)

      expect(result.newScore).toBe(TRUST_SCORE_MAX)
    })

    it('should respect daily increase limit', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 10)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.breakdown.finalDelta).toBe(MAX_DAILY_INCREASE)
    })

    it('should respect daily decrease limit', () => {
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -15)]

      const result = calculateNewScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.breakdown.finalDelta).toBe(-MAX_DAILY_DECREASE)
    })
  })

  describe('transparent breakdown (AC6)', () => {
    it('should provide transparent breakdown of calculation', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const breakdown = getScoreBreakdown(factors)

      expect(breakdown.positivePoints).toBe(5)
      expect(breakdown.concerningPoints).toBe(-3)
      expect(breakdown.finalDelta).toBe(2)
    })

    it('should generate readable breakdown text', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const breakdown = getScoreBreakdown(factors)
      const text = generateBreakdownText(breakdown)

      expect(text.some((line) => line.includes('Good behaviors'))).toBe(true)
      expect(text.some((line) => line.includes('+5'))).toBe(true)
    })

    it('should format score changes clearly', () => {
      expect(formatScoreChange(5)).toBe('Up 5 points')
      expect(formatScoreChange(-3)).toBe('Down 3 points')
      expect(formatScoreChange(0)).toBe('No change')
    })

    it('should provide improvement tips for concerning factors', () => {
      const concerningFactors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -5)]

      const tips = generateImprovementTips(concerningFactors)

      expect(tips.some((tip) => tip.includes('avoid'))).toBe(true)
    })

    it('should provide encouragement for improvements', () => {
      const message = generateEncouragement(80, 75)

      expect(message).toContain('Great job')
    })
  })

  describe('score trends', () => {
    it('should calculate weekly trend', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.history = [
        {
          date: new Date('2024-06-14T10:00:00Z'),
          score: 75,
          previousScore: 70,
          reason: 'Update',
          factors: [],
        },
      ]

      const trend = calculateScoreTrend(trustScore.history, 7)

      expect(trend).toBe(5)
    })

    it('should calculate monthly trend', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.history = [
        {
          date: new Date('2024-06-14T10:00:00Z'),
          score: 80,
          previousScore: 75,
          reason: 'Update',
          factors: [],
        },
        {
          date: new Date('2024-06-01T10:00:00Z'),
          score: 75,
          previousScore: 70,
          reason: 'Update',
          factors: [],
        },
      ]

      const trend = calculateScoreTrend(trustScore.history, 30)

      expect(trend).toBe(10) // +5 + +5
    })
  })

  describe('milestones', () => {
    it('should detect reaching 90 milestone', () => {
      const milestone = checkScoreMilestone(88, 92)

      expect(milestone).toEqual({ milestone: 90, direction: 'reached' })
    })

    it('should detect dropping below 70 milestone', () => {
      const milestone = checkScoreMilestone(72, 68)

      expect(milestone).toEqual({ milestone: 70, direction: 'dropped_below' })
    })
  })

  describe('complete flow', () => {
    it('should support full calculation lifecycle', () => {
      // 1. Initialize with default score
      const trustScore = initializeTrustScore('child-123')
      expect(trustScore.currentScore).toBe(70)

      // 2. Add positive factor
      const updatedScore = addFactorToScore(trustScore, {
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      })
      expect(updatedScore.factors.length).toBe(1)

      // 3. Project new score
      const projection = calculateProjectedScore(updatedScore.currentScore, updatedScore.factors)
      expect(projection.newScore).toBe(75)

      // 4. Verify breakdown
      const breakdown = getScoreBreakdown(updatedScore.factors)
      expect(breakdown.positivePoints).toBe(5)
      expect(breakdown.concerningPoints).toBe(0)

      // 5. Use in hook
      const { result } = renderHook(() =>
        useScoreCalculation({
          trustScore: updatedScore,
          pendingFactors: updatedScore.factors,
        })
      )

      expect(result.current.projectedScore).toBe(75)
      expect(result.current.positiveContribution).toBe(5)
      expect(result.current.breakdownSummary).toBe('+5 good')
    })

    it('should handle mixed factors correctly', () => {
      const trustScore = initializeTrustScore('child-123')

      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('focus-mode-usage', 'positive', 3),
        createFactor('bypass-attempt', 'concerning', -3),
        createFactor('normal-app-usage', 'neutral', 0),
      ]

      const { result } = renderHook(() =>
        useScoreCalculation({ trustScore, pendingFactors: factors })
      )

      expect(result.current.currentScore).toBe(70)
      expect(result.current.projectedScore).toBe(75) // 70 + 5 (positive 8, concerning -3, delta 5 = clamped 5)
      expect(result.current.positiveContribution).toBe(8)
      expect(result.current.concerningContribution).toBe(-3)
    })
  })
})
