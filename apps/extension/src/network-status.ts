/**
 * Network Status Detection - Story 46.1 Task 3
 *
 * Detects network connectivity status for offline queue management.
 *
 * AC1: Offline Detection
 * - Extension detects offline status
 * - Queue mode activated automatically
 */

// Connectivity check endpoint (uses a known reliable endpoint)
const CONNECTIVITY_CHECK_URL = 'https://www.google.com/generate_204'
const CONNECTIVITY_CHECK_TIMEOUT = 5000 // 5 seconds

// Network status state
let currentOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true
let lastOnlineAt: number | null = null
let offlineSinceAt: number | null = null
let lastOfflineDuration: number = 0 // Duration of most recent offline period (seconds)
let statusChangeListeners: Array<(isOnline: boolean) => void> = []
// Story 46.4: Track syncing state (for when queue is being processed after coming online)
let isSyncingState = false

// Story 46.7: Sync progress tracking
interface SyncProgress {
  total: number
  synced: number
  startedAt: number | null
  lastCompletedAt: number | null
  lastSyncedCount: number | null
  lastSyncDurationMs: number | null
}
let syncProgress: SyncProgress = {
  total: 0,
  synced: 0,
  startedAt: null,
  lastCompletedAt: null,
  lastSyncedCount: null,
  lastSyncDurationMs: null,
}

/**
 * Check if the device is currently online.
 *
 * @returns True if online, false if offline
 */
export function isOnline(): boolean {
  return currentOnlineStatus
}

/**
 * Get the timestamp when device last went online.
 *
 * @returns Timestamp in milliseconds, or null if never online
 */
export function getLastOnlineAt(): number | null {
  return lastOnlineAt
}

/**
 * Get the timestamp when device went offline.
 *
 * @returns Timestamp in milliseconds, or null if currently online
 */
export function getOfflineSinceAt(): number | null {
  return offlineSinceAt
}

/**
 * Get the current offline duration in seconds.
 *
 * @returns Offline duration in seconds, or 0 if online
 */
export function getOfflineDurationSeconds(): number {
  if (currentOnlineStatus || !offlineSinceAt) {
    return 0
  }
  return Math.floor((Date.now() - offlineSinceAt) / 1000)
}

/**
 * Get the duration of the most recent completed offline period.
 * Use this in the 'online' callback to get how long the device was offline.
 *
 * @returns Duration in seconds of the last offline period
 */
export function getLastOfflineDuration(): number {
  return lastOfflineDuration
}

/**
 * Subscribe to network status changes.
 *
 * @param callback Function called when network status changes
 * @returns Unsubscribe function
 */
export function onNetworkStatusChange(callback: (isOnline: boolean) => void): () => void {
  statusChangeListeners.push(callback)

  // Return unsubscribe function
  return () => {
    statusChangeListeners = statusChangeListeners.filter((cb) => cb !== callback)
  }
}

/**
 * Update network status and notify listeners.
 *
 * @param isOnline New online status
 */
function updateNetworkStatus(isOnline: boolean): void {
  const wasOnline = currentOnlineStatus
  currentOnlineStatus = isOnline

  if (wasOnline !== isOnline) {
    if (isOnline) {
      // Coming back online - capture duration BEFORE clearing offlineSinceAt
      if (offlineSinceAt) {
        lastOfflineDuration = Math.floor((Date.now() - offlineSinceAt) / 1000)
      }
      lastOnlineAt = Date.now()
      offlineSinceAt = null
      console.log('[NetworkStatus] Device is now online')
    } else {
      // Going offline
      offlineSinceAt = Date.now()
      lastOfflineDuration = 0 // Reset, will be set when coming back online
      console.log('[NetworkStatus] Device is now offline')
    }

    // Notify all listeners
    for (const listener of statusChangeListeners) {
      try {
        listener(isOnline)
      } catch (error) {
        console.error('[NetworkStatus] Listener error:', error)
      }
    }
  }
}

/**
 * Perform a connectivity check by fetching a known endpoint.
 * More reliable than navigator.onLine for detecting actual connectivity.
 *
 * @returns Promise resolving to true if connected, false otherwise
 */
export async function checkConnectivity(): Promise<boolean> {
  // First check navigator.onLine as a quick check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateNetworkStatus(false)
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_CHECK_TIMEOUT)

    await fetch(CONNECTIVITY_CHECK_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // no-cors mode returns opaque response, but successful fetch means we're online
    updateNetworkStatus(true)
    return true
  } catch (error) {
    // Network error or timeout - we're offline
    updateNetworkStatus(false)
    return false
  }
}

/**
 * Initialize network status monitoring.
 * Sets up event listeners for online/offline events.
 * Works in both window and service worker contexts.
 */
