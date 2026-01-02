/**
 * Co-Parent Proposal Approval Service - Story 3A.3
 *
 * Service for managing two-parent approval workflow for agreement changes
 * in shared custody families.
 *
 * AC1: Pending Co-Parent State
 * AC4: Co-Parent Response Options
 * AC5: Proposal Expiration (14 days)
 */

import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { AgreementProposal } from '@fledgely/shared'
import {
  notifyProposerOfCoParentResponse,
  notifyProposerOfExpiration,
} from './agreementProposalService'

/** Co-parent approval status type */
export type CoParentApprovalStatus = 'pending' | 'approved' | 'declined'

// =============================================================================
// Constants
// =============================================================================

/** 14 days in milliseconds for co-parent approval expiration */
export const CO_PARENT_APPROVAL_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000

/** Messages for co-parent approval workflow */
export const CO_PARENT_APPROVAL_MESSAGES = {
  awaitingApproval: (coParentName: string) => `Waiting for ${coParentName} to review this proposal`,
  approved: (coParentName: string) => `${coParentName} approved this proposal`,
  declined: (coParentName: string, reason?: string | null) =>
    reason ? `${coParentName} declined: ${reason}` : `${coParentName} declined this proposal`,
  expired: 'This proposal expired before receiving co-parent approval',
  cannotSelfApprove: 'You cannot approve your own proposal',
  childCannotRespond: 'This proposal is waiting for both parents to approve',
}

// =============================================================================
// Types
// =============================================================================

export interface RequiresCoParentApprovalResult {
  required: boolean
  otherParentUid: string | null
  otherParentName: string | null
}

export interface ApproveAsCoParentParams {
  proposalId: string
  approverUid: string
  approverName: string
}

export interface DeclineAsCoParentParams {
  proposalId: string
  declinerUid: string
  declinerName: string
  reason?: string | null
}

