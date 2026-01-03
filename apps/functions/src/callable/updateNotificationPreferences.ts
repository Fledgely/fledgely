/**
 * Update Notification Preferences Callable Function
 *
 * Story 41.1: Notification Preferences Configuration
 * - AC1-3: Flag, time limit, sync toggles
 * - AC4: Quiet hours configuration
 * - AC5: Per-child preferences (FR152)
 * - AC7: Immediate application
 *
 * Updates notification preferences for a guardian.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  updateNotificationPreferencesInputSchema,
  createDefaultNotificationPreferences,
  applyPreferencesUpdate,
  type ParentNotificationPreferences,
} from '@fledgely/shared'

export interface UpdateNotificationPreferencesResponse {
  success: boolean
  preferences: ParentNotificationPreferences
  updatedChildren: string[]
}

/**
 * Update notification preferences for a guardian.
 *
 * Supports updating family-wide defaults or child-specific preferences.
 * Can optionally apply to all children at once.
 */
export const updateNotificationPreferences = onCall(
  { cors: true },
  async (request): Promise<UpdateNotificationPreferencesResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = updateNotificationPreferencesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { familyId, preferences: prefsUpdate } = parseResult.data
    const { childId, applyToAllChildren, ...updates } = prefsUpdate

    const db = getFirestore()

    // Verify caller is guardian in family
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const children = familyData?.children || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === callerUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Not a guardian in this family')
    }

    // If childId provided, verify child exists in family
    if (childId) {
      const childExists = children.some((c: { id: string }) => c.id === childId)
      if (!childExists) {
        throw new HttpsError('not-found', 'Child not found in family')
      }
    }

    const updatedChildren: string[] = []
    let finalPreferences: ParentNotificationPreferences | null = null

    const batch = db.batch()

    // Determine which children to update
    const childrenToUpdate = applyToAllChildren
      ? children.map((c: { id: string }) => c.id)
      : childId
        ? [childId]
        : ['default']

    for (const targetChildId of childrenToUpdate) {
      const prefDocId = targetChildId === 'default' ? 'default' : targetChildId
      const prefRef = db
        .collection('users')
        .doc(callerUid)
        .collection('notificationPreferences')
        .doc(prefDocId)

      // Get existing preferences or create defaults
      const existingDoc = await prefRef.get()
      let existing: ParentNotificationPreferences

      if (existingDoc.exists) {
        const data = existingDoc.data()
        existing = {
          id: data?.id,
          userId: data?.userId,
          familyId: data?.familyId,
          childId: data?.childId ?? null,
          criticalFlagsEnabled: data?.criticalFlagsEnabled,
          mediumFlagsMode: data?.mediumFlagsMode,
          lowFlagsEnabled: data?.lowFlagsEnabled,
          timeLimitWarningsEnabled: data?.timeLimitWarningsEnabled,
          limitReachedEnabled: data?.limitReachedEnabled,
          extensionRequestsEnabled: data?.extensionRequestsEnabled,
          syncAlertsEnabled: data?.syncAlertsEnabled,
          syncThresholdHours: data?.syncThresholdHours,
          quietHoursEnabled: data?.quietHoursEnabled,
          quietHoursStart: data?.quietHoursStart,
          quietHoursEnd: data?.quietHoursEnd,
          quietHoursWeekendDifferent: data?.quietHoursWeekendDifferent,
          quietHoursWeekendStart: data?.quietHoursWeekendStart ?? null,
          quietHoursWeekendEnd: data?.quietHoursWeekendEnd ?? null,
          updatedAt: data?.updatedAt?.toDate() || new Date(),
          createdAt: data?.createdAt?.toDate() || new Date(),
        }
      } else {
        existing = createDefaultNotificationPreferences(
          callerUid,
          familyId,
          targetChildId === 'default' ? null : targetChildId
        )
      }

      // Apply updates
      const updated = applyPreferencesUpdate(existing, updates)

      // Convert to Firestore format
      const firestoreData = {
        ...updated,
        updatedAt: Timestamp.now(),
        createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : Timestamp.now(),
      }

      batch.set(prefRef, firestoreData, { merge: false })

      if (targetChildId !== 'default') {
        updatedChildren.push(targetChildId)
      }

      // Store the last updated preferences for response
      finalPreferences = updated
    }

    // Audit log the change
    const auditRef = db.collection('auditLogs').doc()
    batch.set(auditRef, {
      type: 'notification_preferences_update',
      userId: callerUid,
      familyId,
      childId: childId ?? null,
      applyToAllChildren: applyToAllChildren ?? false,
      changes: updates,
      timestamp: FieldValue.serverTimestamp(),
    })

    // Commit all changes
    await batch.commit()

    return {
      success: true,
      preferences: finalPreferences!,
      updatedChildren,
    }
  }
)
