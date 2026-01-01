/**
 * useHomeworkException Hook Tests - Story 32.5 AC4
 *
 * Tests for homework exception request and approval functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useHomeworkException,
  useHomeworkApprovals,
  DEFAULT_HOMEWORK_DURATION_MS,
  MAX_HOMEWORK_DURATION_MS,
  MIN_HOMEWORK_DURATION_MS,
} from './useHomeworkException'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ _serverTimestamp: true }))

vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    private _ms: number
    constructor(ms: number) {
      this._ms = ms
    }
    toMillis() {
      return this._ms
    }
    static fromMillis(ms: number) {
      return new MockTimestamp(ms)
    }
  }

  return {
    collection: (...args: unknown[]) => mockCollection(...args),
    query: (...args: unknown[]) => mockQuery(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    orderBy: (...args: unknown[]) => mockOrderBy(...args),
    limit: (...args: unknown[]) => mockLimit(...args),
    onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
    addDoc: (...args: unknown[]) => mockAddDoc(...args),
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    doc: (...args: unknown[]) => mockDoc(...args),
    serverTimestamp: () => mockServerTimestamp(),
    Timestamp: MockTimestamp,
  }
})

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useHomeworkException - Story 32.5 AC4', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    unsubscribeMock = vi.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribeMock)
    mockQuery.mockReturnValue('query-ref')
    mockWhere.mockReturnValue('where-ref')
    mockOrderBy.mockReturnValue('order-ref')
    mockLimit.mockReturnValue('limit-ref')
    mockCollection.mockReturnValue('collection-ref')
    mockDoc.mockReturnValue('doc-ref')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constants', () => {
    it('has correct default duration (1 hour)', () => {
      expect(DEFAULT_HOMEWORK_DURATION_MS).toBe(60 * 60 * 1000)
    })

    it('has correct max duration (2 hours)', () => {
      expect(MAX_HOMEWORK_DURATION_MS).toBe(2 * 60 * 60 * 1000)
    })

    it('has correct min duration (15 minutes)', () => {
      expect(MIN_HOMEWORK_DURATION_MS).toBe(15 * 60 * 1000)
    })
  })

  describe('initialization', () => {
    it('returns null when familyId is null', () => {
      const { result } = renderHook(() =>
        useHomeworkException({ familyId: null, childId: 'child-1' })
      )

      expect(result.current.pendingRequest).toBeNull()
      expect(result.current.activeException).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('returns null when childId is null', () => {
      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: null })
      )

      expect(result.current.pendingRequest).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('returns null when disabled', () => {
      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1', enabled: false })
      )

      expect(result.current.pendingRequest).toBeNull()
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('subscribes when familyId and childId provided', () => {
      renderHook(() => useHomeworkException({ familyId: 'family-1', childId: 'child-1' }))

      expect(mockCollection).toHaveBeenCalled()
      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'homework')
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      unmount()
      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('pending request detection', () => {
    it('detects pending homework request', async () => {
      const mockRequest = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        requestedByName: 'Emma',
        requestedDuration: 3600000,
        status: 'pending',
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            empty: false,
            docs: [{ id: 'req-1', data: () => mockRequest }],
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.pendingRequest).not.toBeNull()
      })

      expect(result.current.pendingRequest?.id).toBe('req-1')
      expect(result.current.pendingRequest?.status).toBe('pending')
      expect(result.current.canRequest).toBe(false)
    })
  })

  describe('active exception detection', () => {
    it('detects active homework exception', async () => {
      const mockException = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        requestedByName: 'Emma',
        approvedBy: 'parent-1',
        startTime: Date.now(),
        endTime: Date.now() + 3600000,
        status: 'active',
        createdAt: Date.now(),
        whitelistedCategories: ['education'],
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            empty: false,
            docs: [{ id: 'exc-1', data: () => mockException }],
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.activeException).not.toBeNull()
      })

      expect(result.current.activeException?.id).toBe('exc-1')
      expect(result.current.activeException?.type).toBe('homework')
      expect(result.current.canRequest).toBe(false)
    })

    it('calculates time remaining correctly', async () => {
      const endTime = Date.now() + 30 * 60 * 1000 // 30 minutes from now

      const mockException = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        startTime: Date.now(),
        endTime,
        status: 'active',
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            empty: false,
            docs: [{ id: 'exc-1', data: () => mockException }],
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.timeRemainingMinutes).not.toBeNull()
      })

      // Should be approximately 30 minutes (allow for test execution time)
      expect(result.current.timeRemainingMinutes).toBeGreaterThanOrEqual(29)
      expect(result.current.timeRemainingMinutes).toBeLessThanOrEqual(31)
    })
  })

  describe('requestHomeworkTime', () => {
    it('creates homework request with default duration', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-req-id' })
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      let requestId: string | undefined
      await act(async () => {
        requestId = await result.current.requestHomeworkTime('Emma')
      })

      expect(requestId).toBe('new-req-id')
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-1',
          type: 'homework',
          requestedBy: 'child-1',
          requestedByName: 'Emma',
          requestedDuration: 60 * 60 * 1000, // 1 hour default
          status: 'pending',
          whitelistedCategories: ['education', 'reference'],
        })
      )
    })

    it('creates homework request with custom duration', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-req-id' })
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await act(async () => {
        await result.current.requestHomeworkTime('Emma', 30) // 30 minutes
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          requestedDuration: 30 * 60 * 1000, // 30 minutes in ms
        })
      )
    })

    it('rejects duration below minimum', async () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await expect(result.current.requestHomeworkTime('Emma', 10)).rejects.toThrow(
        'Duration must be between 15 and 120 minutes'
      )
    })

    it('rejects duration above maximum', async () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await expect(result.current.requestHomeworkTime('Emma', 180)).rejects.toThrow(
        'Duration must be between 15 and 120 minutes'
      )
    })

    it('throws error when no familyId', async () => {
      const { result } = renderHook(() =>
        useHomeworkException({ familyId: null, childId: 'child-1' })
      )

      await expect(result.current.requestHomeworkTime('Emma')).rejects.toThrow(
        'No family or child ID'
      )
    })
  })

  describe('cancelRequest', () => {
    it('cancels pending request', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)

      const mockRequest = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        status: 'pending',
        requestedDuration: 3600000,
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            empty: false,
            docs: [{ id: 'req-1', data: () => mockRequest }],
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.pendingRequest).not.toBeNull()
      })

      await act(async () => {
        await result.current.cancelRequest()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'cancelled',
        })
      )
    })

    it('throws error when no pending request', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({ empty: true, docs: [] })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await expect(result.current.cancelRequest()).rejects.toThrow('No pending request')
    })
  })

  describe('canRequest', () => {
    it('returns true when no pending request or active exception', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({ empty: true, docs: [] })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.canRequest).toBe(true)
    })

    it('returns false when pending request exists', async () => {
      const mockRequest = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        status: 'pending',
        requestedDuration: 3600000,
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            empty: false,
            docs: [{ id: 'req-1', data: () => mockRequest }],
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useHomeworkException({ familyId: 'family-1', childId: 'child-1' })
      )

      await waitFor(() => {
        expect(result.current.canRequest).toBe(false)
      })
    })
  })
})

describe('useHomeworkApprovals - Story 32.5 AC4', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    unsubscribeMock = vi.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribeMock)
    mockQuery.mockReturnValue('query-ref')
    mockWhere.mockReturnValue('where-ref')
    mockOrderBy.mockReturnValue('order-ref')
    mockCollection.mockReturnValue('collection-ref')
    mockDoc.mockReturnValue('doc-ref')
  })

  describe('initialization', () => {
    it('returns empty when familyId is null', () => {
      const { result } = renderHook(() => useHomeworkApprovals({ familyId: null }))

      expect(result.current.pendingRequests).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('subscribes to pending requests when familyId provided', () => {
      renderHook(() => useHomeworkApprovals({ familyId: 'family-1' }))

      expect(mockWhere).toHaveBeenCalledWith('type', '==', 'homework')
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'pending')
      expect(mockOnSnapshot).toHaveBeenCalled()
    })
  })

  describe('pending requests', () => {
    it('loads pending homework requests', async () => {
      const mockRequest = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        requestedByName: 'Emma',
        requestedDuration: 3600000,
        status: 'pending',
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: (cb: (doc: { id: string; data: () => typeof mockRequest }) => void) => {
              cb({ id: 'req-1', data: () => mockRequest })
            },
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useHomeworkApprovals({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.pendingRequests).toHaveLength(1)
      })

      expect(result.current.pendingRequests[0].id).toBe('req-1')
      expect(result.current.pendingRequests[0].requestedByName).toBe('Emma')
    })
  })

  describe('approveRequest', () => {
    it('approves with requested duration', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)

      const mockRequest = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        requestedByName: 'Emma',
        requestedDuration: 3600000,
        status: 'pending',
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: (cb: (doc: { id: string; data: () => typeof mockRequest }) => void) => {
              cb({ id: 'req-1', data: () => mockRequest })
            },
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useHomeworkApprovals({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.pendingRequests).toHaveLength(1)
      })

      await act(async () => {
        await result.current.approveRequest('req-1', 'parent-1')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'active',
          approvedBy: 'parent-1',
          startTime: expect.any(Number),
          endTime: expect.any(Number),
        })
      )
    })

    it('approves with custom duration', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)

      const mockRequest = {
        familyId: 'family-1',
        type: 'homework',
        requestedBy: 'child-1',
        requestedDuration: 3600000, // 60 minutes requested
        status: 'pending',
        createdAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: (cb: (doc: { id: string; data: () => typeof mockRequest }) => void) => {
              cb({ id: 'req-1', data: () => mockRequest })
            },
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useHomeworkApprovals({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.pendingRequests).toHaveLength(1)
      })

      await act(async () => {
        await result.current.approveRequest('req-1', 'parent-1', 30) // 30 minutes
      })

      const callArgs = mockUpdateDoc.mock.calls[0][1]
      const duration = callArgs.endTime - callArgs.startTime

      // Duration should be approximately 30 minutes (allow small variance)
      expect(duration).toBeGreaterThanOrEqual(30 * 60 * 1000 - 1000)
      expect(duration).toBeLessThanOrEqual(30 * 60 * 1000 + 1000)
    })
  })

  describe('denyRequest', () => {
    it('denies request without reason', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useHomeworkApprovals({ familyId: 'family-1' }))

      await act(async () => {
        await result.current.denyRequest('req-1', 'parent-1')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'denied',
          approvedBy: 'parent-1',
          denialReason: undefined,
        })
      )
    })

    it('denies request with reason', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useHomeworkApprovals({ familyId: 'family-1' }))

      await act(async () => {
        await result.current.denyRequest('req-1', 'parent-1', 'Dinner time')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'denied',
          denialReason: 'Dinner time',
        })
      )
    })
  })
})
