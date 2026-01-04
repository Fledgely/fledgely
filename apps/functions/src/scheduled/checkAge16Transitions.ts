/**
 * Check Age 16 Transitions Scheduled Function - Story 52.1 Task 4
 *
 * Runs daily to check for children approaching their 16th birthday
 * and sends appropriate notifications.
 *
 * AC1: 30-Day Pre-Transition Notification
 * AC3: Parent Notification
 * NFR42: Audit logging
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue, Firestore } from 'firebase-admin/firestore'
import {
  AGE_16_IN_YEARS,
  PRE_TRANSITION_DAYS,
  Age16NotificationType,
  createAge16TransitionNotification,
} from '@fledgely/shared'

// Initialize Firestore
let db: Firestore

function getDb(): Firestore {
  if (!db) {
    db = getFirestore() as unknown as Firestore
  }
  return db
}

/**
 * Check if a birthdate falls on today (for 16th birthday).
 */
function isBirthdayToday(birthdate: Date, referenceDate: Date = new Date()): boolean {
  const today = new Date(referenceDate)
  const birthday = new Date(birthdate)

  return today.getMonth() === birthday.getMonth() && today.getDate() === birthday.getDate()
}

/**
 * Calculate days until 16th birthday.
 */
function calculateDaysUntil16(birthdate: Date, referenceDate: Date = new Date()): number {
  const sixteenthBirthday = new Date(birthdate)
  sixteenthBirthday.setFullYear(birthdate.getFullYear() + AGE_16_IN_YEARS)

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  sixteenthBirthday.setHours(0, 0, 0, 0)

  const diffTime = sixteenthBirthday.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Send pre-transition notification to child and parents.
 */
async function sendPreTransitionNotifications(
  db: Firestore,
  childId: string,
  familyId: string,
  daysUntil16: number,
  parentIds: string[]
): Promise<void> {
  const batch = db.batch()

  // Create notification for child
  const childNotification = createAge16TransitionNotification(
    childId,
    familyId,
    Age16NotificationType.PRE_TRANSITION,
    daysUntil16
  )

  // Store child notification
  const childNotifRef = db
    .collection('families')
    .doc(familyId)
    .collection('age16Notifications')
    .doc(childNotification.id)

  batch.set(childNotifRef, {
    ...childNotification,
    sentAt: FieldValue.serverTimestamp(),
    recipientType: 'child',
    recipientId: childId,
  })

  // Create notification for each parent (AC3)
  for (const parentId of parentIds) {
    const parentNotification = createAge16TransitionNotification(
      childId,
      familyId,
      Age16NotificationType.PRE_TRANSITION,
      daysUntil16
    )

    const parentNotifRef = db
      .collection('users')
      .doc(parentId)
      .collection('notifications')
      .doc(parentNotification.id)

    batch.set(parentNotifRef, {
      ...parentNotification,
      sentAt: FieldValue.serverTimestamp(),
      recipientType: 'parent',
      recipientId: parentId,
      notificationType: 'age16_pre_transition',
    })
  }

  // Mark child as having received pre-transition notification
  const childRef = db.collection('families').doc(familyId).collection('children').doc(childId)

  batch.update(childRef, {
    age16PreTransitionSent: true,
    age16PreTransitionSentAt: FieldValue.serverTimestamp(),
  })

  // Audit log (NFR42)
  const auditRef = db.collection('auditLogs').doc()
  batch.set(auditRef, {
    type: 'age16_pre_transition_notification',
    childId,
    familyId,
    daysUntil16,
    parentIds,
    timestamp: FieldValue.serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Send transition available notification (on 16th birthday).
 */
async function sendTransitionAvailableNotifications(
  db: Firestore,
  childId: string,
  familyId: string,
  parentIds: string[]
): Promise<void> {
  const batch = db.batch()

  // Create notification for child
  const childNotification = createAge16TransitionNotification(
    childId,
    familyId,
    Age16NotificationType.TRANSITION_AVAILABLE
  )

  // Store child notification
  const childNotifRef = db
    .collection('families')
    .doc(familyId)
    .collection('age16Notifications')
    .doc(childNotification.id)

  batch.set(childNotifRef, {
    ...childNotification,
    sentAt: FieldValue.serverTimestamp(),
    recipientType: 'child',
    recipientId: childId,
  })

  // Create notification for each parent
  for (const parentId of parentIds) {
    const parentNotification = createAge16TransitionNotification(
      childId,
      familyId,
      Age16NotificationType.TRANSITION_AVAILABLE
    )

    const parentNotifRef = db
      .collection('users')
      .doc(parentId)
      .collection('notifications')
      .doc(parentNotification.id)

    batch.set(parentNotifRef, {
      ...parentNotification,
      sentAt: FieldValue.serverTimestamp(),
      recipientType: 'parent',
      recipientId: parentId,
      notificationType: 'age16_transition_available',
    })
  }

  // Mark child as having received transition available notification
  const childRef = db.collection('families').doc(familyId).collection('children').doc(childId)

  batch.update(childRef, {
    age16TransitionAvailableSent: true,
    age16TransitionAvailableSentAt: FieldValue.serverTimestamp(),
    reverseModeEligible: true,
    reverseModeEligibleSince: FieldValue.serverTimestamp(),
  })

  // Audit log (NFR42)
  const auditRef = db.collection('auditLogs').doc()
  batch.set(auditRef, {
    type: 'age16_transition_available_notification',
    childId,
    familyId,
    parentIds,
    timestamp: FieldValue.serverTimestamp(),
  })

  await batch.commit()
}

/**
 * Check for children approaching age 16 and send notifications.
 * Runs daily at 09:00 UTC.
 */
export const checkAge16Transitions = onSchedule(
  {
    schedule: '0 9 * * *', // Daily at 09:00 UTC
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const db = getDb()
    const today = new Date()

    console.log('Starting age 16 transition check...')

    // Get all families
    const familiesSnapshot = await db.collection('families').get()

    let preTransitionCount = 0
    let transitionAvailableCount = 0

    for (const familyDoc of familiesSnapshot.docs) {
      const familyId = familyDoc.id
      const familyData = familyDoc.data()

      // Get parent IDs for notifications
      const parentIds: string[] = familyData.parentIds || []

      // Get all children in family
      const childrenSnapshot = await db
        .collection('families')
        .doc(familyId)
        .collection('children')
        .get()

      for (const childDoc of childrenSnapshot.docs) {
        const childId = childDoc.id
        const childData = childDoc.data()

        // Skip if no birthdate
        if (!childData.birthdate) {
          continue
        }

        const birthdate = childData.birthdate.toDate()
        const daysUntil16 = calculateDaysUntil16(birthdate, today)

        // Check for 16th birthday today
        if (isBirthdayToday(birthdate, today) && daysUntil16 === 0) {
          // Check if transition available notification already sent
          if (!childData.age16TransitionAvailableSent) {
            await sendTransitionAvailableNotifications(db, childId, familyId, parentIds)
            transitionAvailableCount++
            console.log(`Sent transition available notification for child ${childId}`)
          }
        }
        // Check for pre-transition notification (within 30 days)
        else if (daysUntil16 > 0 && daysUntil16 <= PRE_TRANSITION_DAYS) {
          // Check if pre-transition notification already sent
          if (!childData.age16PreTransitionSent) {
            await sendPreTransitionNotifications(db, childId, familyId, daysUntil16, parentIds)
            preTransitionCount++
            console.log(
              `Sent pre-transition notification for child ${childId}, ${daysUntil16} days until 16`
            )
          }
        }
      }
    }

    console.log(
      `Age 16 transition check complete. Pre-transition: ${preTransitionCount}, Transition available: ${transitionAvailableCount}`
    )
  }
)
