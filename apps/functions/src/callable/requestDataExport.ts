/**
 * Cloud Function for requesting data export (GDPR Article 20).
 *
 * Story 51.1: Data Export Request - AC1, AC7
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST) - User must be authenticated
 * 2. Validation (SECOND) - Validate input
 * 3. Permission (THIRD) - User must be a guardian of the family
 * 4. Business logic (LAST) - Create export request
 *
 * Security:
 * - Only guardians can request data export
 * - One active export per family at a time
 * - Rate limited: 1 hour cooldown after completed export
 * - Rate limited: Max 3 exports per day per family
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  RequestDataExportInputSchema,
  RequestDataExportResponseSchema,
  DATA_EXPORT_CONFIG,
  type RequestDataExportInput,
  type RequestDataExportResponse,
} from '@fledgely/shared'
import { createExportRequest, findActiveExport, getExportRequest } from '../services/gdpr'

// Rate limiting configuration
const EXPORT_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour between exports
const MAX_EXPORTS_PER_DAY = 3
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Lazy initialization for Firestore (supports test mocking)
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Check rate limiting for data export requests.
 *
 * Returns null if request is allowed, or an error response if rate limited.
 *
 * Rate limits:
 * 1. 1 hour cooldown after a completed/failed/expired export
 * 2. Maximum 3 exports per 24-hour period per family
 */
async function checkExportRateLimit(
  familyId: string
): Promise<{ rateLimited: true; message: string; retryAfter?: number } | null> {
  const firestore = getDb()
  const now = Date.now()

  // Query recent exports for this family (last 24 hours)
  const oneDayAgo = now - ONE_DAY_MS
  const recentExportsSnapshot = await firestore
    .collection('dataExports')
    .where('familyId', '==', familyId)
    .where('requestedAt', '>', oneDayAgo)
    .orderBy('requestedAt', 'desc')
    .limit(MAX_EXPORTS_PER_DAY + 1)
    .get()

  const recentExports = recentExportsSnapshot.docs.map((doc) => doc.data())

  // Check 1: Max exports per day
  if (recentExports.length >= MAX_EXPORTS_PER_DAY) {
    const oldestRecentExport = recentExports[recentExports.length - 1]
    const retryAfter = Math.ceil((oldestRecentExport.requestedAt + ONE_DAY_MS - now) / 1000)

    logger.warn('Export rate limit exceeded (daily limit)', {
      familyId,
      exportsInLast24h: recentExports.length,
      maxAllowed: MAX_EXPORTS_PER_DAY,
    })

    return {
      rateLimited: true,
      message: `You have reached the maximum of ${MAX_EXPORTS_PER_DAY} exports per day. Please try again later.`,
      retryAfter,
    }
  }

  // Check 2: Cooldown after last completed/failed/expired export
  const lastCompletedExport = recentExports.find(
    (e) => e.status === 'completed' || e.status === 'failed' || e.status === 'expired'
  )

  if (lastCompletedExport) {
    const completedAt = lastCompletedExport.completedAt || lastCompletedExport.requestedAt
    const cooldownEnds = completedAt + EXPORT_COOLDOWN_MS

    if (now < cooldownEnds) {
      const retryAfter = Math.ceil((cooldownEnds - now) / 1000)
      const minutesRemaining = Math.ceil(retryAfter / 60)

      logger.warn('Export rate limit exceeded (cooldown)', {
        familyId,
        lastExportId: lastCompletedExport.exportId,
        cooldownEndsAt: new Date(cooldownEnds).toISOString(),
      })

      return {
        rateLimited: true,
        message: `Please wait ${minutesRemaining} minutes before requesting another export.`,
        retryAfter,
      }
    }
  }

  return null // Not rate limited
}

/**
 * Request a full data export for a family.
 *
 * Story 51.1: AC1 - Request export from settings
 * Story 51.1: AC7 - Prevent duplicate exports
 */
