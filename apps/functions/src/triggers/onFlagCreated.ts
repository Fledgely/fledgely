/**
 * Flag Created Trigger
 *
 * Story 23.1: Flag Notification to Child - AC1, AC4, AC6
 * Story 41.2: Flag Notifications to Parent - AC1-AC7
 *
 * Firestore trigger that fires when a new flag document is created.
 * - Sends notification to child if flag is not distress-suppressed
 * - Sends notification to parent(s) based on preferences
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import type { FlagDocument } from '@fledgely/shared'
import { sendChildFlagNotification } from '../lib/notifications/sendChildFlagNotification'
import {
  processFlagNotification,
  isCrisisRelatedFlag,
} from '../lib/notifications/flagNotificationOrchestrator'
import { sendImmediateFlagNotification } from '../lib/notifications/sendImmediateFlagNotification'
import { queueFlagForDigest } from '../lib/notifications/flagDigestService'
import { getFirestore } from 'firebase-admin/firestore'

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

    // Story 41.2: Process parent notification
    // Note: Parent notifications are processed after child notification
    // Child annotation window allows child to add context before parent sees it
    await processParentFlagNotification(data)
  }
)

/**
 * Process parent notification for a flag
 *
 * Story 41.2: Flag Notifications to Parent
 * - Routes based on severity and preferences
 * - Respects quiet hours and crisis protection
 */
async function processParentFlagNotification(flag: FlagDocument): Promise<void> {
  // Crisis flags are blocked at orchestrator level (zero-data-path)
  if (isCrisisRelatedFlag(flag)) {
    logger.info('Skipping parent notification - crisis related flag', {
      flagId: flag.id,
      childId: flag.childId,
    })
    return
  }

  try {
    // Helper to get user preferences
    const getPreferencesForUser = async (userId: string, familyId: string, childId: string) => {
      const db = getFirestore()

      // Try child-specific preferences first
      const childPrefsRef = db
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
        }
      }

      // Try family-wide preferences
      const defaultPrefsRef = db
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
        }
      }

      // Return defaults
      const { createDefaultNotificationPreferences } = await import('@fledgely/shared')
      return createDefaultNotificationPreferences(userId, familyId, childId)
    }

    const result = await processFlagNotification(flag, flag.familyId, {
      // Callback for immediate notifications
      onImmediateNotification: async (userId, flag, childName) => {
        const prefs = await getPreferencesForUser(userId, flag.familyId, flag.childId)
        await sendImmediateFlagNotification({
          userId,
          flag,
          childName,
          preferences: prefs as Parameters<typeof sendImmediateFlagNotification>[0]['preferences'],
        })
      },
      // Callback for digest queue
      onDigestQueue: async (userId, flag, childName, digestType) => {
        await queueFlagForDigest(userId, flag, childName, digestType)
      },
    })

    logger.info('Parent flag notification processed', {
      flagId: flag.id,
      childId: flag.childId,
      notificationGenerated: result.notificationGenerated,
      crisisBlocked: result.crisisBlocked,
      parentRoutes: result.parentRoutes,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to process parent flag notification', {
      flagId: flag.id,
      childId: flag.childId,
      error: errorMessage,
    })
    // Don't rethrow - parent notification failure shouldn't affect flag creation
  }
}
