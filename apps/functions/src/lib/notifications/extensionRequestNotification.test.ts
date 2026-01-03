/**
 * Tests for Extension Request Notification Service
 *
 * Story 41.3: Time Limit Notifications - AC3, AC6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
const mockBuildExtensionRequestContent = vi.fn()

vi.mock('@fledgely/shared', () => {
  const NOTIFICATION_DEFAULTS_MOCK = {
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
    buildExtensionRequestContent: (...args: unknown[]) => mockBuildExtensionRequestContent(...args),
  }
})

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
  sendExtensionRequestNotification,
  sendExtensionResponseNotification,
  _resetDbForTesting,
} from './extensionRequestNotification'
import type { ExtensionRequestNotificationParams } from '@fledgely/shared'

describe('extensionRequestNotification', () => {
  const extensionParams: ExtensionRequestNotificationParams = {
    requestId: 'req-123',
    childId: 'child-456',
    childName: 'Emma',
    familyId: 'family-789',
    minutesRequested: 30,
    reason: 'Need to finish homework',
    currentMinutes: 120,
    allowedMinutes: 120,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockDocSet.mockResolvedValue(undefined)

    // Default notification content
    mockBuildExtensionRequestContent.mockReturnValue({
      title: 'Time Extension Request',
      body: 'Emma is requesting 30 more minutes - "Need to finish homework"',
      data: {
        type: 'extension_request',
        childId: 'child-456',
        familyId: 'family-789',
        extensionRequestId: 'req-123',
        action: 'respond_extension',
      },
    })

    // Default FCM success
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    })
  })

  describe('sendExtensionRequestNotification', () => {
    it('returns no notification when no parents found', async () => {
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: [] }),
      })

      const result = await sendExtensionRequestNotification(extensionParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsNotified).toEqual([])
      expect(result.requestId).toBe('req-123')
    })

    it('sends notification to parent when preferences enabled', async () => {
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

      const result = await sendExtensionRequestNotification(extensionParams)

      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
    })

    it('sends to ALL guardians for co-parent symmetry (FR103)', async () => {
      // Mock family with two parents
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

      const result = await sendExtensionRequestNotification(extensionParams)

      expect(result.parentsNotified).toHaveLength(2)
      expect(result.parentsNotified).toContain('parent-1')
      expect(result.parentsNotified).toContain('parent-2')
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2)
    })

    it('BYPASSES quiet hours - action required (AC6)', async () => {
      // This test verifies that extension requests always send even during quiet hours
      // We check this by ensuring there's no quiet hours check before sending

      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences WITH quiet hours enabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-default',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: null,
          extensionRequestsEnabled: true,
          quietHoursEnabled: true, // Quiet hours ON
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
        }),
      })

      // Mock tokens
      mockCollectionGet.mockResolvedValueOnce({
        docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token' }) }],
      })

      const result = await sendExtensionRequestNotification(extensionParams)

      // Should still send despite quiet hours
      expect(result.notificationGenerated).toBe(true)
      expect(result.parentsNotified).toContain('parent-1')
      expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
    })

    it('skips parent when extensionRequestsEnabled is false', async () => {
      // Mock family with parent
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ parentIds: ['parent-1'] }),
      })

      // Mock preferences with extension requests disabled
      mockDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'parent-1-child-456',
          userId: 'parent-1',
          familyId: 'family-789',
          childId: 'child-456',
          extensionRequestsEnabled: false,
        }),
      })

      const result = await sendExtensionRequestNotification(extensionParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsSkipped).toContain('parent-1')
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
    })

    it('includes action buttons in notification', async () => {
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

      await sendExtensionRequestNotification(extensionParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          webpush: expect.objectContaining({
            notification: expect.objectContaining({
              actions: expect.arrayContaining([
                expect.objectContaining({ action: 'approve', title: 'Approve' }),
                expect.objectContaining({ action: 'deny', title: 'Deny' }),
              ]),
            }),
          }),
        })
      )
    })

    it('sets high priority for Android', async () => {
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

      await sendExtensionRequestNotification(extensionParams)

      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          android: expect.objectContaining({
            priority: 'high',
            notification: expect.objectContaining({
              channelId: 'extension_requests',
            }),
          }),
        })
      )
    })

    it('skips parent when no tokens found', async () => {
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

      const result = await sendExtensionRequestNotification(extensionParams)

      expect(result.notificationGenerated).toBe(false)
      expect(result.parentsSkipped).toContain('parent-1')
    })

    it('records notification in history', async () => {
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

      await sendExtensionRequestNotification(extensionParams)

      expect(mockDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'extension_request',
          extensionRequestId: 'req-123',
          deliveryStatus: 'sent',
        })
      )
    })
  })

  describe('sendExtensionResponseNotification', () => {
    beforeEach(() => {
      // Reset for child notification tests
      mockCollectionGet.mockResolvedValue({
        docs: [{ id: 'token-1', data: () => ({ token: 'child-fcm-token' }) }],
      })
    })

    it('sends approved notification to child', async () => {
      const result = await sendExtensionResponseNotification('child-456', true, 30)

      expect(result.sent).toBe(true)
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Extension Approved!',
            body: expect.stringContaining('30'),
          }),
          data: expect.objectContaining({
            type: 'extension_response',
            approved: 'true',
          }),
        })
      )
    })

    it('sends denied notification to child', async () => {
      const result = await sendExtensionResponseNotification('child-456', false)

      expect(result.sent).toBe(true)
      expect(mockSendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Extension Request Denied',
          }),
          data: expect.objectContaining({
            type: 'extension_response',
            approved: 'false',
          }),
        })
      )
    })

    it('returns false when child has no tokens', async () => {
      mockCollectionGet.mockResolvedValueOnce({ docs: [] })

      const result = await sendExtensionResponseNotification('child-456', true, 30)

      expect(result.sent).toBe(false)
      expect(mockSendEachForMulticast).not.toHaveBeenCalled()
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

      await sendExtensionResponseNotification('child-456', true, 30)

      expect(mockDocDelete).toHaveBeenCalled()
    })
  })
})
