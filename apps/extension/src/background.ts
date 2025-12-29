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
 */

// Extension state stored in chrome.storage.local
interface ExtensionState {
  isAuthenticated: boolean
  userId: string | null
  familyId: string | null
  childId: string | null
  lastSync: number | null
  monitoringEnabled: boolean
}

const DEFAULT_STATE: ExtensionState = {
  isAuthenticated: false,
  userId: null,
  familyId: null,
  childId: null,
  lastSync: null,
  monitoringEnabled: false,
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

  if (state?.isAuthenticated && state?.monitoringEnabled) {
    // Resume monitoring if it was active
    console.log('[Fledgely] Resuming monitoring for child:', state.childId)
    // Monitoring setup will be implemented in Story 10.1
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

    default:
      sendResponse({ error: 'Unknown message type' })
  }
})

// Alarm handler for scheduled tasks (MV3 persistent scheduling)
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('[Fledgely] Alarm fired:', alarm.name)

  switch (alarm.name) {
    case 'screenshot-capture':
      // Will be implemented in Story 10.1
      console.log('[Fledgely] Screenshot capture alarm - not yet implemented')
      break

    case 'sync-queue':
      // Will be implemented in Story 10.4
      console.log('[Fledgely] Sync queue alarm - not yet implemented')
      break
  }
})

// Export for testing
export { ExtensionState, DEFAULT_STATE }
