/**
 * Tests for Child Time Limit Notification Service
 *
 * Story 41.3: Time Limit Notifications - AC4, AC5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
const mockBuildChildWarningContent = vi.fn()
const mockBuildChildLimitReachedContent = vi.fn()

vi.mock('@fledgely/shared', () => ({
  buildChildWarningContent: (...args: unknown[]) => mockBuildChildWarningContent(...args),
  buildChildLimitReachedContent: (...args: unknown[]) => mockBuildChildLimitReachedContent(...args),
}))

// Mock firebase-admin/firestore
const mockDocGet = vi.fn()
const mockDocSet = vi.fn()
const mockDocDelete = vi.fn()
const mockCollectionGet = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
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
      })),
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
  sendChildTimeLimitWarning,
  sendChildLimitReachedNotification,
  _resetDbForTesting,
} from './childTimeLimitNotification'

describe('childTimeLimitNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockDocSet.mockResolvedValue(undefined)

    // Default notification content
    mockBuildChildWarningContent.mockReturnValue({
      title: 'Time Check!',
      body: 'You have 15 minutes of screen time left. Make it count!',
    })

    mockBuildChildLimitReachedContent.mockReturnValue({
      title: "Time's Up!",
      body: "You've used all your screen time for today. Great job knowing when to stop!",
    })

    // Default: child has a token
    mockCollectionGet.mockResolvedValue({
      docs: [{ id: 'token-1', data: () => ({ token: 'child-fcm-token' }) }],
    })

    // Default FCM success
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    })
  })

  describe('sendChildTimeLimitWarning', () => {
    it('sends warning notification to child (AC4)', async () => {
      const result = await sendChildTimeLimitWarning('child-123', 15)

      expect(result.sent).toBe(true)
      expect(result.childId).toBe('child-123')
      expect(mockBuildChildWarningContent).toHaveBeenCalledWith(15)
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Time Check!',
          }),
          data: expect.objectContaining({
            type: 'child_time_warning',
            remainingMinutes: '15',
          }),
        })
      )
    })

    it('returns false when child has no tokens', async () => {
      mockCollectionGet.mockResolvedValueOnce({ docs: [] })

      const result = await sendChildTimeLimitWarning('child-123', 15)

      expect(result.sent).toBe(false)
      expect(result.successCount).toBe(0)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('includes correct Android channel', async () => {
      await sendChildTimeLimitWarning('child-123', 15)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            notification: expect.objectContaining({
              channelId: 'time_limits',
            }),
          }),
        })
      )
    })

    it('records notification history on success', async () => {
      await sendChildTimeLimitWarning('child-123', 15)

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child_time_warning',
          deliveryStatus: 'sent',
        })
      )
    })

    it('records notification history on failure', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: { code: 'messaging/unknown' } }],
      })

      await sendChildTimeLimitWarning('child-123', 15)

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child_time_warning',
          deliveryStatus: 'failed',
        })
      )
    })

    it('cleans up stale tokens on failure', async () => {
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

      await sendChildTimeLimitWarning('child-123', 15)

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })

  describe('sendChildLimitReachedNotification', () => {
    it('sends limit reached notification to child (AC5)', async () => {
      const result = await sendChildLimitReachedNotification('child-123')

      expect(result.sent).toBe(true)
      expect(result.childId).toBe('child-123')
      expect(mockBuildChildLimitReachedContent).toHaveBeenCalled()
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: "Time's Up!",
          }),
          data: expect.objectContaining({
            type: 'child_limit_reached',
          }),
        })
      )
    })

    it('returns false when child has no tokens', async () => {
      mockCollectionGet.mockResolvedValueOnce({ docs: [] })

      const result = await sendChildLimitReachedNotification('child-123')

      expect(result.sent).toBe(false)
      expect(result.successCount).toBe(0)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('uses high priority for Android', async () => {
      await sendChildLimitReachedNotification('child-123')

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            notification: expect.objectContaining({
              priority: 'high',
            }),
          }),
        })
      )
    })

    it('includes badge for iOS', async () => {
      await sendChildLimitReachedNotification('child-123')

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          apns: expect.objectContaining({
            payload: expect.objectContaining({
              aps: expect.objectContaining({
                badge: 1,
              }),
            }),
          }),
        })
      )
    })

    it('records notification history on success', async () => {
      await sendChildLimitReachedNotification('child-123')

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'child_limit_reached',
          deliveryStatus: 'sent',
        })
      )
    })

    it('cleans up stale tokens on failure', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: 'messaging/invalid-registration-token' },
          },
        ],
      })

      await sendChildLimitReachedNotification('child-123')

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })
})
