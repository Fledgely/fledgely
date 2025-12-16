import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { AGREEMENT_PROPOSAL_TIME_LIMITS } from '@fledgely/contracts'

/**
 * Scheduled Cloud Function: expireStaleAgreementProposals
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval
 *
 * Runs every hour to check for:
 * 1. Pending proposals that have exceeded the 14-day response window
 * 2. Awaiting signatures proposals that have exceeded the 30-day signature window
 *
 * Updates expired proposals to 'expired' status.
 *
 * Security invariants:
 * 1. Only updates proposals in 'pending' or 'awaiting_signatures' status
 * 2. Only updates proposals where expiresAt/signatureDeadline has passed
 * 3. Logs all expirations for audit trail
 */
export const expireStaleAgreementProposals = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
  },
  async () => {
    const db = getFirestore()
    const now = new Date()

    console.log('[expireStaleAgreementProposals] Starting scan for expired proposals', {
      timestamp: now.toISOString(),
    })

    try {
      let totalExpiredCount = 0

      // 1. Expire pending proposals that exceeded 14-day response window
      const expiredPendingSnapshot = await db
        .collectionGroup('agreementChangeProposals')
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now)
        .get()

      if (!expiredPendingSnapshot.empty) {
        console.log(
          `[expireStaleAgreementProposals] Found ${expiredPendingSnapshot.size} expired pending proposals`
        )

        const pendingBatch = db.batch()

        for (const doc of expiredPendingSnapshot.docs) {
          pendingBatch.update(doc.ref, {
            status: 'expired',
            expiredAt: FieldValue.serverTimestamp(),
            expiryReason: 'response_window_exceeded',
          })
          totalExpiredCount++

          console.log('[expireStaleAgreementProposals] Marking pending proposal as expired', {
            proposalId: doc.id,
            childId: doc.data().childId,
            changeType: doc.data().changeType,
            proposedBy: doc.data().proposedBy,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? 'unknown',
          })
        }

        await pendingBatch.commit()
      }

      // 2. Expire awaiting_signatures proposals that exceeded 30-day signature window
      const expiredSignatureSnapshot = await db
        .collectionGroup('agreementChangeProposals')
        .where('status', '==', 'awaiting_signatures')
        .where('signatureDeadline', '<=', now)
        .get()

      if (!expiredSignatureSnapshot.empty) {
        console.log(
          `[expireStaleAgreementProposals] Found ${expiredSignatureSnapshot.size} expired signature collection proposals`
        )

        const signatureBatch = db.batch()

        for (const doc of expiredSignatureSnapshot.docs) {
          signatureBatch.update(doc.ref, {
            status: 'expired',
            expiredAt: FieldValue.serverTimestamp(),
            expiryReason: 'signature_window_exceeded',
          })
          totalExpiredCount++

          console.log(
            '[expireStaleAgreementProposals] Marking awaiting_signatures proposal as expired',
            {
              proposalId: doc.id,
              childId: doc.data().childId,
              changeType: doc.data().changeType,
              proposedBy: doc.data().proposedBy,
              approvedAt: doc.data().approvedAt?.toDate?.()?.toISOString() ?? 'unknown',
            }
          )
        }

        await signatureBatch.commit()
      }

      if (totalExpiredCount === 0) {
        console.log('[expireStaleAgreementProposals] No expired proposals found')
      } else {
        console.log('[expireStaleAgreementProposals] Completed', {
          totalExpiredCount,
          pendingExpired: expiredPendingSnapshot.size,
          signatureExpired: expiredSignatureSnapshot.size,
          timestamp: new Date().toISOString(),
        })
      }

      // TODO: Task 4 - Add notification on proposal expiry
      // This would trigger notifications to all parties about the expired proposal
    } catch (error) {
      console.error('[expireStaleAgreementProposals] Error expiring proposals:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
      throw error
    }
  }
)
