import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import { querySealedAuditEntries, verifyIntegrityHash } from '../utils/auditTrail'

/**
 * Input schema for getting sealed audit entries
 */
export const getSealedAuditEntriesInputSchema = z.object({
  /** Family ID to query sealed entries for */
  familyId: z.string().min(1),
  /** Date range to filter entries */
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  /** Filter by specific action types */
  actionTypes: z.array(z.string()).optional(),
  /** Maximum number of entries to return */
  limit: z.number().min(1).max(500).default(100),
  /** Justification for accessing sealed entries (min 50 chars for compliance) */
  justification: z.string().min(50, 'Justification must be at least 50 characters for compliance documentation'),
  /** Legal reference (court order, subpoena, etc.) if applicable */
  legalReference: z.string().optional(),
})

/**
 * Callable Cloud Function: getSealedAuditEntries
 *
 * CRITICAL: This function provides access to sealed audit entries
 * that are hidden from family members to protect abuse victims.
 *
 * Security invariants:
 * 1. Caller MUST have isComplianceTeam OR isLegalTeam role
 * 2. All access is logged to complianceAccessLog
 * 3. Access requires documented justification (min 50 chars)
 * 4. Returns sealed entries but does NOT unseal them
 * 5. Family members can NEVER access this function
 */
export const getSealedAuditEntries = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid
    const callerClaims = request.auth.token

    // CRITICAL: Verify caller has compliance or legal team role
    // Regular admin, safety team, or family members cannot access sealed entries
    const isComplianceTeam = callerClaims.isComplianceTeam === true
    const isLegalTeam = callerClaims.isLegalTeam === true

    if (!isComplianceTeam && !isLegalTeam) {
      throw new HttpsError(
        'permission-denied',
        'Compliance or Legal team access required. This operation requires explicit compliance-team or legal-team role.'
      )
    }

    // Validate input
    const parseResult = getSealedAuditEntriesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const {
      familyId,
      dateRange,
      actionTypes,
      limit,
      justification,
      legalReference,
    } = parseResult.data

    try {
      // Convert date range strings to Timestamps if provided
      const timestampDateRange = dateRange ? {
        start: Timestamp.fromDate(new Date(dateRange.start)),
        end: Timestamp.fromDate(new Date(dateRange.end)),
      } : undefined

      // Query sealed entries (this also logs access)
      const entries = await querySealedAuditEntries(
        familyId,
        callerUid,
        justification,
        {
          dateRange: timestampDateRange,
          actionTypes,
          limit,
          legalReference,
        }
      )

      // Verify integrity hashes on returned entries
      const verifiedEntries = entries.map(entry => {
        // Perform actual hash verification, not just length check
        const integrityVerified = verifyIntegrityHash(entry, entry.integrityHash)
        return {
          ...entry,
          integrityVerified,
          // Convert timestamps to ISO strings for response
          timestamp: entry.timestamp?.toDate?.()?.toISOString() || null,
          sealedAt: entry.sealedAt?.toDate?.()?.toISOString() || null,
        }
      })

      return {
        success: true,
        entries: verifiedEntries,
        count: verifiedEntries.length,
        accessedBy: callerUid,
        accessedAt: new Date().toISOString(),
        // Note: Access has been logged to complianceAccessLog
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Sealed audit entries access failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: familyId, justification, entries
      })

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', `Failed to retrieve sealed entries. Error ID: ${errorId}`)
    }
  }
)
