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

// Alarm names for scheduled tasks
const ALARM_SCREENSHOT_CAPTURE = 'screenshot-capture'
const ALARM_SYNC_QUEUE = 'sync-queue'

// Default capture interval in minutes (MV3 minimum is 1 minute)
const DEFAULT_CAPTURE_INTERVAL_MINUTES = 5
const DEFAULT_SYNC_INTERVAL_MINUTES = 15

// Extension state stored in chrome.storage.local
interface ExtensionState {
  isAuthenticated: boolean
  userId: string | null
  familyId: string | null
  childId: string | null
  lastSync: number | null
  monitoringEnabled: boolean
  captureIntervalMinutes: number
}

const DEFAULT_STATE: ExtensionState = {
  isAuthenticated: false,
  userId: null,
  familyId: null,
  childId: null,
  lastSync: null,
  monitoringEnabled: false,
  captureIntervalMinutes: DEFAULT_CAPTURE_INTERVAL_MINUTES,
}

/**
 * Start monitoring alarms when a child is connected
 * Uses chrome.alarms for MV3-compliant persistent scheduling
 */
async function startMonitoringAlarms(intervalMinutes: number): Promise<void> {
  // Clear any existing alarms first
  await chrome.alarms.clear(ALARM_SCREENSHOT_CAPTURE)
  await chrome.alarms.clear(ALARM_SYNC_QUEUE)

  // Create screenshot capture alarm
  // Note: MV3 minimum interval is 1 minute for repeating alarms
  await chrome.alarms.create(ALARM_SCREENSHOT_CAPTURE, {
    delayInMinutes: 1, // First capture after 1 minute
    periodInMinutes: Math.max(1, intervalMinutes),
  })
  console.log(`[Fledgely] Screenshot alarm created with ${intervalMinutes}min interval`)

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
}

/**
 * Add a screenshot to the upload queue
 * Queue persists in chrome.storage.local for offline support
 */
async function queueScreenshot(capture: ScreenshotCapture, childId: string): Promise<void> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')

  const item: QueuedScreenshot = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    capture,
    childId,
    queuedAt: Date.now(),
  }

  // Add to queue
  screenshotQueue.push(item)

  // Enforce queue size limit (drop oldest items)
  if (screenshotQueue.length > MAX_QUEUE_SIZE) {
    const dropped = screenshotQueue.length - MAX_QUEUE_SIZE
    screenshotQueue.splice(0, dropped)
    console.warn(`[Fledgely] Queue overflow: dropped ${dropped} oldest screenshots`)
  }

  await chrome.storage.local.set({ screenshotQueue })
  console.log(`[Fledgely] Screenshot queued (${screenshotQueue.length} items in queue)`)
}

/**
 * Get the current queue size
 */
async function getQueueSize(): Promise<number> {
  const { screenshotQueue = [] } = await chrome.storage.local.get('screenshotQueue')
  return screenshotQueue.length
}

/**
 * Handle screenshot capture triggered by alarm
 */
async function handleScreenshotCapture(state: ExtensionState): Promise<void> {
  if (!state.childId) {
    console.log('[Fledgely] No child connected, skipping capture')
    return
  }

  const result = await captureScreenshot({ quality: 80 })

  if (result.success) {
    // Queue the screenshot for upload (Story 10.4 will implement actual upload)
    await queueScreenshot(result.capture, state.childId)

    // Update lastSync to show activity
    await updateLastSync()
  } else if (result.skipped) {
    // Non-capturable URL (chrome://, etc.) - this is expected, not an error
    console.log(`[Fledgely] Capture skipped: ${result.error}`)
  } else {
    // Actual error occurred
    console.error(`[Fledgely] Capture failed: ${result.error}`)
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

// Initialize extension state on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Fledgely] Extension installed:', details.reason)

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
  const { state } = await chrome.storage.local.get('state')

  // Update toolbar with current state
  await updateActionTitle(state || DEFAULT_STATE)

  if (state?.isAuthenticated && state?.monitoringEnabled && state?.childId) {
    // Resume monitoring alarms if they were active
    console.log('[Fledgely] Resuming monitoring for child:', state.childId)
    await startMonitoringAlarms(state.captureIntervalMinutes || DEFAULT_CAPTURE_INTERVAL_MINUTES)
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
        await startMonitoringAlarms(newState.captureIntervalMinutes)

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

    default:
      sendResponse({ error: 'Unknown message type' })
  }
})

// Alarm handler for scheduled tasks (MV3 persistent scheduling)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('[Fledgely] Alarm fired:', alarm.name)

  // Check if monitoring is still enabled before processing
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
      // Sync queue processing will be implemented in Story 10.4
      // Update lastSync timestamp to show activity
      await updateLastSync()
      const queueSize = await getQueueSize()
      console.log(`[Fledgely] Sync queue alarm triggered, ${queueSize} items pending`)
      break
    }
  }
})

// Export for testing
export { ExtensionState, DEFAULT_STATE }
