/**
 * Fledgely Chrome Extension - Service Worker
 *
 * This is the background script that runs as a service worker (Manifest V3).
 * It handles:
 * - Screenshot capture scheduling via chrome.alarms
 * - Sync queue management
 * - Authentication state
 * - Communication with popup
 *
 * Story 9.1: Extension Package & Manifest
 * Story 9.6: Extension Background Service
 * Story 10.1: Screenshot Capture Mechanism
 */

import { captureScreenshot, ScreenshotCapture } from './capture'
import { uploadScreenshot, calculateRetryDelay, shouldRetry, getRemainingUploads } from './upload'
import {
  logCaptureEvent,
  getCaptureEvents,
  clearCaptureEvents,
  getEventStats,
  hasConsecutiveCriticalErrors,
  countConsecutiveSuccesses,
  ERROR_CODES,
} from './event-logger'
import {
  isUrlProtected,
  initializeAllowlist,
  getAllowlistVersion,
  syncAllowlistFromServer,
  isAllowlistStale,
} from './crisis-allowlist'

// Alarm names for scheduled tasks
const ALARM_SCREENSHOT_CAPTURE = 'screenshot-capture'
const ALARM_SYNC_QUEUE = 'sync-queue'
const ALARM_ALLOWLIST_SYNC = 'allowlist-sync' // Story 11.2

// Allowlist sync interval (24 hours)
const ALLOWLIST_SYNC_INTERVAL_HOURS = 24

// Capture interval constraints (MV3 minimum is 1 minute)
const DEFAULT_CAPTURE_INTERVAL_MINUTES = 5
const MIN_CAPTURE_INTERVAL_MINUTES = 1
const MAX_CAPTURE_INTERVAL_MINUTES = 30
const DEFAULT_SYNC_INTERVAL_MINUTES = 15

// Idle detection constants (Story 10.5)
const DEFAULT_IDLE_THRESHOLD_SECONDS = 300 // 5 minutes
const MIN_IDLE_THRESHOLD_SECONDS = 60 // 1 minute
const MAX_IDLE_THRESHOLD_SECONDS = 1800 // 30 minutes

// Current idle state (in-memory, not persisted)
let isDeviceIdle = false

// Error badge constants (Story 10.6)
const ERROR_BADGE_COLOR = '#ef4444' // Red
const CONSECUTIVE_ERRORS_THRESHOLD = 3
const CONSECUTIVE_SUCCESSES_TO_CLEAR = 5

// Protected site indicator constants (Story 11.3)
const PROTECTED_BADGE_TEXT = '✓' // Checkmark
const PROTECTED_BADGE_COLOR = '#8b5cf6' // Purple (calming)
const PROTECTED_TITLE = 'Fledgely - Private Site (not monitored)'

// Decoy mode constants (Story 11.5)
// Simple gray gradient placeholder image (1x1 pixel gray JPEG as minimal placeholder)
// In production, this would be a more innocuous-looking search engine screenshot
const DECOY_IMAGE_DATA =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAAYAH//2Q=='

/**
 * Validate and clamp capture interval to allowed range
 */
function validateCaptureInterval(minutes: number): number {
  return Math.max(MIN_CAPTURE_INTERVAL_MINUTES, Math.min(MAX_CAPTURE_INTERVAL_MINUTES, minutes))
}

// Extension state stored in chrome.storage.local
interface ExtensionState {
  isAuthenticated: boolean
  userId: string | null
  familyId: string | null
  childId: string | null
  lastSync: number | null
  monitoringEnabled: boolean
  captureIntervalMinutes: number
  idleThresholdSeconds: number
  showProtectedIndicator: boolean // Story 11.3: Optional visual indicator
  decoyModeEnabled: boolean // Story 11.5: Generate decoys for crisis sites
}

