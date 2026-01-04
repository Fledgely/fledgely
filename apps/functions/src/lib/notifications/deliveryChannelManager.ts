/**
 * Delivery Channel Manager - Multi-channel notification orchestration.
 *
 * Story 41.6: Notification Delivery Channels - AC1, AC4, AC5, AC7
 *
 * Features:
 * - Get user channel preferences
 * - Deliver notifications across multiple channels
 * - Push-to-email fallback logic
 * - Delivery logging for audit trail
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  type NotificationType,
  type DeliveryChannelType,
  type NotificationChannelPreferences,
  type ChannelSettings,
  type DeliveryLog,
  type DeliverNotificationInput,
  type DeliveryResult,
  type ChannelDeliveryResult,
  isSecurityNotificationType,
  getDefaultChannels,
  defaultChannelPreferences,
} from '@fledgely/shared'
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
 * Notification token stored in user's subcollection
 */
interface NotificationToken {
  token: string
  createdAt?: number
}

/**
 * Get channel preferences for a user and notification type.
 *
 * @param userId - User ID
 * @param notificationType - Type of notification
 * @returns Channel settings for the notification type
 */
export async function getChannelPreferences(
  userId: string,
  notificationType: NotificationType
): Promise<ChannelSettings> {
  try {
    const prefsDoc = await getDb()
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('channelPreferences')
      .get()

    if (!prefsDoc.exists) {
      return getDefaultChannels(notificationType)
    }

    const prefs = prefsDoc.data() as NotificationChannelPreferences
    const channelSettings = prefs[notificationType]

    if (!channelSettings) {
      return getDefaultChannels(notificationType)
    }

    // For security notifications, force push and email enabled
    if (isSecurityNotificationType(notificationType)) {
      return {
        push: true,
        email: true,
        sms: false, // Security notifications never use SMS
      }
    }

    return {
      push: channelSettings.push ?? true,
      email: channelSettings.email ?? false,
      sms: channelSettings.sms ?? false,
    }
  } catch (error) {
    logger.error('Error getting channel preferences', { userId, notificationType, error })
    return getDefaultChannels(notificationType)
  }
}

/**
 * Get user's verified contact info.
 *
 * @param userId - User ID
 * @returns Verified email and phone
 */
async function getVerifiedContacts(userId: string): Promise<{ email?: string; phone?: string }> {
  try {
    const prefsDoc = await getDb()
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('channelPreferences')
      .get()

    if (!prefsDoc.exists) {
      // Fall back to user document
      const userDoc = await getDb().collection('users').doc(userId).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        return {
          email: userData?.email,
          phone: userData?.phone,
        }
      }
      return {}
    }

    const prefs = prefsDoc.data() as NotificationChannelPreferences
    return {
      email: prefs.verifiedEmail,
      phone: prefs.verifiedPhone,
    }
  } catch (error) {
    logger.error('Error getting verified contacts', { userId, error })
    return {}
  }
}

/**
 * Get FCM tokens for a user.
 *
 * @param userId - User ID
 * @returns Array of FCM tokens
 */
async function getUserTokens(userId: string): Promise<{ tokenId: string; token: string }[]> {
  const tokensRef = getDb().collection('users').doc(userId).collection('notificationTokens')
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
 * Remove a stale FCM token.
 *
 * @param userId - User ID
 * @param tokenId - Token document ID
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
 * Send push notification via FCM.
 *
 * @param userId - User ID
 * @param content - Notification content
 * @returns Channel delivery result
 */
async function sendPushNotification(
  userId: string,
  content: { title: string; body: string; actionUrl?: string; data?: Record<string, string> }
): Promise<ChannelDeliveryResult> {
  const tokens = await getUserTokens(userId)

  if (tokens.length === 0) {
    return {
      channel: 'push',
      success: false,
      failureReason: 'No FCM tokens registered',
    }
  }

  try {
    const messaging = getMessaging()

    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: {
        title: content.title,
        body: content.body,
      },
      data: content.data || {},
      webpush: content.actionUrl
        ? {
            fcmOptions: {
              link: content.actionUrl,
            },
          }
        : undefined,
    })

    // Clean up stale tokens
    if (response.failureCount > 0) {
      const cleanupPromises: Promise<void>[] = []

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            cleanupPromises.push(removeStaleToken(userId, tokens[idx].tokenId))
          }
        }
      })

      await Promise.all(cleanupPromises)
    }

    if (response.successCount > 0) {
      return {
        channel: 'push',
        success: true,
        messageId: response.responses.find((r) => r.success)?.messageId,
      }
    }

    return {
      channel: 'push',
      success: false,
      failureReason: 'All FCM tokens failed',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      channel: 'push',
      success: false,
      failureReason: errorMessage,
    }
  }
}

