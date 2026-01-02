/**
 * Graduation Notification Service - Story 38.2 Task 3
 *
 * Service for generating graduation-related notifications.
 * AC2: Notification sent to BOTH child AND parent about eligibility
 * AC4: System suggests: "Your child has shown consistent responsibility"
 */

import {
  NotificationContent,
  GraduationConversation,
  GraduationNotificationType as _GraduationNotificationType,
  getConversationDaysUntilExpiry,
  getMissingAcknowledgments,
} from '../contracts/graduationConversation'
import { ViewerType } from '../contracts/graduationEligibility'

// ============================================
// Notification Messages
// ============================================

export const GRADUATION_NOTIFICATION_MESSAGES = {
  eligibility: {
    child: {
      title: 'Congratulations! Graduation Eligible',
      message:
        "You've maintained 100% trust for 12 consecutive months! This is an amazing achievement that shows your consistent responsibility. It's time to have a graduation conversation with your family.",
    },
    parent: {
      title: 'Your Child is Graduation Eligible',
      message:
        "Your child has shown consistent responsibility by maintaining 100% trust for 12 consecutive months. It's time to discuss the next steps in their digital independence journey.",
    },
  },
  acknowledgmentNeeded: {
    child: {
      title: 'Acknowledgment Needed',
      message:
        "Your graduation conversation is waiting for your acknowledgment. Let your family know you're ready to discuss your digital independence.",
    },
    parent: {
      title: 'Acknowledgment Needed',
      message:
        "Please acknowledge that you're ready to have the graduation conversation with your child. This milestone is worth celebrating together.",
    },
  },
  reminder: {
    child: {
      title: 'Graduation Conversation Reminder',
      getMessage: (daysRemaining: number) =>
        `Don't forget about your graduation conversation! You have ${daysRemaining} days remaining to schedule it.`,
    },
    parent: {
      title: 'Graduation Conversation Reminder',
      getMessage: (daysRemaining: number, childName: string) =>
        `Reminder: ${childName}'s graduation conversation needs attention. ${daysRemaining} days remaining to schedule it.`,
    },
  },
  scheduled: {
    child: {
      title: 'Conversation Scheduled',
      getMessage: (date: Date) =>
        `Your graduation conversation is scheduled for ${formatDate(date)}. This is an exciting milestone!`,
    },
    parent: {
      title: 'Graduation Conversation Scheduled',
      getMessage: (date: Date, childName: string) =>
        `${childName}'s graduation conversation is scheduled for ${formatDate(date)}.`,
    },
  },
  overdue: {
    child: {
      title: 'Conversation Overdue',
      message:
        'Your graduation conversation is overdue. Please work with your family to schedule it soon.',
    },
    parent: {
      title: 'Graduation Conversation Overdue',
      getMessage: (childName: string) =>
        `The graduation conversation with ${childName} is overdue. Please schedule it as soon as possible.`,
    },
  },
} as const

// ============================================
// Acknowledgment Prompts
// ============================================

export const ACKNOWLEDGMENT_PROMPTS = {
  child: {
    prompt:
      "By acknowledging, you're confirming that you're ready to have a conversation about graduating from monitoring. This is a big step!",
    buttonLabel: "I'm Ready",
  },
  parent: {
    prompt:
      "By acknowledging, you're confirming that you're ready to discuss your child's transition to greater digital independence.",
    buttonLabel: 'Ready to Discuss',
    getPromptWithName: (childName: string) =>
      `By acknowledging, you're confirming that you're ready to discuss ${childName}'s transition to greater digital independence.`,
  },
} as const

// ============================================
// Helper Functions
// ============================================

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get action URL for notification.
 */
function getActionUrl(conversationId: string): string {
  return `/graduation/conversation/${conversationId}`
}

// ============================================
// Notification Generation Functions
// ============================================

/**
 * Get notification for child reaching eligibility.
 * AC2: Notification sent to child about eligibility
 */
export function getChildEligibilityNotification(conversationId: string): NotificationContent {
  return {
    title: GRADUATION_NOTIFICATION_MESSAGES.eligibility.child.title,
    message: GRADUATION_NOTIFICATION_MESSAGES.eligibility.child.message,
    type: 'graduation_eligible',
    priority: 'high',
    actionLabel: 'View Details',
    actionUrl: getActionUrl(conversationId),
  }
}

