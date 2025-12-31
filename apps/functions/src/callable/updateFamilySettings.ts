/**
 * Cloud Function for updating family settings.
 *
 * Story 21.3: False Positive Throttling - AC4
 * Story 21.4: Concern Confidence Thresholds - AC3, AC4
 *
 * Allows guardians to update family settings including:
 * - Flag throttle level (minimal, standard, detailed, all)
 * - Confidence threshold level (sensitive, balanced, relaxed)
 * - Per-category confidence threshold overrides
 *
 * Security:
 * - Only authenticated users can update settings
 * - User must be a guardian of the family
 * - Changes are logged to audit trail
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { z } from 'zod'
import {
  flagThrottleLevelSchema,
  type FlagThrottleLevel,
  confidenceThresholdLevelSchema,
  categoryConfidenceThresholdsSchema,
  type ConfidenceThresholdLevel,
  type CategoryConfidenceThresholds,
} from '@fledgely/shared'

// Lazy initialization for Firestore (supports test mocking)
let db: Firestore | null = null
function getDb(): Firestore {
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
 * Input schema for updating family settings.
 *
 * Story 21.3: AC4 - Supports flagThrottleLevel setting
 * Story 21.4: AC3, AC4 - Supports confidenceThresholdLevel and categoryConfidenceThresholds
 */
export const updateFamilySettingsInputSchema = z.object({
  familyId: z.string().min(1, 'Family ID is required'),
  settings: z.object({
    /** Story 21.3: Flag throttle level */
    flagThrottleLevel: flagThrottleLevelSchema.optional(),
    /** Story 21.4: Global confidence threshold level */
    confidenceThresholdLevel: confidenceThresholdLevelSchema.optional(),
    /** Story 21.4: Per-category confidence threshold overrides */
    categoryConfidenceThresholds: categoryConfidenceThresholdsSchema,
  }),
})

/** Input type for updateFamilySettings callable */
export type UpdateFamilySettingsInput = z.infer<typeof updateFamilySettingsInputSchema>

/** Response from updateFamilySettings callable */
export interface UpdateFamilySettingsResponse {
  success: boolean
  message: string
  updatedSettings: {
    flagThrottleLevel?: FlagThrottleLevel
    confidenceThresholdLevel?: ConfidenceThresholdLevel
    categoryConfidenceThresholds?: CategoryConfidenceThresholds
  }
}

/**
 * Update family settings.
 *
 * Story 21.3: AC4 - Parent can adjust throttling threshold
 * Story 21.4: AC3, AC4 - Parent can adjust confidence thresholds
 */
export const updateFamilySettings = onCall<
  UpdateFamilySettingsInput,
  Promise<UpdateFamilySettingsResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify user is authenticated
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid

    // 2. Validate input
    const parseResult = updateFamilySettingsInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
      throw new HttpsError('invalid-argument', `Invalid parameters: ${errorMessage}`)
    }

    const { familyId, settings } = parseResult.data
    const firestore = getDb()

    // 3. Verify user is a guardian of the family
    const familyDoc = await firestore.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Only guardians can update family settings')
    }

    // 4. Build settings update object
    const settingsUpdate: Record<string, unknown> = {}
    const updatedSettings: UpdateFamilySettingsResponse['updatedSettings'] = {}

    if (settings.flagThrottleLevel !== undefined) {
      // Zod schema already validates throttle level - safe to use directly
      settingsUpdate['settings.flagThrottleLevel'] = settings.flagThrottleLevel
      updatedSettings.flagThrottleLevel = settings.flagThrottleLevel
    }

    // Story 21.4: Confidence threshold level
    if (settings.confidenceThresholdLevel !== undefined) {
      // Zod schema already validates threshold level - safe to use directly
      settingsUpdate['settings.confidenceThresholdLevel'] = settings.confidenceThresholdLevel
      updatedSettings.confidenceThresholdLevel = settings.confidenceThresholdLevel
    }

    // Story 21.4: Per-category confidence thresholds
    if (settings.categoryConfidenceThresholds !== undefined) {
      // Zod schema already validates thresholds - safe to use directly
      settingsUpdate['settings.categoryConfidenceThresholds'] =
        settings.categoryConfidenceThresholds
      updatedSettings.categoryConfidenceThresholds = settings.categoryConfidenceThresholds
    }

    // 5. Check if there are any settings to update
    if (Object.keys(settingsUpdate).length === 0) {
      return {
        success: true,
        message: 'No settings to update',
        updatedSettings: {},
      }
    }

    // 6. Update family document
    await firestore.collection('families').doc(familyId).update(settingsUpdate)

    // 7. Log to audit trail
    const auditEntry = {
      type: 'family_settings_updated',
      familyId,
      actorUid: userUid,
      timestamp: Date.now(),
      changes: updatedSettings,
    }

    await firestore.collection('families').doc(familyId).collection('auditLog').add(auditEntry)

    logger.info('Family settings updated', {
      familyId,
      actorUid: userUid,
      changes: updatedSettings,
    })

    return {
      success: true,
      message: 'Settings updated successfully',
      updatedSettings,
    }
  }
)
