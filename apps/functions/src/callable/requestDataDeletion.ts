/**
 * Cloud Functions for data deletion (GDPR Article 17).
 *
 * Story 51.2: Data Deletion Request - AC1, AC2, AC3, AC5, AC7, AC8
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST) - User must be authenticated
 * 2. Validation (SECOND) - Validate input
 * 3. Permission (THIRD) - User must be a guardian of the family
 * 4. Business logic (LAST) - Create/cancel deletion request
 *
 * Security:
 * - Only guardians can request/cancel data deletion
 * - Confirmation phrase required for safety
 * - Cancellation only allowed during cooling off period
 * - One active deletion per family at a time
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  RequestDataDeletionInputSchema,
  RequestDataDeletionResponseSchema,
  CancelDataDeletionInputSchema,
  CancelDataDeletionResponseSchema,
  DATA_DELETION_CONFIG,
  isValidConfirmationPhrase,
  type RequestDataDeletionInput,
  type RequestDataDeletionResponse,
  type CancelDataDeletionInput,
  type CancelDataDeletionResponse,
} from '@fledgely/shared'
import {
  createDeletionRequest,
  findActiveDeletion,
  cancelDeletionRequest,
  getDeletionRequest,
} from '../services/gdpr'
import { sendDeletionRequestedEmail } from '../lib/email/templates/dataDeletionRequestedEmail'

// Lazy initialization for Firestore (supports test mocking)
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Request deletion of all family data.
 *
 * Story 51.2: AC1 - Request deletion from settings
 * Story 51.2: AC2 - Typed confirmation required
 * Story 51.2: AC3 - Warning displayed (client-side)
 * Story 51.2: AC4 - 14-day cooling off period
 * Story 51.2: AC8 - Prevent duplicate requests
 */
export const requestDataDeletion = onCall<
  RequestDataDeletionInput,
  Promise<RequestDataDeletionResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Auth (FIRST)
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid
    const userEmail = request.auth.token?.email

    if (!userEmail) {
      throw new HttpsError('unauthenticated', 'Email verification required')
    }

    // 2. Validation (SECOND)
    const parseResult = RequestDataDeletionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
      throw new HttpsError('invalid-argument', `Invalid parameters: ${errorMessage}`)
    }

    const { familyId, confirmationPhrase } = parseResult.data
    const firestore = getDb()

    // Validate confirmation phrase (AC2)
    if (!isValidConfirmationPhrase(confirmationPhrase)) {
      // SECURITY: Do not log the phrase - could contain PII
      logger.warn('Invalid confirmation phrase', {
        familyId,
        userUid,
        phraseLength: confirmationPhrase.length,
        expectedPhrase: DATA_DELETION_CONFIG.CONFIRMATION_PHRASE,
      })

      const response: RequestDataDeletionResponse = {
        success: false,
        status: 'invalid_confirmation',
        message: `Please type "${DATA_DELETION_CONFIG.CONFIRMATION_PHRASE}" exactly to confirm deletion.`,
      }
      RequestDataDeletionResponseSchema.parse(response)
      return response
    }

    // 3. Permission (THIRD) - Verify user is a guardian of the family
    const familyDoc = await firestore.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Only guardians can request data deletion')
    }

    // 4. Business logic (LAST)

    // Check for existing active deletion (AC8)
    const activeDeletion = await findActiveDeletion(familyId)

    if (activeDeletion) {
      logger.info('Deletion already in progress', {
        familyId,
        existingDeletionId: activeDeletion.deletionId,
        status: activeDeletion.status,
      })

      const response: RequestDataDeletionResponse = {
        success: false,
        deletionId: activeDeletion.deletionId,
        status: 'already_pending',
        message: 'A deletion request is already in progress for this family.',
        coolingOffEndsAt: activeDeletion.coolingOffEndsAt,
        existingDeletionId: activeDeletion.deletionId,
      }

      RequestDataDeletionResponseSchema.parse(response)
      return response
    }

    // Create new deletion request with cooling off period
    try {
      const deletionRequest = await createDeletionRequest(familyId, userUid, userEmail)

      logger.info('Data deletion requested', {
        familyId,
        deletionId: deletionRequest.deletionId,
        requestedBy: userUid,
        coolingOffEndsAt: new Date(deletionRequest.coolingOffEndsAt).toISOString(),
      })

      // Send confirmation email (AC4)
      try {
        await sendDeletionRequestedEmail({
          to: userEmail,
          deletionId: deletionRequest.deletionId,
          coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
        })
        logger.info('Deletion request email sent', { deletionId: deletionRequest.deletionId })
      } catch (emailError) {
        // Log but don't fail the deletion request if email fails
        // SECURITY: Do not log email addresses (PII)
        logger.error('Failed to send deletion request email', {
          deletionId: deletionRequest.deletionId,
          familyId,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        })
      }

      const response: RequestDataDeletionResponse = {
        success: true,
        deletionId: deletionRequest.deletionId,
        status: 'cooling_off',
        message: `Deletion request submitted. Your data will be permanently deleted after ${DATA_DELETION_CONFIG.COOLING_OFF_DAYS} days. You can cancel this request during this period.`,
        coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
      }

      RequestDataDeletionResponseSchema.parse(response)
      return response
    } catch (error) {
      logger.error('Failed to create deletion request', {
        familyId,
        userUid,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new HttpsError('internal', 'Failed to create deletion request')
    }
  }
)

