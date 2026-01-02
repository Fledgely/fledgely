/**
 * Agreement Proposal Service - Story 34.1, 34.2, 34.3, 34.5.1
 *
 * Handles proposal notifications, activity logging, and rejection pattern tracking.
 * Follows patterns from agreementChangeService.ts.
 *
 * Story 34.5.1: Child proposal rejection tracking integration.
 */

import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { AGREEMENT_PROPOSAL_MESSAGES, CHILD_PROPOSAL_MESSAGES } from '@fledgely/shared'
import {
  recordRejection,
  checkEscalationThreshold,
  triggerEscalation,
  incrementProposalCount,
} from '@fledgely/shared'

/**
 * Input for creating a proposal notification
 */
export interface ProposalNotificationInput {
  familyId: string
  childId: string
  proposalId: string
  proposerName: string
}

/**
 * Input for logging proposal activity
 */
export interface ProposalActivityInput {
  familyId: string
  proposalId: string
  proposerId: string
  proposerName: string
  proposerType: 'parent' | 'child'
  action: 'created' | 'withdrawn' | 'accepted' | 'declined'
  childName: string
}

/**
 * Create a notification for the child about a proposal.
 *
 * @param input - Notification input data
 * @returns The notification ID
 */
export async function createProposalNotification(
  input: ProposalNotificationInput
): Promise<string> {
  const db = getFirestoreDb()

  const notificationData = {
    familyId: input.familyId,
    recipientId: input.childId,
    type: 'agreement_proposal',
    title: 'Agreement Change Proposal',
    body: AGREEMENT_PROPOSAL_MESSAGES.childNotification(input.proposerName),
    data: {
      proposalId: input.proposalId,
      action: 'view_proposal',
    },
    read: false,
    createdAt: serverTimestamp(),
  }

  const notificationsRef = collection(db, 'notifications')
  const notificationDoc = await addDoc(notificationsRef, notificationData)

  return notificationDoc.id
}

/**
 * Log proposal activity to the family activity feed.
 *
 * @param input - Activity input data
 * @returns The activity log ID
 */
export async function logProposalActivity(input: ProposalActivityInput): Promise<string> {
  const db = getFirestoreDb()

  const actionDescriptions: Record<string, string> = {
    created: `${input.proposerName} proposed a change to the agreement with ${input.childName}`,
    withdrawn: `${input.proposerName} withdrew their proposal`,
    accepted: `${input.childName} accepted the proposal from ${input.proposerName}`,
    declined: `${input.childName} declined the proposal from ${input.proposerName}`,
  }

  const activityData = {
    familyId: input.familyId,
    type: `agreement_proposal_${input.action}`,
    actorId: input.proposerId,
    actorName: input.proposerName,
    actorType: input.proposerType,
    description: actionDescriptions[input.action],
    metadata: {
      proposalId: input.proposalId,
      action: input.action,
    },
    createdAt: serverTimestamp(),
  }

  const activityRef = collection(db, 'familyActivity')
  const activityDoc = await addDoc(activityRef, activityData)

  return activityDoc.id
}

/**
 * Input for creating parent notifications (child-initiated proposal)
 */
export interface ParentNotificationInput {
  familyId: string
  proposalId: string
  childName: string
}

/**
 * Create notifications for all guardians when a child submits a proposal.
 *
 * Story 34.2 AC4: All guardians in family receive notification
 *
 * @param input - Notification input data
 * @returns Array of notification IDs
 */
export async function createParentNotifications(input: ParentNotificationInput): Promise<string[]> {
  const db = getFirestoreDb()

  // Get all guardian UIDs from family document
  const familyRef = doc(db, 'families', input.familyId)
  const familySnapshot = await getDoc(familyRef)

  if (!familySnapshot.exists()) {
    throw new Error('Family not found')
  }

  const familyData = familySnapshot.data()
  const guardianUids: string[] = familyData.guardianUids || []

  // Create notification for each guardian
  const notificationIds: string[] = []
  const notificationsRef = collection(db, 'notifications')

  for (const guardianUid of guardianUids) {
    const notificationData = {
      familyId: input.familyId,
      recipientId: guardianUid,
      type: 'child_agreement_proposal',
      title: 'Agreement Change Request',
      body: CHILD_PROPOSAL_MESSAGES.parentNotification(input.childName),
      data: {
        proposalId: input.proposalId,
        action: 'review_proposal',
      },
      read: false,
      createdAt: serverTimestamp(),
    }

    const notificationDoc = await addDoc(notificationsRef, notificationData)
    notificationIds.push(notificationDoc.id)
  }

  return notificationIds
}

