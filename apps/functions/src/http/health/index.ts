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
} from '../../services/health'

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
