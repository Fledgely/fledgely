/**
 * Send Access Digests Scheduled Function
 *
 * Story 27.6: Real-Time Access Notifications - AC4
 *
 * Runs daily to send digest summaries to users who have
 * enabled digest notifications instead of real-time alerts.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  getNotificationPreferences,
  getPendingDigestNotifications,
  generateDigestMessage,
  markDigestNotificationsSent,
} from '../services/notifications'

/**
 * Send daily access digests.
 *
 * Runs daily at 8 AM to send digest summaries to users who have:
 * - Enabled digest notifications
 * - Have pending unsent digest notifications
 *
 * AC4: "Daily summary of who accessed what"
 */
export const sendAccessDigests = onSchedule(
  {
    schedule: 'every day 08:00',
    timeZone: 'America/Los_Angeles',
    maxInstances: 1,
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore()

    logger.info('Starting daily access digest job')

    try {
      // Get all users with pending digest notifications
      const pendingSnapshot = await db
        .collection('accessNotifications')
        .where('notificationType', '==', 'digest')
        .where('sent', '==', false)
        .get()

      if (pendingSnapshot.empty) {
        logger.info('No pending digest notifications')
        return
      }

      // Group by recipient
      const byRecipient = new Map<string, string[]>()
      for (const doc of pendingSnapshot.docs) {
        const recipientUid = doc.data().recipientUid
        if (!byRecipient.has(recipientUid)) {
          byRecipient.set(recipientUid, [])
        }
        byRecipient.get(recipientUid)!.push(doc.id)
      }

      logger.info('Processing digest notifications', {
        recipientCount: byRecipient.size,
        totalNotifications: pendingSnapshot.size,
      })

      // Process each recipient
      let digestsSent = 0
      let digestsSkipped = 0

      for (const [recipientUid, notificationIds] of byRecipient) {
        try {
          // Check if user still has digest enabled
          const prefs = await getNotificationPreferences(recipientUid)

          if (!prefs.accessDigestEnabled) {
            // User disabled digests, just mark as sent without sending
            await markDigestNotificationsSent(notificationIds)
            digestsSkipped++
            continue
          }

          // Get full notifications
          const notifications = await getPendingDigestNotifications(recipientUid)

          if (notifications.length === 0) {
            continue
          }

          // Generate digest message
          const message = generateDigestMessage(notifications)

          if (!message) {
            continue
          }

          // Get user info for sending
          const userDoc = await db.collection('users').doc(recipientUid).get()
          const userData = userDoc.data()
          const fcmToken = userData?.fcmToken

          if (fcmToken) {
            // TODO: Send FCM push notification with digest
            logger.info('Would send digest FCM notification', {
              recipientUid,
              notificationCount: notifications.length,
            })
          }

          // TODO: Send email digest if email notifications enabled
          // For now, just log
          logger.info('Digest ready for user', {
            recipientUid,
            message,
          })

          // Mark notifications as sent
          await markDigestNotificationsSent(notificationIds)
          digestsSent++
        } catch (error) {
          logger.error('Failed to process digest for user', {
            recipientUid,
            error,
          })
        }
      }

      logger.info('Daily access digest job completed', {
        digestsSent,
        digestsSkipped,
        totalRecipients: byRecipient.size,
      })
    } catch (error) {
      logger.error('Daily access digest job failed', { error })
      throw error
    }
  }
)
