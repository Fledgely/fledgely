/**
 * sendViewingRateAlert Cloud Function - Story 3A.5
 *
 * Sends alerts to co-parents when screenshot viewing rate threshold is exceeded.
 *
 * SECURITY DESIGN:
 * - Only guardians can trigger alerts
 * - Alerts go to OTHER guardians only (not viewer, not child)
 * - Logged to admin audit for potential weaponization detection
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { familySchema } from '@fledgely/shared'
import { logAdminAction } from '../utils/adminAudit'

// Lazy initialization for Firestore
let db: ReturnType<typeof getFirestore> | null = null
function getDb() {
  if (!db) {
    db = getFirestore()
  }
  return db
}

// For testing - allows resetting the db
export function _resetDbForTesting() {
  db = null
}

/**
 * Rate alert configuration - hardcoded, NOT configurable.
 * Story 3A.5 AC1: Rate threshold is NOT user-configurable (prevents gaming)
 */
export const VIEWING_RATE_CONFIG = {
  /** Maximum screenshots per window before alert */
  threshold: 50,
  /** Window size in minutes */
  windowMinutes: 60,
} as const

/**
 * Input schema for viewing rate alert.
 */
export const sendViewingRateAlertInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** UID of the parent who exceeded the viewing rate */
  viewerUid: z.string().min(1),
  /** Number of screenshots viewed in the window */
  viewCount: z.number().min(1),
  /** Timeframe start (epoch milliseconds) */
  timeframeStart: z.number(),
  /** Timeframe end (epoch milliseconds) */
  timeframeEnd: z.number(),
})

export type SendViewingRateAlertInput = z.infer<typeof sendViewingRateAlertInputSchema>

// Helper to check if value is a Timestamp-like object
function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return value != null && typeof (value as { toDate?: unknown }).toDate === 'function'
}

// Convert Firestore Timestamp to Date
function convertFamilyTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }
  if (isTimestampLike(result.createdAt)) {
    result.createdAt = result.createdAt.toDate()
  }
  if (isTimestampLike(result.updatedAt)) {
    result.updatedAt = result.updatedAt.toDate()
  }
  if (Array.isArray(result.guardians)) {
    result.guardians = result.guardians.map((g: Record<string, unknown>) => ({
      ...g,
      addedAt: isTimestampLike(g.addedAt) ? g.addedAt.toDate() : g.addedAt,
    }))
  }
  return result
}

/**
 * Send viewing rate alert to co-parents.
 *
 * Called when a parent exceeds the screenshot viewing rate threshold.
 * Sends notification to OTHER guardians only (not the viewer, never the child).
 */
export const sendViewingRateAlert = onCall(async (request) => {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const callerUid = request.auth.uid

  // Validate input
  const parseResult = sendViewingRateAlertInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
  }

  const { familyId, viewerUid, viewCount, timeframeStart, timeframeEnd } = parseResult.data

  // SECURITY: Caller must be the viewer (prevent spoofing)
  if (callerUid !== viewerUid) {
    throw new HttpsError('permission-denied', 'Cannot send alert on behalf of another user')
  }

  // Get family document
  const db = getDb()
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const data = familyDoc.data()
  if (!data) {
    throw new HttpsError('internal', 'Family data is empty')
  }

  const convertedData = convertFamilyTimestamps(data)
  const family = familySchema.parse(convertedData)

  // Verify caller is a guardian
  const isGuardian = family.guardians.some((g) => g.uid === callerUid)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only guardians can trigger viewing rate alerts')
  }

  // Get other guardians (not the viewer)
  const otherGuardians = family.guardians.filter((g) => g.uid !== viewerUid)

  // Story 3A.5 AC3: Non-blocking - return success even if no other guardians
  if (otherGuardians.length === 0) {
    return {
      success: true,
      notifiedCount: 0,
      message: 'No other guardians to notify',
    }
  }

  // Log to admin audit (Story 3A.5 AC4)
  await logAdminAction({
    agentId: viewerUid,
    agentEmail: null,
    action: 'viewing_rate_exceeded',
    resourceType: 'viewing_rate_alert',
    resourceId: familyId,
    metadata: {
      familyId,
      viewerUid,
      viewCount,
      thresholdValue: VIEWING_RATE_CONFIG.threshold,
      windowMinutes: VIEWING_RATE_CONFIG.windowMinutes,
      timeframeStart,
      timeframeEnd,
      otherGuardianUids: otherGuardians.map((g) => g.uid),
      timestamp: Date.now(),
    },
  })

  // Create notification for each other guardian
  // Story 3A.5 AC2: Alert goes to other parent only (NOT child, NOT viewer)
  // Story 3A.5 AC5: Child NEVER receives notification
  const notificationPromises = otherGuardians.map(async (guardian) => {
    const notificationRef = db
      .collection('users')
      .doc(guardian.uid)
      .collection('notifications')
      .doc()

    await notificationRef.set({
      id: notificationRef.id,
      type: 'viewing_rate_alert',
      title: 'Monitoring Activity Alert',
      // Story 3A.5 AC2: Shows count and timeframe but NOT which screenshots
      message: `A family member has viewed ${viewCount} screenshots in the last hour.`,
      read: false,
      createdAt: new Date(),
      metadata: {
        familyId,
        viewCount,
        // Intentionally NOT including: viewerUid, screenshotIds, childId
      },
    })
  })

  await Promise.all(notificationPromises)

  return {
    success: true,
    notifiedCount: otherGuardians.length,
    message: `Alert sent to ${otherGuardians.length} guardian(s)`,
  }
})
