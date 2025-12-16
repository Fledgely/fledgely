import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  attemptPermissionChangeInputSchema,
  requiresRemovalProtection,
  isPermissionDowngrade,
  createBlockedResult,
  createAllowedResult,
  type GuardianRemovalResult,
  type AttemptPermissionChangeInput,
} from '@fledgely/contracts'
import { logBlockedAttemptToAdminAudit } from '../utils/adminAuditLogger'

/**
 * Callable Cloud Function: attemptGuardianPermissionChange
 *
 * Story 3A.6: Co-Parent Removal Prevention
 *
 * Checks if a guardian's permissions can be changed for a child.
 * In shared custody families, permission DOWNGRADES are BLOCKED to prevent weaponization.
 *
 * Permission downgrades that are blocked:
 * - full -> readonly
 *
 * Permission changes that are allowed (even in shared custody):
 * - readonly -> full (upgrade)
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Cannot change own permissions via this function
 * 4. Shared/complex custody + downgrade = blocked
 * 5. Blocked attempts logged to adminAuditLog for abuse signal detection
 */
export const attemptGuardianPermissionChange = onCall(
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
    const parseResult = attemptPermissionChangeInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: AttemptPermissionChangeInput = parseResult.data
    const { familyId, targetGuardianId, childId, newPermissions } = input

    // Cannot change your own permissions via this function
    if (targetGuardianId === callerUid) {
      throw new HttpsError(
        'invalid-argument',
        'Cannot change your own permissions via this function.'
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
          "You must be a guardian to change another guardian's permissions"
        )
      }

      // Find target guardian and get current permissions
      const targetGuardian = guardians.find((g: { uid: string }) => g.uid === targetGuardianId)
      if (!targetGuardian) {
        throw new HttpsError('not-found', 'Target guardian not found for this child')
      }

      const currentPermissions = targetGuardian.permissions || 'full'

      // Get custody declaration
      const custodyDeclaration = childData.custodyDeclaration
      const custodyType = custodyDeclaration?.type || null

      // Check if this is a downgrade in a protected custody situation
      if (
        requiresRemovalProtection(custodyType) &&
        isPermissionDowngrade(currentPermissions, newPermissions)
      ) {
        // BLOCKED: Log to admin audit log for abuse signal detection
        await logBlockedAttemptToAdminAudit({
          attemptedBy: callerUid,
          targetGuardian: targetGuardianId,
          childId,
          familyId,
          custodyType: custodyType as 'shared' | 'complex',
          blockedOperation: 'permission_downgrade',
          currentPermissions,
          requestedPermissions: newPermissions,
        })

        // Return structured blocked result with guidance
        return createBlockedResult('permission_downgrade')
      }

      // Not a protected downgrade - permission change is allowed
      return createAllowedResult()
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to check guardian permission change:', {
        childId,
        targetGuardianId,
        newPermissions,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to check permission change')
    }
  }
)
