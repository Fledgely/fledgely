/**
 * Check Annotation Deadlines Scheduled Function
 *
 * Story 23.3: Annotation Timer and Escalation (AC: #1, #2)
 *
 * Runs every minute to check for expired annotation windows:
 * - Queries flags where annotationDeadline has passed
 * - Only processes flags with childNotificationStatus = 'notified'
 * - Escalates expired flags to parent
 * - Sends parent notification
 *
 * Processing is idempotent (safe to retry)
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { FlagDocument, EscalationReason, ChildNotificationStatus } from '@fledgely/shared'
import { sendParentFlagNotification } from '../lib/notifications/sendParentFlagNotification'

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
 * Escalate a flag that has expired its annotation window.
 *
 * Updates:
 * - childNotificationStatus = 'expired'
 * - escalatedAt = now
 * - escalationReason = 'timeout'
 */
async function escalateFlag(
  flagRef: FirebaseFirestore.DocumentReference,
  flagData: FlagDocument
): Promise<void> {
  const now = Date.now()

  await flagRef.update({
    childNotificationStatus: 'expired' as ChildNotificationStatus,
    escalatedAt: now,
    escalationReason: 'timeout' as EscalationReason,
  })

  logger.info('Flag escalated due to annotation timeout', {
    flagId: flagData.id,
    childId: flagData.childId,
    escalatedAt: now,
  })
}

/**
 * Check if a flag has truly expired.
 * Considers extensionDeadline if child requested an extension.
 */
function isEffectivelyExpired(flag: FlagDocument, now: number): boolean {
  // If extension was granted, use extensionDeadline instead
  const effectiveDeadline = flag.extensionDeadline || flag.annotationDeadline

  if (!effectiveDeadline) {
    return false
  }

  return effectiveDeadline < now
}

/**
 * Process expired annotation deadlines - runs every minute.
 *
 * Story 23.3: Annotation Timer and Escalation (AC: #1, #2)
 *
 * Schedule: Every minute (cron: * * * * *)
 * - Finds flags with annotationDeadline <= now
 * - Only processes flags with childNotificationStatus = 'notified'
 * - Updates expired flags with escalation data
 * - Triggers parent notification
 */
export const checkAnnotationDeadlines = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'UTC',
    retryCount: 3,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()
    const now = Date.now()
    let totalFlagsProcessed = 0
    let totalFlagsEscalated = 0
    let totalNotificationsSent = 0
    const errors: string[] = []

    try {
      // Query for flags that are notified but past their annotation deadline
      // Note: We query for annotationDeadline < now, but we also need to check
      // extensionDeadline in the handler for flags that got extensions
      const expiredQuery = getDb()
        .collectionGroup('flags')
        .where('childNotificationStatus', '==', 'notified')
        .where('annotationDeadline', '<', now)

      const snapshot = await expiredQuery.get()

      if (snapshot.empty) {
        logger.debug('No expired annotation deadlines found', {
          durationMs: Date.now() - startTime,
        })
        return
      }

      logger.info('Found flags with expired annotation deadlines', {
        count: snapshot.size,
      })

      // Process each expired flag
      for (const doc of snapshot.docs) {
        const flagData = doc.data() as FlagDocument

        try {
          totalFlagsProcessed++

          // Double-check effective expiration (considering extensions)
          if (!isEffectivelyExpired(flagData, now)) {
            logger.debug('Flag has active extension, skipping', {
              flagId: flagData.id,
              extensionDeadline: flagData.extensionDeadline,
            })
            continue
          }

          // Escalate the flag
          await escalateFlag(doc.ref, flagData)
          totalFlagsEscalated++

          // Get updated flag data for notification
          const updatedFlagData: FlagDocument = {
            ...flagData,
            childNotificationStatus: 'expired',
            escalatedAt: now,
            escalationReason: 'timeout',
          }

          // Send parent notification
          const notificationResult = await sendParentFlagNotification({
            childId: flagData.childId,
            flagId: flagData.id,
            familyId: flagData.familyId,
            flagData: updatedFlagData,
          })

          if (notificationResult.sent) {
            totalNotificationsSent++
            logger.info('Parent notification sent for escalated flag', {
              flagId: flagData.id,
              childId: flagData.childId,
              familyId: flagData.familyId,
            })
          } else {
            logger.warn('Failed to send parent notification', {
              flagId: flagData.id,
              reason: notificationResult.reason,
            })
          }
        } catch (flagError) {
          // Log error but continue processing other flags
          const errorMessage = flagError instanceof Error ? flagError.message : 'Unknown error'
          errors.push(`Flag ${flagData.id}: ${errorMessage}`)
          logger.error('Error processing expired flag', {
            flagId: flagData.id,
            error: errorMessage,
          })
        }
      }

      // Log processing summary
      logger.info('Annotation deadline check completed', {
        flagsProcessed: totalFlagsProcessed,
        flagsEscalated: totalFlagsEscalated,
        notificationsSent: totalNotificationsSent,
        durationMs: Date.now() - startTime,
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        errorCount: errors.length,
      })
    } catch (error) {
      // Log critical error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error('Annotation deadline check failed', {
        durationMs: Date.now() - startTime,
        error: errorMessage,
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
