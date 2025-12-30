/**
 * Cloud Function for updating safety tickets (admin only).
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * CRITICAL SECURITY DESIGN:
 * - Requires safety-team custom claim
 * - All updates logged to admin audit ONLY
 * - NO entries in family audit logs (AC5)
 * - Internal notes NEVER visible to family
 *
 * Implements acceptance criteria:
 * - AC4: Identity verification checklist
 * - AC5: Agent actions logged in admin audit (NOT family audit)
 * - AC6: Internal notes system
 * - AC7: Escalation to legal/compliance team
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction, AdminAuditAction } from '../../utils/adminAudit'

const db = getFirestore()

// Verification field schema
const verificationFieldSchema = z.enum([
  'phoneVerified',
  'idDocumentVerified',
  'accountMatchVerified',
  'securityQuestionsVerified',
])

// Input validation schema
const updateSafetyTicketInputSchema = z.object({
  ticketId: z.string().min(1),

  // Status update
  status: z.enum(['pending', 'in_progress', 'resolved', 'escalated']).optional(),

  // Internal note
  internalNote: z.string().max(5000).optional(),

  // Verification update
  verification: z
    .object({
      field: verificationFieldSchema,
      value: z.boolean(),
    })
    .optional(),

  // Escalation
  escalation: z
    .object({
      urgency: z.enum(['normal', 'high', 'critical']).default('normal'),
      reason: z.string().max(1000).optional(),
    })
    .optional(),

  // Assignment
  assignTo: z.string().optional(),
})

interface UpdateSafetyTicketResponse {
  success: boolean
  ticketId: string
}

/**
 * Update a safety ticket.
 *
 * Requires safety-team role.
 * Supports: status changes, internal notes, verification updates, escalation.
 *
 * CRITICAL: NO audit entries in family auditLogs collection.
 */
export const updateSafetyTicket = onCall<
  z.infer<typeof updateSafetyTicketInputSchema>,
  Promise<UpdateSafetyTicketResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'update_ticket')

    // 2. Validate input
    const parseResult = updateSafetyTicketInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid update parameters')
    }
    const { ticketId, status, internalNote, verification, escalation, assignTo } = parseResult.data

    // 3. Verify ticket exists
    const ticketRef = db.collection('safetyTickets').doc(ticketId)
    const ticketDoc = await ticketRef.get()

    if (!ticketDoc.exists) {
      throw new HttpsError('not-found', 'Ticket not found')
    }

    // 4. Build update object
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    const historyEntries: Array<{
      action: string
      agentId: string
      agentEmail: string | null
      timestamp: FieldValue
      details: string | null
    }> = []

    let auditAction: AdminAuditAction = 'update_ticket_status'
    const auditMetadata: Record<string, unknown> = {}

    // 5. Handle status update
    if (status) {
      const currentData = ticketDoc.data()
      const currentStatus = currentData?.status

      // Don't allow reopening resolved tickets
      if (currentStatus === 'resolved' && status !== 'resolved') {
        throw new HttpsError('failed-precondition', 'Cannot reopen resolved tickets')
      }

      updates.status = status
      auditMetadata.newStatus = status
      auditMetadata.previousStatus = currentStatus

      historyEntries.push({
        action: `status_changed_to_${status}`,
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: null,
      })

      // Handle resolution
      if (status === 'resolved') {
        updates.resolvedAt = FieldValue.serverTimestamp()
        updates.resolvedBy = context.agentId
      }
    }

    // 6. Handle internal note
    if (internalNote) {
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const newNote = {
        id: noteId,
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        content: internalNote,
        createdAt: Timestamp.now(),
      }

      // Append to existing notes array
      updates.internalNotes = FieldValue.arrayUnion(newNote)
      auditAction = 'add_internal_note'
      auditMetadata.notePreview =
        internalNote.substring(0, 50) + (internalNote.length > 50 ? '...' : '')

      historyEntries.push({
        action: 'internal_note_added',
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: `Note ID: ${noteId}`,
      })
    }

    // 7. Handle verification update
    if (verification) {
      const { field, value } = verification
      const verificationPath = `verification.${field}`
      const verifiedAtPath = `verification.${field.replace('Verified', 'VerifiedAt')}`
      const verifiedByPath = `verification.${field.replace('Verified', 'VerifiedBy')}`

      updates[verificationPath] = value
      if (value) {
        updates[verifiedAtPath] = FieldValue.serverTimestamp()
        updates[verifiedByPath] = context.agentId
      } else {
        updates[verifiedAtPath] = null
        updates[verifiedByPath] = null
      }

      auditAction = 'update_verification'
      auditMetadata.verificationField = field
      auditMetadata.verificationValue = value

      historyEntries.push({
        action: value ? `verification_${field}_completed` : `verification_${field}_revoked`,
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: null,
      })
    }

    // 8. Handle escalation
    if (escalation) {
      updates.status = 'escalated'
      updates.escalatedAt = FieldValue.serverTimestamp()
      updates.escalatedTo = 'legal_compliance'
      updates.escalationUrgency = escalation.urgency
      if (escalation.reason) {
        updates.escalationReason = escalation.reason
      }

      auditAction = 'escalate_ticket'
      auditMetadata.escalationUrgency = escalation.urgency
      auditMetadata.escalationReason = escalation.reason || null

      historyEntries.push({
        action: 'ticket_escalated',
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: `Urgency: ${escalation.urgency}${escalation.reason ? `, Reason: ${escalation.reason}` : ''}`,
      })
    }

    // 9. Handle assignment
    if (assignTo !== undefined) {
      updates.assignedTo = assignTo || null
      auditMetadata.assignedTo = assignTo || null

      historyEntries.push({
        action: assignTo ? 'ticket_assigned' : 'ticket_unassigned',
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: assignTo ? `Assigned to: ${assignTo}` : null,
      })
    }

    // 10. Add history entries
    if (historyEntries.length > 0) {
      for (const entry of historyEntries) {
        updates.history = FieldValue.arrayUnion(entry)
      }
    }

    // 11. Apply updates
    await ticketRef.update(updates)

    // 12. Log to admin audit (NOT family audit - CRITICAL)
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: auditAction,
      resourceType: 'safety_ticket',
      resourceId: ticketId,
      metadata: auditMetadata,
      ipAddress: context.ipAddress,
    })

    return {
      success: true,
      ticketId,
    }
  }
)
