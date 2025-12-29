/**
 * Screenshot View Rate Limiting
 * Story 18.6: View Rate Limiting
 *
 * Implements sliding window rate calculation for screenshot views.
 * Detects abnormal viewing patterns (FR3A-X: Angry Divorce defense).
 *
 * Key Features:
 * - Sliding 1-hour window (configurable)
 * - Per-viewer-per-child rate tracking
 * - Non-blocking detection (alerts only, never blocks)
 * - Family-configurable thresholds
 */

import { getFirestore } from 'firebase-admin/firestore'

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMIT = {
  threshold: 50, // 50 views per window
  windowMs: 3600000, // 1 hour in milliseconds
} as const

/**
 * Rate limit configuration (optional per-family override)
 */
export interface RateLimitConfig {
  /** Maximum views allowed in window */
  threshold: number
  /** Window size in milliseconds */
  windowMs: number
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  /** Whether threshold was exceeded */
  exceeded: boolean
  /** Number of views in current window */
  count: number
  /** Threshold that was/would be exceeded */
  threshold: number
  /** Timestamp when window resets (oldest view + windowMs) */
  resetTime: number
  /** Window size in milliseconds */
  windowMs: number
}

/**
 * Get the view count for a viewer within the sliding window
 *
 * @param childId - Child whose screenshots are being viewed
 * @param viewerId - User viewing the screenshots
 * @param windowMs - Window size in milliseconds (default 1 hour)
 * @returns View count and oldest timestamp in window
 */
export async function getViewCountInWindow(
  childId: string,
  viewerId: string,
  windowMs: number = DEFAULT_RATE_LIMIT.windowMs
): Promise<{ count: number; oldestTimestamp: number | null }> {
  const db = getFirestore()
  const cutoff = Date.now() - windowMs

  const viewsSnapshot = await db
    .collection('children')
    .doc(childId)
    .collection('screenshotViews')
    .where('viewerId', '==', viewerId)
    .where('timestamp', '>', cutoff)
    .get()

  if (viewsSnapshot.empty) {
    return { count: 0, oldestTimestamp: null }
  }

  // Find the oldest timestamp in the window
  let oldestTimestamp = Infinity
  for (const doc of viewsSnapshot.docs) {
    const data = doc.data()
    if (data.timestamp < oldestTimestamp) {
      oldestTimestamp = data.timestamp
    }
  }

  return {
    count: viewsSnapshot.size,
    oldestTimestamp: oldestTimestamp === Infinity ? null : oldestTimestamp,
  }
}

/**
 * Get rate limit configuration for a family
 *
 * @param familyId - Family to get config for
 * @returns Rate limit config (family override or defaults)
 */
export async function getFamilyRateLimitConfig(familyId: string): Promise<RateLimitConfig> {
  const db = getFirestore()

  try {
    const familyDoc = await db.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      return { ...DEFAULT_RATE_LIMIT }
    }

    const familyData = familyDoc.data()
    const customConfig = familyData?.screenshotViewRateLimit

    if (
      customConfig &&
      typeof customConfig.threshold === 'number' &&
      typeof customConfig.windowMs === 'number'
    ) {
      return {
        threshold: customConfig.threshold,
        windowMs: customConfig.windowMs,
      }
    }
  } catch {
    // Fall back to defaults on any error
  }

  return { ...DEFAULT_RATE_LIMIT }
}

/**
 * Check if a viewer has exceeded the rate limit for a child's screenshots
 *
 * @param viewerId - User viewing screenshots
 * @param childId - Child whose screenshots are being viewed
 * @param familyId - Family for rate limit config
 * @returns Rate limit check result
 */
export async function checkViewRateLimit(
  viewerId: string,
  childId: string,
  familyId: string
): Promise<RateLimitResult> {
  // Get family-specific or default rate limit config
  const config = await getFamilyRateLimitConfig(familyId)

  // Get view count in window
  const { count, oldestTimestamp } = await getViewCountInWindow(childId, viewerId, config.windowMs)

  // Calculate when the window resets (when oldest view expires)
  const resetTime =
    oldestTimestamp !== null ? oldestTimestamp + config.windowMs : Date.now() + config.windowMs

  return {
    exceeded: count > config.threshold,
    count,
    threshold: config.threshold,
    resetTime,
    windowMs: config.windowMs,
  }
}