const DEFAULT_STATE: ExtensionState = {
  isAuthenticated: false,
  userId: null,
  familyId: null,
  childId: null,
  lastSync: null,
  monitoringEnabled: false,
  captureIntervalMinutes: DEFAULT_CAPTURE_INTERVAL_MINUTES,
  idleThresholdSeconds: DEFAULT_IDLE_THRESHOLD_SECONDS,
  showProtectedIndicator: true, // Story 11.3: Default to showing indicator
  decoyModeEnabled: false, // Story 11.5: Default to off (opt-in)
}

/**
 * Validate and clamp idle threshold to allowed range
 */
function validateIdleThreshold(seconds: number): number {
  return Math.max(MIN_IDLE_THRESHOLD_SECONDS, Math.min(MAX_IDLE_THRESHOLD_SECONDS, seconds))
}

/**
 * Set up idle detection with the configured threshold
 * Story 10.5: Capture Pause During Inactivity
 */
function setupIdleDetection(thresholdSeconds: number): void {
  const validatedThreshold = validateIdleThreshold(thresholdSeconds)
  chrome.idle.setDetectionInterval(validatedThreshold)
  console.log(`[Fledgely] Idle detection set to ${validatedThreshold}s`)
}

/**
 * Start monitoring alarms when a child is connected
 * Uses chrome.alarms for MV3-compliant persistent scheduling
 */
async function startMonitoringAlarms(
  intervalMinutes: number,
  idleThreshold: number = DEFAULT_IDLE_THRESHOLD_SECONDS
): Promise<void> {
  // Validate and clamp interval to allowed range (1-30 minutes)
  const validatedInterval = validateCaptureInterval(intervalMinutes)

  // Set up idle detection (Story 10.5)
  setupIdleDetection(idleThreshold)

  // Clear any existing alarms first
  await chrome.alarms.clear(ALARM_SCREENSHOT_CAPTURE)
  await chrome.alarms.clear(ALARM_SYNC_QUEUE)

  // Create screenshot capture alarm
  // Note: MV3 minimum interval is 1 minute for repeating alarms
  await chrome.alarms.create(ALARM_SCREENSHOT_CAPTURE, {
    delayInMinutes: 1, // First capture after 1 minute
    periodInMinutes: validatedInterval,
  })
  console.log(`[Fledgely] Screenshot alarm created with ${validatedInterval}min interval`)

  // Create sync queue alarm
  await chrome.alarms.create(ALARM_SYNC_QUEUE, {
    delayInMinutes: 2, // First sync after 2 minutes
    periodInMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
  })
  console.log(`[Fledgely] Sync alarm created with ${DEFAULT_SYNC_INTERVAL_MINUTES}min interval`)
}

/**
 * Stop monitoring alarms when child is disconnected or monitoring disabled
 */
async function stopMonitoringAlarms(): Promise<void> {
  await chrome.alarms.clear(ALARM_SCREENSHOT_CAPTURE)
  await chrome.alarms.clear(ALARM_SYNC_QUEUE)
  console.log('[Fledgely] Monitoring alarms cleared')
}

/**
 * Update lastSync timestamp in state
 */
async function updateLastSync(): Promise<void> {
  const { state } = await chrome.storage.local.get('state')
  if (state) {
    const newState = { ...state, lastSync: Date.now() }
    await chrome.storage.local.set({ state: newState })
  }
}

/**
 * Create a decoy screenshot capture for crisis-protected sites
 * Story 11.5: Decoy Mode for Crisis Browsing
 * Returns a ScreenshotCapture with placeholder image and sanitized metadata
 */
function createDecoyCapture(): ScreenshotCapture {
  return {
    dataUrl: DECOY_IMAGE_DATA,
    timestamp: Date.now(),
    url: 'about:blank', // Sanitized URL - never expose protected site
    title: 'Protected', // Sanitized title - never expose protected site
    captureTimeMs: 0, // Decoy is instant
  }
}

/**
 * Maximum number of screenshots in the local queue (NFR87)
 */
const MAX_QUEUE_SIZE = 500

/**
 * Queue item for pending screenshot upload
 */
interface QueuedScreenshot {
  id: string
  capture: ScreenshotCapture
  childId: string
  queuedAt: number
  retryCount: number
  lastRetryAt: number | null
  isDecoy: boolean // Story 11.5: True if this is a decoy image for crisis protection
}

