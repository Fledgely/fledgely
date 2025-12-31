/**
 * Flag Created Trigger
 *
 * Story 23.1: Flag Notification to Child - AC1, AC4, AC6
 *
 * Firestore trigger that fires when a new flag document is created.
 * Sends notification to child if flag is not distress-suppressed.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import type { FlagDocument } from '@fledgely/shared'
import { sendChildFlagNotification } from '../lib/notifications/sendChildFlagNotification'

/**
 * Firestore trigger for new flag documents.
 *
 * Story 23.1: Flag Notification to Child
 *
 * Triggers on: children/{childId}/flags/{flagId}
 *
 * When a new flag is created:
 * 1. Checks if childNotificationStatus is 'pending' (not skipped for distress)
 * 2. Sends FCM notification to child's devices
 * 3. Updates flag with childNotificationStatus = 'notified' and annotationDeadline
 *
 * AC #1: Child receives notification when flag is created
 * AC #4: Notification appears as push notification (if enabled)
 * AC #6: Distress-suppressed flags do NOT trigger notification (already set to 'skipped')
 */
export const onFlagCreated = onDocumentCreated(
  {
    document: 'children/{childId}/flags/{flagId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const snapshot = event.data
    if (!snapshot) {
      logger.warn('onFlagCreated: No data in event')
      return
    }

    const { childId, flagId } = event.params
    const data = snapshot.data() as FlagDocument

    logger.info('Flag created, processing for child notification', {
      childId,
      flagId,
      category: data.category,
      severity: data.severity,
      status: data.status,
      childNotificationStatus: data.childNotificationStatus,
    })

    // AC #6: Check if notification should be sent
    // If childNotificationStatus is 'skipped' (distress-suppressed), don't notify
    if (data.childNotificationStatus !== 'pending') {
      logger.info('Skipping notification - status not pending', {
        childId,
        flagId,
        childNotificationStatus: data.childNotificationStatus,
      })
      return
    }

    // Also skip if flag status is 'sensitive_hold' (double-check for safety)
    if (data.status === 'sensitive_hold') {
      logger.info('Skipping notification - sensitive_hold status', {
        childId,
        flagId,
        suppressionReason: data.suppressionReason,
      })
      return
    }

    try {
      // Send notification to child
      const result = await sendChildFlagNotification({
        childId,
        flagId,
        familyId: data.familyId,
      })

      if (result.sent) {
        logger.info('Child notification sent successfully', {
          childId,
          flagId,
          successCount: result.successCount,
          annotationDeadline: result.annotationDeadline,
        })
      } else {
        logger.info('Child notification not sent', {
          childId,
          flagId,
          reason: result.reason,
          failureCount: result.failureCount,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to send child notification', {
        childId,
        flagId,
        error: errorMessage,
      })
    }
  }
)
