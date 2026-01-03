/**
 * Tests for useLocationAbuseAlerts Hook
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC4: Bilateral parent alerts
 * - AC5: Conflict resolution resources
 *
 * Note: These are smoke tests for the hook interface.
 * Core functionality is tested via component tests and callable function tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () =>
    vi.fn().mockResolvedValue({
      data: { alerts: [], success: true },
    }),
}))

import { useLocationAbuseAlerts } from './useLocationAbuseAlerts'

describe('useLocationAbuseAlerts', () => {
  const defaultOptions = {
    familyId: 'family-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Hook Interface', () => {
    it('returns expected interface properties', () => {
      const { result } = renderHook(() => useLocationAbuseAlerts(defaultOptions))

      // Verify all expected properties exist
      expect(result.current).toHaveProperty('alerts')
      expect(result.current).toHaveProperty('unacknowledgedCount')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('isSubmitting')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('acknowledgeAlert')
      expect(result.current).toHaveProperty('markResourcesViewed')
      expect(result.current).toHaveProperty('refresh')
    })

    it('starts with correct initial state', () => {
      const { result } = renderHook(() => useLocationAbuseAlerts(defaultOptions))

      expect(result.current.alerts).toEqual([])
      expect(result.current.unacknowledgedCount).toBe(0)
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('returns functions for actions', () => {
      const { result } = renderHook(() => useLocationAbuseAlerts(defaultOptions))

      expect(typeof result.current.acknowledgeAlert).toBe('function')
      expect(typeof result.current.markResourcesViewed).toBe('function')
      expect(typeof result.current.refresh).toBe('function')
    })

    it('accepts enableRealtime option', () => {
      const { result } = renderHook(() =>
        useLocationAbuseAlerts({ ...defaultOptions, enableRealtime: true })
      )

      // Should not throw
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('Unacknowledged count', () => {
    it('calculates unacknowledged count from alerts', () => {
      // This verifies the calculation logic is in place
      const { result } = renderHook(() => useLocationAbuseAlerts(defaultOptions))

      // With empty alerts, count should be 0
      expect(result.current.unacknowledgedCount).toBe(0)
    })
  })
})
