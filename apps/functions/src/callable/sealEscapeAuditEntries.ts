import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import {
  propagateSealToRelatedCollections,
  generateIntegrityHash,
  SealReason,
  SEAL_REASONS,
} from '../utils/auditTrail'

/**
 * Input schema for sealing escape-related audit entries
 */
export const sealEscapeAuditEntriesInputSchema = z.object({
  /** Safety request ID that authorized the escape actions */
  safetyRequestId: z.string().min(1),
  /** Family ID containing the affected data */
  familyId: z.string().min(1),
  /** Reason for sealing (for compliance audit) */
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters for compliance documentation')
    .max(5000),
  /** Seal reason type */
  sealReason: z.enum(SEAL_REASONS as unknown as [string, ...string[]]).default('escape-action'),
  /** Optional specific entry IDs to seal (if not provided, auto-discovers all related) */
  entryIds: z.array(z.object({
    collection: z.string(),
    id: z.string(),
  })).optional(),
})

/**
 * Callable Cloud Function: sealEscapeAuditEntries
 *
 * CRITICAL: This function seals audit entries related to escape actions
 * to prevent abusers from discovering victim safety planning.
 *
 * Use cases:
 * 1. Retroactive sealing of entries from before this feature existed
 * 2. Manual sealing when auto-sealing fails
 * 3. Sealing additional entries discovered after initial escape action
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Safety request MUST exist
 * 3. Sealing is propagated atomically across all related collections
 * 4. Sealing operation is logged to sealed admin audit
 * 5. NO notifications are sent about sealing
 */
export const sealEscapeAuditEntries = onCall(
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

    // CRITICAL: Verify caller has safety-team role
    if (!callerClaims.isSafetyTeam) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required. This operation requires explicit safety-team role.'
      )
    }

    // Validate input
    const parseResult = sealEscapeAuditEntriesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const {
      safetyRequestId,
      familyId,
      reason,
      sealReason,
      entryIds,
    } = parseResult.data

    try {
      // Step 1: Verify safety request exists
      const safetyRequestRef = db.collection('safetyRequests').doc(safetyRequestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      // CRITICAL: Verify safety request is for the specified family
      if (safetyRequestData.familyId && safetyRequestData.familyId !== familyId) {
        throw new HttpsError(
          'invalid-argument',
          'Safety request does not match the specified family'
        )
      }

      // Step 2: Seal entries
      const sealTimestamp = Timestamp.now()
      let sealResult: { totalSealed: number; byCollection: Record<string, number> }

      if (entryIds && entryIds.length > 0) {
        // Manual sealing of specific entries
        const BATCH_LIMIT = 500
        const byCollection: Record<string, number> = {}
        let totalSealed = 0

        // Group by collection
        const entriesByCollection = new Map<string, string[]>()
        for (const entry of entryIds) {
          const current = entriesByCollection.get(entry.collection) || []
          current.push(entry.id)
          entriesByCollection.set(entry.collection, current)
        }

        // Process each collection
        for (const [collection, ids] of entriesByCollection) {
          byCollection[collection] = 0

          for (let i = 0; i < ids.length; i += BATCH_LIMIT) {
            const chunk = ids.slice(i, i + BATCH_LIMIT)
            const batch = db.batch()

            for (const entryId of chunk) {
              const ref = db.collection(collection).doc(entryId)
              batch.update(ref, {
                sealed: true,
                sealedAt: sealTimestamp,
                sealedBy: callerUid,
                sealReason: sealReason as SealReason,
                safetyRequestId,
              })
            }

            await batch.commit()
            byCollection[collection] += chunk.length
            totalSealed += chunk.length
          }
        }

        sealResult = { totalSealed, byCollection }
      } else {
        // Auto-discover and seal all related entries
        sealResult = await propagateSealToRelatedCollections(
          safetyRequestId,
          familyId,
          callerUid,
          sealReason as SealReason
        )
      }

      // Step 3: Log sealing operation to sealed admin audit
      const auditData = {
        action: 'escape-audit-entries-seal',
        resourceType: 'audit-entries',
        resourceId: safetyRequestId,
        performedBy: callerUid,
        familyId,
        safetyRequestId,
        reason,
        sealReason,
        totalSealed: sealResult.totalSealed,
        byCollection: sealResult.byCollection,
        timestamp: FieldValue.serverTimestamp(),
        sealed: true, // CRITICAL: This log is also sealed
      }

      const integrityHash = generateIntegrityHash({
        ...auditData,
        timestamp: sealTimestamp.toDate().toISOString(),
      })

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      // CRITICAL: Do NOT trigger any notifications
      // CRITICAL: Do NOT log to family audit trail

      return {
        success: true,
        sealed: true,
        totalSealed: sealResult.totalSealed,
        byCollection: sealResult.byCollection,
        sealedAt: sealTimestamp.toDate().toISOString(),
        safetyRequestId,
        familyId,
        // Do NOT include reason in response for security
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Escape audit entries sealing failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: safetyRequestId, familyId, reason, entryIds
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log full error details to sealed audit (compliance-only access)
      await db.collection('adminAuditLog').add({
        action: 'escape_audit_entries_seal_error',
        resourceType: 'audit-entries',
        resourceId: familyId,
        performedBy: callerUid,
        safetyRequestId,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to seal audit entries. Error ID: ${errorId}`)
    }
  }
)
