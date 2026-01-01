/**
 * useParentDeviceEnrollment Hook Tests - Story 32.2
 *
 * Tests for parent device enrollment hook functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Hoist mocks to avoid initialization issues
const { mockSetDoc, mockGetDoc } = vi.hoisted(() => ({
  mockSetDoc: vi.fn().mockResolvedValue(undefined),
  mockGetDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => null,
  }),
}))

// Mock current user
const mockFirebaseUser = { uid: 'parent-uid-1' }

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn((ref, onSuccess) => {
    // Simulate document not existing initially
    onSuccess({
      exists: () => false,
      data: () => null,
    })
    return vi.fn() // unsubscribe
  }),
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ firebaseUser: mockFirebaseUser })),
}))

import { useParentDeviceEnrollment } from './useParentDeviceEnrollment'
import { onSnapshot } from 'firebase/firestore'

describe('useParentDeviceEnrollment Hook - Story 32.2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('returns null enrollment when no document exists', async () => {
      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.enrollment).toBeNull()
      expect(result.current.myDevices).toEqual([])
      expect(result.current.otherParentDevices).toEqual([])
    })

    it('sets loading to false when familyId is undefined', async () => {
      const { result } = renderHook(() => useParentDeviceEnrollment(undefined))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.enrollment).toBeNull()
    })

    it('returns no error on initial load', async () => {
      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Loading enrollment data', () => {
    it('parses enrollment with devices correctly', async () => {
      const mockEnrollment = {
        familyId: 'family-123',
        devices: [
          {
            deviceId: 'device-1',
            parentUid: 'parent-uid-1',
            deviceName: "Mom's iPhone",
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
          {
            deviceId: 'device-2',
            parentUid: 'parent-uid-2',
            deviceName: "Dad's iPad",
            deviceType: 'tablet',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      vi.mocked(onSnapshot).mockImplementation((ref, onSuccess) => {
        ;(onSuccess as (snap: { exists: () => boolean; data: () => unknown }) => void)({
          exists: () => true,
          data: () => mockEnrollment,
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.enrollment).toBeDefined()
      expect(result.current.myDevices).toHaveLength(1)
      expect(result.current.myDevices[0].deviceName).toBe("Mom's iPhone")
      expect(result.current.otherParentDevices).toHaveLength(1)
      expect(result.current.otherParentDevices[0].deviceName).toBe("Dad's iPad")
    })

    it('filters out inactive devices from myDevices and otherParentDevices', async () => {
      const mockEnrollment = {
        familyId: 'family-123',
        devices: [
          {
            deviceId: 'device-1',
            parentUid: 'parent-uid-1',
            deviceName: 'Active Phone',
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
          {
            deviceId: 'device-2',
            parentUid: 'parent-uid-1',
            deviceName: 'Inactive Phone',
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: false,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      vi.mocked(onSnapshot).mockImplementation((ref, onSuccess) => {
        ;(onSuccess as (snap: { exists: () => boolean; data: () => unknown }) => void)({
          exists: () => true,
          data: () => mockEnrollment,
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.myDevices).toHaveLength(1)
      expect(result.current.myDevices[0].deviceName).toBe('Active Phone')
    })
  })

  describe('enrollDevice', () => {
    it('creates enrollment document when none exists', async () => {
      vi.mocked(mockGetDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.enrollDevice({
          deviceName: 'My Phone',
          deviceType: 'phone',
        })
      })

      expect(mockSetDoc).toHaveBeenCalledTimes(1)
      const savedData = mockSetDoc.mock.calls[0][1]
      expect(savedData.familyId).toBe('family-123')
      expect(savedData.devices).toHaveLength(1)
      expect(savedData.devices[0].deviceName).toBe('My Phone')
      expect(savedData.devices[0].deviceType).toBe('phone')
      expect(savedData.devices[0].parentUid).toBe('parent-uid-1')
      expect(savedData.devices[0].active).toBe(true)
    })

    it('adds device to existing enrollment', async () => {
      const existingEnrollment = {
        familyId: 'family-123',
        devices: [
          {
            deviceId: 'existing-device',
            parentUid: 'parent-uid-1',
            deviceName: 'Existing Phone',
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      vi.mocked(mockGetDoc).mockResolvedValue({
        exists: () => true,
        data: () => existingEnrollment,
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.enrollDevice({
          deviceName: 'New Tablet',
          deviceType: 'tablet',
        })
      })

      expect(mockSetDoc).toHaveBeenCalledTimes(1)
      const savedData = mockSetDoc.mock.calls[0][1]
      expect(savedData.devices).toHaveLength(2)
      expect(savedData.devices[1].deviceName).toBe('New Tablet')
    })

    it('sets error when familyId is undefined', async () => {
      const { result } = renderHook(() => useParentDeviceEnrollment(undefined))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.enrollDevice({
          deviceName: 'My Phone',
          deviceType: 'phone',
        })
      })

      expect(result.current.error).toBe('Missing family or user context')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('sets error when device name is too long', async () => {
      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.enrollDevice({
          deviceName: 'A'.repeat(51), // 51 chars, exceeds 50 limit
          deviceType: 'phone',
        })
      })

      expect(result.current.error).toBe('Device name must be between 1 and 50 characters')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('sets error when device name is empty', async () => {
      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.enrollDevice({
          deviceName: '   ', // Only whitespace
          deviceType: 'phone',
        })
      })

      expect(result.current.error).toBe('Device name must be between 1 and 50 characters')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })
  })

  describe('removeDevice', () => {
    it('marks device as inactive instead of deleting', async () => {
      const existingEnrollment = {
        familyId: 'family-123',
        devices: [
          {
            deviceId: 'device-to-remove',
            parentUid: 'parent-uid-1',
            deviceName: 'My Phone',
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      vi.mocked(onSnapshot).mockImplementation((ref, onSuccess) => {
        ;(onSuccess as (snap: { exists: () => boolean; data: () => unknown }) => void)({
          exists: () => true,
          data: () => existingEnrollment,
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.enrollment).toBeDefined()
      })

      await act(async () => {
        await result.current.removeDevice('device-to-remove')
      })

      expect(mockSetDoc).toHaveBeenCalledTimes(1)
      const savedData = mockSetDoc.mock.calls[0][1]
      expect(savedData.devices[0].active).toBe(false)
    })

    it('prevents removing other parent devices', async () => {
      const existingEnrollment = {
        familyId: 'family-123',
        devices: [
          {
            deviceId: 'other-parent-device',
            parentUid: 'parent-uid-2', // Different parent
            deviceName: "Dad's Phone",
            deviceType: 'phone',
            enrolledAt: Date.now(),
            active: true,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      vi.mocked(onSnapshot).mockImplementation((ref, onSuccess) => {
        ;(onSuccess as (snap: { exists: () => boolean; data: () => unknown }) => void)({
          exists: () => true,
          data: () => existingEnrollment,
        })
        return vi.fn()
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.enrollment).toBeDefined()
      })

      await act(async () => {
        await result.current.removeDevice('other-parent-device')
      })

      expect(result.current.error).toBe('You can only remove your own devices')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })
  })

  describe('saving state', () => {
    it('tracks saving state during enrollDevice', async () => {
      vi.mocked(mockGetDoc).mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      const { result } = renderHook(() => useParentDeviceEnrollment('family-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.saving).toBe(false)

      // Start enrolling
      const enrollPromise = act(async () => {
        await result.current.enrollDevice({
          deviceName: 'My Phone',
          deviceType: 'phone',
        })
      })

      // Wait for promise to resolve
      await enrollPromise

      expect(result.current.saving).toBe(false)
    })
  })
})
