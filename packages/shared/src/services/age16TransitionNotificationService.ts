/**
 * Age 16 Transition Notification Service - Story 52.1 Task 3
 *
 * Service for sending and managing age 16 transition notifications.
 *
 * AC1: Pre-transition notification: "At 16, you gain new controls"
 * AC2: Explains reverse mode option, trusted adults
 * AC3: Parents notified: "Your child's controls are changing"
 * AC4: In-app guide walks through new features
 * AC5: No action required - transition is optional
 */

import {
  type Age16TransitionNotification,
  type Age16NotificationTypeValue,
  type TransitionGuide,
  Age16NotificationType,
  createAge16TransitionNotification,
  getDefaultTransitionGuide,
  CHILD_PRE_TRANSITION_MESSAGE,
  CHILD_TRANSITION_AVAILABLE_MESSAGE,
  PARENT_PRE_TRANSITION_MESSAGE,
  PARENT_TRANSITION_AVAILABLE_TEMPLATE,
} from '../contracts/age16Transition'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const notificationStore: Map<string, Age16TransitionNotification> = new Map()
const childNotificationIndex: Map<string, string[]> = new Map()

// ============================================
// Types
// ============================================

export type Age16ViewerType = 'child' | 'parent'

// ============================================
// Message Generation Functions (AC1, AC3)
// ============================================

/**
 * Get the pre-transition message for a child.
 * AC1: "At 16, you gain new controls"
 */
export function getChildPreTransitionMessage(): string {
  return CHILD_PRE_TRANSITION_MESSAGE
}

/**
 * Get the transition available message for a child.
 */
export function getChildTransitionAvailableMessage(): string {
  return CHILD_TRANSITION_AVAILABLE_MESSAGE
}

/**
 * Get the pre-transition message for a parent.
 * AC3: "Your child's controls are changing at 16"
 */
export function getParentPreTransitionMessage(): string {
  return PARENT_PRE_TRANSITION_MESSAGE
}

/**
 * Get the transition available message for a parent.
 * @param childName - Name of the child
 */
export function getParentTransitionAvailableMessage(childName: string): string {
  return PARENT_TRANSITION_AVAILABLE_TEMPLATE.replace('{childName}', childName)
}

/**
 * Get age 16 transition message for a specific viewer type.
 * @param viewerType - 'child' or 'parent'
 * @param notificationType - 'pre_transition' or 'transition_available'
 * @param childName - Name of the child (required for parent view)
 */
export function getAge16TransitionMessageForViewer(
  viewerType: Age16ViewerType,
  notificationType: Age16NotificationTypeValue,
  childName?: string
): string {
  if (viewerType === 'child') {
    return notificationType === 'pre_transition'
      ? getChildPreTransitionMessage()
      : getChildTransitionAvailableMessage()
  }

  // Parent view
  if (notificationType === 'pre_transition') {
    return getParentPreTransitionMessage()
  }

  return childName
    ? getParentTransitionAvailableMessage(childName)
    : 'Your child is 16 - they now have access to Reverse Mode'
}

/**
 * Get pre-transition message with days until 16.
 * @param daysUntil16 - Days until 16th birthday
 */
export function getPreTransitionMessageWithDays(daysUntil16: number): string {
  const dayWord = daysUntil16 === 1 ? 'day' : 'days'
  return `In ${daysUntil16} ${dayWord}, you'll turn 16 and gain new controls over your digital life`
}

/**
 * Get pre-transition message for parent with days.
 * @param daysUntil16 - Days until 16th birthday
 * @param childName - Optional child name
 */
export function getParentPreTransitionMessageWithDays(
  daysUntil16: number,
  childName?: string
): string {
  const dayWord = daysUntil16 === 1 ? 'day' : 'days'
  const subject = childName || 'Your child'
  return `${subject} turns 16 in ${daysUntil16} ${dayWord}. Their controls will change.`
}

// ============================================
// Guide Content Functions (AC4)
// ============================================

/**
 * Get the age 16 transition guide.
 * AC4: In-app guide walks through new features
 */
