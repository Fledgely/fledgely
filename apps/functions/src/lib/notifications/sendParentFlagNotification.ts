/**
 * Send flag notification to parent
 *
 * Story 23.3: Annotation Timer and Escalation (AC: #1, #2, #3)
 *
 * Features:
 * - Fetches all FCM tokens for parent(s) in a family
 * - Sends notification via Firebase Cloud Messaging
 * - Updates flag with parentNotifiedAt timestamp
 * - Handles stale token cleanup on send failure
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import { ANNOTATION_WINDOW_MS } from '@fledgely/shared'
import type { FlagDocument, EscalationReason } from '@fledgely/shared'

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
 * Parameters for sending a parent flag notification
 */
export interface SendParentFlagNotificationParams {
  childId: string
  flagId: string
  familyId: string
  /** The flag document data (for determining message) */
  flagData: FlagDocument
}

/**
 * Result of sending parent notification
 */
export interface SendParentNotificationResult {
  sent: boolean
  successCount: number
  failureCount: number
  tokensCleanedUp: number
  parentNotifiedAt?: number
  reason?: 'no_tokens' | 'send_failed' | 'family_not_found'
}

/**
 * Get all FCM tokens for parents in a family
 * Tokens are stored under /users/{parentUid}/notificationTokens
 */
async function getParentTokens(
  familyId: string
): Promise<{ tokenId: string; token: string; userId: string }[]> {
  // Get the family document to find parent UIDs
  const familyRef = getDb().collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    logger.warn('Family document not found', { familyId })
    return []
  }

  const familyData = familyDoc.data()
  const parentIds = familyData?.parentIds as string[] | undefined

  if (!parentIds || parentIds.length === 0) {
    logger.warn('Family has no parent IDs', { familyId })
    return []
  }

  // Fetch tokens for all parents
  const allTokens: { tokenId: string; token: string; userId: string }[] = []

  for (const parentId of parentIds) {
    const tokensRef = getDb().collection('users').doc(parentId).collection('notificationTokens')
    const tokenDocs = await tokensRef.get()

    for (const doc of tokenDocs.docs) {
      const data = doc.data() as NotificationToken
      if (data.token) {
        allTokens.push({
          tokenId: doc.id,
          token: data.token,
          userId: parentId,
        })
      }
    }
  }

  return allTokens
}

/**
 * Remove a stale token from Firestore
 */
async function removeStaleToken(userId: string, tokenId: string): Promise<void> {
  try {
    await getDb()
      .collection('users')
      .doc(userId)
      .collection('notificationTokens')
      .doc(tokenId)
      .delete()
    logger.info('Removed stale token', { userId, tokenId })
  } catch (error) {
    logger.error('Failed to remove stale token', { error })
  }
}

/**
 * Update flag document with parent notification timestamp
 */
async function updateFlagParentNotifiedAt(
  childId: string,
  flagId: string,
  parentNotifiedAt: number
): Promise<void> {
  const flagRef = getDb().collection('children').doc(childId).collection('flags').doc(flagId)

  await flagRef.update({
    parentNotifiedAt,
  })
}

/**
 * Get notification message based on flag escalation status
 *
 * Story 23.3 - AC2:
 * - For expired annotations: "Your child was notified but did not add context"
 * - For annotated flags: "Your child added context to flagged content"
 * - For skipped: "Your child chose not to add context"
 */
export function getParentNotificationMessage(flagData: FlagDocument): {
  title: string
  body: string
} {
  const escalationReason = flagData.escalationReason as EscalationReason | undefined

  if (flagData.childNotificationStatus === 'annotated' && flagData.childAnnotation) {
    return {
      title: 'Flagged content ready for review',
      body: 'Your child added context to flagged content',
    }
  }

  if (escalationReason === 'skipped') {
    return {
      title: 'Flagged content ready for review',
      body: 'Your child chose not to add context',
    }
  }

  if (escalationReason === 'timeout') {
    const windowMinutes = Math.round(ANNOTATION_WINDOW_MS / (60 * 1000))
    return {
      title: 'Flagged content ready for review',
      body: `Your child was notified but did not add context within ${windowMinutes} minutes`,
    }
  }

  // Default message for new flags
  return {
    title: 'New flagged content to review',
    body: 'Please review this flagged content from your child',
  }
}

/**
 * Send a flag notification to parent(s) in a family
 *
 * Story 23.3: Annotation Timer and Escalation (AC: #1, #2, #3)
 *
 * @param params - Notification parameters
 * @returns Result with success/failure counts
 */
export async function sendParentFlagNotification(
  params: SendParentFlagNotificationParams
): Promise<SendParentNotificationResult> {
  const { childId, flagId, familyId, flagData } = params

  logger.info('Sending flag notification to parent', { childId, flagId, familyId })

  // Get parent FCM tokens with error handling
  let tokens: { tokenId: string; token: string; userId: string }[]
  try {
    tokens = await getParentTokens(familyId)
  } catch (error) {
    logger.error('Failed to get parent tokens', { familyId, flagId, error })
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      tokensCleanedUp: 0,
      reason: 'family_not_found',
    }
  }

  if (tokens.length === 0) {
    logger.info('No tokens found for parents', { familyId })
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      tokensCleanedUp: 0,
      reason: 'no_tokens',
    }
  }

  // Build notification content based on escalation status
  const content = getParentNotificationMessage(flagData)

  // Send to all tokens
  const messaging = getMessaging()
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: content.title,
      body: content.body,
    },
    data: {
      type: 'flag_alert',
      flagId,
      childId,
      action: 'review_flag',
    },
    webpush: {
      fcmOptions: {
        // Link to parent flag review screen
        link: `${appUrl}/flags/${childId}/${flagId}`,
      },
    },
  })

  // Handle failures and clean up stale tokens
  let tokensCleanedUp = 0

  if (response.failureCount > 0) {
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
          cleanupPromises.push(removeStaleToken(tokenInfo.userId, tokenInfo.tokenId))
          tokensCleanedUp++
        } else {
          logger.error('FCM send error', { error: resp.error })
        }
      }
    })

    await Promise.all(cleanupPromises)
  }

  // Update flag with parent notification timestamp
  if (response.successCount > 0) {
    const parentNotifiedAt = Date.now()
    await updateFlagParentNotifiedAt(childId, flagId, parentNotifiedAt)

    logger.info('Parent flag notification sent successfully', {
      childId,
      flagId,
      familyId,
      successCount: response.successCount,
      parentNotifiedAt,
    })

    return {
      sent: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokensCleanedUp,
      parentNotifiedAt,
    }
  }

  logger.warn('Failed to send parent flag notification', {
    childId,
    flagId,
    familyId,
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
