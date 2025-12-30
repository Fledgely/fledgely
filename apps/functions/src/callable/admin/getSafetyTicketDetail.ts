/**
 * Cloud Function for getting safety ticket details (admin only).
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * CRITICAL SECURITY DESIGN:
 * - Requires safety-team custom claim
 * - Logs all access to admin audit
 * - Returns full ticket details including internal notes
 *
 * Implements acceptance criteria:
 * - AC3: View submitted documentation inline
 * - AC4: Identity verification checklist
 * - AC6: Internal notes system
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

// Input validation schema
const getSafetyTicketDetailInputSchema = z.object({
  ticketId: z.string().min(1),
})

// Internal note structure
interface InternalNote {
  id: string
  agentId: string
  agentEmail: string | null
  content: string
  createdAt: string
}

// Identity verification status
interface VerificationStatus {
  phoneVerified: boolean
  phoneVerifiedAt: string | null
  phoneVerifiedBy: string | null
  idDocumentVerified: boolean
  idDocumentVerifiedAt: string | null
  idDocumentVerifiedBy: string | null
  accountMatchVerified: boolean
  accountMatchVerifiedAt: string | null
  accountMatchVerifiedBy: string | null
  securityQuestionsVerified: boolean
  securityQuestionsVerifiedAt: string | null
  securityQuestionsVerifiedBy: string | null
}

// Document metadata
interface DocumentMetadata {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  uploadedAt: string | null
}

// Ticket history entry
interface TicketHistoryEntry {
  action: string
  agentId: string
  agentEmail: string | null
  timestamp: string | null
  details: string | null
}

// Full ticket detail
interface SafetyTicketDetail {
  id: string
  message: string
  urgency: 'when_you_can' | 'soon' | 'urgent'
  status: string
  createdAt: string | null
  userEmail: string | null
  userId: string | null
  safeContactInfo: {
    phone: string | null
    email: string | null
    preferredMethod: string | null
    safeTimeToContact: string | null
  } | null
  documents: DocumentMetadata[]
  internalNotes: InternalNote[]
  verification: VerificationStatus
  history: TicketHistoryEntry[]
  assignedTo: string | null
  escalatedAt: string | null
  escalatedTo: string | null
  resolvedAt: string | null
  resolvedBy: string | null
}

interface GetSafetyTicketDetailResponse {
  ticket: SafetyTicketDetail
}

/**
 * Get full details of a safety ticket.
 *
 * Requires safety-team role.
 * Returns all ticket data including internal notes (never shown to family).
 */
export const getSafetyTicketDetail = onCall<
  z.infer<typeof getSafetyTicketDetailInputSchema>,
  Promise<GetSafetyTicketDetailResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'view_ticket_detail')

    // 2. Validate input
    const parseResult = getSafetyTicketDetailInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Ticket ID is required')
    }
    const { ticketId } = parseResult.data

    // 3. Get ticket
    const ticketDoc = await db.collection('safetyTickets').doc(ticketId).get()
    if (!ticketDoc.exists) {
      throw new HttpsError('not-found', 'Ticket not found')
    }

    const data = ticketDoc.data()!

    // 4. Get documents for this ticket
    const docsSnapshot = await db
      .collection('safetyDocuments')
      .where('ticketId', '==', ticketId)
      .orderBy('uploadedAt', 'desc')
      .get()

    const documents: DocumentMetadata[] = docsSnapshot.docs.map((doc) => {
      const docData = doc.data()
      return {
        id: doc.id,
        filename: docData.originalFilename || docData.filename || 'Unknown',
        mimeType: docData.mimeType || 'application/octet-stream',
        sizeBytes: docData.sizeBytes || 0,
        uploadedAt:
          docData.uploadedAt instanceof Timestamp
            ? docData.uploadedAt.toDate().toISOString()
            : null,
      }
    })

    // 5. Parse internal notes
    const internalNotes: InternalNote[] = (data.internalNotes || []).map(
      (note: {
        id: string
        agentId: string
        agentEmail: string | null
        content: string
        createdAt: Timestamp | { toDate: () => Date }
      }) => ({
        id: note.id,
        agentId: note.agentId,
        agentEmail: note.agentEmail,
        content: note.content,
        createdAt:
          note.createdAt instanceof Timestamp ? note.createdAt.toDate().toISOString() : null,
      })
    )

    // 6. Parse verification status
    const verification: VerificationStatus = {
      phoneVerified: data.verification?.phoneVerified || false,
      phoneVerifiedAt: data.verification?.phoneVerifiedAt?.toDate?.()?.toISOString() || null,
      phoneVerifiedBy: data.verification?.phoneVerifiedBy || null,
      idDocumentVerified: data.verification?.idDocumentVerified || false,
      idDocumentVerifiedAt:
        data.verification?.idDocumentVerifiedAt?.toDate?.()?.toISOString() || null,
      idDocumentVerifiedBy: data.verification?.idDocumentVerifiedBy || null,
      accountMatchVerified: data.verification?.accountMatchVerified || false,
      accountMatchVerifiedAt:
        data.verification?.accountMatchVerifiedAt?.toDate?.()?.toISOString() || null,
      accountMatchVerifiedBy: data.verification?.accountMatchVerifiedBy || null,
      securityQuestionsVerified: data.verification?.securityQuestionsVerified || false,
      securityQuestionsVerifiedAt:
        data.verification?.securityQuestionsVerifiedAt?.toDate?.()?.toISOString() || null,
      securityQuestionsVerifiedBy: data.verification?.securityQuestionsVerifiedBy || null,
    }

    // 7. Parse history
    const history: TicketHistoryEntry[] = (data.history || []).map(
      (entry: {
        action: string
        agentId: string
        agentEmail: string | null
        timestamp: Timestamp | { toDate: () => Date }
        details: string | null
      }) => ({
        action: entry.action,
        agentId: entry.agentId,
        agentEmail: entry.agentEmail,
        timestamp:
          entry.timestamp instanceof Timestamp ? entry.timestamp.toDate().toISOString() : null,
        details: entry.details,
      })
    )

    // 8. Build ticket detail
    const ticket: SafetyTicketDetail = {
      id: ticketDoc.id,
      message: data.message || '',
      urgency: data.urgency || 'when_you_can',
      status: data.status || 'pending',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
      userEmail: data.userEmail || null,
      userId: data.userId || null,
      safeContactInfo: data.safeContactInfo || null,
      documents,
      internalNotes,
      verification,
      history,
      assignedTo: data.assignedTo || null,
      escalatedAt:
        data.escalatedAt instanceof Timestamp ? data.escalatedAt.toDate().toISOString() : null,
      escalatedTo: data.escalatedTo || null,
      resolvedAt:
        data.resolvedAt instanceof Timestamp ? data.resolvedAt.toDate().toISOString() : null,
      resolvedBy: data.resolvedBy || null,
    }

    // 9. Log access
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'view_ticket_detail',
      resourceType: 'safety_ticket',
      resourceId: ticketId,
      ipAddress: context.ipAddress,
    })

    return { ticket }
  }
)
