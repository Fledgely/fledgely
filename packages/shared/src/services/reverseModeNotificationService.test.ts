/**
 * Reverse Mode Notification Service Tests - Story 52.2 Task 4
 *
 * Tests for notification payload creation for reverse mode changes.
 */

import { describe, it, expect } from 'vitest'
import {
  createReverseModeActivationNotification,
  createReverseModeDeactivationNotification,
  createReverseModeNotificationsForParents,
  getReverseModeNotificationTitle,
  getSupportingIndependenceLink,
} from './reverseModeNotificationService'

describe('reverseModeNotificationService', () => {
  describe('createReverseModeActivationNotification', () => {
    it('creates notification with correct type', () => {
      const notification = createReverseModeActivationNotification('child-1', 'Alex')
      expect(notification.type).toBe('reverse_mode_activated')
    })

    it('creates notification with correct title', () => {
      const notification = createReverseModeActivationNotification('child-1', 'Alex')
      expect(notification.title).toBe('Reverse Mode Update')
    })

    it('creates notification with personalized message (AC4)', () => {
      const notification = createReverseModeActivationNotification('child-1', 'Alex')
      expect(notification.message).toContain('Alex')
      expect(notification.message).toContain('Reverse Mode')
    })

    it('includes resource link for supporting independence', () => {
      const notification = createReverseModeActivationNotification('child-1', 'Alex')
      expect(notification.resourceLink).toContain('supporting-teen-independence')
    })

    it('includes child ID and name', () => {
      const notification = createReverseModeActivationNotification('child-123', 'Jordan')
      expect(notification.childId).toBe('child-123')
      expect(notification.childName).toBe('Jordan')
    })

    it('sets createdAt to current time', () => {
      const before = new Date()
      const notification = createReverseModeActivationNotification('child-1', 'Alex')
      const after = new Date()

      expect(notification.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(notification.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('createReverseModeDeactivationNotification', () => {
    it('creates notification with correct type', () => {
      const notification = createReverseModeDeactivationNotification('child-1', 'Alex')
      expect(notification.type).toBe('reverse_mode_deactivated')
    })

    it('creates notification with personalized deactivation message', () => {
      const notification = createReverseModeDeactivationNotification('child-1', 'Alex')
      expect(notification.message).toContain('Alex')
      expect(notification.message).toContain('deactivated')
    })

    it('includes resource link', () => {
      const notification = createReverseModeDeactivationNotification('child-1', 'Alex')
      expect(notification.resourceLink).toBeTruthy()
    })
  })

  describe('createReverseModeNotificationsForParents', () => {
    it('creates notifications for each parent', () => {
      const parentIds = ['parent-1', 'parent-2', 'parent-3']
      const notifications = createReverseModeNotificationsForParents(
        parentIds,
        'child-1',
        'Alex',
        true
      )

      expect(notifications).toHaveLength(3)
      expect(notifications[0].recipientId).toBe('parent-1')
      expect(notifications[1].recipientId).toBe('parent-2')
      expect(notifications[2].recipientId).toBe('parent-3')
    })

    it('creates activation notifications when isActivation is true', () => {
      const notifications = createReverseModeNotificationsForParents(
        ['parent-1'],
        'child-1',
        'Alex',
        true
      )

      expect(notifications[0].payload.type).toBe('reverse_mode_activated')
    })

    it('creates deactivation notifications when isActivation is false', () => {
      const notifications = createReverseModeNotificationsForParents(
        ['parent-1'],
        'child-1',
        'Alex',
        false
      )

      expect(notifications[0].payload.type).toBe('reverse_mode_deactivated')
    })

    it('returns empty array for empty parentIds', () => {
      const notifications = createReverseModeNotificationsForParents([], 'child-1', 'Alex', true)
      expect(notifications).toHaveLength(0)
    })

    it('includes correct child info in all notifications', () => {
      const notifications = createReverseModeNotificationsForParents(
        ['parent-1', 'parent-2'],
        'child-123',
        'Jordan',
        true
      )

      notifications.forEach((n) => {
        expect(n.payload.childId).toBe('child-123')
        expect(n.payload.childName).toBe('Jordan')
      })
    })
  })

  describe('getReverseModeNotificationTitle', () => {
    it('returns consistent title', () => {
      expect(getReverseModeNotificationTitle()).toBe('Reverse Mode Update')
    })
  })

  describe('getSupportingIndependenceLink', () => {
    it('returns link to supporting independence resources', () => {
      const link = getSupportingIndependenceLink()
      expect(link).toContain('supporting-teen-independence')
    })
  })
})
