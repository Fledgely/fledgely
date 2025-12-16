import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  createSafetySettingsProposalInputSchema,
  isEmergencySafetyIncrease,
  calculateProposalExpiry,
  canRepropose,
  PROPOSAL_RATE_LIMIT,
  PROPOSAL_TIME_LIMITS,
  type CreateSafetySettingsProposalInput,
  type SafetySettingsProposal,
  type SafetySettingType,
  type SafetySettingValue,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: proposeSafetySettingChange
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 *
 * Creates a proposal for changing a safety setting in shared custody families.
 * Changes are not applied immediately - the other parent must approve within 72 hours.
 *
 * Emergency safety increases (more restrictive) are auto-applied but can be
 * disputed within 48 hours.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Child MUST have requiresSharedCustodySafeguards = true for dual-approval
 * 4. Rate limited to 10 proposals per guardian per hour
 * 5. Declined proposals have 7-day cooldown before re-proposal
 * 6. Proposals are immutable audit trail entries
 */
export const proposeSafetySettingChange = onCall(
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
    const parseResult = createSafetySettingsProposalInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input: CreateSafetySettingsProposalInput = parseResult.data
    const { childId, settingType, proposedValue } = input

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
          'You must be a guardian to propose changes for this child'
        )
      }

      // Check if shared custody safeguards are required
      const requiresSafeguards = childData.requiresSharedCustodySafeguards === true

      if (!requiresSafeguards) {
        // For non-shared custody, changes apply immediately
        // Return a different response indicating no dual-approval needed
        return {
          success: true,
          dualApprovalRequired: false,
          message: 'This child does not require shared custody safeguards. Change can be applied directly.',
        }
      }

      // Rate limit check: count proposals from this guardian in the last hour
      const oneHourAgo = new Date(Date.now() - PROPOSAL_RATE_LIMIT.WINDOW_MS)
      const recentProposalsSnapshot = await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .where('proposedBy', '==', callerUid)
        .where('createdAt', '>=', oneHourAgo)
        .count()
        .get()

      const recentCount = recentProposalsSnapshot.data().count
      if (recentCount >= PROPOSAL_RATE_LIMIT.MAX_PROPOSALS_PER_HOUR) {
        throw new HttpsError(
          'resource-exhausted',
          'You have made too many proposals. Please wait an hour.'
        )
      }

      // Check for 7-day cooldown on declined proposals
      const declinedProposalsSnapshot = await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .where('settingType', '==', settingType)
        .where('proposedBy', '==', callerUid)
        .where('status', '==', 'declined')
        .orderBy('respondedAt', 'desc')
        .limit(1)
        .get()

      if (!declinedProposalsSnapshot.empty) {
        const declinedProposal = declinedProposalsSnapshot.docs[0].data()
        const respondedAt = declinedProposal.respondedAt?.toDate()

        if (respondedAt) {
          const cooldownEnd = new Date(respondedAt.getTime() + PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS)
          if (new Date() < cooldownEnd) {
            const daysRemaining = Math.ceil(
              (cooldownEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            )
            throw new HttpsError(
              'failed-precondition',
              `This setting was recently declined. Please wait ${daysRemaining} more day(s) before proposing again.`
            )
          }
        }
      }

      // Get current value for the setting
      // Safety settings are stored in the child's safetySettings subcollection or document
      const currentValue = await getCurrentSettingValue(db, childId, settingType)

      // Check if this is an emergency safety increase
      const isEmergency = isEmergencySafetyIncrease(settingType, currentValue, proposedValue)

      // Generate proposal ID
      const proposalId = db.collection('children').doc().id
      const now = new Date()
      const expiresAt = calculateProposalExpiry(now)

      // Determine initial status
      const initialStatus = isEmergency ? 'auto_applied' : 'pending'

      // Create the proposal
      const proposal = {
        id: proposalId,
        childId,
        proposedBy: callerUid,
        settingType,
        currentValue,
        proposedValue,
        status: initialStatus,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isEmergencyIncrease: isEmergency,
        respondedBy: null,
        respondedAt: null,
        declineMessage: null,
        appliedAt: isEmergency ? FieldValue.serverTimestamp() : null,
        dispute: null,
      }

      // Store in child's safetySettingsProposals subcollection
      await db
        .collection('children')
        .doc(childId)
        .collection('safetySettingsProposals')
        .doc(proposalId)
        .set(proposal)

      // If emergency increase, also apply the change immediately
      if (isEmergency) {
        await applySettingChange(db, childId, settingType, proposedValue)
      }

      // TODO: Task 4 - Trigger notification to other parent(s)
      // This will be implemented as a Firestore trigger in a separate file

      return {
        success: true,
        dualApprovalRequired: true,
        proposalId,
        childId,
        settingType,
        currentValue,
        proposedValue,
        status: initialStatus,
        isEmergencyIncrease: isEmergency,
        expiresAt: expiresAt.toISOString(),
        message: isEmergency
          ? 'Emergency safety increase applied immediately. Other parent has 48 hours to dispute.'
          : 'Proposal created. Waiting for co-parent approval (72-hour window).',
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      console.error('Failed to create safety setting proposal:', {
        childId,
        settingType,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      throw new HttpsError('internal', 'Failed to create proposal')
    }
  }
)

/**
 * Get the current value for a safety setting
 */
async function getCurrentSettingValue(
  db: FirebaseFirestore.Firestore,
  childId: string,
  settingType: SafetySettingType
): Promise<SafetySettingValue> {
  // Safety settings can be stored in different ways:
  // 1. In the child document directly
  // 2. In a safetySettings subcollection/document

  const childDoc = await db.collection('children').doc(childId).get()
  const childData = childDoc.data()

  // Try to get from child document's safetySettings field
  const safetySettings = childData?.safetySettings || {}

  // Map setting types to their storage keys and defaults
  const settingDefaults: Record<SafetySettingType, SafetySettingValue> = {
    monitoring_interval: 30, // 30 minutes default
    retention_period: 7, // 7 days default
    age_restriction: 13, // Age 13+ default
    screen_time_daily: 180, // 3 hours default
    screen_time_per_app: 60, // 1 hour default
    bedtime_start: 1320, // 10 PM (22 * 60)
    bedtime_end: 420, // 7 AM (7 * 60)
    crisis_allowlist: '', // Empty string default
  }

  // Return current value or default
  return safetySettings[settingType] ?? settingDefaults[settingType]
}

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
