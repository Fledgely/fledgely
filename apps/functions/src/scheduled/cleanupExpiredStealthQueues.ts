import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  generateIntegrityHash,
  chunkArray,
  FIRESTORE_BATCH_LIMIT,
} from '../utils/notificationStealth'

/**
 * Scheduled Cloud Function: cleanupExpiredStealthQueues
 *
 * Runs every hour to clean up expired stealth queues.
 * When a stealth queue expires (72 hours after activation):
 * 1. All held notifications are permanently deleted (NOT delivered)
 * 2. The stealth queue document is deleted
 * 3. Cleanup is logged to sealed admin audit
 *
 * CRITICAL: This is a life-safety operation. Expired notifications must be
 * deleted, not delivered, to prevent revealing escape actions after the
 * 72-hour safety window.
 */
export const cleanupExpiredStealthQueues = onSchedule(
  {
    schedule: 'every 60 minutes',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const db = getFirestore()
    const now = Timestamp.now()
    const cleanupTimestamp = now

    // Query for expired stealth queues
    const expiredQueuesQuery = db
      .collection('stealthQueues')
      .where('expiresAt', '<=', now)

    const expiredQueues = await expiredQueuesQuery.get()

    if (expiredQueues.empty) {
      console.log('No expired stealth queues to clean up')
      return
    }

    console.log(`Found ${expiredQueues.size} expired stealth queue(s) to clean up`)

    let totalDeletedNotifications = 0
    let totalDeletedQueues = 0

    for (const queueDoc of expiredQueues.docs) {
      const queueId = queueDoc.id
      const queueData = queueDoc.data()

      try {
        // Step 1: Delete all notifications in this queue
        const notificationsQuery = db
          .collection('stealthQueues')
          .doc(queueId)
          .collection('notifications')

        const notifications = await notificationsQuery.get()
        const notificationCount = notifications.size

        if (notificationCount > 0) {
          // Chunk deletions to respect batch limits
          const notificationRefs = notifications.docs.map((doc) => doc.ref)
          const chunks = chunkArray(notificationRefs, FIRESTORE_BATCH_LIMIT)

          for (const chunk of chunks) {
            const batch = db.batch()
            for (const ref of chunk) {
              batch.delete(ref)
            }
            await batch.commit()
          }

          totalDeletedNotifications += notificationCount
        }

        // Step 2: Delete the stealth queue document
        await queueDoc.ref.delete()
        totalDeletedQueues++

        // Step 3: Log cleanup to sealed admin audit
        const auditData = {
          action: 'notification-stealth-cleanup',
          resourceType: 'stealth-queue',
          resourceId: queueId,
          performedBy: 'system',
          familyId: queueData.familyId,
          targetUserIds: queueData.targetUserIds,
          safetyRequestId: queueData.safetyRequestId,
          deletedNotificationCount: notificationCount,
          queueActivatedAt: queueData.activatedAt?.toDate?.()?.toISOString() || null,
          queueExpiredAt: queueData.expiresAt?.toDate?.()?.toISOString() || null,
          cleanedUpAt: cleanupTimestamp.toDate().toISOString(),
          timestamp: FieldValue.serverTimestamp(),
          sealed: true,
        }

        const hashData = {
          ...auditData,
          timestamp: cleanupTimestamp.toDate().toISOString(),
        }
        const integrityHash = generateIntegrityHash(hashData)

        await db.collection('adminAuditLog').add({
          ...auditData,
          integrityHash,
        })

        console.log(`Cleaned up stealth queue ${queueId}: ${notificationCount} notifications deleted`)
      } catch (error) {
        // Log error but continue with other queues
        console.error(`Error cleaning up stealth queue ${queueId}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Log error to sealed audit
        await db.collection('adminAuditLog').add({
          action: 'notification_stealth_cleanup_error',
          resourceType: 'stealth-queue',
          resourceId: queueId,
          performedBy: 'system',
          familyId: queueData.familyId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: FieldValue.serverTimestamp(),
          sealed: true,
        })
      }
    }

    console.log(
      `Stealth queue cleanup complete: ${totalDeletedQueues} queues, ${totalDeletedNotifications} notifications deleted`
    )
  }
)
