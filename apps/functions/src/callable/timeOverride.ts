/**
 * Cloud Functions for Emergency Time Overrides
 * Story 31.7: Time Limit Override for Emergencies
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic via service (LAST)
 *
 * Story 31.7 acceptance criteria:
 * - AC1: Parent can grant temporary unlimited access
 * - AC2: Override durations: 30m, 1h, 2h, "Rest of day"
 * - AC3: Override reason logged
 * - AC4: Child sees "[Parent] gave you extra time today"
 * - AC5: Override visible in audit log
 * - AC6: Next day unaffected
 */

import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import * as logger from 'firebase-functions/logger'

/** Override reason options - Story 31.7 AC3 */
const overrideReasonSchema = z.enum(['school_emergency', 'travel', 'other'])
type OverrideReason = z.infer<typeof overrideReasonSchema>

/** Override duration options - Story 31.7 AC2 */
const overrideDurationSchema = z.enum(['30m', '1h', '2h', 'rest_of_day'])
type OverrideDuration = z.infer<typeof overrideDurationSchema>

/** Human-readable labels for each reason */
const OVERRIDE_REASON_LABELS: Record<OverrideReason, string> = {
  school_emergency: 'School emergency',
  travel: 'Travel',
  other: 'Other',
}

/** Human-readable labels for each duration */
const OVERRIDE_DURATION_LABELS: Record<OverrideDuration, string> = {
  '30m': '30 minutes',
  '1h': '1 hour',
  '2h': '2 hours',
  rest_of_day: 'Rest of day',
}

/** Batch size for expiry processing */
const EXPIRY_BATCH_SIZE = 100

/** Maximum override duration (24 hours) */
const MAX_OVERRIDE_DURATION_MS = 24 * 60 * 60 * 1000

/** Rate limit: maximum overrides per child per day */
const MAX_OVERRIDES_PER_DAY = 10

/** Validation buffer for race conditions (30 seconds) */
const VALIDATION_BUFFER_MS = 30000

// =============================================================================
// Grant Time Override (from parent)
// =============================================================================

/**
 * Input schema for grantTimeOverride
 */
const grantTimeOverrideSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  familyId: z.string().min(1, 'Family ID is required'),
  reason: overrideReasonSchema,
  duration: overrideDurationSchema,
  reasonNote: z.string().max(200).optional(),
})

/**
 * Grant an emergency time override for a child.
 * Story 31.7 AC1, AC2, AC3, AC5
 *
 * Called by the parent app to grant temporary unlimited access.
 */
