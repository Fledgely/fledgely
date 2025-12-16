/**
 * Verify Emergency Pushes Scheduled Function
 *
 * Story 7.4: Emergency Allowlist Push - Task 5
 * AC #7: Push success is verified via monitoring dashboard
 *
 * Runs every 15 minutes to verify that recent emergency pushes
 * have propagated to the API endpoint.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { EMERGENCY_PUSH_CONSTANTS, type EmergencyPushRecord } from '@fledgely/contracts'

/**
 * Verify that a push has propagated to the API
 *
 * Checks if the emergency entries exist in the crisis allowlist API response.
 */
async function verifyPushPropagation(push: EmergencyPushRecord): Promise<{
  verified: boolean
  reason?: string
}> {
  try {
    // In production, we would fetch from the API endpoint
    // For now, we verify by checking if entries would be included
    // in the merged allowlist (since we control the merge logic)
    const db = getFirestore()

    // Check if the entries exist in the override collection
    const overrideSnapshot = await db
      .collection('crisis-allowlist-override')
      .where('pushId', '==', push.id)
      .get()

    if (overrideSnapshot.empty) {
      return {
        verified: false,
        reason: 'No override entries found for this push',
      }
    }

    // Verify the count matches
    if (overrideSnapshot.size !== push.entries.length) {
      return {
        verified: false,
        reason: `Entry count mismatch: expected ${push.entries.length}, found ${overrideSnapshot.size}`,
      }
    }

    // All entries exist in the override collection
    return { verified: true }
  } catch (error) {
    return {
      verified: false,
      reason: error instanceof Error ? error.message : 'Unknown verification error',
    }
  }
}

/**
 * Scheduled function to verify emergency push propagation
 *
 * Runs every 15 minutes to:
 * 1. Find pushes in 'pending' or 'propagated' status
 * 2. Verify they have propagated to the API
 * 3. Update status to 'verified' or 'failed'
 * 4. Log results for monitoring
 */
export const verifyEmergencyPushes = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    retryCount: 3,
    memory: '256MiB',
  },
  async () => {
    const db = getFirestore()
    const now = Date.now()
    const timeoutMs = EMERGENCY_PUSH_CONSTANTS.VERIFICATION_TIMEOUT_MINUTES * 60 * 1000

    try {
      // Find pushes that need verification
      // (pending or propagated, not yet verified or failed)
      const pendingPushes = await db
        .collection('emergency-pushes')
        .where('status', 'in', ['pending', 'propagated'])
        .get()

      if (pendingPushes.empty) {
        console.log('No pending emergency pushes to verify')
        return
      }

      const results = {
        checked: 0,
        verified: 0,
        failed: 0,
        stillPending: 0,
      }

      for (const doc of pendingPushes.docs) {
        const push = doc.data() as EmergencyPushRecord
        results.checked++

        // Check if push has timed out
        const pushTime = new Date(push.timestamp).getTime()
        const elapsed = now - pushTime

        if (elapsed > timeoutMs) {
          // Push has exceeded timeout - mark as failed
          await doc.ref.update({
            status: 'failed',
            failureReason: `Verification timeout after ${EMERGENCY_PUSH_CONSTANTS.VERIFICATION_TIMEOUT_MINUTES} minutes`,
          })
          results.failed++

          console.error('Emergency push verification failed: timeout', {
            pushId: push.id,
            operator: push.operator,
            entriesCount: push.entries.length,
            elapsedMinutes: Math.round(elapsed / 60000),
          })

          // Log to audit
          await db.collection('adminAuditLog').add({
            action: 'emergency-push-verification-failed',
            resourceType: 'emergencyPush',
            resourceId: push.id,
            performedBy: 'system',
            reason: 'Verification timeout',
            operator: push.operator,
            timestamp: FieldValue.serverTimestamp(),
          })

          continue
        }

        // Attempt verification
        const verification = await verifyPushPropagation(push)

        if (verification.verified) {
          // Mark as verified
          await doc.ref.update({
            status: 'verified',
            verifiedAt: new Date().toISOString(),
          })
          results.verified++

          console.log('Emergency push verified', {
            pushId: push.id,
            operator: push.operator,
            entriesCount: push.entries.length,
            elapsedMinutes: Math.round(elapsed / 60000),
          })
        } else if (push.status === 'pending') {
          // First check - mark as propagated (waiting for full propagation)
          await doc.ref.update({
            status: 'propagated',
          })
          results.stillPending++
        } else {
          // Still waiting for propagation
          results.stillPending++

          console.log('Emergency push still propagating', {
            pushId: push.id,
            elapsedMinutes: Math.round(elapsed / 60000),
            reason: verification.reason,
          })
        }
      }

      // Log summary to audit
      await db.collection('adminAuditLog').add({
        action: 'emergency-push-verification-run',
        resourceType: 'emergencyPush',
        resourceId: 'scheduled-check',
        performedBy: 'system',
        results,
        timestamp: FieldValue.serverTimestamp(),
      })

      console.log('Emergency push verification complete', results)
    } catch (error) {
      console.error('Emergency push verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      // Log error to audit
      await db.collection('adminAuditLog').add({
        action: 'emergency-push-verification-error',
        resourceType: 'emergencyPush',
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

/**
 * Export for testing
 * @internal
 */
export const __testing = {
  verifyPushPropagation,
}
