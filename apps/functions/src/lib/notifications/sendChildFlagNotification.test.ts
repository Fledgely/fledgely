/**
 * sendChildFlagNotification Tests - Story 23.1
 *
 * Tests for child flag notification service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendChildFlagNotification, _resetDbForTesting } from './sendChildFlagNotification'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockDoc = vi.fn(() => ({
  get: mockGet,
  update: mockUpdate,
  delete: mockDelete,
}))
const mockCollection = vi.fn(() => ({
  doc: mockDoc,
  get: vi.fn().mockResolvedValue({ docs: [] }),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
}))

// Mock firebase-admin/messaging
const mockSendEachForMulticast = vi.fn()
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

describe('sendChildFlagNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const testParams = {
    childId: 'child-123',
    flagId: 'flag-456',
    familyId: 'family-789',
  }

  describe('when child has no tokens', () => {
    it('should return no_tokens reason when child document not found', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const result = await sendChildFlagNotification(testParams)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('no_tokens')
      expect(result.successCount).toBe(0)
    })

    it('should return no_tokens reason when child has no UID', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Test Child' }), // No uid
      })

      const result = await sendChildFlagNotification(testParams)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('no_tokens')
    })

    it('should return no_tokens reason when child has no registered tokens', async () => {
      // First call returns child doc with uid
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      // Set up collection mock to return empty tokens
      mockCollection.mockImplementation((path: string) => {
        if (path === 'children') {
          return {
            doc: () => ({
              get: mockGet,
            }),
          }
        }
        if (path === 'users') {
          return {
            doc: () => ({
              collection: () => ({
                get: vi.fn().mockResolvedValue({ docs: [] }),
              }),
            }),
          }
        }
        return {
          doc: mockDoc,
        }
      })

      const result = await sendChildFlagNotification(testParams)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('no_tokens')
    })
  })

  describe('when sending notification', () => {
    const setupWithTokens = () => {
      // Child document with uid
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      // Token collection
      const tokenDocs = [
        {
          id: 'token-1',
          data: () => ({ token: 'fcm-token-abc' }),
        },
        {
          id: 'token-2',
          data: () => ({ token: 'fcm-token-def' }),
        },
      ]

      mockCollection.mockImplementation((path: string) => {
        if (path === 'children') {
          return {
            doc: () => ({
              get: mockGet,
              collection: () => ({
                doc: () => ({
                  update: mockUpdate,
                }),
              }),
            }),
          }
        }
        if (path === 'users') {
          return {
            doc: () => ({
              collection: () => ({
                get: vi.fn().mockResolvedValue({ docs: tokenDocs }),
                doc: () => ({
                  delete: mockDelete,
                }),
              }),
            }),
          }
        }
        return {
          doc: mockDoc,
        }
      })
    }

    it('should send notification and return success when all tokens succeed', async () => {
      setupWithTokens()

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [{ success: true }, { success: true }],
      })

      // Mock for flag update
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      const result = await sendChildFlagNotification(testParams)

      expect(result.sent).toBe(true)
      expect(result.successCount).toBe(2)
      expect(result.failureCount).toBe(0)
      expect(result.annotationDeadline).toBeDefined()
    })

    it('should use gentle notification messaging', async () => {
      setupWithTokens()

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      await sendChildFlagNotification(testParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Something was flagged - add context?',
            body: 'We want your side of the story. Take a moment to explain what happened if you want.',
          }),
        })
      )
    })

    it('should include flag_notification type in data', async () => {
      setupWithTokens()

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      await sendChildFlagNotification(testParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'flag_notification',
            flagId: 'flag-456',
            action: 'add_context',
          }),
        })
      )
    })

    it('should return send_failed when all tokens fail', async () => {
      setupWithTokens()

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 2,
        responses: [
          { success: false, error: { code: 'some-error' } },
          { success: false, error: { code: 'some-error' } },
        ],
      })

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      const result = await sendChildFlagNotification(testParams)

      expect(result.sent).toBe(false)
      expect(result.reason).toBe('send_failed')
      expect(result.failureCount).toBe(2)
    })
  })

  describe('annotation deadline', () => {
    it('should set annotation deadline 30 minutes in future', async () => {
      // Setup with single token
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      mockCollection.mockImplementation((path: string) => {
        if (path === 'users') {
          return {
            doc: () => ({
              collection: () => ({
                get: vi.fn().mockResolvedValue({
                  docs: [{ id: 'token-1', data: () => ({ token: 'test-token' }) }],
                }),
              }),
            }),
          }
        }
        return {
          doc: () => ({
            get: mockGet,
            collection: () => ({
              doc: () => ({ update: mockUpdate }),
            }),
          }),
        }
      })

      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true }],
      })

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ uid: 'child-uid-123' }),
      })

      const beforeCall = Date.now()
      const result = await sendChildFlagNotification(testParams)
      const afterCall = Date.now()

      expect(result.annotationDeadline).toBeDefined()
      // Should be ~30 minutes (1800000ms) from now
      const expectedMin = beforeCall + 30 * 60 * 1000
      const expectedMax = afterCall + 30 * 60 * 1000
      expect(result.annotationDeadline).toBeGreaterThanOrEqual(expectedMin)
      expect(result.annotationDeadline).toBeLessThanOrEqual(expectedMax)
    })
  })
})
