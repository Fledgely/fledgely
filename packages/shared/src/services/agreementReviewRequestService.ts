/**
 * AgreementReviewRequestService - Story 34.5.3 Task 2
 *
 * Service for managing agreement review requests.
 * AC1: Request Agreement Review Button
 * AC2: Review Request Notification to Parent
 * AC4: Rate Limiting (60-Day Cooldown)
 * AC6: Review Request Tracking
 *
 * CRITICAL: All messaging must be invitation-based, not demand-based.
 */

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import {
  REVIEW_REQUEST_EXPIRY_DAYS,
  calculateCooldownStatus,
  type AgreementReviewRequest,
  type CooldownStatus,
} from '../contracts/agreementReviewRequest'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for agreement review requests.
 */
export const AGREEMENT_REVIEW_REQUESTS_COLLECTION = 'agreementReviewRequests'

/**
 * Firestore collection for rejection events (used for suggestions).
 */
const REJECTION_EVENTS_COLLECTION = 'rejectionEvents'

/**
 * Firestore collection for review request notifications.
 */
const REVIEW_REQUEST_NOTIFICATIONS_COLLECTION = 'reviewRequestNotifications'

// ============================================
// Firestore Helpers
// ============================================

function getReviewRequestsCollection() {
  const db = getFirestore()
  return collection(db, AGREEMENT_REVIEW_REQUESTS_COLLECTION)
}

function getReviewRequestDocRef(requestId: string) {
  const db = getFirestore()
  return doc(db, AGREEMENT_REVIEW_REQUESTS_COLLECTION, requestId)
}

/**
 * Convert Firestore timestamp to Date if needed.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date()
}

/**
 * Convert Firestore timestamp to Date or null.
 */
function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null
  }
  return toDate(value)
}

// ============================================
// Cooldown Management
// ============================================

/**
 * Check if child can request a review (cooldown check).
 * AC4: 60-day cooldown between requests.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @returns Cooldown status indicating if a new request can be made
 */
export async function checkReviewRequestCooldown(
  familyId: string,
  childId: string
): Promise<CooldownStatus> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  // Find the most recent review request for this child
  const requestsRef = getReviewRequestsCollection()
  const q = query(
    requestsRef,
    where('familyId', '==', familyId),
    where('childId', '==', childId),
    orderBy('requestedAt', 'desc'),
    limit(1)
  )

  const snapshot = await getDocs(q)

  if (snapshot.docs.length === 0) {
    return calculateCooldownStatus(null)
  }

  const lastRequest = snapshot.docs[0].data()
  const lastRequestAt = toDate(lastRequest.requestedAt)

  return calculateCooldownStatus(lastRequestAt)
}

// ============================================
// Request Submission
// ============================================

/**
 * Submit a review request.
 * AC1: Creates request when child clicks button.
 * AC2: Triggers parent notification.
 * AC4: Enforces cooldown period.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @param childName - Child's display name
 * @param agreementId - Agreement being reviewed
 * @returns The created review request
 */
export async function submitReviewRequest(
  familyId: string,
  childId: string,
  childName: string,
  agreementId: string
): Promise<AgreementReviewRequest> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!childName || childName.trim().length === 0) {
    throw new Error('childName is required')
  }
  if (!agreementId || agreementId.trim().length === 0) {
    throw new Error('agreementId is required')
  }

  // Check cooldown
  const cooldownStatus = await checkReviewRequestCooldown(familyId, childId)
  if (!cooldownStatus.canRequest) {
    throw new Error(
      `Review request is in cooldown period. ${cooldownStatus.daysRemaining} days remaining.`
    )
  }

  // Get suggested discussion areas
  const suggestedAreas = await getSuggestedDiscussionAreas(familyId, childId, agreementId)

  // Calculate expiration date (30 days from now)
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + REVIEW_REQUEST_EXPIRY_DAYS)

  // Create the review request
  const requestsRef = getReviewRequestsCollection()
  const docRef = await addDoc(requestsRef, {
    familyId,
    childId,
    childName: sanitizeChildName(childName),
    agreementId,
    requestedAt: now,
    status: 'pending',
    acknowledgedAt: null,
    reviewedAt: null,
    suggestedAreas,
    parentNotificationSent: true,
    expiresAt,
  })

  // Create parent notification
  await createReviewRequestNotification(familyId, docRef.id, childName, suggestedAreas)

  return {
    id: docRef.id,
    familyId,
    childId,
    childName: sanitizeChildName(childName),
    agreementId,
    requestedAt: now,
    status: 'pending',
    acknowledgedAt: null,
    reviewedAt: null,
    suggestedAreas,
    parentNotificationSent: true,
    expiresAt,
  }
}

// ============================================
// Suggested Discussion Areas
// ============================================

/**
 * Get suggested discussion areas based on history.
 * AC3: Suggestions based on rejection patterns, agreement age, etc.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @param agreementId - Agreement ID
 * @returns Array of suggested discussion areas
 */
