/**
 * Flag Annotated Trigger
 *
 * Story 23.3: Annotation Timer and Escalation - AC3
 *
 * Firestore trigger that fires when a flag document is updated with annotation.
 * Sends notification to parent immediately when child annotates or skips.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import type { FlagDocument, EscalationReason } from '@fledgely/shared'
import { sendParentFlagNotification } from '../lib/notifications/sendParentFlagNotification'

/**
 * Firestore trigger for flag annotation updates.
 *
 * Story 23.3: Annotation Timer and Escalation - AC3
 *
 * Triggers on: children/{childId}/flags/{flagId}
 *
 * When a flag is updated:
 * 1. Checks if childNotificationStatus changed to 'annotated' or 'skipped'
 * 2. Sets escalationReason if skipped
 * 3. Sends FCM notification to parent's devices
 * 4. Updates flag with parentNotifiedAt
 *
 * AC #3: Immediate release on annotation
 * - Timer stops when child annotates
 * - Annotated flag is released to parent immediately
 */
export const onFlagAnnotated = onDocumentUpdated(
  {
    document: 'children/{childId}/flags/{flagId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const beforeSnapshot = event.data?.before
    const afterSnapshot = event.data?.after

    if (!beforeSnapshot || !afterSnapshot) {
      logger.warn('onFlagAnnotated: Missing before/after data')
      return
    }

    const { childId, flagId } = event.params
    const beforeData = beforeSnapshot.data() as FlagDocument
    const afterData = afterSnapshot.data() as FlagDocument

    const beforeStatus = beforeData.childNotificationStatus
    const afterStatus = afterData.childNotificationStatus

    // Only proceed if status changed from 'notified' to 'annotated' or 'skipped'
    if (beforeStatus !== 'notified') {
      return
    }

    if (afterStatus !== 'annotated' && afterStatus !== 'skipped') {
      return
    }

    logger.info('Flag annotated/skipped, processing for parent notification', {
      childId,
      flagId,
      beforeStatus,
      afterStatus,
      childAnnotation: afterData.childAnnotation,
    })

    try {
      // If skipped, set escalationReason
      if (afterStatus === 'skipped') {
        await afterSnapshot.ref.update({
          escalationReason: 'skipped' as EscalationReason,
        })

        logger.info('Set escalationReason to skipped', { flagId })
      }

      // Get updated flag data for notification
      const updatedFlagData: FlagDocument = {
        ...afterData,
        escalationReason: afterStatus === 'skipped' ? 'skipped' : afterData.escalationReason,
      }

      // Send parent notification
      const result = await sendParentFlagNotification({
        childId,
        flagId,
        familyId: afterData.familyId,
        flagData: updatedFlagData,
      })

      if (result.sent) {
        logger.info('Parent notification sent successfully for annotation', {
          childId,
          flagId,
          successCount: result.successCount,
          parentNotifiedAt: result.parentNotifiedAt,
        })
      } else {
        logger.info('Parent notification not sent', {
          childId,
          flagId,
          reason: result.reason,
          failureCount: result.failureCount,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to process flag annotation', {
        childId,
        flagId,
        error: errorMessage,
      })
    }
  }
)
