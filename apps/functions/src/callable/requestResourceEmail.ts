import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import {
  queueResourceReferralEmail,
  generateIntegrityHash,
} from '../utils/emailService'

/**
 * Input schema for requesting resource email (self-removal path)
 */
const requestResourceEmailInputSchema = z.object({
  /** Email address to send resources to */
  email: z.string().email(),
  /** Optional: indicate this is a self-removal request */
  selfRemovalContext: z.boolean().optional(),
})

/**
 * Callable Cloud Function: requestResourceEmail
 *
 * Allows authenticated users to request abuse resources be emailed to them.
 * This is for the self-removal path where a victim removes themselves from
 * a family and optionally requests resources.
 *
 * Security considerations:
 * 1. Authentication required (user must be logged in)
 * 2. Rate limited to prevent abuse (1 request per hour per user)
 * 3. Email is sent to the address they provide (not account email by default)
 * 4. Minimal logging to protect privacy
 */
export const requestResourceEmail = onCall(
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

    // Validate input
    const parseResult = requestResourceEmailInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid email address',
        parseResult.error.flatten()
      )
    }

    const { email } = parseResult.data

    try {
      // Rate limiting: Check for recent requests from this user
      const oneHourAgo = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000)

      const recentRequests = await db
        .collection('emailQueue')
        .where('type', '==', 'resource-referral')
        .where('requestedBy', '==', callerUid)
        .where('createdAt', '>', oneHourAgo)
        .limit(1)
        .get()

      if (!recentRequests.empty) {
        throw new HttpsError(
          'resource-exhausted',
          'Please wait before requesting another email. You can request again in one hour.'
        )
      }

      // Generate a pseudo safety request ID for tracking (not a real safety request)
      const selfRequestId = `self-${callerUid}-${Date.now()}`

      // Queue the email
      // Use safe contact = false since user provided the email themselves
      // They should know if it's safe
      const queueRef = await db.collection('emailQueue').add({
        type: 'resource-referral',
        recipient: email,
        safetyRequestId: selfRequestId,
        requestedBy: callerUid, // Track who requested for rate limiting only
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        nextAttemptAt: Timestamp.now(),
        usedSafeContact: true, // Treat user-provided email as intentional
        createdAt: Timestamp.now(),
        isSelfRequest: true,
      })

      // Minimal audit logging - just track that email was requested
      // Do NOT log the email address or user details
      await db.collection('adminAuditLog').add({
        action: 'self-resource-email-requested',
        resourceType: 'emailQueue',
        resourceId: queueRef.id,
        timestamp: FieldValue.serverTimestamp(),
        // Intentionally NOT logging: callerUid, email address
        // Privacy is critical for abuse victims
        sealed: true,
      })

      return {
        success: true,
        message: 'Resources will be sent to your email shortly.',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      // Generic error - don't expose details
      console.error('Resource email request failed', {
        errorType: error instanceof Error ? error.name : 'unknown',
        // Do NOT log user ID or email
      })

      throw new HttpsError(
        'internal',
        'Unable to process your request. Please try again later.'
      )
    }
  }
)
