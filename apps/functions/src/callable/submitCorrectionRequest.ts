/**
 * Submit Correction Request - Callable
 *
 * Story 51.8: Right to Rectification - AC5, AC7
 *
 * Allows children to request data corrections via parent review.
 * Implements GDPR 30-day processing timeline.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  CorrectionRequestStatus,
  generateCorrectionRequestId,
  calculateDeadline,
  RECTIFICATION_CONFIG,
  type SubmitCorrectionRequestInput,
  type SubmitCorrectionRequestResponse,
  type CorrectionRequest,
  type ReviewCorrectionRequestInput,
  type ReviewCorrectionRequestResponse,
} from '@fledgely/shared'

export const submitCorrectionRequest = onCall<
  SubmitCorrectionRequestInput,
  Promise<SubmitCorrectionRequestResponse>
>(
  { maxInstances: 20 },
  async (
    request: CallableRequest<SubmitCorrectionRequestInput>
  ): Promise<SubmitCorrectionRequestResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const { dataToCorrect, proposedCorrection, reason } = request.data

    // Validate inputs
    if (!dataToCorrect || dataToCorrect.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Must specify what data to correct')
    }

    if (!proposedCorrection || proposedCorrection.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Must provide proposed correction')
    }

    if (!reason || reason.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Must provide a reason for correction')
    }

    if (reason.length > RECTIFICATION_CONFIG.MAX_REASON_LENGTH) {
      throw new HttpsError(
        'invalid-argument',
        `Reason exceeds maximum length of ${RECTIFICATION_CONFIG.MAX_REASON_LENGTH} characters`
      )
    }

    try {
      // Get user info
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()
      const familyId = userData?.familyId
      const isChild = userData?.role === 'child'
      const childName = userData?.displayName || userData?.email || 'Child'

      if (!familyId) {
        throw new HttpsError('failed-precondition', 'User must belong to a family')
      }

      // For children, find a parent to review
      let parentUid: string | null = null

      if (isChild) {
        // Find a parent in the family
        const familyDoc = await db.collection('families').doc(familyId).get()
        if (familyDoc.exists) {
          const familyData = familyDoc.data()
          // Get first parent from members
          const parentMember = familyData?.members?.find(
            (m: { role: string; uid: string }) => m.role === 'parent' && m.uid !== uid
          )
          parentUid = parentMember?.uid || familyData?.ownerUid
        }

        if (!parentUid) {
          throw new HttpsError('failed-precondition', 'No parent found to review request')
        }
      } else {
        // Adults can self-approve or it goes to family owner
        parentUid = uid
      }

      // Generate request ID and deadline
      const requestId = generateCorrectionRequestId()
      const deadline = calculateDeadline()

      // Create correction request
      const correctionRequest: CorrectionRequest = {
        requestId,
        childUid: uid,
        childName,
        parentUid,
        familyId,
        dataToCorrect: dataToCorrect.trim(),
        proposedCorrection: proposedCorrection.trim(),
        reason: reason.trim(),
        status: CorrectionRequestStatus.PENDING,
        submittedAt: Date.now(),
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        completedAt: null,
        deadline,
      }

      // Save request
      await db
        .collection(RECTIFICATION_CONFIG.CORRECTION_REQUESTS_COLLECTION)
        .doc(requestId)
        .set(correctionRequest)

      logger.info('Correction request submitted', {
        requestId,
        uid,
        familyId,
        isChild,
        parentUid,
        deadline,
      })

      return {
        success: true,
        requestId,
        message: isChild
          ? 'Correction request submitted for parent review'
          : 'Correction request submitted',
        deadline,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to submit correction request', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to submit correction request')
    }
  }
)

/**
 * Review a correction request (parent action).
 */
export const reviewCorrectionRequest = onCall<
  ReviewCorrectionRequestInput,
  Promise<ReviewCorrectionRequestResponse>
>(
  { maxInstances: 20 },
  async (
    request: CallableRequest<ReviewCorrectionRequestInput>
  ): Promise<ReviewCorrectionRequestResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const { requestId, approved, partiallyApproved, reviewNotes } = request.data

    if (!requestId) {
      throw new HttpsError('invalid-argument', 'Request ID is required')
    }

    try {
      // Get the correction request
      const requestRef = db
        .collection(RECTIFICATION_CONFIG.CORRECTION_REQUESTS_COLLECTION)
        .doc(requestId)
      const requestDoc = await requestRef.get()

      if (!requestDoc.exists) {
        throw new HttpsError('not-found', 'Correction request not found')
      }

      const requestData = requestDoc.data() as CorrectionRequest

      // Verify reviewer is the assigned parent
      if (requestData.parentUid !== uid) {
        throw new HttpsError('permission-denied', 'You are not authorized to review this request')
      }

      // Verify request is still pending
      if (
        requestData.status !== CorrectionRequestStatus.PENDING &&
        requestData.status !== CorrectionRequestStatus.UNDER_REVIEW
      ) {
        throw new HttpsError('failed-precondition', 'Request has already been processed')
      }

      // Determine new status
      let newStatus: string
      if (approved) {
        newStatus = partiallyApproved
          ? CorrectionRequestStatus.PARTIALLY_APPROVED
          : CorrectionRequestStatus.APPROVED
      } else {
        newStatus = CorrectionRequestStatus.REJECTED
      }

      // Update request
      await requestRef.update({
        status: newStatus,
        reviewedAt: Date.now(),
        reviewedBy: uid,
        reviewNotes: reviewNotes || null,
        completedAt: approved ? Date.now() : null,
      })

      logger.info('Correction request reviewed', {
        requestId,
        reviewedBy: uid,
        approved,
        partiallyApproved,
        newStatus,
      })

      return {
        success: true,
        message: approved ? 'Correction request approved' : 'Correction request rejected',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to review correction request', {
        uid,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to review correction request')
    }
  }
)
