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

// Mock firebase-admin/firestore
const mockDocSet = vi.fn()
const mockDocDelete = vi.fn()
const mockCollectionGet = vi.fn()
const mockDoc = vi.fn(() => ({
  set: mockDocSet,
  delete: mockDocDelete,
  id: 'test-doc-id',
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          get: mockCollectionGet,
          doc: mockDoc,
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
    severity: 'critical',
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

  it('bypasses quiet hours for critical flags', async () => {
    mockIsInQuietHours.mockReturnValue(true)

    const criticalFlag = { ...baseFlag, severity: 'critical' as const }
    const quietPrefs = { ...basePrefs, quietHoursEnabled: true }

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: criticalFlag,
      childName: 'Emma',
      preferences: quietPrefs,
    })

    expect(result.sent).toBe(true)
    expect(result.delayed).toBe(false)
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
  })

  it('returns no_tokens when user has no FCM tokens', async () => {
    mockCollectionGet.mockResolvedValue({ docs: [] })

    const result = await sendImmediateFlagNotification({
      userId: 'user-1',
      flag: baseFlag,
      childName: 'Emma',
      preferences: basePrefs,
    })

    expect(result.sent).toBe(false)
    expect(result.reason).toBe('no_tokens')
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
          title: expect.stringContaining('Critical'),
          body: expect.stringContaining('Emma'),
        },
        data: expect.objectContaining({
          type: 'flag_alert',
          flagId: 'flag-123',
          childId: 'child-456',
          severity: 'critical',
          action: 'review_flag',
        }),
      })
    )
  })

  it('sets high priority for critical flags on Android', async () => {
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
        severity: 'critical',
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

    expect(result.successCount).toBe(3)
    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ['fcm-token-1', 'fcm-token-2', 'fcm-token-3'],
      })
    )
  })
})