/**
 * Input for notifying proposer of a response
 *
 * Story 34.3: Proposal response notifications
 */
export interface ProposerNotificationInput {
  familyId: string
  proposalId: string
  proposerId: string
  responderName: string
  action: 'accept' | 'decline' | 'counter'
}

/**
 * Notify the original proposer when someone responds to their proposal.
 *
 * Story 34.3 AC2: Notification on response
 *
 * @param input - Notification input data
 * @returns The notification ID
 */
export async function notifyProposerOfResponse(input: ProposerNotificationInput): Promise<string> {
  const db = getFirestoreDb()

  const actionMessages: Record<string, string> = {
    accept: `${input.responderName} accepted your proposal! Changes are now active.`,
    decline: `${input.responderName} declined your proposal.`,
    counter: `${input.responderName} made a counter-proposal. Please review.`,
  }

  const notificationData = {
    familyId: input.familyId,
    recipientId: input.proposerId,
    type: 'proposal_response',
    title: 'Proposal Response',
    body: actionMessages[input.action],
    data: {
      proposalId: input.proposalId,
      action: `view_${input.action}`,
    },
    read: false,
    createdAt: serverTimestamp(),
  }

  const notificationsRef = collection(db, 'notifications')
  const notificationDoc = await addDoc(notificationsRef, notificationData)

  return notificationDoc.id
}

/**
 * Input for logging proposal response activity
 *
 * Story 34.3: Response activity logging
 */
export interface ProposalResponseActivityInput {
  familyId: string
  proposalId: string
  responderId: string
  responderName: string
  responderType: 'parent' | 'child'
  action: 'accept' | 'decline' | 'counter'
  proposerName: string
}

/**
 * Log proposal response activity to the family activity feed.
 *
 * Story 34.3: Activity logging for responses
 *
 * @param input - Activity input data
 * @returns The activity log ID
 */
export async function logProposalResponse(input: ProposalResponseActivityInput): Promise<string> {
  const db = getFirestoreDb()

  const actionDescriptions: Record<string, string> = {
    accept: `${input.responderName} accepted ${input.proposerName}'s proposal`,
    decline: `${input.responderName} declined ${input.proposerName}'s proposal`,
    counter: `${input.responderName} made a counter-proposal to ${input.proposerName}`,
  }

  const activityData = {
    familyId: input.familyId,
    type: `proposal_response_${input.action}`,
    actorId: input.responderId,
    actorName: input.responderName,
    actorType: input.responderType,
    description: actionDescriptions[input.action],
    metadata: {
      proposalId: input.proposalId,
      action: input.action,
    },
    createdAt: serverTimestamp(),
  }

  const activityRef = collection(db, 'familyActivity')
  const activityDoc = await addDoc(activityRef, activityData)

  return activityDoc.id
}

// ============================================
// Story 34.5.1: Child Proposal Rejection Tracking
// ============================================

/**
 * Input for handling child proposal rejection
 *
 * Story 34.5.1 AC1: Track proposal rejections
 */
export interface ChildProposalRejectionInput {
  familyId: string
  childId: string
  proposalId: string
}

/**
 * Handle a child's proposal being rejected by a parent.
 *
 * Story 34.5.1 AC1: Track proposal rejections with dates
 * Story 34.5.1 AC2: 90-day rolling window updates automatically
 * Story 34.5.1 AC3: Trigger escalation when threshold reached
 *
 * CRITICAL: This is privacy-preserving - only aggregate patterns tracked,
 * not proposal content.
 *
 * @param input - Rejection input data
 */
export async function handleChildProposalRejection(
  input: ChildProposalRejectionInput
): Promise<void> {
  const { familyId, childId, proposalId } = input

  // Record rejection in pattern tracking (AC1, AC2)
  await recordRejection(familyId, childId, proposalId)

  // Check if escalation threshold reached (AC3)
  const thresholdReached = await checkEscalationThreshold(childId)

  if (thresholdReached) {
    await triggerEscalation(familyId, childId)
  }
}

/**
 * Input for handling child proposal submission
 *
 * Story 34.5.1 AC5: Track total proposals for metrics
 */
export interface ChildProposalSubmissionInput {
  familyId: string
  childId: string
  proposalId: string
}

/**
 * Handle a child submitting a new proposal.
 *
 * Story 34.5.1 AC5: Track total proposals for metrics
 *
 * @param input - Submission input data
 */
export async function handleChildProposalSubmission(
  input: ChildProposalSubmissionInput
): Promise<void> {
  const { familyId, childId } = input

  // Increment proposal count for metrics
  await incrementProposalCount(familyId, childId)
}
