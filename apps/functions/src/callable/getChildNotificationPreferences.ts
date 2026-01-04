/**
 * Get Child Notification Preferences Callable Function
 *
 * Story 41.7: Child Notification Preferences
 * - AC4: Parent Privacy Barrier
 *
 * CRITICAL: Only the child themselves can access their notification preferences.
 * Parents CANNOT view or modify child notification preferences.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  getChildNotificationPreferencesInputSchema,
  type ChildNotificationPreferences,
} from '@fledgely/shared'
import { getChildNotificationPreferences as getPreferences } from '../lib/notifications/childNotificationPreferencesService'

// Lazy Firestore initialization
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

export interface GetChildNotificationPreferencesResponse {
  preferences: ChildNotificationPreferences
}

/**
 * Get notification preferences for a child.
 *
 * PRIVACY: Only the child themselves can call this function.
 * Parents/guardians are explicitly rejected.
 */
export const getChildNotificationPreferences = onCall(
  { cors: true },
  async (request): Promise<GetChildNotificationPreferencesResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = getChildNotificationPreferencesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { childId, familyId } = parseResult.data

    // CRITICAL PRIVACY CHECK: Caller must be the child
    if (callerUid !== childId) {
      throw new HttpsError(
        'permission-denied',
        'Only children can access their own notification preferences'
      )
    }

    // SECURITY: Verify child belongs to the provided family
    const childDoc = await getDb().collection('children').doc(childId).get()
    if (!childDoc.exists) {
      throw new HttpsError('not-found', 'Child not found')
    }
    const childData = childDoc.data()
    if (childData?.familyId !== familyId) {
      throw new HttpsError('permission-denied', 'Child does not belong to this family')
    }

    try {
      const preferences = await getPreferences(childId, familyId)

      return {
        preferences,
      }
    } catch (error) {
      throw new HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to get preferences'
      )
    }
  }
)
