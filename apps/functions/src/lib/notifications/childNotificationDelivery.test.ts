/**
 * Tests for Child Notification Delivery Service.
 *
 * Story 41.7: Child Notification Preferences - AC6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock functions
const mockGet = vi.fn()
const mockSet = vi.fn().mockResolvedValue(undefined)
const mockSend = vi.fn()
const mockGetChildNotificationPreferences = vi.fn()

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: mockGet,
            set: mockSet,
          })),
        })),
      })),
    })),
  })),
  FieldValue: {
    serverTimestamp: vi.fn(() => 'server-timestamp'),
  },
}))

// Mock firebase-admin/messaging
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    send: mockSend,
  })),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Mock child notification preferences service
vi.mock('./childNotificationPreferencesService', () => ({
  getChildNotificationPreferences: (...args: unknown[]) =>
    mockGetChildNotificationPreferences(...args),
}))

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => ({
  shouldDeliverChildNotification: vi.fn((prefs, type) => {
    // Time limit warning, agreement change, and device removed are always delivered (required)
    if (type === 'time_limit_warning' || type === 'agreement_change' || type === 'device_removed') {
      return { deliver: true }
    }
    // Trust score change - check if enabled
    if (type === 'trust_score_change') {
      return prefs.trustScoreChangesEnabled
        ? prefs.quietHoursEnabled
          ? { deliver: false, reason: 'quiet_hours' }
          : { deliver: true }
        : { deliver: false, reason: 'trust_score_disabled' }
    }
    // Weekly summary - check if enabled
    if (type === 'weekly_summary') {
      return prefs.weeklySummaryEnabled
        ? prefs.quietHoursEnabled
          ? { deliver: false, reason: 'quiet_hours' }
          : { deliver: true }
        : { deliver: false, reason: 'weekly_summary_disabled' }
    }
    return { deliver: true }
  }),
  CHILD_NOTIFICATION_TYPES: {
    TIME_LIMIT_WARNING: 'time_limit_warning',
    AGREEMENT_CHANGE: 'agreement_change',
    DEVICE_REMOVED: 'device_removed',
    TRUST_SCORE_CHANGE: 'trust_score_change',
    WEEKLY_SUMMARY: 'weekly_summary',
  },
}))

import {
  shouldDeliverToChild,
  deliverNotificationToChild,
  sendTimeLimitWarningToChild,
  sendAgreementChangeToChild,
  sendTrustScoreChangeToChild,
  sendWeeklySummaryToChild,
  sendDeviceRemovedToChild,
  _resetDbForTesting,
  _resetFcmForTesting,
} from './childNotificationDelivery'

describe('childNotificationDelivery', () => {
  const mockPreferences = {
    id: 'child-123',
    childId: 'child-123',
    familyId: 'family-456',
    timeLimitWarningsEnabled: true,
    agreementChangesEnabled: true,
    trustScoreChangesEnabled: true,
    weeklySummaryEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '21:00',
    quietHoursEnd: '07:00',
    updatedAt: new Date(),
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()
    _resetFcmForTesting()
    mockGetChildNotificationPreferences.mockResolvedValue(mockPreferences)
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ token: 'fcm-token-123' }),
    })
    mockSend.mockResolvedValue('message-id-123')
  })

  describe('shouldDeliverToChild', () => {
    it('delivers required notifications (time_limit_warning)', async () => {
      const result = await shouldDeliverToChild('child-123', 'family-456', 'time_limit_warning')
      expect(result.deliver).toBe(true)
    })

    it('delivers required notifications (agreement_change)', async () => {
      const result = await shouldDeliverToChild('child-123', 'family-456', 'agreement_change')
      expect(result.deliver).toBe(true)
    })

    it('delivers optional notifications when enabled', async () => {
      const result = await shouldDeliverToChild('child-123', 'family-456', 'trust_score_change')
      expect(result.deliver).toBe(true)
    })

    it('skips optional notifications when disabled', async () => {
      mockGetChildNotificationPreferences.mockResolvedValue({
        ...mockPreferences,
        trustScoreChangesEnabled: false,
      })

      const result = await shouldDeliverToChild('child-123', 'family-456', 'trust_score_change')
      expect(result.deliver).toBe(false)
      expect(result.reason).toBe('trust_score_disabled')
    })

    it('respects quiet hours for optional notifications', async () => {
      mockGetChildNotificationPreferences.mockResolvedValue({
        ...mockPreferences,
        quietHoursEnabled: true,
      })

      const result = await shouldDeliverToChild('child-123', 'family-456', 'trust_score_change')
      expect(result.deliver).toBe(false)
      expect(result.reason).toBe('quiet_hours')
    })

    it('delivers required notifications during quiet hours', async () => {
      mockGetChildNotificationPreferences.mockResolvedValue({
        ...mockPreferences,
        quietHoursEnabled: true,
      })

      const result = await shouldDeliverToChild('child-123', 'family-456', 'time_limit_warning')
      expect(result.deliver).toBe(true)
    })

    it('handles errors by delivering required notifications', async () => {
      mockGetChildNotificationPreferences.mockRejectedValue(new Error('Database error'))

      const result = await shouldDeliverToChild('child-123', 'family-456', 'time_limit_warning')
      expect(result.deliver).toBe(true)
    })

    it('handles errors by skipping optional notifications', async () => {
      mockGetChildNotificationPreferences.mockRejectedValue(new Error('Database error'))

      const result = await shouldDeliverToChild('child-123', 'family-456', 'trust_score_change')
      expect(result.deliver).toBe(false)
      expect(result.reason).toBe('preferences_error')
    })
  })

  describe('deliverNotificationToChild', () => {
    it('delivers notification via FCM', async () => {
      const content = { title: 'Test', body: 'Test message' }
      const result = await deliverNotificationToChild(
        'child-123',
        'family-456',
        'time_limit_warning',
        content
      )

      expect(result.delivered).toBe(true)
      expect(result.fcmMessageId).toBe('message-id-123')
      expect(mockSend).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalled() // Logs delivery
    })

    it('skips delivery when notification is disabled', async () => {
      mockGetChildNotificationPreferences.mockResolvedValue({
        ...mockPreferences,
        trustScoreChangesEnabled: false,
      })

      const content = { title: 'Test', body: 'Test message' }
      const result = await deliverNotificationToChild(
        'child-123',
        'family-456',
        'trust_score_change',
        content
      )

      expect(result.delivered).toBe(false)
      expect(result.reason).toBe('trust_score_disabled')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('skips delivery when no FCM token', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      })

      const content = { title: 'Test', body: 'Test message' }
      const result = await deliverNotificationToChild(
        'child-123',
        'family-456',
        'time_limit_warning',
        content
      )

      expect(result.delivered).toBe(false)
      expect(result.reason).toBe('no_fcm_token')
    })

    it('handles FCM errors', async () => {
      mockSend.mockRejectedValue(new Error('FCM error'))

      const content = { title: 'Test', body: 'Test message' }
      const result = await deliverNotificationToChild(
        'child-123',
        'family-456',
        'time_limit_warning',
        content
      )

      expect(result.delivered).toBe(false)
      expect(result.reason).toBe('FCM error')
    })
  })

  describe('sendTimeLimitWarningToChild', () => {
    it('sends time limit warning', async () => {
      const result = await sendTimeLimitWarningToChild('child-123', 'family-456', 10, 'daily')

      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Time Limit Warning',
            body: expect.stringContaining('10 minutes'),
          }),
        })
      )
    })
  })

  describe('sendAgreementChangeToChild', () => {
    it('sends agreement change notification', async () => {
      const result = await sendAgreementChangeToChild(
        'child-123',
        'family-456',
        'Screen time limits updated'
      )

      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Agreement Updated',
            body: 'Screen time limits updated',
          }),
        })
      )
    })
  })

  describe('sendTrustScoreChangeToChild', () => {
    it('sends positive trust score change', async () => {
      const result = await sendTrustScoreChangeToChild(
        'child-123',
        'family-456',
        75,
        80,
        'Completed a milestone!'
      )

      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Trust Score Increased!',
            body: expect.stringContaining('80'),
          }),
        })
      )
    })

    it('sends negative trust score change', async () => {
      const result = await sendTrustScoreChangeToChild(
        'child-123',
        'family-456',
        80,
        75,
        'Missed a check-in'
      )

      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Trust Score Update',
            body: expect.stringContaining('75'),
          }),
        })
      )
    })
  })

  describe('sendWeeklySummaryToChild', () => {
    it('sends weekly summary', async () => {
      const result = await sendWeeklySummaryToChild('child-123', 'family-456', {
        screenTimeHours: 14,
        trustScoreChange: 5,
        milestonesReached: 2,
      })

      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Your Weekly Summary',
            body: expect.stringContaining('14h'),
          }),
        })
      )
    })

    it('skips when disabled', async () => {
      mockGetChildNotificationPreferences.mockResolvedValue({
        ...mockPreferences,
        weeklySummaryEnabled: false,
      })

      const result = await sendWeeklySummaryToChild('child-123', 'family-456', {
        screenTimeHours: 14,
        trustScoreChange: 5,
        milestonesReached: 2,
      })

      expect(result.delivered).toBe(false)
      expect(result.reason).toBe('weekly_summary_disabled')
    })
  })

  // Story 19.6: Device Removal Flow - AC6
  describe('sendDeviceRemovedToChild', () => {
    it('sends device removed notification', async () => {
      const result = await sendDeviceRemovedToChild(
        'child-123',
        'family-456',
        'Chromebook Classroom'
      )

      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          notification: expect.objectContaining({
            title: 'Device Removed',
            body: 'Chromebook Classroom removed from fledgely',
          }),
          data: expect.objectContaining({
            notificationType: 'device_removed',
            childId: 'child-123',
            familyId: 'family-456',
            deviceName: 'Chromebook Classroom',
          }),
        })
      )
    })

    it('delivers even during quiet hours (required notification)', async () => {
      mockGetChildNotificationPreferences.mockResolvedValue({
        ...mockPreferences,
        quietHoursEnabled: true,
      })

      const result = await sendDeviceRemovedToChild('child-123', 'family-456', 'My Tablet')

      // Required notification should still be delivered during quiet hours
      expect(result.delivered).toBe(true)
      expect(mockSend).toHaveBeenCalled()
    })

    it('handles missing FCM token gracefully', async () => {
      mockGet.mockResolvedValue({
        exists: false,
        data: () => null,
      })

      const result = await sendDeviceRemovedToChild('child-123', 'family-456', 'My Device')

      expect(result.delivered).toBe(false)
      expect(result.reason).toBe('no_fcm_token')
    })
  })
})
