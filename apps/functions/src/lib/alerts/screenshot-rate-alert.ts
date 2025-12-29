/**
 * Screenshot Rate Alert Service
 * Story 18.6: View Rate Limiting
 *
 * Creates and manages alerts for abnormal screenshot viewing patterns.
 * Alerts notify other guardians when someone views screenshots excessively.
 *
 * Key Features:
 * - Alert deduplication (one alert per viewer/child/window)
 * - Non-blocking (viewing continues regardless of alerts)
 * - Other guardian notification (excludes the viewer)
 */

import { getFirestore } from 'firebase-admin/firestore'

/**
 * Alert type constant
 */
export const ALERT_TYPE_SCREENSHOT_RATE = 'screenshot_rate' as const

/**
 * Screenshot rate alert document schema
 */
export interface ScreenshotRateAlert {
  alertId: string
  type: typeof ALERT_TYPE_SCREENSHOT_RATE
  familyId: string
  childId: string
  viewerId: string
  viewerEmail: string | null
  count: number
  threshold: number
  windowMs: number
  createdAt: number
  dismissed: boolean
  dismissedBy?: string
  dismissedAt?: number
}

/**
 * Parameters for creating a rate alert
 */
export interface CreateRateAlertParams {
  familyId: string
  childId: string
  viewerId: string
  viewerEmail: string | null
  count: number
  threshold: number
  windowMs?: number
}

/**
 * Default window size for alerts (1 hour)
 */
const DEFAULT_WINDOW_MS = 3600000

/**
 * Check if an active (undismissed) rate alert already exists for this viewer/child
 *
 * @param familyId - Family the alert belongs to
 * @param viewerId - Viewer who triggered the alert
 * @param childId - Child whose screenshots were viewed
 * @param windowMs - Window size for deduplication
 * @returns Existing alert if found, null otherwise
 */
export async function getActiveRateLimitAlert(
  familyId: string,
  viewerId: string,
  childId: string,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<ScreenshotRateAlert | null> {
  const db = getFirestore()

  // Query for undismissed alerts of same type/viewer/child created within window
  const cutoff = Date.now() - windowMs

  const alertsSnapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('alerts')
    .where('type', '==', ALERT_TYPE_SCREENSHOT_RATE)
    .where('viewerId', '==', viewerId)
    .where('childId', '==', childId)
    .where('dismissed', '==', false)
    .where('createdAt', '>', cutoff)
    .limit(1)
    .get()

  if (alertsSnapshot.empty) {
    return null
  }

  return alertsSnapshot.docs[0].data() as ScreenshotRateAlert
}

/**
 * Create a new rate limit alert for other guardians
 *
 * @param params - Alert creation parameters
 * @returns The created alert document
 */
export async function createRateLimitAlert(
  params: CreateRateAlertParams
): Promise<ScreenshotRateAlert> {
  const db = getFirestore()

  const alertRef = db.collection('families').doc(params.familyId).collection('alerts').doc()

  const windowMs = params.windowMs ?? DEFAULT_WINDOW_MS

  const alert: ScreenshotRateAlert = {
    alertId: alertRef.id,
    type: ALERT_TYPE_SCREENSHOT_RATE,
    familyId: params.familyId,
    childId: params.childId,
    viewerId: params.viewerId,
    viewerEmail: params.viewerEmail,
    count: params.count,
    threshold: params.threshold,
    windowMs,
    createdAt: Date.now(),
    dismissed: false,
  }

  await alertRef.set(alert)

  return alert
}

/**
 * Get other guardians in the family (excluding the viewer)
 *
 * @param familyId - Family to get guardians from
 * @param excludeViewerId - Viewer to exclude from the list
 * @returns Array of guardian UIDs (excluding the viewer)
 */
export async function getOtherGuardians(
  familyId: string,
  excludeViewerId: string
): Promise<string[]> {
  const db = getFirestore()

  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    return []
  }

  const familyData = familyDoc.data()
  const memberIds: string[] = familyData?.memberIds || []

  // Filter out the viewer
  return memberIds.filter((id) => id !== excludeViewerId)
}

/**
 * Dismiss an alert (mark as dismissed)
 *
 * @param familyId - Family the alert belongs to
 * @param alertId - Alert document ID
 * @param dismissedBy - User who dismissed the alert
 */
export async function dismissAlert(
  familyId: string,
  alertId: string,
  dismissedBy: string
): Promise<void> {
  const db = getFirestore()

  await db.collection('families').doc(familyId).collection('alerts').doc(alertId).update({
    dismissed: true,
    dismissedBy,
    dismissedAt: Date.now(),
  })
}
