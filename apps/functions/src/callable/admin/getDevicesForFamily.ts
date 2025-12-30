/**
 * Cloud Function for getting devices associated with a family (admin only).
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * CRITICAL SAFETY DESIGN:
 * - Requires safety-team custom claim
 * - Returns device info for display in safety dashboard
 * - All access logged to admin audit
 *
 * Implements acceptance criteria:
 * - AC7: Integration with safety dashboard
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

// Input validation schema
const getDevicesForFamilyInputSchema = z.object({
  ticketId: z.string().min(1),
})

interface DeviceInfo {
  deviceId: string
  name: string
  type: 'chromebook' | 'android'
  childId: string | null
  lastSeen: number | null
  status: 'active' | 'offline' | 'unenrolled'
}

interface GetDevicesForFamilyResponse {
  familyId: string | null
  familyName: string | null
  devices: DeviceInfo[]
}

/**
 * Get devices associated with a family for the safety dashboard.
 *
 * Looks up the safety ticket, finds the user's family,
 * and returns the list of enrolled devices.
 */
export const getDevicesForFamily = onCall<
  z.infer<typeof getDevicesForFamilyInputSchema>,
  Promise<GetDevicesForFamilyResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'get_devices_for_family')

    // 2. Validate input
    const parseResult = getDevicesForFamilyInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid parameters')
    }
    const { ticketId } = parseResult.data

    // 3. Get the safety ticket
    const ticketRef = db.collection('safetyTickets').doc(ticketId)
    const ticket = await ticketRef.get()
    if (!ticket.exists) {
      throw new HttpsError('not-found', 'Ticket not found')
    }
    const ticketData = ticket.data()

    // 4. Get user ID from ticket
    const userId = ticketData?.userId

    if (!userId) {
      // Anonymous ticket - no family to look up
      await logAdminAction({
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        action: 'get_devices_for_family',
        resourceType: 'safety_ticket',
        resourceId: ticketId,
        metadata: {
          result: 'no_user_id',
          message: 'Anonymous ticket - no user ID to look up family',
        },
        ipAddress: context.ipAddress,
      })

      return {
        familyId: null,
        familyName: null,
        devices: [],
      }
    }

    // 5. Find the user's family
    const familiesQuery = db.collection('families').where('guardianUids', 'array-contains', userId)
    const familiesSnapshot = await familiesQuery.get()

    if (familiesSnapshot.empty) {
      // User has no family
      await logAdminAction({
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        action: 'get_devices_for_family',
        resourceType: 'safety_ticket',
        resourceId: ticketId,
        metadata: {
          result: 'no_family',
          userId,
          message: 'User has no family',
        },
        ipAddress: context.ipAddress,
      })

      return {
        familyId: null,
        familyName: null,
        devices: [],
      }
    }

    // 6. Get the first family (users should only be in one family)
    const familyDoc = familiesSnapshot.docs[0]
    const familyData = familyDoc.data()
    const familyId = familyDoc.id
    const familyName = familyData.name || 'Unknown Family'

    // 7. Get devices for this family
    const devicesRef = db.collection('families').doc(familyId).collection('devices')
    const devicesSnapshot = await devicesRef.get()

    interface RawDevice {
      deviceId?: string
      name?: string
      type?: 'chromebook' | 'android'
      childId?: string | null
      lastSeen?: Timestamp | { toMillis: () => number } | number
      status?: 'active' | 'offline' | 'unenrolled'
    }

    const devices: DeviceInfo[] = devicesSnapshot.docs.map((doc) => {
      const data = doc.data() as RawDevice
      let lastSeenMs: number | null = null

      if (data.lastSeen) {
        if (typeof data.lastSeen === 'number') {
          lastSeenMs = data.lastSeen
        } else if (
          typeof data.lastSeen === 'object' &&
          'toMillis' in data.lastSeen &&
          typeof data.lastSeen.toMillis === 'function'
        ) {
          lastSeenMs = data.lastSeen.toMillis()
        }
      }

      return {
        deviceId: doc.id,
        name: data.name || `Device ${doc.id.substring(0, 6)}`,
        type: data.type || 'chromebook',
        childId: data.childId || null,
        lastSeen: lastSeenMs,
        status: data.status || 'active',
      }
    })

    // 8. Log access
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'get_devices_for_family',
      resourceType: 'family',
      resourceId: familyId,
      metadata: {
        ticketId,
        userId,
        familyName,
        deviceCount: devices.length,
        activeDevices: devices.filter((d) => d.status === 'active').length,
      },
      ipAddress: context.ipAddress,
    })

    return {
      familyId,
      familyName,
      devices,
    }
  }
)
