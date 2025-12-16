import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { type SafetySettingType, type SafetySettingValue } from '@fledgely/contracts'

/**
 * Scheduled Cloud Function: completeCoolingPeriods
 *
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 *
 * Runs every 15 minutes to check for cooling periods that have ended.
 * When a cooling period ends without being cancelled, the safety setting
 * change is applied and the proposal status is updated to 'cooling_completed'.
 *
 * AC #1: After 48-hour cooling period, change takes effect
 *
 * Security invariants:
 * 1. Only processes proposals in 'cooling_in_progress' status
 * 2. Only processes proposals where coolingPeriod.endsAt has passed
 * 3. Applies the proposed setting change to the child document
 * 4. Logs all completions for audit trail
 */
export const completeCoolingPeriods = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: 'UTC',
  },
  async () => {
    const db = getFirestore()
    const now = new Date()

    console.log('[completeCoolingPeriods] Starting scan for expired cooling periods', {
      timestamp: now.toISOString(),
    })

    try {
      // Query for proposals with expired cooling periods
      const expiredCoolingSnapshot = await db
        .collectionGroup('safetySettingsProposals')
        .where('status', '==', 'cooling_in_progress')
        .where('coolingPeriod.endsAt', '<=', now)
        .get()

      if (expiredCoolingSnapshot.empty) {
        console.log('[completeCoolingPeriods] No expired cooling periods found')
        return
      }

      console.log(
        `[completeCoolingPeriods] Found ${expiredCoolingSnapshot.size} expired cooling periods`
      )

      // Process each expired cooling period individually (not batched)
      // because we need to apply setting changes to different child documents
      let completedCount = 0
      let errorCount = 0

      for (const doc of expiredCoolingSnapshot.docs) {
        const data = doc.data()

        try {
          // Extract the child ID from the document path
          // Path format: children/{childId}/safetySettingsProposals/{proposalId}
          const pathParts = doc.ref.path.split('/')
          const childId = pathParts[1]

          console.log('[completeCoolingPeriods] Processing cooling period completion', {
            proposalId: doc.id,
            childId,
            settingType: data.settingType,
            proposedValue: data.proposedValue,
            coolingStartedAt: data.coolingPeriod?.startsAt?.toDate?.()?.toISOString() ?? 'unknown',
            coolingEndedAt: data.coolingPeriod?.endsAt?.toDate?.()?.toISOString() ?? 'unknown',
          })

          // Apply the safety setting change
          await applySettingChange(
            db,
            childId,
            data.settingType as SafetySettingType,
            data.proposedValue as SafetySettingValue
          )

          // Update the proposal status
          await doc.ref.update({
            status: 'cooling_completed',
            appliedAt: FieldValue.serverTimestamp(),
          })

          completedCount++

          console.log('[completeCoolingPeriods] Cooling period completed, setting applied', {
            proposalId: doc.id,
            childId,
            settingType: data.settingType,
            proposedValue: data.proposedValue,
          })
        } catch (docError) {
          errorCount++
          console.error('[completeCoolingPeriods] Error processing individual proposal:', {
            proposalId: doc.id,
            errorMessage: docError instanceof Error ? docError.message : 'Unknown error',
          })
          // Continue processing other proposals even if one fails
        }
      }

      console.log('[completeCoolingPeriods] Completed', {
        completedCount,
        errorCount,
        totalProcessed: expiredCoolingSnapshot.size,
        timestamp: new Date().toISOString(),
      })

      // TODO: Task 9 - Add notification when cooling period completes
      // This would trigger notifications to both parents and child about the change taking effect
    } catch (error) {
      console.error('[completeCoolingPeriods] Error processing cooling periods:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
      throw error
    }
  }
)

/**
 * Apply a safety setting change to the child document
 */
async function applySettingChange(
  db: FirebaseFirestore.Firestore,
  childId: string,
  settingType: SafetySettingType,
  value: SafetySettingValue
): Promise<void> {
  await db
    .collection('children')
    .doc(childId)
    .update({
      [`safetySettings.${settingType}`]: value,
      [`safetySettings.lastUpdatedAt`]: FieldValue.serverTimestamp(),
    })
}