/**
 * Cancel a data deletion request during cooling off period.
 *
 * Story 51.2: AC5 - Cancellation during cooling off
 */
export const cancelDataDeletion = onCall<
  CancelDataDeletionInput,
  Promise<CancelDataDeletionResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Auth (FIRST)
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid

    // 2. Validation (SECOND)
    const parseResult = CancelDataDeletionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
      throw new HttpsError('invalid-argument', `Invalid parameters: ${errorMessage}`)
    }

    const { familyId, deletionId } = parseResult.data
    const firestore = getDb()

    // 3. Permission (THIRD) - Verify user is a guardian of the family
    const familyDoc = await firestore.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Only guardians can cancel data deletion')
    }

    // 4. Business logic (LAST)

    // Verify deletion exists and belongs to family
    const deletionRequest = await getDeletionRequest(deletionId)

    if (!deletionRequest) {
      throw new HttpsError('not-found', 'Deletion request not found')
    }

    if (deletionRequest.familyId !== familyId) {
      throw new HttpsError('permission-denied', 'Deletion does not belong to this family')
    }

    // Can only cancel during cooling off
    if (deletionRequest.status !== 'cooling_off') {
      const response: CancelDataDeletionResponse = {
        success: false,
        message: `Cannot cancel deletion - status is "${deletionRequest.status}". Cancellation is only allowed during the cooling off period.`,
      }
      CancelDataDeletionResponseSchema.parse(response)
      return response
    }

    try {
      await cancelDeletionRequest(deletionId, userUid)

      logger.info('Data deletion cancelled', {
        familyId,
        deletionId,
        cancelledBy: userUid,
      })

      const response: CancelDataDeletionResponse = {
        success: true,
        message: 'Deletion request has been cancelled. Your data will be preserved.',
      }

      CancelDataDeletionResponseSchema.parse(response)
      return response
    } catch (error) {
      logger.error('Failed to cancel deletion request', {
        familyId,
        deletionId,
        userUid,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new HttpsError('internal', 'Failed to cancel deletion request')
    }
  }
)

/**
 * Get the status of a data deletion request.
 *
 * Story 51.2: Get deletion status for UI display
 */
export const getDataDeletionStatus = onCall<
  { familyId: string; deletionId?: string },
  Promise<RequestDataDeletionResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Auth (FIRST)
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid

    // 2. Validation (SECOND)
    const { familyId, deletionId } = request.data || {}

    if (!familyId || typeof familyId !== 'string') {
      throw new HttpsError('invalid-argument', 'Family ID is required')
    }

    const firestore = getDb()

    // 3. Permission (THIRD) - Verify user is a guardian of the family
    const familyDoc = await firestore.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Only guardians can view deletion status')
    }

    // 4. Business logic (LAST)
    try {
      let deletionRequest

      if (deletionId) {
        // Get specific deletion
        deletionRequest = await getDeletionRequest(deletionId)
        if (deletionRequest && deletionRequest.familyId !== familyId) {
          throw new HttpsError('permission-denied', 'Deletion does not belong to this family')
        }
      } else {
        // Get latest active deletion
        deletionRequest = await findActiveDeletion(familyId)
      }

      if (!deletionRequest) {
        return {
          success: true,
          status: 'pending',
          message: 'No deletion request found. You can request data deletion from settings.',
        }
      }

      const response: RequestDataDeletionResponse = {
        success: true,
        deletionId: deletionRequest.deletionId,
        status: deletionRequest.status,
        message: getStatusMessage(deletionRequest.status),
        coolingOffEndsAt: deletionRequest.coolingOffEndsAt,
      }

      return response
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      logger.error('Failed to get deletion status', {
        familyId,
        deletionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new HttpsError('internal', 'Failed to get deletion status')
    }
  }
)

/**
 * Get human-readable status message.
 */
function getStatusMessage(
  status: 'pending' | 'cooling_off' | 'processing' | 'completed' | 'cancelled' | 'failed'
): string {
  switch (status) {
    case 'pending':
      return 'Your deletion request is queued.'
    case 'cooling_off':
      return 'Your deletion request is in the cooling off period. You can still cancel.'
    case 'processing':
      return 'Your data is being permanently deleted. This cannot be undone.'
    case 'completed':
      return 'Your data has been permanently deleted.'
    case 'cancelled':
      return 'Your deletion request was cancelled. Your data has been preserved.'
    case 'failed':
      return 'Deletion failed. Please contact support.'
    default:
      return 'Unknown status.'
  }
}
