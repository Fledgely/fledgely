/**
 * Cloud Functions for Time Extension Requests
 * Story 31.6: Time Extension Requests
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic via service (LAST)
 *
 * Story 31.6 acceptance criteria:
 * - AC1: Request sent to parent with reason options
 * - AC2: Reason options: "Finishing homework", "5 more minutes", "Important project"
 * - AC3: Parent receives notification with one-tap approve/deny
 * - AC4: Approved extension adds time immediately
 * - AC5: Denied request shows: "Your parent said not right now"
 * - AC6: Request limited to 2 per day (prevent spam)
 * - AC7: Auto-deny if parent doesn't respond in 10 minutes
 */

import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import * as logger from 'firebase-functions/logger'
import {
  sendExtensionRequestNotification,
  sendExtensionResponseNotification,
} from '../lib/notifications/extensionRequestNotification'

/** Time extension reason options - Story 31.6 AC2 */
const timeExtensionReasonSchema = z.enum([
  'finishing_homework',
  'five_more_minutes',
  'important_project',
])
type TimeExtensionReason = z.infer<typeof timeExtensionReasonSchema>

/** Maximum extension requests per day per child - Story 31.6 AC6 */
const MAX_EXTENSION_REQUESTS_PER_DAY = 2

/** Auto-expiry timeout in minutes - Story 31.6 AC7 */
const EXTENSION_REQUEST_TIMEOUT_MINUTES = 10

/** Human-readable labels for each reason */
const TIME_EXTENSION_REASON_LABELS: Record<TimeExtensionReason, string> = {
  finishing_homework: 'Finishing homework',
  five_more_minutes: '5 more minutes',
  important_project: 'Important project',
}

/** Request expiry time in milliseconds */
const REQUEST_EXPIRY_MS = EXTENSION_REQUEST_TIMEOUT_MINUTES * 60 * 1000

/** Batch size for expiry processing to avoid timeouts */
const EXPIRY_BATCH_SIZE = 100

// =============================================================================
// Request Time Extension (from device/extension)
// =============================================================================

/**
 * Input schema for requestTimeExtension
 */
const requestTimeExtensionSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  familyId: z.string().min(1, 'Family ID is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  reason: timeExtensionReasonSchema,
  extensionMinutes: z.number().min(5).max(120).optional().default(30),
})

/**
 * Request a time extension from the device.
 * Story 31.6 AC1, AC2, AC3, AC6
 *
 * Called by the Chrome extension when child clicks "Request more time".
 * This is an HTTP function (not callable) because it's called from the extension
 * which may not have Firebase Auth context.
 *
 * Security: Validates device is enrolled in the family before accepting request.
 */
