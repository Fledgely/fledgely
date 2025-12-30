/**
 * Cloud Function for safely unenrolling devices (admin only).
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * CRITICAL SAFETY DESIGN:
 * - Requires safety-team custom claim
 * - NO notification to any family member
 * - NO family audit log entry
 * - Admin audit only
 * - Supports batch unenrollment
 * - Requires minimum 2 of 4 identity verification checks
 *
 * Implements acceptance criteria:
 * - AC1: Silent device unenrollment command
 * - AC4: No notification to any party
 * - AC6: Admin audit logging only
 * - AC8: Batch device unenrollment
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

// Minimum verification count required before unenrollment
const MINIMUM_VERIFICATION_COUNT = 2

// Input validation schema
const unenrollDevicesForSafetyInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  deviceIds: z.array(z.string().min(1)).min(1).max(50),
})

interface UnenrollDevicesForSafetyResponse {
  success: boolean
  message: string
  unenrolledCount: number
  skippedCount: number
}

/**
 * Unenroll devices from a family as part of safety escape process.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - NO email notification is sent to any family member
 * - NO push notification is sent to any family member
 * - NO in-app notification is created
 * - NO audit log entry appears in family-visible logs
 * - Admin audit only in adminAuditLogs collection
 */
export const unenrollDevicesForSafety = onCall<
  z.infer<typeof unenrollDevicesForSafetyInputSchema>,
  Promise<UnenrollDevicesForSafetyResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'unenroll_devices_for_safety')

    // 2. Validate input
    const parseResult = unenrollDevicesForSafetyInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid parameters')
    }
    const { ticketId, familyId, deviceIds } = parseResult.data

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
        `Insufficient identity verification. Required: ${MINIMUM_VERIFICATION_COUNT}, Current: ${verifiedCount}`
      )
    }

    // 4. Verify family exists
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    // 5. Batch update devices - use transaction for atomicity
    const devicesRef = familyRef.collection('devices')
    let unenrolledCount = 0
    let skippedCount = 0
    const unenrolledDeviceIds: string[] = []
    const skippedDeviceIds: string[] = []

    const batch = db.batch()

    for (const deviceId of deviceIds) {
      const deviceRef = devicesRef.doc(deviceId)
      const deviceDoc = await deviceRef.get()

      if (!deviceDoc.exists) {
        // Device not found - skip silently
        skippedCount++
        skippedDeviceIds.push(deviceId)
        continue
      }

      const deviceData = deviceDoc.data()
      if (deviceData?.status === 'unenrolled') {
        // Already unenrolled - skip silently (idempotent)
        skippedCount++
        skippedDeviceIds.push(deviceId)
        continue
      }

      // Update device with safety unenrollment
      batch.update(deviceRef, {
        status: 'unenrolled',
        unenrolledAt: FieldValue.serverTimestamp(),
        unenrolledBy: context.agentId,
        safetyUnenrollment: true,
        safetyTicketId: ticketId,
      })

      unenrolledCount++
      unenrolledDeviceIds.push(deviceId)
    }

    // Commit the batch
    await batch.commit()

    // 6. Log action to adminAuditLogs with full context (single entry for batch)
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'unenroll_devices_for_safety',
      resourceType: 'device',
      resourceId: familyId, // Use familyId as resource since this is a batch operation
      metadata: {
        ticketId,
        familyId,
        deviceIds: unenrolledDeviceIds,
        skippedDeviceIds,
        unenrolledCount,
        skippedCount,
        verificationCount: verifiedCount,
      },
      ipAddress: context.ipAddress,
    })

    // 7. Update ticket with internal note about devices unenrolled
    await ticketRef.update({
      internalNotes: FieldValue.arrayUnion({
        id: `note_unenroll_${Date.now()}`,
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        content: `Devices unenrolled: ${unenrolledCount} device(s) remotely unenrolled from family`,
        createdAt: new Date(),
      }),
      history: FieldValue.arrayUnion({
        action: 'devices_unenrolled',
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        timestamp: FieldValue.serverTimestamp(),
        details: `Family: ${familyId}, Devices: ${unenrolledDeviceIds.join(', ')}`,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // CRITICAL: NO notification to any party
    // CRITICAL: NO family audit log entry

    return {
      success: true,
      message:
        unenrolledCount > 0
          ? `${unenrolledCount} device(s) unenrolled successfully`
          : 'No devices required unenrollment',
      unenrolledCount,
      skippedCount,
    }
  }
)
