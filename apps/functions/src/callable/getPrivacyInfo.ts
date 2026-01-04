/**
 * Get Privacy Info - Callable
 *
 * Story 51.7: Privacy Dashboard - AC1, AC2, AC3, AC4
 *
 * Returns privacy information for the authenticated user.
 * Provides transparency about data collection, storage, and access.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  DataCategory,
  DataCategoryInfo,
  DataRetentionPolicy,
  RetentionPeriodInfo,
  StorageRegion,
  StorageRegionInfo,
  AccessLevel,
  DEFAULT_PRIVACY_PREFERENCES,
  type DataCategoryValue,
  type GetPrivacyInfoResponse,
  type FamilyAccessInfo,
  type PrivacyPreferences,
} from '@fledgely/shared'

export const getPrivacyInfo = onCall<Record<string, never>, Promise<GetPrivacyInfoResponse>>(
  { maxInstances: 20 },
  async (request: CallableRequest<Record<string, never>>): Promise<GetPrivacyInfoResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()

    try {
      // Get user data
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()
      const familyId = userData?.familyId

      // Build data categories with retention info
      const dataCategories = Object.values(DataCategory).map((category) => {
        const info = DataCategoryInfo[category as DataCategoryValue]
        const retentionPeriod = DataRetentionPolicy[category as DataCategoryValue]
        const retentionDescription = RetentionPeriodInfo[retentionPeriod]

        return {
          category: category as DataCategoryValue,
          label: info.label,
          description: info.description,
          examples: info.examples,
          retentionPeriod,
          retentionDescription,
        }
      })

      // Get storage region (default to US Central)
      const storageRegion = StorageRegion.US_CENTRAL
      const regionInfo = StorageRegionInfo[storageRegion]

      // Get family access info
      const familyAccess: FamilyAccessInfo[] = []

      if (familyId) {
        const familyDoc = await db.collection('families').doc(familyId).get()
        if (familyDoc.exists) {
          const familyData = familyDoc.data()
          const memberIds = familyData?.memberIds || []

          for (const memberId of memberIds) {
            const memberDoc = await db.collection('users').doc(memberId).get()
            if (!memberDoc.exists) continue

            const memberData = memberDoc.data()
            const memberRole = memberData?.role || 'parent'

            let accessLevel = AccessLevel.PARENT
            let dataAccess: string[] = ['Family data', 'Shared agreements']

            if (memberRole === 'child') {
              accessLevel = AccessLevel.CHILD
              dataAccess = ['Own profile', 'Own screenshots (if shared)', 'Messages']
            } else if (memberId === familyData?.ownerId) {
              accessLevel = AccessLevel.OWNER
              dataAccess = ['All family data', 'Billing info', 'Admin controls']
            }

            familyAccess.push({
              uid: memberId,
              name: memberData?.displayName || 'Family Member',
              accessLevel,
              dataAccess,
            })
          }
        }
      }

      // Add support access info
      familyAccess.push({
        uid: 'support',
        name: 'Fledgely Support',
        accessLevel: AccessLevel.SUPPORT,
        dataAccess: [
          'Account info (when you contact us)',
          'Aggregated usage data',
          'No screenshot access',
        ],
      })

      // Get privacy preferences
      const prefsDoc = await db
        .collection('users')
        .doc(uid)
        .collection('settings')
        .doc('privacy')
        .get()
      let preferences: PrivacyPreferences = {
        ...DEFAULT_PRIVACY_PREFERENCES,
        updatedAt: Date.now(),
      }

      if (prefsDoc.exists) {
        const prefsData = prefsDoc.data()
        preferences = {
          marketingEmails:
            prefsData?.marketingEmails ?? DEFAULT_PRIVACY_PREFERENCES.marketingEmails,
          analyticsEnabled:
            prefsData?.analyticsEnabled ?? DEFAULT_PRIVACY_PREFERENCES.analyticsEnabled,
          crashReportingEnabled:
            prefsData?.crashReportingEnabled ?? DEFAULT_PRIVACY_PREFERENCES.crashReportingEnabled,
          updatedAt: prefsData?.updatedAt || Date.now(),
        }
      }

      // Get last password change (from auth metadata if available)
      const lastPasswordChange = userData?.lastPasswordChange || null

      // Get account creation date
      const accountCreated = userData?.createdAt || Date.now()

      return {
        dataCategories,
        storageRegion: {
          region: storageRegion,
          name: regionInfo.name,
          location: regionInfo.location,
        },
        familyAccess,
        preferences,
        lastPasswordChange,
        accountCreated,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to get privacy info', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to get privacy info')
    }
  }
)
