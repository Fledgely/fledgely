import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { PROPOSAL_TIME_LIMITS } from '@fledgely/contracts'

/**
 * Scheduled Cloud Function: expireStaleProposals
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 *
 * Runs every hour to check for proposals that have exceeded the 72-hour response window.
 * Updates expired proposals to 'expired' status.
 *
 * Security invariants:
 * 1. Only updates proposals in 'pending' status
 * 2. Only updates proposals where expiresAt has passed
 * 3. Logs all expirations for audit trail
 */
export const expireStaleProposals = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
  },
  async () => {
    const db = getFirestore()
    const now = new Date()

    console.log('[expireStaleProposals] Starting scan for expired proposals', {
      timestamp: now.toISOString(),
    })

    try {
      // Get all children documents (proposals are in subcollections)
      // Using a collection group query for efficiency
      const expiredProposalsSnapshot = await db
        .collectionGroup('safetySettingsProposals')
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now)
        .get()

      if (expiredProposalsSnapshot.empty) {
        console.log('[expireStaleProposals] No expired proposals found')
        return
      }

      console.log(`[expireStaleProposals] Found ${expiredProposalsSnapshot.size} expired proposals`)

      // Batch update all expired proposals
      const batch = db.batch()
      let expiredCount = 0

      for (const doc of expiredProposalsSnapshot.docs) {
        batch.update(doc.ref, {
          status: 'expired',
          expiredAt: FieldValue.serverTimestamp(),
        })
        expiredCount++

        console.log('[expireStaleProposals] Marking proposal as expired', {
          proposalId: doc.id,
          childId: doc.data().childId,
          settingType: doc.data().settingType,
          proposedBy: doc.data().proposedBy,
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? 'unknown',
        })
      }

      await batch.commit()

      console.log('[expireStaleProposals] Completed', {
        expiredCount,
        timestamp: new Date().toISOString(),
      })

      // TODO: Task 4.3 - Add notification on proposal expiry
      // This would trigger notifications to both parents about the expired proposal
    } catch (error) {
      console.error('[expireStaleProposals] Error expiring proposals:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
      throw error
    }
  }
)
