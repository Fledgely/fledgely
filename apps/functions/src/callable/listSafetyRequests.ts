import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Query, DocumentData } from 'firebase-admin/firestore'
import { z } from 'zod'

/**
 * Input schema for listing safety requests
 */
const listSafetyRequestsInputSchema = z.object({
  /** Filter by status */
  status: z.enum(['pending', 'in-progress', 'resolved', 'all']).optional(),
  /** Filter by escalation */
  escalated: z.boolean().optional(),
  /** Number of results to return */
  limit: z.number().int().min(1).max(100).default(20),
  /** Pagination cursor (last document ID) */
  startAfter: z.string().optional(),
  /** Sort order */
  sortBy: z
    .enum(['submittedAt', 'updatedAt', 'status'])
    .default('submittedAt'),
  /** Sort direction */
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
})

export type ListSafetyRequestsInput = z.infer<
  typeof listSafetyRequestsInputSchema
>

/**
 * Callable Cloud Function: listSafetyRequests
 *
 * CRITICAL: This function exposes safety request data.
 * Only safety-team members can access this data.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. All access is logged to adminAuditLog
 * 3. Documents are NOT exposed through any family query
 */
export const listSafetyRequests = onCall(
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
    const parseResult = listSafetyRequestsInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const {
      status,
      escalated,
      limit,
      startAfter,
      sortBy,
      sortDirection,
    } = parseResult.data

    try {
      // Build query
      let query: Query<DocumentData> = db.collection('safetyRequests')

      // Apply status filter
      if (status && status !== 'all') {
        query = query.where('status', '==', status)
      }

      // Apply escalation filter
      if (escalated !== undefined) {
        query = query.where('escalation.isEscalated', '==', escalated)
      }

      // Apply sorting
      query = query.orderBy(sortBy, sortDirection)

      // Apply pagination
      if (startAfter) {
        const startDoc = await db
          .collection('safetyRequests')
          .doc(startAfter)
          .get()
        if (startDoc.exists) {
          query = query.startAfter(startDoc)
        }
      }

      // Apply limit
      query = query.limit(limit)

      // Execute query
      const snapshot = await query.get()

      // Transform results (exclude sensitive data not needed for list view)
      const requests = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          // Summary fields for list view
          submittedAt: data.submittedAt,
          status: data.status,
          source: data.source,
          hasEmail: !!data.safeEmail,
          hasPhone: !!data.safePhone,
          hasDocuments: (data.documents?.length || 0) > 0,
          documentCount: data.documents?.length || 0,
          assignedTo: data.assignedTo || null,
          isEscalated: data.escalation?.isEscalated || false,
          // Truncated message for preview
          messagePreview:
            data.message?.substring(0, 100) +
            (data.message?.length > 100 ? '...' : ''),
        }
      })

      // Log access to admin audit
      await db.collection('adminAuditLog').add({
        action: 'safety_requests_listed',
        resourceType: 'safetyRequest',
        performedBy: callerUid,
        metadata: {
          filters: { status, escalated },
          resultCount: requests.length,
          pagination: { limit, startAfter },
        },
        timestamp: new Date(),
      })

      return {
        success: true,
        requests,
        hasMore: requests.length === limit,
        nextCursor:
          requests.length > 0 ? requests[requests.length - 1].id : null,
      }
    } catch (error) {
      console.error('Error listing safety requests:', error)

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', 'Failed to list safety requests')
    }
  }
)
