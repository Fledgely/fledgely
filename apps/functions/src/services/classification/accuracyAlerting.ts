/**
 * Classification Accuracy Alerting Service
 *
 * Story 20.6: Classification Accuracy Monitoring - AC4
 *
 * Monitors accuracy and creates alerts when thresholds are breached.
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  type AccuracyAlert,
  type AccuracyAlertStatus,
  generateAlertId,
  determineAlertStatus,
  ACCURACY_ALERT_THRESHOLD,
  MIN_SAMPLES_FOR_ACCURACY,
} from '@fledgely/shared'
import { calculateRollingAccuracy, getCategoriesNeedingImprovement } from './accuracyCalculator'

/**
 * Check accuracy threshold and create alert if breached.
 *
 * AC4: Alert triggered if accuracy drops below 90%
 *
 * @returns Created alert or null if no alert needed
 */
export async function checkAccuracyThreshold(): Promise<AccuracyAlert | null> {
  const { accuracy, totalReviewed } = await calculateRollingAccuracy()

  // Don't alert if not enough samples
  if (totalReviewed < MIN_SAMPLES_FOR_ACCURACY) {
    logger.info('Not enough samples for accuracy alerting', {
      totalReviewed,
      minRequired: MIN_SAMPLES_FOR_ACCURACY,
    })
    return null
  }

  const status = determineAlertStatus(accuracy)

  // Check if we need to create an alert
  if (status === 'normal') {
    // Resolve any active alerts
    await resolveActiveAlerts()
    return null
  }

  // Get affected categories
  const affectedCategories = await getCategoriesNeedingImprovement()

  // Check if there's already an active alert
  const activeAlert = await getActiveAlert()

  if (activeAlert) {
    // Update existing alert if status changed
    if (activeAlert.status !== status) {
      await updateAlertStatus(activeAlert.id, status, accuracy, affectedCategories)
    }
    return null
  }

  // Create new alert
  const alert = await createAccuracyAlert(status, accuracy, totalReviewed, affectedCategories)
  return alert
}

/**
 * Create a new accuracy alert.
 *
 * @param status - Alert status (warning or critical)
 * @param currentAccuracy - Current rolling accuracy
 * @param sampleCount - Number of samples in calculation
 * @param affectedCategories - Categories below threshold
 * @returns Created alert
 */
export async function createAccuracyAlert(
  status: AccuracyAlertStatus,
  currentAccuracy: number,
  sampleCount: number,
  affectedCategories: string[]
): Promise<AccuracyAlert> {
  const db = getFirestore()
  const now = Date.now()

  const message =
    status === 'critical'
      ? `Classification accuracy has dropped to ${currentAccuracy.toFixed(1)}% (critical threshold: 80%)`
      : `Classification accuracy has dropped to ${currentAccuracy.toFixed(1)}% (warning threshold: ${ACCURACY_ALERT_THRESHOLD}%)`

  const alert: AccuracyAlert = {
    id: generateAlertId(now),
    status,
    currentAccuracy,
    threshold: ACCURACY_ALERT_THRESHOLD,
    affectedCategories,
    sampleCount,
    message,
    createdAt: now,
  }

  await db.collection('accuracyAlerts').doc(alert.id).set(alert)

  logger.warn('Accuracy alert created', {
    alertId: alert.id,
    status,
    currentAccuracy,
    sampleCount,
    affectedCategories,
  })

  return alert
}

/**
 * Get the current active alert (if any).
 *
 * @returns Active alert or null
 */
export async function getActiveAlert(): Promise<AccuracyAlert | null> {
  const db = getFirestore()

  const snapshot = await db
    .collection('accuracyAlerts')
    .where('resolvedAt', '==', null)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return snapshot.docs[0].data() as AccuracyAlert
}

/**
 * Get all active alerts.
 *
 * @returns Array of active alerts
 */
export async function getActiveAlerts(): Promise<AccuracyAlert[]> {
  const db = getFirestore()

  const snapshot = await db
    .collection('accuracyAlerts')
    .where('resolvedAt', '==', null)
    .orderBy('createdAt', 'desc')
    .get()

  return snapshot.docs.map((doc) => doc.data() as AccuracyAlert)
}

/**
 * Update an existing alert's status.
 *
 * @param alertId - Alert ID to update
 * @param status - New status
 * @param currentAccuracy - Updated accuracy
 * @param affectedCategories - Updated affected categories
 */
async function updateAlertStatus(
  alertId: string,
  status: AccuracyAlertStatus,
  currentAccuracy: number,
  affectedCategories: string[]
): Promise<void> {
  const db = getFirestore()

  const message =
    status === 'critical'
      ? `Classification accuracy has dropped to ${currentAccuracy.toFixed(1)}% (critical threshold: 80%)`
      : `Classification accuracy has dropped to ${currentAccuracy.toFixed(1)}% (warning threshold: ${ACCURACY_ALERT_THRESHOLD}%)`

  await db.collection('accuracyAlerts').doc(alertId).update({
    status,
    currentAccuracy,
    affectedCategories,
    message,
  })

  logger.info('Alert status updated', {
    alertId,
    newStatus: status,
    currentAccuracy,
  })
}

/**
 * Resolve all active alerts (accuracy has recovered).
 */
async function resolveActiveAlerts(): Promise<void> {
  const db = getFirestore()
  const now = Date.now()

  const snapshot = await db.collection('accuracyAlerts').where('resolvedAt', '==', null).get()

  if (snapshot.empty) {
    return
  }

  const batch = db.batch()

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      resolvedAt: now,
      status: 'normal',
      message: 'Classification accuracy has recovered to acceptable levels',
    })
  }

  await batch.commit()

  logger.info('Resolved accuracy alerts', {
    count: snapshot.size,
  })
}

/**
 * Get alert history.
 *
 * @param limit - Maximum alerts to return
 * @returns Array of alerts (newest first)
 */
export async function getAlertHistory(limit: number = 50): Promise<AccuracyAlert[]> {
  const db = getFirestore()

  const snapshot = await db
    .collection('accuracyAlerts')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => doc.data() as AccuracyAlert)
}