/**
 * Get notification for parent about child's eligibility.
 * AC2: Notification sent to parent about eligibility
 * AC4: System suggests: "Your child has shown consistent responsibility"
 */
export function getParentEligibilityNotification(
  childName: string,
  conversationId: string
): NotificationContent {
  const baseMessage = GRADUATION_NOTIFICATION_MESSAGES.eligibility.parent.message

  // Personalize message with child name
  const message = baseMessage.replace('Your child', childName)

  return {
    title: GRADUATION_NOTIFICATION_MESSAGES.eligibility.parent.title.replace(
      'Your Child',
      childName
    ),
    message,
    type: 'graduation_eligible',
    priority: 'high',
    actionLabel: 'View Details',
    actionUrl: getActionUrl(conversationId),
  }
}

/**
 * Get acknowledgment prompt for child.
 */
export function getChildAcknowledgmentPrompt(): string {
  return ACKNOWLEDGMENT_PROMPTS.child.prompt
}

/**
 * Get acknowledgment prompt for parent.
 */
export function getParentAcknowledgmentPrompt(childName: string): string {
  return ACKNOWLEDGMENT_PROMPTS.parent.getPromptWithName(childName)
}

/**
 * Get acknowledgment button label.
 */
export function getAcknowledgmentButtonLabel(viewerType: ViewerType): string {
  return viewerType === 'child'
    ? ACKNOWLEDGMENT_PROMPTS.child.buttonLabel
    : ACKNOWLEDGMENT_PROMPTS.parent.buttonLabel
}

/**
 * Get reminder notification.
 */
export function getReminderNotification(
  recipientType: 'child' | 'parent',
  childName: string,
  daysRemaining: number,
  conversationId: string
): NotificationContent {
  const message =
    recipientType === 'child'
      ? GRADUATION_NOTIFICATION_MESSAGES.reminder.child.getMessage(daysRemaining)
      : GRADUATION_NOTIFICATION_MESSAGES.reminder.parent.getMessage(daysRemaining, childName)

  return {
    title:
      recipientType === 'child'
        ? GRADUATION_NOTIFICATION_MESSAGES.reminder.child.title
        : GRADUATION_NOTIFICATION_MESSAGES.reminder.parent.title,
    message,
    type: 'conversation_reminder',
    priority: 'normal',
    actionLabel: 'View Conversation',
    actionUrl: getActionUrl(conversationId),
  }
}

/**
 * Get notification when conversation is scheduled.
 */
export function getScheduledNotification(
  recipientType: 'child' | 'parent',
  childName: string,
  scheduledDate: Date,
  conversationId: string
): NotificationContent {
  const message =
    recipientType === 'child'
      ? GRADUATION_NOTIFICATION_MESSAGES.scheduled.child.getMessage(scheduledDate)
      : GRADUATION_NOTIFICATION_MESSAGES.scheduled.parent.getMessage(scheduledDate, childName)

  return {
    title:
      recipientType === 'child'
        ? GRADUATION_NOTIFICATION_MESSAGES.scheduled.child.title
        : GRADUATION_NOTIFICATION_MESSAGES.scheduled.parent.title,
    message,
    type: 'conversation_scheduled',
    priority: 'normal',
    actionLabel: 'View Details',
    actionUrl: getActionUrl(conversationId),
  }
}

/**
 * Get notification when conversation is overdue.
 */
export function getOverdueNotification(
  recipientType: 'child' | 'parent',
  childName: string,
  conversationId: string
): NotificationContent {
  const message =
    recipientType === 'child'
      ? GRADUATION_NOTIFICATION_MESSAGES.overdue.child.message
      : GRADUATION_NOTIFICATION_MESSAGES.overdue.parent.getMessage(childName)

  return {
    title:
      recipientType === 'child'
        ? GRADUATION_NOTIFICATION_MESSAGES.overdue.child.title
        : GRADUATION_NOTIFICATION_MESSAGES.overdue.parent.title,
    message,
    type: 'conversation_overdue',
    priority: 'high',
    actionLabel: 'Schedule Now',
    actionUrl: getActionUrl(conversationId),
  }
}

