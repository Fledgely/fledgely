/**
 * Safety Signal Content Script - Story 7.5.1 Task 6
 *
 * Detects hidden safety gestures in the Chrome extension.
 *
 * AC1: Hidden gesture/code available (Ctrl+Shift+H keyboard shortcut)
 * AC4: Cannot be accidentally triggered
 * AC5: Consistent across platforms
 *
 * CRITICAL SAFETY: This script NEVER provides visible feedback.
 * All detection is silent to protect the child.
 */

/**
 * Constants matching packages/shared/src/contracts/safetySignal.ts
 */
const KEYBOARD_SHORTCUT_KEY = 'h'

/**
 * Debounce period to prevent double-triggering (5 seconds)
 */
const DEBOUNCE_MS = 5000

/**
 * Track last trigger time for debouncing
 */
let lastTriggerTime = 0

/**
 * Reset state for testing
 */
function resetSafetySignalState(): void {
  lastTriggerTime = 0
}

/**
 * Check if we're within debounce period
 */
function isDebouncing(): boolean {
  return Date.now() - lastTriggerTime < DEBOUNCE_MS
}

/**
 * Send safety signal message to background script
 * CRITICAL: No visible feedback, all errors silently caught
 */
function sendSafetySignalMessage(): void {
  if (isDebouncing()) {
    return
  }

  lastTriggerTime = Date.now()

  try {
    // Send message to background script
    chrome.runtime.sendMessage(
      {
        type: 'SAFETY_SIGNAL_TRIGGERED',
        triggerMethod: 'keyboard_shortcut',
        platform: 'chrome_extension',
        timestamp: Date.now(),
        url: window.location.href,
      },
      // Callback to handle response silently
      (_response) => {
        // Silently ignore response - no UI feedback
        if (chrome.runtime.lastError) {
          // Silently log error - never show to user
          console.debug(
            '[Fledgely] Safety signal message failed (silent)',
            chrome.runtime.lastError
          )
        }
      }
    )
  } catch (error) {
    // CRITICAL: Silently catch all errors - never show to user
    console.debug('[Fledgely] Safety signal error (silent)', error)
  }
}

/**
 * Handle keydown events - detect Ctrl+Shift+H
 */
function handleKeyDown(event: KeyboardEvent): void {
  // Check for Ctrl+Shift+H (case insensitive)
  if (
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.key.toLowerCase() === KEYBOARD_SHORTCUT_KEY
  ) {
    // Prevent default action (but don't call stopPropagation to avoid detection)
    event.preventDefault()

    // Send signal
    sendSafetySignalMessage()
  }
}

/**
 * Initialize safety signal detection
 */
function initSafetySignalDetection(): void {
  // Add keyboard listener
  document.addEventListener('keydown', handleKeyDown, {
    capture: true, // Capture phase to detect before page handlers
    passive: false, // Need to prevent default
  })

  // Listen for messages from background script (e.g., for cleanup)
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SAFETY_SIGNAL_STATUS') {
      // Respond with status (for debugging/testing only)
      sendResponse({ active: true })
      return true
    }
    return false
  })
}

// Initialize when content script loads (skip if in test environment)
// The typeof check ensures we don't initialize during vitest imports
if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
  initSafetySignalDetection()
}

// Export for testing
export {
  handleKeyDown,
  sendSafetySignalMessage,
  isDebouncing,
  resetSafetySignalState,
  KEYBOARD_SHORTCUT_KEY,
  DEBOUNCE_MS,
  initSafetySignalDetection,
}
