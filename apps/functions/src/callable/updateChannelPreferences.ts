/**
 * Cloud Functions for managing notification channel preferences.
 *
 * Story 41.6: Notification Delivery Channels - AC4
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST) - User must be authenticated
 * 2. Validation (SECOND) - Validate input
 * 3. Permission (THIRD) - N/A (user can only update their own preferences)
 * 4. Business logic (LAST) - Update/get preferences in Firestore
 *
 * Security notes:
 * - Login alerts channel settings cannot be modified (locked)
 * - Only authenticated users can access preferences
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  updateChannelPreferencesInputSchema,
  notificationChannelPreferencesSchema,
  type UpdateChannelPreferencesInput,
  type ChannelPreferencesOutput,
  type NotificationChannelPreferences,
  defaultChannelPreferences,
} from '@fledgely/shared'
import { verifyAuth } from '../shared/auth'

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

/**
 * Update channel preferences for the authenticated user.
 *
 * Validates that login alerts cannot be modified (they are always enabled).
 */
export const updateChannelPreferences = onCall<
  UpdateChannelPreferencesInput,
  Promise<ChannelPreferencesOutput>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = updateChannelPreferencesInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    logger.warn('Invalid channel preferences update', { error: parseResult.error })
    throw new HttpsError('invalid-argument', 'Invalid channel preferences format')
  }

  const updates = parseResult.data

  try {
    const prefsRef = getDb()
      .collection('users')
      .doc(user.uid)
      .collection('settings')
      .doc('channelPreferences')

    // Get current preferences
    const prefsDoc = await prefsRef.get()
    const currentPrefs: NotificationChannelPreferences = prefsDoc.exists
      ? (prefsDoc.data() as NotificationChannelPreferences)
      : { ...defaultChannelPreferences }

    // Merge updates (loginAlerts is already excluded from input schema)
    // Use spread to merge, then override loginAlerts for security
    const merged = {
      ...currentPrefs,
      ...updates,
      // Always ensure login alerts are locked
      loginAlerts: { push: true, email: true, sms: false } as const,
    }

    // Normalize deviceSyncAlerts email field if present
    const updatedPrefs = notificationChannelPreferencesSchema.parse(merged)

    // Save updated preferences
    await prefsRef.set(updatedPrefs)

    logger.info('Updated channel preferences', { userId: user.uid })

    return {
      success: true,
      preferences: updatedPrefs,
    }
  } catch (error) {
    logger.error('Failed to update channel preferences', { userId: user.uid, error })
    throw new HttpsError('internal', 'Failed to update notification preferences')
  }
})

/**
 * Get channel preferences for the authenticated user.
 *
 * Returns current preferences or defaults if none are set.
 */
export const getChannelPreferences = onCall<void, Promise<ChannelPreferencesOutput>>(
  async (request) => {
    // 1. Auth (FIRST)
    const user = verifyAuth(request.auth)

    try {
      const prefsRef = getDb()
        .collection('users')
        .doc(user.uid)
        .collection('settings')
        .doc('channelPreferences')

      const prefsDoc = await prefsRef.get()

      if (!prefsDoc.exists) {
        // Return defaults
        return {
          success: true,
          preferences: { ...defaultChannelPreferences },
        }
      }

      const prefs = prefsDoc.data() as NotificationChannelPreferences

      // Ensure locked channels are always correct
      const normalizedPrefs: NotificationChannelPreferences = {
        ...defaultChannelPreferences,
        ...prefs,
        loginAlerts: { push: true, email: true, sms: false },
      }

      return {
        success: true,
        preferences: normalizedPrefs,
      }
    } catch (error) {
      logger.error('Failed to get channel preferences', { userId: user.uid, error })
      throw new HttpsError('internal', 'Failed to retrieve notification preferences')
    }
  }
)