export function initNetworkStatusMonitoring(): void {
  // Determine the global context (window for popup, self for service worker)
  const globalContext: typeof globalThis =
    typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis

  // Initial status from navigator (available in both contexts)
  if (typeof navigator !== 'undefined') {
    currentOnlineStatus = navigator.onLine
    if (currentOnlineStatus) {
      lastOnlineAt = Date.now()
    } else {
      offlineSinceAt = Date.now()
    }
  }

  // Listen for browser online/offline events (works in service worker via 'self')
  if (globalContext && typeof globalContext.addEventListener === 'function') {
    globalContext.addEventListener('online', () => {
      updateNetworkStatus(true)
    })

    globalContext.addEventListener('offline', () => {
      updateNetworkStatus(false)
    })

    console.log(
      `[NetworkStatus] Monitoring initialized. Current status: ${currentOnlineStatus ? 'online' : 'offline'}`
    )
  }
}

/**
 * Clear all status change listeners.
 * Used for testing cleanup.
 */
export function clearListeners(): void {
  statusChangeListeners = []
}

/**
 * Reset network status state.
 * Used for testing.
 */
export function resetNetworkStatus(): void {
  currentOnlineStatus = true
  lastOnlineAt = null
  offlineSinceAt = null
  lastOfflineDuration = 0
  statusChangeListeners = []
  isSyncingState = false // Story 46.4: Reset syncing state
  // Story 46.7: Reset sync progress
  syncProgress = {
    total: 0,
    synced: 0,
    startedAt: null,
    lastCompletedAt: null,
    lastSyncedCount: null,
    lastSyncDurationMs: null,
  }
}

/**
 * Force set network status.
 * Used for testing.
 */
export function setNetworkStatus(isOnline: boolean): void {
  updateNetworkStatus(isOnline)
}

/**
 * Story 46.4: Check if device is currently syncing queue
 * @returns True if syncing, false otherwise
 */
export function isSyncing(): boolean {
  return isSyncingState
}

/**
 * Story 46.4: Set the syncing state
 * Called when processScreenshotQueue starts/ends
 * @param syncing Whether device is currently syncing
 */
export function setSyncingState(syncing: boolean): void {
  isSyncingState = syncing
  console.log(`[NetworkStatus] Syncing state: ${syncing ? 'syncing' : 'not syncing'}`)
}

/**
 * Story 46.4: Get the network status string for health metrics
 * Returns 'syncing' if syncing, otherwise 'online' or 'offline'
 * @returns Network status string
 */
export function getNetworkStatusString(): 'online' | 'offline' | 'syncing' {
  if (isSyncingState && currentOnlineStatus) {
    return 'syncing'
  }
  return currentOnlineStatus ? 'online' : 'offline'
}

/**
 * Story 46.7: Start sync progress tracking
 * Called when sync begins with total items to sync
 * @param total Total number of items to sync
 */
export function startSyncProgress(total: number): void {
  syncProgress = {
    ...syncProgress,
    total,
    synced: 0,
    startedAt: Date.now(),
  }
  isSyncingState = true
  console.log(`[NetworkStatus] Sync started: ${total} items to sync`)
}

/**
 * Story 46.7: Update sync progress
 * Called after each item is synced
 * @param synced Number of items synced so far
 */
export function updateSyncProgress(synced: number): void {
  syncProgress.synced = synced
}

/**
 * Story 46.7: Complete sync progress tracking
 * Called when sync finishes
 */
export function completeSyncProgress(): void {
  if (syncProgress.startedAt) {
    const duration = Date.now() - syncProgress.startedAt
    syncProgress.lastCompletedAt = Date.now()
    syncProgress.lastSyncedCount = syncProgress.synced
    syncProgress.lastSyncDurationMs = duration
    console.log(
      `[NetworkStatus] Sync completed: ${syncProgress.synced} items in ${(duration / 1000).toFixed(1)}s`
    )
  }
  syncProgress.total = 0
  syncProgress.synced = 0
  syncProgress.startedAt = null
  isSyncingState = false
}

/**
 * Story 46.7: Get current sync progress
 * @returns Sync progress state
 */
export function getSyncProgress(): {
  total: number
  synced: number
  startedAt: number | null
  speedItemsPerMinute: number | null
  estimatedSecondsRemaining: number | null
  lastCompletedAt: number | null
  lastSyncedCount: number | null
  lastSyncDurationMs: number | null
} {
  let speedItemsPerMinute: number | null = null
  let estimatedSecondsRemaining: number | null = null

  // Calculate speed and ETA if sync is in progress
  if (syncProgress.startedAt && syncProgress.synced > 0) {
    const elapsedMs = Date.now() - syncProgress.startedAt
    const elapsedMinutes = elapsedMs / 60000
    speedItemsPerMinute = Math.round(syncProgress.synced / elapsedMinutes)

    const remaining = syncProgress.total - syncProgress.synced
    if (speedItemsPerMinute > 0) {
      estimatedSecondsRemaining = Math.round((remaining / speedItemsPerMinute) * 60)
    }
  }

  return {
    total: syncProgress.total,
    synced: syncProgress.synced,
    startedAt: syncProgress.startedAt,
    speedItemsPerMinute,
    estimatedSecondsRemaining,
    lastCompletedAt: syncProgress.lastCompletedAt,
    lastSyncedCount: syncProgress.lastSyncedCount,
    lastSyncDurationMs: syncProgress.lastSyncDurationMs,
  }
}
