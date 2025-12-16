import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  signAgreementChangeInputSchema,
  canSignAgreementChange,
  allSignaturesCollected,
  convertFirestoreToAgreementChangeProposal,
  type SignAgreementChangeInput,
  type AgreementChangeType,
  type AgreementChangeValue,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: signAgreementChange
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval - Signature Collection
 *
 * Allows parents and child to sign an approved agreement change proposal.
 * The signing order is enforced:
 * 1. Both parents must sign (in any order)
 * 2. Child can only sign AFTER both parents have signed
 * 3. Once all signatures are collected, the change activates
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be either a guardian OR the child (for child signature)
 * 3. Proposal MUST be in 'awaiting_signatures' status
 * 4. Signatures MUST be within 30-day window from approval
 * 5. Child cannot sign until both parents have signed
 * 6. Original agreement remains active until all signatures collected
 */
export const signAgreementChange = onCall(
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
    const parseResult = signAgreementChangeInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: SignAgreementChangeInput = parseResult.data
    const { proposalId, childId, acknowledgment } = input

    const db = getFirestore()

    try {
      // Get the child document
      const childDoc = await db.collection('children').doc(childId).get()

      if (!childDoc.exists) {
        throw new HttpsError('not-found', 'Child not found')
      }

      const childData = childDoc.data()
      if (!childData) {
        throw new HttpsError('not-found', 'Child data not found')
      }

      // Determine if caller is a guardian or the child
      const guardians = childData.guardians || []
      const isGuardian = guardians.some((g: { uid: string }) => g.uid === callerUid)
      const isChild = childData.userId === callerUid || childId === callerUid

      if (!isGuardian && !isChild) {
        throw new HttpsError(
          'permission-denied',
          'You must be a guardian or the child to sign this agreement change'
        )
      }

      const signerType = isGuardian ? 'parent' : 'child'

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

      // Check if caller can sign
      const canSign = canSignAgreementChange(proposal, callerUid, signerType)
      if (!canSign.canSign) {
        throw new HttpsError(
          'failed-precondition',
          canSign.reason || 'You cannot sign this proposal at this time'
        )
      }

      // Verify acknowledgment text
      if (!acknowledgment || acknowledgment !== 'I agree to this change') {
        throw new HttpsError(
          'invalid-argument',
          'Please confirm by typing "I agree to this change"'
        )
      }

      // Update the signature
      const updatedSignatures = proposal.signatures.map((sig) => {
        if (sig.signerId === callerUid || (signerType === 'child' && sig.signerType === 'child')) {
          return {
            ...sig,
            status: 'signed' as const,
            signedAt: FieldValue.serverTimestamp(),
          }
        }
        return sig
      })

      const updateData: Record<string, unknown> = {
        signatures: updatedSignatures,
      }

      // Check if all signatures are now collected
      // We need to simulate the updated signatures to check
      const simulatedProposal = {
        ...proposal,
        signatures: proposal.signatures.map((sig) => {
          if (sig.signerId === callerUid || (signerType === 'child' && sig.signerType === 'child')) {
            return {
              ...sig,
              status: 'signed' as const,
              signedAt: new Date(),
            }
          }
          return sig
        }),
      }

      const allSigned = allSignaturesCollected(simulatedProposal)

      if (allSigned) {
        // All signatures collected - activate the change
        updateData.status = 'active'
        updateData.activeAt = FieldValue.serverTimestamp()

        // Apply the agreement change
        await applyAgreementChange(
          db,
          childId,
          proposal.changeType,
          proposal.proposedValue
        )
      }

      // Update the proposal
      await db
        .collection('children')
        .doc(childId)
        .collection('agreementChangeProposals')
        .doc(proposalId)
        .update(updateData)

      // TODO: Task 4 - Trigger notifications
      // This will be implemented as a Firestore trigger

      return {
        success: true,
        proposalId,
        childId,
        signedBy: callerUid,
        signerType,
        allSignaturesCollected: allSigned,
        status: allSigned ? 'active' : 'awaiting_signatures',
        changeType: proposal.changeType,
        message: allSigned
          ? 'All signatures collected! The agreement change is now active.'
          : `Signature recorded. Waiting for remaining signatures.`,
        ...(allSigned && {
          activatedAt: new Date().toISOString(),
        }),
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to sign agreement change:', {
        proposalId,
        childId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to sign agreement change')
    }
  }
)

/**
 * Apply an agreement change to the child document
 */
async function applyAgreementChange(
  db: FirebaseFirestore.Firestore,
  childId: string,
  changeType: AgreementChangeType,
  value: AgreementChangeValue
): Promise<void> {
  await db
    .collection('children')
    .doc(childId)
    .update({
      [`agreement.${changeType}`]: value,
      [`agreement.lastUpdatedAt`]: FieldValue.serverTimestamp(),
    })
}
