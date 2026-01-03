/**
 * Extension Request Notification Service
 *
 * Story 41.3: Time Limit Notifications - AC3, AC6
 *
 * Sends notifications when child requests time extension:
 * - Sends to ALL guardians (co-parent symmetry FR103)
 * - BYPASSES quiet hours (action required)
 * - Includes approve/deny quick actions
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  type ExtensionRequestNotificationParams,
  type ParentNotificationPreferences,
  buildExtensionRequestContent,
  createDefaultNotificationPreferences,
} from '@fledgely/shared'

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
 * Result of sending extension request notification
 */
export interface ExtensionRequestNotificationResult {
  /** Whether any notification was generated */
  notificationGenerated: boolean
  /** Parents who received notifications */
  parentsNotified: string[]
  /** Parents who were skipped (preferences disabled) */
  parentsSkipped: string[]
  /** Request ID for tracking */
  requestId: string
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
 * Get parent IDs for a family
 */
async function getParentIdsForFamily(familyId: string): Promise<string[]> {
  const familyRef = getDb().collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    logger.warn('Family not found', { familyId })
    return []
  }

  const familyData = familyDoc.data()

  // Check both parentIds and guardians arrays
  const parentIds = familyData?.parentIds as string[] | undefined
  if (parentIds && parentIds.length > 0) {
    return parentIds
  }

  // Fallback to guardians array
  const guardians = familyData?.guardians as Array<{ uid: string }> | undefined
  if (guardians && guardians.length > 0) {
    return guardians.map((g) => g.uid)
  }

  return []
}

/**
 * Get notification preferences for a user
 */
async function getPreferencesForUser(
  userId: string,
  familyId: string,
  childId: string
): Promise<ParentNotificationPreferences> {
  // Try child-specific preferences first
  const childPrefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('notificationPreferences')
    .doc(childId)

  const childPrefsDoc = await childPrefsRef.get()
  if (childPrefsDoc.exists) {
    const data = childPrefsDoc.data()
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(),
    } as ParentNotificationPreferences
  }

  // Try family-wide preferences
  const defaultPrefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('notificationPreferences')
    .doc('default')

  const defaultPrefsDoc = await defaultPrefsRef.get()
  if (defaultPrefsDoc.exists) {
    const data = defaultPrefsDoc.data()
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(),
    } as ParentNotificationPreferences
  }

  // Return defaults if no preferences stored
  return createDefaultNotificationPreferences(userId, familyId, childId)
}

/**
 * Record notification in history for audit
 */
async function recordNotificationHistory(
  userId: string,
  childId: string,
  requestId: string,
  status: 'sent' | 'failed'
): Promise<void> {
  const historyRef = getDb().collection('users').doc(userId).collection('notificationHistory').doc()

  await historyRef.set({
    id: historyRef.id,
    userId,
    type: 'extension_request',
    childId,
    extensionRequestId: requestId,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Send extension request notification to parents
 *
 * Story 41.3 - AC3: Extension request notifications
 * - Sends to ALL guardians (co-parent symmetry FR103)
 * - BYPASSES quiet hours (action required)
 */
export async function sendExtensionRequestNotification(
  params: ExtensionRequestNotificationParams
): Promise<ExtensionRequestNotificationResult> {
  const { requestId, childId, childName, familyId, minutesRequested, reason } = params

  logger.info('Sending extension request notification', {
    requestId,
    childId,
    childName,
    familyId,
    minutesRequested,
    hasReason: !!reason,
  })

  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      requestId,
    }
  }

  const content = buildExtensionRequestContent(params)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const parentsNotified: string[] = []
  const parentsSkipped: string[] = []

  // Send to ALL guardians for co-parent symmetry (FR103)
  for (const userId of parentIds) {
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Check if extension request notifications are enabled
    if (!prefs.extensionRequestsEnabled) {
      logger.info('Extension request notifications disabled for user', { userId })
      parentsSkipped.push(userId)
      await recordNotificationHistory(userId, childId, requestId, 'failed')
      continue
    }

    // NOTE: Extension requests BYPASS quiet hours - action required!
    // This is intentional per AC6

    // Get user tokens
    const tokens = await getUserTokens(userId)
    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      await recordNotificationHistory(userId, childId, requestId, 'failed')
      parentsSkipped.push(userId)
      continue
    }

    // Send via FCM
    const messaging = getMessaging()

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: content.title,
          body: content.body,
        },
        data: {
          type: 'extension_request',
          childId,
          familyId,
          requestId,
          minutesRequested: String(minutesRequested),
          action: 'respond_extension',
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/dashboard/time/${childId}/extensions/${requestId}`,
          },
          notification: {
            // Add action buttons for web push
            actions: [
              { action: 'approve', title: 'Approve' },
              { action: 'deny', title: 'Deny' },
            ],
          },
        },
        android: {
          // High priority for actionable notifications
          priority: 'high',
          notification: {
            priority: 'high',
            channelId: 'extension_requests',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'EXTENSION_REQUEST', // For iOS action buttons
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
              cleanupPromises.push(removeStaleToken(userId, tokenInfo.tokenId))
            }
          }
        })

        await Promise.all(cleanupPromises)
      }

      if (response.successCount > 0) {
        await recordNotificationHistory(userId, childId, requestId, 'sent')
        parentsNotified.push(userId)
        logger.info('Extension request notification sent', {
          userId,
          requestId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(userId, childId, requestId, 'failed')
        parentsSkipped.push(userId)
      }
    } catch (error) {
      logger.error('Failed to send extension request notification', { userId, requestId, error })
      await recordNotificationHistory(userId, childId, requestId, 'failed')
      parentsSkipped.push(userId)
    }
  }

  return {
    notificationGenerated: parentsNotified.length > 0,
    parentsNotified,
    parentsSkipped,
    requestId,
  }
}

/**
 * Send extension response notification to child
 *
 * Story 41.3 - AC3: Child receives notification of response
 */
export async function sendExtensionResponseNotification(
  childId: string,
  approved: boolean,
  minutesGranted?: number
): Promise<{ sent: boolean; successCount: number }> {
  logger.info('Sending extension response notification to child', {
    childId,
    approved,
    minutesGranted,
  })

  // Get child tokens
  const tokens = await getUserTokens(childId)
  if (tokens.length === 0) {
    logger.info('No tokens found for child', { childId })
    return { sent: false, successCount: 0 }
  }

  const title = approved ? 'Extension Approved!' : 'Extension Request Denied'
  const body = approved
    ? `Great news! You got ${minutesGranted || 'more'} minutes of extra screen time.`
    : "Your extension request wasn't approved this time."

  const messaging = getMessaging()

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: {
        title,
        body,
      },
      data: {
        type: 'extension_response',
        approved: String(approved),
        minutesGranted: String(minutesGranted || 0),
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

    logger.info('Extension response notification sent to child', {
      childId,
      approved,
      successCount: response.successCount,
    })

    return {
      sent: response.successCount > 0,
      successCount: response.successCount,
    }
  } catch (error) {
    logger.error('Failed to send extension response notification', { childId, error })
    return { sent: false, successCount: 0 }
  }
}
