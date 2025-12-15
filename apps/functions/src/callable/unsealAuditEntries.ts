import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import { generateIntegrityHash, FIRESTORE_BATCH_LIMIT } from '../utils/auditTrail'

/**
 * Input schema for unsealing audit entries
 */
export const unsealAuditEntriesInputSchema = z.object({
  /** Entry IDs to unseal with their collection */
  entries: z.array(z.object({
    collection: z.string().min(1),
    id: z.string().min(1),
  })).min(1).max(100), // Max 100 entries per request for safety
  /** Court order reference number (required) */
  courtOrderReference: z.string().min(5, 'Court order reference required'),
  /** Detailed legal justification (min 100 chars for compliance) */
  legalJustification: z
    .string()
    .min(100, 'Legal justification must be at least 100 characters for compliance documentation')
    .max(10000),
  /** Case number if applicable */
  caseNumber: z.string().optional(),
  /** Requesting attorney/agency */
  requestingParty: z.string().optional(),
})

/**
 * Callable Cloud Function: unsealAuditEntries
 *
 * CRITICAL: This function unseals audit entries that were previously sealed
 * to protect abuse victims. This is a LEGAL TEAM ONLY operation.
 *
 * IMPORTANT: Unsealing does NOT make entries visible to family members.
 * It only changes the sealed flag for compliance/legal access purposes.
 * The entries remain hidden from family queries regardless of seal status
 * because they were never written to familyAuditLog.
 *
 * Security invariants:
 * 1. Caller MUST have isLegalTeam role (compliance alone NOT sufficient)
 * 2. Court order reference is REQUIRED
 * 3. Detailed justification (100+ chars) is REQUIRED
 * 4. All unseal operations are logged with full chain of custody
 * 5. Unsealing does NOT expose entries to family members
 * 6. Rate limited: max 100 entries per request
 */
export const unsealAuditEntries = onCall(
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

    // CRITICAL: Verify caller has LEGAL TEAM role
    // Compliance team alone is NOT sufficient for unseal operations
    // This requires explicit legal authorization
    if (!callerClaims.isLegalTeam) {
      throw new HttpsError(
        'permission-denied',
        'Legal team access required. Only legal team members can unseal audit entries. Compliance team access is not sufficient for this operation.'
      )
    }

    // Validate input
    const parseResult = unsealAuditEntriesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const {
      entries,
      courtOrderReference,
      legalJustification,
      caseNumber,
      requestingParty,
    } = parseResult.data

    try {
      const unsealTimestamp = Timestamp.now()

      // Group entries by collection
      const entriesByCollection = new Map<string, string[]>()
      for (const entry of entries) {
        const current = entriesByCollection.get(entry.collection) || []
        current.push(entry.id)
        entriesByCollection.set(entry.collection, current)
      }

      // Verify all entries exist and are sealed before unsealing
      const entriesToUnseal: { collection: string; id: string; familyId?: string }[] = []
      const notFound: string[] = []
      const notSealed: string[] = []

      for (const [collection, ids] of entriesByCollection) {
        for (const id of ids) {
          const docRef = db.collection(collection).doc(id)
          const doc = await docRef.get()

          if (!doc.exists) {
            notFound.push(`${collection}/${id}`)
            continue
          }

          const data = doc.data()!
          if (data.sealed !== true) {
            notSealed.push(`${collection}/${id}`)
            continue
          }

          entriesToUnseal.push({
            collection,
            id,
            familyId: data.familyId,
          })
        }
      }

      // Report any entries that couldn't be unsealed
      if (notFound.length > 0 || notSealed.length > 0) {
        throw new HttpsError(
          'failed-precondition',
          `Some entries cannot be unsealed. Not found: ${notFound.length}, Not sealed: ${notSealed.length}`
        )
      }

      // Perform the unseal operation
      let unsealed = 0
      const unsealedByCollection: Record<string, number> = {}

      for (const [collection, ids] of entriesByCollection) {
        unsealedByCollection[collection] = 0

        for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
          const chunk = ids.slice(i, i + FIRESTORE_BATCH_LIMIT)
          const batch = db.batch()

          for (const id of chunk) {
            const ref = db.collection(collection).doc(id)
            batch.update(ref, {
              // Change sealed status
              sealed: false,
              // Add unseal metadata
              unsealedAt: unsealTimestamp,
              unsealedBy: callerUid,
              courtOrderReference,
              legalJustification,
              caseNumber: caseNumber || null,
              requestingParty: requestingParty || null,
              // Original seal metadata is preserved for audit trail
            })
          }

          await batch.commit()
          unsealedByCollection[collection] += chunk.length
          unsealed += chunk.length
        }
      }

      // Log the unseal operation to sealed admin audit with full chain of custody
      const auditData = {
        action: 'audit-entries-unseal',
        resourceType: 'audit-entries',
        resourceId: entries.map(e => `${e.collection}/${e.id}`).join(',').slice(0, 500),
        performedBy: callerUid,
        entryCount: entries.length,
        unsealed,
        unsealedByCollection,
        courtOrderReference,
        legalJustification,
        caseNumber: caseNumber || null,
        requestingParty: requestingParty || null,
        // Capture affected families for audit
        affectedFamilyIds: [...new Set(entriesToUnseal.map(e => e.familyId).filter(Boolean))],
        timestamp: FieldValue.serverTimestamp(),
        sealed: true, // CRITICAL: The unseal log itself remains sealed
      }

      const integrityHash = generateIntegrityHash({
        ...auditData,
        timestamp: unsealTimestamp.toDate().toISOString(),
      })

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      // CRITICAL: Do NOT notify anyone about unseal operations
      // CRITICAL: Unsealed entries still NOT visible to family members

      return {
        success: true,
        unsealed,
        unsealedByCollection,
        unsealedAt: unsealTimestamp.toDate().toISOString(),
        courtOrderReference,
        // Note: Entries remain hidden from family queries
        // Unsealing only affects compliance/legal access categorization
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Audit entries unseal failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: entries, courtOrderReference, legalJustification
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log full error details to sealed audit (legal-only access)
      await db.collection('adminAuditLog').add({
        action: 'audit_entries_unseal_error',
        resourceType: 'audit-entries',
        resourceId: 'unseal-operation',
        performedBy: callerUid,
        entryCount: entries.length,
        courtOrderReference,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to unseal audit entries. Error ID: ${errorId}`)
    }
  }
)
