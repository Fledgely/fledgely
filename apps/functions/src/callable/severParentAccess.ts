import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { createHash } from 'crypto'
import { z } from 'zod'
import {
  queueResourceReferralEmail,
  hasReferralBeenSent,
} from '../utils/emailService'

/**
 * Input schema for severing parent access
 */
const severParentAccessInputSchema = z.object({
  /** Safety request ID that authorized this severing */
  requestId: z.string().min(1),
  /** User ID of the parent to sever */
  targetUserId: z.string().min(1),
  /** Family ID to sever the parent from */
  familyId: z.string().min(1),
  /** Reason for severing (for compliance audit) - minimum 20 chars for meaningful documentation */
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters for compliance documentation')
    .max(5000),
  /** Optional: Trigger resource referral email after severing (AC #7 - Story 0.5.9) */
  triggerResourceReferral: z.boolean().optional(),
})

/**
 * Generate an integrity hash for audit entry
 * Used for tamper detection on sealed entries
 */
function generateIntegrityHash(data: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(sortedJson).digest('hex')
}

/**
 * Callable Cloud Function: severParentAccess
 *
 * CRITICAL: This function severs a parent's access to their family.
 * This is a LIFE-SAFETY feature used to protect abuse victims.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Safety request MUST exist and be verified
 * 3. Target user MUST be a parent in the specified family
 * 4. Severing is logged to SEALED admin audit only
 * 5. NO notifications are sent to ANY party
 * 6. NO family audit trail entry is created
 * 7. Severed parent CAN still log in (sees "No families found")
 */
