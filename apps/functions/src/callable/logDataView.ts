import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { logDataViewInputSchema, type LogDataViewInput, AUDIT_FIELD_LIMITS } from '@fledgely/contracts'

/**
 * Rate limiting constants for audit log operations
 * Prevents abuse and storage bloat from malicious actors
 */
const RATE_LIMIT = {
  /** Maximum audit entries per guardian per hour */
  MAX_ENTRIES_PER_HOUR: 500,
  /** Time window for rate limiting (1 hour in milliseconds) */
  WINDOW_MS: 60 * 60 * 1000,
} as const

/**
 * Callable Cloud Function: logDataView
 *
 * Story 3A.1: Data Symmetry Enforcement - Viewing Audit Trail
 *
 * Records when a guardian views child data for symmetry enforcement.
 * Both co-parents must see identical data - this audit trail ensures
 * viewing patterns are documented for symmetry verification.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Audit entries are stored in child-scoped subcollection
 * 4. Audit entries are immutable (no updates/deletes)
 * 5. All guardians can read the audit trail (symmetry)
 * 6. Rate limited to prevent abuse (500 entries/guardian/hour)
 */
export const logDataView = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = logDataViewInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: LogDataViewInput = parseResult.data
    const { childId, dataType, resourceId, itemCount, sessionId, clientInfo } = input

    const db = getFirestore()

    try {
      // Verify caller is a guardian of the child
      const childDoc = await db.collection('children').doc(childId).get()

      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found')
      }

      const childData = childDoc.data()
      if (!childData) {
        throw new HttpsError('not-found', 'Child data not found')
      }

      // Check if caller is a guardian
      const guardians = childData.guardians || []
      const isGuardian = guardians.some(
        (g: { uid: string }) => g.uid === callerUid
      )

      if (!isGuardian) {
        throw new HttpsError(
          'permission-denied',
          'You must be a guardian to log views for this child'
        )
      }

      // Rate limit check: count entries from this guardian in the last hour
      const oneHourAgo = new Date(Date.now() - RATE_LIMIT.WINDOW_MS)
      const recentEntriesSnapshot = await db
        .collection('children')
        .doc(childId)
        .collection('viewAuditLog')
        .where('viewedBy', '==', callerUid)
        .where('viewedAt', '>=', oneHourAgo)
        .count()
        .get()

      const recentCount = recentEntriesSnapshot.data().count
      if (recentCount >= RATE_LIMIT.MAX_ENTRIES_PER_HOUR) {
        throw new HttpsError(
          'resource-exhausted',
          'Rate limit exceeded. Please try again later.'
        )
      }

      // Generate audit entry ID
      const auditId = db.collection('children').doc().id

      // Create the audit entry
      const auditEntry = {
        id: auditId,
        childId,
        viewedBy: callerUid,
        dataType,
        resourceId: resourceId ?? null,
        viewedAt: FieldValue.serverTimestamp(),
        itemCount: itemCount ?? null,
        sessionId: sessionId ?? null,
        clientInfo: clientInfo ?? null,
      }

      // Store in child's viewAuditLog subcollection
      await db
        .collection('children')
        .doc(childId)
        .collection('viewAuditLog')
        .doc(auditId)
        .set(auditEntry)

      return {
        success: true,
        auditId,
        childId,
        dataType,
        viewedAt: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to log data view:', {
        childId,
        dataType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to log data view')
    }
  }
)

/**
 * Input schema for getViewAuditLog pagination
 * Separate from logDataViewInputSchema for clarity
 */
const getViewAuditLogInputSchema = z.object({
  /** Child ID to get audit log for */
  childId: z.string().min(1).max(AUDIT_FIELD_LIMITS.childId),
  /** Maximum entries to return (1-100, default 100) */
  limit: z.number().int().min(1).max(100).optional().default(100),
  /** Cursor: audit entry ID to start after (for pagination) */
  startAfter: z.string().max(AUDIT_FIELD_LIMITS.id).optional(),
})

/**
 * Callable Cloud Function: getViewAuditLog
 *
 * Story 3A.1: Data Symmetry Enforcement - View Audit Trail
 *
 * Retrieves the viewing audit log for a child. Both co-parents can see
 * the full audit trail (symmetry enforcement - identical data for both).
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. All guardians see identical audit trail (symmetry)
 */
export const getViewAuditLog = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid

    // Validate input with dedicated schema
    const parseResult = getViewAuditLogInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const { childId, limit, startAfter } = parseResult.data

    const db = getFirestore()

    try {
      // Verify caller is a guardian of the child
      const childDoc = await db.collection('children').doc(childId).get()

      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found')
      }

      const childData = childDoc.data()
      if (!childData) {
        throw new HttpsError('not-found', 'Child data not found')
      }

      // Check if caller is a guardian
      const guardians = childData.guardians || []
      const isGuardian = guardians.some(
        (g: { uid: string }) => g.uid === callerUid
      )

      if (!isGuardian) {
        throw new HttpsError(
          'permission-denied',
          'You must be a guardian to view audit logs for this child'
        )
      }

      // Build query
      let query = db
        .collection('children')
        .doc(childId)
        .collection('viewAuditLog')
        .orderBy('viewedAt', 'desc')
        .limit(limit ?? 100)

      // Add pagination cursor if provided
      if (startAfter) {
        const startDoc = await db
          .collection('children')
          .doc(childId)
          .collection('viewAuditLog')
          .doc(startAfter)
          .get()

        if (startDoc.exists) {
          query = query.startAfter(startDoc)
        }
      }

      const snapshot = await query.get()

      const entries = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          childId: data.childId,
          viewedBy: data.viewedBy,
          dataType: data.dataType,
          resourceId: data.resourceId,
          viewedAt: (data.viewedAt as Timestamp)?.toDate?.()?.toISOString() || null,
          itemCount: data.itemCount,
          sessionId: data.sessionId,
          clientInfo: data.clientInfo,
        }
      })

      return {
        success: true,
        entries,
        count: entries.length,
        hasMore: entries.length === (limit ?? 100),
        lastEntryId: entries.length > 0 ? entries[entries.length - 1].id : null,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to get view audit log:', {
        childId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to retrieve view audit log')
    }
  }
)