/**
 * Add a screenshot to the upload queue
 * Queue persists in chrome.storage.local for offline support
 * Story 10.6: Now logs queue overflow events
 * Story 11.5: Added isDecoy parameter for decoy mode
 */
async function queueScreenshot(
  capture: ScreenshotCapture,
  childId: string,
  isDecoy: boolean = false
): Promise<void> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')

  const item: QueuedScreenshot = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    capture,
    childId,
    queuedAt: Date.now(),
    retryCount: 0,
    lastRetryAt: null,
    isDecoy,
  }

  // Add to queue
  screenshotQueue.push(item)

  // Enforce queue size limit (drop oldest items)
  if (screenshotQueue.length > MAX_QUEUE_SIZE) {
    const dropped = screenshotQueue.length - MAX_QUEUE_SIZE
    screenshotQueue.splice(0, dropped)
    console.warn(`[Fledgely] Queue overflow: dropped ${dropped} oldest screenshots`)

    // Log queue overflow event (Story 10.6)
    await logCaptureEvent('queue_overflow', false, {
      queueSize: MAX_QUEUE_SIZE,
      errorCode: ERROR_CODES.QUEUE_FULL,
    })
  }

  await chrome.storage.local.set({ screenshotQueue })
  console.log(`[Fledgely] Screenshot queued (${screenshotQueue.length} items in queue)`)
}

/**
 * Get the current queue size
 * Exported for popup to display queue status
 */
export async function getQueueSize(): Promise<number> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')
  return screenshotQueue.length
}

/**
 * Process the screenshot queue - upload pending items
 * Story 10.4: Screenshot Upload to API
 * Story 10.6: Now logs all upload events
 */
async function processScreenshotQueue(): Promise<void> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')

  if (screenshotQueue.length === 0) {
    console.log('[Fledgely] Queue empty, nothing to process')
    return
  }

  const remainingUploads = getRemainingUploads()
  if (remainingUploads === 0) {
    console.log('[Fledgely] Rate limit reached, will retry on next sync')
    return
  }

  // Get state for badge updates
  const { state } = await chrome.storage.local.get('state')

  // Process queue items that are ready for upload
  const now = Date.now()
  const updatedQueue: QueuedScreenshot[] = []
  let uploadsThisRun = 0
  let successCount = 0
  let failCount = 0

  for (const item of screenshotQueue) {
    // Check if we've hit the rate limit for this run
    if (uploadsThisRun >= remainingUploads) {
      updatedQueue.push(item) // Keep for later
      continue
    }

    // Check if item needs to wait for retry backoff
    if (item.lastRetryAt !== null) {
      const retryDelay = calculateRetryDelay(item.retryCount)
      if (now - item.lastRetryAt < retryDelay) {
        updatedQueue.push(item) // Not ready for retry yet
        continue
      }
    }

    // Check if max retries exceeded
    if (!shouldRetry(item.retryCount)) {
      console.warn(`[Fledgely] Dropping screenshot ${item.id} after max retries`)
      failCount++

      // Log retry exhausted event (Story 10.6)
      await logCaptureEvent('retry_exhausted', false, {
        queueSize: screenshotQueue.length,
        errorCode: ERROR_CODES.MAX_RETRIES_EXCEEDED,
      })
      continue // Don't re-add to queue
    }

    // Attempt upload
    const uploadStart = Date.now()
    const result = await uploadScreenshot(item.capture, item.childId, item.queuedAt)
    const uploadDuration = Date.now() - uploadStart
    uploadsThisRun++

    if (result.success) {
      successCount++

      // Log upload success event (Story 10.6)
      await logCaptureEvent('upload_success', true, {
        duration: uploadDuration,
        queueSize: updatedQueue.length + (screenshotQueue.length - uploadsThisRun),
      })
      // Don't add back to queue - successfully uploaded
    } else {
      if (result.shouldRetry) {
        // Update retry info and keep in queue
        updatedQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
          lastRetryAt: now,
        })
      }
      failCount++

      // Log upload failure event (Story 10.6)
      await logCaptureEvent('upload_failed', false, {
        duration: uploadDuration,
        queueSize: updatedQueue.length + (screenshotQueue.length - uploadsThisRun),
        errorCode: ERROR_CODES.UPLOAD_NETWORK_ERROR,
      })
    }
  }

  // Save updated queue
  await chrome.storage.local.set({ screenshotQueue: updatedQueue })

  console.log(
    `[Fledgely] Queue processed: ${successCount} uploaded, ${failCount} failed, ` +
      `${updatedQueue.length} remaining`
  )

  // Update error badge after processing (Story 10.6)
  if (state) {
    await updateErrorBadge(state)
  }
}

