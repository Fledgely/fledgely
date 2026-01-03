/**
 * Device Sync Status Checker Scheduled Function
 *
 * Story 41.4: Device Sync Status Notifications - AC3, AC6
 *
 * Runs every minute to check device sync status and send notifications.
 * NFR78: Notification within 30 seconds of threshold crossing.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  sendDeviceSyncTimeoutNotification,
  hasAlreadyNotifiedForThreshold,
} from '../lib/notifications/deviceSyncNotification'
import { DEFAULT_SYNC_THRESHOLD_HOURS, type SyncThresholdHours } from '@fledgely/shared'

// Lazy Firestore initialization
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

// Batch size limit to prevent timeout
const BATCH_SIZE = 100

// All possible thresholds in hours
const SYNC_THRESHOLDS: SyncThresholdHours[] = [1, 4, 12, 24]

/**
 * Device document from Firestore
 */
interface DeviceDoc {
  id: string
  familyId: string
  childId: string
  name: string
  lastSeen: number
  status?: string
}

/**
 * Result of checking device sync status
 */
export interface CheckDeviceSyncResult {
  devicesChecked: number
  notificationsSent: number
  notificationsSkipped: number
  errors: number
}

/**
 * Get notification threshold for a family by checking any guardian's preferences
 *
 * Since sync thresholds are typically family-wide, we check the first guardian's
 * default preferences. In the future, could support per-guardian thresholds.
 */
async function getFamilySyncThreshold(familyId: string): Promise<SyncThresholdHours> {
  // Get family to find guardians
  const familyDoc = await getDb().collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    return DEFAULT_SYNC_THRESHOLD_HOURS
  }

  const familyData = familyDoc.data()

  // Try to get first guardian's preferences
  const guardians = familyData?.guardians as Array<{ uid: string }> | undefined
  const parentIds = familyData?.parentIds as string[] | undefined
  const firstGuardianId = guardians?.[0]?.uid || parentIds?.[0]

  if (!firstGuardianId) {
    return DEFAULT_SYNC_THRESHOLD_HOURS
  }

  // Read guardian's default notification preferences
  const prefsDoc = await getDb()
    .collection('users')
    .doc(firstGuardianId)
    .collection('notificationPreferences')
    .doc('default')
    .get()

  if (!prefsDoc.exists) {
    return DEFAULT_SYNC_THRESHOLD_HOURS
  }

  const prefsData = prefsDoc.data()
  const threshold = prefsData?.syncThresholdHours

  if (threshold && SYNC_THRESHOLDS.includes(threshold)) {
    return threshold as SyncThresholdHours
  }

  return DEFAULT_SYNC_THRESHOLD_HOURS
}

/**
 * Query devices that haven't synced recently
 *
 * Uses collectionGroup query to efficiently find stale devices across all families.
 */
async function getStaleDevices(thresholdHours: SyncThresholdHours): Promise<DeviceDoc[]> {
  const thresholdTime = Date.now() - thresholdHours * 60 * 60 * 1000

  // Query devices with lastSeen older than threshold
  const devicesQuery = getDb()
    .collectionGroup('devices')
    .where('lastSeen', '<=', thresholdTime)
    .where('status', '==', 'active')
    .limit(BATCH_SIZE)

  const snapshot = await devicesQuery.get()

  const devices: DeviceDoc[] = []
  for (const doc of snapshot.docs) {
    // Extract familyId from document path
    // Path format: families/{familyId}/devices/{deviceId}
    const pathParts = doc.ref.path.split('/')
    const familyId = pathParts[1] // families/[familyId]/devices/[deviceId]

    const data = doc.data()
    devices.push({
      id: doc.id,
      familyId,
      childId: data.childId || data.ownerId || '',
      name: data.name || data.deviceName || 'Unknown Device',
      lastSeen: data.lastSeen,
      status: data.status,
    })
  }

  return devices
}

/**
 * Process a single device for sync timeout notification
 */
async function processDeviceForNotification(device: DeviceDoc): Promise<boolean> {
  const threshold = await getFamilySyncThreshold(device.familyId)
  const thresholdTime = Date.now() - threshold * 60 * 60 * 1000

  // Check if device is actually past threshold
  if (device.lastSeen > thresholdTime) {
    return false // Device synced recently, no notification needed
  }

  // Check if we've already notified for this threshold
  const alreadyNotified = await hasAlreadyNotifiedForThreshold(
    device.familyId,
    device.id,
    threshold
  )

  if (alreadyNotified) {
    return false // Already notified
  }

  // Send notification
  const result = await sendDeviceSyncTimeoutNotification(
    {
      deviceId: device.id,
      deviceName: device.name,
      familyId: device.familyId,
      childId: device.childId,
      lastSyncAt: device.lastSeen,
      thresholdHours: threshold,
    },
    true // Use detailed content with time since last sync
  )

  return result.notificationGenerated
}

/**
 * Check all devices for sync timeout and send notifications
 */
export async function checkAllDeviceSyncStatus(): Promise<CheckDeviceSyncResult> {
  const result: CheckDeviceSyncResult = {
    devicesChecked: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    errors: 0,
  }

  try {
    // Get all stale devices for the smallest threshold (1 hour)
    // This captures all potentially stale devices
    const staleDevices = await getStaleDevices(1)

    result.devicesChecked = staleDevices.length

    // Process each device
    for (const device of staleDevices) {
      try {
        const notificationSent = await processDeviceForNotification(device)
        if (notificationSent) {
          result.notificationsSent++
        } else {
          result.notificationsSkipped++
        }
      } catch (error) {
        logger.error('Failed to process device for notification', {
          deviceId: device.id,
          familyId: device.familyId,
          error: error instanceof Error ? error.message : String(error),
        })
        result.errors++
      }
    }
  } catch (error) {
    logger.error('Failed to query stale devices', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  return result
}

/**
 * Scheduled function: Check Device Sync Status
 *
 * Runs every minute for NFR78 compliance (notification within 30 seconds of threshold).
 */
export const checkDeviceSyncStatus = onSchedule(
  {
    schedule: '* * * * *', // Every minute
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60, // 1 minute timeout
  },
  async () => {
    logger.info('Starting device sync status check')

    try {
      const result = await checkAllDeviceSyncStatus()

      logger.info('Device sync status check completed', {
        devicesChecked: result.devicesChecked,
        notificationsSent: result.notificationsSent,
        notificationsSkipped: result.notificationsSkipped,
        errors: result.errors,
      })

      return
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Device sync status check failed', { error: errorMessage })
      throw error
    }
  }
)
