/**
 * Firestore trigger for device status changes
 *
 * Story 19A.4: Status Push Notifications (AC: #1)
 *
 * Triggers when device health metrics are updated and detects
 * status transitions to send push notifications to parents.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { FamilyStatus, THRESHOLDS, createTransition } from '../lib/notifications/statusTypes'
import { sendStatusNotification } from '../lib/notifications/sendStatusNotification'

// Lazy Firestore initialization for testing
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

/**
 * Device document structure (subset of fields needed for status calculation)
 */
interface DeviceData {
  name?: string
  childId?: string
  status?: 'active' | 'offline' | 'unenrolled'
  lastSyncTimestamp?: FirebaseFirestore.Timestamp
  healthMetrics?: {
    lastHealthSync?: FirebaseFirestore.Timestamp
    batteryLevel?: number | null
    networkStatus?: 'online' | 'offline'
    monitoringActive?: boolean
  }
}

/**
 * Calculate device status from health metrics
 * Matches logic from web useFamilyStatus hook
 */
export function calculateDeviceStatus(data: DeviceData | undefined): FamilyStatus {
  if (!data) return 'good' // No data means no device yet

  const now = Date.now()

  // Critical: Monitoring stopped (unenrolled)
  if (data.status === 'unenrolled') {
    return 'action'
  }

  // Critical: Device offline for more than 24 hours
  if (data.status === 'offline' && data.lastSyncTimestamp) {
    const lastSeen = data.lastSyncTimestamp.toDate()
    const offlineHours = (now - lastSeen.getTime()) / (1000 * 60 * 60)
    if (offlineHours >= THRESHOLDS.OFFLINE_CRITICAL_HOURS) {
      return 'action'
    }
    // Device offline but less than 24 hours is a warning
    return 'attention'
  }

  // Check health metrics for warnings
  if (data.healthMetrics) {
    const metrics = data.healthMetrics

    // Warning: Sync delay > 1 hour
    if (metrics.lastHealthSync) {
      const lastSync = metrics.lastHealthSync.toDate()
      const syncDelayMinutes = (now - lastSync.getTime()) / (1000 * 60)
      if (syncDelayMinutes >= THRESHOLDS.SYNC_WARNING_MINUTES) {
        return 'attention'
      }
    }

    // Warning: Low battery < 20%
    if (
      metrics.batteryLevel !== null &&
      metrics.batteryLevel !== undefined &&
      metrics.batteryLevel < THRESHOLDS.BATTERY_WARNING_PERCENT
    ) {
      return 'attention'
    }

    // Warning: Network offline while device is active
    if (metrics.networkStatus === 'offline' && data.status === 'active') {
      return 'attention'
    }
  }

  return 'good'
}

/**
 * Get issue description for the status change
 */
function getIssueDescription(data: DeviceData | undefined): string {
  if (!data) return ''

  if (data.status === 'unenrolled') {
    return 'Monitoring stopped'
  }

  if (data.status === 'offline') {
    return 'Device offline'
  }

  if (data.healthMetrics) {
    if (
      data.healthMetrics.batteryLevel !== null &&
      data.healthMetrics.batteryLevel !== undefined &&
      data.healthMetrics.batteryLevel < THRESHOLDS.BATTERY_WARNING_PERCENT
    ) {
      return `Low battery (${data.healthMetrics.batteryLevel}%)`
    }

    if (data.healthMetrics.networkStatus === 'offline') {
      return 'Network offline'
    }
  }

  return 'Status changed'
}

/**
 * Get child name from Firestore
 */
async function getChildName(familyId: string, childId: string): Promise<string> {
  try {
    const childRef = getDb()
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(childId)
    const child = await childRef.get()

    if (child.exists) {
      return child.data()?.name || 'Your child'
    }
  } catch (error) {
    console.error('[onDeviceStatusChange] Error fetching child name:', error)
  }

  return 'Your child'
}

/**
 * Firestore trigger for device document updates
 *
 * Triggers on: families/{familyId}/devices/{deviceId}
 */
export const onDeviceStatusChange = onDocumentWritten(
  'families/{familyId}/devices/{deviceId}',
  async (event) => {
    const before = event.data?.before?.data() as DeviceData | undefined
    const after = event.data?.after?.data() as DeviceData | undefined

    // Skip if document was deleted
    if (!after) {
      console.log('[onDeviceStatusChange] Device deleted, skipping notification')
      return
    }

    // Calculate status before and after
    const prevStatus = calculateDeviceStatus(before)
    const newStatus = calculateDeviceStatus(after)

    // Skip if no status change
    const transition = createTransition(prevStatus, newStatus)
    if (!transition) {
      return
    }

    console.log(
      `[onDeviceStatusChange] Status changed: ${prevStatus} → ${newStatus} for device ${event.params.deviceId}`
    )

    // Get child info
    const childId = after.childId
    if (!childId) {
      console.log('[onDeviceStatusChange] No childId on device, skipping notification')
      return
    }

    const familyId = event.params.familyId
    const childName = await getChildName(familyId, childId)
    const issueDescription = getIssueDescription(after)

    // Send notification
    const result = await sendStatusNotification({
      familyId,
      childId,
      childName,
      transition,
      deviceName: after.name,
      issueDescription,
    })

    console.log(
      `[onDeviceStatusChange] Notification result: sent=${result.sent}, throttled=${result.throttled}, success=${result.successCount}`
    )
  }
)
