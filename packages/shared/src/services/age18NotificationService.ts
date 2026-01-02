/**
 * Age18NotificationService - Story 38.5 Task 4
 *
 * Service for notifying child of deletion.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */

import type { Age18DeletionNotification, NotificationType } from '../contracts/age18Deletion'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const notificationStore: Map<string, Age18DeletionNotification> = new Map()
const childNotificationIndex: Map<string, string[]> = new Map()

// ============================================
// Types
// ============================================

export type ViewerType = 'child' | 'parent'

// ============================================
// Helper Functions
// ============================================

function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================
// Message Generation Functions (AC6)
// ============================================

/**
 * Get the official age-18 deletion message.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */
export function getAge18DeletionMessage(): string {
  return "You're 18 - all data has been deleted"
}

/**
 * Get pre-deletion warning message.
 * @param daysUntil18 - Days until child turns 18
 */
export function getPreDeletionMessage(daysUntil18: number): string {
  const dayWord = daysUntil18 === 1 ? 'day' : 'days'
  return `In ${daysUntil18} ${dayWord}, all your monitoring data will be automatically deleted`
}

/**
 * Get deletion message for a specific viewer type.
 * @param viewerType - 'child' or 'parent'
 * @param childName - Name of the child (required for parent view)
 */
export function getAge18DeletionMessageForViewer(
  viewerType: ViewerType,
  childName?: string
): string {
  if (viewerType === 'child') {
    return getAge18DeletionMessage()
  }

  if (!childName) {
    return 'Your child is 18 - all their monitoring data has been deleted'
  }

  return `${childName} is 18 - all their monitoring data has been deleted`
}

/**
 * Get pre-deletion message for a specific viewer type.
 * @param viewerType - 'child' or 'parent'
 * @param daysUntil18 - Days until child turns 18
 * @param childName - Name of the child (required for parent view)
 */
export function getPreDeletionMessageForViewer(
  viewerType: ViewerType,
  daysUntil18: number,
  childName?: string
): string {
  const dayWord = daysUntil18 === 1 ? 'day' : 'days'

  if (viewerType === 'child') {
    return getPreDeletionMessage(daysUntil18)
  }

  if (!childName) {
    return `In ${daysUntil18} ${dayWord}, your child's monitoring data will be automatically deleted`
  }

  return `In ${daysUntil18} ${dayWord}, ${childName}'s monitoring data will be automatically deleted`
}

// ============================================
// Notification Sending Functions
// ============================================

/**
 * Create and store a notification.
 */
function createNotification(childId: string, type: NotificationType): Age18DeletionNotification {
  const id = generateNotificationId()
  const notification: Age18DeletionNotification = {
    id,
    childId,
    type,
    sentAt: new Date(),
    acknowledged: false,
  }

  // Store notification
  notificationStore.set(id, notification)

  // Update child index
  const childNotifs = childNotificationIndex.get(childId) || []
  childNotifs.push(id)
  childNotificationIndex.set(childId, childNotifs)

  return notification
}

/**
 * Send deletion complete notification to child.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */
export function sendDeletionCompleteNotification(childId: string): Age18DeletionNotification {
  return createNotification(childId, 'deletion_complete')
}

/**
 * Send pre-deletion notification to child.
 * @param childId - Child ID
 * @param daysUntil18 - Days until child turns 18
 */
export function sendPreDeletionNotification(
  childId: string,
  _daysUntil18: number
): Age18DeletionNotification {
  return createNotification(childId, 'pre_deletion')
}

// ============================================
// Notification Query Functions
// ============================================

/**
 * Get all notifications for a child.
 */
export function getNotificationsForChild(childId: string): Age18DeletionNotification[] {
  const notifIds = childNotificationIndex.get(childId) || []
  return notifIds
    .map((id) => notificationStore.get(id))
    .filter((n): n is Age18DeletionNotification => n !== undefined)
}

/**
 * Get notification by ID.
 */
export function getNotificationById(notificationId: string): Age18DeletionNotification | null {
  return notificationStore.get(notificationId) || null
}

/**
 * Get unacknowledged notifications for a child.
 */
export function getUnacknowledgedNotifications(childId: string): Age18DeletionNotification[] {
  return getNotificationsForChild(childId).filter((n) => !n.acknowledged)
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

  const updated: Age18DeletionNotification = {
    ...notification,
    acknowledged: true,
  }

  notificationStore.set(notificationId, updated)
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all notification data (for testing).
 */
export function clearAllNotificationData(): void {
  notificationStore.clear()
  childNotificationIndex.clear()
}
