/**
 * Get Notification Preferences Callable Function
 *
 * Story 41.1: Notification Preferences Configuration
 * - AC5: Per-child preferences (FR152)
 * - AC6: Reasonable defaults
 * - AC7: Immediate application
 *
 * Retrieves notification preferences for a guardian.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  getNotificationPreferencesInputSchema,
  createDefaultNotificationPreferences,
  type ParentNotificationPreferences,
} from '@fledgely/shared'

export interface GetNotificationPreferencesResponse {
  preferences: ParentNotificationPreferences
  isDefault: boolean
}

/**
 * Get notification preferences for a guardian.
 *
 * Returns child-specific preferences if childId provided,
 * otherwise returns family-wide defaults.
 * Creates defaults if no preferences exist.
 */
export const getNotificationPreferences = onCall(
  { cors: true },
  async (request): Promise<GetNotificationPreferencesResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = getNotificationPreferencesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { familyId, childId } = parseResult.data

    const db = getFirestore()

    // Verify caller is guardian in family
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === callerUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Not a guardian in this family')
    }

    // If childId provided, verify child exists in family
    if (childId) {
      const children = familyData?.children || []
      const childExists = children.some((c: { id: string }) => c.id === childId)
      if (!childExists) {
        throw new HttpsError('not-found', 'Child not found in family')
      }
    }

    // Get preferences document
    const prefDocId = childId || 'default'
    const prefDoc = await db
      .collection('users')
      .doc(callerUid)
      .collection('notificationPreferences')
      .doc(prefDocId)
      .get()

    if (prefDoc.exists) {
      const data = prefDoc.data()
      return {
        preferences: {
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
        },
        isDefault: false,
      }
    }

    // Return defaults if no preferences exist
    const defaults = createDefaultNotificationPreferences(callerUid, familyId, childId ?? null)

    return {
      preferences: defaults,
      isDefault: true,
    }
  }
)
