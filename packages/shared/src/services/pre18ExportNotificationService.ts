/**
 * Pre18 Export Notification Service - Story 38.6 Task 4
 *
 * Service for sending pre-18 export notifications.
 * AC1: Parent notified "Data will be deleted in 30 days"
 */

// ============================================
// Types
// ============================================

export interface Pre18ExportNotification {
  id: string
  recipientId: string
  type: 'pre18_export_available' | 'export_consent_request' | 'export_ready' | 'export_completed'
  childId?: string
  daysUntil18?: number
  exportUrl?: string
  requestedBy?: string
  sentAt: Date
  acknowledged: boolean
}

// ============================================
// In-Memory Storage
// ============================================

const notificationStore: Pre18ExportNotification[] = []

// ============================================
// ID Generation
// ============================================

function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================
// Parent Notification Functions (AC1)
// ============================================

/**
 * Send notification to parent that export option is available.
 * AC1: Parent notified "Data will be deleted in 30 days"
 *
 * @param parentId - The parent's ID
 * @param childId - The child's ID
 * @param daysUntil18 - Days until child turns 18
 * @returns The sent notification
 */
export function sendPre18ExportAvailableNotification(
  parentId: string,
  childId: string,
  daysUntil18: number
): Pre18ExportNotification {
  const notification: Pre18ExportNotification = {
    id: generateNotificationId(),
    recipientId: parentId,
    type: 'pre18_export_available',
    childId,
    daysUntil18,
    sentAt: new Date(),
    acknowledged: false,
  }

  notificationStore.push(notification)
  return notification
}

/**
 * Send notification to child requesting export consent.
 *
 * @param childId - The child's ID
 * @returns The sent notification
 */
export function sendExportConsentRequestNotification(childId: string): Pre18ExportNotification {
  const notification: Pre18ExportNotification = {
    id: generateNotificationId(),
    recipientId: childId,
    type: 'export_consent_request',
    sentAt: new Date(),
    acknowledged: false,
  }

  notificationStore.push(notification)
  return notification
}

/**
 * Send notification to parent that export is ready.
 *
 * @param parentId - The parent's ID
 * @param exportUrl - The download URL
 * @returns The sent notification
 */
export function sendExportReadyNotification(
  parentId: string,
  exportUrl: string
): Pre18ExportNotification {
  const notification: Pre18ExportNotification = {
    id: generateNotificationId(),
    recipientId: parentId,
    type: 'export_ready',
    exportUrl,
    sentAt: new Date(),
    acknowledged: false,
  }

  notificationStore.push(notification)
  return notification
}

// ============================================
// Child Notification Functions
// ============================================

/**
 * Send consent request notification to child.
 *
 * @param childId - The child's ID
 * @param parentId - The requesting parent's ID
 * @returns The sent notification
 */
export function sendConsentRequestToChild(
  childId: string,
  parentId: string
): Pre18ExportNotification {
  const notification: Pre18ExportNotification = {
    id: generateNotificationId(),
    recipientId: childId,
    type: 'export_consent_request',
    requestedBy: parentId,
    sentAt: new Date(),
    acknowledged: false,
  }

  notificationStore.push(notification)
  return notification
}

/**
 * Send notification to child that export completed.
 *
 * @param childId - The child's ID
 * @returns The sent notification
 */
export function sendExportCompletedToChild(childId: string): Pre18ExportNotification {
  const notification: Pre18ExportNotification = {
    id: generateNotificationId(),
    recipientId: childId,
    type: 'export_completed',
    sentAt: new Date(),
    acknowledged: false,
  }

  notificationStore.push(notification)
  return notification
}

// ============================================
// Message Content Functions (AC1)
// ============================================

/**
 * Get the pre-18 export available message.
 * AC1: Parent notified "Data will be deleted in 30 days"
 *
 * @param daysUntil18 - Days until child turns 18
 * @returns The notification message
 */
export function getPre18ExportMessage(daysUntil18: number): string {
  const dayWord = Math.abs(daysUntil18) === 1 ? 'day' : 'days'

  if (daysUntil18 <= 0) {
    return 'Your child is turning 18 soon. All monitoring data will be deleted automatically. You can export a summary before deletion.'
  }

  return `Data will be deleted in ${daysUntil18} ${dayWord}. You can export a summary before your child turns 18.`
}

/**
 * Get the consent request message for child.
 *
 * @returns The consent request message
 */
export function getConsentRequestMessage(): string {
  return 'Your parent has requested to export a summary of your activity data before it is deleted when you turn 18. You can choose to consent or decline this request. This is your choice.'
}

// ============================================
// Notification Retrieval Functions
// ============================================

/**
 * Get all notifications for a parent.
 *
 * @param parentId - The parent's ID
 * @returns Array of notifications
 */
export function getNotificationsForParent(parentId: string): Pre18ExportNotification[] {
  return notificationStore.filter((n) => n.recipientId === parentId)
}

/**
 * Get all notifications for a child.
 *
 * @param childId - The child's ID
 * @returns Array of notifications
 */
export function getNotificationsForChild(childId: string): Pre18ExportNotification[] {
  return notificationStore.filter((n) => n.recipientId === childId)
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all notification data (for testing).
 */
export function clearAllNotificationData(): void {
  notificationStore.length = 0
}

/**
 * Get total notification count (for testing).
 */
export function getNotificationCount(): number {
  return notificationStore.length
}
