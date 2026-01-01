/**
 * Agreement Activation Service - Story 34.4
 *
 * Handles notifications, activity logging, and version history for agreement activation.
 * AC3: Agreement version update
 * AC5: Both parties notification
 * AC6: History logging
 */

import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { ActivatedAgreementVersion } from '@fledgely/shared'

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

/**
 * Input for notifying both parties of activation
 */
export interface ActivationNotificationInput {
  familyId: string
  proposalId: string
  proposerId: string
  proposerName: string
  recipientId: string
  recipientName: string
}

/**
 * Input for logging activation activity
 */
export interface ActivationActivityInput {
  familyId: string
  proposalId: string
  proposerName: string
  recipientName: string
  versionNumber: number
}

/**
 * Input for creating version history entry
 */
export interface VersionHistoryInput {
  familyId: string
  agreementId: string
  version: ActivatedAgreementVersion
}

// =============================================================================
// NOTIFICATION MESSAGES
// =============================================================================

/**
 * Activation notification messages
 * AC5: Both parties notification
 */
export const ACTIVATION_MESSAGES = {
  proposerSuccess: 'Agreement updated successfully! New rules are now active.',
  recipientSuccess: (summary: string) => `Agreement updated! ${summary} is now active.`,
  activityDescription: (proposerName: string, recipientName: string) =>
    `${proposerName} and ${recipientName} agreed on changes. Agreement updated.`,
} as const

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Notify both parties after agreement activation.
 *
 * AC5: Both parties notification
 *
 * @param input - Notification input data
 * @returns Array of notification IDs [proposerNotifId, recipientNotifId]
 */
export async function notifyBothPartiesOfActivation(
  input: ActivationNotificationInput
): Promise<[string, string]> {
  const db = getFirestoreDb()
  const notificationsRef = collection(db, 'notifications')

  // Notify proposer
  const proposerNotification = {
    familyId: input.familyId,
    recipientId: input.proposerId,
    type: 'agreement_activated',
    title: 'Agreement Updated',
    body: ACTIVATION_MESSAGES.proposerSuccess,
    data: {
      proposalId: input.proposalId,
      action: 'view_agreement',
    },
    read: false,
    createdAt: serverTimestamp(),
  }

  const proposerDoc = await addDoc(notificationsRef, proposerNotification)

  // Notify recipient
  const recipientNotification = {
    familyId: input.familyId,
    recipientId: input.recipientId,
    type: 'agreement_activated',
    title: 'Agreement Updated',
    body: ACTIVATION_MESSAGES.recipientSuccess('New rules'),
    data: {
      proposalId: input.proposalId,
      action: 'view_agreement',
    },
    read: false,
    createdAt: serverTimestamp(),
  }

  const recipientDoc = await addDoc(notificationsRef, recipientNotification)

  return [proposerDoc.id, recipientDoc.id]
}

/**
 * Log agreement activation to the family activity feed.
 *
 * AC6: History logging
 *
 * @param input - Activity input data
 * @returns The activity log ID
 */
export async function logAgreementActivation(input: ActivationActivityInput): Promise<string> {
  const db = getFirestoreDb()

  const activityData = {
    familyId: input.familyId,
    type: 'agreement_activated',
    description: ACTIVATION_MESSAGES.activityDescription(input.proposerName, input.recipientName),
    metadata: {
      proposalId: input.proposalId,
      versionNumber: input.versionNumber,
    },
    createdAt: serverTimestamp(),
  }

  const activityRef = collection(db, 'familyActivity')
  const activityDoc = await addDoc(activityRef, activityData)

  return activityDoc.id
}

/**
 * Create version history entry in the versions subcollection.
 *
 * AC3: Agreement version update
 * AC6: History logging with signatures
 *
 * @param input - Version history input data
 * @returns The version document ID
 */
export async function createVersionHistoryEntry(input: VersionHistoryInput): Promise<string> {
  const db = getFirestoreDb()

  const versionRef = doc(
    db,
    'families',
    input.familyId,
    'agreements',
    input.agreementId,
    'versions',
    input.version.id
  )

  const versionData = {
    ...input.version,
    createdAt: serverTimestamp(),
  }

  await setDoc(versionRef, versionData)

  return input.version.id
}
