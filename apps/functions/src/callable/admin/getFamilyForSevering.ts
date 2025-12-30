/**
 * Cloud Function for getting family information for severing (admin only).
 *
 * Story 0.5.4: Parent Access Severing
 *
 * CRITICAL SAFETY DESIGN:
 * - Requires safety-team custom claim
 * - Returns minimal guardian info for display only
 * - Identifies which parent is requesting escape
 * - All access logged to admin audit
 *
 * Implements acceptance criteria:
 * - AC7: Integration with safety dashboard
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { requireSafetyTeamRole } from '../../utils/safetyTeamAuth'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

// Input validation schema
const getFamilyForSeveringInputSchema = z.object({
  ticketId: z.string().min(1),
})

interface GuardianInfo {
  uid: string
  email: string
  displayName: string | null
  role: string
}

interface GetFamilyForSeveringResponse {
  family: {
    id: string
    name: string
    guardians: GuardianInfo[]
  } | null
  requestingUserUid: string | null
  requestingUserEmail: string | null
}

/**
 * Get family information for the severing modal.
 *
 * Looks up the safety ticket, finds the user who submitted it,
 * and returns their family info with guardian list.
 */
export const getFamilyForSevering = onCall<
  z.infer<typeof getFamilyForSeveringInputSchema>,
  Promise<GetFamilyForSeveringResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Verify safety-team role
    const context = await requireSafetyTeamRole(request, 'get_family_for_severing')

    // 2. Validate input
    const parseResult = getFamilyForSeveringInputSchema.safeParse(request.data)
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
    const userEmail = ticketData?.userEmail || null

    if (!userId) {
      // Anonymous ticket - no family to look up
      await logAdminAction({
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        action: 'get_family_for_severing',
        resourceType: 'safety_ticket',
        resourceId: ticketId,
        metadata: {
          result: 'no_user_id',
          message: 'Anonymous ticket - no user ID to look up family',
        },
        ipAddress: context.ipAddress,
      })

      return {
        family: null,
        requestingUserUid: null,
        requestingUserEmail: null,
      }
    }

    // 5. Find the user's family
    // Look for families where this user is a guardian
    const familiesQuery = db.collection('families').where('guardianUids', 'array-contains', userId)

    const familiesSnapshot = await familiesQuery.get()

    if (familiesSnapshot.empty) {
      // User has no family
      await logAdminAction({
        agentId: context.agentId,
        agentEmail: context.agentEmail,
        action: 'get_family_for_severing',
        resourceType: 'safety_ticket',
        resourceId: ticketId,
        metadata: {
          result: 'no_family',
          userId,
          userEmail,
          message: 'User has no family',
        },
        ipAddress: context.ipAddress,
      })

      return {
        family: null,
        requestingUserUid: userId,
        requestingUserEmail: userEmail,
      }
    }

    // 6. Get the first family (users should only be in one family)
    const familyDoc = familiesSnapshot.docs[0]
    const familyData = familyDoc.data()

    interface RawGuardian {
      uid: string
      email?: string
      displayName?: string
      role?: string
    }

    // 7. Extract guardian info for display
    const guardians: GuardianInfo[] = (familyData.guardians || []).map((g: RawGuardian) => ({
      uid: g.uid,
      email: g.email || 'Unknown',
      displayName: g.displayName || null,
      role: g.role || 'guardian',
    }))

    // 8. Log access
    await logAdminAction({
      agentId: context.agentId,
      agentEmail: context.agentEmail,
      action: 'get_family_for_severing',
      resourceType: 'family',
      resourceId: familyDoc.id,
      metadata: {
        ticketId,
        userId,
        userEmail,
        familyName: familyData.name,
        guardianCount: guardians.length,
      },
      ipAddress: context.ipAddress,
    })

    return {
      family: {
        id: familyDoc.id,
        name: familyData.name || 'Unknown Family',
        guardians,
      },
      requestingUserUid: userId,
      requestingUserEmail: userEmail,
    }
  }
)
