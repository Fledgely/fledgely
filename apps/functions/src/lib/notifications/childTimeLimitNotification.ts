/**
 * Child Time Limit Notification Service
 *
 * Story 41.3: Time Limit Notifications - AC4, AC5
 *
 * Sends time limit notifications directly to children:
 * - Warning when approaching limit (age-appropriate)
 * - Notification when limit is reached
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import { buildChildWarningContent, buildChildLimitReachedContent } from '@fledgely/shared'

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
 * Result of sending child notification
 */
export interface ChildTimeLimitNotificationResult {
  /** Whether notification was sent */
  sent: boolean
  /** Number of tokens successfully notified */
  successCount: number
  /** Child ID */
  childId: string
}

/**
 * Token stored in user's subcollection
 */
interface NotificationToken {
  token: string
  createdAt?: number
}

/**
 * Get all FCM tokens for a user
 */
async function getUserTokens(userId: string): Promise<{ tokenId: string; token: string }[]> {
  const tokensRef = getDb().collection('users').doc(userId).collection('notificationTokens')
  const tokenDocs = await tokensRef.get()

  const tokens: { tokenId: string; token: string }[] = []
  for (const doc of tokenDocs.docs) {
    const data = doc.data() as NotificationToken
    if (data.token) {
      tokens.push({
        tokenId: doc.id,
        token: data.token,
      })
    }
  }

  return tokens
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
 * Record notification in history for audit
 */
async function recordNotificationHistory(
  childId: string,
  type: 'child_time_warning' | 'child_limit_reached',
  status: 'sent' | 'failed'
): Promise<void> {
  const historyRef = getDb()
    .collection('users')
    .doc(childId)
    .collection('notificationHistory')
    .doc()

  await historyRef.set({
    id: historyRef.id,
    userId: childId,
    type,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Send time limit warning notification to child
 *
 * Story 41.3 - AC4: Child receives warning notification
 * Uses age-appropriate language
 */
export async function sendChildTimeLimitWarning(
  childId: string,
  remainingMinutes: number
): Promise<ChildTimeLimitNotificationResult> {
  logger.info('Sending time limit warning to child', {
    childId,
    remainingMinutes,
  })

  // Get child tokens
  const tokens = await getUserTokens(childId)
  if (tokens.length === 0) {
    logger.info('No tokens found for child', { childId })
    return { sent: false, successCount: 0, childId }
  }

  const content = buildChildWarningContent(remainingMinutes)

  const messaging = getMessaging()

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: {
        title: content.title,
        body: content.body,
      },
      data: {
        type: 'child_time_warning',
        remainingMinutes: String(remainingMinutes),
      },
      android: {
        notification: {
          channelId: 'time_limits',
          priority: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    })

    // Handle failures and clean up stale tokens
    if (response.failureCount > 0) {
      const cleanupPromises: Promise<void>[] = []

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            const tokenInfo = tokens[idx]
            cleanupPromises.push(removeStaleToken(childId, tokenInfo.tokenId))
          }
        }
      })

      await Promise.all(cleanupPromises)
    }

    if (response.successCount > 0) {
      await recordNotificationHistory(childId, 'child_time_warning', 'sent')
      logger.info('Child time warning sent', {
        childId,
        successCount: response.successCount,
      })
    } else {
      await recordNotificationHistory(childId, 'child_time_warning', 'failed')
    }

    return {
      sent: response.successCount > 0,
      successCount: response.successCount,
      childId,
    }
  } catch (error) {
    logger.error('Failed to send child time warning', { childId, error })
    await recordNotificationHistory(childId, 'child_time_warning', 'failed')
    return { sent: false, successCount: 0, childId }
  }
}

/**
 * Send limit reached notification to child
 *
 * Story 41.3 - AC5: Child receives limit reached notification
 * Uses encouraging, age-appropriate language
 */
export async function sendChildLimitReachedNotification(
  childId: string
): Promise<ChildTimeLimitNotificationResult> {
  logger.info('Sending limit reached notification to child', { childId })

  // Get child tokens
  const tokens = await getUserTokens(childId)
  if (tokens.length === 0) {
    logger.info('No tokens found for child', { childId })
    return { sent: false, successCount: 0, childId }
  }

  const content = buildChildLimitReachedContent()

  const messaging = getMessaging()

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: {
        title: content.title,
        body: content.body,
      },
      data: {
        type: 'child_limit_reached',
      },
      android: {
        notification: {
          channelId: 'time_limits',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    })

    // Handle failures and clean up stale tokens
    if (response.failureCount > 0) {
      const cleanupPromises: Promise<void>[] = []

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            const tokenInfo = tokens[idx]
            cleanupPromises.push(removeStaleToken(childId, tokenInfo.tokenId))
          }
        }
      })

      await Promise.all(cleanupPromises)
    }

    if (response.successCount > 0) {
      await recordNotificationHistory(childId, 'child_limit_reached', 'sent')
      logger.info('Child limit reached notification sent', {
        childId,
        successCount: response.successCount,
      })
    } else {
      await recordNotificationHistory(childId, 'child_limit_reached', 'failed')
    }

    return {
      sent: response.successCount > 0,
      successCount: response.successCount,
      childId,
    }
  } catch (error) {
    logger.error('Failed to send child limit reached notification', { childId, error })
    await recordNotificationHistory(childId, 'child_limit_reached', 'failed')
    return { sent: false, successCount: 0, childId }
  }
}
