/**
 * onLocationUpdate Trigger - Story 40.4
 *
 * Firestore trigger that fires when a device location is updated.
 * Handles transition notifications and rule application scheduling.
 *
 * Acceptance Criteria:
 * - AC2: 5-minute Grace Period
 * - AC3: Transition Notification
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  TRANSITION_CHILD_MESSAGES,
  TRANSITION_ADULT_MESSAGES,
  calculateGracePeriodMinutes,
  type DeviceLocation,
} from '@fledgely/shared'

/**
 * Triggered when a device location is updated.
 *
 * Path: families/{familyId}/deviceLocations/{deviceId}
 *
 * This trigger:
 * 1. Checks for pending transitions for the device
 * 2. Sends child notification if new transition
 * 3. Sends parent notification if new transition
 */
export const onLocationUpdate = onDocumentWritten(
  'families/{familyId}/deviceLocations/{deviceId}',
  async (event) => {
    const db = getFirestore()
    const { familyId, deviceId } = event.params

    // Get the new location data
    const afterData = event.data?.after?.data() as DeviceLocation | undefined

    if (!afterData) {
      // Document was deleted, nothing to do
      return
    }

    // Check for pending transitions for this device
    const transitionsSnapshot = await db
      .collection('families')
      .doc(familyId)
      .collection('locationTransitions')
      .where('deviceId', '==', deviceId)
      .where('appliedAt', '==', null)
      .orderBy('detectedAt', 'desc')
      .limit(1)
      .get()

    if (transitionsSnapshot.empty) {
      // No pending transition
      return
    }

    const transitionDoc = transitionsSnapshot.docs[0]
    const transition = transitionDoc.data()

    // Check if notification already sent
    if (transition.notificationSentAt) {
      return
    }

    // Get family data for child name
    const familyDoc = await db.collection('families').doc(familyId).get()
    const familyData = familyDoc.data()

    if (!familyData) {
      console.error('Family not found:', familyId)
      return
    }

    // Find child name
    const child = familyData.children?.find(
      (c: { id: string; name: string }) => c.id === afterData.childId
    )
    const childName = child?.name || 'Your child'

    // Calculate grace period remaining
    const gracePeriodEndsAt = transition.gracePeriodEndsAt?.toDate?.() || new Date()
    const gracePeriodMinutes = calculateGracePeriodMinutes(gracePeriodEndsAt)

    // Determine zone name for messages
    let zoneName: string | null = null
    if (transition.toZoneId) {
      const zoneDoc = await db
        .collection('families')
        .doc(familyId)
        .collection('locationZones')
        .doc(transition.toZoneId)
        .get()
      zoneName = zoneDoc.data()?.name || null
    }

    // Generate messages
    let childMessage: string
    let adultMessage: string

    if (transition.toZoneId && zoneName) {
      // Entering a zone
      childMessage = TRANSITION_CHILD_MESSAGES.enteringZone(zoneName, gracePeriodMinutes)
      adultMessage = TRANSITION_ADULT_MESSAGES.enteringZone(zoneName, childName, gracePeriodMinutes)
    } else if (transition.fromZoneId) {
      // Leaving a zone
      const fromZoneDoc = await db
        .collection('families')
        .doc(familyId)
        .collection('locationZones')
        .doc(transition.fromZoneId)
        .get()
      const fromZoneName = fromZoneDoc.data()?.name || 'a zone'
      childMessage = TRANSITION_CHILD_MESSAGES.leavingZone(fromZoneName)
      adultMessage = TRANSITION_ADULT_MESSAGES.leavingZone(fromZoneName, childName)
    } else {
      // Unknown location
      childMessage = TRANSITION_CHILD_MESSAGES.unknownLocation
      adultMessage = TRANSITION_ADULT_MESSAGES.unknownLocation(childName)
    }

    // Create notification records
    const now = Timestamp.now()

    // Create child notification
    await db.collection('families').doc(familyId).collection('notifications').doc().set({
      type: 'location_transition',
      recipientType: 'child',
      recipientId: afterData.childId,
      transitionId: transitionDoc.id,
      message: childMessage,
      createdAt: now,
      readAt: null,
    })

    // Create parent notifications for all guardians
    const guardians = familyData.guardians || []
    for (const guardian of guardians) {
      await db.collection('families').doc(familyId).collection('notifications').doc().set({
        type: 'location_transition',
        recipientType: 'guardian',
        recipientId: guardian.id,
        transitionId: transitionDoc.id,
        message: adultMessage,
        createdAt: now,
        readAt: null,
      })
    }

    // Mark notification as sent on transition
    await transitionDoc.ref.update({
      notificationSentAt: now,
    })

    console.log('Location transition notifications sent:', {
      transitionId: transitionDoc.id,
      familyId,
      deviceId,
      childId: afterData.childId,
      toZoneId: transition.toZoneId,
      fromZoneId: transition.fromZoneId,
    })
  }
)
