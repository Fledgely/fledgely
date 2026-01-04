/**
 * Account Deletion Callable Functions - Story 51.4
 *
 * Provides Firebase callable functions for account deletion:
 * - requestAccountDeletion: Initiate account deletion with confirmation
 * - cancelAccountDeletion: Cancel during cooling off
 * - getAccountDeletionStatus: Check current status
 *
 * Follows patterns from requestDataDeletion.ts
 */

import * as logger from 'firebase-functions/logger'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import {
  RequestAccountDeletionInputSchema,
  CancelAccountDeletionInputSchema,
  GetAccountDeletionStatusInputSchema,
  ACCOUNT_DELETION_CONFIG,
  AccountDeletionStatus,
  type RequestAccountDeletionResponse,
  type CancelAccountDeletionResponse,
} from '@fledgely/shared'
import {
  createAccountDeletionRequest,
  findActiveAccountDeletion,
  cancelAccountDeletionRequest,
  getAffectedUsers,
  updateAccountDeletionRequest,
} from '../services/gdpr/accountDeletionService'
import { sendAccountDeletionRequestedEmail } from '../lib/email/templates/accountDeletionRequestedEmail'
import { sendCoParentNotifyEmail } from '../lib/email/templates/accountDeletionCoParentNotifyEmail'
import { sendChildAccountDeletionNotifyEmail } from '../lib/email/templates/accountDeletionChildNotifyEmail'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify user is a guardian of the family.
 */
async function verifyGuardian(uid: string, familyId: string): Promise<boolean> {
  const db = getFirestore()
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    return false
  }

  const familyData = familyDoc.data()
  const guardians = familyData?.guardians || []

  return guardians.includes(uid)
}

/**
 * Get user display name from Firebase Auth.
 */
async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const auth = getAuth()
    const userRecord = await auth.getUser(uid)
    return userRecord.displayName || userRecord.email || 'A family member'
  } catch {
    return 'A family member'
  }
}

// ============================================================================
// REQUEST ACCOUNT DELETION
// ============================================================================

export const requestAccountDeletion = onCall<
  { familyId: string; confirmationPhrase: string },
  Promise<RequestAccountDeletionResponse>
