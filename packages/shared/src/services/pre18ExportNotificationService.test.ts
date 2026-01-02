/**
 * Pre18 Export Notification Service Tests - Story 38.6 Task 4
 *
 * Tests for sending pre-18 export notifications.
 * AC1: Parent notified "Data will be deleted in 30 days"
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  sendPre18ExportAvailableNotification,
  sendExportConsentRequestNotification,
  sendExportReadyNotification,
  sendConsentRequestToChild,
  sendExportCompletedToChild,
  getPre18ExportMessage,
  getConsentRequestMessage,
  getNotificationsForParent,
  getNotificationsForChild,
  clearAllNotificationData,
} from './pre18ExportNotificationService'

describe('Pre18ExportNotificationService', () => {
  beforeEach(() => {
    clearAllNotificationData()
  })

  // ============================================
  // Parent Notification Tests (AC1)
  // ============================================

  describe('sendPre18ExportAvailableNotification (AC1)', () => {
    it('should send notification to parent', () => {
      const notification = sendPre18ExportAvailableNotification('parent-123', 'child-456', 30)

      expect(notification).not.toBeNull()
      expect(notification.recipientId).toBe('parent-123')
      expect(notification.type).toBe('pre18_export_available')
    })

    it('should include days until 18 in notification', () => {
      const notification = sendPre18ExportAvailableNotification('parent-123', 'child-456', 30)

      expect(notification.daysUntil18).toBe(30)
    })

    it('should include child ID in notification', () => {
      const notification = sendPre18ExportAvailableNotification('parent-123', 'child-456', 30)

      expect(notification.childId).toBe('child-456')
    })

    it('should set sent timestamp', () => {
      const before = new Date()
      const notification = sendPre18ExportAvailableNotification('parent-123', 'child-456', 30)
      const after = new Date()

      expect(notification.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(notification.sentAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('sendExportConsentRequestNotification', () => {
    it('should send consent request notification to child', () => {
      const notification = sendExportConsentRequestNotification('child-456')

      expect(notification).not.toBeNull()
      expect(notification.recipientId).toBe('child-456')
      expect(notification.type).toBe('export_consent_request')
    })
  })

  describe('sendExportReadyNotification', () => {
    it('should send export ready notification to parent', () => {
      const notification = sendExportReadyNotification(
        'parent-123',
        'https://export.example.com/file.zip'
      )

      expect(notification).not.toBeNull()
      expect(notification.recipientId).toBe('parent-123')
      expect(notification.type).toBe('export_ready')
      expect(notification.exportUrl).toBe('https://export.example.com/file.zip')
    })
  })

  // ============================================
  // Child Notification Tests
  // ============================================

  describe('sendConsentRequestToChild', () => {
    it('should send consent request to child', () => {
      const notification = sendConsentRequestToChild('child-456', 'parent-123')

      expect(notification).not.toBeNull()
      expect(notification.recipientId).toBe('child-456')
      expect(notification.requestedBy).toBe('parent-123')
      expect(notification.type).toBe('export_consent_request')
    })
  })

  describe('sendExportCompletedToChild', () => {
    it('should notify child that export completed', () => {
      const notification = sendExportCompletedToChild('child-456')

      expect(notification).not.toBeNull()
      expect(notification.recipientId).toBe('child-456')
      expect(notification.type).toBe('export_completed')
    })
  })

  // ============================================
  // Message Content Tests (AC1)
  // ============================================

  describe('getPre18ExportMessage (AC1)', () => {
    it('should include days until deletion', () => {
      const message = getPre18ExportMessage(30)

      expect(message).toContain('30')
      expect(message.toLowerCase()).toContain('day')
    })

    it('should mention data deletion', () => {
      const message = getPre18ExportMessage(30)

      expect(message.toLowerCase()).toContain('deleted')
    })

    it('should handle 1 day correctly', () => {
      const message = getPre18ExportMessage(1)

      expect(message).toContain('1')
      // Should use singular 'day' not 'days'
      expect(message).toMatch(/1\s+day(?!s)/i)
    })

    it('should handle multiple days', () => {
      const message = getPre18ExportMessage(15)

      expect(message).toContain('15')
      expect(message).toMatch(/days/i)
    })
  })

  describe('getConsentRequestMessage', () => {
    it('should explain consent request', () => {
      const message = getConsentRequestMessage()

      expect(message.toLowerCase()).toContain('consent')
      expect(message.toLowerCase()).toContain('export')
    })

    it('should emphasize child choice', () => {
      const message = getConsentRequestMessage()

      // Should indicate child has choice
      expect(message.toLowerCase()).toMatch(/you|your|choice|decide/)
    })
  })

  // ============================================
  // Notification Retrieval Tests
  // ============================================

  describe('getNotificationsForParent', () => {
    it('should retrieve notifications for parent', () => {
      sendPre18ExportAvailableNotification('parent-123', 'child-456', 30)
      sendExportReadyNotification('parent-123', 'https://example.com')

      const notifications = getNotificationsForParent('parent-123')

      expect(notifications).toHaveLength(2)
    })

    it('should return empty array for parent with no notifications', () => {
      const notifications = getNotificationsForParent('parent-no-notifications')

      expect(notifications).toHaveLength(0)
    })
  })

  describe('getNotificationsForChild', () => {
    it('should retrieve notifications for child', () => {
      sendConsentRequestToChild('child-456', 'parent-123')
      sendExportCompletedToChild('child-456')

      const notifications = getNotificationsForChild('child-456')

      expect(notifications).toHaveLength(2)
    })

    it('should return empty array for child with no notifications', () => {
      const notifications = getNotificationsForChild('child-no-notifications')

      expect(notifications).toHaveLength(0)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle 0 days until 18', () => {
      const message = getPre18ExportMessage(0)
      expect(message).toBeDefined()
    })

    it('should handle negative days (already 18)', () => {
      // This shouldn't happen in practice but service should handle it
      const message = getPre18ExportMessage(-1)
      expect(message).toBeDefined()
    })

    it('should store multiple notifications for same recipient', () => {
      sendPre18ExportAvailableNotification('parent-123', 'child-1', 30)
      sendPre18ExportAvailableNotification('parent-123', 'child-2', 25)

      const notifications = getNotificationsForParent('parent-123')
      expect(notifications).toHaveLength(2)
    })
  })
})
