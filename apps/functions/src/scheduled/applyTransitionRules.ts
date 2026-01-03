/**
 * Apply Transition Rules Scheduled Function - Story 40.4
 *
 * Runs every minute to check for expired grace periods and apply
 * location-based rules to devices.
 *
 * Acceptance Criteria:
 * - AC2: 5-minute Grace Period
 * - AC4: Rules Applied After Grace Period
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  isGracePeriodExpired,
  TRANSITION_CHILD_MESSAGES,
  type AppliedRules,
} from '@fledgely/shared'

/**
 * Apply location rules after grace period expires.
 * Runs every minute.
 */
export const applyTransitionRules = onSchedule('every 1 minutes', async () => {
  const db = getFirestore()
  const now = new Date()

  // Find all transitions with expired grace periods that haven't been applied
  const transitionsSnapshot = await db
    .collectionGroup('locationTransitions')
    .where('appliedAt', '==', null)
    .where('gracePeriodEndsAt', '<=', Timestamp.fromDate(now))
    .get()

  if (transitionsSnapshot.empty) {
    return
  }

  console.log(`Processing ${transitionsSnapshot.size} expired transitions`)

  for (const transitionDoc of transitionsSnapshot.docs) {
    const transition = transitionDoc.data()
    const pathParts = transitionDoc.ref.path.split('/')
    const familyId = pathParts[1]

    try {
      // Double-check grace period (for safety)
      const gracePeriodEndsAt = transition.gracePeriodEndsAt?.toDate?.()
      if (gracePeriodEndsAt && !isGracePeriodExpired(gracePeriodEndsAt)) {
        continue
      }

      // Get the target zone's rules (if transitioning to a zone)
      let appliedRules: AppliedRules | null = null

      if (transition.toZoneId) {
        // Get the zone
        const zoneDoc = await db
          .collection('families')
          .doc(familyId)
          .collection('locationZones')
          .doc(transition.toZoneId)
          .get()

        if (zoneDoc.exists) {
          const zoneData = zoneDoc.data()

          // Get location rules for this zone
          const rulesSnapshot = await db
            .collection('families')
            .doc(familyId)
            .collection('locationRules')
            .where('zoneId', '==', transition.toZoneId)
            .where('childId', '==', transition.childId)
            .limit(1)
            .get()

          if (!rulesSnapshot.empty) {
            const rules = rulesSnapshot.docs[0].data()
            appliedRules = {
              dailyTimeLimitMinutes: rules.dailyTimeLimitMinutes ?? null,
              educationOnlyMode: rules.educationOnlyMode ?? false,
              categoryOverrides: rules.categoryOverrides ?? {},
            }

            // Apply rules to the child's active settings
            await applyRulesToChild(
              db,
              familyId,
              transition.childId,
              transition.deviceId,
              appliedRules
            )
          }

          // Send "rules applied" notification
          const zoneName = zoneData?.name || 'the zone'
          await db
            .collection('families')
            .doc(familyId)
            .collection('notifications')
            .doc()
            .set({
              type: 'rules_applied',
              recipientType: 'child',
              recipientId: transition.childId,
              transitionId: transitionDoc.id,
              message: TRANSITION_CHILD_MESSAGES.rulesApplied(zoneName),
              createdAt: Timestamp.now(),
              readAt: null,
            })
        }
      }

      // Mark transition as applied
      await transitionDoc.ref.update({
        appliedAt: Timestamp.now(),
        rulesApplied: appliedRules,
      })

      console.log('Transition rules applied:', {
        transitionId: transitionDoc.id,
        familyId,
        childId: transition.childId,
        toZoneId: transition.toZoneId,
        appliedRules,
      })
    } catch (error) {
      console.error('Error applying transition rules:', {
        transitionId: transitionDoc.id,
        error,
      })
    }
  }
})

/**
 * Apply location-based rules to child's active settings.
 */
async function applyRulesToChild(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  childId: string,
  deviceId: string,
  rules: AppliedRules
): Promise<void> {
  const settingsRef = db
    .collection('families')
    .doc(familyId)
    .collection('childSettings')
    .doc(childId)

  // Get current settings
  const settingsDoc = await settingsRef.get()
  const currentSettings = settingsDoc.data() || {}

  // Build update with location overrides
  const update: Record<string, unknown> = {
    locationOverrides: {
      deviceId,
      appliedAt: Timestamp.now(),
      dailyTimeLimitMinutes: rules.dailyTimeLimitMinutes,
      educationOnlyMode: rules.educationOnlyMode,
      categoryOverrides: rules.categoryOverrides,
    },
  }

  // If education-only mode, set it directly
  if (rules.educationOnlyMode) {
    update.educationOnlyMode = true
  }

  // If time limit is set, use the more restrictive of current and location
  if (rules.dailyTimeLimitMinutes !== null) {
    const currentLimit = currentSettings.dailyTimeLimitMinutes
    if (currentLimit === undefined || rules.dailyTimeLimitMinutes < currentLimit) {
      update.dailyTimeLimitMinutes = rules.dailyTimeLimitMinutes
    }
  }

  await settingsRef.set(update, { merge: true })
}
