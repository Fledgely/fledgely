import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  createAgreementChangeProposalInputSchema,
  canReproposeAgreementChange,
  calculateAgreementProposalExpiry,
  AGREEMENT_PROPOSAL_RATE_LIMIT,
  AGREEMENT_PROPOSAL_TIME_LIMITS,
  type CreateAgreementChangeProposalInput,
  type AgreementChangeType,
  type AgreementChangeValue,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: proposeAgreementChange
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval
 *
 * Creates a proposal for changing a family agreement in shared custody families.
 * Changes require both parents to approve before the child can sign.
 *
 * Unlike safety settings (Story 3A.2), agreement changes:
 * - Have a 14-day approval window (vs 72 hours)
 * - Never auto-apply (always require dual-approval)
 * - Require signature collection after approval
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Child MUST have requiresSharedCustodySafeguards = true for dual-approval
 * 4. Rate limited to 10 proposals per guardian per hour
 * 5. Declined proposals have 7-day cooldown before re-proposal
 * 6. Proposals are immutable audit trail entries
 */
export const proposeAgreementChange = onCall(
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
    const parseResult = createAgreementChangeProposalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: CreateAgreementChangeProposalInput = parseResult.data
    const { childId, changeType, proposedValue, justification, modifiesProposalId } = input

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
          'You must be a guardian to propose agreement changes for this child'
        )
      }

      // Check if shared custody safeguards are required
      const requiresSafeguards = childData.requiresSharedCustodySafeguards === true

      if (!requiresSafeguards) {
        // For non-shared custody, changes can be applied directly
        // Return a different response indicating no dual-approval needed
        return {
          success: true,
          dualApprovalRequired: false,
          message:
            'This child does not require shared custody safeguards. Agreement change can be applied directly.',
        }
      }

      // Rate limit check: count proposals from this guardian in the last hour
      const oneHourAgo = new Date(Date.now() - AGREEMENT_PROPOSAL_RATE_LIMIT.WINDOW_MS)
      const recentProposalsSnapshot = await db
        .collection('children')
        .doc(childId)
        .collection('agreementChangeProposals')
        .where('proposedBy', '==', callerUid)
        .where('createdAt', '>=', oneHourAgo)
        .count()
        .get()

      const recentCount = recentProposalsSnapshot.data().count
      if (recentCount >= AGREEMENT_PROPOSAL_RATE_LIMIT.MAX_PROPOSALS_PER_HOUR) {
        throw new HttpsError(
          'resource-exhausted',
          'You have made too many proposals. Please wait an hour.'
        )
      }

      // Check for 7-day cooldown on declined proposals (unless modifying an existing proposal)
      if (!modifiesProposalId) {
        const declinedProposalsSnapshot = await db
          .collection('children')
          .doc(childId)
          .collection('agreementChangeProposals')
          .where('changeType', '==', changeType)
          .where('proposedBy', '==', callerUid)
          .where('status', '==', 'declined')
          .orderBy('respondedAt', 'desc')
          .limit(1)
          .get()

        if (!declinedProposalsSnapshot.empty) {
          const declinedProposal = declinedProposalsSnapshot.docs[0].data()
          const respondedAt = declinedProposal.respondedAt?.toDate()

          if (respondedAt) {
            const cooldownEnd = new Date(
              respondedAt.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS
            )
            if (new Date() < cooldownEnd) {
              const daysRemaining = Math.ceil(
                (cooldownEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
              )
              throw new HttpsError(
                'failed-precondition',
                `This change type was recently declined. Please wait ${daysRemaining} more day(s) before proposing again.`
              )
            }
          }
        }
      }

      // If this modifies an existing proposal, verify the original proposal
      let modifiesProposal = null
      if (modifiesProposalId) {
        const originalProposalDoc = await db
          .collection('children')
          .doc(childId)
          .collection('agreementChangeProposals')
          .doc(modifiesProposalId)
          .get()

        if (!originalProposalDoc.exists) {
          throw new HttpsError('not-found', 'Original proposal not found')
        }

        const originalProposalData = originalProposalDoc.data()
        if (originalProposalData?.status !== 'pending') {
          throw new HttpsError(
            'failed-precondition',
            'Can only modify pending proposals'
          )
        }

        // Verify the caller is NOT the original proposer (other parent must modify)
        if (originalProposalData?.proposedBy === callerUid) {
          throw new HttpsError(
            'failed-precondition',
            'You cannot modify your own proposal. Withdraw it and create a new one.'
          )
        }

        modifiesProposal = {
          id: modifiesProposalId,
          changeType: originalProposalData?.changeType,
        }

        // Mark the original proposal as 'modified'
        await db
          .collection('children')
          .doc(childId)
          .collection('agreementChangeProposals')
          .doc(modifiesProposalId)
          .update({
            status: 'modified',
            modifiedAt: FieldValue.serverTimestamp(),
            modifiedBy: callerUid,
          })
      }

      // Get current value for the agreement setting
      const currentValue = await getCurrentAgreementValue(db, childId, changeType)

      // Generate proposal ID
      const proposalId = db.collection('children').doc().id
      const now = new Date()
      const expiresAt = calculateAgreementProposalExpiry(now)

      // Get guardian UIDs for signature tracking
      const guardianUids = guardians.map((g: { uid: string }) => g.uid)

      // Create initial signatures array with all guardians as pending
      const signatures = guardianUids.map((uid: string) => ({
        signerId: uid,
        signerType: 'parent' as const,
        status: 'pending' as const,
        signedAt: null,
      }))

      // Add child as signer (pending)
      signatures.push({
        signerId: childId,
        signerType: 'child' as const,
        status: 'pending' as const,
        signedAt: null,
      })

      // Create the proposal
      const proposal = {
        id: proposalId,
        childId,
        proposedBy: callerUid,
        changeType,
        originalValue: currentValue,
        proposedValue,
        justification: justification || null,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        respondedBy: null,
        respondedAt: null,
        declineMessage: null,
        approvedAt: null,
        modifiesProposalId: modifiesProposalId || null,
        signatures,
        signatureDeadline: null, // Set when approved
        activeAt: null, // Set when all signatures collected
      }

      // Store in child's agreementChangeProposals subcollection
      await db
        .collection('children')
        .doc(childId)
        .collection('agreementChangeProposals')
        .doc(proposalId)
        .set(proposal)

      // TODO: Task 4 - Trigger notification to other parent(s)
      // This will be implemented as a Firestore trigger in a separate file

      return {
        success: true,
        dualApprovalRequired: true,
        proposalId,
        childId,
        changeType,
        originalValue: currentValue,
        proposedValue,
        status: 'pending',
        expiresAt: expiresAt.toISOString(),
        isModification: !!modifiesProposalId,
        modifiesProposalId: modifiesProposalId || null,
        message: modifiesProposalId
          ? 'Modification proposal created. The original proposal has been superseded.'
          : 'Proposal created. Waiting for co-parent approval (14-day window).',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to create agreement change proposal:', {
        childId,
        changeType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to create proposal')
    }
  }
)

/**
 * Get the current value for an agreement setting
 */
async function getCurrentAgreementValue(
  db: FirebaseFirestore.Firestore,
  childId: string,
  changeType: AgreementChangeType
): Promise<AgreementChangeValue> {
  // Agreement values can be stored in:
  // 1. The child document's agreement field
  // 2. A dedicated agreements subcollection

  const childDoc = await db.collection('children').doc(childId).get()
  const childData = childDoc.data()

  // Try to get from child document's agreement field
  const agreement = childData?.agreement || {}

  // Map change types to their storage keys and defaults
  const settingDefaults: Record<AgreementChangeType, AgreementChangeValue> = {
    terms: '', // Empty string default
    monitoring_rules: '', // Empty string default
    screen_time: 180, // 3 hours default (minutes)
    bedtime_schedule: '22:00', // 10 PM default
    app_restrictions: [], // Empty array default
    content_filters: 'moderate', // Moderate default
    consequences: '', // Empty string default
    rewards: '', // Empty string default
  }

  // Return current value or default
  return agreement[changeType] ?? settingDefaults[changeType]
}
