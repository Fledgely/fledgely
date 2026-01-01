/**
 * Trust Score Data Model Integration Tests - Story 36.1
 *
 * Integration tests for complete trust score data model.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTrustScore } from '../../../hooks/useTrustScore'
import {
  initializeTrustScore,
  addFactorToScore,
  createHistoryEntry,
  canUpdateScore,
} from '../../../services/trustScoreService'
import {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  TRUST_SCORE_DEFAULT,
  trustScoreSchema,
  isValidScore,
  clampScore,
  calculateFactorPoints,
  getFactorDefinition,
  TRUST_FACTOR_DEFINITIONS,
} from '@fledgely/shared'

describe('Trust Score Data Model Integration - Story 36.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('schema validation (AC1, AC3)', () => {
    it('should create valid trust score with all required fields', () => {
      const trustScore = initializeTrustScore('child-123')

      // AC1: Schema includes childId, currentScore, history, factors
      expect(trustScore.childId).toBe('child-123')
      expect(trustScore.currentScore).toBeDefined()
      expect(trustScore.history).toBeDefined()
      expect(trustScore.factors).toBeDefined()

      // AC3: Zod schema validation
      const result = trustScoreSchema.safeParse(trustScore)
      expect(result.success).toBe(true)
    })

    it('should enforce schema validation', () => {
      const invalidScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 150, // Invalid: above max
        history: [],
        factors: [],
        lastUpdatedAt: new Date(),
        createdAt: new Date(),
      }

      const result = trustScoreSchema.safeParse(invalidScore)
      expect(result.success).toBe(false)
    })
  })

  describe('score range enforcement (AC2)', () => {
    it('should use default score of 70', () => {
      expect(TRUST_SCORE_DEFAULT).toBe(70)

      const trustScore = initializeTrustScore('child-123')
      expect(trustScore.currentScore).toBe(70)
    })

    it('should have min score of 0', () => {
      expect(TRUST_SCORE_MIN).toBe(0)
      expect(isValidScore(0)).toBe(true)
      expect(isValidScore(-1)).toBe(false)
    })

    it('should have max score of 100', () => {
      expect(TRUST_SCORE_MAX).toBe(100)
      expect(isValidScore(100)).toBe(true)
      expect(isValidScore(101)).toBe(false)
    })

    it('should clamp scores to valid range', () => {
      expect(clampScore(-50)).toBe(0)
      expect(clampScore(150)).toBe(100)
      expect(clampScore(75)).toBe(75)
    })
  })

  describe('history tracking (AC4)', () => {
    it('should track score changes over time', () => {
      const trustScore = initializeTrustScore('child-123')

      const entry = createHistoryEntry(75, 70, 'Daily update', [])
      trustScore.history.push(entry)

      expect(trustScore.history.length).toBe(1)
      expect(trustScore.history[0].score).toBe(75)
      expect(trustScore.history[0].previousScore).toBe(70)
      expect(trustScore.history[0].reason).toBe('Daily update')
    })

    it('should include factors in history entries', () => {
      const factor = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }

      const entry = createHistoryEntry(75, 70, 'Daily update', [factor])

      expect(entry.factors.length).toBe(1)
      expect(entry.factors[0].type).toBe('time-limit-compliance')
    })

    it('should accumulate multiple history entries', () => {
      const trustScore = initializeTrustScore('child-123')

      trustScore.history.push(createHistoryEntry(72, 70, 'Day 1', []))
      vi.advanceTimersByTime(86400000)
      trustScore.history.push(createHistoryEntry(75, 72, 'Day 2', []))
      vi.advanceTimersByTime(86400000)
      trustScore.history.push(createHistoryEntry(78, 75, 'Day 3', []))

      expect(trustScore.history.length).toBe(3)
    })
  })

  describe('factors breakdown (AC5)', () => {
    it('should define all factor types', () => {
      expect(TRUST_FACTOR_DEFINITIONS.length).toBe(6)
    })

    it('should have positive factors', () => {
      const positive = TRUST_FACTOR_DEFINITIONS.filter((f) => f.category === 'positive')
      expect(positive.length).toBe(3)
      expect(positive.map((f) => f.type)).toContain('time-limit-compliance')
      expect(positive.map((f) => f.type)).toContain('focus-mode-usage')
      expect(positive.map((f) => f.type)).toContain('no-bypass-attempts')
    })

    it('should have neutral factors', () => {
      const neutral = TRUST_FACTOR_DEFINITIONS.filter((f) => f.category === 'neutral')
      expect(neutral.length).toBe(1)
      expect(neutral[0].type).toBe('normal-app-usage')
    })

    it('should have concerning factors', () => {
      const concerning = TRUST_FACTOR_DEFINITIONS.filter((f) => f.category === 'concerning')
      expect(concerning.length).toBe(2)
      expect(concerning.map((f) => f.type)).toContain('bypass-attempt')
      expect(concerning.map((f) => f.type)).toContain('monitoring-disabled')
    })

    it('should calculate factor points correctly', () => {
      const factors = [
        {
          type: 'time-limit-compliance' as const,
          category: 'positive' as const,
          value: 5,
          description: 'Test',
          occurredAt: new Date(),
        },
        {
          type: 'focus-mode-usage' as const,
          category: 'positive' as const,
          value: 3,
          description: 'Test',
          occurredAt: new Date(),
        },
        {
          type: 'bypass-attempt' as const,
          category: 'concerning' as const,
          value: -5,
          description: 'Test',
          occurredAt: new Date(),
        },
      ]

      expect(calculateFactorPoints(factors)).toBe(3) // 5 + 3 - 5
    })

    it('should add factors to trust score', () => {
      let trustScore = initializeTrustScore('child-123')

      const factor = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }

      trustScore = addFactorToScore(trustScore, factor)

      expect(trustScore.factors.length).toBe(1)
      expect(trustScore.factors[0].type).toBe('time-limit-compliance')
    })

    it('should get factor definition by type', () => {
      const definition = getFactorDefinition('time-limit-compliance')

      expect(definition).not.toBeNull()
      expect(definition?.basePoints).toBe(5)
      expect(definition?.category).toBe('positive')
    })
  })

  describe('daily update restriction (AC6)', () => {
    it('should allow update when never updated', () => {
      expect(canUpdateScore(null)).toBe(true)
    })

    it('should allow update after 24 hours', () => {
      const lastUpdated = new Date('2024-06-14T08:00:00Z')
      expect(canUpdateScore(lastUpdated)).toBe(true)
    })

    it('should block update within 24 hours', () => {
      const lastUpdated = new Date('2024-06-15T09:00:00Z')
      expect(canUpdateScore(lastUpdated)).toBe(false)
    })
  })

  describe('hook integration', () => {
    it('should provide complete trust score state', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(result.current.currentScore).toBe(TRUST_SCORE_DEFAULT)
      expect(result.current.scoreHistory).toEqual([])
      expect(result.current.currentFactors).toEqual([])
      expect(result.current.positiveFactors).toEqual([])
      expect(result.current.concerningFactors).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(typeof result.current.refreshScore).toBe('function')
    })

    it('should separate factors by category', () => {
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 75,
        history: [],
        factors: [
          {
            type: 'time-limit-compliance' as const,
            category: 'positive' as const,
            value: 5,
            description: 'Test',
            occurredAt: new Date(),
          },
          {
            type: 'bypass-attempt' as const,
            category: 'concerning' as const,
            value: -5,
            description: 'Test',
            occurredAt: new Date(),
          },
        ],
        lastUpdatedAt: new Date('2024-06-14'),
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.positiveFactors.length).toBe(1)
      expect(result.current.concerningFactors.length).toBe(1)
    })
  })

  describe('complete lifecycle flow', () => {
    it('should support full trust score lifecycle', () => {
      // 1. Initialize with default score
      let trustScore = initializeTrustScore('child-123')
      expect(trustScore.currentScore).toBe(70)

      // 2. Add positive factor
      const positiveFactor = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }
      trustScore = addFactorToScore(trustScore, positiveFactor)
      expect(trustScore.factors.length).toBe(1)

      // 3. Create history entry
      const newScore = 75
      const entry = createHistoryEntry(
        newScore,
        trustScore.currentScore,
        'Daily update',
        trustScore.factors
      )
      trustScore.history.push(entry)

      // 4. Update current score
      trustScore = { ...trustScore, currentScore: newScore }
      expect(trustScore.currentScore).toBe(75)

      // 5. Verify history tracked
      expect(trustScore.history.length).toBe(1)
      expect(trustScore.history[0].previousScore).toBe(70)
      expect(trustScore.history[0].score).toBe(75)

      // 6. Verify schema validates
      const result = trustScoreSchema.safeParse(trustScore)
      expect(result.success).toBe(true)
    })
  })
})
