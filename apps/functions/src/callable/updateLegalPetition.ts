import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { notifyPetitionerStatusUpdate } from '../utils/legalPetitionNotifications'

/**
 * Input schema for updating a legal petition
 */
const updateLegalPetitionInputSchema = z.object({
  petitionId: z.string().min(1),
  action: z.enum([
    'updateStatus',
    'assign',
    'addNote',
    'updateSupportMessage',
  ]),
  // For updateStatus action
  status: z
    .enum(['pending', 'under-review', 'verified', 'denied'])
    .optional(),
  targetFamilyId: z.string().optional(),
  // For assign action
  assignTo: z.string().nullable().optional(),
  // For addNote action
  noteContent: z.string().optional(),
  // For updateSupportMessage action
  supportMessage: z.string().optional(),
})

/**
 * Callable Cloud Function: updateLegalPetition
 *
 * Story 3.6: Legal Parent Petition for Access - Task 9
 *
 * Updates legal petition status, assignment, notes, or support messages.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. ONLY callable by safety-team role
 * 2. All changes are logged in status history
 * 3. Admin audit trail maintained
 */
export const updateLegalPetition = onCall(
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

    // Verify caller has safety-team role
    const adminRoleDoc = await db.doc(`adminRoles/${callerId}`).get()
    if (!adminRoleDoc.exists) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to update legal petitions'
      )
    }

    const adminRoleData = adminRoleDoc.data()
    const roles = adminRoleData?.roles || []
    if (!roles.includes('safety-team') && !roles.includes('admin')) {
      throw new HttpsError(
        'permission-denied',
        'Only safety team members can update legal petitions'
      )
    }

    // Validate input
    const parseResult = updateLegalPetitionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input data',
        parseResult.error.flatten()
      )
    }

    const { petitionId, action, status, targetFamilyId, assignTo, noteContent, supportMessage } =
      parseResult.data

    try {
      const petitionRef = db.doc(`legalPetitions/${petitionId}`)
      const petitionDoc = await petitionRef.get()

      if (!petitionDoc.exists) {
        throw new HttpsError('not-found', 'Petition not found')
      }

      const now = FieldValue.serverTimestamp()

      switch (action) {
        case 'updateStatus': {
          if (!status) {
            throw new HttpsError('invalid-argument', 'Status is required for updateStatus action')
          }

          const petitionData = petitionDoc.data()!

          const updateData: Record<string, unknown> = {
            status,
            updatedAt: now,
          }

          // If verifying, optionally set target family
          if (status === 'verified' && targetFamilyId) {
            updateData.targetFamilyId = targetFamilyId
          }

          // Add to status history
          const statusHistoryEntry = {
            status,
            timestamp: new Date(),
            updatedBy: callerId,
            note: targetFamilyId ? `Target family: ${targetFamilyId}` : null,
          }

          await petitionRef.update({
            ...updateData,
            statusHistory: FieldValue.arrayUnion(statusHistoryEntry),
          })

          // Log admin action
          await db.collection('adminAuditLog').add({
            action: 'legal_petition_status_update',
            petitionId,
            newStatus: status,
            targetFamilyId: targetFamilyId || null,
            performedBy: callerId,
            timestamp: now,
          })

          // Send status update notification to petitioner
          // Note: 'verified' notifications are handled by addCourtOrderedParent
          if (status !== 'verified' && petitionData.petitionerEmail) {
            await notifyPetitionerStatusUpdate(
              petitionData.petitionerEmail,
              petitionId,
              petitionData.petitionerName || 'Petitioner',
              status,
              petitionData.supportMessageToUser
            )
          }

          return { success: true, action: 'statusUpdated', newStatus: status }
        }

        case 'assign': {
          await petitionRef.update({
            assignedTo: assignTo,
            updatedAt: now,
          })

          // Log admin action
          await db.collection('adminAuditLog').add({
            action: 'legal_petition_assigned',
            petitionId,
            assignedTo: assignTo,
            performedBy: callerId,
            timestamp: now,
          })

          return { success: true, action: 'assigned', assignedTo: assignTo }
        }

        case 'addNote': {
          if (!noteContent || !noteContent.trim()) {
            throw new HttpsError('invalid-argument', 'Note content is required')
          }

          const noteEntry = {
            content: noteContent.trim(),
            addedBy: callerId,
            addedAt: new Date(),
          }

          await petitionRef.update({
            internalNotes: FieldValue.arrayUnion(noteEntry),
            updatedAt: now,
          })

          // Log admin action
          await db.collection('adminAuditLog').add({
            action: 'legal_petition_note_added',
            petitionId,
            performedBy: callerId,
            timestamp: now,
          })

          return { success: true, action: 'noteAdded' }
        }

        case 'updateSupportMessage': {
          await petitionRef.update({
            supportMessageToUser: supportMessage || null,
            updatedAt: now,
          })

          // Log admin action
          await db.collection('adminAuditLog').add({
            action: 'legal_petition_support_message_updated',
            petitionId,
            performedBy: callerId,
            timestamp: now,
          })

          return { success: true, action: 'supportMessageUpdated' }
        }

        default:
          throw new HttpsError('invalid-argument', 'Invalid action')
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      console.error('Error updating legal petition:', error)
      throw new HttpsError(
        'internal',
        'Failed to update petition. Please try again.'
      )
    }
  }
)