/**
 * Handle screenshot capture triggered by alarm
 * Story 10.6: Now logs all capture events
 * Story 11.1: Checks crisis allowlist BEFORE any capture
 */
async function handleScreenshotCapture(state: ExtensionState): Promise<void> {
  if (!state.childId) {
    console.log('[Fledgely] No child connected, skipping capture')
    return
  }

  // Story 10.5: Skip capture if device is idle or locked
  if (isDeviceIdle) {
    console.log('[Fledgely] Device is idle/locked, skipping capture')
    // Note: idle_pause/resume events logged in idle listener, not here
    return
  }

  // Story 11.1: Check crisis allowlist BEFORE any capture (INV-001 zero data path)
  // This check MUST happen before captureScreenshot to ensure no data is created
  try {
    // Get current tab URL for allowlist check
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (activeTab?.url) {
      const isProtected = isUrlProtected(activeTab.url)
      if (isProtected) {
        // ZERO DATA PATH: Skip real capture entirely
        // Log event but DO NOT log URL (privacy requirement)
        const queueSize = await getQueueSize()

        // Story 11.5: If decoy mode is enabled, queue a decoy instead of skipping
        if (state.decoyModeEnabled) {
          const decoyCapture = createDecoyCapture()
          await queueScreenshot(decoyCapture, state.childId, true) // isDecoy=true
          console.log('[Fledgely] Decoy queued for protected site (no gap in timeline)')
        }

        await logCaptureEvent('capture_skipped', true, {
          queueSize: state.decoyModeEnabled ? queueSize + 1 : queueSize,
          errorCode: ERROR_CODES.CRISIS_URL_PROTECTED,
        })
        // Note: We intentionally do NOT log anything about which site was protected
        return
      }
    }
  } catch {
    // Fail-safe: If we can't check the allowlist, skip capture
    console.error('[Fledgely] Crisis allowlist check failed, skipping capture (fail-safe)')
    const queueSize = await getQueueSize()
    await logCaptureEvent('capture_skipped', true, {
      queueSize,
      errorCode: ERROR_CODES.ALLOWLIST_CHECK_ERROR,
    })
    return
  }

  const startTime = Date.now()
  const result = await captureScreenshot({ quality: 80 })
  const duration = Date.now() - startTime
  const queueSize = await getQueueSize()

  if (result.success) {
    // Queue the screenshot for upload (Story 10.4 will implement actual upload)
    await queueScreenshot(result.capture, state.childId)

    // Log success event (Story 10.6)
    await logCaptureEvent('capture_success', true, {
      duration,
      queueSize: queueSize + 1, // After adding to queue
    })

    // Update lastSync to show activity
    await updateLastSync()

    // Check if we should clear error badge
    await updateErrorBadge(state)
  } else if (result.skipped) {
    // Non-capturable URL (chrome://, etc.) - this is expected, not an error
    console.log(`[Fledgely] Capture skipped: ${result.error}`)

    // Log skipped event (Story 10.6)
    await logCaptureEvent('capture_skipped', true, {
      duration,
      queueSize,
      errorCode: ERROR_CODES.NON_CAPTURABLE_URL,
    })
  } else {
    // Actual error occurred
    console.error(`[Fledgely] Capture failed: ${result.error}`)

    // Log failure event (Story 10.6)
    await logCaptureEvent('capture_failed', false, {
      duration,
      queueSize,
      errorCode: ERROR_CODES.CAPTURE_FAILED,
    })

    // Update error badge
    await updateErrorBadge(state)
  }
}

