/**
 * Scheduled Withdrawal Execution Function
 * Story 6.6: Consent Withdrawal Handling
 *
 * Runs every 15 minutes to execute expired withdrawal requests.
 *
 * Key Design Decisions:
 * 1. Poll-based: Checks for expired pending withdrawals at regular intervals
 * 2. Atomic: Each withdrawal is processed in a transaction
 * 3. Notification: Parents are notified when withdrawal is executed
 * 4. Agreement Update: Active agreement is marked as withdrawn
 *
 * Follows Cloud Functions Template pattern:
 * - Scheduled trigger (no HTTP)
 * - Admin SDK (bypasses security rules)
 * - Logging without PII
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

/**
 * Batch size for processing expired withdrawals.
 * Withdrawals should be rare, so small batches are fine.
 */
const BATCH_SIZE = 50

/**
 * Withdrawal request document structure
 */
interface WithdrawalRequest {
  childId: string
  familyId: string
  agreementId: string
  deviceId: string
  status: 'pending' | 'cancelled' | 'executed'
  requestedAt: Timestamp
  expiresAt: Timestamp
  cancelledAt?: Timestamp
  executedAt?: Timestamp
  parentNotifiedAt?: Timestamp
}

/**
 * Execute a single withdrawal request.
 *
 * Story 6.6 AC7: After cooling period, execute the withdrawal
 * - Update withdrawal status to 'executed'
 * - Mark active agreement as 'withdrawn'
 * - Notify parents of the execution
 *
 * @param requestId - Withdrawal request document ID
 * @param data - Withdrawal request data
 * @returns true if execution succeeded, false if failed
 */
async function executeWithdrawal(requestId: string, data: WithdrawalRequest): Promise<boolean> {
  const db = getFirestore()

  try {
    // Use a transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
      // 1. Update withdrawal request status
      const withdrawalRef = db.collection('withdrawalRequests').doc(requestId)
      transaction.update(withdrawalRef, {
        status: 'executed',
        executedAt: FieldValue.serverTimestamp(),
      })

      // 2. Update active agreement status to withdrawn
      const agreementRef = db.collection('activeAgreements').doc(data.agreementId)
      const agreementDoc = await transaction.get(agreementRef)

      if (agreementDoc.exists) {
        transaction.update(agreementRef, {
          status: 'withdrawn',
          withdrawnAt: FieldValue.serverTimestamp(),
          withdrawnByChildId: data.childId,
          withdrawalRequestId: requestId,
        })
      }

      // 3. Update device consent status
      const deviceRef = db
        .collection('families')
        .doc(data.familyId)
        .collection('devices')
        .doc(data.deviceId)
      const deviceDoc = await transaction.get(deviceRef)

      if (deviceDoc.exists) {
        transaction.update(deviceRef, {
          consentStatus: 'withdrawn',
          consentWithdrawnAt: FieldValue.serverTimestamp(),
        })
      }
    })

    // 4. Create notifications for parents (outside transaction for performance)
    const familyDoc = await db.collection('families').doc(data.familyId).get()
    if (familyDoc.exists) {
      const familyData = familyDoc.data()
      const guardianIds = familyData?.guardians || []

      // Create notification for each guardian
      const batch = db.batch()
      for (const guardianId of guardianIds) {
        const notificationRef = db.collection('notifications').doc()
        batch.set(notificationRef, {
          userId: guardianId,
          familyId: data.familyId,
          type: 'withdrawal_executed',
          title: 'Consent Withdrawal Complete',
          message: `Your child's consent withdrawal request has been processed. Monitoring has been stopped for this device.`,
          childId: data.childId,
          withdrawalRequestId: requestId,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        })
      }
      await batch.commit()

      logger.info('Parent notifications sent for executed withdrawal', {
        requestId,
        guardianCount: guardianIds.length,
      })
    }

    logger.info('Withdrawal executed successfully', {
      requestId,
      childId: data.childId,
      agreementId: data.agreementId,
    })

    return true
  } catch (error) {
    logger.error('Withdrawal execution failed', {
      requestId,
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorCode: (error as { code?: string }).code || 'UNKNOWN',
    })
    return false
  }
}

/**
 * Scheduled function to execute expired withdrawal requests.
 *
 * Story 6.6 AC7: Runs every 15 minutes to check for expired withdrawals
 * where expiresAt < now and status == 'pending'.
 *
 * After the 24-hour cooling period expires:
 * 1. Mark withdrawal as executed
 * 2. Mark active agreement as withdrawn
 * 3. Update device consent status
 * 4. Notify parents
 */
export const executeExpiredWithdrawals = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
    retryCount: 3,
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async (_event) => {
    const startTime = Date.now()
    let totalExecuted = 0
    let totalFailed = 0

    logger.info('Withdrawal execution check started')

    const db = getFirestore()
    const now = Timestamp.now()

    try {
      // Query for expired pending withdrawals
      const expiredQuery = await db
        .collection('withdrawalRequests')
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now)
        .limit(BATCH_SIZE)
        .get()

      if (expiredQuery.empty) {
        logger.info('No expired withdrawals to process')
        return
      }

      logger.info('Processing expired withdrawals', {
        count: expiredQuery.size,
      })

      // Process each expired withdrawal
      for (const doc of expiredQuery.docs) {
        const data = doc.data() as WithdrawalRequest
        const success = await executeWithdrawal(doc.id, data)

        if (success) {
          totalExecuted++
        } else {
          totalFailed++
        }
      }

      const durationMs = Date.now() - startTime

      logger.info('Withdrawal execution check completed', {
        totalExecuted,
        totalFailed,
        durationMs,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime

      logger.error('Withdrawal execution check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalExecuted,
        totalFailed,
        durationMs,
      })

      // Re-throw to trigger retry
      throw error
    }
  }
)
