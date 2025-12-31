/**
 * Health Check-In HTTP Endpoints
 *
 * Story 27.5.1: Monthly Health Check-In Prompts
 *
 * Provides HTTP endpoints for:
 * - Getting/updating check-in settings
 * - Getting pending check-ins
 * - Submitting check-in responses
 */

import { onRequest, HttpsOptions } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import {
  getCheckInSettings,
  updateCheckInSettings,
  getPendingCheckInsForUser,
  getCheckIn,
  submitCheckInResponse,
  skipCheckIn,
  getCheckInPromptText,
  getFrictionSummary,
  getFrictionIndicators,
  cacheFrictionIndicators,
  createResolution,
  getResolutions,
} from '../../services/health'
import { RESOLUTION_MARKER_LABELS } from '@fledgely/shared'

const httpOptions: HttpsOptions = {
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 60,
}

/**
 * Verify Firebase auth token and return user UID.
 */
async function verifyAuth(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    const decodedToken = await getAuth().verifyIdToken(token)
    return decodedToken.uid
  } catch {
    return null
  }
}

/**
 * Get user's family ID.
 */
async function getUserFamilyId(userUid: string): Promise<string | null> {
  const db = getFirestore()
  const userDoc = await db.collection('users').doc(userUid).get()
  return userDoc.data()?.familyId || null
}

/**
 * Get check-in settings endpoint.
 *
 * Story 27.5.1 - AC5: Configurable frequency
 *
 * GET /getCheckInSettingsEndpoint
 * Authorization: Bearer <token>
 *
 * Response: { settings: CheckInSettings }
 */