export function getAge16TransitionGuide(): TransitionGuide {
  return getDefaultTransitionGuide()
}

/**
 * Get celebration message for the milestone.
 * AC4: "You're growing up!"
 */
export function getAge16CelebrationMessage(): string {
  return "🎉 You're growing up! These new features celebrate your increasing maturity and independence."
}

// ============================================
// Notification Sending Functions
// ============================================

/**
 * Send pre-transition notification to child.
 * AC1: Notification 30 days before 16th birthday
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param daysUntil16 - Days until 16th birthday
 */
export function sendPreTransitionNotification(
  childId: string,
  familyId: string,
  daysUntil16: number
): Age16TransitionNotification {
  const notification = createAge16TransitionNotification(
    childId,
    familyId,
    Age16NotificationType.PRE_TRANSITION,
    daysUntil16
  )

  // Store notification
  notificationStore.set(notification.id, notification)

  // Update child index
  const childNotifs = childNotificationIndex.get(childId) || []
  childNotifs.push(notification.id)
  childNotificationIndex.set(childId, childNotifs)

  return notification
}

/**
 * Send transition available notification to child.
 * @param childId - Child ID
 * @param familyId - Family ID
 */
export function sendTransitionAvailableNotification(
  childId: string,
  familyId: string
): Age16TransitionNotification {
  const notification = createAge16TransitionNotification(
    childId,
    familyId,
    Age16NotificationType.TRANSITION_AVAILABLE
  )

  // Store notification
  notificationStore.set(notification.id, notification)

  // Update child index
  const childNotifs = childNotificationIndex.get(childId) || []
  childNotifs.push(notification.id)
  childNotificationIndex.set(childId, childNotifs)

  return notification
}

// ============================================
// Notification Query Functions
// ============================================

/**
 * Get all age 16 notifications for a child.
 */
export function getAge16NotificationsForChild(childId: string): Age16TransitionNotification[] {
  const notifIds = childNotificationIndex.get(childId) || []
  return notifIds
    .map((id) => notificationStore.get(id))
    .filter((n): n is Age16TransitionNotification => n !== undefined)
}

/**
 * Get age 16 notification by ID.
 */
export function getAge16NotificationById(
  notificationId: string
): Age16TransitionNotification | null {
  return notificationStore.get(notificationId) || null
}

/**
 * Get unacknowledged age 16 notifications for a child.
 */
export function getUnacknowledgedAge16Notifications(
  childId: string
): Age16TransitionNotification[] {
  return getAge16NotificationsForChild(childId).filter((n) => !n.acknowledged && !n.dismissed)
}

/**
 * Check if pre-transition notification was sent for child.
 */
export function wasPreTransitionNotificationSent(childId: string): boolean {
  const notifications = getAge16NotificationsForChild(childId)
  return notifications.some((n) => n.type === 'pre_transition')
}

/**
 * Check if transition available notification was sent for child.
 */
export function wasTransitionAvailableNotificationSent(childId: string): boolean {
  const notifications = getAge16NotificationsForChild(childId)
  return notifications.some((n) => n.type === 'transition_available')
}

// ============================================
// Notification Acknowledgment Functions
// ============================================

/**
 * Mark a notification as acknowledged.
 */
export function markNotificationAcknowledged(notificationId: string): void {
  const notification = notificationStore.get(notificationId)
  if (!notification) {
    throw new Error(`Notification not found: ${notificationId}`)
  }

  const updated: Age16TransitionNotification = {
    ...notification,
    acknowledged: true,
    acknowledgedAt: new Date(),
  }

  notificationStore.set(notificationId, updated)
}

/**
 * Dismiss a notification (AC5: no action required).
 */
export function dismissNotification(notificationId: string): void {
  const notification = notificationStore.get(notificationId)
  if (!notification) {
    throw new Error(`Notification not found: ${notificationId}`)
  }

  const updated: Age16TransitionNotification = {
    ...notification,
    dismissed: true,
  }

  notificationStore.set(notificationId, updated)
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all notification data (for testing).
 */
export function clearAllAge16NotificationData(): void {
  notificationStore.clear()
  childNotificationIndex.clear()
}
