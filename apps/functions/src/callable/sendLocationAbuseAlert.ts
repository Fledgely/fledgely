/**
 * Send Location Abuse Alert Callable Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC4: Bilateral parent alerts
 * - AC5: Conflict resolution resources
 *
 * Sends bilateral alerts to BOTH parents when abuse patterns detected.
 * Alerts are neutral and never blame either parent directly.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  sendLocationAbuseAlertInputSchema,
  LOCATION_ABUSE_MESSAGES,
  type LocationAbuseAlert,
  type LocationAbuseAlertResponse,
} from '@fledgely/shared'

/**
 * Send bilateral alert to all guardians in a family.
 *
 * Key behaviors:
 * - Alerts sent to ALL guardians (transparency)
 * - Alert message is neutral (no blame)
 * - Child is NOT notified (prevent triangulation)
 * - Resources for conflict resolution included
 */
export const sendLocationAbuseAlert = onCall<unknown, Promise<LocationAbuseAlertResponse>>(
  async (request) => {
    const db = getFirestore()

    // This can be called by the scheduled function (no auth) or by system
    // For security, we validate the pattern exists in the database

    // Validate input
    const parseResult = sendLocationAbuseAlertInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { familyId, patternId, patternType } = parseResult.data

    // Verify pattern exists and hasn't already been alerted
    const patternRef = db
      .collection('families')
      .doc(familyId)
      .collection('locationAbusePatterns')
      .doc(patternId)

    const patternDoc = await patternRef.get()
    if (!patternDoc.exists) {
      return {
        success: false,
        alertId: null,
        message: 'Pattern not found',
      }
    }

    const patternData = patternDoc.data()
    if (patternData?.alertSent) {
      return {
        success: true,
        alertId: null,
        message: 'Alert already sent for this pattern',
      }
    }

    // Get all guardians in the family
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      return {
        success: false,
        alertId: null,
        message: 'Family not found',
      }
    }

    const familyData = familyDoc.data()
    const guardians: string[] = familyData?.guardians || []

    if (guardians.length === 0) {
      return {
        success: false,
        alertId: null,
        message: 'No guardians in family',
      }
    }

    // Create the alert
    const alertRef = db.collection('families').doc(familyId).collection('locationAbuseAlerts').doc()

    const alert: Omit<LocationAbuseAlert, 'sentAt' | 'acknowledgedAt' | 'resourcesViewedAt'> & {
      sentAt: ReturnType<typeof Timestamp.now>
      acknowledgedAt: null
      resourcesViewedAt: null
    } = {
      id: alertRef.id,
      familyId,
      patternId,
      patternType,
      notifiedGuardianUids: guardians,
      sentAt: Timestamp.now(),
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedByUid: null,
      resourcesViewed: false,
      resourcesViewedAt: null,
    }

    // Save the alert
    await alertRef.set(alert)

    // Mark pattern as alerted
    await patternRef.update({ alertSent: true })

    // Create notifications for each guardian
    // (Using the existing notification pattern from Story 27.6)
    const notificationBatch = db.batch()
    const notificationMessage = getAlertMessage(patternType)

    for (const guardianUid of guardians) {
      const notificationRef = db
        .collection('users')
        .doc(guardianUid)
        .collection('notifications')
        .doc()

      notificationBatch.set(notificationRef, {
        id: notificationRef.id,
        type: 'location_abuse_alert',
        title: notificationMessage.title,
        body: notificationMessage.summary,
        familyId,
        alertId: alertRef.id,
        read: false,
        createdAt: Timestamp.now(),
      })
    }

    await notificationBatch.commit()

    return {
      success: true,
      alertId: alertRef.id,
      message: `Alert sent to ${guardians.length} guardian(s)`,
    }
  }
)

/**
 * Get alert message based on pattern type.
 * All messages are neutral and non-blaming.
 *
 * @param patternType - Type of pattern detected
 * @returns Alert message object
 */
function getAlertMessage(patternType: string): { title: string; summary: string; detail: string } {
  switch (patternType) {
    case 'asymmetric_checks':
      return LOCATION_ABUSE_MESSAGES.asymmetricChecks
    case 'frequent_rule_changes':
      return LOCATION_ABUSE_MESSAGES.frequentRuleChanges
    case 'cross_custody_restriction':
      return LOCATION_ABUSE_MESSAGES.crossCustodyRestriction
    default:
      return {
        title: 'Location Pattern Detected',
        summary: 'A usage pattern was detected in location features.',
        detail: 'Please review the resources for healthy co-parenting communication.',
      }
  }
}

/**
 * Mark an alert as acknowledged by a guardian.
 */
export const acknowledgeLocationAbuseAlert = onCall<unknown, Promise<{ success: boolean }>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()

    const { familyId, alertId } = request.data as { familyId: string; alertId: string }

    if (!familyId || !alertId) {
      throw new HttpsError('invalid-argument', 'Missing familyId or alertId')
    }

    // Verify caller is a guardian
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const guardians = familyDoc.data()?.guardians || []
    if (!guardians.includes(uid)) {
      throw new HttpsError('permission-denied', 'Only guardians can acknowledge alerts')
    }

    // Update the alert
    const alertRef = db
      .collection('families')
      .doc(familyId)
      .collection('locationAbuseAlerts')
      .doc(alertId)

    await alertRef.update({
      acknowledged: true,
      acknowledgedAt: Timestamp.now(),
      acknowledgedByUid: uid,
    })

    return { success: true }
  }
)

/**
 * Mark that a guardian has viewed the resources.
 */
export const markResourcesViewed = onCall<unknown, Promise<{ success: boolean }>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()

    const { familyId, alertId } = request.data as { familyId: string; alertId: string }

    if (!familyId || !alertId) {
      throw new HttpsError('invalid-argument', 'Missing familyId or alertId')
    }

    // Verify caller is a guardian
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const guardians = familyDoc.data()?.guardians || []
    if (!guardians.includes(uid)) {
      throw new HttpsError('permission-denied', 'Only guardians can view resources')
    }

    // Update the alert
    const alertRef = db
      .collection('families')
      .doc(familyId)
      .collection('locationAbuseAlerts')
      .doc(alertId)

    await alertRef.update({
      resourcesViewed: true,
      resourcesViewedAt: Timestamp.now(),
    })

    return { success: true }
  }
)
