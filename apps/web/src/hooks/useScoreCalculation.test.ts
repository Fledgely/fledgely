/**
 * useScoreCalculation Hook Tests - Story 36.2
 *
 * Tests for score calculation hook.
 * AC1-3: Factor category contributions
 * AC4: Recency-weighted calculation
 * AC5: Starting score 70
 * AC6: Transparent calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useScoreCalculation } from './useScoreCalculation'
import { initializeTrustScore } from '../services/trustScoreService'
import { type TrustFactor, TRUST_SCORE_DEFAULT } from '@fledgely/shared'

describe('useScoreCalculation Hook - Story 36.2', () => {
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

  describe('basic state', () => {
    it('should provide current score', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.currentScore).toBe(TRUST_SCORE_DEFAULT)
    })

    it('should start with default score of 70 (AC5)', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.currentScore).toBe(70)
    })
  })

  describe('projected score', () => {
    it('should calculate projected score from positive factors', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.projectedScore).toBe(75)
    })

    it('should calculate projected score from concerning factors', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -5)]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.projectedScore).toBe(65)
    })

    it('should handle mixed factors', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.projectedScore).toBe(72) // 70 + 5 - 3
    })
  })

  describe('breakdown (AC6)', () => {
    it('should provide score breakdown', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.breakdown.positivePoints).toBe(5)
      expect(result.current.breakdown.concerningPoints).toBe(-3)
      expect(result.current.breakdown.finalDelta).toBe(2)
    })

    it('should provide breakdown text', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.breakdownText.length).toBeGreaterThan(0)
      expect(result.current.breakdownText.some((line) => line.includes('Good behaviors'))).toBe(
        true
      )
    })

    it('should provide breakdown summary', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('bypass-attempt', 'concerning', -3),
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.breakdownSummary).toBe('+5 good, -3 concerns')
    })
  })

  describe('factor contributions (AC1, AC2, AC3)', () => {
    it('should calculate positive contribution', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [
        createFactor('time-limit-compliance', 'positive', 5),
        createFactor('focus-mode-usage', 'positive', 3),
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.positiveContribution).toBe(8)
    })

    it('should calculate concerning contribution', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [
        createFactor('bypass-attempt', 'concerning', -5),
        createFactor('monitoring-disabled', 'concerning', -3),
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.concerningContribution).toBe(-8)
    })
  })

  describe('canRecalculate', () => {
    it('should allow recalculation when never updated', () => {
      const trustScore = initializeTrustScore('child-123')
      // Set lastUpdatedAt to 25 hours ago
      trustScore.lastUpdatedAt = new Date('2024-06-14T08:00:00Z')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.canRecalculate).toBe(true)
    })

    it('should block recalculation within 24 hours', () => {
      const trustScore = initializeTrustScore('child-123')
      // Just initialized, lastUpdatedAt is now

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.canRecalculate).toBe(false)
    })
  })

  describe('recalculate function', () => {
    it('should return calculation result', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [createFactor('time-limit-compliance', 'positive', 5)]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      const calcResult = result.current.recalculate()

      expect(calcResult.newScore).toBe(75)
      expect(calcResult.previousScore).toBe(70)
      expect(calcResult.breakdown).toBeDefined()
    })
  })

  describe('lastChange', () => {
    it('should return 0 for empty history', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.lastChange).toBe(0)
    })

    it('should return last change from history', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.history = [
        {
          date: new Date(),
          score: 75,
          previousScore: 70,
          reason: 'Update',
          factors: [],
        },
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.lastChange).toBe(5)
    })
  })

  describe('improvement tips', () => {
    it('should provide tips for concerning factors', () => {
      const trustScore = initializeTrustScore('child-123')
      const pendingFactors: TrustFactor[] = [createFactor('bypass-attempt', 'concerning', -5)]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors }))

      expect(result.current.improvementTips.some((tip) => tip.includes('avoid'))).toBe(true)
    })

    it('should provide encouragement when no concerns', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.improvementTips.some((tip) => tip.includes('Keep up'))).toBe(true)
    })
  })

  describe('encouragement', () => {
    it('should provide encouragement message', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.encouragement.length).toBeGreaterThan(0)
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

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.weeklyTrend).toBe(5)
    })

    it('should calculate monthly trend', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.history = [
        {
          date: new Date('2024-06-14T10:00:00Z'),
          score: 75,
          previousScore: 70,
          reason: 'Update',
          factors: [],
        },
        {
          date: new Date('2024-06-01T10:00:00Z'),
          score: 70,
          previousScore: 65,
          reason: 'Update',
          factors: [],
        },
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.monthlyTrend).toBe(10) // +5 + +5
    })
  })

  describe('milestone message', () => {
    it('should return null when no milestone crossed', () => {
      const trustScore = initializeTrustScore('child-123')

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.milestoneMessage).toBeNull()
    })

    it('should return message when milestone crossed', () => {
      const trustScore = initializeTrustScore('child-123')
      trustScore.currentScore = 92
      trustScore.history = [
        {
          date: new Date(),
          score: 92,
          previousScore: 88,
          reason: 'Update',
          factors: [],
        },
      ]

      const { result } = renderHook(() => useScoreCalculation({ trustScore, pendingFactors: [] }))

      expect(result.current.milestoneMessage).toContain('90')
    })
  })

  describe('recency weighting (AC4)', () => {
    it('should weight recent factors more heavily', () => {
      const trustScore = initializeTrustScore('child-123')

      // Recent factor should have more impact
      const recentFactor = createFactor('time-limit-compliance', 'positive', 4, 1)
      const { result: recentResult } = renderHook(() =>
        useScoreCalculation({ trustScore, pendingFactors: [recentFactor] })
      )

      // Old factor should have less impact
      const oldFactor = createFactor('time-limit-compliance', 'positive', 4, 40)
      const { result: oldResult } = renderHook(() =>
        useScoreCalculation({ trustScore, pendingFactors: [oldFactor] })
      )

      expect(recentResult.current.projectedScore).toBeGreaterThan(oldResult.current.projectedScore)
    })
  })
})
