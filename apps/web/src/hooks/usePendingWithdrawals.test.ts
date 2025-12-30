/**
 * Unit tests for usePendingWithdrawals hook - Story 6.6
 *
 * Tests cover:
 * - Initial loading state
 * - Fetching pending withdrawals
 * - Real-time updates
 * - Error handling
 * - Formatting utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePendingWithdrawals, formatTimeRemaining } from './usePendingWithdrawals'

// Mock Firebase config
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => ({}),
}))

// Mock Firestore
const mockUnsubscribe = vi.fn()
const mockOnSnapshot = vi.fn()

// Timestamp mock - use a simple object with toDate method
const createMockTimestamp = (date: Date) => ({
  toDate: () => date,
  _isTimestamp: true, // marker for instanceof check workaround
})

vi.mock('firebase/firestore', () => {
  // Define Timestamp class inside the factory
  const TimestampClass = class {
    _date: Date
    constructor(date: Date) {
      this._date = date
    }
    toDate() {
      return this._date
    }
    static fromDate(date: Date) {
      return new TimestampClass(date)
    }
    static now() {
      return new TimestampClass(new Date())
    }
  }

  return {
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
    Timestamp: TimestampClass,
  }
})

describe('usePendingWithdrawals hook - Story 6.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSnapshot.mockReturnValue(mockUnsubscribe)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('returns loading state initially', () => {
      mockOnSnapshot.mockImplementation((_query, _callback) => {
        // Don't call callback yet - simulate loading
        return mockUnsubscribe
      })

      const { result } = renderHook(() => usePendingWithdrawals('family-1'))

      expect(result.current.loading).toBe(true)
      expect(result.current.withdrawals).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns empty state when familyId is null', () => {
      const { result } = renderHook(() => usePendingWithdrawals(null))

      expect(result.current.loading).toBe(false)
      expect(result.current.withdrawals).toEqual([])
      expect(result.current.error).toBeNull()
    })
  })

  describe('fetching withdrawals', () => {
    it('returns empty array when no pending withdrawals', async () => {
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({
          forEach: vi.fn(),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() => usePendingWithdrawals('family-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.withdrawals).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns withdrawals when found', async () => {
      const now = Date.now()
      const expiresAt = now + 24 * 60 * 60 * 1000

      const mockDocs = [
        {
          id: 'withdrawal-1',
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            deviceId: 'device-1',
            status: 'pending',
            requestedAt: createMockTimestamp(new Date(now)),
            expiresAt: createMockTimestamp(new Date(expiresAt)),
          }),
        },
      ]

      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({
          forEach: (fn: (doc: (typeof mockDocs)[0]) => void) => mockDocs.forEach(fn),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() => usePendingWithdrawals('family-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.withdrawals).toHaveLength(1)
      expect(result.current.withdrawals[0].requestId).toBe('withdrawal-1')
      expect(result.current.withdrawals[0].childId).toBe('child-1')
      expect(result.current.withdrawals[0].status).toBe('pending')
    })
  })

  describe('error handling', () => {
    it('sets error on Firestore error', async () => {
      mockOnSnapshot.mockImplementation((_query, _callback, errorCallback) => {
        errorCallback(new Error('Connection failed'))
        return mockUnsubscribe
      })

      const { result } = renderHook(() => usePendingWithdrawals('family-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load pending withdrawals')
    })
  })

  describe('cleanup', () => {
    it('unsubscribes on unmount', () => {
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({ forEach: vi.fn() })
        return mockUnsubscribe
      })

      const { unmount } = renderHook(() => usePendingWithdrawals('family-1'))

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('unsubscribes when familyId changes', async () => {
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({ forEach: vi.fn() })
        return mockUnsubscribe
      })

      const { rerender } = renderHook(({ familyId }) => usePendingWithdrawals(familyId), {
        initialProps: { familyId: 'family-1' },
      })

      await waitFor(() => {
        expect(mockUnsubscribe).not.toHaveBeenCalled()
      })

      rerender({ familyId: 'family-2' })

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})

describe('formatTimeRemaining utility - Story 6.6 AC5', () => {
  it('returns "Processing..." when expired', () => {
    const expired = new Date(Date.now() - 1000)
    expect(formatTimeRemaining(expired)).toBe('Processing...')
  })

  it('formats hours and minutes when > 1 hour remaining', () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000) // 2h 30m
    const result = formatTimeRemaining(future)
    expect(result).toMatch(/^2h 30m remaining$/)
  })

  it('formats only minutes when < 1 hour remaining', () => {
    const future = new Date(Date.now() + 45 * 60 * 1000) // 45 minutes
    const result = formatTimeRemaining(future)
    expect(result).toMatch(/^45m remaining$/)
  })

  it('formats exactly 1 hour correctly (boundary case)', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000) // exactly 1 hour
    const result = formatTimeRemaining(future)
    expect(result).toMatch(/^1h 0m remaining$/)
  })

  it('formats 0m when very close to expiry', () => {
    const future = new Date(Date.now() + 30 * 1000) // 30 seconds
    const result = formatTimeRemaining(future)
    expect(result).toBe('0m remaining')
  })
})
