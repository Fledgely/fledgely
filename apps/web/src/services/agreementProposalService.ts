/**
 * Agreement Proposal Service - Story 34.1, 34.2
 *
 * Handles proposal notifications and activity logging.
 * Follows patterns from agreementChangeService.ts.
 */

import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { AGREEMENT_PROPOSAL_MESSAGES, CHILD_PROPOSAL_MESSAGES } from '@fledgely/shared'

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
