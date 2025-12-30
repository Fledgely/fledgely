/**
 * Cloud Function for getting sealed audit entries (admin only).
 *
 * Story 0.5.8: Audit Trail Sealing
 *
 * CRITICAL SECURITY DESIGN:
 * - Requires safety-team custom claim with legal_compliance role
 * - All access logged to admin audit AND to entry access log
 * - Returns sealed entries for compliance/legal purposes
 * - Access requires documented authorization reason
 *
 * Implements acceptance criteria:
 * - AC3: Legal/compliance access only
 * - AC3: Access limited to authorized roles only
 * - AC3: Access creates audit log entry
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

// Input validation schema
const getSealedAuditEntriesInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  authorizationReason: z.string().min(1).max(1000),
})

// Sealed entry type for response
interface SealedAuditEntryResponse {
  id: string
  familyId: string
  originalEntry: {
    viewerUid: string
    childId: string | null
    dataType: string
    viewedAt: string | null
    sessionId: string | null
    deviceId: string | null
    metadata: Record<string, unknown> | null
  }
  sealedAt: string | null
  sealedByTicketId: string
  sealedByAgentId: string
  sealReason: string
  legalHold: boolean
}

interface GetSealedAuditEntriesResponse {
  entries: SealedAuditEntryResponse[]
  totalCount: number
  accessLoggedAt: string
}

/**
 * Get sealed audit entries for a family.
 *
 * CRITICAL: This function requires legal_compliance role verification.
 * All access is logged to both admin audit and the entry's access log.
 *
 * @param ticketId - The safety ticket ID requesting access
 * @param familyId - The family ID to retrieve sealed entries for
 * @param authorizationReason - Documented reason for access
 */
export const getSealedAuditEntries = onCall<
  z.infer<typeof getSealedAuditEntriesInputSchema>,
  Promise<GetSealedAuditEntriesResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'access_sealed_audit')

    // 2. Validate input
    const parseResult = getSealedAuditEntriesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid parameters: ticketId, familyId, and authorizationReason required'
      )
    }
    const { ticketId, familyId, authorizationReason } = parseResult.data

    // 3. Verify ticket exists
    const ticketRef = db.collection('safetyTickets').doc(ticketId)
    const ticketSnap = await ticketRef.get()
    if (!ticketSnap.exists) {
      throw new HttpsError('not-found', 'Safety ticket not found')
    }

    // 4. Query sealed entries for this family
    const query = db.collection('sealedAuditEntries').where('familyId', '==', familyId)
    const snapshot = await query.get()

    const now = Timestamp.now()
    const entries: SealedAuditEntryResponse[] = []

    if (!snapshot.empty) {
      // 5. Log access to each entry's access log
      const batch = db.batch()

      for (const doc of snapshot.docs) {
        const data = doc.data()

        // Add access log entry
        batch.update(doc.ref, {
          accessLog: FieldValue.arrayUnion({
            accessedAt: now,
            accessedByAgentId: context.agentId,
            accessedByAgentEmail: context.agentEmail,
            accessReason: authorizationReason,
          }),
        })

        // Convert to response format
        entries.push({
          id: doc.id,
          familyId: data.familyId,
          originalEntry: {
            viewerUid: data.originalEntry?.viewerUid || '',
            childId: data.originalEntry?.childId || null,
            dataType: data.originalEntry?.dataType || '',
            viewedAt:
              data.originalEntry?.viewedAt instanceof Timestamp
                ? data.originalEntry.viewedAt.toDate().toISOString()
                : null,
            sessionId: data.originalEntry?.sessionId || null,
            deviceId: data.originalEntry?.deviceId || null,
            metadata: data.originalEntry?.metadata || null,
          },
          sealedAt:
            data.sealedAt instanceof Timestamp ? data.sealedAt.toDate().toISOString() : null,
          sealedByTicketId: data.sealedByTicketId || '',
          sealedByAgentId: data.sealedByAgentId || '',
          sealReason: data.sealReason || 'escape_action',
          legalHold: data.legalHold ?? true,
        })
      }

      await batch.commit()
    }

    // 6. Log to admin audit
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'access_sealed_audit',
      resourceType: 'sealed_audit',
      resourceId: familyId,
      metadata: {
        ticketId,
        familyId,
        authorizationReason,
        entriesAccessed: entries.length,
      },
      ipAddress: context.ipAddress,
    })

    return {
      entries,
      totalCount: entries.length,
      accessLoggedAt: now.toDate().toISOString(),
    }
  }
)
