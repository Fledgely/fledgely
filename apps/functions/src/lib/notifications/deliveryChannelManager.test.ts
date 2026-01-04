/**
 * Tests for Delivery Channel Manager.
 *
 * Story 41.6: Notification Delivery Channels - AC1, AC4, AC5, AC7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock email and SMS services
let mockSendNotificationEmail = vi.fn()
let mockSendSmsNotification = vi.fn()

vi.mock('../email', () => ({
  sendNotificationEmail: (...args: unknown[]) => mockSendNotificationEmail(...args),
}))

vi.mock('../sms', () => ({
  sendSmsNotification: (...args: unknown[]) => mockSendSmsNotification(...args),
}))

// Mock Firebase
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockDelete = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockCollection,
  })),
  FieldValue: {
    serverTimestamp: vi.fn(),
  },
}))

// Mock FCM
const mockSendEachForMulticast = vi.fn()

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

import {
  getChannelPreferences,
  deliverNotification,
  updateChannelPreferences,
  _resetDbForTesting,
} from './deliveryChannelManager'

describe('deliveryChannelManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()

    // Reset service mocks
    mockSendNotificationEmail = vi.fn().mockResolvedValue({
      success: true,
      messageId: 'email-123',
    })

    mockSendSmsNotification = vi.fn().mockResolvedValue({
      success: true,
      messageSid: 'sms-123',
    })

    // Setup Firestore mock chain
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      delete: mockDelete,
      collection: mockCollection,
    })

    mockCollection.mockReturnValue({
      doc: mockDoc,
      get: vi.fn().mockResolvedValue({ docs: [] }),
    })

    // Default: no preferences stored
    mockGet.mockResolvedValue({ exists: false })

    // Clear env vars
    delete process.env.APP_URL
  })

  afterEach(() => {
    _resetDbForTesting()
    delete process.env.APP_URL
  })

  describe('getChannelPreferences', () => {
    it('returns defaults when no preferences stored', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const prefs = await getChannelPreferences('user-123', 'criticalFlags')

      expect(prefs.push).toBe(true)
      expect(prefs.email).toBe(true)
      expect(prefs.sms).toBe(false)
    })

    it('returns stored preferences', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          criticalFlags: { push: false, email: true, sms: true },
        }),
      })

      const prefs = await getChannelPreferences('user-123', 'criticalFlags')

      expect(prefs.push).toBe(false)
      expect(prefs.email).toBe(true)
      expect(prefs.sms).toBe(true)
    })

    it('forces push and email for security notifications', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          loginAlerts: { push: false, email: false, sms: true },
        }),
      })

      const prefs = await getChannelPreferences('user-123', 'loginAlerts')

      expect(prefs.push).toBe(true) // Forced to true
      expect(prefs.email).toBe(true) // Forced to true
      expect(prefs.sms).toBe(false) // SMS not allowed for security
    })

    it('returns defaults for unconfigured notification types', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      })

      const prefs = await getChannelPreferences('user-123', 'deviceSyncAlerts')

      expect(prefs.push).toBe(true)
      expect(prefs.email).toBe(false)
    })
  })

  describe('deliverNotification', () => {
    const baseInput = {
      userId: 'user-123',
      familyId: 'family-456',
      notificationType: 'criticalFlags' as const,
      content: {
        title: 'Test Alert',
        body: 'This is a test notification',
      },
      priority: 'normal' as const,
    }

    beforeEach(() => {
      // Setup token retrieval
      mockCollection.mockImplementation((name: string) => {
        if (name === 'notificationTokens') {
          return {
            get: vi.fn().mockResolvedValue({
              docs: [{ id: 'token-1', data: () => ({ token: 'fcm-token-123' }) }],
            }),
            doc: mockDoc,
          }
        }
        return {
          doc: mockDoc,
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }
      })

      // Default successful FCM response
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        responses: [{ success: true, messageId: 'fcm-msg-123' }],
      })

      // Default preferences with email
      mockGet.mockImplementation(() =>
        Promise.resolve({
          exists: true,
          data: () => ({
            criticalFlags: { push: true, email: true, sms: false },
            verifiedEmail: 'user@example.com',
          }),
        })
      )
    })

    it('sends push notification when enabled', async () => {
      const result = await deliverNotification(baseInput)

      expect(mockSendEachForMulticast).toHaveBeenCalled()
      expect(result.channels).toHaveLength(2) // push + email
      expect(result.channels[0].channel).toBe('push')
      expect(result.channels[0].success).toBe(true)
    })

    it('sends email when enabled', async () => {
      const result = await deliverNotification(baseInput)

      expect(mockSendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          notificationType: 'criticalFlags',
        })
      )
      expect(result.channels.some((c) => c.channel === 'email')).toBe(true)
    })

    it('falls back to email when push fails', async () => {
      mockSendEachForMulticast.mockResolvedValue({
        successCount: 0,
        failureCount: 1,
        responses: [{ success: false, error: { code: 'messaging/invalid-token' } }],
      })

      const result = await deliverNotification(baseInput)

      expect(result.fallbackUsed).toBe(true)
      expect(result.fallbackChannel).toBe('email')
      expect(mockSendNotificationEmail).toHaveBeenCalled()
    })

    it('includes fallback message in fallback emails', async () => {
      // No tokens registered
      mockCollection.mockImplementation((name: string) => {
        if (name === 'notificationTokens') {
          return {
            get: vi.fn().mockResolvedValue({ docs: [] }),
            doc: mockDoc,
          }
        }
        return { doc: mockDoc, get: vi.fn().mockResolvedValue({ docs: [] }) }
      })

      await deliverNotification(baseInput)

      expect(mockSendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackMessage: 'You may have missed this notification',
        })
      )
    })

    it('sends SMS for critical priority with criticalFlags', async () => {
      mockGet.mockImplementation(() =>
        Promise.resolve({
          exists: true,
          data: () => ({
            criticalFlags: { push: true, email: true, sms: true },
            verifiedEmail: 'user@example.com',
            verifiedPhone: '+12025551234',
          }),
        })
      )

      const result = await deliverNotification({
        ...baseInput,
        priority: 'critical',
      })

      expect(mockSendSmsNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+12025551234',
          notificationType: 'criticalFlags',
        })
      )
      expect(result.channels.some((c) => c.channel === 'sms')).toBe(true)
    })

    it('does not send SMS for non-critical priority', async () => {
      mockGet.mockImplementation(() =>
        Promise.resolve({
          exists: true,
          data: () => ({
            criticalFlags: { push: true, email: true, sms: true },
            verifiedEmail: 'user@example.com',
            verifiedPhone: '+12025551234',
          }),
        })
      )

      await deliverNotification({
        ...baseInput,
        priority: 'normal',
      })

      expect(mockSendSmsNotification).not.toHaveBeenCalled()
    })

    it('does not include unsubscribe for security alerts', async () => {
      mockGet.mockImplementation(() =>
        Promise.resolve({
          exists: true,
          data: () => ({
            loginAlerts: { push: true, email: true },
            verifiedEmail: 'user@example.com',
          }),
        })
      )

      await deliverNotification({
        ...baseInput,
        notificationType: 'loginAlerts',
      })

      expect(mockSendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          includeUnsubscribe: false,
        })
      )
    })

    it('logs delivery attempts', async () => {
      await deliverNotification(baseInput)

      // Should have set at least one delivery log
      expect(mockSet).toHaveBeenCalled()
    })

    it('returns comprehensive delivery result', async () => {
      const result = await deliverNotification(baseInput)

      expect(result).toMatchObject({
        notificationId: expect.stringContaining('notif-'),
        channels: expect.any(Array),
        primaryChannel: 'push',
        fallbackUsed: expect.any(Boolean),
        allDelivered: expect.any(Boolean),
      })
    })
  })

  describe('updateChannelPreferences', () => {
    it('updates preferences with merge', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          criticalFlags: { push: true, email: true, sms: false },
          loginAlerts: { push: true, email: true },
        }),
      })

      await updateChannelPreferences('user-123', {
        criticalFlags: { push: false, email: true, sms: true },
      })

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          criticalFlags: { push: false, email: true, sms: true },
          loginAlerts: { push: true, email: true, sms: false }, // Locked
        }),
        { merge: true }
      )
    })

    it('prevents modification of loginAlerts', async () => {
      mockGet.mockResolvedValue({ exists: false })

      await updateChannelPreferences('user-123', {
        loginAlerts: { push: false, email: false },
      } as never)

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAlerts: { push: true, email: true, sms: false },
        }),
        { merge: true }
      )
    })

    it('returns updated preferences', async () => {
      mockGet.mockResolvedValue({ exists: false })

      const result = await updateChannelPreferences('user-123', {
        deviceSyncAlerts: { push: false, email: true },
      })

      expect(result.deviceSyncAlerts).toEqual({ push: false, email: true })
      expect(result.loginAlerts).toEqual({ push: true, email: true, sms: false })
    })
  })
})
