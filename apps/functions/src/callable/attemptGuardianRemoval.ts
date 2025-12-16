import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  attemptGuardianRemovalInputSchema,
  requiresRemovalProtection,
  createBlockedResult,
  createAllowedResult,
  type GuardianRemovalResult,
  type AttemptGuardianRemovalInput,
} from '@fledgely/contracts'
import { logBlockedAttemptToAdminAudit } from '../utils/adminAuditLogger'

/**
 * Callable Cloud Function: attemptGuardianRemoval
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * Checks if a guardian can be removed from a child's monitoring.
 * In shared custody families, removal is BLOCKED to prevent weaponization.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Cannot remove self (use selfRemoveFromChild for that)
 * 4. Shared/complex custody = removal blocked
 * 5. Blocked attempts logged to adminAuditLog for abuse signal detection
 *
 * Returns:
 * - If blocked: structured error with paths to dissolution (Story 2.7) and legal petition (Story 3.6)
 * - If allowed: success response indicating removal can proceed
 */
export const attemptGuardianRemoval = onCall(
  {
    enforceAppCheck: true,
  },
  async (request): Promise<GuardianRemovalResult> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = attemptGuardianRemovalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: AttemptGuardianRemovalInput = parseResult.data
    const { familyId, targetGuardianId, childId } = input

    // Cannot remove yourself via this function
    if (targetGuardianId === callerUid) {
      throw new HttpsError(
        'invalid-argument',
        'Cannot remove yourself. Use the self-removal option instead.'
      )
    }

    const db = getFirestore()

    try {
      // Verify caller is a guardian of the child
      const childDoc = await db.collection('children').doc(childId).get()

      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found')
      }

      const childData = childDoc.data()
      if (!childData) {
        throw new HttpsError('not-found', 'Child data not found')
      }

      // Check if caller is a guardian
      const guardians = childData.guardians || []
      const isGuardian = guardians.some((g: { uid: string }) => g.uid === callerUid)

      if (!isGuardian) {
        throw new HttpsError(
          'permission-denied',
          'You must be a guardian to remove another guardian from this child'
        )
      }

      // Check if target is actually a guardian
      const targetIsGuardian = guardians.some((g: { uid: string }) => g.uid === targetGuardianId)
      if (!targetIsGuardian) {
        throw new HttpsError('not-found', 'Target guardian not found for this child')
      }

      // Get custody declaration
      const custodyDeclaration = childData.custodyDeclaration
      const custodyType = custodyDeclaration?.type || null

      // Check if removal protection applies
      if (requiresRemovalProtection(custodyType)) {
        // BLOCKED: Log to admin audit log for abuse signal detection
        await logBlockedAttemptToAdminAudit({
          attemptedBy: callerUid,
          targetGuardian: targetGuardianId,
          childId,
          familyId,
          custodyType: custodyType as 'shared' | 'complex',
          blockedOperation: 'guardian_removal',
        })

        // Return structured blocked result with guidance
        return createBlockedResult('guardian_removal')
      }

      // Sole custody or no custody declaration - removal is allowed
      // Note: The actual removal is performed by a separate function
      // This function only checks if removal is permitted
      return createAllowedResult()
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to check guardian removal permission:', {
        childId,
        targetGuardianId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to check removal permission')
    }
  }
)
