/**
 * Age18NotificationService Tests - Story 38.5 Task 4
 *
 * Tests for notifying child of deletion.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAge18DeletionMessage,
  getPreDeletionMessage,
  sendDeletionCompleteNotification,
  sendPreDeletionNotification,
  getNotificationsForChild,
  markNotificationAcknowledged,
  clearAllNotificationData,
  getAge18DeletionMessageForViewer,
} from './age18NotificationService'

describe('Age18NotificationService', () => {
  beforeEach(() => {
    clearAllNotificationData()
  })

  // ============================================
  // Message Generation Tests (AC6)
  // ============================================

  describe('getAge18DeletionMessage', () => {
    it('should return the official deletion message (AC6)', () => {
      const message = getAge18DeletionMessage()
      expect(message).toBe("You're 18 - all data has been deleted")
    })
  })

  describe('getPreDeletionMessage', () => {
    it('should return pre-deletion message with days count', () => {
      const message = getPreDeletionMessage(30)
      expect(message).toContain('30')
      expect(message).toContain('deleted')
    })

    it('should return message for 1 day remaining', () => {
      const message = getPreDeletionMessage(1)
      expect(message).toContain('1')
      expect(message).toContain('day')
    })

    it('should return message for 7 days remaining', () => {
      const message = getPreDeletionMessage(7)
      expect(message).toContain('7')
    })
  })

  describe('getAge18DeletionMessageForViewer', () => {
    it('should return child-specific message', () => {
      const message = getAge18DeletionMessageForViewer('child')
      expect(message).toBe("You're 18 - all data has been deleted")
    })

    it('should return parent-specific message with child name', () => {
      const message = getAge18DeletionMessageForViewer('parent', 'Alex')
      expect(message).toContain('Alex')
      expect(message).toContain('18')
      expect(message).toContain('deleted')
    })
  })

  // ============================================
  // Notification Sending Tests
  // ============================================

  describe('sendDeletionCompleteNotification', () => {
    it('should create deletion complete notification', () => {
      const notification = sendDeletionCompleteNotification('child-123')

      expect(notification.id).toBeDefined()
      expect(notification.childId).toBe('child-123')
      expect(notification.type).toBe('deletion_complete')
      expect(notification.acknowledged).toBe(false)
    })

    it('should set sentAt timestamp', () => {
      const before = new Date()
      const notification = sendDeletionCompleteNotification('child-123')
      const after = new Date()

      expect(notification.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(notification.sentAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('sendPreDeletionNotification', () => {
    it('should create pre-deletion notification', () => {
      const notification = sendPreDeletionNotification('child-123', 30)

      expect(notification.id).toBeDefined()
      expect(notification.childId).toBe('child-123')
      expect(notification.type).toBe('pre_deletion')
      expect(notification.acknowledged).toBe(false)
    })

    it('should work with different day counts', () => {
      const notification7Days = sendPreDeletionNotification('child-1', 7)
      const notification1Day = sendPreDeletionNotification('child-2', 1)

      expect(notification7Days.type).toBe('pre_deletion')
      expect(notification1Day.type).toBe('pre_deletion')
    })
  })

  // ============================================
  // Notification Query Tests
  // ============================================

  describe('getNotificationsForChild', () => {
    it('should return all notifications for child', () => {
      sendDeletionCompleteNotification('child-123')
      sendPreDeletionNotification('child-123', 30)
      sendPreDeletionNotification('child-123', 7)

      const notifications = getNotificationsForChild('child-123')
      expect(notifications).toHaveLength(3)
    })

    it('should return empty array for child without notifications', () => {
      const notifications = getNotificationsForChild('nonexistent')
      expect(notifications).toHaveLength(0)
    })

    it('should not include other children notifications', () => {
      sendDeletionCompleteNotification('child-1')
      sendDeletionCompleteNotification('child-2')

      const notifications = getNotificationsForChild('child-1')
      expect(notifications).toHaveLength(1)
      expect(notifications[0].childId).toBe('child-1')
    })
  })

  // ============================================
  // Notification Acknowledgment Tests
  // ============================================

  describe('markNotificationAcknowledged', () => {
    it('should mark notification as acknowledged', () => {
      const notification = sendDeletionCompleteNotification('child-123')
      expect(notification.acknowledged).toBe(false)

      markNotificationAcknowledged(notification.id)

      const notifications = getNotificationsForChild('child-123')
      const updated = notifications.find((n) => n.id === notification.id)
      expect(updated?.acknowledged).toBe(true)
    })

    it('should throw for non-existent notification', () => {
      expect(() => markNotificationAcknowledged('nonexistent')).toThrow(/not found/i)
    })
  })

  // ============================================
  // Message Tone Tests
  // ============================================

  describe('Message tone and content', () => {
    it('should use celebratory tone in deletion message', () => {
      const message = getAge18DeletionMessage()
      // The message should be matter-of-fact but not punitive
      expect(message).not.toContain('sorry')
      expect(message).not.toContain('unfortunately')
    })

    it('should be clear and direct', () => {
      const message = getAge18DeletionMessage()
      // Message should be short and clear
      expect(message.length).toBeLessThan(60)
    })

    it('should emphasize transition to adulthood', () => {
      const message = getAge18DeletionMessage()
      expect(message).toContain('18')
    })
  })
})
