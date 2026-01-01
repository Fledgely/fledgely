/**
 * Trust Score Service Tests - Story 36.1
 *
 * Tests for trust score data operations.
 * AC1: Schema includes childId, currentScore, history, factors
 * AC4: History tracks score changes over time
 * AC6: Score updates daily (not real-time)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  initializeTrustScore,
  getTrustScore,
  getTrustScoreHistory,
  getFactorsBreakdown,
  addFactorToScore,
  canUpdateScore,
  createHistoryEntry,
} from './trustScoreService'
import { TRUST_SCORE_DEFAULT } from '@fledgely/shared'

describe('Trust Score Service - Story 36.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initializeTrustScore (AC1)', () => {
    it('should create trust score with default value of 70', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.currentScore).toBe(TRUST_SCORE_DEFAULT)
      expect(trustScore.currentScore).toBe(70)
    })

    it('should set childId correctly', () => {
      const trustScore = initializeTrustScore('child-456')

      expect(trustScore.childId).toBe('child-456')
    })

    it('should generate unique id', () => {
      const score1 = initializeTrustScore('child-1')
      const score2 = initializeTrustScore('child-2')

      expect(score1.id).toBeTruthy()
      expect(score2.id).toBeTruthy()
      expect(score1.id).not.toBe(score2.id)
    })

    it('should have empty history initially', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.history).toEqual([])
    })

    it('should have empty factors initially', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.factors).toEqual([])
    })

    it('should set createdAt to current time', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.createdAt).toEqual(new Date('2024-06-15T10:00:00Z'))
    })

    it('should set lastUpdatedAt to current time', () => {
      const trustScore = initializeTrustScore('child-123')

      expect(trustScore.lastUpdatedAt).toEqual(new Date('2024-06-15T10:00:00Z'))
    })
  })

  describe('getTrustScore', () => {
    it('should return trust score for valid childId', () => {
      const initialized = initializeTrustScore('child-123')
      const retrieved = getTrustScore('child-123', initialized)

      expect(retrieved).toEqual(initialized)
    })

    it('should return null for mismatched childId', () => {
      const initialized = initializeTrustScore('child-123')
      const retrieved = getTrustScore('different-child', initialized)

      expect(retrieved).toBeNull()
    })

    it('should return null when no trust score provided', () => {
      const retrieved = getTrustScore('child-123', null)

      expect(retrieved).toBeNull()
    })
  })

  describe('getTrustScoreHistory (AC4)', () => {
    it('should return all history by default', () => {
      const trustScore = initializeTrustScore('child-123')
      const historyEntry = createHistoryEntry(75, 70, 'Daily update', [])

      trustScore.history.push(historyEntry)
      const history = getTrustScoreHistory(trustScore)

      expect(history.length).toBe(1)
      expect(history[0].score).toBe(75)
    })

    it('should limit history when limit provided', () => {
      const trustScore = initializeTrustScore('child-123')

      // Add multiple history entries
      for (let i = 0; i < 5; i++) {
        trustScore.history.push(createHistoryEntry(70 + i, 70 + i - 1, `Update ${i}`, []))
      }

      const history = getTrustScoreHistory(trustScore, 3)

      expect(history.length).toBe(3)
    })

    it('should return most recent entries first', () => {
      const trustScore = initializeTrustScore('child-123')

      trustScore.history.push(createHistoryEntry(71, 70, 'First update', []))
      vi.advanceTimersByTime(86400000) // 1 day
      trustScore.history.push(createHistoryEntry(73, 71, 'Second update', []))

      const history = getTrustScoreHistory(trustScore, 2)

      expect(history[0].reason).toBe('Second update')
      expect(history[1].reason).toBe('First update')
    })

    it('should return empty array for empty history', () => {
      const trustScore = initializeTrustScore('child-123')
      const history = getTrustScoreHistory(trustScore)

      expect(history).toEqual([])
    })
  })

  describe('getFactorsBreakdown (AC5)', () => {
    it('should return all factors', () => {
      const trustScore = initializeTrustScore('child-123')

      trustScore.factors.push({
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      })

      const factors = getFactorsBreakdown(trustScore)

      expect(factors.length).toBe(1)
      expect(factors[0].type).toBe('time-limit-compliance')
    })

    it('should group by category', () => {
      const trustScore = initializeTrustScore('child-123')

      trustScore.factors.push(
        {
          type: 'time-limit-compliance',
          category: 'positive',
          value: 5,
          description: 'Following time limits',
          occurredAt: new Date(),
        },
        {
          type: 'bypass-attempt',
          category: 'concerning',
          value: -5,
          description: 'Bypass detected',
          occurredAt: new Date(),
        }
      )

      const factors = getFactorsBreakdown(trustScore)
      const positive = factors.filter((f) => f.category === 'positive')
      const concerning = factors.filter((f) => f.category === 'concerning')

      expect(positive.length).toBe(1)
      expect(concerning.length).toBe(1)
    })

    it('should return empty array for no factors', () => {
      const trustScore = initializeTrustScore('child-123')
      const factors = getFactorsBreakdown(trustScore)

      expect(factors).toEqual([])
    })
  })

  describe('addFactorToScore', () => {
    it('should add factor to factors array', () => {
      const trustScore = initializeTrustScore('child-123')
      const factor = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }

      const updated = addFactorToScore(trustScore, factor)

      expect(updated.factors.length).toBe(1)
      expect(updated.factors[0]).toEqual(factor)
    })

    it('should not mutate original trust score', () => {
      const trustScore = initializeTrustScore('child-123')
      const factor = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }

      addFactorToScore(trustScore, factor)

      expect(trustScore.factors.length).toBe(0)
    })

    it('should accumulate multiple factors', () => {
      const trustScore = initializeTrustScore('child-123')
      const factor1 = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }
      const factor2 = {
        type: 'focus-mode-usage' as const,
        category: 'positive' as const,
        value: 3,
        description: 'Using focus mode',
        occurredAt: new Date(),
      }

      const updated1 = addFactorToScore(trustScore, factor1)
      const updated2 = addFactorToScore(updated1, factor2)

      expect(updated2.factors.length).toBe(2)
    })
  })

  describe('canUpdateScore (AC6)', () => {
    it('should return true when never updated', () => {
      expect(canUpdateScore(null)).toBe(true)
    })

    it('should return true when 24+ hours since last update', () => {
      const lastUpdated = new Date('2024-06-14T09:00:00Z') // 25 hours ago
      expect(canUpdateScore(lastUpdated)).toBe(true)
    })

    it('should return false when less than 24 hours since update', () => {
      const lastUpdated = new Date('2024-06-15T08:00:00Z') // 2 hours ago
      expect(canUpdateScore(lastUpdated)).toBe(false)
    })

    it('should return true when exactly 24 hours since update', () => {
      const lastUpdated = new Date('2024-06-14T10:00:00Z') // Exactly 24 hours ago
      expect(canUpdateScore(lastUpdated)).toBe(true)
    })

    it('should return false when 23 hours 59 minutes since update', () => {
      const lastUpdated = new Date('2024-06-14T10:01:00Z') // Just under 24 hours
      expect(canUpdateScore(lastUpdated)).toBe(false)
    })
  })

  describe('createHistoryEntry (AC4)', () => {
    it('should create history entry with all fields', () => {
      const entry = createHistoryEntry(75, 70, 'Daily update', [])

      expect(entry.score).toBe(75)
      expect(entry.previousScore).toBe(70)
      expect(entry.reason).toBe('Daily update')
      expect(entry.factors).toEqual([])
      expect(entry.date).toEqual(new Date('2024-06-15T10:00:00Z'))
    })

    it('should include factors in history entry', () => {
      const factor = {
        type: 'time-limit-compliance' as const,
        category: 'positive' as const,
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }

      const entry = createHistoryEntry(75, 70, 'Daily update', [factor])

      expect(entry.factors.length).toBe(1)
      expect(entry.factors[0]).toEqual(factor)
    })
  })
})
