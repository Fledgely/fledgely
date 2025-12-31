/**
 * Sensitive Hold Flags Processing Scheduled Function.
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC6
 *
 * Runs daily to process flags in sensitive_hold status:
 * - Checks for flags older than 48 hours (releasableAfter timestamp)
 * - High-severity self-harm flags remain suppressed indefinitely
 * - Medium/low severity flags may be released to pending status
 * - Logs all releases to admin audit
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - High-severity self-harm NEVER auto-released
 * - All releases logged to admin audit only
 * - NO family-visible audit entries
 * - Processing is idempotent (safe to retry)
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { logAdminAction } from '../utils/adminAudit'
import { markSuppressionReleased } from '../services/classification/suppressionAudit'

const db = getFirestore()

// System agent ID for scheduled tasks
const SYSTEM_AGENT_ID = 'system-scheduled-release'
const SYSTEM_AGENT_EMAIL = 'system@fledgely.internal'

/**
 * Release policy configuration.
 *
 * Story 21.2: AC6 - 48-hour delay before parent visibility
 *
 * Severity levels that can be auto-released vs must be manually reviewed:
 * - HIGH: Never auto-released (requires manual admin review)
 * - MEDIUM: May be released after 48 hours
 * - LOW: May be released after 48 hours
 */
const RELEASE_POLICY = {
  // High severity self-harm flags remain suppressed indefinitely
  HIGH_SEVERITY_AUTO_RELEASE: false,
  // Medium severity can be auto-released after 48h
  MEDIUM_SEVERITY_AUTO_RELEASE: true,
  // Low severity can be auto-released after 48h
  LOW_SEVERITY_AUTO_RELEASE: true,
} as const

/**
 * Process sensitive hold flags - runs daily at 3 AM UTC.
 *
 * Story 21.2: AC6 - 48-hour delay before parent visibility
 *
 * Schedule: Every day at 3 AM UTC (cron: 0 3 * * *)
 * - Finds flags with releasableAfter <= now
 * - Applies release policy based on severity
 * - Updates flag status from sensitive_hold to pending (if released)
 * - Logs all processing to admin audit
 */
