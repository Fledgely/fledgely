import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Query, DocumentData } from 'firebase-admin/firestore'
import { z } from 'zod'

/**
 * Input schema for listing legal petitions
 */
const listLegalPetitionsInputSchema = z.object({
  status: z
    .enum(['pending', 'under-review', 'verified', 'denied', 'all'])
    .optional()
    .default('all'),
  limit: z.number().min(1).max(100).optional().default(20),
  startAfter: z.string().optional(),
  sortBy: z.enum(['submittedAt', 'updatedAt']).optional().default('submittedAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('asc'),
})

/**
 * Callable Cloud Function: listLegalPetitions
 *
 * Story 3.6: Legal Parent Petition for Access - Task 9
 *
 * Lists legal petitions for support team review with filtering and pagination.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * 1. ONLY callable by safety-team role
 * 2. Returns only summary data (not full petition details)
 * 3. Supports pagination to handle large result sets
 */
export const listLegalPetitions = onCall(
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
        'You do not have permission to view legal petitions'
      )
    }

    const adminRoleData = adminRoleDoc.data()
    const roles = adminRoleData?.roles || []
    if (!roles.includes('safety-team') && !roles.includes('admin')) {
      throw new HttpsError(
        'permission-denied',
        'Only safety team members can view legal petitions'
      )
    }

    // Validate input
    const parseResult = listLegalPetitionsInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input data',
        parseResult.error.flatten()
      )
    }

    const { status, limit, startAfter, sortBy, sortDirection } = parseResult.data

    try {
      // Build query
      let query: Query<DocumentData> = db.collection('legalPetitions')

      // Status filter
      if (status && status !== 'all') {
        query = query.where('status', '==', status)
      }

      // Sorting
      query = query.orderBy(sortBy, sortDirection)

      // Pagination
      if (startAfter) {
        const startDoc = await db.doc(`legalPetitions/${startAfter}`).get()
        if (startDoc.exists) {
          query = query.startAfter(startDoc)
        }
      }

      // Limit (+1 to check if there are more)
      query = query.limit(limit + 1)

      const snapshot = await query.get()

      // Check if there are more results
      const hasMore = snapshot.docs.length > limit
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs

      // Map to summary objects (exclude sensitive data)
      const petitions = docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          referenceNumber: data.referenceNumber,
          petitionerName: data.petitionerName,
          petitionerEmail: data.petitionerEmail,
          childName: data.childName,
          status: data.status,
          claimedRelationship: data.claimedRelationship,
          submittedAt: data.submittedAt,
          updatedAt: data.updatedAt,
          hasDocuments: (data.documents || []).length > 0,
          documentCount: (data.documents || []).length,
          assignedTo: data.assignedTo || null,
        }
      })

      const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null

      return {
        success: true,
        petitions,
        hasMore,
        nextCursor,
      }
    } catch (error) {
      console.error('Error listing legal petitions:', error)
      throw new HttpsError(
        'internal',
        'Failed to list legal petitions. Please try again.'
      )
    }
  }
)
