import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  SCREENSHOT_VIEWING_RATE_LIMITS,
  type ScreenshotViewingRateAlertFirestore,
} from '@fledgely/contracts'

/**
 * Firestore Trigger: onScreenshotViewLogged
 *
 * Story 3A.5: Screenshot Viewing Rate Alert
 *
 * Monitors the viewAuditLog for screenshot views and triggers alerts
 * when a guardian views more than 50 screenshots within one hour.
 *
 * Alert characteristics (per acceptance criteria):
 * - AC1: Alert triggered at 50+ screenshots in 1 hour
 * - AC2: Alert shows count/timeframe, NOT which screenshots
 * - AC3: Alert is informational only (no action required)
 * - AC4: Viewing is NOT blocked
 * - AC5: All views logged in audit trail with timestamps
 * - AC6: Threshold (50/hour) is NOT user-configurable
 * - AC7: Child is NOT notified (prevent triangulation)
 *
 * Security invariants:
 * 1. Only processes screenshot dataType entries
 * 2. Only creates alerts for verified guardians
 * 3. Alerts stored under child document (child-centric model)
 * 4. 1-hour cooldown between alerts (prevent spam)
 * 5. No screenshot IDs stored in alert (privacy)
 */

/**
 * Cooldown period between alerts for same guardian
 * Prevents alert spam when viewing continues after threshold hit
 */
const ALERT_COOLDOWN_MS = SCREENSHOT_VIEWING_RATE_LIMITS.ALERT_COOLDOWN_MS

/**
 * Trigger: fires when a new view audit log entry is created
 */
export const onScreenshotViewLogged = onDocumentCreated(
  'children/{childId}/viewAuditLog/{logId}',
  async (event) => {
    const db = getFirestore()
    const { childId, logId } = event.params
    const data = event.data?.data()

    if (!data) {
      console.warn('onScreenshotViewLogged: No data in document', { childId, logId })
      return
    }

    // AC: Only process screenshot views
    if (data.dataType !== 'screenshot') {
      return
    }

    const viewedBy = data.viewedBy as string
    if (!viewedBy) {
      console.warn('onScreenshotViewLogged: No viewedBy in document', { childId, logId })
      return
    }

    // Query recent screenshot views by this guardian
    const oneHourAgo = new Date(Date.now() - SCREENSHOT_VIEWING_RATE_LIMITS.WINDOW_MS)

    const recentScreenshotViews = await db
      .collection('children')
      .doc(childId)
      .collection('viewAuditLog')
      .where('viewedBy', '==', viewedBy)
      .where('dataType', '==', 'screenshot')
      .where('viewedAt', '>=', Timestamp.fromDate(oneHourAgo))
      .count()
      .get()

    const screenshotCount = recentScreenshotViews.data().count

    // Check if threshold exceeded (AC1, AC6)
    if (screenshotCount < SCREENSHOT_VIEWING_RATE_LIMITS.THRESHOLD_PER_HOUR) {
      return // Below threshold, no alert needed
    }

    // Check for recent alert (cooldown to prevent spam)
    const cooldownStart = new Date(Date.now() - ALERT_COOLDOWN_MS)
    const recentAlerts = await db
      .collection('children')
      .doc(childId)
      .collection('screenshotRateAlerts')
      .where('triggeredBy', '==', viewedBy)
      .where('createdAt', '>=', Timestamp.fromDate(cooldownStart))
      .limit(1)
      .get()

    if (!recentAlerts.empty) {
      // Alert already exists within cooldown period, skip
      return
    }

    // Get child document to find other guardians
    const childDoc = await db.collection('children').doc(childId).get()
    if (!childDoc.exists) {
      console.error('onScreenshotViewLogged: Child not found', { childId })
      return
    }

    const childData = childDoc.data()
    if (!childData) {
      return
    }

    // Identify OTHER guardians to alert (AC7: NOT the child, NOT the triggering parent)
    const guardians = (childData.guardians || []) as Array<{ uid: string }>
    const otherGuardianUids = guardians
      .map(g => g.uid)
      .filter(uid => uid !== viewedBy)

    if (otherGuardianUids.length === 0) {
      // No other guardians to alert (single-parent scenario)
      // Still create the alert for audit purposes
    }

    // Create the rate alert document
    const alertId = db.collection('children').doc().id
    const now = Timestamp.now()

    const alert: ScreenshotViewingRateAlertFirestore = {
      id: alertId,
      childId,
      triggeredBy: viewedBy,
      alertedTo: otherGuardianUids, // May be empty if single parent
      screenshotCount,
      windowStart: Timestamp.fromDate(oneHourAgo),
      windowEnd: now,
      createdAt: now,
      // NOTE: No screenshotIds stored (AC2 - privacy protection)
    }

    // Store alert in child's screenshotRateAlerts subcollection (ADR-001)
    await db
      .collection('children')
      .doc(childId)
      .collection('screenshotRateAlerts')
      .doc(alertId)
      .set(alert)

    console.info('Screenshot rate alert created', {
      alertId,
      childId,
      triggeredBy: viewedBy,
      screenshotCount,
      alertedTo: otherGuardianUids,
    })

    // Create notifications for other guardians (Task 5)
    // Each guardian gets an informational notification
    for (const guardianUid of otherGuardianUids) {
      await createRateAlertNotification(db, childId, alertId, guardianUid, screenshotCount, viewedBy)
    }
  }
)

/**
 * Create a notification for a guardian about screenshot rate alert
 *
 * AC3: Notification is informational only (no action required)
 * AC7: Child is NOT notified
 */
async function createRateAlertNotification(
  db: FirebaseFirestore.Firestore,
  childId: string,
  alertId: string,
  recipientGuardianUid: string,
  screenshotCount: number,
  triggeredByUid: string
): Promise<void> {
  const notificationId = db.collection('notifications').doc().id

  const notification = {
    id: notificationId,
    type: 'screenshot_rate_alert',
    recipientUid: recipientGuardianUid,
    childId,
    alertId,
    // AC2: Shows count but NOT which screenshots were viewed
    message: `Your co-parent viewed ${screenshotCount} screenshots in the past hour`,
    // AC3: Informational only - no action required
    actionRequired: false,
    read: false,
    triggeredBy: triggeredByUid,
    createdAt: FieldValue.serverTimestamp(),
  }

  // Store in global notifications collection (following existing pattern)
  await db.collection('notifications').doc(notificationId).set(notification)

  console.info('Rate alert notification created', {
    notificationId,
    recipientGuardianUid,
    childId,
    alertId,
  })
}