// Update toolbar icon title based on state
async function updateActionTitle(state: ExtensionState): Promise<void> {
  const title = state.isAuthenticated
    ? state.childId
      ? `Fledgely - Monitoring Active`
      : 'Fledgely - Not Connected to Child'
    : 'Fledgely - Not Signed In'

  await chrome.action.setTitle({ title })

  // Set badge for quick status indication
  if (state.monitoringEnabled) {
    await chrome.action.setBadgeText({ text: '●' })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' }) // Green
  } else if (state.isAuthenticated) {
    await chrome.action.setBadgeText({ text: '○' })
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }) // Amber
  } else {
    await chrome.action.setBadgeText({ text: '' })
  }
}

/**
 * Set error badge on extension icon when critical errors occur
 * Story 10.6: Capture Event Logging
 */
async function setErrorBadge(): Promise<void> {
  await chrome.action.setBadgeText({ text: '!' })
  await chrome.action.setBadgeBackgroundColor({ color: ERROR_BADGE_COLOR })
}

/**
 * Set protected site badge on extension icon
 * Story 11.3: Protected Site Visual Indicator
 * NOTE: This does NOT log anything - privacy requirement (AC6)
 * @param tabId - The tab ID to set badge for (tab-specific)
 */
async function setProtectedBadge(tabId: number): Promise<void> {
  await chrome.action.setBadgeText({ text: PROTECTED_BADGE_TEXT, tabId })
  await chrome.action.setBadgeBackgroundColor({ color: PROTECTED_BADGE_COLOR, tabId })
  await chrome.action.setTitle({ title: PROTECTED_TITLE, tabId })
}

/**
 * Clear protected site badge (restore normal badge state)
 * Story 11.3: Protected Site Visual Indicator
 * NOTE: This does NOT log anything - privacy requirement (AC6)
 * @param tabId - The tab ID to clear badge for (tab-specific)
 */
async function clearProtectedBadge(tabId: number, state: ExtensionState): Promise<void> {
  // Restore normal badge state for this tab
  const title = state.isAuthenticated
    ? state.childId
      ? 'Fledgely - Monitoring Active'
      : 'Fledgely - Not Connected to Child'
    : 'Fledgely - Not Signed In'

  await chrome.action.setTitle({ title, tabId })

  if (state.monitoringEnabled) {
    await chrome.action.setBadgeText({ text: '●', tabId })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId })
  } else if (state.isAuthenticated) {
    await chrome.action.setBadgeText({ text: '○', tabId })
    await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId })
  } else {
    await chrome.action.setBadgeText({ text: '', tabId })
  }
}

/**
 * Check if a tab URL is protected and update badge accordingly
 * Story 11.3: Protected Site Visual Indicator
 * NOTE: This does NOT log anything - privacy requirement (AC6)
 */
async function updateProtectedBadge(tabId: number, url: string): Promise<void> {
  const { state } = await chrome.storage.local.get('state')
  const currentState = state || DEFAULT_STATE

  // Only show indicator if enabled in settings
  if (!currentState.showProtectedIndicator) {
    return
  }

  const isProtected = isUrlProtected(url)
  if (isProtected) {
    await setProtectedBadge(tabId)
  } else {
    await clearProtectedBadge(tabId, currentState)
  }
}

/**
 * Check and update error badge based on event log
 * Called after logging events to show/clear error badge
 * Story 10.6: Capture Event Logging
 */
async function updateErrorBadge(state: ExtensionState): Promise<void> {
  // Only show error badge if monitoring is enabled
  if (!state.monitoringEnabled) {
    return
  }

  // Check if we should show error badge
  const hasErrors = await hasConsecutiveCriticalErrors(CONSECUTIVE_ERRORS_THRESHOLD)
  if (hasErrors) {
    await setErrorBadge()
    return
  }

  // Check if we should clear error badge (enough consecutive successes)
  const successCount = await countConsecutiveSuccesses()
  if (successCount >= CONSECUTIVE_SUCCESSES_TO_CLEAR) {
    // Restore normal badge
    await updateActionTitle(state)
  }
}

