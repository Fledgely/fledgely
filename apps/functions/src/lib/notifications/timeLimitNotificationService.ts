/**
 * Time Limit Notification Service
 *
 * Story 41.3: Time Limit Notifications - AC1, AC2, AC6, AC7
 *
 * Sends time limit notifications to parents:
 * - Warning notifications when approaching limits
 * - Limit reached notifications when limits are enforced
 * - Respects quiet hours and notification preferences
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  type TimeLimitWarningParams,
  type LimitReachedParams,
  type ParentNotificationPreferences,
  buildParentWarningContent,
  buildParentLimitReachedContent,
  isInQuietHours,
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
 * Result of sending time limit notifications
 */
export interface TimeLimitNotificationResult {
  /** Whether any notification was generated */
  notificationGenerated: boolean
  /** Parents who received notifications */
  parentsNotified: string[]
  /** Parents who were skipped (preferences/quiet hours) */
  parentsSkipped: string[]
  /** Whether notifications were delayed due to quiet hours */
  delayedForQuietHours: boolean
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
  type: 'time_warning' | 'limit_reached',
  childId: string,
  status: 'sent' | 'failed' | 'delayed'
): Promise<void> {
  const historyRef = getDb().collection('users').doc(userId).collection('notificationHistory').doc()

  await historyRef.set({
    id: historyRef.id,
    userId,
    type,
    childId,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Queue notification for post-quiet-hours delivery
 */
async function queueDelayedNotification(
  userId: string,
  type: 'time_warning' | 'limit_reached',
  childId: string,
  childName: string,
  content: { title: string; body: string; data: Record<string, unknown> },
  delayedUntil: number
): Promise<void> {
  const queueRef = getDb().collection('users').doc(userId).collection('delayedNotifications').doc()

  await queueRef.set({
    id: queueRef.id,
    userId,
    type,
    childId,
    childName,
    content,
    queuedAt: Date.now(),
    deliverAt: delayedUntil,
    status: 'pending',
  })

  logger.info('Time limit notification queued for post-quiet-hours delivery', {
    userId,
    type,
    childId,
    delayedUntil: new Date(delayedUntil).toISOString(),
  })
}

/**
 * Calculate when quiet hours end
 */
function calculateQuietHoursEnd(prefs: ParentNotificationPreferences): number {
  const now = new Date()
  const endTime = prefs.quietHoursEnd || '07:00'
  const [hours, minutes] = endTime.split(':').map(Number)

  const endDate = new Date(now)
  endDate.setHours(hours, minutes, 0, 0)

  if (endDate <= now) {
    endDate.setDate(endDate.getDate() + 1)
  }

  return endDate.getTime()
}

/**
 * Send time limit warning notification to parents
 *
 * Story 41.3 - AC1: Time limit warning notifications
 */
export async function sendTimeLimitWarningNotification(
  params: TimeLimitWarningParams
): Promise<TimeLimitNotificationResult> {
  const { childId, childName, familyId } = params

  logger.info('Sending time limit warning notification', {
    childId,
    childName,
    familyId,
    remainingMinutes: params.remainingMinutes,
    limitType: params.limitType,
  })

  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
    }
  }

  const content = buildParentWarningContent(params)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const parentsNotified: string[] = []
  const parentsSkipped: string[] = []
  let delayedForQuietHours = false
  const now = new Date()

  for (const userId of parentIds) {
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Check if time limit warnings are enabled
    if (!prefs.timeLimitWarningsEnabled) {
      logger.info('Time limit warnings disabled for user', { userId })
      parentsSkipped.push(userId)
      continue
    }

    // Check quiet hours (time limit warnings can be delayed)
    if (prefs.quietHoursEnabled && isInQuietHours(prefs, now)) {
      const delayedUntil = calculateQuietHoursEnd(prefs)
      await queueDelayedNotification(
        userId,
        'time_warning',
        childId,
        childName,
        content,
        delayedUntil
      )
      await recordNotificationHistory(userId, 'time_warning', childId, 'delayed')
      delayedForQuietHours = true
      parentsSkipped.push(userId)
      continue
    }

    // Get user tokens
    const tokens = await getUserTokens(userId)
    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      await recordNotificationHistory(userId, 'time_warning', childId, 'failed')
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
          ...Object.fromEntries(Object.entries(content.data).map(([k, v]) => [k, String(v)])),
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/dashboard/time/${childId}`,
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
        await recordNotificationHistory(userId, 'time_warning', childId, 'sent')
        parentsNotified.push(userId)
        logger.info('Time limit warning notification sent', {
          userId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(userId, 'time_warning', childId, 'failed')
        parentsSkipped.push(userId)
      }
    } catch (error) {
      logger.error('Failed to send time limit warning', { userId, error })
      await recordNotificationHistory(userId, 'time_warning', childId, 'failed')
      parentsSkipped.push(userId)
    }
  }

  return {
    notificationGenerated: parentsNotified.length > 0 || delayedForQuietHours,
    parentsNotified,
    parentsSkipped,
    delayedForQuietHours,
  }
}

/**
 * Send limit reached notification to parents
 *
 * Story 41.3 - AC2: Limit reached notifications
 */
export async function sendLimitReachedNotification(
  params: LimitReachedParams
): Promise<TimeLimitNotificationResult> {
  const { childId, childName, familyId } = params

  logger.info('Sending limit reached notification', {
    childId,
    childName,
    familyId,
    currentMinutes: params.currentMinutes,
    allowedMinutes: params.allowedMinutes,
    limitType: params.limitType,
  })

  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
    }
  }

  const content = buildParentLimitReachedContent(params)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const parentsNotified: string[] = []
  const parentsSkipped: string[] = []
  let delayedForQuietHours = false
  const now = new Date()

  for (const userId of parentIds) {
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Check if limit reached notifications are enabled
    if (!prefs.limitReachedEnabled) {
      logger.info('Limit reached notifications disabled for user', { userId })
      parentsSkipped.push(userId)
      continue
    }

    // Check quiet hours (limit reached can be delayed)
    if (prefs.quietHoursEnabled && isInQuietHours(prefs, now)) {
      const delayedUntil = calculateQuietHoursEnd(prefs)
      await queueDelayedNotification(
        userId,
        'limit_reached',
        childId,
        childName,
        content,
        delayedUntil
      )
      await recordNotificationHistory(userId, 'limit_reached', childId, 'delayed')
      delayedForQuietHours = true
      parentsSkipped.push(userId)
      continue
    }

    // Get user tokens
    const tokens = await getUserTokens(userId)
    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      await recordNotificationHistory(userId, 'limit_reached', childId, 'failed')
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
          ...Object.fromEntries(Object.entries(content.data).map(([k, v]) => [k, String(v)])),
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/dashboard/time/${childId}`,
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
        await recordNotificationHistory(userId, 'limit_reached', childId, 'sent')
        parentsNotified.push(userId)
        logger.info('Limit reached notification sent', {
          userId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(userId, 'limit_reached', childId, 'failed')
        parentsSkipped.push(userId)
      }
    } catch (error) {
      logger.error('Failed to send limit reached notification', { userId, error })
      await recordNotificationHistory(userId, 'limit_reached', childId, 'failed')
      parentsSkipped.push(userId)
    }
  }

  return {
    notificationGenerated: parentsNotified.length > 0 || delayedForQuietHours,
    parentsNotified,
    parentsSkipped,
    delayedForQuietHours,
  }
}
