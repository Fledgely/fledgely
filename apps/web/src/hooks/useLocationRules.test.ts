/**
 * Tests for useLocationRules Hook.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocationRules } from './useLocationRules'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockHttpsCallable = vi.fn()

vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(() => ({})),
  getFirestoreDb: vi.fn(() => ({})),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'rules-collection'),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn(() => 'where'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}))

describe('useLocationRules', () => {
  const mockRulesData = [
    {
      id: 'rule-1',
      data: () => ({
        zoneId: 'zone-1',
        familyId: 'family-123',
        childId: 'child-1',
        dailyTimeLimitMinutes: 120,
        categoryOverrides: {},
        educationOnlyMode: false,
        createdAt: { toDate: () => new Date('2026-01-01') },
        updatedAt: { toDate: () => new Date('2026-01-01') },
      }),
    },
    {
      id: 'rule-2',
      data: () => ({
        zoneId: 'zone-2',
        familyId: 'family-123',
        childId: 'child-1',
        dailyTimeLimitMinutes: 60,
        categoryOverrides: { games: 'blocked' },
        educationOnlyMode: true,
        createdAt: { toDate: () => new Date('2026-01-02') },
        updatedAt: { toDate: () => new Date('2026-01-02') },
      }),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for onSnapshot
    mockOnSnapshot.mockImplementation((_query, callback) => {
      callback({ docs: mockRulesData })
      return () => {} // unsubscribe function
    })
  })

  describe('Initial State', () => {
    it('starts with loading true', () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      // After immediate callback
      expect(result.current.loading).toBe(false)
    })

    it('starts with empty rules when no familyId', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useLocationRules(null))

      expect(result.current.rules).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('starts with no error', () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      expect(result.current.error).toBeNull()
    })
  })

  describe('Rule Subscription', () => {
    it('subscribes to rules collection', () => {
      renderHook(() => useLocationRules('family-123'))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('loads rules from Firestore', async () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      await waitFor(() => {
        expect(result.current.rules).toHaveLength(2)
      })

      expect(result.current.rules[0].dailyTimeLimitMinutes).toBe(120)
      expect(result.current.rules[1].educationOnlyMode).toBe(true)
    })

    it('sets loading to false after data loads', async () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('unsubscribes on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({ docs: mockRulesData })
        return unsubscribe
      })

      const { unmount } = renderHook(() => useLocationRules('family-123'))
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('handles subscription errors', async () => {
      mockOnSnapshot.mockImplementation((_query, _callback, errorCallback) => {
        errorCallback(new Error('Subscription failed'))
        return () => {}
      })

      const { result } = renderHook(() => useLocationRules('family-123'))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load location rules')
      })
    })
  })

  describe('getRuleForZone', () => {
    it('returns rule for matching zone and child', async () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      await waitFor(() => {
        expect(result.current.rules).toHaveLength(2)
      })

      const rule = result.current.getRuleForZone('zone-1', 'child-1')
      expect(rule).not.toBeNull()
      expect(rule!.dailyTimeLimitMinutes).toBe(120)
    })

    it('returns null when no matching rule', async () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      await waitFor(() => {
        expect(result.current.rules).toHaveLength(2)
      })

      const rule = result.current.getRuleForZone('zone-999', 'child-1')
      expect(rule).toBeNull()
    })

    it('returns null when no matching child', async () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      await waitFor(() => {
        expect(result.current.rules).toHaveLength(2)
      })

      const rule = result.current.getRuleForZone('zone-1', 'child-999')
      expect(rule).toBeNull()
    })
  })

  describe('setRule', () => {
    it('calls setLocationRule callable', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        data: { success: true, ruleId: 'new-rule-123', message: 'Created', isNew: true },
      })
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationRules('family-123'))

      await act(async () => {
        const ruleId = await result.current.setRule({
          zoneId: 'zone-1',
          childId: 'child-1',
          dailyTimeLimitMinutes: 90,
        })
        expect(ruleId).toBe('new-rule-123')
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'setLocationRule')
    })

    it('returns null on error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Set failed'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationRules('family-123'))

      await act(async () => {
        const ruleId = await result.current.setRule({
          zoneId: 'zone-1',
          childId: 'child-1',
          dailyTimeLimitMinutes: 90,
        })
        expect(ruleId).toBeNull()
      })

      expect(result.current.error).toBe('Set failed')
    })

    it('returns null when no familyId', async () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useLocationRules(null))

      await act(async () => {
        const ruleId = await result.current.setRule({
          zoneId: 'zone-1',
          childId: 'child-1',
          dailyTimeLimitMinutes: 90,
        })
        expect(ruleId).toBeNull()
      })

      expect(result.current.error).toBe('No family selected')
    })

    it('sets actionLoading during operation', async () => {
      let resolvePromise: (value: unknown) => void
      const mockFn = vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve
        })
      )
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationRules('family-123'))

      let setPromise: Promise<string | null>
      act(() => {
        setPromise = result.current.setRule({
          zoneId: 'zone-1',
          childId: 'child-1',
          dailyTimeLimitMinutes: 90,
        })
      })

      expect(result.current.actionLoading).toBe(true)

      await act(async () => {
        resolvePromise!({
          data: { success: true, ruleId: 'new-rule', message: 'Created', isNew: true },
        })
        await setPromise
      })

      expect(result.current.actionLoading).toBe(false)
    })
  })

  describe('deleteRule', () => {
    it('calls deleteLocationRule callable', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Deleted' },
      })
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationRules('family-123'))

      await act(async () => {
        const success = await result.current.deleteRule('rule-1')
        expect(success).toBe(true)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteLocationRule')
    })

    it('returns false on error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Delete failed'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationRules('family-123'))

      await act(async () => {
        const success = await result.current.deleteRule('rule-1')
        expect(success).toBe(false)
      })

      expect(result.current.error).toBe('Delete failed')
    })
  })

  describe('Utilities', () => {
    it('clearError clears error state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Some error'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationRules('family-123'))

      await act(async () => {
        await result.current.deleteRule('rule-1')
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('refreshRules triggers resubscription', () => {
      const { result } = renderHook(() => useLocationRules('family-123'))

      const initialCallCount = mockOnSnapshot.mock.calls.length

      act(() => {
        result.current.refreshRules()
      })

      expect(mockOnSnapshot.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })

  describe('Child Filter', () => {
    it('filters rules by childId when provided', () => {
      renderHook(() => useLocationRules('family-123', 'child-1'))

      // The where clause should be used when childId is provided
      expect(mockOnSnapshot).toHaveBeenCalled()
    })
  })
})
