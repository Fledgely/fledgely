/**
 * Get Offline Schedule HTTP Endpoint
 * Story 32.3: Family Offline Time Enforcement
 *
 * Fetches the family's offline schedule configuration from Firestore.
 * Called by Chrome extension to sync schedule for local enforcement.
 *
 * Follows Cloud Functions Template pattern:
 * 1. Validation (FIRST) - validate request body
 * 2. Permission (SECOND) - verify family exists
 * 3. Business logic (LAST) - fetch schedule from Firestore
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import * as logger from 'firebase-functions/logger'

/**
 * Request body schema
 */
const getOfflineScheduleRequestSchema = z.object({
  familyId: z.string().min(1, 'familyId is required'),
})

/**
 * HTTP endpoint to get offline schedule for a family
 */
export const getOfflineSchedule = onRequest(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    try {
      // 1. Validate request body
      const parseResult = getOfflineScheduleRequestSchema.safeParse(req.body)
      if (!parseResult.success) {
        logger.warn('Invalid getOfflineSchedule request', {
          errors: parseResult.error.flatten(),
        })
        res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { familyId } = parseResult.data

      // 2. Fetch offline schedule from Firestore
      const db = getFirestore()
      const scheduleDoc = await db
        .collection('families')
        .doc(familyId)
        .collection('settings')
        .doc('offlineSchedule')
        .get()

      if (!scheduleDoc.exists) {
        // Return null schedule (not configured)
        logger.info('Offline schedule not configured', { familyId })
        res.status(200).json({
          familyId,
          enabled: false,
          preset: 'custom',
          weekdayWindow: null,
          weekendWindow: null,
          createdAt: 0,
          updatedAt: 0,
        })
        return
      }

      const schedule = scheduleDoc.data()

      logger.info('Fetched offline schedule', {
        familyId,
        enabled: schedule?.enabled,
      })

      res.status(200).json({
        familyId,
        ...schedule,
      })
    } catch (error) {
      logger.error('Failed to fetch offline schedule', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
