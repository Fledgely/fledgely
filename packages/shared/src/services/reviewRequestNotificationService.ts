/**
 * ReviewRequestNotificationService - Story 34.5.3 Task 3
 *
 * Service for parent review request notifications.
 * AC2: Review Request Notification to Parent
 * AC5: Invitation, Not Demand
 *
 * CRITICAL: All messaging must be non-confrontational and supportive.
 */

import { getFirestore, collection, addDoc } from 'firebase/firestore'

// ============================================
// Types
// ============================================

export interface ReviewRequestNotificationMessage {
  title: string
  body: string
  suggestedAreas: string[]
}

// ============================================
// Constants
// ============================================

const REVIEW_REQUEST_NOTIFICATIONS_COLLECTION = 'reviewRequestNotifications'

// ============================================
// Helpers
// ============================================

/**
 * Sanitize child name for use in notifications.
 * Removes control characters, HTML tags, and limits length.
 *
 * @param name - Child's name to sanitize
 * @returns Sanitized name or fallback
 */
export function sanitizeChildNameForNotification(name: string): string {
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
 * Get parent notification message for review request.
 * AC2: Message is non-confrontational and invitation-style.
 * AC5: Language framed as invitation, not demand.
 *
 * @param childName - Child's first name
 * @param suggestedAreas - Suggested discussion areas
 * @returns Title, body, and suggested areas for notification
 */
export function getReviewRequestNotificationMessage(
  childName: string,
  suggestedAreas: string[]
): ReviewRequestNotificationMessage {
  const safeName = sanitizeChildNameForNotification(childName)

  return {
    title: 'Agreement discussion invitation',
    body: `${safeName} is inviting you to have a conversation about the agreement together. This could be a good opportunity to check in.`,
    suggestedAreas: [...suggestedAreas],
  }
}

// ============================================
// Notification Creation
// ============================================

/**
 * Create a parent review request notification.
 * This queues a notification to be sent to parents.
 * AC2: Non-confrontational notification to parent.
 *
 * @param familyId - Family's unique identifier
 * @param requestId - Review request ID
 * @param childName - Child's first name
 * @param suggestedAreas - Suggested discussion areas
 */
export async function createReviewRequestNotification(
  familyId: string,
  requestId: string,
  childName: string,
  suggestedAreas: string[]
): Promise<void> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }

  const db = getFirestore()
  const notificationsRef = collection(db, REVIEW_REQUEST_NOTIFICATIONS_COLLECTION)

  const safeName = sanitizeChildNameForNotification(childName)
  const message = getReviewRequestNotificationMessage(childName, suggestedAreas)

  await addDoc(notificationsRef, {
    familyId,
    requestId,
    childName: safeName,
    title: message.title,
    body: message.body,
    suggestedAreas: message.suggestedAreas,
    status: 'pending',
    createdAt: new Date(),
  })
}
