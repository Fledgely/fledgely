/**
 * Cancel Consent Withdrawal - Story 6.6
 *
 * Cloud Function to cancel a pending withdrawal request:
 * - Child can cancel during cooling period
 * - Parents are notified of cancellation
 *
 * Story 6.6 AC6: Child can cancel withdrawal if they change their mind
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getApps, initializeApp } from 'firebase-admin/app'
import * as logger from 'firebase-functions/logger'

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp()
}

/**
 * Withdrawal request status
 */
type WithdrawalStatus = 'pending' | 'cancelled' | 'executed'

/**
 * Withdrawal request document structure
 */
interface WithdrawalRequest {
  childId: string
  familyId: string
  agreementId: string
  deviceId: string
  status: WithdrawalStatus
  requestedAt: Timestamp
  expiresAt: Timestamp
  cancelledAt?: Timestamp
  executedAt?: Timestamp
}

/**
 * Cancel a pending withdrawal request
 *
 * POST /cancelConsentWithdrawal
 *
 * Request body:
 * - requestId: string - Withdrawal request ID
 * - childId: string - Child's ID (for verification)
 *
 * Response:
 * - 200: { result: { success: true, message: string } }
 * - 400: { error: { code, message } } - Invalid request
 * - 403: { error: { code, message } } - Not authorized
 * - 404: { error: { code, message } } - Request not found
 * - 409: { error: { code, message } } - Request already processed
 * - 500: { error: { code, message } } - Server error
 */
export const cancelConsentWithdrawal = onRequest({ cors: true }, async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      error: { code: 'method-not-allowed', message: 'Method not allowed' },
    })
    return
  }

  const { requestId, childId } = req.body

  // Validate required fields
  if (!requestId) {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'requestId is required' },
    })
    return
  }

  if (!childId) {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'childId is required' },
    })
    return
  }

  try {
    const db = getFirestore()

    // Get the withdrawal request
    const withdrawalRef = db.collection('withdrawalRequests').doc(requestId)
    const withdrawalDoc = await withdrawalRef.get()

    if (!withdrawalDoc.exists) {
      res.status(404).json({
        error: { code: 'not-found', message: 'Withdrawal request not found' },
      })
      return
    }

    const withdrawalData = withdrawalDoc.data() as WithdrawalRequest

    // Verify the request belongs to this child
    if (withdrawalData.childId !== childId) {
      res.status(403).json({
        error: { code: 'permission-denied', message: 'Not authorized to cancel this request' },
      })
      return
    }

    // Check if request is still pending
    if (withdrawalData.status !== 'pending') {
      res.status(409).json({
        error: {
          code: 'failed-precondition',
          message: `Cannot cancel request with status: ${withdrawalData.status}`,
        },
      })
      return
    }

    // Check if cooling period has expired
    const now = Date.now()
    const expiresAt = withdrawalData.expiresAt.toMillis()

    if (now >= expiresAt) {
      res.status(409).json({
        error: {
          code: 'failed-precondition',
          message: 'Cooling period has expired, cannot cancel',
        },
      })
      return
    }

    // Update withdrawal status to cancelled
    await withdrawalRef.update({
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
    })

    logger.info('Withdrawal request cancelled', {
      requestId,
      childId,
    })

    // Notify parents that withdrawal was cancelled
    // Story 6.6 AC6: Parents notified of cancellation
    const familyDoc = await db.collection('families').doc(withdrawalData.familyId).get()
    if (familyDoc.exists) {
      const familyData = familyDoc.data()
      const guardianIds = familyData?.guardians || []

      // Create notification for each guardian
      for (const guardianId of guardianIds) {
        await db.collection('notifications').add({
          userId: guardianId,
          familyId: withdrawalData.familyId,
          type: 'withdrawal_cancelled',
          title: 'Consent Withdrawal Cancelled',
          message: `Your child has cancelled their consent withdrawal request. Monitoring will continue as normal.`,
          childId,
          withdrawalRequestId: requestId,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      logger.info('Parent notifications sent for cancellation', {
        requestId,
        guardianCount: guardianIds.length,
      })
    }

    res.status(200).json({
      result: {
        success: true,
        message: 'Withdrawal request cancelled successfully',
      },
    })
  } catch (error) {
    logger.error('Failed to cancel withdrawal', { error })
    res.status(500).json({
      error: { code: 'internal', message: 'Failed to cancel withdrawal request' },
    })
  }
})
