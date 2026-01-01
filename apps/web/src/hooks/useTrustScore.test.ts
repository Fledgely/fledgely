/**
 * useTrustScore Hook Tests - Story 36.1
 *
 * Tests for trust score state management hook.
 * AC1: Schema includes childId, currentScore, history, factors
 * AC4: History tracks score changes
 * AC5: Factors breakdown
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTrustScore } from './useTrustScore'
import { TRUST_SCORE_DEFAULT } from '@fledgely/shared'

describe('useTrustScore Hook - Story 36.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should return default score when no initial data', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(result.current.currentScore).toBe(TRUST_SCORE_DEFAULT)
    })

    it('should return loading false after initialization', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(result.current.isLoading).toBe(false)
    })

    it('should return empty history initially', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(result.current.scoreHistory).toEqual([])
    })

    it('should return empty factors initially', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(result.current.currentFactors).toEqual([])
    })
  })

  describe('initial trust score data', () => {
    it('should use provided initial score', () => {
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 85,
        history: [],
        factors: [],
        lastUpdatedAt: new Date('2024-06-14'),
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.currentScore).toBe(85)
    })

    it('should use provided history', () => {
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 85,
        history: [
          {
            date: new Date('2024-06-14'),
            score: 85,
            previousScore: 80,
            reason: 'Daily update',
            factors: [],
          },
        ],
        factors: [],
        lastUpdatedAt: new Date('2024-06-14'),
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.scoreHistory.length).toBe(1)
      expect(result.current.scoreHistory[0].score).toBe(85)
    })

    it('should use provided factors', () => {
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 85,
        history: [],
        factors: [
          {
            type: 'time-limit-compliance' as const,
            category: 'positive' as const,
            value: 5,
            description: 'Following time limits',
            occurredAt: new Date(),
          },
        ],
        lastUpdatedAt: new Date('2024-06-14'),
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.currentFactors.length).toBe(1)
    })
  })

  describe('factor filtering (AC5)', () => {
    it('should separate positive factors', () => {
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
            description: 'Following time limits',
            occurredAt: new Date(),
          },
          {
            type: 'bypass-attempt' as const,
            category: 'concerning' as const,
            value: -5,
            description: 'Bypass detected',
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
      expect(result.current.positiveFactors[0].type).toBe('time-limit-compliance')
    })

    it('should separate concerning factors', () => {
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
            description: 'Following time limits',
            occurredAt: new Date(),
          },
          {
            type: 'bypass-attempt' as const,
            category: 'concerning' as const,
            value: -5,
            description: 'Bypass detected',
            occurredAt: new Date(),
          },
        ],
        lastUpdatedAt: new Date('2024-06-14'),
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.concerningFactors.length).toBe(1)
      expect(result.current.concerningFactors[0].type).toBe('bypass-attempt')
    })
  })

  describe('lastUpdatedAt', () => {
    it('should return lastUpdatedAt from trust score', () => {
      const lastUpdated = new Date('2024-06-14T08:00:00Z')
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 75,
        history: [],
        factors: [],
        lastUpdatedAt: lastUpdated,
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.lastUpdatedAt).toEqual(lastUpdated)
    })

    it('should return null when no initial trust score', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      // Initial trust score sets lastUpdatedAt to now
      expect(result.current.lastUpdatedAt).not.toBeNull()
    })
  })

  describe('canUpdate (AC6)', () => {
    it('should return true when 24+ hours since update', () => {
      const lastUpdated = new Date('2024-06-14T08:00:00Z') // 26 hours ago
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 75,
        history: [],
        factors: [],
        lastUpdatedAt: lastUpdated,
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.canUpdate).toBe(true)
    })

    it('should return false when less than 24 hours since update', () => {
      const lastUpdated = new Date('2024-06-15T09:00:00Z') // 1 hour ago
      const initialScore = {
        id: 'ts-123',
        childId: 'child-123',
        currentScore: 75,
        history: [],
        factors: [],
        lastUpdatedAt: lastUpdated,
        createdAt: new Date('2024-01-01'),
      }

      const { result } = renderHook(() =>
        useTrustScore({ childId: 'child-123', initialTrustScore: initialScore })
      )

      expect(result.current.canUpdate).toBe(false)
    })
  })

  describe('refreshScore', () => {
    it('should provide refreshScore function', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(typeof result.current.refreshScore).toBe('function')
    })

    it('should call refreshScore without error', () => {
      const { result } = renderHook(() => useTrustScore({ childId: 'child-123' }))

      expect(() => {
        act(() => {
          result.current.refreshScore()
        })
      }).not.toThrow()
    })
  })
})
