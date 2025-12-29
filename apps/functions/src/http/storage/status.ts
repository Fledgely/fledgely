/**
 * Storage Status HTTP Endpoint
 * Story 18.8: Storage Quota Monitoring
 *
 * Provides storage usage and quota information for a family.
 *
 * Follows Cloud Functions Template pattern:
 * 1. Auth (FIRST) - validate Firebase Auth token
 * 2. Validation (SECOND) - validate request params
 * 3. Permission (THIRD) - verify family membership
 * 4. Business logic (LAST) - return storage status
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import { getFamilyStorageUsage } from '../../lib/storage'

/**
 * Response structure for storage status
 */
export interface StorageStatusResponse {
  familyId: string
  usageBytes: number
  quotaBytes: number
  percentUsed: number
  plan: string
  isWarningLevel: boolean
  isQuotaExceeded: boolean
  usageFormatted: string
  quotaFormatted: string
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

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
 * Storage status HTTP endpoint
 *
 * GET /storageStatus?familyId={familyId}
 *
 * Headers:
 * - Authorization: Bearer {Firebase ID token}
 *
 * Response:
 * - 200: Storage status
 * - 400: Invalid request
 * - 401: Authentication required/failed
 * - 403: Not authorized to view this family's storage
 * - 404: Family not found
 * - 500: Server error
 */
export const storageStatus = onRequest(
  {
    cors: true,
    maxInstances: 20,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // 1. Auth (FIRST) - Validate Firebase Auth token
    const token = extractBearerToken(req.headers.authorization)
    if (!token) {
      res.status(401).json({ error: 'Authorization header required' })
      return
    }

    let decodedToken
    try {
      const auth = getAuth()
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      logger.warn('Invalid auth token', {
        errorType: error instanceof Error ? error.name : 'Unknown',
      })
      res.status(401).json({ error: 'Invalid authentication token' })
      return
    }

    const requesterId = decodedToken.uid

    // 2. Validation (SECOND) - Validate request params
    const { familyId } = req.query

    if (!familyId || typeof familyId !== 'string') {
      res.status(400).json({ error: 'familyId parameter required' })
      return
    }

    const db = getFirestore()

    // 3. Permission (THIRD) - Verify user is family member
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      res.status(404).json({ error: 'Family not found' })
      return
    }

    const familyData = familyDoc.data()
    const memberIds = familyData?.memberIds || []

    if (!memberIds.includes(requesterId)) {
      logger.warn('Unauthorized storage status access attempt', {
        requesterId,
        familyId,
      })
      res.status(403).json({ error: "Not authorized to view this family's storage" })
      return
    }

    // 4. Business logic (LAST) - Get and return storage status
    try {
      const usage = await getFamilyStorageUsage(familyId)

      const response: StorageStatusResponse = {
        familyId,
        usageBytes: usage.usageBytes,
        quotaBytes: usage.quotaBytes,
        percentUsed: usage.percentUsed,
        plan: usage.plan,
        isWarningLevel: usage.isWarningLevel,
        isQuotaExceeded: usage.isQuotaExceeded,
        usageFormatted: formatBytes(usage.usageBytes),
        quotaFormatted: formatBytes(usage.quotaBytes),
      }

      res.status(200).json(response)
    } catch (error) {
      logger.error('Failed to get storage status', {
        familyId,
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
      })
      res.status(500).json({ error: 'Failed to retrieve storage status' })
    }
  }
)