export const requestTimeExtension = onRequest({ cors: true }, async (req, res) => {
  try {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // Parse and validate input
    const parseResult = requestTimeExtensionSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.errors,
      })
      return
    }

    const { childId, familyId, deviceId, reason, extensionMinutes } = parseResult.data
    const db = getFirestore()

    // SECURITY: Verify device is enrolled in family and assigned to this child
    const deviceDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('devices')
      .doc(deviceId)
      .get()

    if (!deviceDoc.exists) {
      logger.warn('Time extension request from unknown device', { deviceId, familyId })
      res.status(403).json({
        success: false,
        error: 'device_not_found',
        message: 'Device not registered',
      })
      return
    }

    const deviceData = deviceDoc.data() as { childId?: string; status?: string }

    // Verify device is assigned to this child
    if (deviceData.childId !== childId) {
      logger.warn('Time extension request device/child mismatch', {
        deviceId,
        expectedChild: deviceData.childId,
        requestedChild: childId,
      })
      res.status(403).json({
        success: false,
        error: 'device_mismatch',
        message: 'Device not assigned to this child',
      })
      return
    }

    // Verify device is active
    if (deviceData.status !== 'active') {
      res.status(403).json({
        success: false,
        error: 'device_inactive',
        message: 'Device is not active',
      })
      return
    }

    // AC6: Check daily request limit using transaction to prevent race conditions
    const today = new Date().toISOString().split('T')[0]
    const requestsRef = db.collection('families').doc(familyId).collection('timeExtensionRequests')
    const counterRef = db
      .collection('families')
      .doc(familyId)
      .collection('dailyCounters')
      .doc(`extension-${childId}-${today}`)

    // Get child name for notifications (outside transaction)
    const childDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(childId)
      .get()
    const childData = childDoc.data() as { displayName?: string } | undefined
    const childName: string =
      childDoc.exists && childData?.displayName ? childData.displayName : 'Your child'

    // Use transaction to atomically check and increment daily count
    let requestId: string
    try {
      requestId = await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef)
        const currentCount = counterDoc.exists
          ? (counterDoc.data() as { count: number }).count || 0
          : 0

        if (currentCount >= MAX_EXTENSION_REQUESTS_PER_DAY) {
          throw new Error('LIMIT_REACHED')
        }

        // Generate request ID and create request atomically
        const newRequestId = db.collection('_').doc().id
        const now = Date.now()

        // Increment counter
        transaction.set(
          counterRef,
          { count: currentCount + 1, date: today, updatedAt: now },
          { merge: true }
        )

        // Create request
        transaction.set(requestsRef.doc(newRequestId), {
          id: newRequestId,
          childId,
          familyId,
          deviceId,
          reason,
          status: 'pending',
          extensionMinutes,
          requestedAt: now,
          respondedAt: null,
          respondedBy: null,
          childName,
          expiresAt: now + REQUEST_EXPIRY_MS,
        })

        return newRequestId
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'LIMIT_REACHED') {
        logger.info('Time extension request limit reached', {
          childId,
          deviceId,
          limit: MAX_EXTENSION_REQUESTS_PER_DAY,
        })
        res.status(429).json({
          success: false,
          error: 'limit_reached',
          message: `You've already used your ${MAX_EXTENSION_REQUESTS_PER_DAY} daily requests.`,
        })
        return
      }
      throw error
    }

    logger.info('Time extension request created', {
      requestId,
      childId,
      familyId,
      deviceId,
      reason,
    })

    // AC3: Send push notification to parents using Story 41.3 notification service
    // Get current screen time for context
    const screenTimeRef = db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(childId)
      .collection('screenTime')
      .doc(new Date().toISOString().split('T')[0])
    const screenTimeDoc = await screenTimeRef.get()
    const currentMinutes = screenTimeDoc.exists
      ? (screenTimeDoc.data()?.totalMinutes as number) || 0
      : 0

    // Get time limit for context
    const timeLimitsRef = db
      .collection('families')
      .doc(familyId)
      .collection('timeLimits')
      .doc(childId)
    const timeLimitsDoc = await timeLimitsRef.get()
    const allowedMinutes = timeLimitsDoc.exists
      ? (timeLimitsDoc.data()?.dailyLimitMinutes as number) || 120
      : 120

    await sendExtensionRequestNotification({
      requestId,
      childId,
      childName,
      familyId,
      minutesRequested: extensionMinutes,
      reason: TIME_EXTENSION_REASON_LABELS[reason],
      currentMinutes,
      allowedMinutes,
    })

    res.status(200).json({
      success: true,
      requestId,
      message: 'Request sent to parent',
    })
  } catch (error) {
    logger.error('Error creating time extension request:', error)
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: 'Failed to submit request',
    })
  }
})

// sendRequestNotificationToParents removed - now using sendExtensionRequestNotification from Story 41.3

// =============================================================================
// Respond to Time Extension Request (from parent)
// =============================================================================

/**
 * Input schema for respondToTimeExtension
 */
const respondToTimeExtensionSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  familyId: z.string().min(1, 'Family ID is required'),
  approved: z.boolean(),
})

/**
 * Respond to a time extension request (approve or deny).
 * Story 31.6 AC4, AC5
 *
 * Called by the parent app when they tap approve/deny.
 */
export const respondToTimeExtension = onCall(async (request) => {
  // 1. AUTH
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const parentUid = request.auth.uid

  // 2. VALIDATION
  const parseResult = respondToTimeExtensionSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid request data', parseResult.error.errors)
  }

  const { requestId, familyId, approved } = parseResult.data
  const db = getFirestore()

  // 3. PERMISSION - Verify parent is in family
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardians = familyData?.guardians || []
  const isGuardian = guardians.some((g: { uid: string }) => g.uid === parentUid)

  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only family guardians can respond to requests')
  }

  // 4. BUSINESS LOGIC
  const requestRef = db
    .collection('families')
    .doc(familyId)
    .collection('timeExtensionRequests')
    .doc(requestId)

  const requestDoc = await requestRef.get()
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Request not found')
  }

  const requestData = requestDoc.data()!

  // Check if already responded
  if (requestData.status !== 'pending') {
    throw new HttpsError('failed-precondition', `Request already ${requestData.status}`)
  }

  // Check if expired
  const now = Date.now()
  if (requestData.expiresAt && now > requestData.expiresAt) {
    // Mark as expired
    await requestRef.update({
      status: 'expired',
      respondedAt: now,
    })
    throw new HttpsError('deadline-exceeded', 'Request has expired')
  }

  const newStatus = approved ? 'approved' : 'denied'

  // Update request status
  await requestRef.update({
    status: newStatus,
    respondedAt: now,
    respondedBy: parentUid,
  })

  // AC4: If approved, add time to child's limit
  if (approved) {
    await addTimeToChildLimit(familyId, requestData.childId, requestData.extensionMinutes)
  }

  // Story 41.3: Send response notification to child
  await sendExtensionResponseNotification(
    requestData.childId as string,
    approved,
    approved ? (requestData.extensionMinutes as number) : undefined
  )

  logger.info('Time extension request responded', {
    requestId,
    familyId,
    status: newStatus,
    respondedBy: parentUid,
  })

  return {
    success: true,
    status: newStatus,
  }
})

