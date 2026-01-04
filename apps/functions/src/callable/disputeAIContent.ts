/**
 * Dispute AI Content - Callable
 *
 * Story 51.8: Right to Rectification - AC6, AC7
 *
 * Allows users to dispute AI-generated content.
 * Implements GDPR 30-day review requirement.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  AIDisputeStatus,
  generateAIDisputeId,
  calculateDeadline,
  RECTIFICATION_CONFIG,
  type SubmitAIDisputeInput,
  type SubmitAIDisputeResponse,
  type AIDispute,
} from '@fledgely/shared'

/**
 * Valid AI content types that can be disputed.
 */
const VALID_CONTENT_TYPES = [
  'screenshot_description',
  'activity_summary',
  'behavior_analysis',
  'content_classification',
  'ai_recommendation',
]

export const disputeAIContent = onCall<SubmitAIDisputeInput, Promise<SubmitAIDisputeResponse>>(
  { maxInstances: 20 },
  async (request: CallableRequest<SubmitAIDisputeInput>): Promise<SubmitAIDisputeResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const { contentType, contentId, disputedContent, reason } = request.data

    // Validate content type
    if (!VALID_CONTENT_TYPES.includes(contentType)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid content type. Must be one of: ${VALID_CONTENT_TYPES.join(', ')}`
      )
    }

    // Validate content ID
    if (!contentId || contentId.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Content ID is required')
    }

    // Validate disputed content
    if (!disputedContent || disputedContent.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Must specify the content being disputed')
    }

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Must provide a reason for the dispute')
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

      if (!familyId) {
        throw new HttpsError('failed-precondition', 'User must belong to a family')
      }

      // Check for duplicate disputes
      const existingDisputes = await db
        .collection(RECTIFICATION_CONFIG.AI_DISPUTES_COLLECTION)
        .where('uid', '==', uid)
        .where('contentId', '==', contentId)
        .where('status', 'in', [AIDisputeStatus.SUBMITTED, AIDisputeStatus.UNDER_REVIEW])
        .get()

      if (!existingDisputes.empty) {
        throw new HttpsError(
          'already-exists',
          'A dispute for this content is already pending review'
        )
      }

      // Generate dispute ID and deadline
      const disputeId = generateAIDisputeId()
      const deadline = calculateDeadline()

      // Create dispute
      const dispute: AIDispute = {
        disputeId,
        uid,
        familyId,
        contentType,
        contentId,
        disputedContent: disputedContent.trim(),
        reason: reason.trim(),
        status: AIDisputeStatus.SUBMITTED,
        submittedAt: Date.now(),
        resolvedAt: null,
        resolutionNotes: null,
        deadline,
      }

      // Save dispute
      await db.collection(RECTIFICATION_CONFIG.AI_DISPUTES_COLLECTION).doc(disputeId).set(dispute)

      logger.info('AI content dispute submitted', {
        disputeId,
        uid,
        familyId,
        contentType,
        contentId,
        deadline,
      })

      return {
        success: true,
        disputeId,
        message: 'Dispute submitted successfully. We will review within 30 days.',
        deadline,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to submit AI dispute', {
        uid,
        contentType,
        contentId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to submit dispute')
    }
  }
)

/**
 * Resolve an AI dispute (admin action).
 */
export const resolveAIDispute = onCall<
  {
    disputeId: string
    resolution: 'content_removed' | 'content_corrected' | 'dispute_rejected'
    resolutionNotes?: string
  },
  Promise<{ success: boolean; message: string }>
>({ maxInstances: 10 }, async (request): Promise<{ success: boolean; message: string }> => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated')
  }

  const uid = request.auth.uid
  const db = getFirestore()
  const { disputeId, resolution, resolutionNotes } = request.data

  // Verify admin role
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User not found')
  }

  const userData = userDoc.data()
  if (userData?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can resolve disputes')
  }

  if (!disputeId) {
    throw new HttpsError('invalid-argument', 'Dispute ID is required')
  }

  const validResolutions = ['content_removed', 'content_corrected', 'dispute_rejected']
  if (!validResolutions.includes(resolution)) {
    throw new HttpsError('invalid-argument', 'Invalid resolution')
  }

  try {
    // Get the dispute
    const disputeRef = db.collection(RECTIFICATION_CONFIG.AI_DISPUTES_COLLECTION).doc(disputeId)
    const disputeDoc = await disputeRef.get()

    if (!disputeDoc.exists) {
      throw new HttpsError('not-found', 'Dispute not found')
    }

    const disputeData = disputeDoc.data() as AIDispute

    // Verify dispute is still open
    if (
      disputeData.status !== AIDisputeStatus.SUBMITTED &&
      disputeData.status !== AIDisputeStatus.UNDER_REVIEW
    ) {
      throw new HttpsError('failed-precondition', 'Dispute has already been resolved')
    }

    // Map resolution to status
    const statusMap: Record<string, string> = {
      content_removed: AIDisputeStatus.CONTENT_REMOVED,
      content_corrected: AIDisputeStatus.CONTENT_CORRECTED,
      dispute_rejected: AIDisputeStatus.DISPUTE_REJECTED,
    }

    // Update dispute
    await disputeRef.update({
      status: statusMap[resolution],
      resolvedAt: Date.now(),
      resolutionNotes: resolutionNotes || null,
    })

    logger.info('AI dispute resolved', {
      disputeId,
      resolvedBy: uid,
      resolution,
    })

    return {
      success: true,
      message: `Dispute resolved: ${resolution.replace(/_/g, ' ')}`,
    }
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error
    }

    logger.error('Failed to resolve AI dispute', {
      uid,
      disputeId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    throw new HttpsError('internal', 'Failed to resolve dispute')
  }
})
