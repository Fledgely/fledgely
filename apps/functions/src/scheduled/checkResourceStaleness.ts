import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { checkResourceStaleness as checkStaleness } from '../utils/resourceService'

/**
 * Scheduled Cloud Function: checkResourceStaleness
 *
 * Runs daily to check if any escape resources have become stale
 * (not verified in over 90 days).
 *
 * When stale resources are detected:
 * 1. An alert is logged to admin audit
 * 2. Console warning is output for monitoring systems
 *
 * This ensures abuse victims always have access to working resources.
 */
export const checkResourceStaleness = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const db = getFirestore()
    const now = Timestamp.now()

    try {
      // Check for stale resources
      const { staleResources, totalResources } = await checkStaleness()

      // Log the check results
      const auditData = {
        action: 'resource-staleness-check',
        resourceType: 'escapeResources',
        resourceId: 'scheduled-check',
        performedBy: 'system',
        totalResources,
        staleCount: staleResources.length,
        staleResourceNames: staleResources,
        hasStaleResources: staleResources.length > 0,
        timestamp: FieldValue.serverTimestamp(),
        // Not sealed - this is operational info, not sensitive
      }

      await db.collection('adminAuditLog').add(auditData)

      if (staleResources.length > 0) {
        // Output warning for monitoring/alerting systems
        console.warn('ALERT: Stale escape resources detected', {
          staleCount: staleResources.length,
          staleResources,
          message: 'Resources not verified in over 90 days. Please verify links/numbers are still working.',
        })
      } else {
        console.log('Resource staleness check complete: all resources current', {
          totalResources,
        })
      }
    } catch (error) {
      console.error('Resource staleness check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Log error to audit
      await db.collection('adminAuditLog').add({
        action: 'resource_staleness_check_error',
        resourceType: 'escapeResources',
        resourceId: 'scheduled-check',
        performedBy: 'system',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
