import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import {
  notifyNewParentAccessGranted,
  notifyExistingGuardiansCourtOrderedParent,
} from '../utils/legalPetitionNotifications'

/**
 * Input schema for adding a court-ordered parent
 */
const addCourtOrderedParentInputSchema = z.object({
  petitionId: z.string().min(1),
  familyId: z.string().min(1),
  newParentUserId: z.string().min(1),
})

/**
 * Callable Cloud Function: addCourtOrderedParent
 *
 * Story 3.6: Legal Parent Petition for Access - Task 5
 *
 * Allows support team to add a verified legal parent to a family
 * bypassing the normal invitation flow.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. ONLY callable by safety-team role
 * 2. Do NOT log to family audit trail
 * 3. Log to admin audit only
 * 4. Mark guardian as addedVia: 'court-order' (prevents revocation)
 * 5. Update petition status to 'verified'
 */
export const addCourtOrderedParent = onCall(
  {
    enforceAppCheck: false,
  },
  async (request) => {
    const db = getFirestore()

    // Require authentication
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerId = request.auth.uid

    // Validate input
    const parseResult = addCourtOrderedParentInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input data',
        parseResult.error.flatten()
      )
    }

    const { petitionId, familyId, newParentUserId } = parseResult.data

    // Verify caller has safety-team role
    const adminRoleDoc = await db.doc(`adminRoles/${callerId}`).get()
    if (!adminRoleDoc.exists) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to perform this action'
      )
    }

    const adminRoleData = adminRoleDoc.data()
    const roles = adminRoleData?.roles || []
    if (!roles.includes('safety-team') && !roles.includes('admin')) {
      throw new HttpsError(
        'permission-denied',
        'Only safety team members can add court-ordered parents'
      )
    }

    try {
      // Run in transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // Get petition
        const petitionRef = db.doc(`legalPetitions/${petitionId}`)
        const petitionDoc = await transaction.get(petitionRef)

        if (!petitionDoc.exists) {
          throw new HttpsError('not-found', 'Petition not found')
        }

        const petition = petitionDoc.data()!

        // Check petition status - must not already be verified
        if (petition.status === 'verified') {
          throw new HttpsError(
            'failed-precondition',
            'Petition has already been verified'
          )
        }

        if (petition.status === 'denied') {
          throw new HttpsError(
            'failed-precondition',
            'Cannot add parent from denied petition'
          )
        }

        // Get family
        const familyRef = db.doc(`families/${familyId}`)
        const familyDoc = await transaction.get(familyRef)

        if (!familyDoc.exists) {
          throw new HttpsError('not-found', 'Family not found')
        }

        const family = familyDoc.data()!
        const guardians = family.guardians || []

        // Check if parent is already in family
        const existingGuardian = guardians.find(
          (g: { uid: string }) => g.uid === newParentUserId
        )
        if (existingGuardian) {
          throw new HttpsError(
            'already-exists',
            'Parent is already a guardian of this family'
          )
        }

        const now = Timestamp.now()

        // Create new guardian object
        const newGuardian = {
          uid: newParentUserId,
          role: 'co-parent',
          permissions: 'full', // Equal access per Story 3.4
          joinedAt: now,
          addedVia: 'court-order',
          addedBy: callerId,
        }

        // Update family with new guardian
        const updatedGuardians = [...guardians, newGuardian]
        transaction.update(familyRef, {
          guardians: updatedGuardians,
          updatedAt: now,
        })

        // Update petition status to verified
        const statusHistoryEntry = {
          status: 'verified',
          timestamp: now,
          updatedBy: callerId,
          note: `Parent added to family ${familyId}`,
        }

        transaction.update(petitionRef, {
          status: 'verified',
          targetFamilyId: familyId,
          updatedAt: now,
          statusHistory: FieldValue.arrayUnion(statusHistoryEntry),
        })

        return {
          success: true,
          familyId,
          newParentUserId,
          existingGuardians: guardians.map((g: { uid: string }) => g.uid),
        }
      })

      // Log to admin audit ONLY (NOT family audit trail)
      // CRITICAL: Never log to /families/{familyId}/auditLog/
      await db.collection('adminAuditLog').add({
        action: 'court_ordered_parent_added',
        resourceType: 'legalPetition',
        resourceId: petitionId,
        metadata: {
          familyId,
          newParentUserId,
          petitionId,
          addedBy: callerId,
        },
        performedBy: callerId,
        timestamp: FieldValue.serverTimestamp(),
      })

      // Task 12: Send notifications
      // Get petition data for notification content
      const petitionDoc = await db.doc(`legalPetitions/${petitionId}`).get()
      const petition = petitionDoc.data()

      // Get new parent's email for notification
      const newParentProfile = await db.doc(`users/${newParentUserId}`).get()
      const newParentEmail = newParentProfile.data()?.email

      // Get existing guardians' emails for notification
      const existingGuardianEmails: string[] = []
      for (const guardianUid of result.existingGuardians) {
        const guardianProfile = await db.doc(`users/${guardianUid}`).get()
        const guardianEmail = guardianProfile.data()?.email
        if (guardianEmail) {
          existingGuardianEmails.push(guardianEmail)
        }
      }

      // Send notification to new parent (LEGAL_PARENT_ACCESS_GRANTED)
      if (newParentEmail && petition) {
        await notifyNewParentAccessGranted(
          newParentEmail,
          petitionId,
          petition.petitionerName || 'Parent',
          petition.childName || 'your child'
        )
      }

      // Send notification to existing guardians (COURT_ORDERED_PARENT_ADDED)
      if (existingGuardianEmails.length > 0) {
        await notifyExistingGuardiansCourtOrderedParent(
          existingGuardianEmails,
          petitionId,
          familyId
        )
      }

      return {
        success: true,
        familyId: result.familyId,
        message: 'Court-ordered parent has been added to the family',
      }
    } catch (error) {
      // Log error to admin audit
      if (!(error instanceof HttpsError)) {
        console.error('Error adding court-ordered parent:', error)

        await db.collection('adminAuditLog').add({
          action: 'court_ordered_parent_error',
          resourceType: 'legalPetition',
          resourceId: petitionId,
          error: error instanceof Error ? error.message : 'Unknown error',
          performedBy: callerId,
          timestamp: FieldValue.serverTimestamp(),
        })

        throw new HttpsError(
          'internal',
          'Failed to add court-ordered parent. Please try again.'
        )
      }
      throw error
    }
  }
)
