/**
 * Check Withdrawal Status - Story 6.6
 *
 * Cloud Function to check for pending withdrawal request:
 * - Returns pending withdrawal with countdown info
 * - Returns 404 if no pending withdrawal exists
 *
 * Story 6.6 AC5: Shows countdown during cooling period
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
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
 * Check for pending withdrawal request
 *
 * GET /checkWithdrawalStatus?childId=xxx&familyId=xxx
 *
 * Query parameters:
 * - childId: string - Child's ID
 * - familyId: string - Family's ID
 *
 * Response:
 * - 200: { result: WithdrawalRequest } - Pending withdrawal found
 * - 400: { error: { code, message } } - Invalid request
 * - 404: { error: { code, message } } - No pending withdrawal
 * - 500: { error: { code, message } } - Server error
 */
export const checkWithdrawalStatus = onRequest({ cors: true }, async (req, res) => {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({
      error: { code: 'method-not-allowed', message: 'Method not allowed' },
    })
    return
  }

  const childId = req.query.childId as string
  const familyId = req.query.familyId as string

  // Validate required fields
  if (!childId) {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'childId is required' },
    })
    return
  }

  if (!familyId) {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'familyId is required' },
    })
    return
  }

  try {
    const db = getFirestore()

    // Find pending withdrawal for this child
    const withdrawalQuery = await db
      .collection('withdrawalRequests')
      .where('childId', '==', childId)
      .where('familyId', '==', familyId)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (withdrawalQuery.empty) {
      res.status(404).json({
        error: { code: 'not-found', message: 'No pending withdrawal request found' },
      })
      return
    }

    const withdrawalDoc = withdrawalQuery.docs[0]
    const withdrawalData = withdrawalDoc.data() as WithdrawalRequest

    // Check if withdrawal has expired but not yet processed
    const now = Date.now()
    const expiresAt = withdrawalData.expiresAt.toMillis()

    if (now >= expiresAt) {
      // Withdrawal should be executed by scheduled function
      // For now, just note that it's expired
      logger.info('Pending withdrawal has expired', {
        requestId: withdrawalDoc.id,
        expiresAt: new Date(expiresAt).toISOString(),
      })
    }

    res.status(200).json({
      result: {
        requestId: withdrawalDoc.id,
        childId: withdrawalData.childId,
        familyId: withdrawalData.familyId,
        deviceId: withdrawalData.deviceId,
        status: withdrawalData.status,
        requestedAt: withdrawalData.requestedAt.toMillis(),
        expiresAt: expiresAt,
      },
    })
  } catch (error) {
    logger.error('Failed to check withdrawal status', { error })
    res.status(500).json({
      error: { code: 'internal', message: 'Failed to check withdrawal status' },
    })
  }
})
