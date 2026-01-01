/**
 * Get Active Offline Exception HTTP Endpoint
 * Story 32.5: Offline Time Exceptions
 *
 * Fetches any currently active offline exception for a family.
 * Called by Chrome extension to check if enforcement should be modified.
 *
 * Returns the active exception (pause, skip, work, homework) if one exists,
 * or 404 if no active exception.
 *
 * Follows Cloud Functions Template pattern:
 * 1. Validation (FIRST) - validate request body
 * 2. Business logic (LAST) - fetch active exception from Firestore
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import * as logger from 'firebase-functions/logger'

/**
 * Request body schema
 */
const getActiveExceptionRequestSchema = z.object({
  familyId: z.string().min(1, 'familyId is required'),
})

/**
 * Offline exception type - matches shared schema
 */
export type OfflineExceptionType = 'pause' | 'skip' | 'work' | 'homework'
export type OfflineExceptionStatus = 'active' | 'completed' | 'cancelled'

/**
 * Offline exception record
 */
export interface OfflineException {
  id: string
  familyId: string
  type: OfflineExceptionType
  requestedBy: string
  requestedByName?: string
  approvedBy?: string
  startTime: number
  endTime: number | null
  status: OfflineExceptionStatus
  createdAt: number
  whitelistedUrls?: string[]
  whitelistedCategories?: string[]
}

/**
 * HTTP endpoint to get active offline exception for a family
 *
 * Returns:
 * - 200 with exception data if active exception exists
 * - 404 if no active exception
 * - 400 for invalid request
 * - 500 for server errors
 */
export const getActiveOfflineException = onRequest(
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
      const parseResult = getActiveExceptionRequestSchema.safeParse(req.body)
      if (!parseResult.success) {
        logger.warn('Invalid getActiveOfflineException request', {
          errors: parseResult.error.flatten(),
        })
        res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const { familyId } = parseResult.data

      // 2. Query for active exceptions
      const db = getFirestore()
      const now = Date.now()

      // Query exceptions with status 'active'
      const exceptionsSnapshot = await db
        .collection('families')
        .doc(familyId)
        .collection('offlineExceptions')
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()

      if (exceptionsSnapshot.empty) {
        logger.info('No active offline exception', { familyId })
        res.status(404).json({ error: 'No active exception' })
        return
      }

      const doc = exceptionsSnapshot.docs[0]
      const data = doc.data()

      // Check if exception has expired (endTime passed)
      if (data.endTime && data.endTime < now) {
        // Auto-complete expired exception
        await doc.ref.update({
          status: 'completed',
          updatedAt: now,
        })

        logger.info('Auto-completed expired exception', {
          familyId,
          exceptionId: doc.id,
          type: data.type,
        })

        res.status(404).json({ error: 'No active exception' })
        return
      }

      // Build response
      const exception: OfflineException = {
        id: doc.id,
        familyId: data.familyId,
        type: data.type,
        requestedBy: data.requestedBy,
        requestedByName: data.requestedByName,
        approvedBy: data.approvedBy,
        startTime: data.startTime,
        endTime: data.endTime ?? null,
        status: 'active',
        createdAt: data.createdAt?.toMillis?.() ?? data.createdAt,
        whitelistedUrls: data.whitelistedUrls,
        whitelistedCategories: data.whitelistedCategories,
      }

      logger.info('Fetched active offline exception', {
        familyId,
        exceptionId: doc.id,
        type: exception.type,
      })

      res.status(200).json(exception)
    } catch (error) {
      logger.error('Failed to fetch active offline exception', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
