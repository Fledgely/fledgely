/**
 * Send Immediate Flag Notification
 *
 * Story 41.2: Flag Notifications - AC1, AC6
 * Story 41.6: Multi-channel delivery support
 *
 * Sends immediate push notifications for flags, respecting:
 * - Quiet hours (except for critical flags)
 * - FCM token management
 * - Deep linking to flag detail
 * - Multi-channel delivery (push, email, SMS) based on preferences
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  type FlagDocument,
  type ParentNotificationPreferences,
  type ConcernSeverity,
  type NotificationType,
  type ChannelSettings,
  isInQuietHours,
} from '@fledgely/shared'
import { getChannelPreferences as getDeliveryChannelPreferences } from './deliveryChannelManager'
import { sendNotificationEmail } from '../email'
import { sendSmsNotification } from '../sms'

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
    case 'high':
      return { label: 'High', badge: '🔴' }
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
 * Map severity to notification type for channel preferences
 * Story 41.6: All flag severities use 'criticalFlags' channel settings
 * (the schema has a single flag notification type for all severities)
 */
function getNotificationTypeForSeverity(_severity: ConcernSeverity): NotificationType {
  // All flag severities use the same channel preferences
  return 'criticalFlags'
}

/**
 * Get user email and phone from Firestore
 */
async function getUserContactInfo(userId: string): Promise<{ email?: string; phone?: string }> {
  const userRef = getDb().collection('users').doc(userId)
  const userDoc = await userRef.get()

  if (!userDoc.exists) {
    return {}
  }

  const userData = userDoc.data()
  return {
    email: userData?.email,
    phone: userData?.phone,
  }
}

/**
 * Send notification via email channel
 * Story 41.6: Multi-channel delivery
 */
async function sendEmailChannel(
  userId: string,
  email: string,
  title: string,
  body: string,
  notificationType: NotificationType,
  deepLink: string
): Promise<boolean> {
  try {
    const result = await sendNotificationEmail({
      to: email,
      notificationType,
      content: { title, body, actionUrl: deepLink },
      includeUnsubscribe: true,
      userId,
    })
    return result.success
  } catch (error) {
    logger.error('Failed to send flag email notification', { userId, error })
    return false
  }
}

/**
 * Send notification via SMS channel
 * Story 41.6: Multi-channel delivery
 */
async function sendSmsChannel(
  userId: string,
  phone: string,
  notificationType: NotificationType,
  title: string,
  body: string
): Promise<boolean> {
  try {
    const result = await sendSmsNotification({
      to: phone,
      notificationType,
      content: { title, body },
    })
    return result.success
  } catch (error) {
    logger.error('Failed to send flag SMS notification', { userId, error })
    return false
  }
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
 * Story 41.6: Multi-channel delivery (push, email, SMS)
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

  // AC6: Check quiet hours (except high severity flags bypass)
  if (preferences.quietHoursEnabled && flag.severity !== 'high') {
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

  // Build notification content
  const severityDisplay = getSeverityDisplay(flag.severity)
  const categoryDisplay = getCategoryDisplay(flag.category)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'
  const deepLink = `${appUrl}/flags/${flag.childId}/${flag.id}`

  const title = `${severityDisplay.badge} ${severityDisplay.label}: ${categoryDisplay}`
  const body = `New flagged content for ${childName} requires your review`

  // Story 41.6: Get channel preferences for this notification type
  const notificationType = getNotificationTypeForSeverity(flag.severity)
  let channelPrefs: ChannelSettings = { push: true, email: false, sms: false }
  try {
    channelPrefs = await getDeliveryChannelPreferences(userId, notificationType)
  } catch (error) {
    logger.warn('Failed to get channel preferences, using defaults', { userId, error })
  }

  // Get user contact info for email/SMS
  const contactInfo = await getUserContactInfo(userId)

  let pushSuccess = false
  let pushAttempted = false
  let tokensCleanedUp = 0

  // Send via push if enabled
  if (channelPrefs.push) {
    const tokens = await getUserTokens(userId)

    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      pushAttempted = true
    } else {
      pushAttempted = true
      const messaging = getMessaging()

      try {
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
              link: deepLink,
            },
          },
          android: {
            priority: flag.severity === 'high' ? 'high' : 'normal',
            notification: {
              priority: flag.severity === 'high' ? 'max' : 'default',
              channelId: flag.severity === 'high' ? 'critical_flags' : 'flag_alerts',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: flag.severity === 'high' ? 'critical.wav' : 'default',
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

        pushSuccess = response.successCount > 0
      } catch (error) {
        logger.error('FCM send failed', { userId, flagId: flag.id, error })
      }
    }
  }

  // Story 41.6: Send email if enabled OR as push-to-email fallback
  let emailSent = false
  const shouldSendEmail = channelPrefs.email || (channelPrefs.push && pushAttempted && !pushSuccess)

  if (shouldSendEmail && contactInfo.email) {
    emailSent = await sendEmailChannel(
      userId,
      contactInfo.email,
      title,
      body,
      notificationType,
      deepLink
    )

    if (emailSent) {
      logger.info('Flag notification sent via email', {
        userId,
        flagId: flag.id,
        isPushFallback: !channelPrefs.email,
      })
    }
  }

  // Story 41.6: Send SMS if enabled
  let smsSent = false
  if (channelPrefs.sms && contactInfo.phone) {
    smsSent = await sendSmsChannel(userId, contactInfo.phone, notificationType, title, body)

    if (smsSent) {
      logger.info('Flag notification sent via SMS', { userId, flagId: flag.id })
    }
  }

  // Determine overall success
  const anySent = pushSuccess || emailSent || smsSent

  // Record notification history
  await recordNotificationHistory(userId, flag, anySent ? 'sent' : 'failed')

  if (anySent) {
    logger.info('Immediate flag notification sent successfully', {
      userId,
      flagId: flag.id,
      channels: {
        push: pushSuccess,
        email: emailSent,
        sms: smsSent,
      },
    })

    return {
      sent: true,
      delayed: false,
      successCount: (pushSuccess ? 1 : 0) + (emailSent ? 1 : 0) + (smsSent ? 1 : 0),
      failureCount: 0,
      tokensCleanedUp,
    }
  }

  logger.warn('Failed to send immediate flag notification on any channel', {
    userId,
    flagId: flag.id,
  })

  return {
    sent: false,
    delayed: false,
    successCount: 0,
    failureCount: 1,
    tokensCleanedUp,
    reason:
      !channelPrefs.push && !channelPrefs.email && !channelPrefs.sms
        ? 'no_tokens' // No channels enabled
        : 'send_failed',
  }
}
