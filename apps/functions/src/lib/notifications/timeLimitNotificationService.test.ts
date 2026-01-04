/**
 * Tests for Time Limit Notification Service
 *
 * Story 41.3: Time Limit Notifications - AC1, AC2, AC6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
const mockIsInQuietHours = vi.fn()
const mockBuildParentWarningContent = vi.fn()
const mockBuildParentLimitReachedContent = vi.fn()

vi.mock('@fledgely/shared', () => {
  const NOTIFICATION_DEFAULTS_MOCK = {
    timeLimitWarningsEnabled: true,
    limitReachedEnabled: true,
    extensionRequestsEnabled: true,
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
    isInQuietHours: (...args: unknown[]) => mockIsInQuietHours(...args),
    buildParentWarningContent: (...args: unknown[]) => mockBuildParentWarningContent(...args),
    buildParentLimitReachedContent: (...args: unknown[]) =>
      mockBuildParentLimitReachedContent(...args),
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
  sendTimeLimitWarningNotification,
  sendLimitReachedNotification,
  _resetDbForTesting,
} from './timeLimitNotificationService'
import type { TimeLimitWarningParams, LimitReachedParams } from '@fledgely/shared'

describe('timeLimitNotificationService', () => {
  const warningParams: TimeLimitWarningParams = {
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 105,
    allowedMinutes: 120,
    remainingMinutes: 15,
  }

  const limitReachedParams: LimitReachedParams = {
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    limitType: 'daily_total',
    currentMinutes: 120,
    allowedMinutes: 120,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockIsInQuietHours.mockReturnValue(false)
    mockDocSet.mockResolvedValue(undefined)

    // Default: return notification content
    mockBuildParentWarningContent.mockReturnValue({
      title: 'Screen Time Warning',
      body: "Emma's screen time: 15 minutes remaining",
      data: {
        type: 'time_warning',
        childId: 'child-456',
        familyId: 'family-789',
        limitType: 'daily_total',
        action: 'view_time',
      },
    })

    mockBuildParentLimitReachedContent.mockReturnValue({
      title: 'Screen Time Limit Reached',
      body: 'Emma reached their daily limit (2h used of 2h allowed)',
      data: {
        type: 'limit_reached',
        childId: 'child-456',
        familyId: 'family-789',
        limitType: 'daily_total',
        action: 'view_time',
      },
    })

    // Default FCM success
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    })
  })

  describe('sendTimeLimitWarningNotification', () => {
    it('returns no notification when no parents found', async () => {
      // Mock family with no parents
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: [] }),
      })

      const result = await sendTimeLimitWarningNotification(warningParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsNotified).toEqual([])
    })

    it('sends notification when preferences enabled', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock child preferences not found
      mockDocGet.mockResolvedValueOnce({ exists: false })
      // Mock default preferences not found (use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })

      // Mock tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      const result = await sendTimeLimitWarningNotification(warningParams)

      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
    })

    it('skips parent when timeLimitWarningsEnabled is false', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences with warnings disabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-child-456',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: 'child-456',
          timeLimitWarningsEnabled: false,
          quietHoursEnabled: false,
        }),
      })

      const result = await sendTimeLimitWarningNotification(warningParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsSkipped).toContain('parent-1')
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('delays notification during quiet hours', async () => {
      mockIsInQuietHours.mockReturnValue(true)

      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences with quiet hours enabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-default',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: null,
          timeLimitWarningsEnabled: true,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        }),
      })

      const result = await sendTimeLimitWarningNotification(warningParams)

      expect(result.delayedForQuietHours).toBe(true)
      expect(result.parentsSkipped).toContain('parent-1')
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
      // Should queue for later
      expect(mockDocSet).toHaveBeenCalled()
    })

    it('notifies parent via email fallback when no tokens found (Story 41.6)', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences (use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      mockDocGet.mockResolvedValueOnce({ exists: false })

      // Mock no tokens
      mockCollectionGet.mockResolvedValueOnce({ docs: [] })

      const result = await sendTimeLimitWarningNotification(warningParams)

      // With Story 41.6 email fallback, notification should be generated via email
      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
    })

    it('sends to multiple parents independently', async () => {
      // Mock family with two parents
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1', 'parent-2'] }),
      })

      // Mock preferences for both (use defaults)
      mockDocGet.mockResolvedValue({ exists: false })

      // Mock tokens for both parents
      mockCollectionGet.mockResolvedValue({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token' }) }],
      })

      const result = await sendTimeLimitWarningNotification(warningParams)

      expect(result.parentsNotified).toHaveLength(2)
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2)
    })

    it('cleans up stale tokens on FCM failure and notifies via email (Story 41.6)', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences (use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      mockDocGet.mockResolvedValueOnce({ exists: false })

      // Mock tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'stale-token' }) }],
      })

      // Mock FCM failure with stale token
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: 'messaging/registration-token-not-registered' },
          },
        ],
      })

      const result = await sendTimeLimitWarningNotification(warningParams)

      // With Story 41.6 email fallback, parent is notified via email even when push fails
      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
      // Stale tokens should still be cleaned up
      expect(mockDocDelete).toHaveBeenCalled()
    })
  })

  describe('sendLimitReachedNotification', () => {
    it('returns no notification when no parents found', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: [] }),
      })

      const result = await sendLimitReachedNotification(limitReachedParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsNotified).toEqual([])
    })

    it('sends notification when preferences enabled', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences (use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      mockDocGet.mockResolvedValueOnce({ exists: false })

      // Mock tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
      })

      const result = await sendLimitReachedNotification(limitReachedParams)

      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
    })

    it('skips parent when limitReachedEnabled is false', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences with limit reached disabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-child-456',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: 'child-456',
          limitReachedEnabled: false,
          quietHoursEnabled: false,
        }),
      })

      const result = await sendLimitReachedNotification(limitReachedParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsSkipped).toContain('parent-1')
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('delays notification during quiet hours', async () => {
      mockIsInQuietHours.mockReturnValue(true)

      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences with quiet hours enabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-default',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: null,
          limitReachedEnabled: true,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        }),
      })

      const result = await sendLimitReachedNotification(limitReachedParams)

      expect(result.delayedForQuietHours).toBe(true)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('includes correct notification content', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences (use defaults)
      mockDocGet.mockResolvedValueOnce({ exists: false })
      mockDocGet.mockResolvedValueOnce({ exists: false })

      // Mock tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token' }) }],
      })

      await sendLimitReachedNotification(limitReachedParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: {
            title: 'Screen Time Limit Reached',
            body: expect.stringContaining('Emma'),
          },
        })
      )
    })

    it('sends to co-parents independently (FR103)', async () => {
      // Mock family with two parents (co-parent symmetry)
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1', 'parent-2'] }),
      })

      // Mock preferences for both (use defaults)
      mockDocGet.mockResolvedValue({ exists: false })

      // Mock tokens for both
      mockCollectionGet.mockResolvedValue({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token' }) }],
      })

      const result = await sendLimitReachedNotification(limitReachedParams)

      expect(result.parentsNotified).toHaveLength(2)
      expect(result.parentsNotified).toContain('parent-1')
      expect(result.parentsNotified).toContain('parent-2')
    })
  })
})
