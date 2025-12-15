import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { createHash } from 'crypto'
import { z } from 'zod'
import {
  STEALTH_SUPPRESSED_NOTIFICATION_TYPES,
  generateIntegrityHash,
} from '../utils/notificationStealth'

/**
 * Input schema for activating notification stealth
 */
export const activateNotificationStealthInputSchema = z.object({
  /** Safety request ID that authorized this stealth activation */
  requestId: z.string().min(1),
  /** Family ID containing the target users */
  familyId: z.string().min(1),
  /** User IDs to activate stealth for (typically the abuser) */
  targetUserIds: z.array(z.string().min(1)).min(1),
  /** Reason for activation (for compliance audit) - minimum 20 chars */
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters for compliance documentation')
    .max(5000),
  /** Duration in hours (default 72, max 168/7 days) */
  durationHours: z.number().min(24).max(168).default(72),
  /** Specific notification types to suppress (if empty, suppress all escape-related) */
  notificationTypes: z.array(z.string()).optional(),
})

/**
 * Callable Cloud Function: activateNotificationStealth
 *
 * CRITICAL: This function activates stealth mode to suppress notifications
 * that would reveal escape actions to an abuser.
 * This is a LIFE-SAFETY feature used to protect abuse victims.
 *
 * Security invariants:
 * 1. Caller MUST have safety-team role
 * 2. Safety request MUST exist and be verified
 * 3. Target users MUST belong to specified family
 * 4. Operation is logged to SEALED admin audit only
 * 5. NO notifications are sent about stealth activation
 * 6. NO family audit trail entry is created
 * 7. Stealth queue is NOT visible to any family member
 */
