/**
 * Emergency Allowlist Push Callable Function
 *
 * Story 7.4: Emergency Allowlist Push - Task 1
 *
 * Admin-only callable function to push emergency crisis resource updates
 * within 1 hour for immediate protection.
 *
 * AC #1: Push to API within 30 minutes
 * AC #4: Audit trail with reason for addition
 * AC #6: Separate from normal release cycle (no code deployment)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import {
  emergencyPushSchema,
  EMERGENCY_PUSH_CONSTANTS,
  type EmergencyPushResponse,
  type EmergencyPushRecord,
  type EmergencyOverrideEntry,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: emergencyAllowlistPush
 *
 * Allows admin users to push emergency crisis resource updates.
 * These updates are stored in Firestore and merged with the bundled
 * allowlist by the crisis allowlist API endpoint.
 *
 * Security invariants:
 * 1. Caller MUST have admin role in custom claims
 * 2. All pushes are logged with operator, reason, and timestamp
 * 3. Entries are stored separately for audit traceability
 *
 * @param request.data.entries - Array of CrisisUrlEntry to add
 * @param request.data.reason - Detailed reason for emergency push
 * @returns EmergencyPushResponse with pushId and status
 */
export const emergencyAllowlistPush = onCall(
  {
    enforceAppCheck: true,
  },
  async (request): Promise<EmergencyPushResponse> => {
    const db = getFirestore()

    // 1. Auth (FIRST) - Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerToken = request.auth.token

    // 2. Verify caller is an admin
    if (!callerToken.isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Admin access required for emergency allowlist push'
      )
    }

    // 3. Validation (SECOND) - Validate input
    const parseResult = emergencyPushSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { entries, reason } = parseResult.data
    const operator = callerToken.email || callerUid
    const pushId = uuidv4()
    const timestamp = new Date().toISOString()

    try {
      // Use batch write for atomicity
      const batch = db.batch()

      // 4. Create push record in emergency-pushes collection
      const pushRecord: Omit<EmergencyPushRecord, 'verifiedAt' | 'failureReason'> = {
        id: pushId,
        entries,
        reason,
        operator,
        timestamp,
        status: 'pending',
      }

      const pushRef = db.collection('emergency-pushes').doc(pushId)
      batch.set(pushRef, pushRecord)

      // 5. Create individual override entries
      for (const entry of entries) {
        const overrideEntry: EmergencyOverrideEntry = {
          id: entry.id,
          entry,
          addedAt: timestamp,
          reason,
          pushId,
        }

        const overrideRef = db.collection('crisis-allowlist-override').doc(entry.id)
        batch.set(overrideRef, overrideEntry)
      }

      // Commit the batch
      await batch.commit()

      // 6. Update status to propagated (entries are now in Firestore)
      await pushRef.update({
        status: 'propagated',
      })

      // 7. Log to admin audit
      await db.collection('adminAuditLog').add({
        action: 'emergency_allowlist_push',
        resourceType: 'crisisAllowlist',
        resourceId: pushId,
        performedBy: callerUid,
        metadata: {
          entriesCount: entries.length,
          entries: entries.map((e) => ({
            id: e.id,
            domain: e.domain,
            name: e.name,
          })),
          reason,
          operator,
        },
        timestamp: FieldValue.serverTimestamp(),
      })

      // Return success response per FR7A (< 30 minutes target)
      return {
        success: true,
        pushId,
        entriesAdded: entries.length,
        message: `Successfully pushed ${entries.length} crisis resource(s) for emergency protection`,
        estimatedPropagationMinutes: EMERGENCY_PUSH_CONSTANTS.TARGET_PROPAGATION_MINUTES,
      }
    } catch (error) {
      console.error('Error in emergency allowlist push:', error)

      // Log error to admin audit
      await db.collection('adminAuditLog').add({
        action: 'emergency_allowlist_push_error',
        resourceType: 'crisisAllowlist',
        resourceId: pushId,
        performedBy: callerUid,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          entriesCount: entries.length,
          reason,
        },
        timestamp: FieldValue.serverTimestamp(),
      })

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError(
        'internal',
        'Failed to push emergency allowlist update'
      )
    }
  }
)
