/**
 * Auto-Disable Location for Abuse Scheduled Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC6: Auto-disable capability
 *
 * Automatically disables location features if repeated abuse patterns detected.
 * Threshold: 3+ alerts in 30 days.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  LOCATION_ABUSE_THRESHOLDS,
  LOCATION_ABUSE_MESSAGES,
  type LocationAutoDisable,
} from '@fledgely/shared'

/**
 * Check if a family has enough alerts to trigger auto-disable.
 *
 * @param familyId - Family ID
 * @returns Object with shouldDisable flag and triggering alert IDs
 */
export async function checkAutoDisableThreshold(
  familyId: string
): Promise<{ shouldDisable: boolean; alertIds: string[]; alertCount: number }> {
  const db = getFirestore()
  const windowDays = LOCATION_ABUSE_THRESHOLDS.AUTO_DISABLE_WINDOW_DAYS
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const threshold = LOCATION_ABUSE_THRESHOLDS.AUTO_DISABLE_ALERT_COUNT

  const alertsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationAbuseAlerts')
    .where('sentAt', '>', Timestamp.fromDate(windowStart))
    .get()

  const alertIds = alertsSnapshot.docs.map((doc) => doc.id)

  return {
    shouldDisable: alertIds.length >= threshold,
    alertIds,
    alertCount: alertIds.length,
  }
}

/**
 * Check if family was already auto-disabled and not re-enabled.
 *
 * @param familyId - Family ID
 * @returns True if currently disabled due to abuse
 */
export async function isAlreadyAutoDisabled(familyId: string): Promise<boolean> {
  const db = getFirestore()

  const disableSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationAutoDisables')
    .where('reenabledAt', '==', null)
    .limit(1)
    .get()

  return !disableSnapshot.empty
}

/**
 * Disable location features for a family due to abuse.
 *
 * @param familyId - Family ID
 * @param alertIds - Alert IDs that triggered the disable
 * @param alertCount - Number of alerts
 * @returns Disable record ID
 */
export async function disableLocationForAbuse(
  familyId: string,
  alertIds: string[],
  alertCount: number
): Promise<string> {
  const db = getFirestore()

  // Get guardians for notification
  const familyDoc = await db.collection('families').doc(familyId).get()
  const familyData = familyDoc.data()
  const guardians: string[] = familyData?.guardians || []

  // Create auto-disable record
  const disableRef = db
    .collection('families')
    .doc(familyId)
    .collection('locationAutoDisables')
    .doc()

  const disableData: Omit<LocationAutoDisable, 'disabledAt' | 'reenabledAt' | 'reenabledByUids'> & {
    disabledAt: ReturnType<typeof Timestamp.now>
    reenabledAt: null
    reenabledByUids: null
  } = {
    id: disableRef.id,
    familyId,
    disabledAt: Timestamp.now(),
    triggeringAlertIds: alertIds,
    alertCount,
    notifiedGuardianUids: guardians,
    reenabledAt: null,
    reenabledByUids: null,
  }

  await disableRef.set(disableData)

  // Disable location features on the family
  await db.collection('families').doc(familyId).update({
    locationFeaturesEnabled: false,
    locationDisabledReason: 'abuse_auto_disable',
    locationDisabledAt: Timestamp.now(),
  })

  // Create notifications for guardians
  const batch = db.batch()
  const message = LOCATION_ABUSE_MESSAGES.autoDisable

  for (const guardianUid of guardians) {
    const notificationRef = db
      .collection('users')
      .doc(guardianUid)
      .collection('notifications')
      .doc()

    batch.set(notificationRef, {
      id: notificationRef.id,
      type: 'location_auto_disabled',
      title: message.title,
      body: message.summary,
      familyId,
      disableId: disableRef.id,
      read: false,
      createdAt: Timestamp.now(),
    })
  }

  await batch.commit()

  // Log to admin audit trail
  const auditRef = db.collection('adminAuditLog').doc()
  await auditRef.set({
    id: auditRef.id,
    action: 'location_auto_disabled',
    resourceType: 'family',
    resourceId: familyId,
    details: {
      reason: 'abuse_pattern_threshold_exceeded',
      alertCount,
      alertIds,
      guardians,
    },
    timestamp: Timestamp.now(),
    performedBy: 'system',
  })

  return disableRef.id
}

/**
 * Scheduled function to auto-disable location features for families with abuse patterns.
 * Runs daily at 4 AM (after abuse detection at 3 AM).
 */
export const autoDisableLocationForAbuse = onSchedule(
  {
    schedule: '0 4 * * *', // 4 AM daily
    timeZone: 'America/New_York',
  },
  async () => {
    const db = getFirestore()

    // Get all families with location features enabled
    const familiesSnapshot = await db
      .collection('families')
      .where('locationFeaturesEnabled', '==', true)
      .get()

    const results = {
      familiesChecked: 0,
      familiesDisabled: 0,
      errors: [] as string[],
    }

    for (const familyDoc of familiesSnapshot.docs) {
      const familyId = familyDoc.id
      results.familiesChecked++

      try {
        // Check if already auto-disabled
        const alreadyDisabled = await isAlreadyAutoDisabled(familyId)
        if (alreadyDisabled) {
          continue
        }

        // Check if threshold reached
        const { shouldDisable, alertIds, alertCount } = await checkAutoDisableThreshold(familyId)

        if (shouldDisable) {
          await disableLocationForAbuse(familyId, alertIds, alertCount)
          results.familiesDisabled++
        }
      } catch (error) {
        results.errors.push(
          `Family ${familyId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    console.log('Location auto-disable check completed:', results)
  }
)
