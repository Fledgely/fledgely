/**
 * Age 16 Transition Notification Service Tests - Story 52.1 Task 3
 *
 * Tests for notification message generation and notification management.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getChildPreTransitionMessage,
  getChildTransitionAvailableMessage,
  getParentPreTransitionMessage,
  getParentTransitionAvailableMessage,
  getAge16TransitionMessageForViewer,
  getPreTransitionMessageWithDays,
  getParentPreTransitionMessageWithDays,
  getAge16TransitionGuide,
  getAge16CelebrationMessage,
  sendPreTransitionNotification,
  sendTransitionAvailableNotification,
  getAge16NotificationsForChild,
  getAge16NotificationById,
  getUnacknowledgedAge16Notifications,
  wasPreTransitionNotificationSent,
  wasTransitionAvailableNotificationSent,
  markNotificationAcknowledged,
  dismissNotification,
  clearAllAge16NotificationData,
} from './age16TransitionNotificationService'

describe('age16TransitionNotificationService', () => {
  beforeEach(() => {
    clearAllAge16NotificationData()
  })

  describe('Message Generation', () => {
    describe('getChildPreTransitionMessage', () => {
      it('returns correct pre-transition message for child (AC1)', () => {
        const message = getChildPreTransitionMessage()
        expect(message).toBe('At 16, you gain new controls')
      })
    })

    describe('getChildTransitionAvailableMessage', () => {
      it('returns correct transition available message for child', () => {
        const message = getChildTransitionAvailableMessage()
        expect(message).toBe("You're 16! New features are available")
      })
    })

    describe('getParentPreTransitionMessage', () => {
      it('returns correct pre-transition message for parent (AC3)', () => {
        const message = getParentPreTransitionMessage()
        expect(message).toBe("Your child's controls are changing at 16")
      })
    })

    describe('getParentTransitionAvailableMessage', () => {
      it('returns correct transition available message with child name', () => {
        const message = getParentTransitionAvailableMessage('Alex')
        expect(message).toBe('Alex is 16 - they now have access to Reverse Mode')
      })
    })

    describe('getAge16TransitionMessageForViewer', () => {
      it('returns child pre-transition message for child viewer', () => {
        const message = getAge16TransitionMessageForViewer('child', 'pre_transition')
        expect(message).toBe('At 16, you gain new controls')
      })

      it('returns child transition available message for child viewer', () => {
        const message = getAge16TransitionMessageForViewer('child', 'transition_available')
        expect(message).toBe("You're 16! New features are available")
      })

      it('returns parent pre-transition message for parent viewer', () => {
        const message = getAge16TransitionMessageForViewer('parent', 'pre_transition')
        expect(message).toBe("Your child's controls are changing at 16")
      })

      it('returns parent transition available message with child name', () => {
        const message = getAge16TransitionMessageForViewer('parent', 'transition_available', 'Alex')
        expect(message).toBe('Alex is 16 - they now have access to Reverse Mode')
      })

      it('returns generic parent message when no child name provided', () => {
        const message = getAge16TransitionMessageForViewer('parent', 'transition_available')
        expect(message).toBe('Your child is 16 - they now have access to Reverse Mode')
      })
    })

    describe('getPreTransitionMessageWithDays', () => {
      it('returns message with singular day', () => {
        const message = getPreTransitionMessageWithDays(1)
        expect(message).toBe(
          "In 1 day, you'll turn 16 and gain new controls over your digital life"
        )
      })

      it('returns message with plural days', () => {
        const message = getPreTransitionMessageWithDays(30)
        expect(message).toBe(
          "In 30 days, you'll turn 16 and gain new controls over your digital life"
        )
      })
    })

    describe('getParentPreTransitionMessageWithDays', () => {
      it('returns message with child name and singular day', () => {
        const message = getParentPreTransitionMessageWithDays(1, 'Alex')
        expect(message).toBe('Alex turns 16 in 1 day. Their controls will change.')
      })

      it('returns message without child name', () => {
        const message = getParentPreTransitionMessageWithDays(15)
        expect(message).toBe('Your child turns 16 in 15 days. Their controls will change.')
      })
    })
  })

  describe('Guide Content (AC4)', () => {
    describe('getAge16TransitionGuide', () => {
      it('returns guide with correct title', () => {
        const guide = getAge16TransitionGuide()
        expect(guide.title).toBe("You're Growing Up!")
      })

      it('returns guide with 3 steps (AC2)', () => {
        const guide = getAge16TransitionGuide()
        expect(guide.steps).toHaveLength(3)
      })

      it('includes Reverse Mode explanation in step 1 (AC2)', () => {
        const guide = getAge16TransitionGuide()
        expect(guide.steps[0].title).toBe('What is Reverse Mode?')
        expect(guide.steps[0].description).toContain('Reverse Mode')
      })

      it('includes Trusted Adults explanation in step 2 (AC2)', () => {
        const guide = getAge16TransitionGuide()
        expect(guide.steps[1].title).toBe('Trusted Adults')
        expect(guide.steps[1].description).toContain('trusted adults')
      })

      it('includes privacy controls in step 3', () => {
        const guide = getAge16TransitionGuide()
        expect(guide.steps[2].title).toBe('Your Privacy Controls')
      })

      it('includes celebration message (AC4)', () => {
        const guide = getAge16TransitionGuide()
        expect(guide.celebrationMessage).toContain('growing up')
      })
    })

    describe('getAge16CelebrationMessage', () => {
      it('returns celebration message (AC4)', () => {
        const message = getAge16CelebrationMessage()
        expect(message).toContain('growing up')
        expect(message).toContain('independence')
      })
    })
  })

  describe('Notification Sending', () => {
    describe('sendPreTransitionNotification', () => {
      it('creates pre-transition notification', () => {
        const notification = sendPreTransitionNotification('child-1', 'family-1', 30)

        expect(notification.childId).toBe('child-1')
        expect(notification.familyId).toBe('family-1')
        expect(notification.type).toBe('pre_transition')
        expect(notification.daysUntil16).toBe(30)
        expect(notification.acknowledged).toBe(false)
        expect(notification.dismissed).toBe(false)
      })

      it('generates unique notification ID', () => {
        const notif1 = sendPreTransitionNotification('child-1', 'family-1', 30)
        const notif2 = sendPreTransitionNotification('child-2', 'family-1', 25)

        expect(notif1.id).not.toBe(notif2.id)
      })

      it('stores notification for retrieval', () => {
        const sent = sendPreTransitionNotification('child-1', 'family-1', 30)
        const retrieved = getAge16NotificationById(sent.id)

        expect(retrieved).toEqual(sent)
      })
    })

    describe('sendTransitionAvailableNotification', () => {
      it('creates transition available notification', () => {
        const notification = sendTransitionAvailableNotification('child-1', 'family-1')

        expect(notification.childId).toBe('child-1')
        expect(notification.type).toBe('transition_available')
        expect(notification.daysUntil16).toBeUndefined()
      })
    })
  })

  describe('Notification Queries', () => {
    describe('getAge16NotificationsForChild', () => {
      it('returns empty array for child with no notifications', () => {
        const notifications = getAge16NotificationsForChild('child-1')
        expect(notifications).toEqual([])
      })

      it('returns all notifications for a child', () => {
        sendPreTransitionNotification('child-1', 'family-1', 30)
        sendTransitionAvailableNotification('child-1', 'family-1')

        const notifications = getAge16NotificationsForChild('child-1')
        expect(notifications).toHaveLength(2)
      })

      it('does not return notifications for other children', () => {
        sendPreTransitionNotification('child-1', 'family-1', 30)
        sendPreTransitionNotification('child-2', 'family-1', 25)

        const notifications = getAge16NotificationsForChild('child-1')
        expect(notifications).toHaveLength(1)
        expect(notifications[0].childId).toBe('child-1')
      })
    })

    describe('getUnacknowledgedAge16Notifications', () => {
      it('returns unacknowledged and not dismissed notifications', () => {
        const notif1 = sendPreTransitionNotification('child-1', 'family-1', 30)
        sendPreTransitionNotification('child-1', 'family-1', 25)

        markNotificationAcknowledged(notif1.id)

        const unacknowledged = getUnacknowledgedAge16Notifications('child-1')
        expect(unacknowledged).toHaveLength(1)
      })

      it('excludes dismissed notifications', () => {
        const notif1 = sendPreTransitionNotification('child-1', 'family-1', 30)

        dismissNotification(notif1.id)

        const unacknowledged = getUnacknowledgedAge16Notifications('child-1')
        expect(unacknowledged).toHaveLength(0)
      })
    })

    describe('wasPreTransitionNotificationSent', () => {
      it('returns false when no notification sent', () => {
        expect(wasPreTransitionNotificationSent('child-1')).toBe(false)
      })

      it('returns true when pre-transition notification sent', () => {
        sendPreTransitionNotification('child-1', 'family-1', 30)
        expect(wasPreTransitionNotificationSent('child-1')).toBe(true)
      })

      it('returns false for different notification type', () => {
        sendTransitionAvailableNotification('child-1', 'family-1')
        expect(wasPreTransitionNotificationSent('child-1')).toBe(false)
      })
    })

    describe('wasTransitionAvailableNotificationSent', () => {
      it('returns false when no notification sent', () => {
        expect(wasTransitionAvailableNotificationSent('child-1')).toBe(false)
      })

      it('returns true when transition available notification sent', () => {
        sendTransitionAvailableNotification('child-1', 'family-1')
        expect(wasTransitionAvailableNotificationSent('child-1')).toBe(true)
      })
    })
  })

  describe('Notification Acknowledgment (AC5)', () => {
    describe('markNotificationAcknowledged', () => {
      it('marks notification as acknowledged', () => {
        const notification = sendPreTransitionNotification('child-1', 'family-1', 30)

        markNotificationAcknowledged(notification.id)

        const retrieved = getAge16NotificationById(notification.id)
        expect(retrieved?.acknowledged).toBe(true)
        expect(retrieved?.acknowledgedAt).toBeDefined()
      })

      it('throws error for non-existent notification', () => {
        expect(() => markNotificationAcknowledged('non-existent')).toThrow(
          'Notification not found: non-existent'
        )
      })
    })

    describe('dismissNotification', () => {
      it('marks notification as dismissed (AC5)', () => {
        const notification = sendPreTransitionNotification('child-1', 'family-1', 30)

        dismissNotification(notification.id)

        const retrieved = getAge16NotificationById(notification.id)
        expect(retrieved?.dismissed).toBe(true)
      })

      it('throws error for non-existent notification', () => {
        expect(() => dismissNotification('non-existent')).toThrow(
          'Notification not found: non-existent'
        )
      })
    })
  })
})