// Initialize extension state on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Fledgely] Extension installed:', details.reason)

  // Story 11.1: Initialize crisis allowlist on install/update
  await initializeAllowlist()
  console.log(`[Fledgely] Crisis allowlist initialized (v${getAllowlistVersion()})`)

  // Story 11.2: Set up allowlist sync alarm (24h interval)
  await chrome.alarms.create(ALARM_ALLOWLIST_SYNC, {
    delayInMinutes: 60, // First sync 1 hour after install
    periodInMinutes: ALLOWLIST_SYNC_INTERVAL_HOURS * 60,
  })
  console.log('[Fledgely] Allowlist sync alarm created')

  if (details.reason === 'install') {
    // First installation - initialize state and open onboarding
    await chrome.storage.local.set({ state: DEFAULT_STATE })
    console.log('[Fledgely] Initialized extension state')

    // Open onboarding page
    await chrome.tabs.create({
      url: chrome.runtime.getURL('onboarding.html'),
    })
    console.log('[Fledgely] Opened onboarding page')

    // Set initial toolbar state
    await updateActionTitle(DEFAULT_STATE)
  } else if (details.reason === 'update') {
    // Extension updated - preserve existing state
    console.log('[Fledgely] Extension updated from', details.previousVersion)

    // Update toolbar with current state
    const { state } = await chrome.storage.local.get('state')
    await updateActionTitle(state || DEFAULT_STATE)
  }
})