export const grantTimeOverride = onCall(async (request) => {
  // 1. AUTH
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const parentUid = request.auth.uid

  // 2. VALIDATION
  const parseResult = grantTimeOverrideSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid request data', parseResult.error.errors)
  }

  const { childId, familyId, reason, duration, reasonNote } = parseResult.data
  const db = getFirestore()

  // 3. PERMISSION - Verify parent is guardian of this family
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardians = familyData?.guardians || []
  const guardian = guardians.find((g: { uid: string }) => g.uid === parentUid)

  if (!guardian) {
    throw new HttpsError('permission-denied', 'Only family guardians can grant overrides')
  }

  // SECURITY: Verify child belongs to this family
  const childDoc = await db.collection('children').doc(childId).get()
  if (!childDoc.exists) {
    throw new HttpsError('not-found', 'Child not found')
  }
  const childData = childDoc.data()
  if (childData?.familyId !== familyId) {
    throw new HttpsError('permission-denied', 'Child does not belong to this family')
  }

  // 4. BUSINESS LOGIC
  const now = Date.now()
  const todayStart = new Date(now).setHours(0, 0, 0, 0)

  // Check daily override limit
  const todayOverrides = await db
    .collection('families')
    .doc(familyId)
    .collection('timeOverrides')
    .where('childId', '==', childId)
    .where('grantedAt', '>=', todayStart)
    .get()

  if (todayOverrides.size >= MAX_OVERRIDES_PER_DAY) {
    throw new HttpsError(
      'resource-exhausted',
      `Maximum ${MAX_OVERRIDES_PER_DAY} overrides per day reached`
    )
  }

  // Get parent display name for the message
  const userDoc = await db.collection('users').doc(parentUid).get()
  const userData = userDoc.exists ? userDoc.data() : null
  const parentName = userData?.displayName || guardian.displayName || 'Your parent'

  // Calculate expiry time with validation
  const expiresAt = calculateExpiryTime(now, duration)
  const durationMs = expiresAt - now
  if (durationMs > MAX_OVERRIDE_DURATION_MS) {
    throw new HttpsError('invalid-argument', 'Override duration exceeds maximum allowed')
  }
  if (expiresAt <= now) {
    throw new HttpsError('invalid-argument', 'Override expiry must be in the future')
  }

  // Use transaction to prevent concurrent overrides
  const overrideId = await db.runTransaction(async (transaction) => {
    // Check for existing active overrides and revoke them
    const existingOverridesSnapshot = await transaction.get(
      db
        .collection('families')
        .doc(familyId)
        .collection('timeOverrides')
        .where('childId', '==', childId)
        .where('active', '==', true)
        .where('expiresAt', '>', now)
    )

    // Revoke existing overrides
    for (const doc of existingOverridesSnapshot.docs) {
      transaction.update(doc.ref, {
        active: false,
        supersededAt: now,
      })
    }

    // Create the new override
    const overrideRef = db.collection('families').doc(familyId).collection('timeOverrides').doc()
    const newOverrideId = overrideRef.id

    transaction.set(overrideRef, {
      id: newOverrideId,
      childId,
      familyId,
      grantedBy: parentUid,
      grantedByName: parentName,
      reason,
      reasonNote: reasonNote || null,
      duration,
      grantedAt: now,
      expiresAt,
      active: true,
    })

    return newOverrideId
  })

  // AC5: Log to audit trail
  await db.collection('auditEvents').add({
    type: 'time_override_granted',
    familyId,
    childId,
    actorUid: parentUid,
    actorName: parentName,
    timestamp: now,
    details: {
      overrideId,
      reason,
      reasonLabel: OVERRIDE_REASON_LABELS[reason],
      duration,
      durationLabel: OVERRIDE_DURATION_LABELS[duration],
      expiresAt,
      reasonNote: reasonNote || null,
    },
  })

  logger.info('Time override granted', {
    overrideId,
    familyId,
    childId,
    grantedBy: parentUid,
    reason,
    duration,
    expiresAt,
  })

  return {
    success: true,
    overrideId,
    expiresAt,
    parentName,
  }
})

/**
 * Calculate expiry time based on duration.
 * Story 31.7 AC2, AC6
 */
function calculateExpiryTime(grantedAt: number, duration: OverrideDuration): number {
  switch (duration) {
    case '30m':
      return grantedAt + 30 * 60 * 1000
    case '1h':
      return grantedAt + 60 * 60 * 1000
    case '2h':
      return grantedAt + 2 * 60 * 60 * 1000
    case 'rest_of_day': {
      // Expire at midnight local time
      // Using UTC midnight as approximation; in production, would use child's timezone
      const now = new Date(grantedAt)
      const midnight = new Date(now)
      midnight.setUTCHours(23, 59, 59, 999)
      return midnight.getTime()
    }
  }
}

// =============================================================================
// Check Override Status (for extension)
// =============================================================================

/**
 * Check if there's an active override for a child.
 * Called by extension to determine if blocking should be skipped.
 * Story 31.7 AC1, AC4
 */
