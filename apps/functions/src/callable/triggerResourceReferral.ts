import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { createHash } from 'crypto'
import { z } from 'zod'
import {
  queueResourceReferralEmail,
  hasReferralBeenSent,
  generateIntegrityHash,
} from '../utils/emailService'

/**
 * Input schema for triggering resource referral
 */
const triggerResourceReferralInputSchema = z.object({
  /** Safety request ID that authorized this referral */
  safetyRequestId: z.string().min(1),
  /** Optional override for recipient email (must have safety-team role) */
  recipientEmailOverride: z.string().email().optional(),
})

/**
 * Callable Cloud Function: triggerResourceReferral
 *
 * Triggers sending of domestic abuse resources to a victim after escape completion.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Safety request MUST exist
 * 3. Only ONE referral email per safety request (idempotency)
 * 4. Email is sent to safe contact address if provided, else account email
 * 5. All operations logged to sealed admin audit
 * 6. Email failure does NOT block function completion
 */
export const triggerResourceReferral = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    const db = getFirestore()
    const auth = getAuth()

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
        'Safety team access required'
      )
    }

    // Validate input
    const parseResult = triggerResourceReferralInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const { safetyRequestId, recipientEmailOverride } = parseResult.data

    try {
      // Step 1: Verify safety request exists
      const safetyRequestRef = db.collection('safetyRequests').doc(safetyRequestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      // Step 2: Check idempotency - has referral already been sent?
      const alreadySent = await hasReferralBeenSent(safetyRequestId)
      if (alreadySent) {
        return {
          success: true,
          alreadySent: true,
          message: 'Resource referral was already triggered for this safety request',
        }
      }

      // Step 3: Determine recipient email
      let recipientEmail: string
      let usedSafeContact: boolean

      if (recipientEmailOverride) {
        // Safety team can override recipient
        recipientEmail = recipientEmailOverride
        usedSafeContact = false // Treat override as not safe contact for warning purposes
      } else if (safetyRequestData.safeContactEmail) {
        // Use safe contact email if provided
        recipientEmail = safetyRequestData.safeContactEmail
        usedSafeContact = true
      } else {
        // Fall back to victim's account email
        const victimUserId = safetyRequestData.victimUserId || safetyRequestData.submittedBy
        if (!victimUserId) {
          throw new HttpsError(
            'failed-precondition',
            'No recipient email available - safety request missing victim user ID'
          )
        }

        try {
          const userRecord = await auth.getUser(victimUserId)
          if (!userRecord.email) {
            throw new HttpsError(
              'failed-precondition',
              'Victim account has no email address'
            )
          }
          recipientEmail = userRecord.email
          usedSafeContact = false
        } catch (authError) {
          throw new HttpsError(
            'not-found',
            'Victim user account not found'
          )
        }
      }

      // Step 4: Queue email for sending
      const queueId = await queueResourceReferralEmail(
        safetyRequestId,
        recipientEmail,
        usedSafeContact
      )

      // Step 5: Update safety request with referral status
      await safetyRequestRef.update({
        resourceReferralTriggered: true,
        resourceReferralTriggeredAt: Timestamp.now(),
        resourceReferralTriggeredBy: callerUid,
        resourceReferralQueueId: queueId,
        resourceReferralStatus: 'pending',
      })

      // Step 6: Log to sealed admin audit
      const auditData = {
        action: 'resource-referral-triggered',
        resourceType: 'safetyRequest',
        resourceId: safetyRequestId,
        performedBy: callerUid,
        recipientEmail: recipientEmail.substring(0, 3) + '***', // Redact email in audit
        usedSafeContact,
        emailQueueId: queueId,
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      }

      const hashData = {
        ...auditData,
        timestamp: Timestamp.now().toDate().toISOString(),
      }
      const integrityHash = generateIntegrityHash(hashData)

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      return {
        success: true,
        alreadySent: false,
        emailQueueId: queueId,
        usedSafeContact,
        message: 'Resource referral email queued successfully',
      }
    } catch (error) {
      // Generate error ID for tracking
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Resource referral trigger failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log error to sealed audit
      await db.collection('adminAuditLog').add({
        action: 'resource_referral_error',
        resourceType: 'safetyRequest',
        resourceId: safetyRequestId,
        performedBy: callerUid,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to trigger resource referral. Error ID: ${errorId}`)
    }
  }
)
