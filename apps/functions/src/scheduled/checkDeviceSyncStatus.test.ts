/**
 * Tests for Device Sync Status Checker Scheduled Function
 *
 * Story 41.4: Device Sync Status Notifications - AC3, AC6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockCollectionGet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mockDocGet,
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: mockDocGet,
          })),
        })),
      })),
    })),
    collectionGroup: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        get: mockCollectionGet,
      })),
    })),
  }),
}))

// Mock notification service
const mockSendDeviceSyncTimeoutNotification = vi.fn()
const mockHasAlreadyNotifiedForThreshold = vi.fn()

vi.mock('../lib/notifications/deviceSyncNotification', () => ({
  sendDeviceSyncTimeoutNotification: (...args: unknown[]) =>
    mockSendDeviceSyncTimeoutNotification(...args),
  hasAlreadyNotifiedForThreshold: (...args: unknown[]) =>
    mockHasAlreadyNotifiedForThreshold(...args),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Import after mocks
import { checkAllDeviceSyncStatus, _resetDbForTesting } from './checkDeviceSyncStatus'

describe('checkDeviceSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  describe('checkAllDeviceSyncStatus', () => {
    it('returns zero counts when no stale devices found', async () => {
      mockCollectionGet.mockResolvedValueOnce({ docs: [] })

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(0)
      expect(result.notificationsSent).toBe(0)
      expect(result.notificationsSkipped).toBe(0)
      expect(result.errors).toBe(0)
    })

    it('processes stale devices and sends notifications', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      // Mock stale devices query
      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook',
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      // Mock family threshold lookup
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          notificationSettings: { deviceSyncThresholdHours: 4 },
        }),
      })

      // Not already notified
      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(false)

      // Notification sent successfully
      mockSendDeviceSyncTimeoutNotification.mockResolvedValueOnce({
        notificationGenerated: true,
        parentsNotified: ['parent-1'],
        parentsSkipped: [],
        delayedForQuietHours: false,
        deviceId: 'device-1',
      })

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(1)
      expect(result.notificationsSent).toBe(1)
      expect(result.notificationsSkipped).toBe(0)
      expect(mockSendDeviceSyncTimeoutNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-1',
          deviceName: 'Chromebook',
          familyId: 'family-1',
          childId: 'child-1',
          thresholdHours: 4,
        }),
        true
      )
    })

    it('skips devices already notified for threshold', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook',
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      // Mock family threshold lookup
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })

      // Already notified for this threshold
      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(true)

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(1)
      expect(result.notificationsSent).toBe(0)
      expect(result.notificationsSkipped).toBe(1)
      expect(mockSendDeviceSyncTimeoutNotification).not.toHaveBeenCalled()
    })

    it('skips devices that synced recently', async () => {
      const now = Date.now()
      const thirtyMinutesAgo = now - 30 * 60 * 1000 // Still within 1 hour

      // Device shows in query but lastSeen is within threshold when rechecked
      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook',
              lastSeen: thirtyMinutesAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      // Mock family with 4 hour threshold
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          notificationSettings: { deviceSyncThresholdHours: 4 },
        }),
      })

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(1)
      expect(result.notificationsSent).toBe(0)
      expect(result.notificationsSkipped).toBe(1)
      expect(mockSendDeviceSyncTimeoutNotification).not.toHaveBeenCalled()
    })

    it('uses default threshold when family has no settings', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook',
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      // Family exists but no notification settings
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({}),
      })

      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(false)
      mockSendDeviceSyncTimeoutNotification.mockResolvedValueOnce({
        notificationGenerated: true,
        parentsNotified: ['parent-1'],
        parentsSkipped: [],
        delayedForQuietHours: false,
        deviceId: 'device-1',
      })

      await checkAllDeviceSyncStatus()

      // Should use default threshold (4 hours)
      expect(mockSendDeviceSyncTimeoutNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          thresholdHours: 4, // DEFAULT_SYNC_THRESHOLD_HOURS
        }),
        true
      )
    })

    it('handles multiple devices', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook 1',
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
          {
            id: 'device-2',
            ref: { path: 'families/family-2/devices/device-2' },
            data: () => ({
              name: 'Chromebook 2',
              lastSeen: fiveHoursAgo,
              childId: 'child-2',
              status: 'active',
            }),
          },
        ],
      })

      // Family threshold lookups
      mockDocGet
        .mockResolvedValueOnce({ exists: true, data: () => ({}) })
        .mockResolvedValueOnce({ exists: true, data: () => ({}) })

      // Both not notified
      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(false).mockResolvedValueOnce(false)

      // Both notifications sent
      mockSendDeviceSyncTimeoutNotification
        .mockResolvedValueOnce({
          notificationGenerated: true,
          parentsNotified: ['parent-1'],
          parentsSkipped: [],
          delayedForQuietHours: false,
          deviceId: 'device-1',
        })
        .mockResolvedValueOnce({
          notificationGenerated: true,
          parentsNotified: ['parent-2'],
          parentsSkipped: [],
          delayedForQuietHours: false,
          deviceId: 'device-2',
        })

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(2)
      expect(result.notificationsSent).toBe(2)
      expect(result.notificationsSkipped).toBe(0)
    })

    it('handles errors gracefully for individual devices', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook',
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      // Family lookup throws error
      mockDocGet.mockRejectedValueOnce(new Error('Firestore error'))

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(1)
      expect(result.errors).toBe(1)
      expect(result.notificationsSent).toBe(0)
    })

    it('extracts familyId from document path correctly', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-123',
            ref: { path: 'families/family-456/devices/device-123' },
            data: () => ({
              name: 'Test Device',
              lastSeen: fiveHoursAgo,
              childId: 'child-789',
              status: 'active',
            }),
          },
        ],
      })

      mockDocGet.mockResolvedValueOnce({ exists: true, data: () => ({}) })
      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(false)
      mockSendDeviceSyncTimeoutNotification.mockResolvedValueOnce({
        notificationGenerated: true,
        parentsNotified: ['parent-1'],
        parentsSkipped: [],
        delayedForQuietHours: false,
        deviceId: 'device-123',
      })

      await checkAllDeviceSyncStatus()

      expect(mockSendDeviceSyncTimeoutNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-456',
          deviceId: 'device-123',
          childId: 'child-789',
        }),
        true
      )
    })

    it('uses deviceName fallback when name not present', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              deviceName: 'My Chromebook', // Uses deviceName instead of name
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      mockDocGet.mockResolvedValueOnce({ exists: true, data: () => ({}) })
      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(false)
      mockSendDeviceSyncTimeoutNotification.mockResolvedValueOnce({
        notificationGenerated: true,
        parentsNotified: ['parent-1'],
        parentsSkipped: [],
        delayedForQuietHours: false,
        deviceId: 'device-1',
      })

      await checkAllDeviceSyncStatus()

      expect(mockSendDeviceSyncTimeoutNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceName: 'My Chromebook',
        }),
        true
      )
    })

    it('counts notification as skipped when not generated', async () => {
      const now = Date.now()
      const fiveHoursAgo = now - 5 * 60 * 60 * 1000

      mockCollectionGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'device-1',
            ref: { path: 'families/family-1/devices/device-1' },
            data: () => ({
              name: 'Chromebook',
              lastSeen: fiveHoursAgo,
              childId: 'child-1',
              status: 'active',
            }),
          },
        ],
      })

      mockDocGet.mockResolvedValueOnce({ exists: true, data: () => ({}) })
      mockHasAlreadyNotifiedForThreshold.mockResolvedValueOnce(false)

      // Notification not generated (e.g., no tokens, preferences disabled)
      mockSendDeviceSyncTimeoutNotification.mockResolvedValueOnce({
        notificationGenerated: false,
        parentsNotified: [],
        parentsSkipped: ['parent-1'],
        delayedForQuietHours: false,
        deviceId: 'device-1',
      })

      const result = await checkAllDeviceSyncStatus()

      expect(result.devicesChecked).toBe(1)
      expect(result.notificationsSent).toBe(0)
      expect(result.notificationsSkipped).toBe(1)
    })
  })
})
