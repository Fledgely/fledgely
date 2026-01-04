/**
 * Tests for useChildDevices Hook - Story 19.7
 *
 * Story 19.7: Child Device Visibility - AC1, AC2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockCollection = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

import { useChildDevices } from './useChildDevices'

describe('useChildDevices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue('devices-ref')
    mockQuery.mockReturnValue('devices-query')
    mockWhere.mockReturnValue('where-clause')
    mockOrderBy.mockReturnValue('order-clause')
  })

  it('returns empty array and loading=false when childId is null', async () => {
    const { result } = renderHook(() => useChildDevices({ childId: null, familyId: 'family-123' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.devices).toEqual([])
    expect(result.current.error).toBeNull()
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })

  it('returns empty array and loading=false when familyId is null', async () => {
    const { result } = renderHook(() => useChildDevices({ childId: 'child-123', familyId: null }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.devices).toEqual([])
    expect(result.current.error).toBeNull()
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })

  it('returns empty array when enabled is false', async () => {
    const { result } = renderHook(() =>
      useChildDevices({ childId: 'child-123', familyId: 'family-123', enabled: false })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.devices).toEqual([])
    expect(mockOnSnapshot).not.toHaveBeenCalled()
  })

  it('sets up Firestore listener with correct query', () => {
    mockOnSnapshot.mockImplementation(() => () => {})

    renderHook(() => useChildDevices({ childId: 'child-123', familyId: 'family-456' }))

    expect(mockCollection).toHaveBeenCalledWith({}, 'families', 'family-456', 'devices')
    expect(mockWhere).toHaveBeenCalledWith('childId', '==', 'child-123')
    expect(mockOrderBy).toHaveBeenCalledWith('enrolledAt', 'desc')
    expect(mockOnSnapshot).toHaveBeenCalled()
  })

  it('parses device data from snapshot', async () => {
    const mockDeviceData = {
      deviceId: 'device-001',
      type: 'chromebook',
      name: 'My Chromebook',
      childId: 'child-123',
      status: 'active',
      enrolledAt: { toDate: () => new Date('2024-01-01') },
      lastSeen: { toDate: () => new Date('2024-01-15') },
      lastScreenshotAt: { toDate: () => new Date('2024-01-15T10:00:00') },
      enrolledBy: 'parent-uid',
      metadata: { platform: 'Chrome OS', userAgent: 'Mozilla', enrollmentRequestId: 'req-1' },
    }

    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({
        forEach: (fn: (doc: { data: () => unknown; id: string }) => void) => {
          fn({ data: () => mockDeviceData, id: 'device-001' })
        },
      })
      return () => {}
    })

    const { result } = renderHook(() =>
      useChildDevices({ childId: 'child-123', familyId: 'family-456' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.devices).toHaveLength(1)
    expect(result.current.devices[0]).toMatchObject({
      deviceId: 'device-001',
      name: 'My Chromebook',
      type: 'chromebook',
      status: 'active',
      childId: 'child-123',
    })
  })

  it('filters out unenrolled devices', async () => {
    const mockDevices = [
      { deviceId: 'device-001', status: 'active', name: 'Active Device', childId: 'child-123' },
      {
        deviceId: 'device-002',
        status: 'unenrolled',
        name: 'Removed Device',
        childId: 'child-123',
      },
    ]

    mockOnSnapshot.mockImplementation((_, callback) => {
      callback({
        forEach: (fn: (doc: { data: () => unknown; id: string }) => void) => {
          mockDevices.forEach((device) => {
            fn({
              data: () => ({
                ...device,
                enrolledAt: { toDate: () => new Date() },
                lastSeen: { toDate: () => new Date() },
              }),
              id: device.deviceId,
            })
          })
        },
      })
      return () => {}
    })

    const { result } = renderHook(() =>
      useChildDevices({ childId: 'child-123', familyId: 'family-456' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.devices).toHaveLength(1)
    expect(result.current.devices[0].name).toBe('Active Device')
  })

  it('handles snapshot error', async () => {
    mockOnSnapshot.mockImplementation((_, __, errorCallback) => {
      errorCallback(new Error('Firestore error'))
      return () => {}
    })

    const { result } = renderHook(() =>
      useChildDevices({ childId: 'child-123', familyId: 'family-456' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load your devices. Please try again.')
    expect(result.current.devices).toEqual([])
  })

  it('cleans up listener on unmount', () => {
    const unsubscribe = vi.fn()
    mockOnSnapshot.mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() =>
      useChildDevices({ childId: 'child-123', familyId: 'family-456' })
    )

    unmount()

    expect(unsubscribe).toHaveBeenCalled()
  })
})
