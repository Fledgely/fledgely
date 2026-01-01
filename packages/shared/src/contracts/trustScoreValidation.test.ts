/**
 * Trust Score Validation Tests - Story 36.1
 *
 * Tests for trust score validation utilities.
 * AC2: Score range 0-100
 * AC6: Score updates daily
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isValidScore,
  clampScore,
  validateTrustScore,
  validateFactor,
  isScoreUpdateDue,
} from './trustScoreValidation'
import { TRUST_SCORE_MIN, TRUST_SCORE_MAX } from './trustScore'

describe('Trust Score Validation - Story 36.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isValidScore (AC2)', () => {
    it('should return true for score of 0', () => {
      expect(isValidScore(0)).toBe(true)
    })

    it('should return true for score of 100', () => {
      expect(isValidScore(100)).toBe(true)
    })

    it('should return true for score of 50', () => {
      expect(isValidScore(50)).toBe(true)
    })

    it('should return true for score of 70 (default)', () => {
      expect(isValidScore(70)).toBe(true)
    })

    it('should return false for negative score', () => {
      expect(isValidScore(-1)).toBe(false)
    })

    it('should return false for score above 100', () => {
      expect(isValidScore(101)).toBe(false)
    })

    it('should return false for large negative score', () => {
      expect(isValidScore(-100)).toBe(false)
    })

    it('should return false for large positive score', () => {
      expect(isValidScore(200)).toBe(false)
    })

    it('should return true for boundary value MIN', () => {
      expect(isValidScore(TRUST_SCORE_MIN)).toBe(true)
    })

    it('should return true for boundary value MAX', () => {
      expect(isValidScore(TRUST_SCORE_MAX)).toBe(true)
    })
  })

  describe('clampScore (AC2)', () => {
    it('should return same value for valid score', () => {
      expect(clampScore(50)).toBe(50)
    })

    it('should clamp negative score to 0', () => {
      expect(clampScore(-10)).toBe(0)
    })

    it('should clamp score above 100 to 100', () => {
      expect(clampScore(150)).toBe(100)
    })

    it('should return 0 for score of 0', () => {
      expect(clampScore(0)).toBe(0)
    })

    it('should return 100 for score of 100', () => {
      expect(clampScore(100)).toBe(100)
    })

    it('should clamp large negative to MIN', () => {
      expect(clampScore(-1000)).toBe(TRUST_SCORE_MIN)
    })

    it('should clamp large positive to MAX', () => {
      expect(clampScore(1000)).toBe(TRUST_SCORE_MAX)
    })

    it('should handle decimal scores', () => {
      expect(clampScore(75.5)).toBe(75.5)
    })

    it('should clamp negative decimals to 0', () => {
      expect(clampScore(-0.5)).toBe(0)
    })
  })

  describe('validateTrustScore', () => {
    const validTrustScore = {
      id: 'ts-123',
      childId: 'child-456',
      currentScore: 75,
      history: [],
      factors: [],
      lastUpdatedAt: new Date('2024-06-15'),
      createdAt: new Date('2024-01-01'),
    }

    it('should return success for valid trust score', () => {
      const result = validateTrustScore(validTrustScore)
      expect(result.success).toBe(true)
    })

    it('should return failure for missing id', () => {
      const { id: _, ...invalid } = validTrustScore
      const result = validateTrustScore(invalid)
      expect(result.success).toBe(false)
    })

    it('should return failure for missing childId', () => {
      const { childId: _, ...invalid } = validTrustScore
      const result = validateTrustScore(invalid)
      expect(result.success).toBe(false)
    })

    it('should return failure for invalid score', () => {
      const invalid = { ...validTrustScore, currentScore: 150 }
      const result = validateTrustScore(invalid)
      expect(result.success).toBe(false)
    })

    it('should return failure for negative score', () => {
      const invalid = { ...validTrustScore, currentScore: -10 }
      const result = validateTrustScore(invalid)
      expect(result.success).toBe(false)
    })

    it('should return data for valid trust score', () => {
      const result = validateTrustScore(validTrustScore)
      if (result.success) {
        expect(result.data.childId).toBe('child-456')
      }
    })
  })

  describe('validateFactor', () => {
    const validFactor = {
      type: 'time-limit-compliance' as const,
      category: 'positive' as const,
      value: 5,
      description: 'Following time limits',
      occurredAt: new Date('2024-06-15'),
    }

    it('should return success for valid factor', () => {
      const result = validateFactor(validFactor)
      expect(result.success).toBe(true)
    })

    it('should return failure for invalid type', () => {
      const invalid = { ...validFactor, type: 'invalid-type' }
      const result = validateFactor(invalid)
      expect(result.success).toBe(false)
    })

    it('should return failure for invalid category', () => {
      const invalid = { ...validFactor, category: 'bad-category' }
      const result = validateFactor(invalid)
      expect(result.success).toBe(false)
    })

    it('should return failure for missing description', () => {
      const { description: _, ...invalid } = validFactor
      const result = validateFactor(invalid)
      expect(result.success).toBe(false)
    })

    it('should return failure for missing occurredAt', () => {
      const { occurredAt: _, ...invalid } = validFactor
      const result = validateFactor(invalid)
      expect(result.success).toBe(false)
    })

    it('should allow negative value for concerning factor', () => {
      const concerningFactor = {
        ...validFactor,
        type: 'bypass-attempt' as const,
        category: 'concerning' as const,
        value: -5,
      }
      const result = validateFactor(concerningFactor)
      expect(result.success).toBe(true)
    })
  })

  describe('isScoreUpdateDue (AC6)', () => {
    it('should return true when lastUpdatedAt is null', () => {
      expect(isScoreUpdateDue(null)).toBe(true)
    })

    it('should return true when 24+ hours since update', () => {
      const lastUpdated = new Date('2024-06-14T08:00:00Z') // 26 hours ago
      expect(isScoreUpdateDue(lastUpdated)).toBe(true)
    })

    it('should return false when less than 24 hours', () => {
      const lastUpdated = new Date('2024-06-15T09:00:00Z') // 1 hour ago
      expect(isScoreUpdateDue(lastUpdated)).toBe(false)
    })

    it('should return true when exactly 24 hours', () => {
      const lastUpdated = new Date('2024-06-14T10:00:00Z') // 24 hours ago
      expect(isScoreUpdateDue(lastUpdated)).toBe(true)
    })

    it('should return false when 23:59 hours since update', () => {
      const lastUpdated = new Date('2024-06-14T10:01:00Z') // Just under 24 hours
      expect(isScoreUpdateDue(lastUpdated)).toBe(false)
    })

    it('should return true when 48 hours since update', () => {
      const lastUpdated = new Date('2024-06-13T10:00:00Z') // 48 hours ago
      expect(isScoreUpdateDue(lastUpdated)).toBe(true)
    })
  })
})