export const processSensitiveHoldFlags = onSchedule(
  {
    schedule: '0 3 * * *', // Every day at 3 AM UTC
    timeZone: 'UTC',
    retryCount: 3,
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()
    const now = Date.now()
    let totalFlagsProcessed = 0
    let totalFlagsReleased = 0
    let totalFlagsKeptSuppressed = 0
    const errors: string[] = []

    try {
      // Query for suppression audit entries that are releasable
      const releasableQuery = db
        .collection('suppressionAudit')
        .where('released', '==', false)
        .where('releasableAfter', '<=', now)

      const snapshot = await releasableQuery.get()

      if (snapshot.empty) {
        // No releasable flags - log brief audit and return
        await logAdminAction({
          agentId: SYSTEM_AGENT_ID,
          agentEmail: SYSTEM_AGENT_EMAIL,
          action: 'process_sensitive_hold_flags',
          resourceType: 'sensitive_hold_flag',
          resourceId: null,
          metadata: {
            flagsProcessed: 0,
            flagsReleased: 0,
            flagsKeptSuppressed: 0,
            durationMs: Date.now() - startTime,
            status: 'no_releasable_flags',
          },
        })
        return
      }

      // Process each releasable flag
      for (const doc of snapshot.docs) {
        const data = doc.data()
        const { screenshotId, childId, severity, concernCategory } = data

        try {
          totalFlagsProcessed++

          // Apply release policy based on severity
          const shouldRelease = shouldAutoRelease(severity)

          if (shouldRelease) {
            // Release the flag by updating screenshot document
            await releaseFlag(screenshotId, childId, concernCategory)

            // Mark suppression audit as released
            await markSuppressionReleased(db, doc.id)

            totalFlagsReleased++

            logger.info('Sensitive hold flag released', {
              auditId: doc.id,
              screenshotId,
              childId,
              severity,
              concernCategory,
            })

            // Log individual release to admin audit
            await logAdminAction({
              agentId: SYSTEM_AGENT_ID,
              agentEmail: SYSTEM_AGENT_EMAIL,
              action: 'release_sensitive_hold_flag',
              resourceType: 'sensitive_hold_flag',
              resourceId: doc.id,
              metadata: {
                screenshotId,
                childId,
                severity,
                concernCategory,
                releasedAt: now,
              },
            })
          } else {
            // High severity - keep suppressed
            totalFlagsKeptSuppressed++

            logger.info('Sensitive hold flag kept suppressed (high severity)', {
              auditId: doc.id,
              screenshotId,
              childId,
              severity,
              concernCategory,
            })
          }
        } catch (flagError) {
          // Log error but continue processing other flags
          const errorMessage = flagError instanceof Error ? flagError.message : 'Unknown error'
          errors.push(`Flag ${doc.id}: ${errorMessage}`)
        }
      }

      // Log processing completion to admin audit
      await logAdminAction({
        agentId: SYSTEM_AGENT_ID,
        agentEmail: SYSTEM_AGENT_EMAIL,
        action: 'process_sensitive_hold_flags',
        resourceType: 'sensitive_hold_flag',
        resourceId: null,
        metadata: {
          flagsProcessed: totalFlagsProcessed,
          flagsReleased: totalFlagsReleased,
          flagsKeptSuppressed: totalFlagsKeptSuppressed,
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
        action: 'process_sensitive_hold_flags',
        resourceType: 'sensitive_hold_flag',
        resourceId: null,
        metadata: {
          flagsProcessed: totalFlagsProcessed,
          flagsReleased: totalFlagsReleased,
          flagsKeptSuppressed: totalFlagsKeptSuppressed,
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
 * Determine if a flag should be auto-released based on severity.
 *
 * Story 21.2: AC6 - High-severity self-harm flags remain suppressed indefinitely
 *
 * @param severity - The concern severity level
 * @returns true if the flag should be auto-released
 */
export function shouldAutoRelease(severity: string): boolean {
  switch (severity) {
    case 'high':
      return RELEASE_POLICY.HIGH_SEVERITY_AUTO_RELEASE
    case 'medium':
      return RELEASE_POLICY.MEDIUM_SEVERITY_AUTO_RELEASE
    case 'low':
      return RELEASE_POLICY.LOW_SEVERITY_AUTO_RELEASE
    default:
      // Unknown severity - default to not releasing
      return false
  }
}

/**
 * Release a sensitive hold flag by updating the screenshot document.
 *
 * Changes flag status from 'sensitive_hold' to 'pending'.
 *
 * @param screenshotId - The screenshot document ID
 * @param childId - The child document ID
 * @param concernCategory - The concern category being released
 */
async function releaseFlag(
  screenshotId: string,
  childId: string,
  concernCategory: string
): Promise<void> {
  const screenshotRef = db
    .collection('children')
    .doc(childId)
    .collection('screenshots')
    .doc(screenshotId)

  const screenshotDoc = await screenshotRef.get()

  if (!screenshotDoc.exists) {
    throw new Error(`Screenshot ${screenshotId} not found for child ${childId}`)
  }

  const data = screenshotDoc.data()
  const concernFlags = data?.classification?.concernFlags

  if (!concernFlags || !Array.isArray(concernFlags)) {
    throw new Error(`No concern flags found on screenshot ${screenshotId}`)
  }

  // Update the specific flag status from sensitive_hold to pending
  const updatedFlags = concernFlags.map((flag: Record<string, unknown>) => {
    if (flag.category === concernCategory && flag.status === 'sensitive_hold') {
      return {
        ...flag,
        status: 'pending',
        releasedAt: Date.now(),
      }
    }
    return flag
  })

  await screenshotRef.update({
    'classification.concernFlags': updatedFlags,
  })
}
