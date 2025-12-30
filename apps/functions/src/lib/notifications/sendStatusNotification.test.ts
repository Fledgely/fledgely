/**
 * Tests for sendStatusNotification
 *
 * Story 19A.4: Status Push Notifications (AC: #2, #3, #6)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendStatusNotification, _resetDbForTesting } from './sendStatusNotification'

// Mock firebase-admin/firestore with proper subcollection chaining
const mockFamilyGet = vi.fn()
const mockTokensGet = vi.fn()
const mockDelete = vi.fn()

// Track which collection we're in for proper mock routing
let currentCollection = ''

const mockDoc = vi.fn((_docId: string) => {
  return {
    get: currentCollection === 'families' ? mockFamilyGet : mockTokensGet,
    delete: mockDelete,
    collection: mockCollection,
  }
})

const mockCollection = vi.fn((collName: string) => {
  currentCollection = collName
  return {
    doc: mockDoc,
    get: mockTokensGet,
  }
})

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  },
}))

// Mock firebase-admin/messaging
const mockSendEachForMulticast = vi.fn()
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}))

// Mock throttle module
vi.mock('./notificationThrottle', () => ({
  shouldSendNotification: vi.fn().mockResolvedValue(true),
  updateThrottleTimestamp: vi.fn().mockResolvedValue(undefined),
}))

// Mock buildStatusNotification
vi.mock('./buildStatusNotification', () => ({
  buildStatusNotification: vi.fn(() => ({
    title: 'Test Title',
    body: 'Test Body',
    data: { type: 'status_change', transition: 'good_to_attention' },
  })),
}))

import { shouldSendNotification, updateThrottleTimestamp } from './notificationThrottle'

describe('sendStatusNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    currentCollection = ''
  })

  afterEach(() => {
    _resetDbForTesting()
  })

  const defaultParams = {
    familyId: 'family-123',
    childId: 'child-456',
    childName: 'Emma',
    transition: 'good_to_attention' as const,
  }

  describe('throttling', () => {
    it('should return throttled result when shouldSendNotification returns false', async () => {
      vi.mocked(shouldSendNotification).mockResolvedValueOnce(false)

      const result = await sendStatusNotification(defaultParams)

      expect(result.throttled).toBe(true)
      expect(result.sent).toBe(false)
      expect(result.successCount).toBe(0)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('should proceed when shouldSendNotification returns true', async () => {
      vi.mocked(shouldSendNotification).mockResolvedValueOnce(true)
      mockFamilyGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ guardianUids: [] }),
      })

      const result = await sendStatusNotification(defaultParams)

      expect(result.throttled).toBe(false)
    })
  })

  describe('token fetching', () => {
    it('should return sent=false when family does not exist', async () => {
      mockFamilyGet.mockResolvedValueOnce({ exists: false })

      const result = await sendStatusNotification(defaultParams)

      expect(result.sent).toBe(false)
      expect(result.successCount).toBe(0)
      expect(result.failureCount).toBe(0)
    })

    it('should return sent=false when no tokens found', async () => {
      // Family exists with guardians
      mockFamilyGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ guardianUids: ['user-1'] }),
      })
      // User tokens query returns empty
      mockTokensGet.mockResolvedValueOnce({ docs: [] })

      const result = await sendStatusNotification(defaultParams)

      expect(result.sent).toBe(false)
      expect(result.successCount).toBe(0)
    })

    it('should fetch tokens for all guardians', async () => {
      // Family exists with multiple guardians
      mockFamilyGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ guardianUids: ['user-1', 'user-2'] }),
      })
      // Guardians tokens (parallel fetch)
      mockTokensGet
        .mockResolvedValueOnce({
          docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-1' }) }],
        })
        .mockResolvedValueOnce({
          docs: [{ id: 'token-2', data: () => ({ token: 'fcm-token-2' }) }],
        })

      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      })

      const result = await sendStatusNotification(defaultParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: expect.arrayContaining(['fcm-token-1', 'fcm-token-2']),
        })
      )
      expect(result.successCount).toBe(2)
    })
  })

  describe('notification sending', () => {
    beforeEach(() => {
      // Setup: family with one guardian with one token
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({ guardianUids: ['user-1'] }),
      })
      mockTokensGet.mockResolvedValue({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-1' }) }],
      })
    })

    afterEach(() => {
      mockFamilyGet.mockReset()
      mockTokensGet.mockReset()
    })

    it('should send notification with correct payload', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendStatusNotification(defaultParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ['fcm-token-1'],
          notification: {
            title: 'Test Title',
            body: 'Test Body',
          },
        })
      )
    })

    it('should return success result when notification sent', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      const result = await sendStatusNotification(defaultParams)

      expect(result.sent).toBe(true)
      expect(result.successCount).toBe(1)
      expect(result.failureCount).toBe(0)
      expect(result.throttled).toBe(false)
    })

    it('should update throttle timestamp on success', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      await sendStatusNotification(defaultParams)

      expect(updateThrottleTimestamp).toHaveBeenCalledWith(
        defaultParams.familyId,
        defaultParams.childId,
        defaultParams.transition
      )
    })

    it('should not update throttle timestamp when all sends fail', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: { code: 'messaging/unknown' } }],
      })

      await sendStatusNotification(defaultParams)

      expect(updateThrottleTimestamp).not.toHaveBeenCalled()
    })
  })

  describe('stale token cleanup', () => {
    beforeEach(() => {
      mockFamilyGet.mockResolvedValue({
        exists: true,
        data: () => ({ guardianUids: ['user-1'] }),
      })
      mockTokensGet.mockResolvedValue({
        docs: [{ id: 'token-1', data: () => ({ token: 'stale-token' }) }],
      })
      mockDelete.mockResolvedValue(undefined)
    })

    afterEach(() => {
      mockFamilyGet.mockReset()
      mockTokensGet.mockReset()
    })

    it('should remove token on registration-token-not-registered error', async () => {
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

      const result = await sendStatusNotification(defaultParams)

      expect(mockDelete).toHaveBeenCalled()
      expect(result.tokensCleanedUp).toBe(1)
    })

    it('should remove token on invalid-registration-token error', async () => {
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

      const result = await sendStatusNotification(defaultParams)

      expect(mockDelete).toHaveBeenCalled()
      expect(result.tokensCleanedUp).toBe(1)
    })

    it('should not remove token on other errors', async () => {
      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 0,
        failureCount: 1,
        responses: [
          {
            success: false,
            error: { code: 'messaging/internal-error' },
          },
        ],
      })

      const result = await sendStatusNotification(defaultParams)

      expect(mockDelete).not.toHaveBeenCalled()
      expect(result.tokensCleanedUp).toBe(0)
    })
  })

  describe('multi-device support', () => {
    it('should send to all tokens from multiple guardians', async () => {
      mockFamilyGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ guardianUids: ['user-1', 'user-2'] }),
      })
      // User 1 has 2 tokens, User 2 has 1 token (parallel fetch)
      mockTokensGet
        .mockResolvedValueOnce({
          docs: [
            { id: 'token-1a', data: () => ({ token: 'fcm-token-1a' }) },
            { id: 'token-1b', data: () => ({ token: 'fcm-token-1b' }) },
          ],
        })
        .mockResolvedValueOnce({
          docs: [{ id: 'token-2', data: () => ({ token: 'fcm-token-2' }) }],
        })

      mockSendEachForMulticast.mockResolvedValueOnce({
        successCount: 3,
        failureCount: 0,
        responses: [{ success: true }, { success: true }, { success: true }],
      })

      const result = await sendStatusNotification(defaultParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: expect.arrayContaining(['fcm-token-1a', 'fcm-token-1b', 'fcm-token-2']),
        })
      )
      expect(result.successCount).toBe(3)
    })
  })
})
