/**
 * Tests for Device Sync Notification Service
 *
 * Story 41.4: Device Sync Status Notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
const mockBuildSyncTimeoutContent = vi.fn()
const mockBuildPermissionRevokedContent = vi.fn()
const mockBuildSyncRestoredContent = vi.fn()
const mockBuildDetailedSyncTimeoutContent = vi.fn()
const mockIsInQuietHours = vi.fn()

vi.mock('@fledgely/shared', () => {
  const NOTIFICATION_DEFAULTS_MOCK = {
    deviceStatusEnabled: true,
    quietHoursEnabled: false,
  }

  return {
    createDefaultNotificationPreferences: (
      userId: string,
      familyId: string,
      childId: string | null
    ) => ({
      id: childId ? `${userId}-${childId}` : `${userId}-default`,
      userId,
      familyId,
      childId,
      ...NOTIFICATION_DEFAULTS_MOCK,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      updatedAt: new Date(),
      createdAt: new Date(),
    }),
    buildSyncTimeoutContent: (...args: unknown[]) => mockBuildSyncTimeoutContent(...args),
    buildPermissionRevokedContent: (...args: unknown[]) =>
      mockBuildPermissionRevokedContent(...args),
    buildSyncRestoredContent: (...args: unknown[]) => mockBuildSyncRestoredContent(...args),
    buildDetailedSyncTimeoutContent: (...args: unknown[]) =>
      mockBuildDetailedSyncTimeoutContent(...args),
    isInQuietHours: (...args: unknown[]) => mockIsInQuietHours(...args),
  }
})

// Mock email and SMS services for Story 41.6 multi-channel delivery
vi.mock('../email', () => ({
  sendNotificationEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'email-123' }),
}))

vi.mock('../sms', () => ({
  sendSmsNotification: vi.fn().mockResolvedValue({ success: true, messageSid: 'sms-123' }),
}))

// Mock deliveryChannelManager
vi.mock('./deliveryChannelManager', () => ({
  getChannelPreferences: vi.fn().mockResolvedValue({ push: true, email: false, sms: false }),
}))

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockDocDelete = vi.fn()
const mockCollectionGet = vi.fn()
const mockUserDocGet = vi.fn().mockResolvedValue({
  exists: true,
  data: () => ({ email: 'test@example.com', phone: '+15551234567' }),
})

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn((collectionName: string) => ({
      doc: vi.fn((_docId: string) => {
        // For users collection root, return mock with .get() for getUserContactInfo
        if (collectionName === 'users') {
          return {
            get: mockUserDocGet,
            set: mockDocSet,
            delete: mockDocDelete,
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: mockDocGet,
                set: mockDocSet,
                delete: mockDocDelete,
                id: 'test-doc-id',
              })),
              get: mockCollectionGet,
            })),
          }
        }
        return {
          get: mockDocGet,
          set: mockDocSet,
          delete: mockDocDelete,
          collection: vi.fn(() => ({
            doc: vi.fn(() => ({
              get: mockDocGet,
              set: mockDocSet,
              delete: mockDocDelete,
              id: 'test-doc-id',
            })),
            get: mockCollectionGet,
          })),
        }
      }),
    })),
  }),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
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

// Import after mocks
import {
  sendDeviceSyncTimeoutNotification,
  sendPermissionRevokedNotification,
  sendSyncRestoredNotification,
  hasAlreadyNotifiedForThreshold,
  hasRecentlyNotifiedPermissionRevoked,
  markDeviceOffline,
  clearDeviceNotificationStatus,
  _resetDbForTesting,
} from './deviceSyncNotification'
import type {
  SyncTimeoutParams,
  PermissionRevokedParams,
  SyncRestoredParams,
} from '@fledgely/shared'

describe('deviceSyncNotification', () => {
  const baseTimeoutParams: SyncTimeoutParams = {
    deviceId: 'device-123',
    deviceName: 'Chromebook',
    familyId: 'family-456',
    childId: 'child-789',
    lastSyncAt: Date.now() - 5 * 60 * 60 * 1000,
    thresholdHours: 4,
  }

  const basePermissionParams: PermissionRevokedParams = {
    deviceId: 'device-123',
    deviceName: 'Chromebook',
    familyId: 'family-456',
    childId: 'child-789',
  }

  const baseRestoredParams: SyncRestoredParams = {
    deviceId: 'device-123',
    deviceName: 'Chromebook',
    familyId: 'family-456',
    childId: 'child-789',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockDocGet.mockReset()
    mockDocSet.mockReset()
    mockDocDelete.mockReset()
    mockCollectionGet.mockReset()
    mockDocSet.mockResolvedValue(undefined)
    mockDocDelete.mockResolvedValue(undefined)
    mockIsInQuietHours.mockReturnValue(false)

    // Default notification content
    mockBuildSyncTimeoutContent.mockReturnValue({
      title: 'Device Sync Issue',
      body: "Chromebook hasn't synced in 4 hours",
      data: {
        type: 'sync_timeout',
        deviceId: 'device-123',
        familyId: 'family-456',
        childId: 'child-789',
        action: 'view_device',
      },
    })

    mockBuildDetailedSyncTimeoutContent.mockReturnValue({
      title: 'Device Sync Issue',
      body: "Chromebook hasn't synced in 5 hours. Tap to troubleshoot.",
      data: {
        type: 'sync_timeout',
        deviceId: 'device-123',
        familyId: 'family-456',
        childId: 'child-789',
        action: 'view_device',
      },
    })

    mockBuildPermissionRevokedContent.mockReturnValue({
      title: 'Extension Permissions Changed',
      body: 'Chromebook extension permissions may have been modified',
      data: {
        type: 'permission_revoked',
        deviceId: 'device-123',
        familyId: 'family-456',
        childId: 'child-789',
        action: 'check_permissions',
      },
    })

    mockBuildSyncRestoredContent.mockReturnValue({
      title: 'Device Back Online',
      body: 'Chromebook is syncing again',
      data: {
        type: 'sync_restored',
        deviceId: 'device-123',
        familyId: 'family-456',
        childId: 'child-789',
        action: 'dismiss',
      },
    })

    // Default FCM success
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    })
  })

  describe('sendDeviceSyncTimeoutNotification', () => {
    it('returns no notification when no parents found', async () => {
      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with no parents
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: [] }),
      })

      const result = await sendDeviceSyncTimeoutNotification(baseTimeoutParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsNotified).toEqual([])
      expect(result.deviceId).toBe('device-123')
    })

    it('sends notification to parent when enabled', async () => {
      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: true,
          quietHoursEnabled: false,
        }),
      })
      // Tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      const result = await sendDeviceSyncTimeoutNotification(baseTimeoutParams)

      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
      expect(mockSendEachForMulticast).toHaveBeenCalled()
    })

    it('skips notification when already notified for threshold', async () => {
      // Dedup status exists - recently notified
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          lastSyncTimeoutNotifiedAt: Date.now() - 60 * 1000, // 1 minute ago
          lastSyncTimeoutThreshold: 4,
          isOffline: true,
        }),
      })

      const result = await sendDeviceSyncTimeoutNotification(baseTimeoutParams)

      expect(result.notificationGenerated).toBe(false)
    })

    it('respects quiet hours and delays notification', async () => {
      mockIsInQuietHours.mockReturnValue(true)

      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences with quiet hours
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: true,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        }),
      })

      const result = await sendDeviceSyncTimeoutNotification(baseTimeoutParams)

      expect(result.delayedForQuietHours).toBe(true)
      expect(result.parentsSkipped).toContain('parent-1')
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('skips when deviceStatusEnabled is false', async () => {
      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences - disabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: false,
        }),
      })

      const result = await sendDeviceSyncTimeoutNotification(baseTimeoutParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsSkipped).toContain('parent-1')
    })

    it('uses detailed content when requested', async () => {
      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: true,
          quietHoursEnabled: false,
        }),
      })
      // Tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      await sendDeviceSyncTimeoutNotification(baseTimeoutParams, true)

      expect(mockBuildDetailedSyncTimeoutContent).toHaveBeenCalled()
    })
  })

  describe('sendPermissionRevokedNotification', () => {
    it('sends notification BYPASSING quiet hours', async () => {
      mockIsInQuietHours.mockReturnValue(true) // Would normally block

      // No dedup status (not recently notified)
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences with quiet hours enabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: true,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        }),
      })
      // Tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      const result = await sendPermissionRevokedNotification(basePermissionParams)

      // Should NOT be delayed - critical notification bypasses quiet hours
      expect(result.delayedForQuietHours).toBe(false)
      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
      expect(mockSendEachForMulticast).toHaveBeenCalled()
    })

    it('skips if recently notified (within 1 hour)', async () => {
      // Dedup status exists - recently notified
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          lastPermissionRevokedNotifiedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
          isOffline: true,
        }),
      })

      const result = await sendPermissionRevokedNotification(basePermissionParams)

      expect(result.notificationGenerated).toBe(false)
    })

    it('sends with high priority for critical notification', async () => {
      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: true,
          quietHoursEnabled: false,
        }),
      })
      // Tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      await sendPermissionRevokedNotification(basePermissionParams)

      const sendCall = mockSendEachForMulticast.mock.calls[0][0]
      expect(sendCall.android?.priority).toBe('high')
      expect(sendCall.apns?.payload?.aps?.['interruption-level']).toBe('time-sensitive')
    })
  })

  describe('sendSyncRestoredNotification', () => {
    it('sends notification when device was offline and recovery enabled', async () => {
      // All mocks return consistent values
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          isOffline: true,
          parentIds: ['parent-1'],
          deviceStatusEnabled: true,
          deviceSyncRecoveryEnabled: true,
          quietHoursEnabled: false,
        }),
      })
      mockCollectionGet.mockResolvedValue({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      const result = await sendSyncRestoredNotification(baseRestoredParams)

      expect(result.notificationGenerated).toBe(true)
      expect(mockSendEachForMulticast).toHaveBeenCalled()
    })

    it('returns early if device was not offline', async () => {
      // Device notification status (device NOT marked offline)
      mockDocGet.mockResolvedValue({
        exists: false,
        data: () => null,
      })

      const result = await sendSyncRestoredNotification(baseRestoredParams)

      // Should return early without sending notification
      expect(result.notificationGenerated).toBe(false)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })
  })

  describe('hasAlreadyNotifiedForThreshold', () => {
    it('returns false when no status exists', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })

      const result = await hasAlreadyNotifiedForThreshold('family-456', 'device-123', 4)

      expect(result).toBe(false)
    })

    it('returns true when recently notified for same threshold', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          lastSyncTimeoutNotifiedAt: Date.now() - 60 * 1000, // 1 minute ago
          lastSyncTimeoutThreshold: 4,
          isOffline: true,
        }),
      })

      const result = await hasAlreadyNotifiedForThreshold('family-456', 'device-123', 4)

      expect(result).toBe(true)
    })

    it('returns false when notification was long ago', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          lastSyncTimeoutNotifiedAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
          lastSyncTimeoutThreshold: 4,
          isOffline: true,
        }),
      })

      const result = await hasAlreadyNotifiedForThreshold('family-456', 'device-123', 4)

      expect(result).toBe(false)
    })
  })

  describe('hasRecentlyNotifiedPermissionRevoked', () => {
    it('returns false when no status exists', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })

      const result = await hasRecentlyNotifiedPermissionRevoked('family-456', 'device-123')

      expect(result).toBe(false)
    })

    it('returns true when notified within 1 hour', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          lastPermissionRevokedNotifiedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
          isOffline: true,
        }),
      })

      const result = await hasRecentlyNotifiedPermissionRevoked('family-456', 'device-123')

      expect(result).toBe(true)
    })

    it('returns false when notified more than 1 hour ago', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceId: 'device-123',
          lastPermissionRevokedNotifiedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
          isOffline: true,
        }),
      })

      const result = await hasRecentlyNotifiedPermissionRevoked('family-456', 'device-123')

      expect(result).toBe(false)
    })
  })

  describe('markDeviceOffline', () => {
    it('updates device status to offline', async () => {
      await markDeviceOffline('family-456', 'device-123')

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-123',
          isOffline: true,
        }),
        { merge: true }
      )
    })
  })

  describe('clearDeviceNotificationStatus', () => {
    it('deletes device notification status', async () => {
      await clearDeviceNotificationStatus('family-456', 'device-123')

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })

  describe('stale token cleanup', () => {
    it('removes stale tokens on messaging failure', async () => {
      // No dedup status
      mockDocGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      })
      // Family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })
      // Parent preferences
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          deviceStatusEnabled: true,
          quietHoursEnabled: false,
        }),
      })
      // Tokens (2 tokens)
      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          { id: 'token-1', data: () => ({ token: 'valid-token' }) },
          { id: 'token-2', data: () => ({ token: 'stale-token' }) },
        ],
      })

      // Mock messaging to return one success and one failure
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true },
          {
            success: false,
            error: { code: 'messaging/registration-token-not-registered' },
          },
        ],
      })

      await sendDeviceSyncTimeoutNotification(baseTimeoutParams)

      // Verify stale token was cleaned up
      expect(mockDocDelete).toHaveBeenCalled()
    })
  })
})
