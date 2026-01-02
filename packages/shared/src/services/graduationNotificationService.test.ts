/**
 * Graduation Notification Service Tests - Story 38.2 Task 3
 *
 * Tests for graduation notification generation.
 * AC2: Notification sent to BOTH child AND parent about eligibility
 * AC4: System suggests: "Your child has shown consistent responsibility"
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  getChildEligibilityNotification,
  getParentEligibilityNotification,
  getChildAcknowledgmentPrompt,
  getParentAcknowledgmentPrompt,
  getAcknowledgmentButtonLabel,
  getReminderNotification,
  getScheduledNotification,
  getOverdueNotification,
  getAcknowledgmentNeededNotification,
  getPendingNotifications,
  getNotificationSummary,
  getCelebratoryMessage,
  getResponsibilityAcknowledgmentMessage,
  GRADUATION_NOTIFICATION_MESSAGES,
  ACKNOWLEDGMENT_PROMPTS,
} from './graduationNotificationService'
import { GraduationConversation } from '../contracts/graduationConversation'

describe('GraduationNotificationService - Story 38.2 Task 3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Constants', () => {
    it('should have eligibility messages', () => {
      expect(GRADUATION_NOTIFICATION_MESSAGES.eligibility.child.title).toBeDefined()
      expect(GRADUATION_NOTIFICATION_MESSAGES.eligibility.parent.title).toBeDefined()
    })

    it('should have acknowledgment prompts', () => {
      expect(ACKNOWLEDGMENT_PROMPTS.child.prompt).toBeDefined()
      expect(ACKNOWLEDGMENT_PROMPTS.parent.prompt).toBeDefined()
    })
  })

  describe('getChildEligibilityNotification', () => {
    it('should return eligibility notification for child', () => {
      const notification = getChildEligibilityNotification('conv-123')

      expect(notification.title).toContain('Congratulations')
      expect(notification.message).toContain('100% trust')
      expect(notification.message).toContain('12 consecutive months')
      expect(notification.type).toBe('graduation_eligible')
      expect(notification.priority).toBe('high')
    })

    it('should include action URL', () => {
      const notification = getChildEligibilityNotification('conv-123')

      expect(notification.actionLabel).toBe('View Details')
      expect(notification.actionUrl).toContain('conv-123')
    })
  })

  describe('getParentEligibilityNotification', () => {
    it('should return eligibility notification for parent', () => {
      const notification = getParentEligibilityNotification('Emma', 'conv-123')

      expect(notification.title).toContain('Emma')
      expect(notification.message).toContain('Emma')
      expect(notification.message).toContain('consistent responsibility')
      expect(notification.type).toBe('graduation_eligible')
      expect(notification.priority).toBe('high')
    })

    it('should include action URL', () => {
      const notification = getParentEligibilityNotification('Emma', 'conv-123')

      expect(notification.actionUrl).toContain('conv-123')
    })
  })

  describe('Acknowledgment Prompts', () => {
    describe('getChildAcknowledgmentPrompt', () => {
      it('should return child acknowledgment prompt', () => {
        const prompt = getChildAcknowledgmentPrompt()

        expect(prompt).toContain('ready to have a conversation')
        expect(prompt).toContain('graduating from monitoring')
      })
    })

    describe('getParentAcknowledgmentPrompt', () => {
      it('should return parent acknowledgment prompt with child name', () => {
        const prompt = getParentAcknowledgmentPrompt('Emma')

        expect(prompt).toContain('Emma')
        expect(prompt).toContain('digital independence')
      })
    })

    describe('getAcknowledgmentButtonLabel', () => {
      it('should return child button label', () => {
        const label = getAcknowledgmentButtonLabel('child')
        expect(label).toBe("I'm Ready")
      })

      it('should return parent button label', () => {
        const label = getAcknowledgmentButtonLabel('parent')
        expect(label).toBe('Ready to Discuss')
      })
    })
  })

  describe('getReminderNotification', () => {
    it('should return reminder for child', () => {
      const notification = getReminderNotification('child', 'Emma', 15, 'conv-123')

      expect(notification.title).toContain('Reminder')
      expect(notification.message).toContain('15 days remaining')
      expect(notification.type).toBe('conversation_reminder')
      expect(notification.priority).toBe('normal')
    })

    it('should return reminder for parent with child name', () => {
      const notification = getReminderNotification('parent', 'Emma', 10, 'conv-123')

      expect(notification.message).toContain('Emma')
      expect(notification.message).toContain('10 days remaining')
    })
  })

  describe('getScheduledNotification', () => {
    it('should return scheduled notification for child', () => {
      const scheduledDate = new Date('2025-12-15')
      const notification = getScheduledNotification('child', 'Emma', scheduledDate, 'conv-123')

      expect(notification.title).toContain('Scheduled')
      expect(notification.message).toContain('December')
      expect(notification.message).toContain('15')
      expect(notification.type).toBe('conversation_scheduled')
    })

    it('should return scheduled notification for parent', () => {
      const scheduledDate = new Date('2025-12-15')
      const notification = getScheduledNotification('parent', 'Emma', scheduledDate, 'conv-123')

      expect(notification.message).toContain('Emma')
      expect(notification.message).toContain('December')
    })
  })

  describe('getOverdueNotification', () => {
    it('should return overdue notification for child', () => {
      const notification = getOverdueNotification('child', 'Emma', 'conv-123')

      expect(notification.title).toContain('Overdue')
      expect(notification.message).toContain('overdue')
      expect(notification.type).toBe('conversation_overdue')
      expect(notification.priority).toBe('high')
    })

    it('should return overdue notification for parent with child name', () => {
      const notification = getOverdueNotification('parent', 'Emma', 'conv-123')

      expect(notification.message).toContain('Emma')
      expect(notification.message).toContain('overdue')
    })

    it('should have schedule action', () => {
      const notification = getOverdueNotification('child', 'Emma', 'conv-123')

      expect(notification.actionLabel).toBe('Schedule Now')
    })
  })

  describe('getAcknowledgmentNeededNotification', () => {
    it('should return acknowledgment needed for child', () => {
      const notification = getAcknowledgmentNeededNotification('child', 'conv-123')

      expect(notification.title).toContain('Acknowledgment')
      expect(notification.type).toBe('acknowledgment_needed')
    })

    it('should return acknowledgment needed for parent', () => {
      const notification = getAcknowledgmentNeededNotification('parent', 'conv-123')

      expect(notification.title).toContain('Acknowledgment')
      expect(notification.actionLabel).toBe('Acknowledge')
    })
  })

  describe('getPendingNotifications', () => {
    it('should return notifications for all missing acknowledgments', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'pending',
        childAcknowledgment: null,
        parentAcknowledgments: [],
        requiredParentIds: ['parent-1', 'parent-2'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const notifications = getPendingNotifications(conversation, 'Emma')

      expect(notifications).toHaveLength(3)
      expect(notifications.some((n) => n.recipientType === 'child')).toBe(true)
      expect(notifications.filter((n) => n.recipientType === 'parent')).toHaveLength(2)
    })

    it('should not return notification for acknowledged parties', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'pending',
        childAcknowledgment: {
          userId: 'child-789',
          role: 'child',
          acknowledgedAt: new Date(),
        },
        parentAcknowledgments: [{ userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() }],
        requiredParentIds: ['parent-1', 'parent-2'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const notifications = getPendingNotifications(conversation, 'Emma')

      expect(notifications).toHaveLength(1)
      expect(notifications[0].recipientId).toBe('parent-2')
    })

    it('should return empty array when all acknowledged', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'acknowledged',
        childAcknowledgment: {
          userId: 'child-789',
          role: 'child',
          acknowledgedAt: new Date(),
        },
        parentAcknowledgments: [
          { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
          { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
        ],
        requiredParentIds: ['parent-1', 'parent-2'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const notifications = getPendingNotifications(conversation, 'Emma')

      expect(notifications).toHaveLength(0)
    })
  })

  describe('getNotificationSummary', () => {
    it('should return pending summary for child viewer', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'pending',
        childAcknowledgment: null,
        parentAcknowledgments: [],
        requiredParentIds: ['parent-1'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const summary = getNotificationSummary(conversation, 'child', 'Emma')

      expect(summary).toContain('Waiting for acknowledgment')
      expect(summary).toContain('you')
      expect(summary).toContain('30 days remaining')
    })

    it('should return pending summary for parent viewer', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'pending',
        childAcknowledgment: null,
        parentAcknowledgments: [],
        requiredParentIds: ['parent-1'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const summary = getNotificationSummary(conversation, 'parent', 'Emma')

      expect(summary).toContain('Waiting for acknowledgment')
      expect(summary).toContain('Emma')
    })

    it('should return acknowledged summary', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'acknowledged',
        childAcknowledgment: {
          userId: 'child-789',
          role: 'child',
          acknowledgedAt: new Date(),
        },
        parentAcknowledgments: [{ userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() }],
        requiredParentIds: ['parent-1'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const summary = getNotificationSummary(conversation, 'child', 'Emma')

      expect(summary).toContain('All parties have acknowledged')
      expect(summary).toContain('schedule')
    })

    it('should return scheduled summary', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'scheduled',
        childAcknowledgment: {
          userId: 'child-789',
          role: 'child',
          acknowledgedAt: new Date(),
        },
        parentAcknowledgments: [{ userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() }],
        requiredParentIds: ['parent-1'],
        scheduledDate: new Date('2025-12-15'),
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const summary = getNotificationSummary(conversation, 'child', 'Emma')

      expect(summary).toContain('scheduled')
      expect(summary).toContain('December')
    })

    it('should return completed graduated summary', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date(),
        expiresAt: new Date('2025-12-31'),
        status: 'completed',
        childAcknowledgment: {
          userId: 'child-789',
          role: 'child',
          acknowledgedAt: new Date(),
        },
        parentAcknowledgments: [{ userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() }],
        requiredParentIds: ['parent-1'],
        scheduledDate: new Date('2025-12-15'),
        completedAt: new Date('2025-12-20'),
        outcome: 'graduated',
        remindersSent: 0,
        lastReminderAt: null,
      }

      const summary = getNotificationSummary(conversation, 'child', 'Emma')

      expect(summary).toContain('Graduation complete')
      expect(summary).toContain('Congratulations')
    })

    it('should return expired summary', () => {
      const conversation: GraduationConversation = {
        id: 'conv-123',
        familyId: 'family-456',
        childId: 'child-789',
        initiatedAt: new Date('2025-11-01'),
        expiresAt: new Date('2025-11-30'),
        status: 'expired',
        childAcknowledgment: null,
        parentAcknowledgments: [],
        requiredParentIds: ['parent-1'],
        scheduledDate: null,
        completedAt: null,
        outcome: null,
        remindersSent: 0,
        lastReminderAt: null,
      }

      const summary = getNotificationSummary(conversation, 'child', 'Emma')

      expect(summary).toContain('expired')
    })
  })

  describe('getCelebratoryMessage', () => {
    it('should return celebratory message for child', () => {
      const message = getCelebratoryMessage('child')

      expect(message).toContain('Congratulations')
      expect(message).toContain('12 months')
      expect(message).toContain('responsible')
    })

    it('should return celebratory message for parent with child name', () => {
      const message = getCelebratoryMessage('parent', 'Emma')

      expect(message).toContain('Congratulations')
      expect(message).toContain('Emma')
      expect(message).toContain('responsibility')
    })

    it('should return celebratory message for parent without child name', () => {
      const message = getCelebratoryMessage('parent')

      expect(message).toContain('Your child')
    })
  })

  describe('getResponsibilityAcknowledgmentMessage', () => {
    it('should return responsibility acknowledgment message', () => {
      const message = getResponsibilityAcknowledgmentMessage('Emma')

      expect(message).toContain('Emma')
      expect(message).toContain('consistent responsibility')
      expect(message).toContain('12 consecutive months')
      expect(message).toContain('digital independence')
    })
  })

  describe('AC Verification', () => {
    describe('AC2: Notification sent to BOTH child AND parent', () => {
      it('should generate child eligibility notification', () => {
        const notification = getChildEligibilityNotification('conv-123')

        expect(notification.type).toBe('graduation_eligible')
        expect(notification.message).toBeTruthy()
      })

      it('should generate parent eligibility notification', () => {
        const notification = getParentEligibilityNotification('Emma', 'conv-123')

        expect(notification.type).toBe('graduation_eligible')
        expect(notification.message).toBeTruthy()
      })
    })

    describe('AC4: System suggests child has shown consistent responsibility', () => {
      it('should mention consistent responsibility in parent notification', () => {
        const notification = getParentEligibilityNotification('Emma', 'conv-123')

        expect(notification.message).toContain('consistent responsibility')
      })

      it('should have responsibility acknowledgment message', () => {
        const message = getResponsibilityAcknowledgmentMessage('Emma')

        expect(message).toContain('consistent responsibility')
        expect(message).toContain('maturity')
        expect(message).toContain('readiness')
      })
    })

    describe('AC7: Respects child demonstrated readiness', () => {
      it('should use positive framing for child', () => {
        const notification = getChildEligibilityNotification('conv-123')

        expect(notification.message).toContain('amazing achievement')
        expect(notification.message).toContain('responsibility')
        expect(notification.message).not.toContain('must')
        expect(notification.message).not.toContain('required')
      })

      it('should use celebratory language', () => {
        const message = getCelebratoryMessage('child')

        expect(message).toContain('earned')
        expect(message).toContain('milestone')
        expect(message).not.toContain('finally')
        expect(message).not.toContain('about time')
      })
    })
  })
})
