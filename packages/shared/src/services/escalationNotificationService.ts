/**
 * EscalationNotificationService - Story 34.5.2 Task 5
 *
 * Service for processing escalation notifications to parents.
 * AC6: Parent Escalation Notification
 *
 * CRITICAL: All messaging must be non-punitive and supportive.
 */

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore'

// ============================================
// Types
// ============================================

export interface ParentNotificationMessage {
  title: string
  body: string
}

interface EscalationNotificationData {
  status: 'pending' | 'sent' | 'failed'
  familyId: string
  childId: string
  childName: string
  escalationEventId: string
  createdAt: Date
  sentAt?: Date
}

// ============================================
// Constants
// ============================================

const ESCALATION_NOTIFICATIONS_COLLECTION = 'escalationNotifications'

// ============================================
// Helpers
// ============================================

/**
 * Sanitize child name for use in notifications.
 * Removes control characters, HTML tags, and limits length.
 */
function sanitizeChildName(name: string): string {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Your child'
  }

  // Remove HTML tags
  let sanitized = name.replace(/<[^>]*>/g, '')

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '')

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 50)

  if (sanitized.length === 0) {
    return 'Your child'
  }

  return sanitized
}

// ============================================
// Message Generation
// ============================================

/**
 * Get parent notification message for escalation.
 * AC6: Message is non-punitive and supportive.
 *
 * @param childName - Child's first name
 * @returns Title and body for notification
 */
export function getParentNotificationMessage(childName: string): ParentNotificationMessage {
  const safeName = sanitizeChildName(childName)

  return {
    title: 'Family communication support',
    body: `${safeName} may be feeling unheard. Consider having a conversation about the agreement. Helpful resources are available.`,
  }
}

// ============================================
// Notification Creation
// ============================================

/**
 * Create a parent escalation notification.
 * This queues a notification to be sent to parents.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @param childName - Child's first name
 * @param escalationEventId - ID of the triggering escalation event
 */
export async function createParentEscalationNotification(
  familyId: string,
  childId: string,
  childName: string,
  escalationEventId?: string
): Promise<void> {
  const db = getFirestore()
  const notificationRef = doc(collection(db, ESCALATION_NOTIFICATIONS_COLLECTION))

  const notification: Omit<EscalationNotificationData, 'createdAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>
  } = {
    status: 'pending',
    familyId,
    childId,
    childName: sanitizeChildName(childName),
    escalationEventId: escalationEventId || '',
    createdAt: serverTimestamp(),
  }

  await setDoc(notificationRef, notification)
}

// ============================================
// Notification Processing
// ============================================

/**
 * Process a pending escalation notification.
 * Marks as sent after processing.
 *
 * @param notificationId - ID of the notification to process
 */
export async function processEscalationNotification(notificationId: string): Promise<void> {
  const db = getFirestore()
  const notificationRef = doc(db, ESCALATION_NOTIFICATIONS_COLLECTION, notificationId)

  const notificationSnap = await getDoc(notificationRef)

  if (!notificationSnap.exists()) {
    return
  }

  const data = notificationSnap.data() as EscalationNotificationData

  // Skip if already processed
  if (data.status !== 'pending') {
    return
  }

  // Get the message
  const message = getParentNotificationMessage(data.childName)

  // In a real implementation, this would:
  // 1. Look up parent notification preferences
  // 2. Send via preferred channel (push, email, SMS)
  // 3. Record delivery status

  // Mark as sent
  await updateDoc(notificationRef, {
    status: 'sent',
    sentAt: serverTimestamp(),
    messageTitle: message.title,
    messageBody: message.body,
  })
}
