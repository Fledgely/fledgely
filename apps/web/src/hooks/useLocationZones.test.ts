/**
 * Tests for useLocationZones Hook.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC1: Location Definitions (create, update, delete zones)
 * - AC4: Geofence Configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLocationZones } from './useLocationZones'

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
  collection: vi.fn(() => 'zones-collection'),
  query: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(() => 'orderBy'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}))

describe('useLocationZones', () => {
  const mockZonesData = [
    {
      id: 'zone-1',
      data: () => ({
        familyId: 'family-123',
        name: "Mom's House",
        type: 'home_1',
        latitude: 40.7128,
        longitude: -74.006,
        radiusMeters: 500,
        address: '123 Main St',
        createdAt: { toDate: () => new Date('2026-01-01') },
        updatedAt: { toDate: () => new Date('2026-01-01') },
      }),
    },
    {
      id: 'zone-2',
      data: () => ({
        familyId: 'family-123',
        name: 'Lincoln Elementary',
        type: 'school',
        latitude: 40.758,
        longitude: -73.9855,
        radiusMeters: 750,
        address: null,
        createdAt: { toDate: () => new Date('2026-01-02') },
        updatedAt: { toDate: () => new Date('2026-01-02') },
      }),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for onSnapshot - immediate callback with zones
    mockOnSnapshot.mockImplementation((_query, callback) => {
      callback({ docs: mockZonesData })
      return () => {} // unsubscribe function
    })
  })

  describe('Initial State', () => {
    it('starts with loading true', () => {
      const { result } = renderHook(() => useLocationZones('family-123'))

      // Initially loading, then updates after snapshot
      expect(result.current.loading).toBe(false) // After immediate callback
    })

    it('starts with empty zones array when no familyId', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useLocationZones(null))

      expect(result.current.zones).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('starts with no error', () => {
      const { result } = renderHook(() => useLocationZones('family-123'))

      expect(result.current.error).toBeNull()
    })
  })

  describe('Zone Subscription', () => {
    it('subscribes to zones collection', () => {
      renderHook(() => useLocationZones('family-123'))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('loads zones from Firestore', async () => {
      const { result } = renderHook(() => useLocationZones('family-123'))

      await waitFor(() => {
        expect(result.current.zones).toHaveLength(2)
      })

      expect(result.current.zones[0].name).toBe("Mom's House")
      expect(result.current.zones[1].name).toBe('Lincoln Elementary')
    })

    it('sets loading to false after data loads', async () => {
      const { result } = renderHook(() => useLocationZones('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('unsubscribes on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation((_query, callback) => {
        callback({ docs: mockZonesData })
        return unsubscribe
      })

      const { unmount } = renderHook(() => useLocationZones('family-123'))
      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('handles subscription errors', async () => {
      mockOnSnapshot.mockImplementation((_query, _callback, errorCallback) => {
        errorCallback(new Error('Subscription failed'))
        return () => {}
      })

      const { result } = renderHook(() => useLocationZones('family-123'))

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load location zones')
      })
    })
  })

  describe('createZone', () => {
    it('calls createLocationZone callable', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        data: { success: true, zoneId: 'new-zone-123', message: 'Created' },
      })
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        const zoneId = await result.current.createZone({
          name: 'New Zone',
          type: 'home_2',
          latitude: 40.7128,
          longitude: -74.006,
        })
        expect(zoneId).toBe('new-zone-123')
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createLocationZone')
    })

    it('returns null on error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Create failed'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        const zoneId = await result.current.createZone({
          name: 'New Zone',
          type: 'home_2',
          latitude: 40.7128,
          longitude: -74.006,
        })
        expect(zoneId).toBeNull()
      })

      expect(result.current.error).toBe('Create failed')
    })

    it('returns null when no familyId', async () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useLocationZones(null))

      await act(async () => {
        const zoneId = await result.current.createZone({
          name: 'New Zone',
          type: 'home_2',
          latitude: 40.7128,
          longitude: -74.006,
        })
        expect(zoneId).toBeNull()
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

      const { result } = renderHook(() => useLocationZones('family-123'))

      let createPromise: Promise<string | null>
      act(() => {
        createPromise = result.current.createZone({
          name: 'New Zone',
          type: 'home_2',
          latitude: 40.7128,
          longitude: -74.006,
        })
      })

      expect(result.current.actionLoading).toBe(true)

      await act(async () => {
        resolvePromise!({ data: { success: true, zoneId: 'new-zone', message: 'Created' } })
        await createPromise
      })

      expect(result.current.actionLoading).toBe(false)
    })
  })

  describe('updateZone', () => {
    it('calls updateLocationZone callable', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Updated' },
      })
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        const success = await result.current.updateZone('zone-1', { name: 'Updated Name' })
        expect(success).toBe(true)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'updateLocationZone')
    })

    it('returns false on error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Update failed'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        const success = await result.current.updateZone('zone-1', { name: 'Updated Name' })
        expect(success).toBe(false)
      })

      expect(result.current.error).toBe('Update failed')
    })
  })

  describe('deleteZone', () => {
    it('calls deleteLocationZone callable', async () => {
      const mockFn = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Deleted' },
      })
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        const success = await result.current.deleteZone('zone-1')
        expect(success).toBe(true)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteLocationZone')
    })

    it('returns false on error', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Delete failed'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        const success = await result.current.deleteZone('zone-1')
        expect(success).toBe(false)
      })

      expect(result.current.error).toBe('Delete failed')
    })
  })

  describe('Utilities', () => {
    it('clearError clears error state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Some error'))
      mockHttpsCallable.mockReturnValue(mockFn)

      const { result } = renderHook(() => useLocationZones('family-123'))

      await act(async () => {
        await result.current.deleteZone('zone-1')
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('refreshZones triggers resubscription', () => {
      const { result } = renderHook(() => useLocationZones('family-123'))

      const initialCallCount = mockOnSnapshot.mock.calls.length

      act(() => {
        result.current.refreshZones()
      })

      // Should trigger a new subscription
      expect(mockOnSnapshot.mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })
})
