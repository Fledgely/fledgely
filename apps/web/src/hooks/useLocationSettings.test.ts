/**
 * useLocationSettings Hook Tests - Story 40.1
 *
 * Tests for the location settings management hook.
 * Covers AC1 (Dual-Guardian Opt-In) and AC4 (Default Disabled).
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocationSettings } from './useLocationSettings'

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(() => ({})),
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock firebase/functions
const mockHttpsCallable = vi.fn()
vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}))

// Mock firebase/firestore
const mockOnSnapshot = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}))

describe('useLocationSettings', () => {
  let familyUnsubscribe: Mock
  let requestsUnsubscribe: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup unsubscribe mocks
    familyUnsubscribe = vi.fn()
    requestsUnsubscribe = vi.fn()

    // Default mock for doc reference
    mockDoc.mockReturnValue({ id: 'family-123' })
    mockCollection.mockReturnValue({ id: 'locationOptInRequests' })
    mockQuery.mockReturnValue({})
    mockWhere.mockReturnValue({})
    mockOrderBy.mockReturnValue({})
    mockLimit.mockReturnValue({})

    // Setup onSnapshot to call callback immediately with default data
    let snapshotCallCount = 0
    mockOnSnapshot.mockImplementation((ref, callback) => {
      snapshotCallCount++

      // First call is for family document
      if (snapshotCallCount === 1) {
        callback({
          exists: () => true,
          data: () => ({
            locationFeaturesEnabled: false,
            locationEnabledAt: null,
            locationEnabledByUids: [],
            locationDisabledAt: null,
            locationDisabledByUid: null,
            childNotifiedAt: null,
          }),
        })
        return familyUnsubscribe
      }

      // Second call is for requests collection
      callback({
        empty: true,
        docs: [],
      })
      return requestsUnsubscribe
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial state (AC4: Default Disabled)', () => {
    it('should return disabled status by default', async () => {
      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.status).toBe('disabled')
      expect(result.current.settings?.locationFeaturesEnabled).toBe(false)
    })

    it('should return loading=false after data loads', async () => {
      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      // After data loads, loading should be false
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should handle null familyId gracefully', async () => {
      const { result } = renderHook(() => useLocationSettings(null, 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.status).toBe('disabled')
      expect(result.current.settings).toBeNull()
    })
  })

  describe('Enabled state', () => {
    it('should return enabled status when location features are on', async () => {
      let callCount = 0
      mockOnSnapshot.mockImplementation((ref, callback) => {
        callCount++

        if (callCount === 1) {
          // Return enabled settings for family doc
          callback({
            exists: () => true,
            data: () => ({
              locationFeaturesEnabled: true,
              locationEnabledAt: { toDate: () => new Date() },
              locationEnabledByUids: ['user-1', 'user-2'],
              locationDisabledAt: null,
              locationDisabledByUid: null,
              childNotifiedAt: null,
            }),
          })
          return familyUnsubscribe
        }

        // Return empty requests for collection
        callback({
          empty: true,
          docs: [],
        })
        return requestsUnsubscribe
      })

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.status).toBe('enabled')
      expect(result.current.settings?.locationFeaturesEnabled).toBe(true)
    })
  })

  describe('Pending state (AC1: Dual-Guardian Opt-In)', () => {
    it('should return pending status when request exists', async () => {
      let callCount = 0
      mockOnSnapshot.mockImplementation((ref, callback) => {
        callCount++

        if (callCount === 1) {
          // Family settings - disabled
          callback({
            exists: () => true,
            data: () => ({
              locationFeaturesEnabled: false,
              locationEnabledAt: null,
              locationEnabledByUids: [],
              locationDisabledAt: null,
              locationDisabledByUid: null,
              childNotifiedAt: null,
            }),
          })
          return familyUnsubscribe
        }

        // Pending request exists
        callback({
          empty: false,
          docs: [
            {
              id: 'req-123',
              data: () => ({
                requestedByUid: 'user-1',
                requestedByName: 'Jane',
                status: 'pending',
                expiresAt: { toDate: () => new Date(Date.now() + 72 * 60 * 60 * 1000) },
              }),
            },
          ],
        })
        return requestsUnsubscribe
      })

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-2'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.status).toBe('pending')
      expect(result.current.pendingRequest).not.toBeNull()
      expect(result.current.pendingRequest?.requestedByUid).toBe('user-1')
      expect(result.current.pendingRequest?.requestedByName).toBe('Jane')
    })
  })

  describe('requestEnable action', () => {
    it('should call requestLocationOptIn callable', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: {
          success: true,
          requestId: 'req-123',
          status: 'pending',
          message: 'Request created',
        },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.requestEnable()
      })

      expect(success!).toBe(true)
      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'requestLocationOptIn')
      expect(mockCallable).toHaveBeenCalledWith({ familyId: 'family-123' })
    })

    it('should set error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Request failed'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.requestEnable()
      })

      expect(result.current.error).toBe('Request failed')
    })

    it('should return false when no familyId', async () => {
      const { result } = renderHook(() => useLocationSettings(null, 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.requestEnable()
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('No family selected')
    })
  })

  describe('approveRequest action', () => {
    it('should call approveLocationOptIn callable', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, status: 'enabled', message: 'Location features enabled' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-2'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.approveRequest('req-123')
      })

      expect(success!).toBe(true)
      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'approveLocationOptIn')
      expect(mockCallable).toHaveBeenCalledWith({
        familyId: 'family-123',
        requestId: 'req-123',
      })
    })

    it('should set error on approval failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Approval failed'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-2'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.approveRequest('req-123')
      })

      expect(result.current.error).toBe('Approval failed')
    })
  })

  describe('disableFeatures action', () => {
    it('should call disableLocationFeatures callable', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Location features disabled' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let success: boolean
      await act(async () => {
        success = await result.current.disableFeatures()
      })

      expect(success!).toBe(true)
      expect(mockHttpsCallable).toHaveBeenCalledWith({}, 'disableLocationFeatures')
      expect(mockCallable).toHaveBeenCalledWith({
        familyId: 'family-123',
        isFleeingMode: undefined,
      })
    })

    it('should pass fleeingMode flag when provided', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Location features disabled' },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.disableFeatures({ fleeingMode: true })
      })

      expect(mockCallable).toHaveBeenCalledWith({
        familyId: 'family-123',
        isFleeingMode: true,
      })
    })
  })

  describe('Error handling', () => {
    it('should set error when Firestore subscription fails', async () => {
      mockOnSnapshot.mockImplementation((_ref, _callback, errorCallback) => {
        errorCallback(new Error('Subscription failed'))
        return familyUnsubscribe
      })

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load location settings')
      })
    })

    it('should clear error with clearError', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Some error'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.requestEnable()
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from Firestore on unmount', async () => {
      const { unmount } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(mockOnSnapshot).toHaveBeenCalled()
      })

      unmount()

      expect(familyUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('actionLoading state', () => {
    it('should set actionLoading during request', async () => {
      let resolveCallable: (value: unknown) => void
      const mockCallable = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveCallable = resolve
          })
      )
      mockHttpsCallable.mockReturnValue(mockCallable)

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Start the request
      let requestPromise: Promise<boolean>
      act(() => {
        requestPromise = result.current.requestEnable()
      })

      // actionLoading should be true while request is in progress
      expect(result.current.actionLoading).toBe(true)

      // Resolve the request
      await act(async () => {
        resolveCallable!({
          data: { success: true, requestId: 'req-123', status: 'pending', message: 'ok' },
        })
        await requestPromise
      })

      expect(result.current.actionLoading).toBe(false)
    })
  })

  describe('refreshSettings', () => {
    it('should trigger re-subscription when called', async () => {
      // Track subscription calls
      let subscriptionCount = 0
      mockOnSnapshot.mockImplementation((ref, callback) => {
        subscriptionCount++

        // Even calls are for family doc, odd for requests collection
        if (subscriptionCount % 2 === 1) {
          callback({
            exists: () => true,
            data: () => ({
              locationFeaturesEnabled: false,
              locationEnabledAt: null,
              locationEnabledByUids: [],
              locationDisabledAt: null,
              locationDisabledByUid: null,
              childNotifiedAt: null,
            }),
          })
          return familyUnsubscribe
        }

        callback({
          empty: true,
          docs: [],
        })
        return requestsUnsubscribe
      })

      const { result } = renderHook(() => useLocationSettings('family-123', 'user-1'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const initialCallCount = subscriptionCount

      act(() => {
        result.current.refreshSettings()
      })

      await waitFor(() => {
        expect(subscriptionCount).toBeGreaterThan(initialCallCount)
      })
    })
  })
})
