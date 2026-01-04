/**
 * Age 16 Transition Callable Functions - Story 52.1
 *
 * Callable functions for managing age 16 transition notifications and eligibility.
 *
 * AC1: Check transition eligibility
 * AC2: Get pending notifications
 * AC5: Dismiss/acknowledge notifications
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  is16OrOlder,
  getDaysUntil16,
  get16thBirthdayDate,
  calculateAge,
  type TransitionEligibility,
  type Age16TransitionNotification,
} from '@fledgely/shared'

const db = getFirestore()

/**
 * Get age 16 transition eligibility for a child.
 */
export const getAge16TransitionEligibility = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId } = request.data as { childId: string }

  if (!childId) {
    throw new HttpsError('invalid-argument', 'Child ID is required')
  }

  // Get user's family membership
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // Find child in any family the user has access to
  const familiesSnapshot = await db
    .collection('families')
    .where('memberIds', 'array-contains', auth.uid)
    .get()

  let childData: FirebaseFirestore.DocumentData | null = null
  let familyId: string | null = null

  for (const familyDoc of familiesSnapshot.docs) {
    const childDoc = await db
      .collection('families')
      .doc(familyDoc.id)
      .collection('children')
      .doc(childId)
      .get()

    if (childDoc.exists) {
      childData = childDoc.data() || null
      familyId = familyDoc.id
      break
    }
  }

  if (!childData || !familyId) {
    throw new HttpsError('not-found', 'Child not found or access denied')
  }

  if (!childData.birthdate) {
    throw new HttpsError('failed-precondition', 'Child birthdate not set')
  }

  const birthdate = childData.birthdate.toDate()
  const isEligible = is16OrOlder(birthdate)
  const daysUntil = isEligible ? null : getDaysUntil16(birthdate)
  const isApproaching = !isEligible && daysUntil !== null && daysUntil <= 30

  const eligibility: TransitionEligibility = {
    childId,
    isEligible,
    isApproaching,
    daysUntil16: daysUntil,
    sixteenthBirthday: get16thBirthdayDate(birthdate),
    currentAge: calculateAge(birthdate),
    preTransitionSent: childData.age16PreTransitionSent || false,
    transitionAvailableSent: childData.age16TransitionAvailableSent || false,
  }

  return { eligibility }
})

/**
 * Get pending age 16 transition notifications for a child.
 */
export const getAge16TransitionNotifications = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { childId } = request.data as { childId: string }

    if (!childId) {
      throw new HttpsError('invalid-argument', 'Child ID is required')
    }

    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Find child's family
    const familiesSnapshot = await db
      .collection('families')
      .where('memberIds', 'array-contains', auth.uid)
      .get()

    let familyId: string | null = null

    for (const familyDoc of familiesSnapshot.docs) {
      const childDoc = await db
        .collection('families')
        .doc(familyDoc.id)
        .collection('children')
        .doc(childId)
        .get()

      if (childDoc.exists) {
        familyId = familyDoc.id
        break
      }
    }

    if (!familyId) {
      throw new HttpsError('not-found', 'Child not found or access denied')
    }

    // Get notifications for this child
    const notificationsSnapshot = await db
      .collection('families')
      .doc(familyId)
      .collection('age16Notifications')
      .where('childId', '==', childId)
      .where('dismissed', '==', false)
      .orderBy('sentAt', 'desc')
      .limit(10)
      .get()

    const notifications: Age16TransitionNotification[] = notificationsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        childId: data.childId,
        familyId: data.familyId,
        type: data.type,
        sentAt: data.sentAt?.toDate() || new Date(),
        acknowledged: data.acknowledged || false,
        acknowledgedAt: data.acknowledgedAt?.toDate(),
        dismissed: data.dismissed || false,
        daysUntil16: data.daysUntil16,
      }
    })

    return { notifications }
  }
)

/**
 * Dismiss an age 16 transition notification.
 * AC5: Child can dismiss notification without taking action
 */
export const dismissAge16TransitionNotification = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { notificationId } = request.data as { notificationId: string }

    if (!notificationId) {
      throw new HttpsError('invalid-argument', 'Notification ID is required')
    }

    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Find the notification in user's accessible families
    const familiesSnapshot = await db
      .collection('families')
      .where('memberIds', 'array-contains', auth.uid)
      .get()

    let notificationRef: FirebaseFirestore.DocumentReference | null = null

    for (const familyDoc of familiesSnapshot.docs) {
      const notifDoc = await db
        .collection('families')
        .doc(familyDoc.id)
        .collection('age16Notifications')
        .doc(notificationId)
        .get()

      if (notifDoc.exists) {
        notificationRef = notifDoc.ref
        break
      }
    }

    if (!notificationRef) {
      throw new HttpsError('not-found', 'Notification not found or access denied')
    }

    await notificationRef.update({
      dismissed: true,
      dismissedAt: FieldValue.serverTimestamp(),
      dismissedBy: auth.uid,
    })

    return { success: true }
  }
)

/**
 * Acknowledge an age 16 transition notification.
 */
export const acknowledgeAge16TransitionNotification = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { notificationId } = request.data as { notificationId: string }

    if (!notificationId) {
      throw new HttpsError('invalid-argument', 'Notification ID is required')
    }

    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Find the notification in user's accessible families
    const familiesSnapshot = await db
      .collection('families')
      .where('memberIds', 'array-contains', auth.uid)
      .get()

    let notificationRef: FirebaseFirestore.DocumentReference | null = null

    for (const familyDoc of familiesSnapshot.docs) {
      const notifDoc = await db
        .collection('families')
        .doc(familyDoc.id)
        .collection('age16Notifications')
        .doc(notificationId)
        .get()

      if (notifDoc.exists) {
        notificationRef = notifDoc.ref
        break
      }
    }

    if (!notificationRef) {
      throw new HttpsError('not-found', 'Notification not found or access denied')
    }

    await notificationRef.update({
      acknowledged: true,
      acknowledgedAt: FieldValue.serverTimestamp(),
      acknowledgedBy: auth.uid,
    })

    return { success: true }
  }
)