export const requestDataExport = onCall<RequestDataExportInput, Promise<RequestDataExportResponse>>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Auth (FIRST)
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid
    const userEmail = request.auth.token?.email

    if (!userEmail) {
      throw new HttpsError('unauthenticated', 'Email verification required')
    }

    // 2. Validation (SECOND)
    const parseResult = RequestDataExportInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
      throw new HttpsError('invalid-argument', `Invalid parameters: ${errorMessage}`)
    }

    const { familyId } = parseResult.data
    const firestore = getDb()

    // 3. Permission (THIRD) - Verify user is a guardian of the family
    const familyDoc = await firestore.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Only guardians can request data export')
    }

    // 4. Business logic (LAST)

    // Check rate limiting first
    const rateLimitResult = await checkExportRateLimit(familyId)
    if (rateLimitResult) {
      const response: RequestDataExportResponse = {
        success: false,
        status: 'failed',
        message: rateLimitResult.message,
      }
      RequestDataExportResponseSchema.parse(response)
      return response
    }

    // Check for existing active export (AC7)
    const activeExport = await findActiveExport(familyId)

    if (activeExport) {
      // Calculate estimated completion time (48 hours from request)
      const estimatedCompletionAt =
        activeExport.requestedAt + DATA_EXPORT_CONFIG.PROCESSING_TIMEOUT_MS

      logger.info('Export already in progress', {
        familyId,
        existingExportId: activeExport.exportId,
        status: activeExport.status,
      })

      const response: RequestDataExportResponse = {
        success: false,
        exportId: activeExport.exportId,
        status: 'already_in_progress',
        message: 'An export is already in progress for this family',
        estimatedCompletionAt,
        existingExportId: activeExport.exportId,
      }

      // Validate response
      RequestDataExportResponseSchema.parse(response)
      return response
    }

    // Create new export request
    try {
      const exportRequest = await createExportRequest(familyId, userUid, userEmail)

      // Calculate estimated completion time (48 hours from now)
      const estimatedCompletionAt = Date.now() + DATA_EXPORT_CONFIG.PROCESSING_TIMEOUT_MS

      logger.info('Data export requested', {
        familyId,
        exportId: exportRequest.exportId,
        requestedBy: userUid,
      })

      const response: RequestDataExportResponse = {
        success: true,
        exportId: exportRequest.exportId,
        status: 'pending',
        message: 'Export request submitted. You will receive an email when your data is ready.',
        estimatedCompletionAt,
      }

      // Validate response
      RequestDataExportResponseSchema.parse(response)
      return response
    } catch (error) {
      logger.error('Failed to create export request', {
        familyId,
        userUid,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new HttpsError('internal', 'Failed to create export request')
    }
  }
)

/**
 * Get the status of a data export.
 *
 * Story 51.1: Get export status for UI display
 */
export const getDataExportStatus = onCall<
  { familyId: string; exportId?: string },
  Promise<RequestDataExportResponse>
>(
  {
    cors: true,
  },
  async (request) => {
    // 1. Auth (FIRST)
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const userUid = request.auth.uid

    // 2. Validation (SECOND)
    const { familyId, exportId } = request.data || {}

    if (!familyId || typeof familyId !== 'string') {
      throw new HttpsError('invalid-argument', 'Family ID is required')
    }

    const firestore = getDb()

    // 3. Permission (THIRD) - Verify user is a guardian of the family
    const familyDoc = await firestore.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    const isGuardian = guardians.some((g: { uid: string }) => g.uid === userUid)

    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Only guardians can view export status')
    }

    // 4. Business logic (LAST)
    try {
      let exportRequest

      if (exportId) {
        // Get specific export
        exportRequest = await getExportRequest(exportId)
        if (exportRequest && exportRequest.familyId !== familyId) {
          throw new HttpsError('permission-denied', 'Export does not belong to this family')
        }
      } else {
        // Get latest active or completed export
        exportRequest = await findActiveExport(familyId)
      }

      if (!exportRequest) {
        return {
          success: true,
          status: 'pending',
          message: 'No export found. You can request a new export.',
        }
      }

      const response: RequestDataExportResponse = {
        success: true,
        exportId: exportRequest.exportId,
        status: exportRequest.status,
        message: getStatusMessage(exportRequest.status),
        estimatedCompletionAt: exportRequest.completedAt
          ? undefined
          : exportRequest.requestedAt + DATA_EXPORT_CONFIG.PROCESSING_TIMEOUT_MS,
      }

      return response
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }
      logger.error('Failed to get export status', {
        familyId,
        exportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new HttpsError('internal', 'Failed to get export status')
    }
  }
)

/**
 * Get human-readable status message.
 */
function getStatusMessage(
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired'
): string {
  switch (status) {
    case 'pending':
      return 'Your export request is queued and will be processed shortly.'
    case 'processing':
      return 'Your data export is being generated. This may take some time.'
    case 'completed':
      return 'Your data export is ready for download.'
    case 'failed':
      return 'Export generation failed. Please try again.'
    case 'expired':
      return 'Your export has expired. Please request a new export.'
    default:
      return 'Unknown status.'
  }
}