// Handle startup (browser restart)
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Fledgely] Browser started, checking state')

  // Story 11.1: Initialize crisis allowlist on startup
  await initializeAllowlist()
  console.log(`[Fledgely] Crisis allowlist initialized (v${getAllowlistVersion()})`)

  // Story 11.2: Set up allowlist sync alarm (24h interval)
  await chrome.alarms.create(ALARM_ALLOWLIST_SYNC, {
    delayInMinutes: 60, // First sync 1 hour after startup
    periodInMinutes: ALLOWLIST_SYNC_INTERVAL_HOURS * 60,
  })
  console.log('[Fledgely] Allowlist sync alarm created')

  // Story 11.2: Check if allowlist needs immediate sync
  if (await isAllowlistStale()) {
    console.log('[Fledgely] Allowlist is stale, syncing now')
    await syncAllowlistFromServer()
  }

  const { state } = await chrome.storage.local.get('state')

  // Update toolbar with current state
  await updateActionTitle(state || DEFAULT_STATE)

  if (state?.isAuthenticated && state?.monitoringEnabled && state?.childId) {
    // Resume monitoring alarms if they were active
    console.log('[Fledgely] Resuming monitoring for child:', state.childId)
    await startMonitoringAlarms(
      state.captureIntervalMinutes || DEFAULT_CAPTURE_INTERVAL_MINUTES,
      state.idleThresholdSeconds || DEFAULT_IDLE_THRESHOLD_SECONDS
    )
  }
})

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Fledgely] Received message:', message.type)

  switch (message.type) {
    case 'GET_STATE':
      chrome.storage.local.get('state').then(({ state }) => {
        sendResponse({ state: state || DEFAULT_STATE })
      })
      return true // Keep channel open for async response

    case 'SET_STATE':
      chrome.storage.local.set({ state: message.state }).then(() => {
        sendResponse({ success: true })
      })
      return true

    case 'AUTH_STATE_CHANGED':
      // Update extension state and badge when auth changes
      chrome.storage.local.get('state').then(async ({ state }) => {
        const newState: ExtensionState = {
          ...(state || DEFAULT_STATE),
          isAuthenticated: message.authState?.isAuthenticated || false,
          userId: message.authState?.userId || null,
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)
        sendResponse({ success: true })
      })
      return true

    case 'CHILD_CONNECTED':
      // Update state when child is connected and start monitoring alarms
      chrome.storage.local.get('state').then(async ({ state }) => {
        const newState: ExtensionState = {
          ...(state || DEFAULT_STATE),
          childId: message.childId,
          monitoringEnabled: true,
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)

        // Start monitoring alarms for screenshot capture and sync
        await startMonitoringAlarms(newState.captureIntervalMinutes, newState.idleThresholdSeconds)

        console.log('[Fledgely] Connected to child:', message.childName)
        sendResponse({ success: true })
      })
      return true

    case 'CHILD_DISCONNECTED':
      // Update state when child is disconnected and stop monitoring alarms
      chrome.storage.local.get('state').then(async ({ state }) => {
        const newState: ExtensionState = {
          ...(state || DEFAULT_STATE),
          childId: null,
          monitoringEnabled: false,
        }
        await chrome.storage.local.set({ state: newState })
        await updateActionTitle(newState)

        // Stop monitoring alarms
        await stopMonitoringAlarms()

        console.log('[Fledgely] Disconnected from child')
        sendResponse({ success: true })
      })
      return true

    case 'UPDATE_CAPTURE_INTERVAL':
      // Update capture interval and restart alarm with new timing
      // Story 10.2: Configurable Capture Intervals
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newInterval = validateCaptureInterval(
          message.intervalMinutes || DEFAULT_CAPTURE_INTERVAL_MINUTES
        )

        const newState: ExtensionState = {
          ...currentState,
          captureIntervalMinutes: newInterval,
        }
        await chrome.storage.local.set({ state: newState })

        // If monitoring is active, restart alarms with new interval
        if (currentState.monitoringEnabled) {
          await startMonitoringAlarms(newInterval, currentState.idleThresholdSeconds)
          console.log(`[Fledgely] Capture interval updated to ${newInterval}min`)
        }

        sendResponse({ success: true, newInterval })
      })
      return true

    case 'UPDATE_IDLE_THRESHOLD':
      // Update idle threshold for inactivity detection
      // Story 10.5: Capture Pause During Inactivity
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newThreshold = validateIdleThreshold(
          message.thresholdSeconds || DEFAULT_IDLE_THRESHOLD_SECONDS
        )

        const newState: ExtensionState = {
          ...currentState,
          idleThresholdSeconds: newThreshold,
        }
        await chrome.storage.local.set({ state: newState })

        // Update idle detection with new threshold
        setupIdleDetection(newThreshold)
        console.log(`[Fledgely] Idle threshold updated to ${newThreshold}s`)

        sendResponse({ success: true, newThreshold })
      })
      return true

    case 'GET_CAPTURE_LOGS':
      // Get capture event logs for debug panel (parent only)
      // Story 10.6: Capture Event Logging - AC5 requires parent authentication
      chrome.storage.local.get('state').then(async ({ state }) => {
        if (!state?.isAuthenticated) {
          sendResponse({ success: false, error: 'Not authenticated' })
          return
        }
        try {
          const events = await getCaptureEvents(message.limit || 100)
          sendResponse({ success: true, events })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'CLEAR_CAPTURE_LOGS':
      // Clear capture event logs (parent only)
      // Story 10.6: Capture Event Logging - AC5 requires parent authentication
      chrome.storage.local.get('state').then(async ({ state }) => {
        if (!state?.isAuthenticated) {
          sendResponse({ success: false, error: 'Not authenticated' })
          return
        }
        try {
          await clearCaptureEvents()
          sendResponse({ success: true })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'GET_CAPTURE_STATS':
      // Get capture event statistics (parent only)
      // Story 10.6: Capture Event Logging - AC5 requires parent authentication
      chrome.storage.local.get('state').then(async ({ state }) => {
        if (!state?.isAuthenticated) {
          sendResponse({ success: false, error: 'Not authenticated' })
          return
        }
        try {
          const stats = await getEventStats(message.hours || 24)
          sendResponse({ success: true, stats })
        } catch (error) {
          sendResponse({ success: false, error: String(error) })
        }
      })
      return true

    case 'UPDATE_PROTECTED_INDICATOR':
      // Update protected site indicator setting
      // Story 11.3: Protected Site Visual Indicator - AC5 optional setting
      // NOTE: This does NOT log anything - privacy requirement (AC6)
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          showProtectedIndicator: Boolean(message.showIndicator),
        }
        await chrome.storage.local.set({ state: newState })
        // Note: No logging of this setting change (AC6)
        sendResponse({ success: true, showIndicator: newState.showProtectedIndicator })
      })
      return true

    case 'UPDATE_DECOY_MODE':
      // Update decoy mode setting
      // Story 11.5: Decoy Mode for Crisis Browsing - AC5 opt-in requirement
      // Child must explicitly enable this feature
      chrome.storage.local.get('state').then(async ({ state }) => {
        const currentState = state || DEFAULT_STATE
        const newState: ExtensionState = {
          ...currentState,
          decoyModeEnabled: Boolean(message.enabled),
        }
        await chrome.storage.local.set({ state: newState })
        console.log(`[Fledgely] Decoy mode ${newState.decoyModeEnabled ? 'enabled' : 'disabled'}`)
        sendResponse({ success: true, decoyModeEnabled: newState.decoyModeEnabled })
      })
      return true

    default:
      sendResponse({ error: 'Unknown message type' })
  }
})

