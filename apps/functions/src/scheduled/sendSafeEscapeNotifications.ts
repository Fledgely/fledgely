/**
 * Safe Escape Notification Scheduler - Story 40.3, Story 41.8
 *
 * Sends notifications to other family members after the 72-hour
 * silent period has passed since Safe Escape was activated.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - NO notifications before 72 hours (AC2)
 * - Notification only says "Location features paused" - no details
 * - Does NOT reveal who activated or why
 * - Idempotent (safe to retry)
 *
 * Story 41.8 AC4: 72-hour expiry notification with neutral wording
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { logAdminAction } from '../utils/adminAudit'
import { logFleeingModeExpiry } from '../lib/safety/fleeingModeAudit'
import { SAFE_ESCAPE_SILENT_PERIOD_MS } from '@fledgely/shared'

// System agent ID for scheduled tasks
const SYSTEM_AGENT_ID = 'system-safe-escape-notifications'
const SYSTEM_AGENT_EMAIL = 'system@fledgely.internal'

/**
 * Get safe escape activations that need notification sent.
 * Returns activations where:
 * - notificationSentAt is null
 * - activatedAt is more than 72 hours ago
 * - reenabledAt is null (still active)
 *
 * Uses collectionGroup query for efficient cross-family search.
 */
async function getPendingNotifications(): Promise<
  Array<{
    activationId: string
    familyId: string
    activatedBy: string
    activatedAt: Date
  }>
> {
  const db = getFirestore()
  const cutoffTime = Timestamp.fromDate(new Date(Date.now() - SAFE_ESCAPE_SILENT_PERIOD_MS))

  // Use collectionGroup query for efficient cross-family search
  // Requires Firestore index on: safeEscapeActivations (notificationSentAt, reenabledAt, activatedAt)
  const activationsSnapshot = await db
    .collectionGroup('safeEscapeActivations')
    .where('notificationSentAt', '==', null)
    .where('reenabledAt', '==', null)
    .where('activatedAt', '<=', cutoffTime)
    .get()

  const pendingNotifications: Array<{
    activationId: string
    familyId: string
    activatedBy: string
    activatedAt: Date
  }> = []

  for (const activationDoc of activationsSnapshot.docs) {
    const data = activationDoc.data()
    const activatedAt = data.activatedAt?.toDate?.() ?? new Date(data.activatedAt)

    // Extract familyId from document path: families/{familyId}/safeEscapeActivations/{id}
    const pathParts = activationDoc.ref.path.split('/')
    const familyId = pathParts[1]

    pendingNotifications.push({
      activationId: activationDoc.id,
      familyId,
      activatedBy: data.activatedBy,
      activatedAt,
    })
  }

  return pendingNotifications
}

/**
 * Send notification to family members (except activator).
 * Message is intentionally vague for safety.
 */
async function sendFamilyNotification(familyId: string, activatedBy: string): Promise<number> {
  const db = getFirestore()

  // Get family members
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    return 0
  }

  const familyData = familyDoc.data()
  const guardians: Array<{ id: string }> = familyData?.guardians ?? []

  // Only notify guardians who are NOT the activator
  // Never notify children about Safe Escape
  const recipientIds = guardians.map((g) => g.id).filter((id) => id !== activatedBy)

  if (recipientIds.length === 0) {
    return 0
  }

  // Create notification for each recipient
  // Message is intentionally vague - just says "paused"
  const batch = db.batch()

  for (const recipientId of recipientIds) {
    const notificationRef = db.collection('notifications').doc()
    batch.set(notificationRef, {
      id: notificationRef.id,
      userId: recipientId,
      familyId,
      type: 'safe_escape_notification',
      title: 'Location Features Paused',
      message: 'Location features have been paused for your family.',
      // NO details about who or why - critical for safety
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
  return recipientIds.length
}

/**
 * Mark activation as notification sent.
 */
async function markNotificationSent(familyId: string, activationId: string): Promise<void> {
  const db = getFirestore()

  await db
    .collection('families')
    .doc(familyId)
    .collection('safeEscapeActivations')
    .doc(activationId)
    .update({
      notificationSentAt: FieldValue.serverTimestamp(),
    })
}

/**
 * Send Safe Escape notifications - runs every hour.
 *
 * Story 40.3: AC2 - Silent operation, no notifications for 72 hours
 *
 * Schedule: Every hour (cron: 0 * * * *)
 * - Finds activations past 72-hour silent period
 * - Sends vague "Location paused" notification to other guardians
 * - Does NOT reveal who activated or why
 */
export const sendSafeEscapeNotifications = onSchedule(
  {
    schedule: '0 * * * *', // Every hour at minute 0
    timeZone: 'UTC',
    retryCount: 3,
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()
    let totalActivationsProcessed = 0
    let totalNotificationsSent = 0
    const errors: string[] = []

    try {
      // Get all pending notifications
      const pendingNotifications = await getPendingNotifications()

      if (pendingNotifications.length === 0) {
        // No pending notifications - log brief audit and return
        await logAdminAction({
          agentId: SYSTEM_AGENT_ID,
          agentEmail: SYSTEM_AGENT_EMAIL,
          action: 'send_safe_escape_notifications',
          resourceType: 'safe_escape_activation',
          resourceId: null,
          metadata: {
            activationsProcessed: 0,
            notificationsSent: 0,
            durationMs: Date.now() - startTime,
            status: 'no_pending_notifications',
          },
        })
        return
      }

      // Process each pending notification
      for (const pending of pendingNotifications) {
        try {
          // Send notifications to other family members
          const sentCount = await sendFamilyNotification(pending.familyId, pending.activatedBy)

          // Mark activation as notification sent
          await markNotificationSent(pending.familyId, pending.activationId)

          // Story 41.8 AC5: Log to safety audit
          await logFleeingModeExpiry(pending.familyId)

          totalActivationsProcessed++
          totalNotificationsSent += sentCount
        } catch (error) {
          // Log error but continue processing others
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Activation ${pending.activationId}: ${errorMessage}`)
        }
      }

      // Log completion to admin audit
      await logAdminAction({
        agentId: SYSTEM_AGENT_ID,
        agentEmail: SYSTEM_AGENT_EMAIL,
        action: 'send_safe_escape_notifications',
        resourceType: 'safe_escape_activation',
        resourceId: null,
        metadata: {
          activationsProcessed: totalActivationsProcessed,
          notificationsSent: totalNotificationsSent,
          durationMs: Date.now() - startTime,
          status: errors.length > 0 ? 'completed_with_errors' : 'completed',
          errors: errors.length > 0 ? errors : undefined,
        },
      })
    } catch (error) {
      // Log critical error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await logAdminAction({
        agentId: SYSTEM_AGENT_ID,
        agentEmail: SYSTEM_AGENT_EMAIL,
        action: 'send_safe_escape_notifications',
        resourceType: 'safe_escape_activation',
        resourceId: null,
        metadata: {
          activationsProcessed: totalActivationsProcessed,
          notificationsSent: totalNotificationsSent,
          durationMs: Date.now() - startTime,
          status: 'failed',
          error: errorMessage,
        },
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
