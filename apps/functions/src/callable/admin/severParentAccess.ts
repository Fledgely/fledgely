/**
 * Cloud Function for severing parent access from a family (admin only).
 *
 * Story 0.5.4: Parent Access Severing
 * Story 0.5.7: 72-Hour Notification Stealth (integration)
 *
 * CRITICAL SAFETY DESIGN:
 * - Requires safety-team custom claim
 * - Requires identity verification threshold (minimum 2 of 4 checks)
 * - Requires confirmation phrase to prevent accidental severing
 * - Logged to admin audit ONLY (NO family audit)
 * - NO notification to any party
 * - Severed parent still sees "No families found" (not "You've been removed")
 * - Activates 72-hour stealth window on success (Story 0.5.7)
 *
 * Implements acceptance criteria:
 * - AC1: Parent access immediately revoked
 * - AC2: Other parent access remains intact
 * - AC3: Child profiles and data remain intact
 * - AC5: No notification sent about severing
 * - AC6: Severing logged in sealed admin audit only
 * - AC8: Severing confirmation workflow
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'
import { activateStealthWindow } from '../../lib/notifications/stealthWindow'

const db = getFirestore()

// Minimum verification checks required before severing
const MINIMUM_VERIFICATION_COUNT = 2

// Input validation schema (matches shared contracts)
const severParentAccessInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  parentUid: z.string().min(1),
  confirmationPhrase: z.string().min(1),
})

interface SeverParentAccessResponse {
  success: boolean
  message: string
}

/**
 * Sever a parent's access from a family.
 *
 * CRITICAL: This is a life-safety feature.
 * - Removes parent from guardianUids and guardians arrays
 * - Does NOT modify child documents
 * - Does NOT send any notifications
 * - Does NOT log to family audit
 * - Severed parent sees "No families found" on login
 */
export const severParentAccess = onCall<
  z.infer<typeof severParentAccessInputSchema>,
  Promise<SeverParentAccessResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'sever_parent_access')

    // 2. Validate input
    const parseResult = severParentAccessInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid parameters')
    }
    const { ticketId, familyId, parentUid, confirmationPhrase } = parseResult.data

    // 3. Verify ticket exists and has sufficient identity verification
    const ticketRef = db.collection('safetyTickets').doc(ticketId)
    const ticket = await ticketRef.get()
    if (!ticket.exists) {
      throw new HttpsError('not-found', 'Ticket not found')
    }
    const ticketData = ticket.data()

    // Check minimum verification threshold (2 of 4)
    const verification = ticketData?.verification || {}
    const verifiedCount = [
      verification.phoneVerified,
      verification.idDocumentVerified,
      verification.accountMatchVerified,
      verification.securityQuestionsVerified,
    ].filter(Boolean).length

    if (verifiedCount < MINIMUM_VERIFICATION_COUNT) {
      throw new HttpsError(
        'failed-precondition',
        `Insufficient identity verification. Minimum ${MINIMUM_VERIFICATION_COUNT} checks required.`
      )
    }

    // 4. Get family and verify parent exists
    const familyRef = db.collection('families').doc(familyId)
    const family = await familyRef.get()
    if (!family.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }
    const familyData = family.data()

    interface Guardian {
      uid: string
      email?: string
      displayName?: string
      role?: string
    }

    const parentToSever = familyData?.guardians?.find((g: Guardian) => g.uid === parentUid)
    if (!parentToSever) {
      throw new HttpsError('not-found', 'Parent not found in family')
    }

    // 5. Verify confirmation phrase
    const expectedPhrase = `SEVER ${parentToSever.email}`
    if (confirmationPhrase !== expectedPhrase) {
      throw new HttpsError('invalid-argument', 'Confirmation phrase does not match')
    }

    // 6. Ensure at least one guardian remains after severing
    const currentGuardianCount = familyData?.guardianUids?.length || 0
    if (currentGuardianCount <= 1) {
      throw new HttpsError('failed-precondition', 'Cannot sever last guardian from family')
    }

    // 7. Check if parent is already severed (idempotent operation)
    if (!familyData?.guardianUids?.includes(parentUid)) {
      // Parent already severed - return success (idempotent)
      return {
        success: true,
        message: 'Access already severed',
      }
    }

    // 8. Execute severing - atomic update
    // Remove from guardianUids array and filter guardians array
    const updatedGuardians =
      familyData?.guardians?.filter((g: Guardian) => g.uid !== parentUid) || []

    await familyRef.update({
      guardianUids: FieldValue.arrayRemove(parentUid),
      guardians: updatedGuardians,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 9. Log to admin audit ONLY (CRITICAL: NO family audit)
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'sever_parent_access',
      resourceType: 'family',
      resourceId: familyId,
      metadata: {
        ticketId,
        severedParentUid: parentUid,
        severedParentEmail: parentToSever.email || null,
        familyName: familyData?.name || null,
        remainingGuardians: currentGuardianCount - 1,
        verificationCount: verifiedCount,
      },
      ipAddress: context.ipAddress,
    })

    // 10. Update safety ticket with internal note
    await ticketRef.update({
      internalNotes: FieldValue.arrayUnion({
        id: `note_sever_${Date.now()}`,
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        content: `Parent access severed: ${parentToSever.email || parentUid} removed from family "${familyData?.name || familyId}"`,
        createdAt: Timestamp.now(),
      }),
      history: FieldValue.arrayUnion({
        action: 'parent_access_severed',
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: `Family: ${familyId}, Parent: ${parentUid}`,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // CRITICAL: NO notification to any party
    // CRITICAL: NO family audit log entry
    // Child documents are NOT modified (they reference familyId, not specific parents)

    // Story 0.5.7: Activate 72-hour stealth window
    await activateStealthWindow({
      familyId,
      ticketId,
      affectedUserIds: [parentUid], // The severed parent
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      ipAddress: context.ipAddress,
    })

    return {
      success: true,
      message: 'Access severed successfully',
    }
  }
)
