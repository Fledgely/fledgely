/**
 * useBypassAttempts Hook Tests - Story 36.5 Task 6
 *
 * Tests for React hook managing bypass attempt data.
 * AC1: Log bypass attempts with timestamp and context
 * AC3: Bypass attempts expire after configurable period
 * AC4: Child can see their own bypass attempt history
 */

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBypassAttempts } from './useBypassAttempts'
import { type BypassAttempt } from '@fledgely/shared'

// Helper to create relative dates
const daysAgo = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

const daysFromNow = (days: number): Date => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

const createBypassAttempt = (overrides: Partial<BypassAttempt> = {}): BypassAttempt => ({
  id: `bypass-${Math.random().toString(36).substring(7)}`,
  childId: 'child-123',
  deviceId: 'device-456',
  attemptType: 'extension-disable',
  context: 'Chrome extension was disabled from settings',
  occurredAt: daysAgo(5),
  expiresAt: daysFromNow(25),
  impactOnScore: -10,
  wasIntentional: null,
  ...overrides,
})

describe('useBypassAttempts - Story 36.5 Task 6', () => {
  describe('Initial state', () => {
    it('should return empty array initially when no data', () => {
      const { result } = renderHook(() => useBypassAttempts({ childId: 'child-123' }))

      expect(result.current.attempts).toEqual([])
    })

    it('should return loading state', () => {
      const { result } = renderHook(() => useBypassAttempts({ childId: 'child-123' }))

      expect(result.current.isLoading).toBeDefined()
    })

    it('should return null error state', () => {
      const { result } = renderHook(() => useBypassAttempts({ childId: 'child-123' }))

      expect(result.current.error).toBeNull()
    })
  })

  describe('AC1: Fetch bypass attempts for child', () => {
    it('should accept childId parameter', () => {
      const { result } = renderHook(() => useBypassAttempts({ childId: 'child-123' }))

      expect(result.current).toBeDefined()
    })

    it('should return attempts array', () => {
      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: [createBypassAttempt()],
        })
      )

      expect(Array.isArray(result.current.attempts)).toBe(true)
    })

    it('should use initialData when provided', () => {
      const mockAttempts = [createBypassAttempt({ id: '1' }), createBypassAttempt({ id: '2' })]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.attempts).toHaveLength(2)
    })
  })

  describe('AC3: Filter expired attempts', () => {
    it('should filter out expired attempts from activeAttempts', () => {
      const mockAttempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10) }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5) }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.activeAttempts).toHaveLength(1)
      expect(result.current.activeAttempts[0].id).toBe('active')
    })

    it('should provide all attempts including expired', () => {
      const mockAttempts = [
        createBypassAttempt({ id: 'active', expiresAt: daysFromNow(10) }),
        createBypassAttempt({ id: 'expired', expiresAt: daysAgo(5) }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.attempts).toHaveLength(2)
    })

    it('should return expired count', () => {
      const mockAttempts = [
        createBypassAttempt({ expiresAt: daysFromNow(10) }),
        createBypassAttempt({ expiresAt: daysAgo(5) }),
        createBypassAttempt({ expiresAt: daysAgo(10) }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.expiredCount).toBe(2)
    })
  })

  describe('AC6: Mark as accidental', () => {
    it('should provide markAsAccidental function', () => {
      const { result } = renderHook(() => useBypassAttempts({ childId: 'child-123' }))

      expect(typeof result.current.markAsAccidental).toBe('function')
    })

    it('should update attempt when marked as accidental', () => {
      const mockAttempts = [createBypassAttempt({ id: 'bypass-1', wasIntentional: null })]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      act(() => {
        result.current.markAsAccidental('bypass-1')
      })

      expect(result.current.attempts[0].wasIntentional).toBe(false)
    })

    it('should reduce impact when marked as accidental', () => {
      const mockAttempts = [
        createBypassAttempt({
          id: 'bypass-1',
          wasIntentional: null,
          impactOnScore: -20,
        }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      const originalImpact = result.current.attempts[0].impactOnScore

      act(() => {
        result.current.markAsAccidental('bypass-1')
      })

      expect(result.current.attempts[0].impactOnScore).toBeGreaterThan(originalImpact)
    })
  })

  describe('Calculated values', () => {
    it('should calculate total impact from active attempts', () => {
      const mockAttempts = [
        createBypassAttempt({ impactOnScore: -10, expiresAt: daysFromNow(10) }),
        createBypassAttempt({ impactOnScore: -20, expiresAt: daysFromNow(20) }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.totalImpact).toBe(-30)
    })

    it('should only count active attempts in total impact', () => {
      const mockAttempts = [
        createBypassAttempt({ impactOnScore: -10, expiresAt: daysFromNow(10) }),
        createBypassAttempt({ impactOnScore: -20, expiresAt: daysAgo(5) }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.totalImpact).toBe(-10)
    })

    it('should count active attempts', () => {
      const mockAttempts = [
        createBypassAttempt({ expiresAt: daysFromNow(10) }),
        createBypassAttempt({ expiresAt: daysFromNow(20) }),
        createBypassAttempt({ expiresAt: daysAgo(5) }),
      ]

      const { result } = renderHook(() =>
        useBypassAttempts({
          childId: 'child-123',
          initialData: mockAttempts,
        })
      )

      expect(result.current.activeCount).toBe(2)
    })
  })

  describe('Refresh functionality', () => {
    it('should provide refresh function', () => {
      const { result } = renderHook(() => useBypassAttempts({ childId: 'child-123' }))

      expect(typeof result.current.refresh).toBe('function')
    })
  })
})
