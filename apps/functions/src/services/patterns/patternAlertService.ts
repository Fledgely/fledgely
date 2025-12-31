/**
 * Pattern Alert Service
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC3, AC4
 *
 * Generates and sends non-accusatory alerts to under-viewing guardians
 * when asymmetric viewing patterns are detected.
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import type { ViewingPatternAnalysis, PatternAlert } from '@fledgely/shared'
import * as logger from 'firebase-functions/logger'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Minimum views for under-viewing guardian before we alert.
 * If they have > 3 views, they're actually engaged, just less so.
 */
const MIN_ENGAGEMENT_THRESHOLD = 3

/**
 * Generate non-accusatory message for alert.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC4
 *
 * @param highActivityName - Display name of high-activity guardian
 * @param highActivityCount - View count of high-activity guardian
 * @returns Non-judgmental alert message
 */
function generateAlertMessage(highActivityName: string | null, highActivityCount: number): string {
  const name = highActivityName || 'Your co-parent'

  // Friendly, non-accusatory messages
  const messages = [
    `${name} has been checking in more frequently this week.`,
    `${name} viewed ${highActivityCount} items this week - you might want to stay connected too.`,
    `Heads up: ${name} has been more active on Fledgely lately.`,
  ]

  // Pick based on activity level
  if (highActivityCount > 50) {
    return messages[0]
  } else if (highActivityCount > 20) {
    return messages[1]
  }
  return messages[2]
}

/**
 * Determine if an alert should be generated for this analysis.
 *
 * @param analysis - Pattern analysis result
 * @returns Object with shouldAlert boolean and details
 */
export function shouldGenerateAlert(analysis: ViewingPatternAnalysis): {
  shouldAlert: boolean
  recipientUid?: string
  highActivityGuardian?: { uid: string; name: string | null; count: number }
  recipientCount?: number
} {
  // Only alert on asymmetric patterns
  if (!analysis.isAsymmetric) {
    return { shouldAlert: false }
  }

  // Need at least 2 guardians
  if (analysis.guardianViews.length < 2) {
    return { shouldAlert: false }
  }

  // Get highest and lowest activity guardians
  const sorted = [...analysis.guardianViews].sort((a, b) => b.viewCount - a.viewCount)
  const highActivity = sorted[0]
  const lowActivity = sorted[sorted.length - 1]

  // Don't alert if low-activity guardian is actually engaged (> threshold views)
  if (lowActivity.viewCount > MIN_ENGAGEMENT_THRESHOLD) {
    return { shouldAlert: false }
  }

  // Don't alert if high-activity count is very low (< 5)
  if (highActivity.viewCount < 5) {
    return { shouldAlert: false }
  }

  return {
    shouldAlert: true,
    recipientUid: lowActivity.guardianUid,
    highActivityGuardian: {
      uid: highActivity.guardianUid,
      name: highActivity.guardianDisplayName,
      count: highActivity.viewCount,
    },
    recipientCount: lowActivity.viewCount,
  }
}

/**
 * Create and store a pattern alert.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC3
 *
 * @param analysis - Pattern analysis that triggered the alert
 * @param recipientUid - Guardian to receive the alert
 * @param highActivityGuardian - High-activity guardian details
 * @param recipientCount - Recipient's view count
 * @returns Created alert
 */
export async function createPatternAlert(
  analysis: ViewingPatternAnalysis,
  recipientUid: string,
  highActivityGuardian: { uid: string; name: string | null; count: number },
  recipientCount: number
): Promise<PatternAlert> {
  const db = getDb()

  const message = generateAlertMessage(highActivityGuardian.name, highActivityGuardian.count)

  // Generate ID using Firestore
  const docRef = db.collection('patternAlerts').doc()

  const alert: PatternAlert = {
    id: docRef.id,
    familyId: analysis.familyId,
    analysisId: analysis.id,
    recipientUid,
    highActivityGuardianUid: highActivityGuardian.uid,
    highActivityCount: highActivityGuardian.count,
    recipientCount,
    message,
    sentAt: Date.now(),
    readAt: null,
  }

  // Store the alert
  await docRef.set(alert)

  logger.info('Pattern alert created', {
    alertId: alert.id,
    familyId: analysis.familyId,
    recipientUid,
    asymmetryRatio: analysis.asymmetryRatio,
  })

  return alert
}

/**
 * Get pending (unread) alerts for a guardian.
 *
 * @param guardianUid - Guardian to get alerts for
 * @returns Array of unread alerts
 */
export async function getPendingAlertsForGuardian(guardianUid: string): Promise<PatternAlert[]> {
  const db = getDb()

  const alertsSnapshot = await db
    .collection('patternAlerts')
    .where('recipientUid', '==', guardianUid)
    .where('readAt', '==', null)
    .orderBy('sentAt', 'desc')
    .limit(10)
    .get()

  return alertsSnapshot.docs.map((doc) => doc.data() as PatternAlert)
}

/**
 * Mark an alert as read.
 *
 * @param alertId - Alert ID to mark as read
 */
export async function markAlertAsRead(alertId: string): Promise<void> {
  const db = getDb()
  await db.collection('patternAlerts').doc(alertId).update({
    readAt: Date.now(),
  })
}

/**
 * For testing - reset Firestore instance
 */
export function _resetDbForTesting(): void {
  db = null
}