/**
 * Get acknowledgment needed notification.
 */
export function getAcknowledgmentNeededNotification(
  recipientType: 'child' | 'parent',
  conversationId: string
): NotificationContent {
  return {
    title:
      recipientType === 'child'
        ? GRADUATION_NOTIFICATION_MESSAGES.acknowledgmentNeeded.child.title
        : GRADUATION_NOTIFICATION_MESSAGES.acknowledgmentNeeded.parent.title,
    message:
      recipientType === 'child'
        ? GRADUATION_NOTIFICATION_MESSAGES.acknowledgmentNeeded.child.message
        : GRADUATION_NOTIFICATION_MESSAGES.acknowledgmentNeeded.parent.message,
    type: 'acknowledgment_needed',
    priority: 'normal',
    actionLabel: 'Acknowledge',
    actionUrl: getActionUrl(conversationId),
  }
}

// ============================================
// Notification Summary Functions
// ============================================

/**
 * Get all pending notifications for a conversation.
 */
export function getPendingNotifications(
  conversation: GraduationConversation,
  _childName: string
): { recipientType: 'child' | 'parent'; recipientId: string; notification: NotificationContent }[] {
  const notifications: {
    recipientType: 'child' | 'parent'
    recipientId: string
    notification: NotificationContent
  }[] = []

  const { childMissing, missingParentIds } = getMissingAcknowledgments(conversation)

  // Check for acknowledgment needed notifications
  if (conversation.status === 'pending') {
    if (childMissing) {
      notifications.push({
        recipientType: 'child',
        recipientId: conversation.childId,
        notification: getAcknowledgmentNeededNotification('child', conversation.id),
      })
    }

    for (const parentId of missingParentIds) {
      notifications.push({
        recipientType: 'parent',
        recipientId: parentId,
        notification: getAcknowledgmentNeededNotification('parent', conversation.id),
      })
    }
  }

  return notifications
}

/**
 * Get notification summary text.
 */
export function getNotificationSummary(
  conversation: GraduationConversation,
  viewerType: ViewerType,
  childName: string
): string {
  const daysRemaining = getConversationDaysUntilExpiry(conversation)
  const { childMissing, missingParentIds } = getMissingAcknowledgments(conversation)

  switch (conversation.status) {
    case 'pending': {
      const waitingFor: string[] = []
      if (childMissing) {
        waitingFor.push(viewerType === 'child' ? 'you' : childName)
      }
      if (missingParentIds.length > 0) {
        waitingFor.push(
          missingParentIds.length === 1 ? '1 parent' : `${missingParentIds.length} parents`
        )
      }
      return `Waiting for acknowledgment from ${waitingFor.join(' and ')}. ${daysRemaining} days remaining.`
    }

    case 'acknowledged':
      return `All parties have acknowledged. Please schedule your conversation. ${daysRemaining} days remaining.`

    case 'scheduled':
      return conversation.scheduledDate
        ? `Conversation scheduled for ${formatDate(conversation.scheduledDate)}.`
        : 'Conversation is scheduled.'

    case 'completed':
      return conversation.outcome === 'graduated'
        ? 'Graduation complete! Congratulations!'
        : `Conversation completed. Outcome: ${conversation.outcome}.`

    case 'expired':
      return 'This conversation has expired. Please initiate a new one when ready.'

    default:
      return ''
  }
}

/**
 * Get celebratory message for graduation.
 * AC4: System suggests positive messaging
 */
export function getCelebratoryMessage(viewerType: ViewerType, childName?: string): string {
  if (viewerType === 'child') {
    return "Congratulations! You've earned this milestone through 12 months of responsible digital behavior. This is the beginning of a new chapter in your digital independence journey."
  }

  return `Congratulations! ${childName || 'Your child'} has demonstrated remarkable responsibility over the past 12 months. This graduation conversation marks an important transition in their digital independence.`
}

/**
 * Get responsibility acknowledgment message.
 * AC4: System suggests: "Your child has shown consistent responsibility"
 */
export function getResponsibilityAcknowledgmentMessage(childName: string): string {
  return `${childName} has shown consistent responsibility by maintaining perfect trust for 12 consecutive months. This achievement demonstrates maturity and readiness for greater digital independence.`
}
