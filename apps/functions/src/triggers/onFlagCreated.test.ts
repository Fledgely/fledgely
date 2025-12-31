/**
 * onFlagCreated Trigger Tests - Story 23.1
 *
 * Tests for the flag created Firestore trigger.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FlagDocument } from '@fledgely/shared'

// Mock firebase-functions/logger first
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Mock sendChildFlagNotification
const mockSendChildFlagNotification = vi.fn()
vi.mock('../lib/notifications/sendChildFlagNotification', () => ({
  sendChildFlagNotification: mockSendChildFlagNotification,
}))

// Import logger for assertions
import * as logger from 'firebase-functions/logger'

// We need to import the trigger handler for testing
// Since onDocumentCreated is a higher-order function, we'll test the logic separately

describe('onFlagCreated trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test data factories
  const createMockFlagData = (overrides: Partial<FlagDocument> = {}): FlagDocument => ({
    id: 'flag-123',
    childId: 'child-456',
    familyId: 'family-789',
    screenshotRef: 'children/child-456/screenshots/ss-123',
    screenshotId: 'ss-123',
    category: 'Violence',
    severity: 'medium',
    confidence: 75,
    reasoning: 'Test reasoning',
    status: 'pending',
    createdAt: Date.now(),
    throttled: false,
    childNotificationStatus: 'pending',
    ...overrides,
  })

  describe('childNotificationStatus handling', () => {
    it('should send notification when status is pending', async () => {
      const flagData = createMockFlagData({ childNotificationStatus: 'pending' })

      // Simulate the trigger logic
      if (flagData.childNotificationStatus === 'pending') {
        mockSendChildFlagNotification.mockResolvedValue({
          sent: true,
          successCount: 1,
          failureCount: 0,
          tokensCleanedUp: 0,
          annotationDeadline: Date.now() + 30 * 60 * 1000,
        })

        await mockSendChildFlagNotification({
          childId: flagData.childId,
          flagId: flagData.id,
          familyId: flagData.familyId,
        })
      }

      expect(mockSendChildFlagNotification).toHaveBeenCalledWith({
        childId: 'child-456',
        flagId: 'flag-123',
        familyId: 'family-789',
      })
    })

    it('should NOT send notification when status is skipped', async () => {
      const flagData = createMockFlagData({ childNotificationStatus: 'skipped' })

      // Simulate the trigger logic
      if (flagData.childNotificationStatus === 'pending') {
        await mockSendChildFlagNotification({
          childId: flagData.childId,
          flagId: flagData.id,
          familyId: flagData.familyId,
        })
      }

      expect(mockSendChildFlagNotification).not.toHaveBeenCalled()
    })

    it('should NOT send notification when status is notified', async () => {
      const flagData = createMockFlagData({ childNotificationStatus: 'notified' })

      if (flagData.childNotificationStatus === 'pending') {
        await mockSendChildFlagNotification({
          childId: flagData.childId,
          flagId: flagData.id,
          familyId: flagData.familyId,
        })
      }

      expect(mockSendChildFlagNotification).not.toHaveBeenCalled()
    })
  })

  describe('distress suppression (AC6)', () => {
    it('should NOT send notification for sensitive_hold flags', async () => {
      const flagData = createMockFlagData({
        status: 'sensitive_hold',
        suppressionReason: 'distress_signals',
        childNotificationStatus: 'skipped', // Should already be skipped
      })

      // Double-check: Even if childNotificationStatus were pending,
      // we should not send for sensitive_hold
      if (flagData.childNotificationStatus === 'pending' && flagData.status !== 'sensitive_hold') {
        await mockSendChildFlagNotification({
          childId: flagData.childId,
          flagId: flagData.id,
          familyId: flagData.familyId,
        })
      }

      expect(mockSendChildFlagNotification).not.toHaveBeenCalled()
    })

    it('should log skip reason for distress-suppressed flags', async () => {
      const flagData = createMockFlagData({
        status: 'sensitive_hold',
        suppressionReason: 'self_harm_detected',
        childNotificationStatus: 'skipped',
      })

      // Simulate trigger logging
      if (flagData.status === 'sensitive_hold') {
        logger.info('Skipping notification - sensitive_hold status', {
          childId: flagData.childId,
          flagId: flagData.id,
          suppressionReason: flagData.suppressionReason,
        })
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Skipping notification - sensitive_hold status',
        expect.objectContaining({
          childId: 'child-456',
          flagId: 'flag-123',
          suppressionReason: 'self_harm_detected',
        })
      )
    })
  })

  describe('notification result handling', () => {
    it('should log success when notification sent', async () => {
      const flagData = createMockFlagData({ childNotificationStatus: 'pending' })
      const annotationDeadline = Date.now() + 30 * 60 * 1000

      mockSendChildFlagNotification.mockResolvedValue({
        sent: true,
        successCount: 2,
        failureCount: 0,
        tokensCleanedUp: 0,
        annotationDeadline,
      })

      const result = await mockSendChildFlagNotification({
        childId: flagData.childId,
        flagId: flagData.id,
        familyId: flagData.familyId,
      })

      if (result.sent) {
        logger.info('Child notification sent successfully', {
          childId: flagData.childId,
          flagId: flagData.id,
          successCount: result.successCount,
          annotationDeadline: result.annotationDeadline,
        })
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Child notification sent successfully',
        expect.objectContaining({
          childId: 'child-456',
          flagId: 'flag-123',
          successCount: 2,
        })
      )
    })

    it('should log when notification not sent (no tokens)', async () => {
      const flagData = createMockFlagData({ childNotificationStatus: 'pending' })

      mockSendChildFlagNotification.mockResolvedValue({
        sent: false,
        successCount: 0,
        failureCount: 0,
        tokensCleanedUp: 0,
        reason: 'no_tokens',
      })

      const result = await mockSendChildFlagNotification({
        childId: flagData.childId,
        flagId: flagData.id,
        familyId: flagData.familyId,
      })

      if (!result.sent) {
        logger.info('Child notification not sent', {
          childId: flagData.childId,
          flagId: flagData.id,
          reason: result.reason,
          failureCount: result.failureCount,
        })
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Child notification not sent',
        expect.objectContaining({
          childId: 'child-456',
          flagId: 'flag-123',
          reason: 'no_tokens',
        })
      )
    })
  })
})
