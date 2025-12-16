import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  attemptRoleChangeInputSchema,
  requiresRemovalProtection,
  isRoleDowngrade,
  createBlockedResult,
  createAllowedResult,
  type GuardianRemovalResult,
  type AttemptRoleChangeInput,
} from '@fledgely/contracts'
import { logBlockedAttemptToAdminAudit } from '../utils/adminAuditLogger'

/**
 * Callable Cloud Function: attemptGuardianRoleChange
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * Checks if a guardian's role can be changed for a child.
 * In shared custody families, role DOWNGRADES are BLOCKED to prevent weaponization.
 *
 * Role downgrades that are blocked:
 * - co-parent -> caregiver
 * - primary -> caregiver
 *
 * Role changes that are allowed (even in shared custody):
 * - primary <-> co-parent (equal standing, not a downgrade)
 * - caregiver -> co-parent or primary (upgrade)
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Cannot change own role via this function
 * 4. Shared/complex custody + downgrade = blocked
 * 5. Blocked attempts logged to adminAuditLog for abuse signal detection
 */
export const attemptGuardianRoleChange = onCall(
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
    const parseResult = attemptRoleChangeInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: AttemptRoleChangeInput = parseResult.data
    const { familyId, targetGuardianId, childId, newRole } = input

    // Cannot change your own role via this function
    if (targetGuardianId === callerUid) {
      throw new HttpsError('invalid-argument', 'Cannot change your own role via this function.')
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
          "You must be a guardian to change another guardian's role"
        )
      }

      // Find target guardian and get current role
      const targetGuardian = guardians.find((g: { uid: string }) => g.uid === targetGuardianId)
      if (!targetGuardian) {
        throw new HttpsError('not-found', 'Target guardian not found for this child')
      }

      const currentRole = targetGuardian.role || 'co-parent'

      // Get custody declaration
      const custodyDeclaration = childData.custodyDeclaration
      const custodyType = custodyDeclaration?.type || null

      // Check if this is a downgrade in a protected custody situation
      if (requiresRemovalProtection(custodyType) && isRoleDowngrade(currentRole, newRole)) {
        // BLOCKED: Log to admin audit log for abuse signal detection
        await logBlockedAttemptToAdminAudit({
          attemptedBy: callerUid,
          targetGuardian: targetGuardianId,
          childId,
          familyId,
          custodyType: custodyType as 'shared' | 'complex',
          blockedOperation: 'role_downgrade',
          currentRole,
          requestedRole: newRole,
        })

        // Return structured blocked result with guidance
        return createBlockedResult('role_downgrade')
      }

      // Not a protected downgrade - role change is allowed
      return createAllowedResult()
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to check guardian role change permission:', {
        childId,
        targetGuardianId,
        newRole,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to check role change permission')
    }
  }
)
