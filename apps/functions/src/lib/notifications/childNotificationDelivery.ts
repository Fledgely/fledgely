/**
 * Child Notification Delivery Service
 *
 * Story 41.7: Child Notification Preferences - AC6
 *
 * Features:
 * - Check if notification should be delivered to child
 * - Deliver notifications to children via FCM
 * - Log delivery for child's audit trail
 * - Follow same patterns as parent delivery
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging, Message } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  shouldDeliverChildNotification,
  CHILD_NOTIFICATION_TYPES,
  type ChildNotificationPreferenceType,
} from '@fledgely/shared'
import { getChildNotificationPreferences } from './childNotificationPreferencesService'

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

// Lazy FCM initialization for testing
let messaging: ReturnType<typeof getMessaging> | null = null
function getFcm(): ReturnType<typeof getMessaging> {
  if (!messaging) {
    messaging = getMessaging()
  }
  return messaging
}

/** Reset FCM instance for testing */
export function _resetFcmForTesting(): void {
  messaging = null
}

/**
 * Notification content for children
 */
export interface ChildNotificationContent {
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Child delivery log entry
 */
export interface ChildDeliveryLog {
  id: string
  childId: string
  familyId: string
  notificationType: ChildNotificationPreferenceType
  content: ChildNotificationContent
  deliveredAt: FirebaseFirestore.Timestamp | FieldValue
  status: 'delivered' | 'skipped' | 'failed'
  reason?: string
  fcmMessageId?: string
}

/**
 * Child delivery result
 */
export interface ChildDeliveryResult {
  delivered: boolean
  reason?: string
  fcmMessageId?: string
}

/**
 * Check if notification should be delivered to child.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param notificationType - Type of notification
 * @returns Whether to deliver and reason if not
 */
export async function shouldDeliverToChild(
  childId: string,
  familyId: string,
  notificationType: ChildNotificationPreferenceType
): Promise<{ deliver: boolean; reason?: string }> {
  try {
    const preferences = await getChildNotificationPreferences(childId, familyId)
    return shouldDeliverChildNotification(preferences, notificationType)
  } catch (error) {
    logger.error('Error checking child delivery preferences', {
      childId,
      familyId,
      notificationType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    // On error, deliver required notifications, skip optional
    const isRequired =
      notificationType === CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING ||
      notificationType === CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE
    return {
      deliver: isRequired,
      reason: isRequired ? undefined : 'preferences_error',
    }
  }
}

/**
 * Get FCM token for child device.
 *
 * @param childId - Child ID
 * @returns FCM token or null if not found
 */
async function getChildFcmToken(childId: string): Promise<string | null> {
  try {
    const tokenDoc = await getDb()
      .collection('children')
      .doc(childId)
      .collection('settings')
      .doc('fcmToken')
      .get()

    if (!tokenDoc.exists) {
      return null
    }

    return tokenDoc.data()?.token || null
  } catch (error) {
    logger.warn('Failed to get child FCM token', {
      childId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Log notification delivery for child's audit trail.
 *
 * @param log - Delivery log entry
 */
async function logChildDelivery(log: Omit<ChildDeliveryLog, 'id'>): Promise<void> {
  try {
    const logRef = getDb()
      .collection('children')
      .doc(log.childId)
      .collection('notificationLogs')
      .doc()

    await logRef.set({
      ...log,
      id: logRef.id,
    })
  } catch (error) {
    logger.error('Failed to log child notification delivery', {
      childId: log.childId,
      notificationType: log.notificationType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Deliver notification to child.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param notificationType - Type of notification
 * @param content - Notification content
 * @returns Delivery result
 */
export async function deliverNotificationToChild(
  childId: string,
  familyId: string,
  notificationType: ChildNotificationPreferenceType,
  content: ChildNotificationContent
): Promise<ChildDeliveryResult> {
  // Check if should deliver
  const shouldDeliver = await shouldDeliverToChild(childId, familyId, notificationType)

  if (!shouldDeliver.deliver) {
    logger.info('Skipping child notification delivery', {
      childId,
      familyId,
      notificationType,
      reason: shouldDeliver.reason,
    })

    await logChildDelivery({
      childId,
      familyId,
      notificationType,
      content,
      deliveredAt: FieldValue.serverTimestamp(),
      status: 'skipped',
      reason: shouldDeliver.reason,
    })

    return {
      delivered: false,
      reason: shouldDeliver.reason,
    }
  }

  // Get FCM token
  const fcmToken = await getChildFcmToken(childId)

  if (!fcmToken) {
    logger.info('No FCM token for child, skipping push notification', {
      childId,
      familyId,
      notificationType,
    })

    await logChildDelivery({
      childId,
      familyId,
      notificationType,
      content,
      deliveredAt: FieldValue.serverTimestamp(),
      status: 'skipped',
      reason: 'no_fcm_token',
    })

    return {
      delivered: false,
      reason: 'no_fcm_token',
    }
  }

  // Send via FCM
  try {
    const message: Message = {
      token: fcmToken,
      notification: {
        title: content.title,
        body: content.body,
      },
      data: {
        notificationType,
        childId,
        familyId,
        ...(content.data || {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'child_notifications',
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
    }

    const messageId = await getFcm().send(message)

    logger.info('Delivered notification to child', {
      childId,
      familyId,
      notificationType,
      messageId,
    })

    await logChildDelivery({
      childId,
      familyId,
      notificationType,
      content,
      deliveredAt: FieldValue.serverTimestamp(),
      status: 'delivered',
      fcmMessageId: messageId,
    })

    return {
      delivered: true,
      fcmMessageId: messageId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Failed to deliver notification to child', {
      childId,
      familyId,
      notificationType,
      error: errorMessage,
    })

    await logChildDelivery({
      childId,
      familyId,
      notificationType,
      content,
      deliveredAt: FieldValue.serverTimestamp(),
      status: 'failed',
      reason: errorMessage,
    })

    return {
      delivered: false,
      reason: errorMessage,
    }
  }
}

/**
 * Send time limit warning notification to child.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param minutesRemaining - Minutes remaining before limit
 * @param limitType - Type of limit (daily, weekly, app-specific)
 */
export async function sendTimeLimitWarningToChild(
  childId: string,
  familyId: string,
  minutesRemaining: number,
  limitType: string
): Promise<ChildDeliveryResult> {
  const content: ChildNotificationContent = {
    title: 'Time Limit Warning',
    body: `You have ${minutesRemaining} minutes remaining for ${limitType}.`,
    data: {
      minutesRemaining: String(minutesRemaining),
      limitType,
    },
  }

  return deliverNotificationToChild(
    childId,
    familyId,
    CHILD_NOTIFICATION_TYPES.TIME_LIMIT_WARNING,
    content
  )
}

/**
 * Send agreement change notification to child.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param changeDescription - Description of what changed
 */
export async function sendAgreementChangeToChild(
  childId: string,
  familyId: string,
  changeDescription: string
): Promise<ChildDeliveryResult> {
  const content: ChildNotificationContent = {
    title: 'Agreement Updated',
    body: changeDescription,
    data: {
      changeDescription,
    },
  }

  return deliverNotificationToChild(
    childId,
    familyId,
    CHILD_NOTIFICATION_TYPES.AGREEMENT_CHANGE,
    content
  )
}

/**
 * Send trust score change notification to child.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param previousScore - Previous trust score
 * @param newScore - New trust score
 * @param reason - Reason for change
 */
export async function sendTrustScoreChangeToChild(
  childId: string,
  familyId: string,
  previousScore: number,
  newScore: number,
  reason: string
): Promise<ChildDeliveryResult> {
  const direction = newScore > previousScore ? 'increased' : 'decreased'
  const content: ChildNotificationContent = {
    title: `Trust Score ${direction === 'increased' ? 'Increased!' : 'Update'}`,
    body:
      direction === 'increased'
        ? `Great job! Your trust score went up to ${newScore}. ${reason}`
        : `Your trust score is now ${newScore}. ${reason}`,
    data: {
      previousScore: String(previousScore),
      newScore: String(newScore),
      direction,
      reason,
    },
  }

  return deliverNotificationToChild(
    childId,
    familyId,
    CHILD_NOTIFICATION_TYPES.TRUST_SCORE_CHANGE,
    content
  )
}

/**
 * Send weekly summary notification to child.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param summary - Summary content
 */
export async function sendWeeklySummaryToChild(
  childId: string,
  familyId: string,
  summary: {
    screenTimeHours: number
    trustScoreChange: number
    milestonesReached: number
  }
): Promise<ChildDeliveryResult> {
  const content: ChildNotificationContent = {
    title: 'Your Weekly Summary',
    body: `This week: ${summary.screenTimeHours}h screen time, trust score ${
      summary.trustScoreChange >= 0 ? '+' : ''
    }${summary.trustScoreChange}, ${summary.milestonesReached} milestone${
      summary.milestonesReached !== 1 ? 's' : ''
    } reached!`,
    data: {
      screenTimeHours: String(summary.screenTimeHours),
      trustScoreChange: String(summary.trustScoreChange),
      milestonesReached: String(summary.milestonesReached),
    },
  }

  return deliverNotificationToChild(
    childId,
    familyId,
    CHILD_NOTIFICATION_TYPES.WEEKLY_SUMMARY,
    content
  )
}
