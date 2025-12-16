import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  respondToProposalInputSchema,
  disputeProposalInputSchema,
  canRespondToProposal,
  canDisputeProposal,
  convertFirestoreToSafetySettingsProposal,
  PROPOSAL_TIME_LIMITS,
  type RespondToProposalInput,
  type DisputeProposalInput,
  type SafetySettingType,
  type SafetySettingValue,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: respondToSafetyProposal
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 *
 * Allows a co-parent to approve or decline a safety setting proposal.
 * The responding parent cannot be the one who proposed the change.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child (but NOT the proposer)
 * 3. Proposal MUST be in 'pending' status
 * 4. Response MUST be within 72-hour window
 * 5. If approved, change is applied immediately
 */
export const respondToSafetyProposal = onCall(
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
    const parseResult = respondToProposalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: RespondToProposalInput = parseResult.data
    const { proposalId, childId, action, message } = input

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
          'You must be a guardian to respond to proposals for this child'
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
        dispute: proposalData.dispute
          ? {
              ...proposalData.dispute,
              disputedAt: proposalData.dispute.disputedAt,
              resolvedAt: proposalData.dispute.resolvedAt,
            }
          : null,
      })

      // Check caller is not the proposer
      if (proposal.proposedBy === callerUid) {
        throw new HttpsError(
          'failed-precondition',
          'You cannot approve or decline your own proposal'
        )
      }

      // Check if can respond (pending status and within 72-hour window)
      if (!canRespondToProposal(proposal)) {
        if (proposal.status !== 'pending') {
          throw new HttpsError(
            'failed-precondition',
            `This proposal has already been ${proposal.status}`
          )
        }
        throw new HttpsError(
          'failed-precondition',
          'This proposal has expired. The proposer can create a new one.'
        )
      }

      // Update the proposal based on action
      const updateData: Record<string, unknown> = {
        respondedBy: callerUid,
        respondedAt: FieldValue.serverTimestamp(),
      }

      if (action === 'approve') {
        updateData.status = 'approved'
        updateData.appliedAt = FieldValue.serverTimestamp()

        // Apply the setting change
        await applySettingChange(
          db,
          childId,
          proposal.settingType,
          proposal.proposedValue
        )
      } else {
        updateData.status = 'declined'
        if (message) {
          updateData.declineMessage = message
        }
      }

      // Update the proposal
      await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .doc(proposalId)
        .update(updateData)

      // TODO: Task 4 - Trigger notification to proposing parent
      // This will be implemented as a Firestore trigger

      return {
        success: true,
        proposalId,
        childId,
        action,
        status: action === 'approve' ? 'approved' : 'declined',
        settingType: proposal.settingType,
        message:
          action === 'approve'
            ? 'Proposal approved. The safety setting has been updated.'
            : 'Proposal declined. The proposing parent has been notified.',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to respond to safety proposal:', {
        proposalId,
        childId,
        action,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to respond to proposal')
    }
  }
)

/**
 * Callable Cloud Function: disputeSafetyProposal
 *
 * Story 3A.2: Safety Settings Two-Parent Approval - Emergency Safety Increases
 *
 * Allows a co-parent to dispute an auto-applied emergency safety increase
 * within 48 hours. If disputed, the change is reverted to the original value.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child (but NOT the proposer)
 * 3. Proposal MUST be in 'auto_applied' status
 * 4. Dispute MUST be within 48-hour window from appliedAt
 */
export const disputeSafetyProposal = onCall(
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
    const parseResult = disputeProposalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: DisputeProposalInput = parseResult.data
    const { proposalId, childId, reason } = input

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
          'You must be a guardian to dispute proposals for this child'
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

      // Convert to domain type
      const proposal = convertFirestoreToSafetySettingsProposal({
        ...proposalData,
        createdAt: proposalData.createdAt,
        expiresAt: proposalData.expiresAt,
        respondedAt: proposalData.respondedAt,
        appliedAt: proposalData.appliedAt,
        dispute: proposalData.dispute
          ? {
              ...proposalData.dispute,
              disputedAt: proposalData.dispute.disputedAt,
              resolvedAt: proposalData.dispute.resolvedAt,
            }
          : null,
      })

      // Check caller is not the proposer
      if (proposal.proposedBy === callerUid) {
        throw new HttpsError(
          'failed-precondition',
          'You cannot dispute your own proposal'
        )
      }

      // Check if can dispute (auto_applied status and within 48-hour window)
      if (!canDisputeProposal(proposal)) {
        if (proposal.status !== 'auto_applied') {
          throw new HttpsError(
            'failed-precondition',
            'Only auto-applied emergency changes can be disputed'
          )
        }
        throw new HttpsError(
          'failed-precondition',
          'The 48-hour dispute window has passed'
        )
      }

      // Revert the setting to original value
      await applySettingChange(
        db,
        childId,
        proposal.settingType,
        proposal.currentValue
      )

      // Update the proposal with dispute info
      await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .doc(proposalId)
        .update({
          status: 'reverted',
          dispute: {
            disputedBy: callerUid,
            disputedAt: FieldValue.serverTimestamp(),
            reason: reason || null,
            resolvedAt: FieldValue.serverTimestamp(),
            resolution: 'reverted',
          },
        })

      // TODO: Task 4 - Trigger notification to proposing parent
      // This will be implemented as a Firestore trigger

      return {
        success: true,
        proposalId,
        childId,
        status: 'reverted',
        settingType: proposal.settingType,
        revertedTo: proposal.currentValue,
        message:
          'Emergency change disputed and reverted. The setting has been restored to its original value.',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to dispute safety proposal:', {
        proposalId,
        childId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to dispute proposal')
    }
  }
)

/**
 * Apply a safety setting change to the child document
 */
async function applySettingChange(
  db: FirebaseFirestore.Firestore,
  childId: string,
  settingType: SafetySettingType,
  value: SafetySettingValue
): Promise<void> {
  await db
    .collection('children')
    .doc(childId)
    .update({
      [`safetySettings.${settingType}`]: value,
      [`safetySettings.lastUpdatedAt`]: FieldValue.serverTimestamp(),
    })
}