export async function getSuggestedDiscussionAreas(
  familyId: string,
  childId: string,
  agreementId: string
): Promise<string[]> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!agreementId || agreementId.trim().length === 0) {
    throw new Error('agreementId is required')
  }

  const suggestions: string[] = []

  try {
    // Check for recent rejection patterns
    const db = getFirestore()
    const rejectionsRef = collection(db, REJECTION_EVENTS_COLLECTION)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const rejectionsQuery = query(
      rejectionsRef,
      where('childId', '==', childId),
      where('rejectedAt', '>=', ninetyDaysAgo)
    )

    const rejectionsSnapshot = await getDocs(rejectionsQuery)

    if (rejectionsSnapshot.docs.length > 0) {
      // Add general suggestion about recent rejections
      suggestions.push('Recent proposal discussions')
    }

    // Add common discussion areas
    if (suggestions.length === 0) {
      suggestions.push('General agreement check-in')
    }
  } catch {
    // If we can't get suggestions, return defaults
    suggestions.push('General agreement review')
  }

  return suggestions
}

// ============================================
// Request History
// ============================================

/**
 * Get review request history for a child.
 * AC6: Request history visible to both parties.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @returns Array of review requests, sorted by date (newest first)
 */
export async function getReviewRequestHistory(
  familyId: string,
  childId: string
): Promise<AgreementReviewRequest[]> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const requestsRef = getReviewRequestsCollection()
  const q = query(
    requestsRef,
    where('familyId', '==', familyId),
    where('childId', '==', childId),
    orderBy('requestedAt', 'desc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      familyId: data.familyId,
      childId: data.childId,
      childName: data.childName,
      agreementId: data.agreementId,
      requestedAt: toDate(data.requestedAt),
      status: data.status,
      acknowledgedAt: toDateOrNull(data.acknowledgedAt),
      reviewedAt: toDateOrNull(data.reviewedAt),
      suggestedAreas: data.suggestedAreas || [],
      parentNotificationSent: data.parentNotificationSent,
      expiresAt: toDate(data.expiresAt),
    }
  })
}

// ============================================
// Request Management
// ============================================

/**
 * Acknowledge a review request (parent action).
 * AC2: Parent acknowledges receiving the request.
 *
 * @param requestId - Review request ID
 */
export async function acknowledgeReviewRequest(requestId: string): Promise<void> {
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }

  const requestRef = getReviewRequestDocRef(requestId)
  const snapshot = await getDoc(requestRef)

  if (!snapshot.exists()) {
    throw new Error('Review request not found')
  }

  const data = snapshot.data()

  // Skip if already acknowledged or reviewed
  if (data.status === 'acknowledged' || data.status === 'reviewed') {
    return
  }

  await updateDoc(requestRef, {
    status: 'acknowledged',
    acknowledgedAt: new Date(),
  })
}

/**
 * Mark review as complete.
 *
 * @param requestId - Review request ID
 */
export async function markReviewComplete(requestId: string): Promise<void> {
  if (!requestId || requestId.trim().length === 0) {
    throw new Error('requestId is required')
  }

  const requestRef = getReviewRequestDocRef(requestId)
  const snapshot = await getDoc(requestRef)

  if (!snapshot.exists()) {
    throw new Error('Review request not found')
  }

  await updateDoc(requestRef, {
    status: 'reviewed',
    reviewedAt: new Date(),
  })
}

/**
 * Get pending review request for a child.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @returns Pending review request or null
 */
export async function getPendingReviewRequest(
  familyId: string,
  childId: string
): Promise<AgreementReviewRequest | null> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const requestsRef = getReviewRequestsCollection()
  const q = query(
    requestsRef,
    where('familyId', '==', familyId),
    where('childId', '==', childId),
    where('status', '==', 'pending'),
    limit(1)
  )

  const snapshot = await getDocs(q)

  if (snapshot.docs.length === 0) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: doc.id,
    familyId: data.familyId,
    childId: data.childId,
    childName: data.childName,
    agreementId: data.agreementId,
    requestedAt: toDate(data.requestedAt),
    status: data.status,
    acknowledgedAt: toDateOrNull(data.acknowledgedAt),
    reviewedAt: toDateOrNull(data.reviewedAt),
    suggestedAreas: data.suggestedAreas || [],
    parentNotificationSent: data.parentNotificationSent,
    expiresAt: toDate(data.expiresAt),
  }
}

// ============================================
// Notification Helpers
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

/**
 * Create parent notification for review request.
 * AC2: Non-confrontational notification to parent.
 *
 * @param familyId - Family's unique identifier
 * @param requestId - Review request ID
 * @param childName - Child's display name
 * @param suggestedAreas - Suggested discussion areas
 */
async function createReviewRequestNotification(
  familyId: string,
  requestId: string,
  childName: string,
  suggestedAreas: string[]
): Promise<void> {
  const db = getFirestore()
  const notificationsRef = collection(db, REVIEW_REQUEST_NOTIFICATIONS_COLLECTION)

  const safeName = sanitizeChildName(childName)

  await addDoc(notificationsRef, {
    familyId,
    requestId,
    childName: safeName,
    // AC5: Invitation, not demand - use supportive language
    title: 'Agreement discussion invitation',
    body: `${safeName} is inviting you to have a conversation about the agreement together. This could be a good opportunity to check in.`,
    suggestedAreas,
    status: 'pending',
    createdAt: new Date(),
  })
}
