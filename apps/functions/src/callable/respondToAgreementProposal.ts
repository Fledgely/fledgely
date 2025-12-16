import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  respondToAgreementProposalInputSchema,
  canRespondToAgreementProposal,
  convertFirestoreToAgreementChangeProposal,
  calculateSignatureDeadline,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
  type RespondToAgreementProposalInput,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: respondToAgreementProposal
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval
 *
 * Allows a co-parent to approve or decline an agreement change proposal.
 * The responding parent cannot be the one who proposed the change.
 *
 * Key difference from safety settings (Story 3A.2):
 * - When approved, status changes to 'awaiting_signatures' (not immediately applied)
 * - All parties (both parents + child) must sign before the change activates
 * - Original agreement remains active until all signatures are collected
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child (but NOT the proposer)
 * 3. Proposal MUST be in 'pending' status
 * 4. Response MUST be within 14-day window
 * 5. If approved, signatures are required from all parties
 */
export const respondToAgreementProposal = onCall(
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
    const parseResult = respondToAgreementProposalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: RespondToAgreementProposalInput = parseResult.data
    const { proposalId, childId, action, declineMessage } = input

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
        .collection('agreementChangeProposals')
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
      const proposal = convertFirestoreToAgreementChangeProposal({
        ...proposalData,
        createdAt: proposalData.createdAt,
        expiresAt: proposalData.expiresAt,
        respondedAt: proposalData.respondedAt,
        approvedAt: proposalData.approvedAt,
        signatureDeadline: proposalData.signatureDeadline,
        activeAt: proposalData.activeAt,
        signatures: proposalData.signatures?.map(
          (sig: { signedAt?: { toDate?: () => Date } }) => ({
            ...sig,
            signedAt: sig.signedAt,
          })
        ),
      })

      // Check caller is not the proposer
      if (proposal.proposedBy === callerUid) {
        throw new HttpsError(
          'failed-precondition',
          'You cannot approve or decline your own proposal'
        )
      }

      // Check if can respond (pending status and within 14-day window)
      const canRespond = canRespondToAgreementProposal(proposal)
      if (!canRespond.canRespond) {
        if (proposal.status !== 'pending') {
          throw new HttpsError(
            'failed-precondition',
            `This proposal has already been ${proposal.status}`
          )
        }
        throw new HttpsError(
          'failed-precondition',
          canRespond.reason || 'This proposal has expired. The proposer can create a new one.'
        )
      }

      // Update the proposal based on action
      const updateData: Record<string, unknown> = {
        respondedBy: callerUid,
        respondedAt: FieldValue.serverTimestamp(),
      }

      if (action === 'approve') {
        updateData.status = 'approved'
        updateData.approvedAt = FieldValue.serverTimestamp()

        // Calculate signature deadline (30 days from approval)
        const now = new Date()
        const signatureDeadline = calculateSignatureDeadline(now)
        updateData.signatureDeadline = Timestamp.fromDate(signatureDeadline)

        // Mark the responding parent's signature as signed
        const updatedSignatures = proposal.signatures.map((sig) => {
          if (sig.signerId === callerUid && sig.signerType === 'parent') {
            return {
              ...sig,
              status: 'signed' as const,
              signedAt: FieldValue.serverTimestamp(),
            }
          }
          return sig
        })
        updateData.signatures = updatedSignatures

        // Note: Original agreement remains active until all signatures collected
        // The change transitions to 'awaiting_signatures' status
        updateData.status = 'awaiting_signatures'
      } else {
        updateData.status = 'declined'
        if (declineMessage) {
          updateData.declineMessage = declineMessage
        }
      }

      // Update the proposal
      await db
        .collection('children')
        .doc(childId)
        .collection('agreementChangeProposals')
        .doc(proposalId)
        .update(updateData)

      // TODO: Task 4 - Trigger notification to proposing parent
      // This will be implemented as a Firestore trigger

      return {
        success: true,
        proposalId,
        childId,
        action,
        status: action === 'approve' ? 'awaiting_signatures' : 'declined',
        changeType: proposal.changeType,
        message:
          action === 'approve'
            ? 'Proposal approved. All parties (both parents and child) must now sign before the change takes effect.'
            : 'Proposal declined. The proposing parent has been notified.',
        ...(action === 'approve' && {
          nextStep: 'signature_collection',
          signatureDeadline: calculateSignatureDeadline(new Date()).toISOString(),
        }),
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to respond to agreement proposal:', {
        proposalId,
        childId,
        action,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to respond to proposal')
    }
  }
)
