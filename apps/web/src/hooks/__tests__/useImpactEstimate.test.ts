/**
 * Tests for useImpactEstimate Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 4.7
 *
 * Tests for the impact calculation hook.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useImpactEstimate } from '../useImpactEstimate'
import type { SessionTerm } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createMockTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  type: 'screen_time',
  content: { dailyLimit: 120 }, // dailyLimit is used by calculateScreenTimeImpact
  status: 'accepted',
  addedBy: 'parent',
  createdAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

// ============================================
// BASIC HOOK TESTS
// ============================================

describe('useImpactEstimate', () => {
  describe('basic functionality', () => {
    it('returns impact estimate object', () => {
      const { result } = renderHook(() => useImpactEstimate([]))
      expect(result.current.impact).toBeDefined()
    })

    it('returns hasImpact flag', () => {
      const { result } = renderHook(() => useImpactEstimate([]))
      expect(typeof result.current.hasImpact).toBe('boolean')
    })

    it('returns summary array', () => {
      const { result } = renderHook(() => useImpactEstimate([]))
      expect(Array.isArray(result.current.summary)).toBe(true)
    })

    it('returns individual impact flags', () => {
      const { result } = renderHook(() => useImpactEstimate([]))
      expect(typeof result.current.hasScreenTimeImpact).toBe('boolean')
      expect(typeof result.current.hasBedtimeImpact).toBe('boolean')
      expect(typeof result.current.hasMonitoringImpact).toBe('boolean')
    })
  })

  // ============================================
  // EMPTY TERMS TESTS
  // ============================================

  describe('empty terms', () => {
    it('handles empty terms array', () => {
      const { result } = renderHook(() => useImpactEstimate([]))
      expect(result.current.hasImpact).toBe(false)
      expect(result.current.summary).toHaveLength(0)
    })

    it('returns false for all impact flags with no terms', () => {
      const { result } = renderHook(() => useImpactEstimate([]))
      expect(result.current.hasScreenTimeImpact).toBe(false)
      expect(result.current.hasBedtimeImpact).toBe(false)
      expect(result.current.hasMonitoringImpact).toBe(false)
    })
  })

  // ============================================
  // SCREEN TIME IMPACT TESTS
  // ============================================

  describe('screen time impact', () => {
    it('calculates screen time impact from accepted terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 120 },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasScreenTimeImpact).toBe(true)
      expect(result.current.impact.screenTime).toBeDefined()
      expect(result.current.impact.screenTime?.daily).toBe(120)
    })

    it('ignores non-accepted screen time terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 120 },
          status: 'discussion',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasScreenTimeImpact).toBe(false)
    })

    it('sums multiple screen time terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 60 },
          status: 'accepted',
        }),
        createMockTerm({
          id: 't2',
          type: 'screen_time',
          content: { dailyLimit: 60 },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.impact.screenTime?.daily).toBe(120)
      expect(result.current.impact.screenTime?.weekly).toBe(840)
    })

    it('includes screen time in summary', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 120 },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.summary.length).toBeGreaterThan(0)
      expect(result.current.summary.some((s) => s.includes('hour') || s.includes('minute'))).toBe(
        true
      )
    })
  })

  // ============================================
  // BEDTIME IMPACT TESTS
  // ============================================

  describe('bedtime impact', () => {
    it('calculates bedtime impact from accepted terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'bedtime',
          content: { time: '21:00' },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasBedtimeImpact).toBe(true)
      expect(result.current.impact.bedtime).toBeDefined()
    })

    it('ignores non-accepted bedtime terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'bedtime',
          content: { time: '21:00' },
          status: 'removed',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasBedtimeImpact).toBe(false)
    })
  })

  // ============================================
  // MONITORING IMPACT TESTS
  // ============================================

  describe('monitoring impact', () => {
    it('calculates monitoring impact from accepted terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'monitoring',
          content: { level: 'moderate' },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasMonitoringImpact).toBe(true)
      expect(result.current.impact.monitoring).toBeDefined()
    })

    it('ignores non-accepted monitoring terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'monitoring',
          content: { level: 'moderate' },
          status: 'discussion',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasMonitoringImpact).toBe(false)
    })
  })

  // ============================================
  // COMBINED IMPACT TESTS
  // ============================================

  describe('combined impacts', () => {
    it('calculates all impact types together', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 120 },
          status: 'accepted',
        }),
        createMockTerm({
          id: 't2',
          type: 'bedtime',
          content: { time: '21:00' },
          status: 'accepted',
        }),
        createMockTerm({
          id: 't3',
          type: 'monitoring',
          content: { level: 'moderate' },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasImpact).toBe(true)
      expect(result.current.hasScreenTimeImpact).toBe(true)
      expect(result.current.hasBedtimeImpact).toBe(true)
      expect(result.current.hasMonitoringImpact).toBe(true)
    })

    it('generates summary with multiple items', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 120 },
          status: 'accepted',
        }),
        createMockTerm({
          id: 't2',
          type: 'bedtime',
          content: { time: '21:00' },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.summary.length).toBeGreaterThanOrEqual(2)
    })

    it('ignores non-impact term types', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'rule',
          content: { text: 'No phones at dinner' },
          status: 'accepted',
        }),
        createMockTerm({
          id: 't2',
          type: 'reward',
          content: { text: 'Extra screen time for good behavior' },
          status: 'accepted',
        }),
      ]
      const { result } = renderHook(() => useImpactEstimate(terms))

      expect(result.current.hasImpact).toBe(false)
    })
  })

  // ============================================
  // MEMOIZATION TESTS
  // ============================================

  describe('memoization', () => {
    it('returns same object reference for same terms', () => {
      const terms = [
        createMockTerm({
          id: 't1',
          type: 'screen_time',
          content: { dailyLimit: 120 },
          status: 'accepted',
        }),
      ]
      const { result, rerender } = renderHook(() => useImpactEstimate(terms))

      const firstImpact = result.current.impact
      rerender()
      const secondImpact = result.current.impact

      expect(firstImpact).toBe(secondImpact)
    })
  })
})
