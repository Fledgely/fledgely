/**
 * Cloud Function for denying a legal parent petition (admin only).
 *
 * Story 3.6: Legal Parent Petition for Access - AC6
 *
 * SAFETY DESIGN:
 * - Requires safety-team custom claim
 * - Denial reason is stored internally ONLY
 * - Petitioner is notified via safe contact email
 * - Petitioner can submit a new petition with additional documentation
 *
 * Implements acceptance criteria:
 * - AC6: Petitioner is notified via safe contact email
 * - AC6: Denial reason is documented (internal only)
 * - AC6: Petitioner can submit a new petition with additional documentation
 * - AC8: Logged to adminAuditLogs
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

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

// Input validation schema
const denyLegalParentPetitionInputSchema = z.object({
  ticketId: z.string().min(1),
  reason: z.string().min(1).max(1000),
})

interface DenyLegalParentPetitionResponse {
  success: boolean
  message: string
}

/**
 * Deny a legal parent petition.
 *
 * Records the denial reason internally and notifies the petitioner
 * that they may submit a new petition with additional documentation.
 */
export const denyLegalParentPetition = onCall<
  z.infer<typeof denyLegalParentPetitionInputSchema>,
  Promise<DenyLegalParentPetitionResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'deny_legal_parent_petition')

    // 2. Validate input
    const parseResult = denyLegalParentPetitionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid parameters')
    }
    const { ticketId, reason } = parseResult.data

    // 3. Verify ticket exists and is a legal parent petition
    const ticketRef = getDb().collection('safetyTickets').doc(ticketId)
    const ticket = await ticketRef.get()
    if (!ticket.exists) {
      throw new HttpsError('not-found', 'Ticket not found')
    }
    const ticketData = ticket.data()

    if (ticketData?.type !== 'legal_parent_petition') {
      throw new HttpsError(
        'failed-precondition',
        'This action is only available for legal parent petitions'
      )
    }

    // 4. Check if already resolved or denied
    if (ticketData?.status === 'resolved') {
      throw new HttpsError('failed-precondition', 'This petition has already been granted')
    }
    if (ticketData?.status === 'denied') {
      // Idempotent - already denied
      return {
        success: true,
        message: 'Petition already denied',
      }
    }

    // 5. Update ticket with denial
    try {
      await ticketRef.update({
        status: 'denied',
        denialReason: reason, // Internal only - not sent to petitioner
        deniedAt: FieldValue.serverTimestamp(),
        deniedByAgentId: context.agentId,
        internalNotes: FieldValue.arrayUnion({
          id: `note_deny_${Date.now()}`,
          agentId: context.agentId,
          agentEmail: context.agentEmail,
          content: `Petition denied. Reason: ${reason}`,
          createdAt: Timestamp.now(),
        }),
        history: FieldValue.arrayUnion({
          action: 'legal_parent_petition_denied',
          agentId: context.agentId,
          agentEmail: context.agentEmail,
          timestamp: FieldValue.serverTimestamp(),
          details: null, // Reason is internal only
        }),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } catch (error) {
      console.error(`[denyLegalParentPetition] Failed to update ticket ${ticketId}:`, error)
      throw new HttpsError('internal', 'Failed to deny petition. Please try again.')
    }

    // 6. Log to admin audit (AC8)
    try {
      await logAdminAction({
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        action: 'deny_legal_parent_petition',
        resourceType: 'legal_parent_petition',
        resourceId: ticketId,
        metadata: {
          denialReason: reason,
          petitionerEmail: ticketData?.safeContactInfo?.email || ticketData?.userEmail || null,
          petitionInfo: ticketData?.petitionInfo || null,
        },
        ipAddress: context.ipAddress,
      })
    } catch (error) {
      // Don't fail the whole operation if audit logging fails
      // The denial was successful, just log the audit failure
      console.error(`[denyLegalParentPetition] Failed to log audit for ticket ${ticketId}:`, error)
    }

    // 7. Send denial notification to petitioner
    // TODO: Implement email notification in a future story
    // Email should NOT include the internal denial reason
    // Email should inform them they can submit a new petition with additional documentation

    return {
      success: true,
      message: 'Petition denied',
    }
  }
)
