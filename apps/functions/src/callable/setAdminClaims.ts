import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'

/**
 * Input schema for setting admin claims
 */
const setAdminClaimsInputSchema = z.object({
  /** Target user ID to modify */
  targetUserId: z.string().min(1),
  /** Roles to grant */
  roles: z.array(z.enum(['safety-team', 'admin', 'legal', 'compliance'])),
  /** Whether to add or remove the roles */
  action: z.enum(['grant', 'revoke']),
})

/**
 * Callable Cloud Function: setAdminClaims
 *
 * CRITICAL: This function modifies admin permissions.
 * Only existing admins can grant/revoke roles.
 *
 * Security invariants:
 * 1. Caller MUST have admin role in custom claims
 * 2. Cannot revoke own admin role (prevent lockout)
 * 3. All changes logged to adminAuditLog
 * 4. Bootstrap admin must be set via Firebase Console
 */
export const setAdminClaims = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const db = getFirestore()
    const auth = getAuth()

    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerClaims = request.auth.token

    // Verify caller is an admin
    if (!callerClaims.isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Only administrators can modify admin claims'
      )
    }

    // Validate input
    const parseResult = setAdminClaimsInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { targetUserId, roles, action } = parseResult.data

    // Prevent self-lockout
    if (
      callerUid === targetUserId &&
      action === 'revoke' &&
      roles.includes('admin')
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Cannot revoke your own admin role'
      )
    }

    try {
      // Get current claims for target user
      const targetUser = await auth.getUser(targetUserId)
      const currentClaims = targetUser.customClaims || {}

      // Build new claims based on action
      const newClaims = { ...currentClaims }

      if (action === 'grant') {
        for (const role of roles) {
          if (role === 'safety-team') {
            newClaims.isSafetyTeam = true
          } else if (role === 'admin') {
            newClaims.isAdmin = true
          } else if (role === 'legal') {
            newClaims.isLegalTeam = true
          } else if (role === 'compliance') {
            newClaims.isComplianceTeam = true
          }
        }
      } else {
        for (const role of roles) {
          if (role === 'safety-team') {
            delete newClaims.isSafetyTeam
          } else if (role === 'admin') {
            delete newClaims.isAdmin
          } else if (role === 'legal') {
            delete newClaims.isLegalTeam
          } else if (role === 'compliance') {
            delete newClaims.isComplianceTeam
          }
        }
      }

      // Set new custom claims
      await auth.setCustomUserClaims(targetUserId, newClaims)

      // Update adminRoles document for query capability
      await db
        .collection('adminRoles')
        .doc(targetUserId)
        .set(
          {
            userId: targetUserId,
            roles: Object.keys(newClaims).filter(
              (k) =>
                k.startsWith('is') &&
                newClaims[k as keyof typeof newClaims] === true
            ),
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: callerUid,
          },
          { merge: true }
        )

      // Log to admin audit
      await db.collection('adminAuditLog').add({
        action: `admin_claims_${action}`,
        resourceType: 'adminClaims',
        resourceId: targetUserId,
        performedBy: callerUid,
        metadata: {
          roles,
          action,
          previousClaims: currentClaims,
          newClaims,
        },
        timestamp: FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        claims: newClaims,
      }
    } catch (error) {
      console.error('Error setting admin claims:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      await db.collection('adminAuditLog').add({
        action: 'admin_claims_error',
        resourceType: 'adminClaims',
        resourceId: targetUserId,
        performedBy: callerUid,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError('internal', 'Failed to update admin claims')
    }
  }
)
