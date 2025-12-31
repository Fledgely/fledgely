/**
 * Agreement Change Request Service - Story 19C.5
 *
 * Handles submission of agreement change requests from children.
 * Stores requests in Firestore and logs to family activity.
 *
 * Task 3: Implement request submission service (AC: #3, #5)
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Data for creating a change request
 */
export interface ChangeRequestInput {
  /** Child's user ID */
  childId: string
  /** Family ID */
  familyId: string
  /** Agreement ID being referenced */
  agreementId: string
  /** What the child wants to change */
  whatToChange: string
  /** Why they want to change it (optional) */
  why: string | null
  /** Child's display name for activity log */
  childName: string
}

/**
 * Result from submitting a change request
 */
export interface ChangeRequestResult {
  /** ID of the created request */
  requestId: string
  /** Whether parent was notified */
  parentNotified: boolean
}

/**
 * Submit an agreement change request from a child.
 *
 * Creates the request in Firestore and logs to family activity
 * for transparency per AC#5.
 *
 * @param input - The change request data
 * @returns The created request ID and notification status
 * @throws If Firestore write fails
 */
export async function submitChangeRequest(input: ChangeRequestInput): Promise<ChangeRequestResult> {
  const db = getFirestoreDb()

  // Create the change request document
  const requestData = {
    familyId: input.familyId,
    childId: input.childId,
    agreementId: input.agreementId,
    whatToChange: input.whatToChange,
    why: input.why,
    status: 'pending' as const,
    createdAt: serverTimestamp(),
    parentNotified: false,
  }

  // Store in agreementChangeRequests collection
  const requestsRef = collection(db, 'agreementChangeRequests')
  const requestDoc = await addDoc(requestsRef, requestData)

  // Log to family activity for transparency (AC5)
  const activityData = {
    familyId: input.familyId,
    type: 'agreement_change_request',
    actorId: input.childId,
    actorName: input.childName,
    actorType: 'child' as const,
    description: `${input.childName} requested a change to the agreement`,
    metadata: {
      requestId: requestDoc.id,
      agreementId: input.agreementId,
      whatToChange: input.whatToChange,
    },
    createdAt: serverTimestamp(),
  }

  const activityRef = collection(db, 'familyActivity')
  await addDoc(activityRef, activityData)

  // Note: Parent notification will be handled by the useChangeRequest hook
  // which triggers FCM push notification

  return {
    requestId: requestDoc.id,
    parentNotified: false, // Will be updated by notification trigger
  }
}

/**
 * Create a notification for parent about the change request.
 *
 * This stores a notification document that can trigger FCM push.
 *
 * @param familyId - Family ID
 * @param requestId - The change request ID
 * @param childName - Name of the child making the request
 * @returns The notification ID
 */
export async function createParentNotification(
  familyId: string,
  requestId: string,
  childName: string
): Promise<string> {
  const db = getFirestoreDb()

  const notificationData = {
    familyId,
    type: 'agreement_change_request',
    title: 'Agreement Change Request',
    body: `${childName} wants to discuss a change to your agreement`,
    data: {
      requestId,
      action: 'view_change_request',
    },
    read: false,
    createdAt: serverTimestamp(),
  }

  const notificationsRef = collection(db, 'notifications')
  const notificationDoc = await addDoc(notificationsRef, notificationData)

  return notificationDoc.id
}