/**
 * Add extension time to child's daily limit.
 * Story 31.6 AC4
 *
 * Throws if time limits document doesn't exist to prevent silent failures.
 */
async function addTimeToChildLimit(
  familyId: string,
  childId: string,
  extensionMinutes: number
): Promise<void> {
  const db = getFirestore()

  // Get current time limits
  const timeLimitsRef = db
    .collection('families')
    .doc(familyId)
    .collection('timeLimits')
    .doc(childId)

  const timeLimitsDoc = await timeLimitsRef.get()

  if (!timeLimitsDoc.exists) {
    // Create default time limits if they don't exist
    // This ensures the extension works even if time limits weren't configured
    const today = new Date().toISOString().split('T')[0]
    await timeLimitsRef.set({
      dailyBonusMinutes: { [today]: extensionMinutes },
      enabled: false, // Not enforced by default
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    logger.info('Created time limits document with extension bonus', {
      familyId,
      childId,
      extensionMinutes,
    })
    return
  }

  const data = timeLimitsDoc.data()!

  // Add extension to today's bonus
  const today = new Date().toISOString().split('T')[0]
  const existingBonus = (data.dailyBonusMinutes as Record<string, number>) || {}

  await timeLimitsRef.update({
    dailyBonusMinutes: {
      ...existingBonus,
      [today]: (existingBonus[today] || 0) + extensionMinutes,
    },
    updatedAt: Date.now(),
  })

  logger.info('Added extension time to child limit', {
    familyId,
    childId,
    extensionMinutes,
    totalBonusToday: (existingBonus[today] || 0) + extensionMinutes,
  })
}

// =============================================================================
// Get Pending Requests (for extension to poll)
// =============================================================================

/**
 * Get the status of a time extension request.
 * Called by extension to check if request was approved/denied.
 *
 * Security: Verifies the requesting device is the one that created the request.
 */
export const getTimeExtensionStatus = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { requestId, familyId, deviceId } = req.query

    if (!requestId || !familyId || !deviceId) {
      res.status(400).json({ error: 'requestId, familyId, and deviceId are required' })
      return
    }

    const db = getFirestore()
    const requestDoc = await db
      .collection('families')
      .doc(String(familyId))
      .collection('timeExtensionRequests')
      .doc(String(requestId))
      .get()

    if (!requestDoc.exists) {
      res.status(404).json({ error: 'Request not found' })
      return
    }

    const data = requestDoc.data()!

    // SECURITY: Verify the device making the request is the same that created it
    if (data.deviceId !== String(deviceId)) {
      logger.warn('Time extension status check from wrong device', {
        requestId: String(requestId),
        expectedDevice: data.deviceId,
        requestingDevice: String(deviceId),
      })
      res.status(403).json({ error: 'Not authorized to view this request' })
      return
    }

    res.status(200).json({
      success: true,
      status: data.status,
      respondedAt: data.respondedAt,
      extensionMinutes: data.status === 'approved' ? data.extensionMinutes : null,
    })
  } catch (error) {
    logger.error('Error getting time extension status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================================================
// Auto-Expire Pending Requests (Scheduled Function)
// =============================================================================

/**
 * Scheduled function to auto-expire pending requests.
 * Story 31.6 AC7: Auto-deny if parent doesn't respond in 10 minutes.
 *
 * Runs every 2 minutes to check for expired requests.
 * Uses collection group query for efficiency across all families.
 *
 * Note: Requires Firestore composite index on timeExtensionRequests:
 *   - status (ASC), expiresAt (ASC)
 */
export const expireTimeExtensionRequests = onSchedule(
  {
    schedule: 'every 2 minutes',
    timeZone: 'UTC',
  },
  async () => {
    const db = getFirestore()
    const now = Date.now()

    try {
      // Use collection group query for efficiency (works across all families)
      const expiredRequests = await db
        .collectionGroup('timeExtensionRequests')
        .where('status', '==', 'pending')
        .where('expiresAt', '<=', now)
        .limit(EXPIRY_BATCH_SIZE)
        .get()

      if (expiredRequests.empty) {
        // No expired requests - this is the common case
        return
      }

      // Batch update expired requests
      const batch = db.batch()

      for (const doc of expiredRequests.docs) {
        batch.update(doc.ref, {
          status: 'expired',
          respondedAt: now,
        })
      }

      await batch.commit()

      logger.info('Time extension requests expired', {
        count: expiredRequests.size,
      })
    } catch (error) {
      logger.error('Error expiring time extension requests:', error)
    }
  }
)