export const checkTimeOverride = onRequest({ cors: true }, async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const { childId, familyId, deviceId } = req.query

    if (!childId || !familyId || !deviceId) {
      res.status(400).json({ error: 'childId, familyId, and deviceId are required' })
      return
    }

    const db = getFirestore()
    const now = Date.now()

    // Verify device is enrolled (security)
    const deviceDoc = await db
      .collection('families')
      .doc(String(familyId))
      .collection('devices')
      .doc(String(deviceId))
      .get()

    if (!deviceDoc.exists) {
      res.status(403).json({ error: 'Device not registered' })
      return
    }

    const deviceData = deviceDoc.data() as { childId?: string }
    if (deviceData.childId !== String(childId)) {
      res.status(403).json({ error: 'Device not assigned to this child' })
      return
    }

    // Check for active override with validation buffer to prevent race conditions
    const overridesSnapshot = await db
      .collection('families')
      .doc(String(familyId))
      .collection('timeOverrides')
      .where('childId', '==', String(childId))
      .where('active', '==', true)
      .where('expiresAt', '>', now + VALIDATION_BUFFER_MS)
      .limit(1)
      .get()

    if (overridesSnapshot.empty) {
      res.status(200).json({
        success: true,
        hasActiveOverride: false,
      })
      return
    }

    const override = overridesSnapshot.docs[0].data()

    // Double-check expiry with current time (defense in depth)
    if (override.expiresAt <= now + VALIDATION_BUFFER_MS) {
      res.status(200).json({
        success: true,
        hasActiveOverride: false,
      })
      return
    }

    res.status(200).json({
      success: true,
      hasActiveOverride: true,
      overrideId: override.id,
      grantedByName: override.grantedByName,
      expiresAt: override.expiresAt,
      reason: override.reason,
    })
  } catch (error) {
    logger.error('Error checking time override:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================================================
// Revoke Override (from parent)
// =============================================================================

/**
 * Input schema for revokeTimeOverride
 */
const revokeTimeOverrideSchema = z.object({
  overrideId: z.string().min(1, 'Override ID is required'),
  familyId: z.string().min(1, 'Family ID is required'),
})

/**
 * Revoke an active time override.
 * Allows parents to end an override early.
 */
export const revokeTimeOverride = onCall(async (request) => {
  // 1. AUTH
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }
  const parentUid = request.auth.uid

  // 2. VALIDATION
  const parseResult = revokeTimeOverrideSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid request data', parseResult.error.errors)
  }

  const { overrideId, familyId } = parseResult.data
  const db = getFirestore()

  // 3. PERMISSION - Verify parent is guardian
  const familyDoc = await db.collection('families').doc(familyId).get()
  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()
  const guardians = familyData?.guardians || []
  const isGuardian = guardians.some((g: { uid: string }) => g.uid === parentUid)

  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only family guardians can revoke overrides')
  }

  // 4. BUSINESS LOGIC
  const overrideRef = db
    .collection('families')
    .doc(familyId)
    .collection('timeOverrides')
    .doc(overrideId)

  const overrideDoc = await overrideRef.get()
  if (!overrideDoc.exists) {
    throw new HttpsError('not-found', 'Override not found')
  }

  const overrideData = overrideDoc.data()!

  if (!overrideData.active) {
    // Already revoked - return success for idempotency
    return {
      success: true,
      alreadyRevoked: true,
    }
  }

  const now = Date.now()

  await overrideRef.update({
    active: false,
    revokedAt: now,
    revokedBy: parentUid,
  })

  // Log revocation to audit trail
  await db.collection('auditEvents').add({
    type: 'time_override_revoked',
    familyId,
    childId: overrideData.childId,
    actorUid: parentUid,
    timestamp: now,
    details: {
      overrideId,
      originalGrantedBy: overrideData.grantedBy,
      originalReason: overrideData.reason,
      originalExpiresAt: overrideData.expiresAt,
    },
  })

  logger.info('Time override revoked', {
    overrideId,
    familyId,
    revokedBy: parentUid,
  })

  return {
    success: true,
  }
})

// =============================================================================
// Auto-Expire Overrides (Scheduled Function)
// =============================================================================

/**
 * Scheduled function to auto-expire overrides.
 * Story 31.7 AC6: Ensures overrides don't carry over.
 *
 * Runs every 5 minutes to check for expired overrides.
 */
export const expireTimeOverrides = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'UTC',
  },
  async () => {
    const db = getFirestore()
    const now = Date.now()

    try {
      // Use collection group query for efficiency
      const expiredOverrides = await db
        .collectionGroup('timeOverrides')
        .where('active', '==', true)
        .where('expiresAt', '<=', now)
        .limit(EXPIRY_BATCH_SIZE)
        .get()

      if (expiredOverrides.empty) {
        return
      }

      // Batch update expired overrides
      const batch = db.batch()

      for (const doc of expiredOverrides.docs) {
        batch.update(doc.ref, {
          active: false,
          expiredAt: now,
        })
      }

      await batch.commit()

      logger.info('Time overrides expired', {
        count: expiredOverrides.size,
      })
    } catch (error) {
      logger.error('Error expiring time overrides:', error)
    }
  }
)
