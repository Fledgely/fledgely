/**
 * Adult Pattern Detection HTTP Endpoints
 *
 * Story 8.10: Adult Pattern Detection
 *
 * AC2: Verification prompt sent to parent
 * AC3: Parent confirmation flow - confirm adult disables monitoring
 * AC4: Parent can explain pattern - clears flag
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  respondToAdultPatternInputSchema,
  validateAdultPatternResponse,
  type RespondToAdultPatternResponse,
  type GetAdultPatternFlagsResponse,
} from '@fledgely/shared'
import {
  getPendingFlagsForFamily,
  getAdultPatternFlag,
  markFlagAsExplained,
  markFlagAsConfirmedAdult,
} from '../../services/adultPattern'

const db = getFirestore()

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * Get the family ID for a user (guardian).
 */
async function getUserFamilyId(uid: string): Promise<string | null> {
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) {
    return null
  }
  return (userDoc.data()?.familyId as string) || null
}

/**
 * Check if user is a guardian for the family.
 */
async function isGuardianForFamily(uid: string, familyId: string): Promise<boolean> {
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    return false
  }

  const family = familyDoc.data()
  const guardians = family?.guardians || []

  return guardians.some((g: { uid: string }) => g.uid === uid)
}

/**
 * Get pending adult pattern flags for the current user's family.
 *
 * GET /getAdultPatternFlags
 *
 * Response:
 * - 200: { flags: AdultPatternFlag[] }
 * - 401: Not authenticated
 * - 403: Not a guardian
 */
export const getAdultPatternFlags = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Authenticate
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token for adult pattern flags', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    try {
      // Get user's family
      const familyId = await getUserFamilyId(decodedToken.uid)
      if (!familyId) {
        res.status(403).json({ error: 'User has no family' })
        return
      }

      // Verify user is a guardian
      const isGuardian = await isGuardianForFamily(decodedToken.uid, familyId)
      if (!isGuardian) {
        res.status(403).json({ error: 'Only guardians can view adult pattern flags' })
        return
      }

      const flags = await getPendingFlagsForFamily(familyId)

      const response: GetAdultPatternFlagsResponse = { flags }
      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to get adult pattern flags', {
        uid: decodedToken.uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to get flags' })
    }
  }
)

/**
 * Respond to an adult pattern flag.
 *
 * POST /respondToAdultPattern
 * Body: {
 *   flagId: string,
 *   response: 'confirm_adult' | 'explain_pattern',
 *   explanation?: string (required if response is 'explain_pattern')
 * }
 *
 * Response:
 * - 200: RespondToAdultPatternResponse
 * - 400: Invalid input
 * - 401: Not authenticated
 * - 403: Not authorized for this flag
 * - 404: Flag not found
 */
export const respondToAdultPattern = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60, // Longer timeout for delete operations
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Authenticate
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token for adult pattern response', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    // Validate input
    const parseResult = respondToAdultPatternInputSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: parseResult.error.issues,
      })
      return
    }

    const input = parseResult.data

    // Validate explanation is provided when needed
    const validationError = validateAdultPatternResponse(input)
    if (validationError) {
      res.status(400).json({ error: validationError })
      return
    }

    try {
      // Get user's family
      const familyId = await getUserFamilyId(decodedToken.uid)
      if (!familyId) {
        res.status(403).json({ error: 'User has no family' })
        return
      }

      // Verify user is a guardian
      const isGuardian = await isGuardianForFamily(decodedToken.uid, familyId)
      if (!isGuardian) {
        res.status(403).json({ error: 'Only guardians can respond to adult pattern flags' })
        return
      }

      // Get the flag
      const flag = await getAdultPatternFlag(input.flagId, familyId)
      if (!flag) {
        res.status(404).json({ error: 'Flag not found' })
        return
      }

      // Verify flag belongs to this family
      if (flag.familyId !== familyId) {
        res.status(403).json({ error: 'Not authorized for this flag' })
        return
      }

      // Check flag is still pending
      if (flag.status !== 'pending') {
        res.status(400).json({
          error: `Flag already has status: ${flag.status}`,
        })
        return
      }

      let response: RespondToAdultPatternResponse

      if (input.response === 'confirm_adult') {
        // AC3: Disable monitoring and delete screenshots
        const result = await markFlagAsConfirmedAdult(
          input.flagId,
          familyId,
          flag.childId,
          decodedToken.uid
        )

        logger.info('Adult pattern confirmed, monitoring disabled', {
          flagId: input.flagId,
          childId: flag.childId,
          familyId,
          respondedBy: decodedToken.uid,
          screenshotsDeleted: result.screenshotsDeleted,
        })

        response = {
          success: true,
          newStatus: 'confirmed_adult',
          message:
            'Monitoring has been disabled for this profile. All screenshots have been deleted.',
          monitoringDisabled: true,
          screenshotsDeleted: result.screenshotsDeleted,
        }
      } else {
        // AC4: Clear flag with explanation
        await markFlagAsExplained(input.flagId, familyId, decodedToken.uid, input.explanation!)

        logger.info('Adult pattern explained', {
          flagId: input.flagId,
          childId: flag.childId,
          familyId,
          respondedBy: decodedToken.uid,
          explanationLength: input.explanation!.length,
        })

        response = {
          success: true,
          newStatus: 'explained',
          message:
            'Thank you for your explanation. This flag has been cleared and analysis will be paused for 90 days.',
        }
      }

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to respond to adult pattern flag', {
        flagId: input.flagId,
        uid: decodedToken.uid,
        response: input.response,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to process response' })
    }
  }
)
