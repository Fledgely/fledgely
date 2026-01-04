/**
 * Tests for login notification service.
 *
 * Story 41.5: New Login Notifications - AC1, AC3, AC4, AC5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendNewLoginNotification,
  sendSuspiciousLoginNotification,
  isInFleeingMode,
  hasRecentlyNotifiedForFingerprint,
  _resetDbForTesting,
  type SendLoginNotificationParams,
} from './loginNotification'
import type { DeviceFingerprint } from '@fledgely/shared'

// Mock email service for Story 41.6 multi-channel delivery
vi.mock('../email', () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'email-123' }),
}))

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockCollectionGet = vi.fn()
const mockDocDelete = vi.fn()
const mockUserDocGet = vi.fn().mockResolvedValue({
  exists: true,
  data: () => ({ email: 'user@example.com' }),
})

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (collectionName: string) => ({
      doc: (docId?: string) => {
        // For users collection root document, return a mock with .get() for getUserEmail
        if (collectionName === 'users') {
          return {
            get: mockUserDocGet,
            collection: () => ({
              doc: () => ({
                get: mockDocGet,
                set: mockDocSet,
                delete: mockDocDelete,
              }),
              get: mockCollectionGet,
            }),
            set: mockDocSet,
            delete: mockDocDelete,
            id: docId || `notif-${Date.now()}`,
          }
        }
        return {
          collection: () => ({
            doc: () => ({
              get: mockDocGet,
              set: mockDocSet,
              delete: mockDocDelete,
            }),
            get: mockCollectionGet,
          }),
          get: mockDocGet,
          set: mockDocSet,
          delete: mockDocDelete,
          id: docId || `notif-${Date.now()}`,
        }
      },
    }),
  }),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

// Mock firebase-admin/messaging
const mockSendEachForMulticast = vi.fn()

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({
    sendEachForMulticast: mockSendEachForMulticast,
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('loginNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockDocGet.mockReset()
    mockDocSet.mockReset()
    mockCollectionGet.mockReset()
    mockDocDelete.mockReset()
    mockSendEachForMulticast.mockReset()
    mockDocSet.mockResolvedValue(undefined)
    mockDocDelete.mockResolvedValue(undefined)
  })

  const baseFingerprint: DeviceFingerprint = {
    id: 'fp-test-123',
    userAgent: 'Mozilla/5.0 Chrome/120.0.0.0',
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Windows 10',
    approximateLocation: 'San Francisco, CA',
    createdAt: Date.now(),
  }

  const baseParams: SendLoginNotificationParams = {
    userId: 'user-123',
    userDisplayName: 'John Doe',
    familyId: 'family-456',
    sessionId: 'session-789',
    fingerprint: baseFingerprint,
    isNewDevice: true,
  }

  describe('isInFleeingMode', () => {
    it('returns false when family not found', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const result = await isInFleeingMode('family-123')

      expect(result).toBe(false)
    })

    it('returns false when fleeing mode not activated', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ guardianUids: ['user-1'] }),
      })

      const result = await isInFleeingMode('family-123')

      expect(result).toBe(false)
    })

    it('returns true when fleeing mode active within 72 hours', async () => {
      const recentActivation = Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['user-1'],
          fleeingModeActivatedAt: recentActivation,
        }),
      })

      const result = await isInFleeingMode('family-123')

      expect(result).toBe(true)
    })

    it('returns false when fleeing mode expired (>72 hours)', async () => {
      const oldActivation = Date.now() - 80 * 60 * 60 * 1000 // 80 hours ago

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['user-1'],
          fleeingModeActivatedAt: oldActivation,
        }),
      })

      const result = await isInFleeingMode('family-123')

      expect(result).toBe(false)
    })

    it('handles Firestore timestamp format', async () => {
      const recentActivation = Date.now() - 12 * 60 * 60 * 1000 // 12 hours ago

      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['user-1'],
          fleeingModeActivatedAt: {
            toMillis: () => recentActivation,
          },
        }),
      })

      const result = await isInFleeingMode('family-123')

      expect(result).toBe(true)
    })
  })

  describe('hasRecentlyNotifiedForFingerprint', () => {
    it('returns false when no status exists', async () => {
      mockDocGet.mockResolvedValueOnce({ exists: false })

      const result = await hasRecentlyNotifiedForFingerprint('user-123', 'fp-123')

      expect(result).toBe(false)
    })

    it('returns false when fingerprint differs', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          lastNotifiedFingerprintId: 'fp-different',
          lastNotificationSentAt: Date.now(),
        }),
      })

      const result = await hasRecentlyNotifiedForFingerprint('user-123', 'fp-123')

      expect(result).toBe(false)
    })

    it('returns true when same fingerprint within 5 minutes', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          lastNotifiedFingerprintId: 'fp-123',
          lastNotificationSentAt: Date.now() - 2 * 60 * 1000, // 2 minutes ago
        }),
      })

      const result = await hasRecentlyNotifiedForFingerprint('user-123', 'fp-123')

      expect(result).toBe(true)
    })

    it('returns false when same fingerprint but >5 minutes ago', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          lastNotifiedFingerprintId: 'fp-123',
          lastNotificationSentAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        }),
      })

      const result = await hasRecentlyNotifiedForFingerprint('user-123', 'fp-123')

      expect(result).toBe(false)
    })
  })

  describe('sendNewLoginNotification', () => {
    it('skips notification for known device (not new)', async () => {
      const params = { ...baseParams, isNewDevice: false }

      const result = await sendNewLoginNotification(params)

      expect(result.notificationGenerated).toBe(false)
      expect(result.guardiansNotified).toHaveLength(0)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('skips notification when recently notified', async () => {
      // Recent notification status
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          lastNotifiedFingerprintId: baseFingerprint.id,
          lastNotificationSentAt: Date.now() - 60 * 1000, // 1 minute ago
        }),
      })

      const result = await sendNewLoginNotification(baseParams)

      expect(result.notificationGenerated).toBe(false)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('returns empty when no guardians found', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with no guardians
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })

      const result = await sendNewLoginNotification(baseParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.guardiansNotified).toHaveLength(0)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('sends notification to all guardians (AC4)', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardians
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1', 'guardian-2'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian 1 tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // Guardian 2 tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-2' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      const result = await sendNewLoginNotification(baseParams)

      expect(result.notificationGenerated).toBe(true)
      expect(result.guardiansNotified).toHaveLength(2)
      expect(result.guardiansNotified).toContain('guardian-1')
      expect(result.guardiansNotified).toContain('guardian-2')
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2)
    })

    it('includes device info in notification (AC1)', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendNewLoginNotification(baseParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'New Login Detected',
            body: expect.stringContaining('Chrome'),
          }),
        })
      )
    })

    it('omits location when in fleeing mode (AC3/FR160)', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // In fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          fleeingModeActivatedAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
        }),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendNewLoginNotification(baseParams)

      // Should not contain location
      const fcmCall = mockSendEachForMulticast.mock.calls[0][0]
      expect(fcmCall.notification.body).not.toContain('San Francisco')
      expect(fcmCall.notification.body).not.toContain('near')
    })

    it('cleans up stale tokens on failure', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          { id: 'token-doc-1', data: () => ({ token: 'stale-token' }) },
          { id: 'token-doc-2', data: () => ({ token: 'valid-token' }) },
        ],
      })
      // FCM with one stale token
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: 'messaging/registration-token-not-registered' },
          },
          { success: true },
        ],
      })

      await sendNewLoginNotification(baseParams)

      // Should have called delete for stale token
      expect(mockDocDelete).toHaveBeenCalled()
    })

    it('notifies guardian via email fallback when no tokens available (Story 41.6)', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardians
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1', 'guardian-2'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian 1 - no tokens
      mockCollectionGet.mockResolvedValueOnce({ docs: [] })
      // Guardian 2 - has tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-2' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      const result = await sendNewLoginNotification(baseParams)

      // Both guardians notified - guardian-1 via email fallback, guardian-2 via push
      expect(result.guardiansNotified).toHaveLength(2)
      expect(result.guardiansNotified).toContain('guardian-1')
      expect(result.guardiansNotified).toContain('guardian-2')
    })

    it('uses high priority for security notifications (AC5)', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendNewLoginNotification(baseParams)

      const fcmCall = mockSendEachForMulticast.mock.calls[0][0]
      expect(fcmCall.android.priority).toBe('high')
      expect(fcmCall.apns.payload.aps['interruption-level']).toBe('time-sensitive')
    })
  })

  describe('sendSuspiciousLoginNotification', () => {
    it('sends with stronger wording', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendSuspiciousLoginNotification(baseParams)

      const fcmCall = mockSendEachForMulticast.mock.calls[0][0]
      expect(fcmCall.notification.title).toContain('🔔')
      expect(fcmCall.notification.body).toContain("Wasn't you?")
    })

    it('respects fleeing mode for suspicious login', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // In fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          fleeingModeActivatedAt: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
        }),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendSuspiciousLoginNotification(baseParams)

      const fcmCall = mockSendEachForMulticast.mock.calls[0][0]
      expect(fcmCall.notification.body).not.toContain('San Francisco')
    })

    it('uses critical interruption level', async () => {
      // No recent notification
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Family with guardian
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          guardianUids: ['guardian-1'],
        }),
      })
      // Not in fleeing mode
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })
      // Guardian tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ data: () => ({ token: 'token-1' }) }],
      })
      // FCM success
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendSuspiciousLoginNotification(baseParams)

      const fcmCall = mockSendEachForMulticast.mock.calls[0][0]
      expect(fcmCall.apns.payload.aps['interruption-level']).toBe('critical')
    })
  })
})
