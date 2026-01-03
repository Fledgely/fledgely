/**
 * Send Immediate Flag Notification
 *
 * Story 41.2: Flag Notifications - AC1, AC6
 *
 * Sends immediate push notifications for flags, respecting:
 * - Quiet hours (except for critical flags)
 * - FCM token management
 * - Deep linking to flag detail
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  type FlagDocument,
  type ParentNotificationPreferences,
  type ConcernSeverity,
  isInQuietHours,
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
 * Parameters for sending immediate flag notification
 */
export interface SendImmediateFlagNotificationParams {
  userId: string
  flag: FlagDocument
  childName: string
  preferences: ParentNotificationPreferences
}

/**
 * Result of sending immediate flag notification
 */
export interface SendImmediateFlagNotificationResult {
  sent: boolean
  delayed: boolean
  delayedUntil?: number
  successCount: number
  failureCount: number
  tokensCleanedUp: number
  reason?: 'no_tokens' | 'send_failed' | 'quiet_hours_delayed'
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
 * Get severity display name and badge color
 */
function getSeverityDisplay(severity: ConcernSeverity): {
  label: string
  badge: string
} {
  switch (severity) {
    case 'critical':
      return { label: 'Critical', badge: '🔴' }
    case 'medium':
      return { label: 'Medium', badge: '🟡' }
    case 'low':
      return { label: 'Low', badge: '🟢' }
    default:
      return { label: 'Unknown', badge: '⚪' }
  }
}

/**
 * Get category display name
 */
function getCategoryDisplay(category: string): string {
  const categoryLabels: Record<string, string> = {
    explicit_content: 'Explicit Content',
    violence: 'Violence',
    self_harm: 'Self-Harm',
    cyberbullying: 'Cyberbullying',
    drugs_alcohol: 'Drugs/Alcohol',
    predatory_behavior: 'Predatory Behavior',
    personal_info_sharing: 'Personal Info Sharing',
    inappropriate_contact: 'Inappropriate Contact',
    other: 'Other Concern',
  }

  return categoryLabels[category] || 'Flagged Content'
}

/**
 * Calculate when quiet hours end
 */
function calculateQuietHoursEnd(prefs: ParentNotificationPreferences): number {
  const now = new Date()
  const endTime = prefs.quietHoursEnd || '07:00'
  const [hours, minutes] = endTime.split(':').map(Number)

  // Create date for today's end time
  const endDate = new Date(now)
  endDate.setHours(hours, minutes, 0, 0)

  // If end time is before current time, it's tomorrow
  if (endDate <= now) {
    endDate.setDate(endDate.getDate() + 1)
  }

  return endDate.getTime()
}

/**
 * Queue notification for post-quiet-hours delivery
 */
async function queueDelayedNotification(
  userId: string,
  flag: FlagDocument,
  childName: string,
  delayedUntil: number
): Promise<void> {
  const queueRef = getDb().collection('users').doc(userId).collection('delayedNotifications').doc()

  await queueRef.set({
    id: queueRef.id,
    userId,
    flagId: flag.id,
    childId: flag.childId,
    childName,
    severity: flag.severity,
    category: flag.category,
    queuedAt: Date.now(),
    deliverAt: delayedUntil,
    type: 'flag',
    status: 'pending',
  })

  logger.info('Notification queued for post-quiet-hours delivery', {
    userId,
    flagId: flag.id,
    delayedUntil: new Date(delayedUntil).toISOString(),
  })
}

/**
 * Record notification in history for audit and deduplication
 */
async function recordNotificationHistory(
  userId: string,
  flag: FlagDocument,
  status: 'sent' | 'failed' | 'delayed'
): Promise<void> {
  const historyRef = getDb().collection('users').doc(userId).collection('notificationHistory').doc()

  await historyRef.set({
    id: historyRef.id,
    userId,
    type: 'flag',
    flagId: flag.id,
    childId: flag.childId,
    severity: flag.severity,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Send immediate flag notification to a user
 *
 * Story 41.2: Flag Notifications - AC1, AC6
 *
 * @param params - Notification parameters
 * @returns Result of sending notification
 */
export async function sendImmediateFlagNotification(
  params: SendImmediateFlagNotificationParams
): Promise<SendImmediateFlagNotificationResult> {
  const { userId, flag, childName, preferences } = params
  const now = new Date()

  logger.info('Sending immediate flag notification', {
    userId,
    flagId: flag.id,
    severity: flag.severity,
    childName,
  })

  // AC6: Check quiet hours (except critical flags bypass)
  if (preferences.quietHoursEnabled && flag.severity !== 'critical') {
    if (isInQuietHours(preferences, now)) {
      const delayedUntil = calculateQuietHoursEnd(preferences)

      logger.info('Notification delayed due to quiet hours', {
        userId,
        flagId: flag.id,
        delayedUntil: new Date(delayedUntil).toISOString(),
      })

      // Queue for later delivery
      await queueDelayedNotification(userId, flag, childName, delayedUntil)
      await recordNotificationHistory(userId, flag, 'delayed')

      return {
        sent: false,
        delayed: true,
        delayedUntil,
        successCount: 0,
        failureCount: 0,
        tokensCleanedUp: 0,
        reason: 'quiet_hours_delayed',
      }
    }
  }

  // Get user's FCM tokens
  const tokens = await getUserTokens(userId)

  if (tokens.length === 0) {
    logger.info('No tokens found for user', { userId })
    await recordNotificationHistory(userId, flag, 'failed')

    return {
      sent: false,
      delayed: false,
      successCount: 0,
      failureCount: 0,
      tokensCleanedUp: 0,
      reason: 'no_tokens',
    }
  }

  // Build notification content
  const severityDisplay = getSeverityDisplay(flag.severity)
  const categoryDisplay = getCategoryDisplay(flag.category)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const title = `${severityDisplay.badge} ${severityDisplay.label}: ${categoryDisplay}`
  const body = `New flagged content for ${childName} requires your review`

  // Send via FCM
  const messaging = getMessaging()

  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title,
      body,
    },
    data: {
      type: 'flag_alert',
      flagId: flag.id,
      childId: flag.childId,
      severity: flag.severity,
      category: flag.category,
      action: 'review_flag',
    },
    webpush: {
      fcmOptions: {
        link: `${appUrl}/flags/${flag.childId}/${flag.id}`,
      },
    },
    android: {
      priority: flag.severity === 'critical' ? 'high' : 'normal',
      notification: {
        priority: flag.severity === 'critical' ? 'max' : 'default',
        channelId: flag.severity === 'critical' ? 'critical_flags' : 'flag_alerts',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: flag.severity === 'critical' ? 'critical.wav' : 'default',
          badge: 1,
        },
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
          cleanupPromises.push(removeStaleToken(userId, tokenInfo.tokenId))
          tokensCleanedUp++
        } else {
          logger.error('FCM send error', { error: resp.error })
        }
      }
    })

    await Promise.all(cleanupPromises)
  }

  // Record notification history
  await recordNotificationHistory(userId, flag, response.successCount > 0 ? 'sent' : 'failed')

  if (response.successCount > 0) {
    logger.info('Immediate flag notification sent successfully', {
      userId,
      flagId: flag.id,
      successCount: response.successCount,
    })

    return {
      sent: true,
      delayed: false,
      successCount: response.successCount,
      failureCount: response.failureCount,
      tokensCleanedUp,
    }
  }

  logger.warn('Failed to send immediate flag notification', {
    userId,
    flagId: flag.id,
    failureCount: response.failureCount,
  })

  return {
    sent: false,
    delayed: false,
    successCount: 0,
    failureCount: response.failureCount,
    tokensCleanedUp,
    reason: 'send_failed',
  }
}
