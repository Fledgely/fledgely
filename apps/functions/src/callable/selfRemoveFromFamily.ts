/**
 * Cloud Function for user-initiated self-removal from a family.
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * CRITICAL SAFETY DESIGN:
 * - User can ONLY remove themselves (not others)
 * - Immediate removal, no waiting period
 * - NO notification to remaining family members
 * - NO family audit log entry (sealed audit only)
 * - User sees "No families found" after removal
 * - Cannot remove if user is the last guardian
 *
 * Implements acceptance criteria:
 * - AC3: Immediate access revocation (no 30-day wait)
 * - AC4: Other parent's access remains intact
 * - AC5: Guardian entry removed from family and children
 * - AC6: NO notification sent to other family members
 * - AC7: Action logged in sealed audit only
 * - AC8: User sees "No families found" after removal
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  SELF_REMOVAL_CONFIRMATION_PHRASE,
  selfRemoveFromFamilyInputSchema,
  type SelfRemoveFromFamilyInput,
  type SelfRemoveFromFamilyResponse,
} from '@fledgely/shared'
import { logAdminAction } from '../utils/adminAudit'
import { sealEscapeRelatedEntries } from '../lib/audit/escapeAuditSealer'

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

// Re-export for use in tests
export { SELF_REMOVAL_CONFIRMATION_PHRASE }

/**
 * Self-remove from a family.
 *
 * CRITICAL: This is a survivor escape feature.
 * - Removes the authenticated user from the family
 * - Does NOT modify child profiles (they remain in family)
 * - Does NOT send any notifications
 * - Does NOT log to family audit
 * - Logs to sealed admin audit only
 */
export const selfRemoveFromFamily = onCall<
  SelfRemoveFromFamilyInput,
  Promise<SelfRemoveFromFamilyResponse>
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
    const parseResult = selfRemoveFromFamilyInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid parameters')
    }
    const { familyId } = parseResult.data

    // 3. Verify family exists
    const familyRef = getDb().collection('families').doc(familyId)
    const family = await familyRef.get()
    if (!family.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }
    const familyData = family.data()

    // 4. Verify user is a guardian of this family
    const guardianUids: string[] = familyData?.guardianUids || []
    if (!guardianUids.includes(userUid)) {
      throw new HttpsError('permission-denied', 'You are not a guardian of this family')
    }

    // 5. Check if user is the last guardian
    if (guardianUids.length <= 1) {
      throw new HttpsError(
        'failed-precondition',
        'Cannot remove yourself as the last guardian. Please use family dissolution instead.'
      )
    }

    // 6. Get user's current data for audit
    const userRef = getDb().collection('users').doc(userUid)
    const userDoc = await userRef.get()
    const userData = userDoc.exists ? userDoc.data() : null

    // 7. Execute self-removal in a transaction for atomicity
    // CRITICAL: This must be atomic to prevent partial updates
    try {
      await getDb().runTransaction(async (transaction) => {
        // Re-read family within transaction to ensure consistency
        const familySnapshot = await transaction.get(familyRef)
        if (!familySnapshot.exists) {
          throw new HttpsError('not-found', 'Family not found')
        }
        const currentFamilyData = familySnapshot.data()
        const currentGuardianUids: string[] = currentFamilyData?.guardianUids || []

        // Double-check guardian hasn't been removed by another request
        if (!currentGuardianUids.includes(userUid)) {
          // Already removed, transaction succeeds as no-op
          return
        }

        // Double-check not last guardian
        if (currentGuardianUids.length <= 1) {
          throw new HttpsError('failed-precondition', 'Cannot remove yourself as the last guardian')
        }

        // 7a. Remove user from family guardianUids and guardians arrays
        interface Guardian {
          uid: string
          role?: string
          addedAt?: unknown
        }
        const updatedGuardians =
          currentFamilyData?.guardians?.filter((g: Guardian) => g.uid !== userUid) || []

        transaction.update(familyRef, {
          guardianUids: FieldValue.arrayRemove(userUid),
          guardians: updatedGuardians,
          updatedAt: FieldValue.serverTimestamp(),
        })

        // 7b. Clear user's familyId in user document
        transaction.update(userRef, {
          familyId: null,
          updatedAt: FieldValue.serverTimestamp(),
        })

        // 7c. Remove user from all children's guardianUids arrays
        // Children are in families/{familyId}/children subcollection
        const childrenRef = getDb().collection('families').doc(familyId).collection('children')
        const childrenSnapshot = await transaction.get(childrenRef)

        for (const childDoc of childrenSnapshot.docs) {
          const childData = childDoc.data()
          const childGuardianUids: string[] = childData?.guardianUids || []

          if (childGuardianUids.includes(userUid)) {
            // Remove user from this child's guardians
            interface ChildGuardian {
              uid: string
              role?: string
              addedAt?: unknown
            }
            const updatedChildGuardians =
              childData?.guardians?.filter((g: ChildGuardian) => g.uid !== userUid) || []

            transaction.update(childDoc.ref, {
              guardianUids: FieldValue.arrayRemove(userUid),
              guardians: updatedChildGuardians,
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
        }

        // CRITICAL: NO family audit log entry
        // The action is NOT visible in family auditLogs
      })
    } catch (error) {
      // Re-throw HttpsErrors as-is (these are intentional error messages)
      if (error instanceof HttpsError) {
        throw error
      }
      // Log internal errors but return generic message
      console.error(`[selfRemoveFromFamily] Transaction failed for user ${userUid}:`, error)
      throw new HttpsError('internal', 'Failed to remove from family. Please try again.')
    }

    // 9. Log to admin audit - outside transaction
    // CRITICAL: This is a compliance/safety audit only, NOT visible to family
    await logAdminAction({
      agentId: userUid, // User is the "agent" performing self-removal
      agentEmail: userEmail,
      action: 'self_remove_from_family',
      resourceType: 'self_removal',
      resourceId: familyId,
      metadata: {
        removedUserUid: userUid,
        removedUserEmail: userEmail,
        removedUserDisplayName: userData?.displayName || null,
        familyId,
        familyName: familyData?.name || null,
        remainingGuardians: guardianUids.length - 1,
        selfRemoval: true, // Distinguish from admin-initiated severing
      },
      ipAddress: request.rawRequest?.ip || null,
    })

    // 10. Seal past audit entries for the departing user (AC7)
    // CRITICAL: This removes evidence of the user's activity from family-visible logs
    // NOTE: No ticketId for self-removal, we use a synthetic ID
    await sealEscapeRelatedEntries({
      familyId,
      escapedUserIds: [userUid],
      ticketId: `self_removal_${userUid}_${Date.now()}`, // Synthetic ticket ID
      agentId: userUid, // User is their own agent in self-removal
      agentEmail: userEmail,
      ipAddress: request.rawRequest?.ip || null,
    })

    // CRITICAL: NO notification to any party
    // CRITICAL: NO family audit log entry
    // User will see "No families found" on next login

    return {
      success: true,
      message: 'Successfully removed from family',
    }
  }
)
