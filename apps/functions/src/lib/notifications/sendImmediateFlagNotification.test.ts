/**
 * Tests for Send Immediate Flag Notification
 *
 * Story 41.2: Flag Notifications - AC1, AC6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @fledgely/shared
const mockIsInQuietHours = vi.fn()

vi.mock('@fledgely/shared', () => ({
  isInQuietHours: (...args: unknown[]) => mockIsInQuietHours(...args),
}))

// Mock email and SMS services
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
const mockDocSet = vi.fn()
const mockDocDelete = vi.fn()
const mockCollectionGet = vi.fn()
const mockUserDocGet = vi.fn().mockResolvedValue({
  exists: true,
  data: () => ({ email: 'test@example.com', phone: '+15551234567' }),
})
const mockChannelPrefsDocGet = vi.fn().mockResolvedValue({
  exists: false,
})
const mockDoc = vi.fn(() => ({
  set: mockDocSet,
  delete: mockDocDelete,
  id: 'test-doc-id',
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn((collectionName: string) => ({
      doc: vi.fn((_docId: string) => {
        // For users collection, return a doc that supports .get()
        if (collectionName === 'users') {
          return {
            get: mockUserDocGet,
            collection: vi.fn((subCollectionName: string) => {
              if (subCollectionName === 'settings') {
                return {
                  doc: vi.fn(() => ({
                    get: mockChannelPrefsDocGet,
                    set: mockDocSet,
                  })),
                }
              }
              // For notificationTokens or other subcollections
              return {
                get: mockCollectionGet,
                doc: mockDoc,
              }
            }),
          }
        }
        return {
          collection: vi.fn(() => ({
            get: mockCollectionGet,
            doc: mockDoc,
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
import { sendImmediateFlagNotification, _resetDbForTesting } from './sendImmediateFlagNotification'
import type { FlagDocument, ParentNotificationPreferences } from '@fledgely/shared'

describe('sendImmediateFlagNotification', () => {
  const baseFlag: FlagDocument = {
    id: 'flag-123',
    childId: 'child-456',
    familyId: 'family-789',
    screenshotRef: 'children/child-456/screenshots/ss-1',
    screenshotId: 'ss-1',
    category: 'explicit_content',
    severity: 'high',
    confidence: 0.95,
    reasoning: 'Test flag',
    createdAt: Date.now(),
    status: 'pending',
    throttled: false,
    childNotificationStatus: 'pending',
  }

  const basePrefs: ParentNotificationPreferences = {
    id: 'user-1-default',
    userId: 'user-1',
    familyId: 'family-789',
    childId: null,
    criticalFlagsEnabled: true,
    mediumFlagsMode: 'digest',
    lowFlagsEnabled: false,
    timeLimitWarningsEnabled: true,
    limitReachedEnabled: true,
    extensionRequestsEnabled: true,
    syncAlertsEnabled: true,
    syncThresholdHours: 4,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    quietHoursWeekendDifferent: false,
    quietHoursWeekendStart: null,
    quietHoursWeekendEnd: null,
    updatedAt: new Date(),
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    mockIsInQuietHours.mockReturnValue(false)

    // Default: return some tokens
    mockCollectionGet.mockResolvedValue({
      docs: [
        {
          id: 'token-1',
          data: () => ({ token: 'fcm-token-123' }),
        },
      ],
    })

    // Default: FCM success
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    })

    mockDocSet.mockResolvedValue(undefined)
  })

  it('sends notification successfully when not in quiet hours', async () => {
    mockIsInQuietHours.mockReturnValue(false)

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(result.sent).toBe(true)
    expect(result.delayed).toBe(false)
    expect(result.successCount).toBe(1)
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
  })

  it('delays non-critical notifications during quiet hours', async () => {
    mockIsInQuietHours.mockReturnValue(true)

    const mediumFlag = { ...baseFlag, severity: 'medium' as const }
    const quietPrefs = { ...basePrefs, quietHoursEnabled: true }

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: mediumFlag,
      childName: 'Emma',
      preferences: quietPrefs,
    })

    expect(result.sent).toBe(false)
    expect(result.delayed).toBe(true)
    expect(result.reason).toBe('quiet_hours_delayed')
    expect(result.delayedUntil).toBeDefined()
    expect(mockSendEachForMulticast).not.toHaveBeenCalled()
  })

  it('bypasses quiet hours for high severity flags', async () => {
    mockIsInQuietHours.mockReturnValue(true)

    const highSeverityFlag = { ...baseFlag, severity: 'high' as const }
    const quietPrefs = { ...basePrefs, quietHoursEnabled: true }

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: highSeverityFlag,
      childName: 'Emma',
      preferences: quietPrefs,
    })

    expect(result.sent).toBe(true)
    expect(result.delayed).toBe(false)
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
  })

  it('falls back to email when push fails (no tokens)', async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] })

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    // Push was enabled but failed (no tokens), email fallback should succeed
    expect(result.sent).toBe(true)
    expect(result.successCount).toBe(1) // Email sent successfully
    expect(mockSendEachForMulticast).not.toHaveBeenCalled()
  })

  it('cleans up stale tokens on FCM failure', async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    })

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(result.tokensCleanedUp).toBe(1)
    expect(mockDocDelete).toHaveBeenCalled()
  })

  it('includes correct notification content', async () => {
    await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: {
          title: expect.stringContaining('High'),
          body: expect.stringContaining('Emma'),
        },
        data: expect.objectContaining({
          type: 'flag_alert',
          flagId: 'flag-123',
          childId: 'child-456',
          severity: 'high',
          action: 'review_flag',
        }),
      })
    )
  })

  it('sets high priority for high severity flags on Android', async () => {
    await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          priority: 'high',
          notification: expect.objectContaining({
            channelId: 'critical_flags',
          }),
        }),
      })
    )
  })

  it('sets normal priority for non-critical flags on Android', async () => {
    const mediumFlag = { ...baseFlag, severity: 'medium' as const }

    await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: mediumFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          priority: 'normal',
          notification: expect.objectContaining({
            channelId: 'flag_alerts',
          }),
        }),
      })
    )
  })

  it('includes deep link to flag detail', async () => {
    await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        webpush: expect.objectContaining({
          fcmOptions: {
            link: expect.stringContaining('/flags/child-456/flag-123'),
          },
        }),
      })
    )
  })

  it('records notification in history', async () => {
    await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'flag',
        flagId: 'flag-123',
        childId: 'child-456',
        severity: 'high',
        deliveryStatus: 'sent',
      })
    )
  })

  it('handles multiple tokens', async () => {
    mockCollectionGet.mockResolvedValue({
      docs: [
        { id: 'token-1', data: () => ({ token: 'fcm-token-1' }) },
        { id: 'token-2', data: () => ({ token: 'fcm-token-2' }) },
        { id: 'token-3', data: () => ({ token: 'fcm-token-3' }) },
      ],
    })

    mockSendEachForMulticast.mockResolvedValue({
      successCount: 3,
      failureCount: 0,
      responses: [{ success: true }, { success: true }, { success: true }],
    })

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    // successCount now counts channels, not tokens (push = 1)
    expect(result.successCount).toBe(1)
    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['fcm-token-1', 'fcm-token-2', 'fcm-token-3'],
      })
    )
  })
})
