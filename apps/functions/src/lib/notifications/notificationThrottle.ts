/**
 * Notification throttling logic
 *
 * Story 19A.4: Status Push Notifications (AC: #4)
 *
 * Prevents notification spam by limiting frequency:
 * - Max 1 notification per hour per child
 * - Red (action) status notifications bypass throttle (urgent)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { StatusTransition, THROTTLE_DURATION_MS, isUrgentTransition } from './statusTypes'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Check if a notification should be sent based on throttle rules
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 * @param transition - Status transition type
 * @returns true if notification should be sent, false if throttled
 */
export async function shouldSendNotification(
  familyId: string,
  childId: string,
  transition: StatusTransition
): Promise<boolean> {
  // Urgent notifications (to action) always send
  if (isUrgentTransition(transition)) {
    return true
  }

  const stateRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('notificationState')
    .doc(childId)

  const state = await stateRef.get()

  if (!state.exists) {
    return true
  }

  const data = state.data()
  const lastSent = data?.lastNotificationSent?.toDate()

  if (!lastSent) {
    return true
  }

  const elapsed = Date.now() - lastSent.getTime()
  return elapsed >= THROTTLE_DURATION_MS
}

/**
 * Update the throttle timestamp after sending a notification
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 * @param transition - Status transition that was sent
 */
export async function updateThrottleTimestamp(
  familyId: string,
  childId: string,
  transition: StatusTransition
): Promise<void> {
  const stateRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('notificationState')
    .doc(childId)

  await stateRef.set(
    {
      lastNotificationSent: FieldValue.serverTimestamp(),
      lastTransition: transition,
    },
    { merge: true }
  )
}
