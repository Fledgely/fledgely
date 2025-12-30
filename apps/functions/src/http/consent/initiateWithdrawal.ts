/**
 * Initiate Consent Withdrawal - Story 6.6
 *
 * Cloud Function to start consent withdrawal process:
 * - Validates child has active agreement
 * - Creates withdrawal request with 24-hour expiry
 * - Triggers parent notification
 *
 * Key design decisions:
 * - Child-initiated only (verified via device assignment)
 * - 24-hour mandatory cooling period (cannot be shortened)
 * - Monitoring continues during cooling period
 * - Parents notified but cannot cancel on child's behalf
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getApps, initializeApp } from 'firebase-admin/app'
import * as logger from 'firebase-functions/logger'

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp()
}

// 24-hour cooling period in milliseconds
const COOLING_PERIOD_MS = 24 * 60 * 60 * 1000

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
  parentNotifiedAt?: Timestamp
}

/**
 * Initiate a consent withdrawal request
 *
 * POST /initiateConsentWithdrawal
 *
 * Request body:
 * - childId: string - Child's ID
 * - familyId: string - Family's ID
 * - deviceId: string - Device ID initiating withdrawal
 *
 * Response:
 * - 200: { result: WithdrawalRequest }
 * - 400: { error: { code, message } } - Invalid request
 * - 404: { error: { code, message } } - Device/child/agreement not found
 * - 409: { error: { code, message } } - Pending withdrawal already exists
 * - 500: { error: { code, message } } - Server error
 */
export const initiateConsentWithdrawal = onRequest({ cors: true }, async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      error: { code: 'method-not-allowed', message: 'Method not allowed' },
    })
    return
  }

  const { childId, familyId, deviceId } = req.body

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

  if (!deviceId) {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'deviceId is required' },
    })
    return
  }

  try {
    const db = getFirestore()

    // Verify device exists and belongs to this child
    const deviceDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('devices')
      .doc(deviceId)
      .get()

    if (!deviceDoc.exists) {
      res.status(404).json({
        error: { code: 'not-found', message: 'Device not found' },
      })
      return
    }

    const deviceData = deviceDoc.data()
    if (deviceData?.childId !== childId) {
      res.status(403).json({
        error: { code: 'permission-denied', message: 'Device not assigned to this child' },
      })
      return
    }

    // Find active agreement for this child
    const agreementQuery = await db
      .collection('activeAgreements')
      .where('childId', '==', childId)
      .where('familyId', '==', familyId)
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (agreementQuery.empty) {
      res.status(404).json({
        error: { code: 'not-found', message: 'No active agreement found for this child' },
      })
      return
    }

    const agreementDoc = agreementQuery.docs[0]
    const agreementId = agreementDoc.id

    // Check for existing pending withdrawal
    const existingWithdrawal = await db
      .collection('withdrawalRequests')
      .where('childId', '==', childId)
      .where('familyId', '==', familyId)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (!existingWithdrawal.empty) {
      // Return existing pending withdrawal instead of error
      const existingDoc = existingWithdrawal.docs[0]
      const existingData = existingDoc.data() as WithdrawalRequest
      res.status(200).json({
        result: {
          requestId: existingDoc.id,
          childId: existingData.childId,
          familyId: existingData.familyId,
          deviceId: existingData.deviceId,
          status: existingData.status,
          requestedAt: existingData.requestedAt.toMillis(),
          expiresAt: existingData.expiresAt.toMillis(),
        },
      })
      return
    }

    // Create new withdrawal request
    const now = Date.now()
    const expiresAt = now + COOLING_PERIOD_MS

    const withdrawalData: WithdrawalRequest = {
      childId,
      familyId,
      agreementId,
      deviceId,
      status: 'pending',
      requestedAt: Timestamp.fromMillis(now),
      expiresAt: Timestamp.fromMillis(expiresAt),
    }

    const withdrawalRef = await db.collection('withdrawalRequests').add(withdrawalData)

    logger.info('Withdrawal request created', {
      requestId: withdrawalRef.id,
      childId,
      familyId,
      expiresAt: new Date(expiresAt).toISOString(),
    })

    // Create parent notification
    // Story 6.6 AC4: Parent is immediately notified
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (familyDoc.exists) {
      const familyData = familyDoc.data()
      const guardianIds = familyData?.guardians || []

      // Create notification for each guardian
      for (const guardianId of guardianIds) {
        await db.collection('notifications').add({
          userId: guardianId,
          familyId,
          type: 'withdrawal_requested',
          title: 'Consent Withdrawal Requested',
          message: `Your child has requested to withdraw consent for monitoring. You have 24 hours to discuss this as a family.`,
          childId,
          withdrawalRequestId: withdrawalRef.id,
          expiresAt: Timestamp.fromMillis(expiresAt),
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }

      // Update withdrawal request with notification timestamp
      await withdrawalRef.update({
        parentNotifiedAt: FieldValue.serverTimestamp(),
      })

      logger.info('Parent notifications sent', {
        requestId: withdrawalRef.id,
        guardianCount: guardianIds.length,
      })
    }

    res.status(200).json({
      result: {
        requestId: withdrawalRef.id,
        childId,
        familyId,
        deviceId,
        status: 'pending',
        requestedAt: now,
        expiresAt,
      },
    })
  } catch (error) {
    logger.error('Failed to initiate withdrawal', { error })
    res.status(500).json({
      error: { code: 'internal', message: 'Failed to initiate withdrawal request' },
    })
  }
})