export const severParentAccess = onCall(
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
    // Admin role alone is NOT sufficient for this life-safety operation
    // Admins who need this capability must be explicitly granted safety-team role
    if (!callerClaims.isSafetyTeam) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required. This operation requires explicit safety-team role.'
      )
    }

    // Validate input
    const parseResult = severParentAccessInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { requestId, targetUserId, familyId, reason, triggerResourceReferral } = parseResult.data

    try {
      // Step 1: Verify safety request exists and is properly verified
      const safetyRequestRef = db.collection('safetyRequests').doc(requestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      // Verify request is in a state that allows severing (resolved or in-progress)
      if (safetyRequestData.status === 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'Safety request must be reviewed before severing can proceed'
        )
      }

      // Check if verification checklist has minimum requirements
      const verification = safetyRequestData.verificationChecklist || {}
      const hasMinimumVerification =
        verification.accountOwnershipVerified === true ||
        verification.idMatched === true

      if (!hasMinimumVerification) {
        throw new HttpsError(
          'failed-precondition',
          'Identity verification required before severing'
        )
      }

      // Step 2: Check if family membership exists and is active
      const membershipId = `${targetUserId}_${familyId}`
      const membershipRef = db.collection('familyMemberships').doc(membershipId)
      const membershipDoc = await membershipRef.get()

      if (!membershipDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Parent is not a member of this family'
        )
      }

      const membershipData = membershipDoc.data()!

      // Check if already severed
      if (membershipData.isActive === false) {
        throw new HttpsError(
          'failed-precondition',
          'Parent access has already been severed'
        )
      }

      // Verify this is a parent role (not a child)
      if (membershipData.role !== 'parent') {
        throw new HttpsError(
          'invalid-argument',
          'Can only sever parent access, not child access'
        )
      }

      // Step 3: Execute the severing
      const severingTimestamp = Timestamp.now()

      await membershipRef.update({
        isActive: false,
        severedAt: severingTimestamp,
        severedBy: callerUid,
        severedReason: reason,
        // CRITICAL: Do NOT delete the document - soft delete for audit trail
      })

      // Step 4: Log to SEALED admin audit
      // CRITICAL: This entry is sealed for compliance-only access
      const auditData = {
        action: 'parent-severing',
        resourceType: 'familyMembership',
        resourceId: membershipId,
        performedBy: callerUid,
        affectedUserId: targetUserId,
        familyId: familyId,
        safetyRequestId: requestId,
        reason: reason,
        timestamp: FieldValue.serverTimestamp(),
        sealed: true, // CRITICAL: Marks as compliance-only
      }

      // Generate integrity hash before adding server timestamp
      const hashData = {
        ...auditData,
        timestamp: severingTimestamp.toDate().toISOString(),
      }
      const integrityHash = generateIntegrityHash(hashData)

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      // CRITICAL: Do NOT trigger any notifications
      // CRITICAL: Do NOT log to family audit trail
      // CRITICAL: Do NOT send unsolicited emails

      // Step 5: Optionally trigger resource referral (AC #7 - Story 0.5.9)
      // This sends domestic abuse resources to the victim asynchronously
      let resourceReferralQueued = false
      let resourceReferralQueueId: string | undefined

      if (triggerResourceReferral) {
        // Check if all escape actions for this safety request are complete
        // For now, severing is typically the final action
        const escapeComplete = await checkEscapeCompletion(db, requestId)

        if (escapeComplete) {
          // Check idempotency - has referral already been sent?
          const alreadySent = await hasReferralBeenSent(requestId)

          if (!alreadySent) {
            // Determine recipient email
            const { recipientEmail, usedSafeContact } = await getRecipientEmailForReferral(
              safetyRequestData,
              getAuth()
            )

            if (recipientEmail) {
              // Queue email asynchronously - do NOT await delivery
              // Email failure must NOT block escape completion
              try {
                resourceReferralQueueId = await queueResourceReferralEmail(
                  requestId,
                  recipientEmail,
                  usedSafeContact
                )
                resourceReferralQueued = true

                // Update safety request with referral status
                await safetyRequestRef.update({
                  resourceReferralTriggered: true,
                  resourceReferralTriggeredAt: Timestamp.now(),
                  resourceReferralTriggeredBy: callerUid,
                  resourceReferralQueueId,
                  resourceReferralStatus: 'pending',
                })
              } catch (referralError) {
                // Log error details but do NOT fail the severing operation
                console.warn('Resource referral queueing failed, but severing succeeded', {
                  errorType: referralError instanceof Error ? referralError.name : 'unknown',
                  errorMessage: referralError instanceof Error ? referralError.message : 'Unknown error',
                  // Do NOT log: requestId, recipient - privacy critical
                })
              }
            }
          }
        }
      }

      return {
        success: true,
        severed: true,
        targetUserId,
        familyId,
        severedAt: severingTimestamp.toDate().toISOString(),
        resourceReferralQueued,
        resourceReferralQueueId,
        // Do NOT include reason in response for security
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      // Only log minimal error type for debugging, sensitive details go to sealed audit only
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Parent severing failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: requestId, targetUserId, familyId, reason
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log full error details to sealed audit (compliance-only access)
      await db.collection('adminAuditLog').add({
        action: 'parent_severing_error',
        resourceType: 'familyMembership',
        resourceId: `${targetUserId}_${familyId}`,
        performedBy: callerUid,
        safetyRequestId: requestId,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to sever parent access. Error ID: ${errorId}`)
    }
  }
)

/**
 * Check if all escape actions for a safety request are complete
 * This determines if it's safe to send the resource referral email
 *
 * AC #7: Only ONE resource email per safety request, sent after ALL requested actions complete
 */
async function checkEscapeCompletion(
  db: FirebaseFirestore.Firestore,
  safetyRequestId: string
): Promise<boolean> {
  try {
    const safetyRequestRef = db.collection('safetyRequests').doc(safetyRequestId)
    const doc = await safetyRequestRef.get()

    if (!doc.exists) {
      return false
    }

    const data = doc.data()!

    // Check if there are pending escape actions
    const requestedActions = data.requestedActions || {}
    const completedActions = data.completedActions || {}

    // If specific actions were requested, check they're all complete
    if (Object.keys(requestedActions).length > 0) {
      const allActionsComplete = Object.keys(requestedActions).every(
        action => completedActions[action] === true
      )
      return allActionsComplete
    }

    // If no specific actions tracked, consider complete after any severing
    // (backwards compatibility with older safety requests)
    return data.status === 'resolved' || data.status === 'in-progress'
  } catch {
    // On error, default to allowing referral to not block victim resources
    return true
  }
}

/**
 * Get recipient email for resource referral
 * Uses safe contact email if provided, falls back to account email
 *
 * AC #3: Use safe contact address when available
 */
async function getRecipientEmailForReferral(
  safetyRequestData: FirebaseFirestore.DocumentData,
  auth: ReturnType<typeof getAuth>
): Promise<{ recipientEmail: string | null; usedSafeContact: boolean }> {
  // Prefer safe contact email
  if (safetyRequestData.safeContactEmail) {
    return {
      recipientEmail: safetyRequestData.safeContactEmail,
      usedSafeContact: true,
    }
  }

  // Fall back to victim's account email
  const victimUserId = safetyRequestData.victimUserId || safetyRequestData.submittedBy
  if (!victimUserId) {
    return { recipientEmail: null, usedSafeContact: false }
  }

  try {
    const userRecord = await auth.getUser(victimUserId)
    if (userRecord.email) {
      return {
        recipientEmail: userRecord.email,
        usedSafeContact: false,
      }
    }
  } catch {
    // User not found or no email
  }

  return { recipientEmail: null, usedSafeContact: false }
}