/**
 * Log a delivery attempt.
 *
 * @param params - Delivery log parameters
 */
async function logDeliveryAttempt(params: Omit<DeliveryLog, 'id' | 'createdAt'>): Promise<void> {
  try {
    const logRef = getDb().collection('users').doc(params.userId).collection('deliveryLogs').doc()

    const logEntry: DeliveryLog = {
      id: logRef.id,
      ...params,
      createdAt: Date.now(),
    }

    await logRef.set(logEntry)
  } catch (error) {
    logger.error('Failed to log delivery attempt', { error, params })
  }
}

/**
 * Handle push-to-email fallback.
 *
 * @param userId - User ID
 * @param familyId - Family ID
 * @param notificationType - Type of notification
 * @param content - Notification content
 * @param pushResult - Result of push attempt
 * @returns Email delivery result or null if email not enabled
 */
async function handlePushFallback(
  userId: string,
  familyId: string,
  notificationType: NotificationType,
  content: { title: string; body: string; actionUrl?: string },
  _pushResult: ChannelDeliveryResult
): Promise<ChannelDeliveryResult | null> {
  // Get user's email
  const contacts = await getVerifiedContacts(userId)

  if (!contacts.email) {
    logger.warn('No verified email for fallback', { userId })
    return null
  }

  // Send fallback email
  const isSecurityAlert = isSecurityNotificationType(notificationType)

  const emailResult = await sendNotificationEmail({
    to: contacts.email,
    notificationType,
    content,
    includeUnsubscribe: !isSecurityAlert,
    userId,
    fallbackMessage: 'You may have missed this notification',
  })

  const result: ChannelDeliveryResult = {
    channel: 'email',
    success: emailResult.success,
    messageId: emailResult.messageId,
    failureReason: emailResult.error,
  }

  // Log fallback delivery
  await logDeliveryAttempt({
    notificationId: `fallback-${Date.now()}`,
    userId,
    familyId,
    notificationType,
    channel: 'email',
    status: emailResult.success ? 'fallback' : 'failed',
    failureReason: emailResult.error,
    fallbackChannel: 'push', // This was the fallback from push
  })

  return result
}

/**
 * Deliver a notification across configured channels.
 *
 * @param input - Delivery input parameters
 * @returns Comprehensive delivery result
 */