export const activateNotificationStealth = onCall(
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
    if (!callerClaims.isSafetyTeam) {
      throw new HttpsError(
        'permission-denied',
        'Safety team access required. This operation requires explicit safety-team role.'
      )
    }

    // Validate input
    const parseResult = activateNotificationStealthInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid input',
        parseResult.error.flatten()
      )
    }

    const {
      requestId,
      familyId,
      targetUserIds,
      reason,
      durationHours,
      notificationTypes,
    } = parseResult.data

    try {
      // Step 1: Verify safety request exists and is properly verified
      const safetyRequestRef = db.collection('safetyRequests').doc(requestId)
      const safetyRequestDoc = await safetyRequestRef.get()

      if (!safetyRequestDoc.exists) {
        throw new HttpsError('not-found', 'Safety request not found')
      }

      const safetyRequestData = safetyRequestDoc.data()!

      // Verify request is in a state that allows this operation
      if (safetyRequestData.status === 'pending') {
        throw new HttpsError(
          'failed-precondition',
          'Safety request must be reviewed before stealth activation can proceed'
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
          'Identity verification required before stealth activation'
        )
      }

      // CRITICAL: Verify safety request is for the specified family
      if (safetyRequestData.familyId && safetyRequestData.familyId !== familyId) {
        throw new HttpsError(
          'invalid-argument',
          'Safety request does not match the specified family'
        )
      }

      // Step 2: Verify family exists
      const familyRef = db.collection('families').doc(familyId)
      const familyDoc = await familyRef.get()

      if (!familyDoc.exists) {
        throw new HttpsError('not-found', 'Family not found')
      }

      // Step 3: Verify all target users belong to the family
      // SECURITY: Validate all users in parallel to prevent timing attacks
      // (avoids leaking which users exist via response time differences)
      const userValidationPromises = targetUserIds.map(async (userId) => {
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()

        if (!userDoc.exists) {
          return { userId, exists: false, isMember: false }
        }

        const userData = userDoc.data()!
        const isFamilyMember =
          userData.familyId === familyId ||
          (userData.familyIds && userData.familyIds.includes(familyId))

        return { userId, exists: true, isMember: isFamilyMember }
      })

      // Wait for ALL validations to complete (constant-time)
      const validationResults = await Promise.all(userValidationPromises)

      // Check results AFTER all queries complete to prevent timing leaks
      const invalidUsers = validationResults.filter(
        (r) => !r.exists || !r.isMember
      )

      if (invalidUsers.length > 0) {
        // Generic error message to prevent information leakage
        throw new HttpsError(
          'invalid-argument',
          'One or more users not found or do not belong to the specified family'
        )
      }

      // Step 4: Check for existing active stealth queue (idempotent)
      const existingStealthQuery = db
        .collection('stealthQueues')
        .where('familyId', '==', familyId)
        .where('safetyRequestId', '==', requestId)
        .where('expiresAt', '>', Timestamp.now())

      const existingStealthDocs = await existingStealthQuery.get()

      if (!existingStealthDocs.empty) {
        // Return existing stealth queue info
        const existingQueue = existingStealthDocs.docs[0]
        const existingData = existingQueue.data()
        return {
          success: true,
          activated: false,
          alreadyActive: true,
          queueId: existingQueue.id,
          familyId,
          targetUserIds: existingData.targetUserIds,
          expiresAt: existingData.expiresAt.toDate().toISOString(),
        }
      }

      // Step 5: Create the stealth queue
      const activationTimestamp = Timestamp.now()
      const expirationTimestamp = Timestamp.fromDate(
        new Date(activationTimestamp.toDate().getTime() + durationHours * 60 * 60 * 1000)
      )

      // Use provided notification types or default to all escape-related types
      const typesToSuppress = notificationTypes && notificationTypes.length > 0
        ? notificationTypes
        : [...STEALTH_SUPPRESSED_NOTIFICATION_TYPES]

      const stealthQueueData = {
        familyId,
        targetUserIds,
        notificationTypesToSuppress: typesToSuppress,
        activatedAt: activationTimestamp,
        expiresAt: expirationTimestamp,
        safetyRequestId: requestId,
        activatedBy: callerUid,
        sealed: true,
      }

      const stealthQueueRef = await db.collection('stealthQueues').add(stealthQueueData)

      // Step 6: Log to SEALED admin audit
      const auditData = {
        action: 'notification-stealth-activate',
        resourceType: 'stealth-queue',
        resourceId: stealthQueueRef.id,
        performedBy: callerUid,
        familyId,
        targetUserIds,
        safetyRequestId: requestId,
        reason,
        durationHours,
        notificationTypesToSuppress: typesToSuppress,
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      }

      const hashData = {
        ...auditData,
        timestamp: activationTimestamp.toDate().toISOString(),
      }
      const integrityHash = generateIntegrityHash(hashData)

      await db.collection('adminAuditLog').add({
        ...auditData,
        integrityHash,
      })

      // CRITICAL: Do NOT trigger any notifications
      // CRITICAL: Do NOT log to family audit trail
      // CRITICAL: Do NOT send emails

      return {
        success: true,
        activated: true,
        queueId: stealthQueueRef.id,
        familyId,
        targetUserIds,
        activatedAt: activationTimestamp.toDate().toISOString(),
        expiresAt: expirationTimestamp.toDate().toISOString(),
        durationHours,
        notificationTypesCount: typesToSuppress.length,
        // Do NOT include reason in response for security
      }
    } catch (error) {
      // CRITICAL: Do not log sensitive details to standard logs
      const errorId = createHash('sha256')
        .update(`${Date.now()}-${callerUid}`)
        .digest('hex')
        .slice(0, 16)

      console.error('Notification stealth activation failed', {
        errorId,
        errorType: error instanceof HttpsError ? error.code : 'internal',
        // Do NOT log: requestId, familyId, targetUserIds, reason
      })

      if (error instanceof HttpsError) {
        throw error
      }

      // Log full error details to sealed audit (compliance-only access)
      await db.collection('adminAuditLog').add({
        action: 'notification_stealth_activate_error',
        resourceType: 'stealth-queue',
        resourceId: familyId,
        performedBy: callerUid,
        safetyRequestId: requestId,
        errorId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: FieldValue.serverTimestamp(),
        sealed: true,
      })

      throw new HttpsError('internal', `Failed to activate notification stealth. Error ID: ${errorId}`)
    }
  }
)
