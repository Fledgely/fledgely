/**
 * Tests for useChildLocationStatus Hook.
 *
 * Story 40.5: Location Privacy Controls
 * - AC2: Current Location Status Display
 * - AC3: Location History Access
 * - AC6: Request Disable Feature
 *
 * Note: These are smoke tests for the hook interface.
 * Core functionality is tested via component tests and callable function tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => vi.fn().mockResolvedValue({ data: { status: {}, message: '' } }),
}))

import { useChildLocationStatus } from './useChildLocationStatus'

describe('useChildLocationStatus', () => {
  const defaultOptions = {
    familyId: 'family-123',
    childId: 'child-456',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Hook Interface', () => {
    it('returns expected interface properties', () => {
      const { result } = renderHook(() => useChildLocationStatus(defaultOptions))

      // Verify all expected properties exist
      expect(result.current).toHaveProperty('status')
      expect(result.current).toHaveProperty('statusMessage')
      expect(result.current).toHaveProperty('history')
      expect(result.current).toHaveProperty('historyTotalCount')
      expect(result.current).toHaveProperty('historyHasMore')
      expect(result.current).toHaveProperty('historyPage')
      expect(result.current).toHaveProperty('isStatusLoading')
      expect(result.current).toHaveProperty('isHistoryLoading')
      expect(result.current).toHaveProperty('isSubmitting')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('refreshStatus')
      expect(result.current).toHaveProperty('loadHistory')
      expect(result.current).toHaveProperty('requestDisable')
    })

    it('starts with correct initial state', () => {
      const { result } = renderHook(() => useChildLocationStatus(defaultOptions))

      expect(result.current.status).toBeNull()
      expect(result.current.statusMessage).toBeNull()
      expect(result.current.history).toEqual([])
      expect(result.current.historyTotalCount).toBe(0)
      expect(result.current.historyHasMore).toBe(false)
      expect(result.current.historyPage).toBe(1)
      expect(result.current.isStatusLoading).toBe(true)
      expect(result.current.isHistoryLoading).toBe(false)
      expect(result.current.isSubmitting).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('returns functions for actions', () => {
      const { result } = renderHook(() => useChildLocationStatus(defaultOptions))

      expect(typeof result.current.refreshStatus).toBe('function')
      expect(typeof result.current.loadHistory).toBe('function')
      expect(typeof result.current.requestDisable).toBe('function')
    })

    it('accepts enableRealtime option', () => {
      const { result } = renderHook(() =>
        useChildLocationStatus({ ...defaultOptions, enableRealtime: true })
      )

      // Should not throw
      expect(result.current.isStatusLoading).toBe(true)
    })
  })
})