export async function deliverNotification(
  input: DeliverNotificationInput
): Promise<DeliveryResult> {
  const { userId, familyId, notificationType, priority } = input
  // Extract content with explicit type to work around Zod inference issues
  const content: {
    title: string
    body: string
    actionUrl?: string
    data?: Record<string, string>
  } = {
    title: input.content.title!,
    body: input.content.body!,
    actionUrl: input.content.actionUrl,
    data: input.content.data,
  }
  const notificationId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // Get channel preferences
  const channelPrefs = await getChannelPreferences(userId, notificationType)
  const contacts = await getVerifiedContacts(userId)

  const results: ChannelDeliveryResult[] = []
  const primaryChannel: DeliveryChannelType = 'push'
  let fallbackUsed = false
  let fallbackChannel: DeliveryChannelType | undefined

  // 1. Push notification (primary channel)
  if (channelPrefs.push) {
    const pushResult = await sendPushNotification(userId, {
      title: content.title,
      body: content.body,
      actionUrl: content.actionUrl,
      data: content.data,
    })

    results.push(pushResult)

    // Log push attempt
    await logDeliveryAttempt({
      notificationId,
      userId,
      familyId,
      notificationType,
      channel: 'push',
      status: pushResult.success ? 'sent' : 'failed',
      messageId: pushResult.messageId,
      failureReason: pushResult.failureReason,
    })

    // Handle fallback if push failed and email is enabled
    if (!pushResult.success && channelPrefs.email) {
      const fallbackResult = await handlePushFallback(
        userId,
        familyId,
        notificationType,
        content,
        pushResult
      )

      if (fallbackResult) {
        results.push(fallbackResult)
        fallbackUsed = true
        fallbackChannel = 'email'
      }
    }
  }

  // 2. Email (if enabled and not already sent as fallback)
  if (channelPrefs.email && !fallbackUsed && contacts.email) {
    const isSecurityAlert = isSecurityNotificationType(notificationType)

    const emailResult = await sendNotificationEmail({
      to: contacts.email,
      notificationType,
      content,
      includeUnsubscribe: !isSecurityAlert,
      userId,
    })

    const result: ChannelDeliveryResult = {
      channel: 'email',
      success: emailResult.success,
      messageId: emailResult.messageId,
      failureReason: emailResult.error,
    }

    results.push(result)

    // Log email attempt
    await logDeliveryAttempt({
      notificationId,
      userId,
      familyId,
      notificationType,
      channel: 'email',
      status: emailResult.success ? 'sent' : 'failed',
      messageId: emailResult.messageId,
      failureReason: emailResult.error,
    })
  }

  // 3. SMS (only for critical priority with SMS enabled)
  if (
    channelPrefs.sms &&
    priority === 'critical' &&
    contacts.phone &&
    notificationType === 'criticalFlags'
  ) {
    const smsResult = await sendSmsNotification({
      to: contacts.phone,
      notificationType,
      content,
      includeAppLink: true,
    })

    const result: ChannelDeliveryResult = {
      channel: 'sms',
      success: smsResult.success,
      messageId: smsResult.messageSid,
      failureReason: smsResult.error,
    }

    results.push(result)

    // Log SMS attempt
    await logDeliveryAttempt({
      notificationId,
      userId,
      familyId,
      notificationType,
      channel: 'sms',
      status: smsResult.success ? 'sent' : 'failed',
      messageId: smsResult.messageSid,
      failureReason: smsResult.error,
    })
  }

  // Determine overall success
  const allDelivered = results.length > 0 && results.every((r) => r.success)

  return {
    notificationId,
    channels: results,
    primaryChannel,
    fallbackUsed,
    fallbackChannel,
    allDelivered,
  }
}

/**
 * Update channel preferences for a user.
 *
 * @param userId - User ID
 * @param preferences - New preferences (partial update)
 * @returns Updated preferences
 */
export async function updateChannelPreferences(
  userId: string,
  preferences: Partial<NotificationChannelPreferences>
): Promise<NotificationChannelPreferences> {
  const prefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('settings')
    .doc('channelPreferences')

  // Merge with existing preferences
  const existing = await prefsRef.get()
  const currentPrefs: NotificationChannelPreferences = existing.exists
    ? (existing.data() as NotificationChannelPreferences)
    : { ...defaultChannelPreferences }

  // Ensure login alerts cannot be modified
  const { loginAlerts: _ignored, ...safePreferences } = preferences

  const updated: NotificationChannelPreferences = {
    ...currentPrefs,
    ...safePreferences,
    loginAlerts: { push: true, email: true, sms: false }, // Always locked
  }

  await prefsRef.set(updated, { merge: true })

  return updated
}
