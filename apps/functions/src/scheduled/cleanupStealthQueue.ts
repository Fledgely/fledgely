/**
 * Stealth Queue Cleanup Scheduled Function.
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * Runs hourly to clean up expired stealth windows and queue entries.
 * - Deletes stealth queue entries after 72 hours
 * - Clears stealth flags on family documents
 * - Logs cleanup to admin audit only
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Cleanup is idempotent (safe to retry)
 * - All cleanup logged to admin audit only
 * - NO family-visible audit entries
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logAdminAction } from '../utils/adminAudit'
import { clearStealthWindow, getExpiredStealthFamilies } from '../lib/notifications/stealthWindow'
import { deleteAllEntriesForFamily } from '../lib/notifications/stealthQueue'

const db = getFirestore()

// System agent ID for scheduled tasks
const SYSTEM_AGENT_ID = 'system-scheduled-cleanup'
const SYSTEM_AGENT_EMAIL = 'system@fledgely.internal'

/**
 * Cleanup stealth queue - runs every hour.
 *
 * Story 0.5.7: AC2 - Automatic deletion after 72 hours
 *
 * Schedule: Every hour (cron: 0 * * * *)
 * - Finds families with expired stealth windows
 * - Deletes all stealth queue entries for those families
 * - Clears stealth flags on family documents
 * - Logs cleanup to admin audit
 */
export const cleanupStealthQueue = onSchedule(
  {
    schedule: '0 * * * *', // Every hour at minute 0
    timeZone: 'UTC',
    retryCount: 3,
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()
    let totalFamiliesProcessed = 0
    let totalEntriesDeleted = 0
    const errors: string[] = []

    try {
      // Get all families with expired stealth windows
      const expiredFamilies = await getExpiredStealthFamilies()

      if (expiredFamilies.length === 0) {
        // No expired windows - log brief audit and return
        await logAdminAction({
          agentId: SYSTEM_AGENT_ID,
          agentEmail: SYSTEM_AGENT_EMAIL,
          action: 'cleanup_stealth_queue',
          resourceType: 'stealth_window',
          resourceId: null,
          metadata: {
            familiesProcessed: 0,
            entriesDeleted: 0,
            durationMs: Date.now() - startTime,
            status: 'no_expired_windows',
          },
        })
        return
      }

      // Process each expired family
      for (const familyId of expiredFamilies) {
        try {
          // Delete all stealth queue entries for this family
          const deletedCount = await deleteAllEntriesForFamily(familyId)
          totalEntriesDeleted += deletedCount

          // Clear stealth flags on family document
          await clearStealthWindow(familyId)

          totalFamiliesProcessed++
        } catch (familyError) {
          // Log error but continue processing other families
          const errorMessage = familyError instanceof Error ? familyError.message : 'Unknown error'
          errors.push(`Family ${familyId}: ${errorMessage}`)
        }
      }

      // Log cleanup completion to admin audit
      await logAdminAction({
        agentId: SYSTEM_AGENT_ID,
        agentEmail: SYSTEM_AGENT_EMAIL,
        action: 'cleanup_stealth_queue',
        resourceType: 'stealth_window',
        resourceId: null,
        metadata: {
          familiesProcessed: totalFamiliesProcessed,
          entriesDeleted: totalEntriesDeleted,
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
        action: 'cleanup_stealth_queue',
        resourceType: 'stealth_window',
        resourceId: null,
        metadata: {
          familiesProcessed: totalFamiliesProcessed,
          entriesDeleted: totalEntriesDeleted,
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

/**
 * Cleanup orphaned stealth queue entries.
 *
 * Finds and deletes queue entries that have expired but whose
 * family documents may have already been cleaned up.
 *
 * @returns Number of orphaned entries deleted
 */
export async function cleanupOrphanedEntries(): Promise<number> {
  const now = Timestamp.now()

  // Find all expired entries
  const expiredQuery = db.collection('stealthQueueEntries').where('expiresAt', '<=', now)

  const snapshot = await expiredQuery.get()

  if (snapshot.empty) return 0

  // Delete in batches
  const batch = db.batch()
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })
  await batch.commit()

  return snapshot.size
}
