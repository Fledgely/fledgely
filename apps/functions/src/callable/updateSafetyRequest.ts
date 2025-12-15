import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'

/**
 * Admin note schema
 */
const adminNoteSchema = z.object({
  content: z.string().min(1).max(10000),
})

/**
 * Verification checklist schema
 */
const verificationChecklistSchema = z.object({
  phoneVerified: z.boolean().optional(),
  idMatched: z.boolean().optional(),
  accountOwnershipVerified: z.boolean().optional(),
  safeContactConfirmed: z.boolean().optional(),
})

/**
 * Escalation schema
 */
const escalationSchema = z.object({
  isEscalated: z.boolean(),
  reason: z.string().max(1000).optional(),
})

/**
 * Input schema for updating a safety request
 */
const updateSafetyRequestInputSchema = z.object({
  /** Request ID to update */
  requestId: z.string().min(1),
  /** Update type */
  updateType: z.enum([
    'status',
    'assignment',
    'verification',
    'note',
    'escalation',
  ]),
  /** New status (for status updates) */
  status: z.enum(['pending', 'in-progress', 'resolved']).optional(),
  /** Agent ID to assign to (for assignment updates) */
  assignTo: z.string().nullable().optional(),
  /** Verification checklist updates */
  verification: verificationChecklistSchema.optional(),
  /** Note to add */
  note: adminNoteSchema.optional(),
  /** Escalation update */
  escalation: escalationSchema.optional(),
})

/**
 * Callable Cloud Function: updateSafetyRequest
 *
 * CRITICAL: This function modifies safety request data.
 * Only safety-team members can update requests.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. All updates logged to adminAuditLog
 * 3. Updates NEVER visible to family members
 */
export const updateSafetyRequest = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const db = getFirestore()

    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerClaims = request.auth.token

    // Verify caller is safety-team
    if (!callerClaims.isSafetyTeam && !callerClaims.isAdmin) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required'
      )
    }

    // Validate input
    const parseResult = updateSafetyRequestInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const {
      requestId,
      updateType,
      status,
      assignTo,
      verification,
      note,
      escalation,
    } = parseResult.data

    try {
      // Get the safety request
      const requestRef = db.collection('safetyRequests').doc(requestId)
      const requestDoc = await requestRef.get()

      if (!requestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const currentData = requestDoc.data()!
      const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
        lastUpdatedBy: callerUid,
      }
      let auditAction = ''
      let auditMetadata: Record<string, unknown> = {}

      switch (updateType) {
        case 'status':
          if (!status) {
            throw new HttpsError(
              'invalid-argument',
              'Status is required for status updates'
            )
          }
          updateData.status = status
          auditAction = 'safety_request_status_updated'
          auditMetadata = {
            previousStatus: currentData.status,
            newStatus: status,
          }
          break

        case 'assignment':
          updateData.assignedTo = assignTo || null
          auditAction = 'safety_request_assigned'
          auditMetadata = {
            previousAssignee: currentData.assignedTo || null,
            newAssignee: assignTo || null,
          }
          break

        case 'verification':
          if (!verification) {
            throw new HttpsError(
              'invalid-argument',
              'Verification data required'
            )
          }
          const currentChecklist = currentData.verificationChecklist || {}
          updateData.verificationChecklist = {
            ...currentChecklist,
            ...verification,
          }
          auditAction = 'safety_request_verification_updated'
          auditMetadata = {
            previousChecklist: currentChecklist,
            updates: verification,
          }
          break

        case 'note':
          if (!note?.content) {
            throw new HttpsError(
              'invalid-argument',
              'Note content is required'
            )
          }
          const newNote = {
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: note.content,
            addedBy: callerUid,
            addedAt: Timestamp.now(),
          }
          updateData.adminNotes = FieldValue.arrayUnion(newNote)
          auditAction = 'safety_request_note_added'
          auditMetadata = {
            noteId: newNote.id,
            // Don't log note content to audit for privacy
          }
          break

        case 'escalation':
          if (!escalation) {
            throw new HttpsError(
              'invalid-argument',
              'Escalation data required'
            )
          }
          updateData.escalation = {
            isEscalated: escalation.isEscalated,
            reason: escalation.reason || null,
            escalatedBy: escalation.isEscalated ? callerUid : null,
            escalatedAt: escalation.isEscalated ? Timestamp.now() : null,
          }
          auditAction = escalation.isEscalated
            ? 'safety_request_escalated'
            : 'safety_request_deescalated'
          auditMetadata = {
            isEscalated: escalation.isEscalated,
            hasReason: !!escalation.reason,
          }
          break

        default:
          throw new HttpsError('invalid-argument', 'Invalid update type')
      }

      // Apply update
      await requestRef.update(updateData)

      // Log to admin audit
      await db.collection('adminAuditLog').add({
        action: auditAction,
        resourceType: 'safetyRequest',
        resourceId: requestId,
        performedBy: callerUid,
        metadata: auditMetadata,
        timestamp: FieldValue.serverTimestamp(),
      })

      return {
        success: true,
        updateType,
        requestId,
      }
    } catch (error) {
      console.error('Error updating safety request:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      // Log error
      await db.collection('adminAuditLog').add({
        action: 'safety_request_update_error',
        resourceType: 'safetyRequest',
        resourceId: requestId,
        performedBy: callerUid,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
      })

      throw new HttpsError('internal', 'Failed to update safety request')
    }
  }
)
