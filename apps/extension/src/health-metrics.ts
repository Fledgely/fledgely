/**
 * Health Metrics Module for Fledgely Chrome Extension
 *
 * Story 19.4: Monitoring Health Details
 * Story 46.1: Updated to use IndexedDB queue and network status module
 *
 * Collects and syncs device health metrics to Firestore for dashboard display.
 * Metrics are synced every 5 minutes via chrome.alarms.
 */

import { getEventStats } from './event-logger'
import { getQueueSize as getOfflineQueueSize } from './offline-queue'
import {
  getNetworkStatusString,
  getOfflineDurationSeconds,
  getSyncProgress,
} from './network-status'

/**
 * Health metrics collected from the device
 * Story 46.4: Added syncing networkStatus
 * Story 46.7: Added sync progress fields
 */
export interface DeviceHealthMetrics {
  /** Capture success rate over last 24h (0-100) */
  captureSuccessRate24h: number | null
  /** Number of screenshots pending upload */
  uploadQueueSize: number
  /** Network connectivity status - Story 46.4: Added syncing */
  networkStatus: 'online' | 'offline' | 'syncing'
  /** Story 46.1: Current offline duration in seconds (0 if online) */
  offlineDurationSeconds: number
  /** Battery level percentage (0-100) */
  batteryLevel: number | null
  /** Whether device is charging */
  batteryCharging: boolean | null
  /** Extension version from manifest */
  appVersion: string
  /** Whether an update is available */
  updateAvailable: boolean | null
  /** Timestamp of this health check */
  collectedAt: number
  // Story 46.7: Sync progress fields
  /** Total items to sync (when syncing) */
  syncProgressTotal: number | null
  /** Items synced so far (when syncing) */
  syncProgressSynced: number | null
  /** Sync speed in items per minute */
  syncSpeedItemsPerMinute: number | null
  /** Estimated seconds remaining for sync */
  syncEstimatedSecondsRemaining: number | null
  /** Timestamp when last sync completed */
  syncLastCompletedAt: number | null
  /** Number of items synced in last sync */
  syncLastSyncedCount: number | null
  /** Duration of last sync in milliseconds */
  syncLastDurationMs: number | null
}

/**
 * Get current upload queue size from IndexedDB
 * Story 46.1: Updated to use IndexedDB-based offline queue
 */
async function getQueueSize(): Promise<number> {
  try {
    return await getOfflineQueueSize()
  } catch {
    return 0
  }
}

/**
 * Get battery status using Battery Status API
 * Returns null if API not available (e.g., desktop without battery)
 */
async function getBatteryStatus(): Promise<{ level: number; charging: boolean } | null> {
  try {
    // @ts-expect-error - getBattery is not in all TypeScript definitions
    if (!navigator.getBattery) {
      return null
    }
    // @ts-expect-error - getBattery is not in all TypeScript definitions
    const battery = await navigator.getBattery()
    return {
      level: Math.round(battery.level * 100),
      charging: battery.charging,
    }
  } catch {
    return null
  }
}

/**
 * Check if an extension update is available
 */
async function checkForUpdate(): Promise<boolean | null> {
  try {
    return new Promise((resolve) => {
      chrome.runtime.requestUpdateCheck((status) => {
        if (chrome.runtime.lastError) {
          resolve(null)
          return
        }
        resolve(status === 'update_available')
      })
    })
  } catch {
    return null
  }
}

/**
 * Collect all health metrics from the device
 * Story 46.1: Updated to use network-status module
 * Story 46.7: Added sync progress metrics
 */
export async function collectHealthMetrics(): Promise<DeviceHealthMetrics> {
  // Get capture stats from event logger
  const stats = await getEventStats(24)
  const captureSuccessRate =
    stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : null

  // Get queue size from IndexedDB
  const uploadQueueSize = await getQueueSize()

  // Story 46.1: Get network status from network-status module
  // Story 46.4: Updated to use getNetworkStatusString which includes 'syncing' state
  const networkStatus = getNetworkStatusString()
  const offlineDurationSeconds = getOfflineDurationSeconds()

  // Story 46.7: Get sync progress
  const syncProgressData = getSyncProgress()

  // Get battery status
  const battery = await getBatteryStatus()

  // Get app version
  const appVersion = chrome.runtime.getManifest().version

  // Check for updates
  const updateAvailable = await checkForUpdate()

  return {
    captureSuccessRate24h: captureSuccessRate,
    uploadQueueSize,
    networkStatus,
    offlineDurationSeconds,
    batteryLevel: battery?.level ?? null,
    batteryCharging: battery?.charging ?? null,
    appVersion,
    updateAvailable,
    collectedAt: Date.now(),
    // Story 46.7: Sync progress
    syncProgressTotal: syncProgressData.total > 0 ? syncProgressData.total : null,
    syncProgressSynced: syncProgressData.total > 0 ? syncProgressData.synced : null,
    syncSpeedItemsPerMinute: syncProgressData.speedItemsPerMinute,
    syncEstimatedSecondsRemaining: syncProgressData.estimatedSecondsRemaining,
    syncLastCompletedAt: syncProgressData.lastCompletedAt,
    syncLastSyncedCount: syncProgressData.lastSyncedCount,
    syncLastDurationMs: syncProgressData.lastSyncDurationMs,
  }
}

/**
 * Sync health metrics to the server
 * Called periodically by chrome.alarms
 */
export async function syncHealthMetrics(): Promise<boolean> {
  try {
    // Get enrollment state
    const { state } = await chrome.storage.local.get('state')
    if (!state?.enrolled || !state?.deviceId || !state?.familyId) {
      console.log('[Fledgely] Health sync skipped - not enrolled')
      return false
    }

    const metrics = await collectHealthMetrics()

    // Story 6.5: Build request body with consent status
    const requestBody: {
      deviceId: string
      familyId: string
      metrics: DeviceHealthMetrics
      consentStatus?: 'pending' | 'granted' | 'withdrawn'
      activeAgreementId?: string | null
      activeAgreementVersion?: string | null
    } = {
      deviceId: state.deviceId,
      familyId: state.familyId,
      metrics,
    }

    // Story 6.5: Include consent status if available
    if (state.consentStatus) {
      requestBody.consentStatus = state.consentStatus
    }
    if (state.activeAgreementId !== undefined) {
      requestBody.activeAgreementId = state.activeAgreementId
    }
    if (state.activeAgreementVersion !== undefined) {
      requestBody.activeAgreementVersion = state.activeAgreementVersion
    }

    // Use the sync endpoint
    const response = await fetch(
      'https://us-central1-fledgely-cns-me.cloudfunctions.net/syncDeviceHealth',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely] Health sync failed:', response.status)
      return false
    }

    console.log('[Fledgely] Health metrics synced successfully')
    return true
  } catch (error) {
    console.error('[Fledgely] Health sync error:', error)
    return false
  }
}

/**
 * Set up periodic health sync using chrome.alarms
 * Called once during extension initialization
 */
export function setupHealthSyncAlarm(): void {
  const ALARM_NAME = 'fledgely-health-sync'
  const SYNC_INTERVAL_MINUTES = 5

  // Create alarm for periodic sync
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 1, // First sync after 1 minute
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  })

  // Listen for alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      syncHealthMetrics()
    }
  })

  console.log('[Fledgely] Health sync alarm configured (every 5 minutes)')
}
