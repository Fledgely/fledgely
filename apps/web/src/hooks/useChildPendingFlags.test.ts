/**
 * useChildPendingFlags Hook Tests - Story 23.1
 *
 * Tests for the child pending flags hook.
 * Verifies subscription to notified flags and timer updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChildPendingFlags, type PendingFlagWithTimer } from './useChildPendingFlags'
import type { FlagDocument } from '@fledgely/shared'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

// Track snapshot callbacks for testing
let snapshotCallback: ((snapshot: { docs: { data: () => FlagDocument }[] }) => void) | null = null
let snapshotErrorCallback: ((error: Error) => void) | null = null
const mockUnsubscribe = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((_query, onNext, onError) => {
    snapshotCallback = onNext
    snapshotErrorCallback = onError
    return mockUnsubscribe
  }),
}))

// Mock the notification service
vi.mock('../services/childFlagNotificationService', () => ({
  getRemainingTime: vi.fn((deadline: number) => Math.max(0, deadline - Date.now())),
  formatRemainingTime: vi.fn((ms: number) => {
    if (ms <= 0) return 'Time expired'
    const minutes = Math.ceil(ms / 60000)
    return `${minutes} minutes to add your explanation`
  }),
  isWaitingForAnnotation: vi.fn((flag: FlagDocument) => {
    return (
      flag.childNotificationStatus === 'notified' &&
      !!flag.annotationDeadline &&
      flag.annotationDeadline > Date.now()
    )
  }),
}))

const createMockFlag = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
  id: 'flag-123',
  childId: 'child-456',
  familyId: 'family-789',
  screenshotRef: 'children/child-456/screenshots/ss-123',
  screenshotId: 'ss-123',
  category: 'Violence',
  severity: 'medium',
  confidence: 75,
  reasoning: 'Test reasoning',
  status: 'pending',
  createdAt: Date.now(),
  throttled: false,
  childNotificationStatus: 'notified',
  childNotifiedAt: Date.now(),
  annotationDeadline: Date.now() + 25 * 60 * 1000, // 25 minutes from now
  ...overrides,
})

describe('useChildPendingFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    snapshotCallback = null
    snapshotErrorCallback = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should start in loading state', () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      expect(result.current.loading).toBe(true)
      expect(result.current.pendingFlags).toEqual([])
      expect(result.current.error).toBe(null)
    })

    it('should return empty array when no childId provided', () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: '' }))

      // Synchronously updates when no childId
      expect(result.current.loading).toBe(false)
      expect(result.current.pendingFlags).toEqual([])
      expect(result.current.pendingCount).toBe(0)
    })
  })

  describe('flag subscription', () => {
    it('should subscribe to flags for the child', async () => {
      renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      // Verify onSnapshot was called
      const { onSnapshot } = await import('firebase/firestore')
      expect(onSnapshot).toHaveBeenCalled()
    })

    it('should unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should return pending flags from snapshot', async () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      const mockFlag = createMockFlag()

      // Mock isWaitingForAnnotation to return true
      const { isWaitingForAnnotation } = await import('../services/childFlagNotificationService')
      vi.mocked(isWaitingForAnnotation).mockReturnValue(true)

      // Simulate snapshot
      act(() => {
        if (snapshotCallback) {
          snapshotCallback({
            docs: [{ data: () => mockFlag }],
          })
        }
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.pendingFlags.length).toBe(1)
      expect(result.current.pendingFlags[0].id).toBe('flag-123')
    })

    it('should filter out flags with expired deadlines', async () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      const activeFlag = createMockFlag({
        id: 'active-flag',
        annotationDeadline: Date.now() + 15 * 60 * 1000, // 15 mins future
      })

      const expiredFlag = createMockFlag({
        id: 'expired-flag',
        annotationDeadline: Date.now() - 5 * 60 * 1000, // 5 mins ago
      })

      // Mock to filter properly
      const { isWaitingForAnnotation } = await import('../services/childFlagNotificationService')
      vi.mocked(isWaitingForAnnotation)
        .mockReturnValueOnce(true) // active flag passes isWaitingForAnnotation
        .mockReturnValueOnce(false) // expired flag fails isWaitingForAnnotation

      act(() => {
        if (snapshotCallback) {
          snapshotCallback({
            docs: [{ data: () => activeFlag }, { data: () => expiredFlag }],
          })
        }
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.pendingFlags.length).toBe(1)
      expect(result.current.pendingFlags[0].id).toBe('active-flag')
    })
  })

  describe('timer information', () => {
    it('should include remaining time info in flags', async () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      const deadline = Date.now() + 20 * 60 * 1000 // 20 minutes
      const mockFlag = createMockFlag({
        annotationDeadline: deadline,
      })

      const { isWaitingForAnnotation, getRemainingTime } =
        await import('../services/childFlagNotificationService')
      vi.mocked(isWaitingForAnnotation).mockReturnValue(true)
      vi.mocked(getRemainingTime).mockReturnValue(20 * 60 * 1000)

      act(() => {
        if (snapshotCallback) {
          snapshotCallback({
            docs: [{ data: () => mockFlag }],
          })
        }
      })

      expect(result.current.loading).toBe(false)

      const flag = result.current.pendingFlags[0] as PendingFlagWithTimer
      expect(flag.remainingMs).toBeGreaterThan(0)
      expect(flag.remainingTimeText).toContain('minutes')
      expect(flag.isExpired).toBe(false)
    })

    it('should sort flags by time remaining (most urgent first)', async () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      const now = Date.now()
      const urgentFlag = createMockFlag({
        id: 'urgent-flag',
        annotationDeadline: now + 5 * 60 * 1000, // 5 minutes
      })

      const laterFlag = createMockFlag({
        id: 'later-flag',
        annotationDeadline: now + 25 * 60 * 1000, // 25 minutes
      })

      const { isWaitingForAnnotation, getRemainingTime } =
        await import('../services/childFlagNotificationService')
      vi.mocked(isWaitingForAnnotation).mockReturnValue(true)
      // Mock getRemainingTime to return correct values based on deadline
      vi.mocked(getRemainingTime).mockImplementation((deadline: number) => {
        return Math.max(0, deadline - now)
      })

      act(() => {
        if (snapshotCallback) {
          snapshotCallback({
            docs: [{ data: () => laterFlag }, { data: () => urgentFlag }],
          })
        }
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.pendingFlags.length).toBe(2)
      expect(result.current.pendingFlags[0].id).toBe('urgent-flag')
      expect(result.current.pendingFlags[1].id).toBe('later-flag')
    })
  })

  describe('pending count', () => {
    it('should return correct pending count', async () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      const flags = [
        createMockFlag({ id: 'flag-1' }),
        createMockFlag({ id: 'flag-2' }),
        createMockFlag({ id: 'flag-3' }),
      ]

      const { isWaitingForAnnotation, getRemainingTime } =
        await import('../services/childFlagNotificationService')
      vi.mocked(isWaitingForAnnotation).mockReturnValue(true)
      vi.mocked(getRemainingTime).mockReturnValue(25 * 60 * 1000)

      act(() => {
        if (snapshotCallback) {
          snapshotCallback({
            docs: flags.map((f) => ({ data: () => f })),
          })
        }
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.pendingCount).toBe(3)
    })
  })

  describe('error handling', () => {
    it('should handle subscription errors', async () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      const testError = new Error('Subscription failed')

      act(() => {
        if (snapshotErrorCallback) {
          snapshotErrorCallback(testError)
        }
      })

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(testError)
      expect(result.current.pendingFlags).toEqual([])
    })
  })

  describe('refresh', () => {
    it('should have a refresh function', () => {
      const { result } = renderHook(() => useChildPendingFlags({ childId: 'child-456' }))

      expect(typeof result.current.refresh).toBe('function')
    })
  })
})
