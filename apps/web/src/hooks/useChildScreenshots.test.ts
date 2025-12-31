/**
 * useChildScreenshots Hook Tests - Story 19B.1
 *
 * Task 2.6: Create unit tests for screenshot fetching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChildScreenshots } from './useChildScreenshots'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
  getFirebaseApp: vi.fn(() => ({})),
}))

// Mock Firestore
const mockOnSnapshot = vi.fn()
const mockGetDocs = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  Timestamp: {
    fromMillis: (ms: number) => ({
      toMillis: () => ms,
    }),
  },
}))

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  getDownloadURL: vi.fn().mockResolvedValue('https://storage.example.com/screenshot.png'),
}))

describe('useChildScreenshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should start with loading true when enabled', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() =>
        useChildScreenshots({ childId: 'child-123', enabled: true })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.screenshots).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should not load when childId is null', () => {
      const { result } = renderHook(() => useChildScreenshots({ childId: null, enabled: true }))

      expect(result.current.loading).toBe(false)
      expect(result.current.screenshots).toEqual([])
      expect(result.current.hasMore).toBe(false)
    })

    it('should not load when disabled', () => {
      const { result } = renderHook(() =>
        useChildScreenshots({ childId: 'child-123', enabled: false })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.screenshots).toEqual([])
    })
  })

  describe('data fetching', () => {
    it('should call onSnapshot when fetching screenshots', async () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      renderHook(() => useChildScreenshots({ childId: 'child-123', enabled: true }))

      // Verify onSnapshot was called
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('should filter screenshots to last 7 days (AC2)', async () => {
      // Import the where mock to verify it was called with correct timestamp
      const { where } = await import('firebase/firestore')
      mockOnSnapshot.mockImplementation(() => () => {})

      renderHook(() => useChildScreenshots({ childId: 'child-123', enabled: true }))

      // Verify where was called with timestamp filter
      expect(where).toHaveBeenCalled()
      const whereCall = vi.mocked(where).mock.calls[0]
      expect(whereCall[0]).toBe('timestamp')
      expect(whereCall[1]).toBe('>=')
      // The third argument should be approximately 7 days ago
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
      const timestampArg = whereCall[2] as number
      expect(Date.now() - timestampArg).toBeCloseTo(sevenDaysMs, -4) // within ~10 seconds
    })

    it('should set loading to false after snapshot arrives', async () => {
      const mockSnapshot = {
        docs: [], // Empty result
      }

      mockOnSnapshot.mockImplementation((_q, onNext) => {
        setTimeout(() => onNext(mockSnapshot), 0)
        return () => {}
      })

      const { result } = renderHook(() =>
        useChildScreenshots({ childId: 'child-123', enabled: true })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.screenshots).toEqual([])
    })

    it('should handle error when fetching fails', async () => {
      mockOnSnapshot.mockImplementation((_q, _onNext, onError) => {
        setTimeout(() => onError(new Error('Network error')), 0)
        return () => {}
      })

      const { result } = renderHook(() =>
        useChildScreenshots({ childId: 'child-123', enabled: true })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load your pictures')
      expect(result.current.screenshots).toEqual([])
    })
  })

  describe('pagination', () => {
    it('should set hasMore based on page size', async () => {
      // Less than page size means no more
      const mockSnapshot = {
        docs: [
          {
            id: 'ss-1',
            data: () => ({
              timestamp: Date.now(),
              url: 'https://example.com',
              title: 'Test',
              deviceId: 'device-1',
              storagePath: 'screenshots/ss-1.png',
            }),
          },
        ],
      }

      mockOnSnapshot.mockImplementation((_q, onNext) => {
        setTimeout(() => onNext(mockSnapshot), 0)
        return () => {}
      })

      const { result } = renderHook(() =>
        useChildScreenshots({ childId: 'child-123', pageSize: 20 })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Only 1 result when page size is 20, so hasMore should be false
      expect(result.current.hasMore).toBe(false)
    })

    it('should provide loadMore function', async () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useChildScreenshots({ childId: 'child-123' }))

      expect(typeof result.current.loadMore).toBe('function')
    })

    it('should provide refresh function', async () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useChildScreenshots({ childId: 'child-123' }))

      expect(typeof result.current.refresh).toBe('function')
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation(() => unsubscribe)

      const { unmount } = renderHook(() => useChildScreenshots({ childId: 'child-123' }))

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should unsubscribe when childId changes', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation(() => unsubscribe)

      const { rerender } = renderHook(
        ({ childId }: { childId: string }) => useChildScreenshots({ childId }),
        { initialProps: { childId: 'child-123' } }
      )

      rerender({ childId: 'child-456' })

      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
