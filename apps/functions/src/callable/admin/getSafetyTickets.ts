/**
 * Cloud Function for getting safety tickets (admin only).
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * CRITICAL SECURITY DESIGN:
 * - Requires safety-team custom claim
 * - Logs all access to admin audit
 * - Returns paginated list with filtering
 *
 * Implements acceptance criteria:
 * - AC2: Prioritized list of pending safety requests
 * - AC8: Role-based access control
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

// Input validation schema
const getSafetyTicketsInputSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'resolved', 'escalated', 'all']).default('all'),
  limit: z.number().int().min(1).max(100).default(20),
  startAfter: z.string().nullable().optional(),
})

// Ticket summary for list view
interface SafetyTicketSummary {
  id: string
  messagePreview: string
  urgency: 'when_you_can' | 'soon' | 'urgent'
  status: string
  createdAt: string | null
  userEmail: string | null
  hasDocuments: boolean
  documentCount: number
}

interface GetSafetyTicketsResponse {
  tickets: SafetyTicketSummary[]
  hasMore: boolean
  nextCursor: string | null
}

/**
 * Get urgency sort order (urgent first, then soon, then when_you_can).
 */
function getUrgencySortValue(urgency: string): number {
  switch (urgency) {
    case 'urgent':
      return 0
    case 'soon':
      return 1
    case 'when_you_can':
      return 2
    default:
      return 3
  }
}

/**
 * Get a list of safety tickets.
 *
 * Requires safety-team role.
 * Returns tickets sorted by urgency then creation time.
 */
export const getSafetyTickets = onCall<
  z.infer<typeof getSafetyTicketsInputSchema>,
  Promise<GetSafetyTicketsResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'view_ticket_list')

    // 2. Validate input
    const parseResult = getSafetyTicketsInputSchema.safeParse(request.data || {})
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid request parameters')
    }
    const { status, limit, startAfter } = parseResult.data

    // 3. Build query
    let query = db
      .collection('safetyTickets')
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)

    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.where('status', '==', status)
    }

    // Pagination cursor
    if (startAfter) {
      const cursorDoc = await db.collection('safetyTickets').doc(startAfter).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    // 4. Execute query
    const snapshot = await query.get()

    // 5. Get document counts for each ticket
    const tickets: SafetyTicketSummary[] = []

    for (let i = 0; i < Math.min(snapshot.docs.length, limit); i++) {
      const doc = snapshot.docs[i]
      const data = doc.data()

      // Get document count for this ticket
      const docsSnapshot = await db
        .collection('safetyDocuments')
        .where('ticketId', '==', doc.id)
        .count()
        .get()
      const documentCount = docsSnapshot.data().count

      // Create preview (first 100 chars of message)
      const messagePreview =
        data.message?.length > 100 ? data.message.substring(0, 100) + '...' : data.message || ''

      tickets.push({
        id: doc.id,
        messagePreview,
        urgency: data.urgency || 'when_you_can',
        status: data.status || 'pending',
        createdAt:
          data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null,
        userEmail: data.userEmail || null,
        hasDocuments: documentCount > 0,
        documentCount,
      })
    }

    // 6. Sort by urgency then creation time
    tickets.sort((a, b) => {
      const urgencyDiff = getUrgencySortValue(a.urgency) - getUrgencySortValue(b.urgency)
      if (urgencyDiff !== 0) return urgencyDiff
      // Same urgency, sort by creation time (newest first)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    })

    // 7. Log access
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'view_ticket_list',
      resourceType: 'safety_dashboard',
      metadata: { status, limit, resultCount: tickets.length },
      ipAddress: context.ipAddress,
    })

    // 8. Return response
    const hasMore = snapshot.docs.length > limit
    const nextCursor = hasMore ? snapshot.docs[limit - 1]?.id || null : null

    return {
      tickets,
      hasMore,
      nextCursor,
    }
  }
)
