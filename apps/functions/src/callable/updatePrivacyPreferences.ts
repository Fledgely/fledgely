/**
 * Update Privacy Preferences - Callable
 *
 * Story 51.7: Privacy Dashboard - AC6
 *
 * Allows users to update their privacy preferences.
 * Controls for marketing emails and analytics.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  DEFAULT_PRIVACY_PREFERENCES,
  type UpdatePrivacyPreferencesInput,
  type UpdatePrivacyPreferencesResponse,
  type PrivacyPreferences,
} from '@fledgely/shared'

export const updatePrivacyPreferences = onCall<
  UpdatePrivacyPreferencesInput,
  Promise<UpdatePrivacyPreferencesResponse>
>(
  { maxInstances: 20 },
  async (
    request: CallableRequest<UpdatePrivacyPreferencesInput>
  ): Promise<UpdatePrivacyPreferencesResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const input = request.data

    try {
      // Verify user exists
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      // Get existing preferences
      const prefsRef = db.collection('users').doc(uid).collection('settings').doc('privacy')
      const prefsDoc = await prefsRef.get()

      let currentPrefs: PrivacyPreferences = {
        ...DEFAULT_PRIVACY_PREFERENCES,
        updatedAt: Date.now(),
      }

      if (prefsDoc.exists) {
        const data = prefsDoc.data()
        currentPrefs = {
          marketingEmails: data?.marketingEmails ?? DEFAULT_PRIVACY_PREFERENCES.marketingEmails,
          analyticsEnabled: data?.analyticsEnabled ?? DEFAULT_PRIVACY_PREFERENCES.analyticsEnabled,
          crashReportingEnabled:
            data?.crashReportingEnabled ?? DEFAULT_PRIVACY_PREFERENCES.crashReportingEnabled,
          updatedAt: data?.updatedAt || Date.now(),
        }
      }

      // Apply updates
      const updatedPrefs: PrivacyPreferences = {
        marketingEmails:
          input.marketingEmails !== undefined
            ? input.marketingEmails
            : currentPrefs.marketingEmails,
        analyticsEnabled:
          input.analyticsEnabled !== undefined
            ? input.analyticsEnabled
            : currentPrefs.analyticsEnabled,
        crashReportingEnabled:
          input.crashReportingEnabled !== undefined
            ? input.crashReportingEnabled
            : currentPrefs.crashReportingEnabled,
        updatedAt: Date.now(),
      }

      // Save preferences
      await prefsRef.set(updatedPrefs)

      logger.info('Privacy preferences updated', {
        uid,
        changes: {
          marketingEmails: input.marketingEmails !== undefined,
          analyticsEnabled: input.analyticsEnabled !== undefined,
          crashReportingEnabled: input.crashReportingEnabled !== undefined,
        },
      })

      return {
        success: true,
        preferences: updatedPrefs,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to update privacy preferences', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to update privacy preferences')
    }
  }
)