export interface CoParentApprovalStatusResult {
  required: boolean
  status: CoParentApprovalStatus | null
  approvedByUid: string | null
  approvedAt: number | null
  declineReason: string | null
  expiresAt: number | null
  isExpired: boolean
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Check if a proposal requires co-parent approval based on child's custody arrangement.
 *
 * AC1: Shared custody families require two-parent approval
 */
export async function requiresCoParentApproval(
  childId: string,
  proposerUid: string
): Promise<RequiresCoParentApprovalResult> {
  const db = getFirestoreDb()

  // Get child document to check custody arrangement
  const childRef = doc(db, 'children', childId)
  const childSnap = await getDoc(childRef)

  if (!childSnap.exists()) {
    return { required: false, otherParentUid: null, otherParentName: null }
  }

  const childData = childSnap.data()
  const custodyType = childData?.custodyArrangement?.type

  // Only shared custody requires two-parent approval
  if (custodyType !== 'shared') {
    return { required: false, otherParentUid: null, otherParentName: null }
  }

  // Get other parent from guardians
  const guardians = childData?.guardians || []
  const otherGuardian = guardians.find(
    (g: { uid: string; displayName?: string }) => g.uid !== proposerUid
  )

  if (!otherGuardian) {
    return { required: false, otherParentUid: null, otherParentName: null }
  }

  return {
    required: true,
    otherParentUid: otherGuardian.uid,
    otherParentName: otherGuardian.displayName || null,
  }
}

/**
 * Approve a proposal as the co-parent.
 *
 * AC4: Other parent can approve the proposal
 */
export async function approveAsCoParent({
  proposalId,
  approverUid,
  approverName,
}: ApproveAsCoParentParams): Promise<void> {
  const db = getFirestoreDb()
  const proposalRef = doc(db, 'agreementProposals', proposalId)
  const proposalSnap = await getDoc(proposalRef)

  if (!proposalSnap.exists()) {
    throw new Error('Proposal not found')
  }

  const proposal = proposalSnap.data() as AgreementProposal

  // Validate proposer cannot self-approve
  if (proposal.proposerId === approverUid) {
    throw new Error(CO_PARENT_APPROVAL_MESSAGES.cannotSelfApprove)
  }

  // Validate proposal is in pending_coparent_approval status
  if (proposal.status !== 'pending_coparent_approval') {
    throw new Error('Proposal is not awaiting co-parent approval')
  }

  // Check for expiration
  if (proposal.expiresAt && proposal.expiresAt < Date.now()) {
    throw new Error(CO_PARENT_APPROVAL_MESSAGES.expired)
  }

  // Update proposal with approval
  await updateDoc(proposalRef, {
    status: 'pending', // Now awaiting child response
    coParentApprovalStatus: 'approved',
    coParentApprovedByUid: approverUid,
    coParentApprovedAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Story 3A.3 AC4: Notify proposer of co-parent approval
  await notifyProposerOfCoParentResponse({
    familyId: proposal.familyId,
    proposalId,
    proposerId: proposal.proposerId,
    coParentName: approverName,
    action: 'approved',
  })
}

/**
 * Decline a proposal as the co-parent.
 *
 * AC4: Other parent can decline the proposal
 */
export async function declineAsCoParent({
  proposalId,
  declinerUid,
  declinerName,
  reason = null,
}: DeclineAsCoParentParams): Promise<void> {
  const db = getFirestoreDb()
  const proposalRef = doc(db, 'agreementProposals', proposalId)
  const proposalSnap = await getDoc(proposalRef)

  if (!proposalSnap.exists()) {
    throw new Error('Proposal not found')
  }

  const proposal = proposalSnap.data() as AgreementProposal

  // Validate proposer cannot self-decline (although this would be "withdraw")
  if (proposal.proposerId === declinerUid) {
    throw new Error('You cannot decline your own proposal. Use withdraw instead.')
  }

  // Validate proposal is in pending_coparent_approval status
  if (proposal.status !== 'pending_coparent_approval') {
    throw new Error('Proposal is not awaiting co-parent approval')
  }

  // Update proposal with decline
  await updateDoc(proposalRef, {
    status: 'declined',
    coParentApprovalStatus: 'declined',
    coParentApprovedByUid: declinerUid,
    coParentApprovedAt: Date.now(),
    coParentDeclineReason: reason,
    respondedAt: Date.now(),
    updatedAt: Date.now(),
  })

  // Story 3A.3 AC4: Notify proposer of co-parent decline
  await notifyProposerOfCoParentResponse({
    familyId: proposal.familyId,
    proposalId,
    proposerId: proposal.proposerId,
    coParentName: declinerName,
    action: 'declined',
    declineReason: reason,
  })
}

/**
 * Get the co-parent approval status for a proposal.
 *
 * AC3: Pending changes visible to all family members
 */
export async function getCoParentApprovalStatus(
  proposalId: string
): Promise<CoParentApprovalStatusResult> {
  const db = getFirestoreDb()
  const proposalRef = doc(db, 'agreementProposals', proposalId)
  const proposalSnap = await getDoc(proposalRef)

  if (!proposalSnap.exists()) {
    throw new Error('Proposal not found')
  }

  const proposal = proposalSnap.data() as AgreementProposal

  const isExpired = proposal.expiresAt ? proposal.expiresAt < Date.now() : false

  return {
    required: proposal.coParentApprovalRequired,
    status: proposal.coParentApprovalStatus,
    approvedByUid: proposal.coParentApprovedByUid,
    approvedAt: proposal.coParentApprovedAt,
    declineReason: proposal.coParentDeclineReason,
    expiresAt: proposal.expiresAt,
    isExpired,
  }
}

/**
 * Check and update expired proposals.
 *
 * AC5: Changes expire after 14 days if not approved
 */
export async function checkAndExpireProposals(familyId: string): Promise<number> {
  const db = getFirestoreDb()
  const now = Date.now()

  // Query for proposals pending co-parent approval that have expired
  const proposalsRef = collection(db, 'agreementProposals')
  const q = query(
    proposalsRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending_coparent_approval'),
    where('coParentApprovalRequired', '==', true)
  )

  const snapshot = await getDocs(q)
  let expiredCount = 0

  for (const docSnap of snapshot.docs) {
    const proposal = docSnap.data() as AgreementProposal

    if (proposal.expiresAt && proposal.expiresAt < now) {
      await updateDoc(doc(db, 'agreementProposals', docSnap.id), {
        status: 'expired',
        updatedAt: now,
      })

      // Story 3A.3 AC5: Notify proposer of expiration
      await notifyProposerOfExpiration({
        familyId,
        proposalId: docSnap.id,
        proposerId: proposal.proposerId,
      })

      expiredCount++
    }
  }

  return expiredCount
}

/**
 * Get pending co-parent approval proposals for a parent.
 *
 * Returns proposals that are awaiting THIS parent's approval
 * (proposals created by the other parent).
 */
export async function getPendingCoParentApprovals(
  familyId: string,
  parentUid: string
): Promise<AgreementProposal[]> {
  const db = getFirestoreDb()

  // Query for proposals pending co-parent approval
  const proposalsRef = collection(db, 'agreementProposals')
  const q = query(
    proposalsRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending_coparent_approval'),
    where('coParentApprovalRequired', '==', true)
  )

  const snapshot = await getDocs(q)

  // Filter to only include proposals NOT created by this parent
  // (those are the ones this parent needs to approve)
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as AgreementProposal)
    .filter((p) => p.proposerId !== parentUid)
}

/**
 * Check if child can respond to a proposal.
 *
 * AC2: Child cannot sign until both parents have approved
 */
export function canChildRespond(proposal: AgreementProposal): boolean {
  // If co-parent approval is not required, child can respond
  if (!proposal.coParentApprovalRequired) {
    return true
  }

  // If co-parent approval is required, it must be approved
  return proposal.coParentApprovalStatus === 'approved'
}

/**
 * Get human-readable status message for co-parent approval.
 */
export function getCoParentStatusMessage(
  proposal: AgreementProposal,
  otherParentName: string
): string {
  if (!proposal.coParentApprovalRequired) {
    return ''
  }

  switch (proposal.coParentApprovalStatus) {
    case 'pending':
      return CO_PARENT_APPROVAL_MESSAGES.awaitingApproval(otherParentName)
    case 'approved':
      return CO_PARENT_APPROVAL_MESSAGES.approved(otherParentName)
    case 'declined':
      return CO_PARENT_APPROVAL_MESSAGES.declined(otherParentName, proposal.coParentDeclineReason)
    default:
      if (proposal.status === 'expired') {
        return CO_PARENT_APPROVAL_MESSAGES.expired
      }
      return ''
  }
}

/**
 * Calculate expiration date for a new proposal (14 days from now).
 */
export function calculateExpirationDate(): number {
  return Date.now() + CO_PARENT_APPROVAL_EXPIRY_MS
}

/**
 * Propose modifications to an existing proposal.
 *
 * AC4: Co-parent can propose modifications, which creates a new proposal
 * and withdraws the original.
 */
export async function proposeModification({
  originalProposalId,
  modifierUid,
  modifierName,
  modifiedChanges,
  reason,
}: {
  originalProposalId: string
  modifierUid: string
  modifierName: string
  modifiedChanges: unknown[]
  reason: string | null
}): Promise<string> {
  const db = getFirestoreDb()
  const originalRef = doc(db, 'agreementProposals', originalProposalId)
  const originalSnap = await getDoc(originalRef)

  if (!originalSnap.exists()) {
    throw new Error('Original proposal not found')
  }

  const original = originalSnap.data() as AgreementProposal

  // Withdraw the original proposal
  await updateDoc(originalRef, {
    status: 'withdrawn',
    updatedAt: Date.now(),
  })

  // Create a new proposal with the modifications
  const proposalsRef = collection(db, 'agreementProposals')
  const newProposalData = {
    familyId: original.familyId,
    childId: original.childId,
    agreementId: original.agreementId,
    proposedBy: 'parent',
    proposerId: modifierUid,
    proposerName: modifierName,
    changes: modifiedChanges,
    reason,
    status: 'pending_coparent_approval',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    respondedAt: null,
    version: (original.version || 1) + 1,
    proposalNumber: (original.proposalNumber || 0) + 1,
    coParentApprovalRequired: true,
    coParentApprovalStatus: 'pending',
    coParentApprovedByUid: null,
    coParentApprovedAt: null,
    coParentDeclineReason: null,
    expiresAt: calculateExpirationDate(),
  }

  const newDocRef = await addDoc(proposalsRef, newProposalData)
  return newDocRef.id
}

/**
 * Check if a specific proposal has expired.
 *
 * AC5: 14-day expiration check for individual proposals
 */
export async function checkProposalExpiration(proposalId: string): Promise<boolean> {
  const db = getFirestoreDb()
  const proposalRef = doc(db, 'agreementProposals', proposalId)
  const proposalSnap = await getDoc(proposalRef)

  if (!proposalSnap.exists()) {
    throw new Error('Proposal not found')
  }

  const proposal = proposalSnap.data() as AgreementProposal

  if (proposal.status !== 'pending_coparent_approval') {
    return false
  }

  if (!proposal.expiresAt) {
    return false
  }

  const isExpired = proposal.expiresAt < Date.now()

  if (isExpired) {
    await updateDoc(proposalRef, {
      status: 'expired',
      updatedAt: Date.now(),
    })

    // Story 3A.3 AC5: Notify proposer of expiration
    await notifyProposerOfExpiration({
      familyId: proposal.familyId,
      proposalId,
      proposerId: proposal.proposerId,
    })
  }

  return isExpired
}
