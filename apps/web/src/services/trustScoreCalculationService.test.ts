/**
 * Trust Score Calculation Service Tests - Story 36.2
 *
 * Tests for trust score calculation service.
 * AC1-3: Factor category contributions
 * AC4: Recency-weighted calculation
 * AC5: Starting score 70
 * AC6: Transparent calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateDailyUpdateTiming,
  performDailyUpdate,
  calculateProjectedScore,
  getPositiveFactorContribution,
  getNeutralFactorContribution,
  getConcerningFactorContribution,
  getScoreBreakdown,
  getBreakdownDisplayText,
  getBreakdownSummaryText,
  getImprovementTips,
  getEncouragementMessage,
  calculateScoreTrend,
  getScoreFromDaysAgo,
  checkScoreMilestone,
  formatMilestoneMessage,
  isValidScoreValue,
  clampToValidRange,
} from './trustScoreCalculationService'
import { initializeTrustScore } from './trustScoreService'
import {
  type TrustFactor,
  type TrustScoreHistoryEntry,
  TRUST_SCORE_DEFAULT,
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
} from '@fledgely/shared'

describe('Trust Score Calculation Service - Story 36.2', () => {
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

  describe('validateDailyUpdateTiming (AC4)', () => {
    it('should allow update when never updated', () => {
      expect(validateDailyUpdateTiming(null)).toBe(true)
    })

    it('should allow update after 24 hours', () => {
      const lastUpdated = new Date('2024-06-14T08:00:00Z')
      expect(validateDailyUpdateTiming(lastUpdated)).toBe(true)
    })

    it('should block update within 24 hours', () => {
      const lastUpdated = new Date('2024-06-15T09:00:00Z')
      expect(validateDailyUpdateTiming(lastUpdated)).toBe(false)
    })
  })

  describe('performDailyUpdate', () => {
    it('should update score with factors', () => {
      const trustScore = initializeTrustScore('child-123')
      // Set lastUpdatedAt to 25 hours ago to allow update
      trustScore.lastUpdatedAt = new Date('2024-06-14T08:00:00Z')

      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = performDailyUpdate(trustScore, factors)

      expect(result).not.toBeNull()
      expect(result!.currentScore).toBe(75) // 70 + 5
      expect(result!.history.length).toBe(1)
    })

    it('should return null if update not allowed', () => {
      const trustScore = initializeTrustScore('child-123')
      // Just initialized, so lastUpdatedAt is now

      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = performDailyUpdate(trustScore, factors)

      expect(result).toBeNull()
    })

    it('should add factors to existing factors', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.lastUpdatedAt = new Date('2024-06-14T08:00:00Z')
      trustScore.factors = [createFactor('focus-mode-usage', 'positive', 3)]

      const newFactors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = performDailyUpdate(trustScore, newFactors)

      expect(result!.factors.length).toBe(2)
    })

    it('should create history entry with correct values', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.lastUpdatedAt = new Date('2024-06-14T08:00:00Z')

      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = performDailyUpdate(trustScore, factors)

      expect(result!.history[0].previousScore).toBe(70)
      expect(result!.history[0].score).toBe(75)
      expect(result!.history[0].reason).toBe('Daily score update')
    })
  })

  describe('calculateProjectedScore', () => {
    it('should calculate projected score without modifying state', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const result = calculateProjectedScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(75)
      expect(result.previousScore).toBe(70)
    })

    it('should handle mixed factors', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const result = calculateProjectedScore(TRUST_SCORE_DEFAULT, factors)

      expect(result.newScore).toBe(72) // 70 + 5 - 3
    })
  })

  describe('factor contribution functions (AC1, AC2, AC3)', () => {
    it('should calculate positive contribution (AC1)', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('focus-mode-usage', 'positive', 3),
        createFactor('bypass-attempt', 'concerning', -5),
      ]

      expect(getPositiveFactorContribution(factors)).toBe(8)
    })

    it('should calculate neutral contribution (AC2)', () => {
      const factors: TrustFactor[] = [
        createFactor('normal-app-usage', 'neutral', 0),
        createFactor('time-limit-compliance', 'positive', 5),
      ]

      expect(getNeutralFactorContribution(factors)).toBe(0)
    })

    it('should calculate concerning contribution (AC3)', () => {
      const factors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5),
        createFactor('monitoring-disabled', 'concerning', -3),
        createFactor('time-limit-compliance', 'positive', 5),
      ]

      expect(getConcerningFactorContribution(factors)).toBe(-8)
    })
  })

  describe('breakdown generation (AC6)', () => {
    it('should generate score breakdown', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const breakdown = getScoreBreakdown(factors)

      expect(breakdown.positivePoints).toBe(5)
      expect(breakdown.concerningPoints).toBe(-3)
      expect(breakdown.finalDelta).toBe(2)
    })

    it('should generate display text', () => {
      const factors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const breakdown = getScoreBreakdown(factors)
      const text = getBreakdownDisplayText(breakdown)

      expect(text.length).toBeGreaterThan(0)
      expect(text.some((line) => line.includes('Good behaviors'))).toBe(true)
    })

    it('should generate summary text', () => {
      const factors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const breakdown = getScoreBreakdown(factors)
      const summary = getBreakdownSummaryText(breakdown)

      expect(summary).toBe('+5 good, -3 concerns')
    })
  })

  describe('improvement tips (AC6)', () => {
    it('should generate tips for bypass attempts', () => {
      const factors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -5)]

      const tips = getImprovementTips(factors)

      expect(tips.some((tip) => tip.includes('avoid trying to get around'))).toBe(true)
    })

    it('should generate tips for monitoring disabled', () => {
      const factors: TrustFactor[] = [createFactor('monitoring-disabled', 'concerning', -3)]

      const tips = getImprovementTips(factors)

      expect(tips.some((tip) => tip.includes('keep monitoring enabled'))).toBe(true)
    })

    it('should encourage when no concerns', () => {
      const tips = getImprovementTips([])

      expect(tips.some((tip) => tip.includes('Keep up'))).toBe(true)
    })
  })

  describe('encouragement messages', () => {
    it('should encourage for score increase', () => {
      const message = getEncouragementMessage(80, 75)

      expect(message).toContain('Great job')
    })

    it('should encourage after decrease', () => {
      const message = getEncouragementMessage(65, 70)

      expect(message).toContain('can always improve')
    })

    it('should maintain positivity for stable score', () => {
      const message = getEncouragementMessage(70, 70)

      expect(message.length).toBeGreaterThan(0)
    })
  })

  describe('calculateScoreTrend', () => {
    it('should calculate trend over 7 days', () => {
      const history: TrustScoreHistoryEntry[] = [
        {
          date: new Date('2024-06-14T10:00:00Z'),
          score: 75,
          previousScore: 70,
          reason: 'Update',
          factors: [],
        },
        {
          date: new Date('2024-06-13T10:00:00Z'),
          score: 70,
          previousScore: 68,
          reason: 'Update',
          factors: [],
        },
      ]

      const trend = calculateScoreTrend(history, 7)

      expect(trend).toBe(7) // +5 + +2
    })

    it('should return 0 for empty history', () => {
      expect(calculateScoreTrend([], 7)).toBe(0)
    })

    it('should only include entries within period', () => {
      const history: TrustScoreHistoryEntry[] = [
        {
          date: new Date('2024-06-14T10:00:00Z'),
          score: 75,
          previousScore: 70,
          reason: 'Recent',
          factors: [],
        },
        {
          date: new Date('2024-06-01T10:00:00Z'), // 14 days ago
          score: 70,
          previousScore: 60,
          reason: 'Old',
          factors: [],
        },
      ]

      const trend = calculateScoreTrend(history, 7)

      expect(trend).toBe(5) // Only the recent one
    })
  })

  describe('getScoreFromDaysAgo', () => {
    it('should return current score for empty history', () => {
      expect(getScoreFromDaysAgo(75, [], 7)).toBe(75)
    })

    it('should find score from specific day', () => {
      const history: TrustScoreHistoryEntry[] = [
        {
          date: new Date('2024-06-14T10:00:00Z'),
          score: 75,
          previousScore: 70,
          reason: 'Update',
          factors: [],
        },
        {
          date: new Date('2024-06-10T10:00:00Z'),
          score: 70,
          previousScore: 65,
          reason: 'Update',
          factors: [],
        },
      ]

      // 3 days ago (June 12) should find the entry from June 10
      const score = getScoreFromDaysAgo(75, history, 3)

      expect(score).toBe(70)
    })
  })

  describe('checkScoreMilestone', () => {
    it('should detect reaching 90', () => {
      const result = checkScoreMilestone(88, 92)

      expect(result).toEqual({ milestone: 90, direction: 'reached' })
    })

    it('should detect reaching 80', () => {
      const result = checkScoreMilestone(78, 82)

      expect(result).toEqual({ milestone: 80, direction: 'reached' })
    })

    it('should detect dropping below 70', () => {
      const result = checkScoreMilestone(72, 68)

      expect(result).toEqual({ milestone: 70, direction: 'dropped_below' })
    })

    it('should return null for no milestone crossed', () => {
      const result = checkScoreMilestone(75, 77)

      expect(result).toBeNull()
    })
  })

  describe('formatMilestoneMessage', () => {
    it('should format reaching high milestone', () => {
      const message = formatMilestoneMessage(90, 'reached')

      expect(message).toContain('Congratulations')
      expect(message).toContain('90')
    })

    it('should format reaching medium milestone', () => {
      const message = formatMilestoneMessage(80, 'reached')

      expect(message).toContain('Great job')
    })

    it('should format dropping below with encouragement', () => {
      const message = formatMilestoneMessage(70, 'dropped_below')

      expect(message).toContain('opportunity to improve')
    })
  })

  describe('validation functions', () => {
    it('should validate score in range', () => {
      expect(isValidScoreValue(0)).toBe(true)
      expect(isValidScoreValue(50)).toBe(true)
      expect(isValidScoreValue(100)).toBe(true)
      expect(isValidScoreValue(-1)).toBe(false)
      expect(isValidScoreValue(101)).toBe(false)
    })

    it('should clamp to valid range', () => {
      expect(clampToValidRange(-10)).toBe(TRUST_SCORE_MIN)
      expect(clampToValidRange(110)).toBe(TRUST_SCORE_MAX)
      expect(clampToValidRange(75)).toBe(75)
    })
  })

  describe('starting score 70 (AC5)', () => {
    it('should use default score of 70', () => {
      expect(TRUST_SCORE_DEFAULT).toBe(70)
    })

    it('should initialize with 70', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.currentScore).toBe(70)
    })
  })

  describe('recency weighting integration (AC4)', () => {
    it('should weight recent factors more heavily', () => {
      const recentFactor = createFactor('time-limit-compliance', 'positive', 4, 1)
      const oldFactor = createFactor('time-limit-compliance', 'positive', 4, 40)

      const recentResult = calculateProjectedScore(TRUST_SCORE_DEFAULT, [recentFactor])
      const oldResult = calculateProjectedScore(TRUST_SCORE_DEFAULT, [oldFactor])

      expect(recentResult.newScore).toBeGreaterThan(oldResult.newScore)
    })
  })
})
