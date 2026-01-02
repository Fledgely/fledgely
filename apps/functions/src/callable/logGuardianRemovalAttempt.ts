/**
 * Cloud Function to log guardian removal attempts.
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * SECURITY DESIGN:
 * - Logs to admin audit only (not family audit)
 * - Used to detect potential abuse patterns
 * - Silent logging - no notification to anyone
 * - Only logs when removal is blocked (multi-guardian family)
 *
 * This function is called when a user attempts to remove another guardian
 * from a shared custody family. The actual removal is already blocked by
 * Firestore security rules, but we log the attempt for abuse detection.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { logAdminAction } from '../utils/adminAudit'

// Lazy initialization for Firestore (supports test mocking)
let db: Firestore | null = null
function getDb(): Firestore {
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
 * Input schema for logging guardian removal attempt.
 */
export const logGuardianRemovalAttemptInputSchema = z.object({
  familyId: z.string().min(1),
  attemptedByUid: z.string().min(1),
  targetUid: z.string().min(1),
  targetEmail: z.string().nullable().optional(),
})

export type LogGuardianRemovalAttemptInput = z.infer<typeof logGuardianRemovalAttemptInputSchema>

export interface LogGuardianRemovalAttemptResponse {
  success: boolean
  logId: string
}

/**
 * Log a guardian removal attempt to admin audit.
 *
 * SECURITY:
 * - Only authenticated users can call this
 * - User must be a guardian of the family
 * - User cannot log attempts for other users (attemptedByUid must match auth.uid)
 * - Logs to admin audit only (not visible to family)
 */
export const logGuardianRemovalAttempt = onCall<
  LogGuardianRemovalAttemptInput,
  Promise<LogGuardianRemovalAttemptResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify user is authenticated
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid
    const userEmail = request.auth.token.email || null

    // 2. Validate input
    const parseResult = logGuardianRemovalAttemptInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid parameters')
    }
    const { familyId, attemptedByUid, targetUid, targetEmail } = parseResult.data

    // 3. Verify attemptedByUid matches authenticated user (prevent spoofing)
    if (attemptedByUid !== userUid) {
      throw new HttpsError('permission-denied', 'Cannot log attempts for other users')
    }

    // 4. Verify family exists
    const familyRef = getDb().collection('families').doc(familyId)
    const family = await familyRef.get()
    if (!family.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }
    const familyData = family.data()

    // 5. Verify user is a guardian of this family
    const guardianUids: string[] = familyData?.guardianUids || []
    if (!guardianUids.includes(userUid)) {
      throw new HttpsError('permission-denied', 'You are not a guardian of this family')
    }

    // 6. Verify target is also a guardian (only log attempts on actual guardians)
    if (!guardianUids.includes(targetUid)) {
      throw new HttpsError('invalid-argument', 'Target user is not a guardian of this family')
    }

    // 7. Log to admin audit (silent - no notification)
    const logId = await logAdminAction({
      agentId: userUid,
      agentEmail: userEmail,
      action: 'guardian_removal_attempt',
      resourceType: 'guardian_removal_attempt',
      resourceId: familyId,
      metadata: {
        familyId,
        attemptedByUid,
        targetUid,
        targetEmail: targetEmail || null,
        guardianCount: guardianUids.length,
        reason: 'multi_guardian_family',
        timestamp: Date.now(),
      },
    })

    return {
      success: true,
      logId,
    }
  }
)
