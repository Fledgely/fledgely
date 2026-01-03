/**
 * Track Location Access Callable Function
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC1: Asymmetric location check detection
 *
 * Records location feature access by guardians to detect asymmetric usage patterns.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  trackLocationAccessInputSchema,
  LOCATION_ABUSE_THRESHOLDS,
  type LocationAccessLog,
  type LocationAccessType,
} from '@fledgely/shared'

/**
 * Response from trackLocationAccess function.
 */
interface TrackLocationAccessResponse {
  success: boolean
  message: string
  logId: string | null
  rateLimited: boolean
}

/**
 * Track location feature access by a guardian.
 *
 * Records each location check with timestamp for abuse pattern detection.
 * Rate limited to 1 log per minute per guardian to prevent log spam.
 */
export const trackLocationAccess = onCall<unknown, Promise<TrackLocationAccessResponse>>(
  async (request) => {
    // Validate authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated to track location access')
    }

    const uid = request.auth.uid
    const db = getFirestore()

    // Validate input
    const parseResult = trackLocationAccessInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { familyId, childId, accessType } = parseResult.data

    // Verify caller is a guardian in the family
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardians = familyData?.guardians || []
    if (!guardians.includes(uid)) {
      throw new HttpsError('permission-denied', 'Only guardians can have location access tracked')
    }

    // Check rate limit - max 1 log per minute per guardian
    const rateLimitMs = LOCATION_ABUSE_THRESHOLDS.ACCESS_LOG_RATE_LIMIT_MS
    const rateLimitCutoff = new Date(Date.now() - rateLimitMs)

    const recentLogs = await db
      .collection('families')
      .doc(familyId)
      .collection('locationAccessLog')
      .where('uid', '==', uid)
      .where('timestamp', '>', Timestamp.fromDate(rateLimitCutoff))
      .limit(1)
      .get()

    if (!recentLogs.empty) {
      // Rate limited - don't create a new log
      return {
        success: true,
        message: 'Rate limited - recent access already logged',
        logId: null,
        rateLimited: true,
      }
    }

    // Create access log entry
    const logRef = db.collection('families').doc(familyId).collection('locationAccessLog').doc()

    const accessLog: Omit<LocationAccessLog, 'timestamp'> & { timestamp: Timestamp } = {
      id: logRef.id,
      familyId,
      uid,
      childId,
      accessType: accessType as LocationAccessType,
      timestamp: Timestamp.now(),
    }

    await logRef.set(accessLog)

    return {
      success: true,
      message: 'Location access tracked',
      logId: logRef.id,
      rateLimited: false,
    }
  }
)

/**
 * Get location access counts for guardians within a time window.
 *
 * Helper function used by the abuse detection scheduled function.
 *
 * @param familyId - Family ID
 * @param windowDays - Number of days for the rolling window
 * @returns Map of guardian UID to access count
 */
export async function getGuardianAccessCounts(
  familyId: string,
  windowDays: number
): Promise<Map<string, number>> {
  const db = getFirestore()
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  const logsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('locationAccessLog')
    .where('timestamp', '>', Timestamp.fromDate(windowStart))
    .get()

  const counts = new Map<string, number>()

  for (const doc of logsSnapshot.docs) {
    const data = doc.data()
    const uid = data.uid as string
    counts.set(uid, (counts.get(uid) || 0) + 1)
  }

  return counts
}

/**
 * Calculate asymmetry between two guardian access counts.
 *
 * @param counts - Map of guardian UID to access count
 * @returns Asymmetry result including ratio and detection status
 */
export function calculateAsymmetry(counts: Map<string, number>): {
  detected: boolean
  ratio: number
  higherUid: string | null
  higherCount: number
  lowerUid: string | null
  lowerCount: number
} {
  const entries = Array.from(counts.entries())

  // Need at least 2 guardians to compare
  if (entries.length < 2) {
    return {
      detected: false,
      ratio: 0,
      higherUid: entries.length === 1 ? entries[0][0] : null,
      higherCount: entries.length === 1 ? entries[0][1] : 0,
      lowerUid: null,
      lowerCount: 0,
    }
  }

  // Sort by count descending
  entries.sort((a, b) => b[1] - a[1])

  const [higherUid, higherCount] = entries[0]
  const [lowerUid, lowerCount] = entries[entries.length - 1]

  // Calculate ratio (handle divide by zero)
  const ratio = lowerCount === 0 ? (higherCount > 0 ? Infinity : 0) : higherCount / lowerCount

  // Check if ratio exceeds threshold
  const detected = ratio >= LOCATION_ABUSE_THRESHOLDS.ASYMMETRIC_CHECK_RATIO

  return {
    detected,
    ratio: ratio === Infinity ? LOCATION_ABUSE_THRESHOLDS.ASYMMETRIC_CHECK_RATIO * 10 : ratio,
    higherUid,
    higherCount,
    lowerUid,
    lowerCount,
  }
}
