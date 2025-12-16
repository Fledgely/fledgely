import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  cancelCoolingPeriodInputSchema,
  convertFirestoreToSafetySettingsProposal,
  canCancelCoolingPeriod,
  type CancelCoolingPeriodInput,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: cancelCoolingPeriod
 *
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 *
 * Allows either guardian to cancel a pending safety rule change during its
 * 48-hour cooling period. When cancelled, the change does NOT take effect
 * and the original settings remain.
 *
 * AC #4: Either parent can cancel during cooling period (returns to previous setting)
 * AC #6: Cooling period cannot be bypassed, even with both parents requesting immediate effect
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Proposal MUST be in 'cooling_in_progress' status
 * 4. Cooling period MUST not have ended
 * 5. Change is NOT applied - original settings remain
 */
export const cancelCoolingPeriod = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = cancelCoolingPeriodInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: CancelCoolingPeriodInput = parseResult.data
    const { proposalId, childId } = input

    const db = getFirestore()

    try {
      // Verify caller is a guardian of the child
      const childDoc = await db.collection('children').doc(childId).get()

      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found')
      }

      const childData = childDoc.data()
      if (!childData) {
        throw new HttpsError('not-found', 'Child data not found')
      }

      // Check if caller is a guardian
      const guardians = childData.guardians || []
      const isGuardian = guardians.some((g: { uid: string }) => g.uid === callerUid)

      if (!isGuardian) {
        throw new HttpsError(
          'permission-denied',
          'You must be a guardian to cancel cooling periods for this child'
        )
      }

      // Get the proposal
      const proposalDoc = await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .doc(proposalId)
        .get()

      if (!proposalDoc.exists) {
        throw new HttpsError('not-found', 'Proposal not found')
      }

      const proposalData = proposalDoc.data()
      if (!proposalData) {
        throw new HttpsError('not-found', 'Proposal data not found')
      }

      // Convert to domain type for helper functions
      const proposal = convertFirestoreToSafetySettingsProposal({
        ...proposalData,
        createdAt: proposalData.createdAt,
        expiresAt: proposalData.expiresAt,
        respondedAt: proposalData.respondedAt,
        appliedAt: proposalData.appliedAt,
        coolingPeriod: proposalData.coolingPeriod
          ? {
              ...proposalData.coolingPeriod,
              startsAt: proposalData.coolingPeriod.startsAt,
              endsAt: proposalData.coolingPeriod.endsAt,
              cancelledAt: proposalData.coolingPeriod.cancelledAt,
            }
          : null,
        dispute: proposalData.dispute
          ? {
              ...proposalData.dispute,
              disputedAt: proposalData.dispute.disputedAt,
              resolvedAt: proposalData.dispute.resolvedAt,
            }
          : null,
      })

      // Check if cancellation is allowed
      if (!canCancelCoolingPeriod(proposal)) {
        if (proposal.status !== 'cooling_in_progress') {
          throw new HttpsError(
            'failed-precondition',
            `Cannot cancel: proposal is in '${proposal.status}' status, not 'cooling_in_progress'`
          )
        }
        if (!proposal.coolingPeriod) {
          throw new HttpsError(
            'failed-precondition',
            'Cannot cancel: proposal has no cooling period data'
          )
        }
        // Cooling period has ended
        throw new HttpsError(
          'failed-precondition',
          'The cooling period has ended. The change has been applied.'
        )
      }

      // Cancel the cooling period
      const now = new Date()
      await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .doc(proposalId)
        .update({
          status: 'cooling_cancelled',
          'coolingPeriod.cancelledBy': callerUid,
          'coolingPeriod.cancelledAt': Timestamp.fromDate(now),
        })

      // Note: The change is NOT applied - original settings remain in place
      // No need to call applySettingChange or revert anything

      // TODO: Task 9 - Trigger notification to other parent and child
      // This will be implemented when notification system is ready

      return {
        success: true,
        proposalId,
        childId,
        status: 'cooling_cancelled',
        settingType: proposal.settingType,
        message:
          'Cooling period cancelled. The proposed change will not take effect. Original settings remain in place.',
        cancelledAt: now.toISOString(),
        cancelledBy: callerUid,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to cancel cooling period:', {
        proposalId,
        childId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to cancel cooling period')
    }
  }
)
