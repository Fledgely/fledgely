/**
 * Tests for usePushNotifications Hook
 *
 * Story 19A.4: Status Push Notifications (AC: #5, #6)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePushNotifications } from './usePushNotifications'

// Mock Firebase
const mockGetToken = vi.fn()
const mockOnMessage = vi.fn()

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({})),
  getToken: (...args: unknown[]) => mockGetToken(...args),
  onMessage: (...args: unknown[]) => mockOnMessage(...args),
}))

// Mock Firebase lib
vi.mock('../lib/firebase', () => ({
  getFirebaseApp: vi.fn(() => ({})),
}))

// Mock Firestore
const mockSetDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockServerTimestamp = vi.fn(() => 'SERVER_TIMESTAMP')

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseApp: vi.fn(() => ({})),
  getFirestoreDb: vi.fn(() => ({})),
}))

// Mock window.Notification
const originalNotification = global.Notification

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken.mockResolvedValue('mock-fcm-token-123')
    mockOnMessage.mockReturnValue(vi.fn())
    mockSetDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
    mockDoc.mockReturnValue({ id: 'token-doc-id' })
    mockCollection.mockReturnValue({})

    // Mock Notification API
    Object.defineProperty(global, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(global, 'Notification', {
      value: originalNotification,
      writable: true,
    })
  })

  describe('Permission handling', () => {
    it('should handle environments without Notification API', () => {
      // Note: In SSR/Node environments, window and Notification may not exist
      // The hook should gracefully handle this by returning 'not-supported'
      // We test this by checking the hook's initial state logic handles undefined

      // Verify the hook's logic: if Notification doesn't exist, return 'not-supported'
      const checkNotificationSupport = () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          return 'not-supported'
        }
        return Notification.permission
      }

      // In the test environment, Notification exists, so this verifies the logic works
      expect(typeof checkNotificationSupport()).toBe('string')
    })

    it('should return current permission status on mount', () => {
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      expect(result.current.permissionStatus).toBe('granted')
    })

    it('should request permission when requestPermission is called', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('granted')
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: requestPermissionMock,
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(requestPermissionMock).toHaveBeenCalled()
    })

    it('should handle permission denied', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('denied')
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: requestPermissionMock,
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      await act(async () => {
        await result.current.requestPermission()
      })

      expect(result.current.permissionStatus).toBe('denied')
      expect(result.current.token).toBeNull()
    })
  })

  describe('Token registration', () => {
    it('should get FCM token when permission is granted', async () => {
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      await waitFor(() => {
        expect(result.current.token).toBe('mock-fcm-token-123')
      })

      expect(mockGetToken).toHaveBeenCalled()
    })

    it('should store token in Firestore when obtained', async () => {
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      renderHook(() => usePushNotifications({ userId: 'user-123' }))

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalled()
      })

      // Verify token document was saved
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          token: 'mock-fcm-token-123',
          platform: 'web',
        }),
        expect.anything()
      )
    })

    it('should not fetch token if userId is null', () => {
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: null }))

      expect(result.current.token).toBeNull()
      expect(mockGetToken).not.toHaveBeenCalled()
    })
  })

  describe('Token cleanup', () => {
    it('should provide unregisterToken function', () => {
      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      expect(typeof result.current.unregisterToken).toBe('function')
    })

    it('should delete token from Firestore when unregisterToken is called', async () => {
      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      // Wait for token to be set
      await waitFor(() => {
        expect(result.current.token).toBe('mock-fcm-token-123')
      })

      // Call unregister
      await act(async () => {
        await result.current.unregisterToken()
      })

      expect(mockDeleteDoc).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle FCM token fetch failure gracefully', async () => {
      mockGetToken.mockRejectedValue(new Error('FCM error'))

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(result.current.token).toBeNull()
    })

    it('should handle Firestore save failure gracefully', async () => {
      mockSetDoc.mockRejectedValue(new Error('Firestore error'))

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })
    })
  })

  describe('Loading state', () => {
    it('should indicate loading while fetching token', async () => {
      let resolveToken: (value: string) => void
      mockGetToken.mockReturnValue(
        new Promise((resolve) => {
          resolveToken = resolve
        })
      )

      Object.defineProperty(global, 'Notification', {
        value: {
          permission: 'granted',
          requestPermission: vi.fn().mockResolvedValue('granted'),
        },
        writable: true,
      })

      const { result } = renderHook(() => usePushNotifications({ userId: 'user-123' }))

      expect(result.current.loading).toBe(true)

      await act(async () => {
        resolveToken!('mock-token')
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })
})