// Alarm handler for scheduled tasks (MV3 persistent scheduling)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[Fledgely] Alarm fired:', alarm.name)

  // Story 11.2: Allowlist sync runs regardless of monitoring state
  if (alarm.name === ALARM_ALLOWLIST_SYNC) {
    console.log('[Fledgely] Allowlist sync alarm triggered')
    await syncAllowlistFromServer()
    return
  }

  // Check if monitoring is still enabled before processing capture/upload alarms
  const { state } = await chrome.storage.local.get('state')
  if (!state?.monitoringEnabled) {
    console.log('[Fledgely] Monitoring disabled, ignoring alarm')
    return
  }

  switch (alarm.name) {
    case ALARM_SCREENSHOT_CAPTURE:
      // Story 10.1: Screenshot Capture Mechanism
      console.log('[Fledgely] Screenshot capture alarm triggered')
      await handleScreenshotCapture(state)
      break

    case ALARM_SYNC_QUEUE: {
      // Story 10.4: Screenshot Upload to API
      console.log('[Fledgely] Sync queue alarm triggered')
      await processScreenshotQueue()
      await updateLastSync()
      break
    }
  }
})

// Idle state change listener (Story 10.5, Story 10.6 logging)
chrome.idle.onStateChanged.addListener(async (newState) => {
  const previousState = isDeviceIdle

  // Update idle state based on chrome.idle state
  // "active" = user is active, "idle" = user is idle, "locked" = screen is locked
  isDeviceIdle = newState !== 'active'

  if (previousState !== isDeviceIdle) {
    if (isDeviceIdle) {
      console.log(`[Fledgely] Device became ${newState} - capture paused`)

      // Log idle pause event (Story 10.6)
      const queueSize = await getQueueSize()
      await logCaptureEvent('idle_pause', true, { queueSize })
    } else {
      console.log('[Fledgely] Device became active - capture resumed')

      // Log idle resume event (Story 10.6)
      const queueSize = await getQueueSize()
      await logCaptureEvent('idle_resume', true, { queueSize })
    }
  }
})

// Tab navigation listener (Story 11.3: Protected Site Visual Indicator)
// Updates badge when user navigates to/from protected sites
// NOTE: This does NOT log anything - privacy requirement (AC6)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check on complete load to avoid flickering
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await updateProtectedBadge(tabId, tab.url)
    } catch {
      // Silently fail - badge updates are non-critical
    }
  }
})

// Tab activation listener (Story 11.3: Protected Site Visual Indicator)
// Updates badge when user switches to a different tab
// NOTE: This does NOT log anything - privacy requirement (AC6)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      await updateProtectedBadge(activeInfo.tabId, tab.url)
    }
  } catch {
    // Silently fail - badge updates are non-critical
  }
})

// Export for testing
export { ExtensionState, DEFAULT_STATE }
