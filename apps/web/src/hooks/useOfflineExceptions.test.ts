/**
 * useOfflineExceptions Hook Tests - Story 32.5
 *
 * Tests for offline time exception management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useOfflineExceptions, useIsOfflineTimePaused } from './useOfflineExceptions'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockAddDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockOrderBy = vi.fn()
const mockServerTimestamp = vi.fn(() => ({ _serverTimestamp: true }))

vi.mock('firebase/firestore', () => {
  // Mock Timestamp class - defined inside factory to avoid hoisting issues
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
    where: vi.fn(),
    orderBy: (...args: unknown[]) => mockOrderBy(...args),
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

describe('useOfflineExceptions - Story 32.5', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    unsubscribeMock = vi.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribeMock)
    mockQuery.mockReturnValue('query-ref')
    mockOrderBy.mockReturnValue('order-ref')
    mockCollection.mockReturnValue('collection-ref')
    mockDoc.mockReturnValue('doc-ref')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('returns empty exceptions when familyId is null', () => {
      const { result } = renderHook(() => useOfflineExceptions({ familyId: null }))

      expect(result.current.exceptions).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('returns empty exceptions when disabled', () => {
      const { result } = renderHook(() =>
        useOfflineExceptions({ familyId: 'family-123', enabled: false })
      )

      expect(result.current.exceptions).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(mockOnSnapshot).not.toHaveBeenCalled()
    })

    it('subscribes to exceptions when familyId is provided', () => {
      renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      expect(mockCollection).toHaveBeenCalled()
      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      unmount()
      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('data fetching', () => {
    it('sets loading state during fetch', () => {
      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      // Initial state should be loading
      expect(result.current.loading).toBe(true)
    })

    it('processes snapshot data correctly', async () => {
      const mockException = {
        id: 'exc-1',
        familyId: 'family-123',
        type: 'pause',
        requestedBy: 'parent-1',
        requestedByName: 'Mom',
        startTime: 1704067200000,
        endTime: null,
        status: 'active',
        createdAt: { toMillis: () => 1704067200000 },
        updatedAt: { toMillis: () => 1704067200000 },
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: (
              callback: (doc: { id: string; data: () => typeof mockException }) => void
            ) => {
              callback({
                id: 'exc-1',
                data: () => mockException,
              })
            },
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      await waitFor(() => {
        expect(result.current.exceptions).toHaveLength(1)
      })

      expect(result.current.exceptions[0].id).toBe('exc-1')
      expect(result.current.exceptions[0].type).toBe('pause')
      expect(result.current.loading).toBe(false)
    })

    it('handles snapshot errors', async () => {
      mockOnSnapshot.mockImplementation((_, __, onError) => {
        setTimeout(() => {
          onError(new Error('Permission denied'))
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load exceptions')
      })

      expect(result.current.loading).toBe(false)
    })
  })

  describe('activeException', () => {
    it('returns null when no active exception exists', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: () => {},
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.activeException).toBeNull()
    })

    it('returns the active exception when one exists', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: (
              callback: (doc: { id: string; data: () => Record<string, unknown> }) => void
            ) => {
              callback({
                id: 'exc-active',
                data: () => ({
                  familyId: 'family-123',
                  type: 'pause',
                  requestedBy: 'parent-1',
                  status: 'active',
                  startTime: Date.now(),
                  createdAt: Date.now(),
                }),
              })
              callback({
                id: 'exc-completed',
                data: () => ({
                  familyId: 'family-123',
                  type: 'skip',
                  requestedBy: 'parent-1',
                  status: 'completed',
                  startTime: Date.now() - 86400000,
                  createdAt: Date.now() - 86400000,
                }),
              })
            },
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      await waitFor(() => {
        expect(result.current.activeException).not.toBeNull()
      })

      expect(result.current.activeException?.id).toBe('exc-active')
      expect(result.current.activeException?.status).toBe('active')
    })
  })

  describe('pauseOfflineTime - AC1', () => {
    it('creates a pause exception', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-pause-id' })
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      let exceptionId: string | undefined
      await act(async () => {
        exceptionId = await result.current.pauseOfflineTime('parent-uid', 'Mom', 'Emergency')
      })

      expect(exceptionId).toBe('new-pause-id')
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-123',
          type: 'pause',
          requestedBy: 'parent-uid',
          requestedByName: 'Mom',
          reason: 'Emergency',
          status: 'active',
          endTime: null,
        })
      )
    })

    it('throws error when familyId is null', async () => {
      const { result } = renderHook(() => useOfflineExceptions({ familyId: null }))

      await expect(result.current.pauseOfflineTime('parent-uid', 'Mom')).rejects.toThrow(
        'No family ID'
      )
    })
  })

  describe('resumeOfflineTime - AC1', () => {
    it('marks pause as completed', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      await act(async () => {
        await result.current.resumeOfflineTime('exc-123')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'completed',
          endTime: expect.any(Number),
        })
      )
    })

    it('throws error when familyId is null', async () => {
      const { result } = renderHook(() => useOfflineExceptions({ familyId: null }))

      await expect(result.current.resumeOfflineTime('exc-123')).rejects.toThrow('No family ID')
    })
  })

  describe('skipTonight - AC5', () => {
    it('creates a skip exception with midnight expiry', async () => {
      mockAddDoc.mockResolvedValue({ id: 'new-skip-id' })
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      let exceptionId: string | undefined
      await act(async () => {
        exceptionId = await result.current.skipTonight('parent-uid', 'Dad', 'Movie night')
      })

      expect(exceptionId).toBe('new-skip-id')
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-123',
          type: 'skip',
          requestedBy: 'parent-uid',
          requestedByName: 'Dad',
          reason: 'Movie night',
          status: 'active',
          endTime: expect.any(Number),
        })
      )

      // Verify endTime is midnight tonight
      const callArg = mockAddDoc.mock.calls[0][1]
      const endTime = new Date(callArg.endTime)
      expect(endTime.getHours()).toBe(0)
      expect(endTime.getMinutes()).toBe(0)
      expect(endTime.getSeconds()).toBe(0)
    })

    it('throws error when familyId is null', async () => {
      const { result } = renderHook(() => useOfflineExceptions({ familyId: null }))

      await expect(result.current.skipTonight('parent-uid', 'Dad')).rejects.toThrow('No family ID')
    })
  })

  describe('cancelException', () => {
    it('marks exception as cancelled', async () => {
      mockUpdateDoc.mockResolvedValue(undefined)
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      await act(async () => {
        await result.current.cancelException('exc-123')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'cancelled',
        })
      )
    })
  })

  describe('getDisplayMessage - AC6', () => {
    it('returns pause started message', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      const message = result.current.getDisplayMessage({
        id: 'exc-1',
        familyId: 'family-123',
        type: 'pause',
        requestedBy: 'parent-1',
        requestedByName: 'Mom',
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        createdAt: Date.now(),
      })

      expect(message).toBe('Mom paused offline time')
    })

    it('returns pause ended message', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      const message = result.current.getDisplayMessage({
        id: 'exc-1',
        familyId: 'family-123',
        type: 'pause',
        requestedBy: 'parent-1',
        requestedByName: 'Mom',
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        status: 'completed',
        createdAt: Date.now() - 3600000,
      })

      expect(message).toBe('Mom resumed offline time')
    })

    it('returns skip message', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      const message = result.current.getDisplayMessage({
        id: 'exc-1',
        familyId: 'family-123',
        type: 'skip',
        requestedBy: 'parent-1',
        requestedByName: 'Dad',
        startTime: Date.now(),
        endTime: Date.now() + 86400000,
        status: 'active',
        createdAt: Date.now(),
      })

      expect(message).toBe("Dad skipped tonight's offline time")
    })

    it('returns work exception message', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      const message = result.current.getDisplayMessage({
        id: 'exc-1',
        familyId: 'family-123',
        type: 'work',
        requestedBy: 'parent-1',
        requestedByName: 'Dad',
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        createdAt: Date.now(),
      })

      expect(message).toBe('Dad is working during offline time')
    })

    it('returns homework message', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      const message = result.current.getDisplayMessage({
        id: 'exc-1',
        familyId: 'family-123',
        type: 'homework',
        requestedBy: 'child-1',
        requestedByName: 'Emma',
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        createdAt: Date.now(),
      })

      expect(message).toBe('Emma requested homework time')
    })

    it('uses fallback name when requestedByName is missing', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      const message = result.current.getDisplayMessage({
        id: 'exc-1',
        familyId: 'family-123',
        type: 'pause',
        requestedBy: 'parent-1',
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        createdAt: Date.now(),
      })

      expect(message).toBe('Parent paused offline time')
    })
  })

  describe('messages constant', () => {
    it('exposes OFFLINE_EXCEPTION_MESSAGES', () => {
      mockOnSnapshot.mockImplementation(() => unsubscribeMock)

      const { result } = renderHook(() => useOfflineExceptions({ familyId: 'family-123' }))

      expect(result.current.messages).toBeDefined()
      expect(result.current.messages.pause).toBe('Pause')
      expect(result.current.messages.skip).toBe('Skip Tonight')
    })
  })

  describe('limit option', () => {
    it('respects limit parameter', async () => {
      const mockExceptions = Array.from({ length: 10 }, (_, i) => ({
        id: `exc-${i}`,
        familyId: 'family-123',
        type: 'skip',
        requestedBy: 'parent-1',
        status: 'completed',
        startTime: Date.now() - i * 86400000,
        createdAt: Date.now() - i * 86400000,
      }))

      mockOnSnapshot.mockImplementation((_, onNext) => {
        setTimeout(() => {
          onNext({
            forEach: (
              callback: (doc: { id: string; data: () => Record<string, unknown> }) => void
            ) => {
              mockExceptions.forEach((exc) => {
                callback({
                  id: exc.id,
                  data: () => exc,
                })
              })
            },
          })
        }, 0)
        return unsubscribeMock
      })

      const { result } = renderHook(() =>
        useOfflineExceptions({ familyId: 'family-123', limit: 5 })
      )

      await waitFor(() => {
        expect(result.current.exceptions).toHaveLength(5)
      })
    })
  })
})

describe('useIsOfflineTimePaused - Story 32.5', () => {
  let unsubscribeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    unsubscribeMock = vi.fn()
    mockOnSnapshot.mockImplementation(() => unsubscribeMock)
    mockQuery.mockReturnValue('query-ref')
    mockOrderBy.mockReturnValue('order-ref')
    mockCollection.mockReturnValue('collection-ref')
  })

  it('returns isPaused true when pause exception is active', async () => {
    mockOnSnapshot.mockImplementation((_, onNext) => {
      setTimeout(() => {
        onNext({
          forEach: (
            callback: (doc: { id: string; data: () => Record<string, unknown> }) => void
          ) => {
            callback({
              id: 'exc-pause',
              data: () => ({
                familyId: 'family-123',
                type: 'pause',
                requestedBy: 'parent-1',
                status: 'active',
                startTime: Date.now(),
                createdAt: Date.now(),
              }),
            })
          },
        })
      }, 0)
      return unsubscribeMock
    })

    const { result } = renderHook(() => useIsOfflineTimePaused('family-123'))

    await waitFor(() => {
      expect(result.current.isPaused).toBe(true)
    })

    expect(result.current.isSkipped).toBe(false)
  })

  it('returns isSkipped true when skip exception is active', async () => {
    mockOnSnapshot.mockImplementation((_, onNext) => {
      setTimeout(() => {
        onNext({
          forEach: (
            callback: (doc: { id: string; data: () => Record<string, unknown> }) => void
          ) => {
            callback({
              id: 'exc-skip',
              data: () => ({
                familyId: 'family-123',
                type: 'skip',
                requestedBy: 'parent-1',
                status: 'active',
                startTime: Date.now(),
                endTime: Date.now() + 86400000,
                createdAt: Date.now(),
              }),
            })
          },
        })
      }, 0)
      return unsubscribeMock
    })

    const { result } = renderHook(() => useIsOfflineTimePaused('family-123'))

    await waitFor(() => {
      expect(result.current.isSkipped).toBe(true)
    })

    expect(result.current.isPaused).toBe(false)
  })

  it('returns both false when no active exception', async () => {
    mockOnSnapshot.mockImplementation((_, onNext) => {
      setTimeout(() => {
        onNext({
          forEach: () => {},
        })
      }, 0)
      return unsubscribeMock
    })

    const { result } = renderHook(() => useIsOfflineTimePaused('family-123'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isPaused).toBe(false)
    expect(result.current.isSkipped).toBe(false)
    expect(result.current.activeException).toBeNull()
  })

  it('handles null familyId', () => {
    const { result } = renderHook(() => useIsOfflineTimePaused(null))

    expect(result.current.isPaused).toBe(false)
    expect(result.current.isSkipped).toBe(false)
    expect(result.current.loading).toBe(false)
  })
})
