/**
 * Disable location features for safety callable function.
 *
 * Story 0.5.6: Location Feature Emergency Disable
 *
 * CRITICAL SAFETY DESIGN:
 * - Disables ALL location-revealing features for victim protection
 * - Sets safetyLocationDisabled flag on family/user documents
 * - NO notification to any party
 * - NO family audit log entry
 * - Admin audit logging only
 *
 * This story creates the INFRASTRUCTURE for location feature disable.
 * The actual location features (FR139, FR145, FR160) are not yet implemented
 * (planned for Epic 40). When those features are implemented, they MUST
 * check the safetyLocationDisabled flag before collecting/sharing location data.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

/**
 * Minimum verification checks required before location feature disable.
 * Matches parent severing and device unenrollment requirements.
 */
const MINIMUM_VERIFICATION_COUNT = 2

/**
 * Input schema for location feature disable.
 */
const disableLocationFeaturesForSafetyInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  userId: z.string().min(1).optional(), // Optional: for user-specific disable
})

/**
 * Response type for location feature disable.
 */
interface DisableLocationFeaturesResponse {
  success: boolean
  message: string
  featuresDisabledCount: number
  notificationsDeleted: number
}

/**
 * Count the number of verification checks completed.
 */
function countVerificationChecks(verification: {
  phoneVerified?: boolean
  idDocumentVerified?: boolean
  accountMatchVerified?: boolean
  securityQuestionsVerified?: boolean
}): number {
  return [
    verification.phoneVerified,
    verification.idDocumentVerified,
    verification.accountMatchVerified,
    verification.securityQuestionsVerified,
  ].filter(Boolean).length
}

/**
 * Disable location features for safety escape.
 *
 * CRITICAL: This function sets flags that MUST be checked by all future
 * location feature implementations. When location features are implemented
 * in Epic 40, they MUST respect safetyLocationDisabled flags.
 *
 * Features disabled:
 * - FR139: Location-based rule variations
 * - FR145: Location-based work mode
 * - FR160: New location alerts
 */
export const disableLocationFeaturesForSafety = onCall<
  z.infer<typeof disableLocationFeaturesForSafetyInputSchema>,
  Promise<DisableLocationFeaturesResponse>
>({ cors: true }, async (request) => {
  // 1. Verify safety-team role
  const context = await requireSafetyTeamRole(request, 'disable_location_features_for_safety')

  // 2. Validate input
  const parseResult = disableLocationFeaturesForSafetyInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid parameters: ticketId and familyId required')
  }
  const { ticketId, familyId, userId } = parseResult.data

  // 3. Verify ticket exists and has sufficient verification
  const ticketRef = db.collection('safetyTickets').doc(ticketId)
  const ticketSnap = await ticketRef.get()

  if (!ticketSnap.exists) {
    throw new HttpsError('not-found', 'Safety ticket not found')
  }

  const ticketData = ticketSnap.data()
  if (!ticketData) {
    throw new HttpsError('not-found', 'Safety ticket data not found')
  }

  // 4. Verify minimum verification threshold
  const verificationCount = countVerificationChecks(ticketData.verification || {})
  if (verificationCount < MINIMUM_VERIFICATION_COUNT) {
    throw new HttpsError(
      'failed-precondition',
      `Minimum ${MINIMUM_VERIFICATION_COUNT} verification checks required. Current: ${verificationCount}`
    )
  }

  // 5. Verify family exists
  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()

  if (!familySnap.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  // 6. Check if already disabled (idempotent)
  const familyData = familySnap.data()
  if (familyData?.safetyLocationDisabled === true) {
    // Already disabled - return success without changes
    return {
      success: true,
      message: 'Location features already disabled for this family',
      featuresDisabledCount: 3,
      notificationsDeleted: 0,
    }
  }

  // 7. Update family document with safety location disable flags
  await familyRef.update({
    safetyLocationDisabled: true,
    safetyLocationDisabledAt: FieldValue.serverTimestamp(),
    safetyLocationDisabledBy: context.agentId,
    safetyLocationTicketId: ticketId,
  })

  // 8. If userId provided, also update user document
  if (userId) {
    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()

    if (userSnap.exists) {
      await userRef.update({
        safetyLocationDisabled: true,
        safetyLocationDisabledAt: FieldValue.serverTimestamp(),
      })
    }
  }

  // 9. Delete pending location-related notifications (future-proof)
  // Note: notification queue not yet implemented, this is a no-op initially
  // When notification system is implemented, this should query for and delete
  // any pending notifications with type containing 'location'
  const notificationsDeleted = 0

  // 10. Mark historical location data for redaction
  // Set a flag that read-time queries will check to redact location data
  // The actual redaction happens when logs are queried, not here
  await familyRef.update({
    locationDataRedactedAt: FieldValue.serverTimestamp(),
    locationDataRedactedBy: context.agentId,
  })

  // 11. Log action to admin audit ONLY
  await logAdminAction({
    agentId: context.agentId,
    agentEmail: context.agentEmail,
    action: 'disable_location_features_for_safety',
    resourceType: 'location_settings',
    resourceId: familyId,
    metadata: {
      ticketId,
      familyId,
      userId: userId || null,
      featuresDisabled: ['FR139', 'FR145', 'FR160'],
      verificationCount,
    },
    ipAddress: context.ipAddress,
  })

  // CRITICAL: NO notification to any party
  // CRITICAL: NO family audit log entry

  // 12. Update ticket with internal note
  const now = new Date()
  await ticketRef.update({
    internalNotes: FieldValue.arrayUnion({
      id: `note_location_disable_${now.getTime()}`,
      agentId: context.agentId,
      content: `Location features disabled for family. Features affected: FR139 (location-based rules), FR145 (location-based work mode), FR160 (new location alerts).`,
      createdAt: now,
    }),
    history: FieldValue.arrayUnion({
      action: 'location_features_disabled',
      agentId: context.agentId,
      timestamp: now,
      metadata: {
        familyId,
        userId: userId || null,
        featuresDisabled: 3,
      },
    }),
    updatedAt: FieldValue.serverTimestamp(),
  })

  return {
    success: true,
    message: 'Location features disabled successfully',
    featuresDisabledCount: 3, // FR139, FR145, FR160
    notificationsDeleted,
  }
})