>(async (request) => {
  const { auth, data } = request

  // Verify authenticated
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const userUid = auth.uid
  const userEmail = auth.token?.email

  if (!userEmail) {
    throw new HttpsError('failed-precondition', 'User email not available')
  }

  // Validate input
  const validation = RequestAccountDeletionInputSchema.safeParse(data)
  if (!validation.success) {
    logger.warn('Invalid account deletion request input', {
      errors: validation.error.errors,
    })
    throw new HttpsError('invalid-argument', 'Invalid request data')
  }

  const { familyId, confirmationPhrase } = validation.data

  // Verify user is guardian
  const isGuardian = await verifyGuardian(userUid, familyId)
  if (!isGuardian) {
    logger.warn('Non-guardian attempted account deletion', {
      familyId,
      userUid,
    })
    throw new HttpsError('permission-denied', 'Only guardians can request account deletion')
  }

  // Validate confirmation phrase (case-sensitive)
  if (confirmationPhrase !== ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE) {
    logger.warn('Invalid account deletion confirmation phrase', {
      familyId,
      userUid,
      phraseLength: confirmationPhrase.length,
      expectedPhrase: ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE,
    })
    return {
      success: false,
      status: 'invalid_confirmation',
      message: `Please type "${ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE}" exactly to confirm`,
    }
  }

  // AC2: Check for active subscription
  // Epic 50 (SaaS Subscription Management) is in backlog
  // When implemented, check and cancel subscription here
  try {
    // Placeholder for future subscription check
    const hasActiveSubscription = false // TODO: Implement when Epic 50 is done

    if (hasActiveSubscription) {
      logger.warn('Active subscription found during account deletion - cancellation needed', {
        familyId,
        userUid,
      })
      // In future: await cancelSubscription(familyId)
      // For now: Document that manual cancellation may be needed
    }

    logger.info('Subscription check completed (Epic 50 not yet implemented)', { familyId })
  } catch (error) {
    // Don't block deletion on subscription check failure
    logger.error('Subscription check failed', {
      familyId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }

  // Check for existing active deletion (pre-check for better UX)
  const existingDeletion = await findActiveAccountDeletion(familyId)
  if (existingDeletion) {
    logger.info('Account deletion already in progress', {
      familyId,
      existingDeletionId: existingDeletion.deletionId,
      status: existingDeletion.status,
    })
    return {
      success: false,
      status: 'already_pending',
      message: 'An account deletion request is already in progress',
      existingDeletionId: existingDeletion.deletionId,
      coolingOffEndsAt: existingDeletion.coolingOffEndsAt,
    }
  }

  // Get affected users
  const affectedUsers = await getAffectedUsers(familyId, userUid)

  // Create account deletion request (uses transaction for race condition protection)
  let deletionRequest
  try {
    deletionRequest = await createAccountDeletionRequest(
      familyId,
      userUid,
      userEmail,
      affectedUsers
    )
  } catch (error) {
    // Handle race condition: another request was created between our check and create
    if (error instanceof Error && error.message.includes('already in progress')) {
      const existingId = error.message.match(/: (.+)$/)?.[1]
      logger.info('Race condition prevented - account deletion already exists', {
        familyId,
        existingDeletionId: existingId,
      })
      return {
        success: false,
        status: 'already_pending',
        message: 'An account deletion request is already in progress',
        existingDeletionId: existingId,
      }
    }
    throw error
  }

  // Send email notification to requester
  try {
    await sendAccountDeletionRequestedEmail({
      to: userEmail,
      deletionId: deletionRequest.deletionId,
      coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
      affectedUserCount: affectedUsers.length,
    })
  } catch (emailError) {
    logger.error('Failed to send account deletion request email', {
      deletionId: deletionRequest.deletionId,
      error: emailError instanceof Error ? emailError.message : 'Unknown error',
    })
    // Continue - email failure shouldn't block deletion
  }

  // Notify co-parent(s) and children (AC4 and AC5)
  const requestedByName = await getUserDisplayName(userUid)
  const db = getFirestore()

  for (const user of affectedUsers) {
    if (user.role === 'guardian' && user.uid !== userUid && user.email) {
      // AC4: Notify co-parent
      try {
        await sendCoParentNotifyEmail({
          to: user.email,
          requestedByName,
          coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
          deletionId: deletionRequest.deletionId,
        })

        // Update notifiedAt for this user
        const updatedAffectedUsers = deletionRequest.affectedUsers.map((u) =>
          u.uid === user.uid ? { ...u, notifiedAt: Date.now() } : u
        )
        await updateAccountDeletionRequest(deletionRequest.deletionId, {
          affectedUsers: updatedAffectedUsers,
        })

        logger.info('Co-parent notified of account deletion', {
          deletionId: deletionRequest.deletionId,
          coParentUid: user.uid,
        })
      } catch (emailError) {
        logger.error('Failed to send co-parent notification', {
          deletionId: deletionRequest.deletionId,
          coParentUid: user.uid,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        })
      }
    } else if (user.role === 'child') {
      // AC5: Notify child (via parent email)
      try {
        // Get child name from children collection
        const childDoc = await db.collection('children').doc(user.uid).get()
        const childData = childDoc.data()
        const childName = childData?.name || 'Your child'

        // Send to requesting parent's email (on behalf of child)
        await sendChildAccountDeletionNotifyEmail({
          to: userEmail,
          childName,
          coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
          deletionId: deletionRequest.deletionId,
        })

        // Update notifiedAt for this child
        const updatedAffectedUsers = deletionRequest.affectedUsers.map((u) =>
          u.uid === user.uid ? { ...u, notifiedAt: Date.now() } : u
        )
        await updateAccountDeletionRequest(deletionRequest.deletionId, {
          affectedUsers: updatedAffectedUsers,
        })

        logger.info('Child notified of account deletion', {
          deletionId: deletionRequest.deletionId,
          childUid: user.uid,
          childName,
        })
      } catch (emailError) {
        logger.error('Failed to send child notification', {
          deletionId: deletionRequest.deletionId,
          childUid: user.uid,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        })
      }
    }
  }

  logger.info('Account deletion request created successfully', {
    deletionId: deletionRequest.deletionId,
    familyId,
    affectedUserCount: affectedUsers.length,
  })

  return {
    success: true,
    deletionId: deletionRequest.deletionId,
    status: AccountDeletionStatus.COOLING_OFF,
    message: `Account deletion scheduled. You have ${ACCOUNT_DELETION_CONFIG.COOLING_OFF_DAYS} days to cancel.`,
    coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
    affectedUserCount: affectedUsers.length,
  }
})

// ============================================================================
// CANCEL ACCOUNT DELETION
// ============================================================================

export const cancelAccountDeletion = onCall<
  { familyId: string; deletionId: string },
  Promise<CancelAccountDeletionResponse>
>(async (request) => {
  const { auth, data } = request

  // Verify authenticated
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const userUid = auth.uid

  // Validate input
  const validation = CancelAccountDeletionInputSchema.safeParse(data)
  if (!validation.success) {
    throw new HttpsError('invalid-argument', 'Invalid request data')
  }

  const { familyId, deletionId } = validation.data

  // Verify user is guardian
  const isGuardian = await verifyGuardian(userUid, familyId)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only guardians can cancel account deletion')
  }

  // Cancel the deletion
  try {
    await cancelAccountDeletionRequest(deletionId, userUid)

    logger.info('Account deletion cancelled', {
      deletionId,
      familyId,
      cancelledBy: userUid,
    })

    return {
      success: true,
      message: 'Account deletion has been cancelled. Your account and data are preserved.',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel deletion'
    logger.error('Failed to cancel account deletion', {
      deletionId,
      familyId,
      error: message,
    })

    return {
      success: false,
      message,
    }
  }
})

// ============================================================================
// GET ACCOUNT DELETION STATUS
// ============================================================================

export const getAccountDeletionStatus = onCall<
  { familyId: string; deletionId?: string },
  Promise<RequestAccountDeletionResponse>
>(async (request) => {
  const { auth, data } = request

  // Verify authenticated
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const userUid = auth.uid

  // Validate input
  const validation = GetAccountDeletionStatusInputSchema.safeParse(data)
  if (!validation.success) {
    throw new HttpsError('invalid-argument', 'Invalid request data')
  }

  const { familyId } = validation.data

  // Verify user is guardian
  const isGuardian = await verifyGuardian(userUid, familyId)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only guardians can view account deletion status')
  }

  // Find active deletion
  const deletion = await findActiveAccountDeletion(familyId)

  if (!deletion) {
    return {
      success: true,
      status: 'completed', // No active deletion means idle state
      message: 'No active account deletion request',
    }
  }

  return {
    success: true,
    deletionId: deletion.deletionId,
    status: deletion.status,
    message: `Account deletion is ${deletion.status}`,
    coolingOffEndsAt: deletion.coolingOffEndsAt,
    affectedUserCount: deletion.affectedUsers.length,
  }
})
