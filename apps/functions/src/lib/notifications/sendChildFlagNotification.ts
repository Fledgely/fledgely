/**
 * Send flag notification to child
 *
 * Story 23.1: Flag Notification to Child (AC: #1, #4)
 *
 * Features:
 * - Fetches all FCM tokens for a specific child
 * - Sends gentle notification via Firebase Cloud Messaging
 * - Updates flag with childNotificationStatus and annotationDeadline
 * - Handles stale token cleanup on send failure
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import { ANNOTATION_WINDOW_MS, type ChildNotificationStatus } from '@fledgely/shared'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Notification token stored in user's subcollection
 */
interface NotificationToken {
  token: string
  createdAt?: number
}

/**
 * Parameters for sending a child flag notification
 */
export interface SendChildFlagNotificationParams {
  childId: string
  flagId: string
  familyId: string
}

/**
 * Result of sending child notification
 */
export interface SendChildNotificationResult {
  sent: boolean
  successCount: number
  failureCount: number
  tokensCleanedUp: number
  annotationDeadline?: number
  reason?: 'no_tokens' | 'send_failed' | 'child_not_found'
}

/**
 * Get all FCM tokens for a child
 * Tokens are stored under /users/{childUid}/notificationTokens
 */
async function getChildTokens(childId: string): Promise<{ tokenId: string; token: string }[]> {
  // First, get the child document to find their UID
  const childRef = getDb().collection('children').doc(childId)
  const childDoc = await childRef.get()

  if (!childDoc.exists) {
    logger.warn('Child document not found', { childId })
    return []
  }

  const childData = childDoc.data()
  const childUid = childData?.uid

  if (!childUid) {
    logger.warn('Child has no UID', { childId })
    return []
  }

  // Fetch tokens for the child
  const tokensRef = getDb().collection('users').doc(childUid).collection('notificationTokens')
  const tokenDocs = await tokensRef.get()

  return tokenDocs.docs
    .map((doc) => {
      const data = doc.data() as NotificationToken
      if (data.token) {
        return {
          tokenId: doc.id,
          token: data.token,
        }
      }
      return null
    })
    .filter((t): t is { tokenId: string; token: string } => t !== null)
}

/**
 * Remove a stale token from Firestore
 */
async function removeStaleToken(childUid: string, tokenId: string): Promise<void> {
  try {
    await getDb()
      .collection('users')
      .doc(childUid)
      .collection('notificationTokens')
      .doc(tokenId)
      .delete()
    logger.info('Removed stale token', { childUid, tokenId })
  } catch (error) {
    logger.error('Failed to remove stale token', { error })
  }
}

/**
 * Update flag document with notification status
 */
async function updateFlagNotificationStatus(
  childId: string,
  flagId: string,
  status: ChildNotificationStatus,
  annotationDeadline?: number
): Promise<void> {
  const flagRef = getDb().collection('children').doc(childId).collection('flags').doc(flagId)

  const updateData: Record<string, unknown> = {
    childNotificationStatus: status,
  }

  if (status === 'notified' && annotationDeadline) {
    updateData.childNotifiedAt = Date.now()
    updateData.annotationDeadline = annotationDeadline
  }

  await flagRef.update(updateData)
}

/**
 * Build notification content for child
 * Story 23.1 - AC2: Uses gentle, non-alarming language
 */
function buildChildNotificationContent(flagId: string) {
  return {
    title: 'Something was flagged - add context?',
    body: 'We want your side of the story. Take a moment to explain what happened if you want.',
    data: {
      type: 'flag_notification',
      flagId,
      action: 'add_context',
    },
  }
}

/**
 * Send a flag notification to a child
 *
 * Story 23.1: Flag Notification to Child (AC: #1, #4)
 *
 * @param params - Notification parameters
 * @returns Result with success/failure counts
 */
export async function sendChildFlagNotification(
  params: SendChildFlagNotificationParams
): Promise<SendChildNotificationResult> {
  const { childId, flagId, familyId } = params

  logger.info('Sending flag notification to child', { childId, flagId, familyId })

  // Get child's FCM tokens with error handling
  let tokens: { tokenId: string; token: string }[]
  try {
    tokens = await getChildTokens(childId)
  } catch (error) {
    logger.error('Failed to get child tokens', { childId, flagId, error })
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      tokensCleanedUp: 0,
      reason: 'child_not_found',
    }
  }

  if (tokens.length === 0) {
    logger.info('No tokens found for child', { childId })
    // Still update the flag to show notification was attempted
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      tokensCleanedUp: 0,
      reason: 'no_tokens',
    }
  }

  // Calculate annotation deadline (30 minutes from now)
  const annotationDeadline = Date.now() + ANNOTATION_WINDOW_MS

  // Build notification content
  const content = buildChildNotificationContent(flagId)

  // Send to all tokens
  const messaging = getMessaging()
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: content.title,
      body: content.body,
    },
    data: content.data,
    webpush: {
      fcmOptions: {
        // Link to child annotation screen (Story 23-2 will implement this route)
        link: `${appUrl}/child/annotate/${flagId}`,
      },
    },
  })

  // Handle failures and clean up stale tokens
  let tokensCleanedUp = 0

  // Get child UID for token cleanup
  const childDoc = await getDb().collection('children').doc(childId).get()
  const childUid = childDoc.data()?.uid

  if (response.failureCount > 0 && childUid) {
    const cleanupPromises: Promise<void>[] = []

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code

        // Clean up invalid/expired tokens
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          const tokenInfo = tokens[idx]
          cleanupPromises.push(removeStaleToken(childUid, tokenInfo.tokenId))
          tokensCleanedUp++
        } else {
          logger.error('FCM send error', { error: resp.error })
        }
      }
    })

    await Promise.all(cleanupPromises)
  }

  // Update flag with notification status
  if (response.successCount > 0) {
    await updateFlagNotificationStatus(childId, flagId, 'notified', annotationDeadline)

    logger.info('Flag notification sent successfully', {
      childId,
      flagId,
      successCount: response.successCount,
      annotationDeadline,
    })

    return {
      sent: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokensCleanedUp,
      annotationDeadline,
    }
  }

  logger.warn('Failed to send flag notification', {
    childId,
    flagId,
    failureCount: response.failureCount,
  })

  return {
    sent: false,
    successCount: 0,
    failureCount: response.failureCount,
    tokensCleanedUp,
    reason: 'send_failed',
  }
}