export const getCheckInSettingsEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const familyId = await getUserFamilyId(userUid)
    if (!familyId) {
      res.status(404).json({ error: 'No family found' })
      return
    }

    const settings = await getCheckInSettings(familyId)
    res.json({ settings })
  } catch (error) {
    logger.error('Failed to get check-in settings', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update check-in settings endpoint.
 *
 * Story 27.5.1 - AC5: Configurable frequency
 *
 * POST /updateCheckInSettingsEndpoint
 * Authorization: Bearer <token>
 * Body: { enabled?: boolean, frequency?: 'weekly' | 'monthly' | 'quarterly' }
 *
 * Response: { settings: CheckInSettings }
 */
export const updateCheckInSettingsEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const familyId = await getUserFamilyId(userUid)
    if (!familyId) {
      res.status(404).json({ error: 'No family found' })
      return
    }

    const { enabled, frequency } = req.body

    // Validate frequency
    if (frequency && !['weekly', 'monthly', 'quarterly'].includes(frequency)) {
      res.status(400).json({ error: 'Invalid frequency' })
      return
    }

    await updateCheckInSettings(familyId, {
      ...(enabled !== undefined && { enabled }),
      ...(frequency && { frequency }),
    })

    const settings = await getCheckInSettings(familyId)
    res.json({ settings })
  } catch (error) {
    logger.error('Failed to update check-in settings', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get pending check-ins for the current user.
 *
 * GET /getPendingCheckInsEndpoint
 * Authorization: Bearer <token>
 *
 * Response: { checkIns: HealthCheckIn[] }
 */
export const getPendingCheckInsEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const checkIns = await getPendingCheckInsForUser(userUid)

    // Add prompt text to each check-in
    const checkInsWithPrompts = checkIns.map((checkIn) => {
      const prompt = getCheckInPromptText(checkIn.recipientType)
      return {
        ...checkIn,
        prompt,
      }
    })

    res.json({ checkIns: checkInsWithPrompts })
  } catch (error) {
    logger.error('Failed to get pending check-ins', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Submit a check-in response.
 *
 * Story 27.5.1 - AC4: Private responses
 *
 * POST /submitCheckInResponseEndpoint
 * Authorization: Bearer <token>
 * Body: { checkInId: string, response: { rating, followUp?, additionalNotes? } }
 *
 * Response: { success: true }
 */
export const submitCheckInResponseEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { checkInId, response } = req.body

    if (!checkInId || !response) {
      res.status(400).json({ error: 'Missing checkInId or response' })
      return
    }

    // Verify check-in belongs to this user
    const checkIn = await getCheckIn(checkInId)
    if (!checkIn) {
      res.status(404).json({ error: 'Check-in not found' })
      return
    }

    if (checkIn.recipientUid !== userUid) {
      res.status(403).json({ error: 'Not authorized to respond to this check-in' })
      return
    }

    if (checkIn.status !== 'pending') {
      res.status(400).json({ error: 'Check-in already completed' })
      return
    }

    // Validate response
    if (!['positive', 'neutral', 'concerned'].includes(response.rating)) {
      res.status(400).json({ error: 'Invalid rating' })
      return
    }

    await submitCheckInResponse(checkInId, {
      rating: response.rating,
      followUp: response.followUp || null,
      additionalNotes: response.additionalNotes || null,
    })

    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to submit check-in response', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Skip a check-in.
 *
 * POST /skipCheckInEndpoint
 * Authorization: Bearer <token>
 * Body: { checkInId: string }
 *
 * Response: { success: true }
 */
export const skipCheckInEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const { checkInId } = req.body

    if (!checkInId) {
      res.status(400).json({ error: 'Missing checkInId' })
      return
    }

    // Verify check-in belongs to this user
    const checkIn = await getCheckIn(checkInId)
    if (!checkIn) {
      res.status(404).json({ error: 'Check-in not found' })
      return
    }

    if (checkIn.recipientUid !== userUid) {
      res.status(403).json({ error: 'Not authorized to skip this check-in' })
      return
    }

    if (checkIn.status !== 'pending') {
      res.status(400).json({ error: 'Check-in already completed' })
      return
    }

    await skipCheckIn(checkInId)

    res.json({ success: true })
  } catch (error) {
    logger.error('Failed to skip check-in', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get friction summary for a family.
 *
 * Story 27.5.3 - AC3: Aggregate friction data
 * Story 27.5.3 - AC4: Pattern visibility
 *
 * GET /getFrictionSummaryEndpoint
 * Authorization: Bearer <token>
 * Query params: { periodDays?: number }
 *
 * Response: { summary: FrictionSummary }
 */
export const getFrictionSummaryEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const familyId = await getUserFamilyId(userUid)
    if (!familyId) {
      res.status(404).json({ error: 'No family found' })
      return
    }

    const periodDays = parseInt(req.query.periodDays as string) || 30

    const summary = await getFrictionSummary(familyId, periodDays)
    res.json({ summary })
  } catch (error) {
    logger.error('Failed to get friction summary', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get friction indicators for a family.
 *
 * Story 27.5.4 - Friction Indicators Dashboard
 * - AC1: Aggregated indicators (not specific responses)
 * - AC4: Privacy protection (no private check-in content revealed)
 * - AC5: Bilateral transparency (same view for both parties)
 *
 * GET /getFrictionIndicatorsEndpoint
 * Authorization: Bearer <token>
 *
 * Response: { indicators: FrictionIndicators }
 */
export const getFrictionIndicatorsEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const familyId = await getUserFamilyId(userUid)
    if (!familyId) {
      res.status(404).json({ error: 'No family found' })
      return
    }

    const indicators = await getFrictionIndicators(familyId)

    // Cache for child access (bilateral transparency - AC5)
    await cacheFrictionIndicators(indicators)

    res.json({ indicators })
  } catch (error) {
    logger.error('Failed to get friction indicators', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create a resolution marker.
 *
 * Story 27.5.6 - Resolution Markers
 * - AC1: Resolution markers available
 * - AC2: Either party can add
 *
 * POST /createResolutionEndpoint
 * Authorization: Bearer <token>
 * Body: { markerType: string, note?: string }
 *
 * Response: { resolution: Resolution, message: string }
 */
export const createResolutionEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const familyId = await getUserFamilyId(userUid)
    if (!familyId) {
      res.status(404).json({ error: 'No family found' })
      return
    }

    const { markerType, note } = req.body

    // Validate marker type
    const validMarkerTypes = Object.keys(RESOLUTION_MARKER_LABELS)
    if (!markerType || !validMarkerTypes.includes(markerType)) {
      res.status(400).json({ error: 'Invalid marker type' })
      return
    }

    // Get user info for display
    const db = getFirestore()
    const userDoc = await db.collection('users').doc(userUid).get()
    const userData = userDoc.data()
    const displayName = userData?.displayName || 'Family member'

    const resolution = await createResolution({
      familyId,
      createdBy: userUid,
      createdByType: 'parent', // HTTP endpoint is for parents
      createdByName: displayName,
      markerType,
      note,
    })

    // Story 27.5.6 - AC5: Celebrate repair
    const celebrationMessage =
      markerType === 'in_progress'
        ? "Thank you for being honest. You're making progress!"
        : 'Great job working through this together!'

    res.json({ resolution, message: celebrationMessage })
  } catch (error) {
    logger.error('Failed to create resolution', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get resolution history for a family.
 *
 * Story 27.5.6 - Resolution Markers - AC6
 *
 * GET /getResolutionsEndpoint
 * Authorization: Bearer <token>
 * Query params: { limit?: number }
 *
 * Response: { resolutions: Resolution[] }
 */
export const getResolutionsEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userUid = await verifyAuth(req.headers.authorization)
  if (!userUid) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const familyId = await getUserFamilyId(userUid)
    if (!familyId) {
      res.status(404).json({ error: 'No family found' })
      return
    }

    const limit = parseInt(req.query.limit as string) || 20
    const resolutions = await getResolutions(familyId, limit)
    res.json({ resolutions })
  } catch (error) {
    logger.error('Failed to get resolutions', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create a resolution marker (child endpoint).
 *
 * Story 27.5.6 - Resolution Markers
 * - AC2: Either parent or child can add
 *
 * POST /createChildResolutionEndpoint
 * Body: { familyId: string, childId: string, markerType: string, note?: string }
 *
 * Response: { resolution: Resolution, message: string }
 */
export const createChildResolutionEndpoint = onRequest(httpOptions, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const { familyId, childId, markerType, note } = req.body

    if (!familyId || !childId || !markerType) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    // Validate marker type
    const validMarkerTypes = Object.keys(RESOLUTION_MARKER_LABELS)
    if (!validMarkerTypes.includes(markerType)) {
      res.status(400).json({ error: 'Invalid marker type' })
      return
    }

    // Verify child belongs to family
    const db = getFirestore()
    const childDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(childId)
      .get()

    if (!childDoc.exists) {
      res.status(403).json({ error: 'Unauthorized' })
      return
    }

    const childData = childDoc.data()
    const displayName = childData?.name || 'Child'

    const resolution = await createResolution({
      familyId,
      createdBy: childId,
      createdByType: 'child',
      createdByName: displayName,
      markerType,
      note,
    })

    // Story 27.5.6 - AC5: Celebrate repair
    const celebrationMessage =
      markerType === 'in_progress'
        ? "Thank you for being honest. You're making progress!"
        : 'Great job working through this together!'

    res.json({ resolution, message: celebrationMessage })
  } catch (error) {
    logger.error('Failed to create child resolution', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})
