/**
 * Time Limit Block Content Script for Fledgely Chrome Extension
 *
 * Story 31.4: Chromebook Time Limit Enforcement
 *
 * This content script shows a blocking overlay when the child's
 * screen time limit has been reached.
 *
 * DESIGN PRINCIPLES:
 * - Non-alarming, calming colors
 * - Friendly message: "Screen time is up! Take a break."
 * - Suggests break activities
 * - Provides path to request more time
 */

// Message types from background script
interface TimeLimitBlockMessage {
  type: 'SHOW_TIME_LIMIT_BLOCK'
  accommodations?: {
    calmingColorsEnabled: boolean
    gradualTransitionEnabled: boolean
  }
}

interface TimeLimitUnblockMessage {
  type: 'HIDE_TIME_LIMIT_BLOCK'
}

// State for blocking overlay
let isBlockingVisible = false

/**
 * Create the blocking overlay element
 */
function createBlockingOverlay(useCalmingColors = true): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.id = 'fledgely-time-limit-block'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-labelledby', 'fledgely-block-title')

  // Choose colors based on accommodation settings
  const bgGradient = useCalmingColors
    ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #a78bfa 100%)' // Calming blue-purple
    : 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)' // Alert orange-red

  overlay.innerHTML = `
    <style>
      #fledgely-time-limit-block {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: ${bgGradient} !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
        text-align: center !important;
        animation: fledgely-fade-in 0.3s ease-out !important;
      }

      @keyframes fledgely-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .fledgely-block-container {
        max-width: 480px !important;
        padding: 40px !important;
      }

      .fledgely-block-icon {
        font-size: 64px !important;
        margin-bottom: 24px !important;
      }

      .fledgely-block-title {
        font-size: 32px !important;
        font-weight: 600 !important;
        margin-bottom: 16px !important;
        line-height: 1.3 !important;
      }

      .fledgely-block-message {
        font-size: 18px !important;
        opacity: 0.9 !important;
        margin-bottom: 32px !important;
        line-height: 1.6 !important;
      }

      .fledgely-break-ideas {
        background: rgba(255, 255, 255, 0.15) !important;
        border-radius: 16px !important;
        padding: 24px !important;
        margin-bottom: 32px !important;
      }

      .fledgely-break-ideas h3 {
        font-size: 18px !important;
        font-weight: 600 !important;
        margin-bottom: 16px !important;
      }

      .fledgely-break-ideas ul {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
        text-align: left !important;
      }

      .fledgely-break-ideas li {
        padding: 8px 0 !important;
        font-size: 16px !important;
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .fledgely-break-ideas li::before {
        content: '' !important;
        display: none !important;
      }

      .fledgely-request-btn {
        background: rgba(255, 255, 255, 0.2) !important;
        border: 2px solid rgba(255, 255, 255, 0.5) !important;
        color: white !important;
        padding: 16px 32px !important;
        font-size: 16px !important;
        font-weight: 600 !important;
        border-radius: 12px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }

      .fledgely-request-btn:hover {
        background: rgba(255, 255, 255, 0.3) !important;
        border-color: rgba(255, 255, 255, 0.8) !important;
        transform: translateY(-2px) !important;
      }

      .fledgely-request-btn:active {
        transform: translateY(0) !important;
      }

      .fledgely-footer {
        margin-top: 24px !important;
        font-size: 14px !important;
        opacity: 0.7 !important;
      }

      /* Story 31.6: Reason selection styles */
      .fledgely-reason-picker {
        display: none;
        background: rgba(255, 255, 255, 0.15) !important;
        border-radius: 16px !important;
        padding: 24px !important;
        margin-bottom: 24px !important;
      }

      .fledgely-reason-picker.visible {
        display: block !important;
      }

      .fledgely-reason-picker h3 {
        font-size: 18px !important;
        font-weight: 600 !important;
        margin-bottom: 16px !important;
      }

      .fledgely-reason-option {
        display: block !important;
        width: 100% !important;
        background: rgba(255, 255, 255, 0.2) !important;
        border: 2px solid rgba(255, 255, 255, 0.3) !important;
        color: white !important;
        padding: 12px 16px !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        margin-bottom: 8px !important;
        text-align: left !important;
        transition: all 0.2s ease !important;
      }

      .fledgely-reason-option:hover {
        background: rgba(255, 255, 255, 0.3) !important;
        border-color: rgba(255, 255, 255, 0.6) !important;
      }

      .fledgely-reason-option:last-child {
        margin-bottom: 0 !important;
      }

      .fledgely-reason-cancel {
        margin-top: 12px !important;
        background: transparent !important;
        border: none !important;
        color: rgba(255, 255, 255, 0.7) !important;
        font-size: 14px !important;
        cursor: pointer !important;
        text-decoration: underline !important;
      }
    </style>

    <div class="fledgely-block-container">
      <div class="fledgely-block-icon">⏰</div>

      <h1 id="fledgely-block-title" class="fledgely-block-title">
        Screen time is up!
      </h1>

      <p class="fledgely-block-message">
        Time to take a break. You've been doing great!<br>
        Come back tomorrow for more screen time.
      </p>

      <div class="fledgely-break-ideas">
        <h3>Break ideas:</h3>
        <ul>
          <li>🚶 Take a walk or stretch</li>
          <li>📚 Read a book</li>
          <li>🎨 Draw or create something</li>
          <li>🎮 Play a board game</li>
          <li>💬 Chat with family</li>
        </ul>
      </div>

      <button class="fledgely-request-btn" id="fledgely-request-time-btn">
        Request more time
      </button>

      <!-- Story 31.6: Reason picker (hidden by default) -->
      <div class="fledgely-reason-picker" id="fledgely-reason-picker">
        <h3>Why do you need more time?</h3>
        <button class="fledgely-reason-option" data-reason="finishing_homework">
          📚 Finishing homework
        </button>
        <button class="fledgely-reason-option" data-reason="five_more_minutes">
          ⏱️ Just 5 more minutes
        </button>
        <button class="fledgely-reason-option" data-reason="important_project">
          🎯 Important project
        </button>
        <button class="fledgely-reason-cancel" id="fledgely-reason-cancel">
          Cancel
        </button>
      </div>

      <p class="fledgely-footer">
        Need help? Ask a parent to adjust your time limits.
      </p>
    </div>
  `

  return overlay
}

/**
 * Show the blocking overlay
 */
function showBlockingOverlay(useCalmingColors = true): void {
  if (isBlockingVisible) return

  // Remove any existing overlay first
  const existing = document.getElementById('fledgely-time-limit-block')
  if (existing) {
    existing.remove()
  }

  const overlay = createBlockingOverlay(useCalmingColors)
  document.body.appendChild(overlay)
  isBlockingVisible = true

  // Add click handler for request button
  const requestBtn = document.getElementById('fledgely-request-time-btn')
  if (requestBtn) {
    requestBtn.addEventListener('click', handleRequestMoreTime)
  }

  // Story 31.6: Add click handlers for reason options
  const reasonOptions = overlay.querySelectorAll('.fledgely-reason-option')
  reasonOptions.forEach((option) => {
    option.addEventListener('click', (e) => {
      const reason = (e.target as HTMLElement).getAttribute('data-reason')
      if (reason) {
        handleReasonSelected(reason)
      }
    })
  })

  // Add cancel button handler
  const cancelBtn = document.getElementById('fledgely-reason-cancel')
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideReasonPicker)
  }

  console.log('[Fledgely] Time limit blocking overlay shown')
}

/**
 * Hide the blocking overlay
 */
function hideBlockingOverlay(): void {
  const overlay = document.getElementById('fledgely-time-limit-block')
  if (overlay) {
    overlay.remove()
    isBlockingVisible = false
    console.log('[Fledgely] Time limit blocking overlay hidden')
  }
}

/**
 * Handle "Request more time" button click
 * Story 31.6: Shows reason picker instead of sending immediately
 */
function handleRequestMoreTime(): void {
  showReasonPicker()
}

/**
 * Show the reason picker UI
 * Story 31.6 AC2
 */
function showReasonPicker(): void {
  const picker = document.getElementById('fledgely-reason-picker')
  const requestBtn = document.getElementById('fledgely-request-time-btn')
  const breakIdeas = document.querySelector('.fledgely-break-ideas') as HTMLElement

  if (picker) {
    picker.classList.add('visible')
  }
  if (requestBtn) {
    requestBtn.style.display = 'none'
  }
  if (breakIdeas) {
    breakIdeas.style.display = 'none'
  }
}

/**
 * Hide the reason picker UI
 */
function hideReasonPicker(): void {
  const picker = document.getElementById('fledgely-reason-picker')
  const requestBtn = document.getElementById('fledgely-request-time-btn')
  const breakIdeas = document.querySelector('.fledgely-break-ideas') as HTMLElement

  if (picker) {
    picker.classList.remove('visible')
  }
  if (requestBtn) {
    requestBtn.style.display = ''
  }
  if (breakIdeas) {
    breakIdeas.style.display = ''
  }
}

/**
 * Handle reason selection and send request
 * Story 31.6 AC1, AC2
 */
function handleReasonSelected(reason: string): void {
  hideReasonPicker()

  // Send message to background script with the selected reason
  chrome.runtime.sendMessage(
    {
      type: 'REQUEST_TIME_EXTENSION',
      reason,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Fledgely] Failed to send time extension request:', chrome.runtime.lastError)
        showRequestMessage('Unable to send request. Please ask a parent to help.')
        return
      }

      if (response?.success) {
        showRequestMessage('Request sent! Waiting for parent approval...')
        // Start polling for response
        if (response.requestId) {
          pollForResponse(response.requestId)
        }
      } else if (response?.error === 'limit_reached') {
        showRequestMessage("You've already used your daily requests. Try again tomorrow!")
      } else if (response?.error) {
        showRequestMessage(response.message || 'Unable to send request.')
      } else {
        showRequestMessage('Request sent to parent.')
      }
    }
  )
}

/**
 * Poll for parent response to extension request
 * Story 31.6 AC4, AC5, AC7
 */
function pollForResponse(requestId: string): void {
  let pollCount = 0
  const maxPolls = 60 // 10 minutes at 10 second intervals
  const pollInterval = 10000 // 10 seconds

  const poll = (): void => {
    pollCount++

    chrome.runtime.sendMessage(
      {
        type: 'CHECK_TIME_EXTENSION_STATUS',
        requestId,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log('[Fledgely] Polling stopped due to error')
          return
        }

        if (response?.status === 'approved') {
          // AC4: Time was added, hide the overlay
          showRequestMessage('More time approved!')
          setTimeout(() => {
            hideBlockingOverlay()
          }, 2000)
        } else if (response?.status === 'denied') {
          // AC5: Parent denied the request
          showRequestMessage('Your parent said not right now.')
        } else if (response?.status === 'expired') {
          // AC7: Request timed out
          showRequestMessage('Request timed out. Try again later.')
        } else if (response?.status === 'pending' && pollCount < maxPolls) {
          // Still pending, continue polling
          setTimeout(poll, pollInterval)
        }
      }
    )
  }

  // Start polling after a short delay
  setTimeout(poll, pollInterval)
}

/**
 * Show a temporary message on the blocking overlay
 */
function showRequestMessage(message: string): void {
  const btn = document.getElementById('fledgely-request-time-btn')
  if (btn) {
    const originalText = btn.textContent
    btn.textContent = message
    btn.setAttribute('disabled', 'true')

    setTimeout(() => {
      btn.textContent = originalText
      btn.removeAttribute('disabled')
    }, 5000)
  }
}

/**
 * Check with background script if we should be blocking
 */
async function checkBlockingState(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_TIME_LIMIT_STATE' })

    if (response?.isBlocked) {
      const useCalmingColors = response.accommodations?.calmingColorsEnabled ?? true
      showBlockingOverlay(useCalmingColors)
    } else {
      hideBlockingOverlay()
    }
  } catch (error) {
    // Extension context invalidated, ignore
    console.log('[Fledgely] Could not check blocking state:', error)
  }
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener(
  (message: TimeLimitBlockMessage | TimeLimitUnblockMessage, _sender, sendResponse) => {
    if (message.type === 'SHOW_TIME_LIMIT_BLOCK') {
      const useCalmingColors = message.accommodations?.calmingColorsEnabled ?? true
      showBlockingOverlay(useCalmingColors)
      sendResponse({ success: true })
    } else if (message.type === 'HIDE_TIME_LIMIT_BLOCK') {
      hideBlockingOverlay()
      sendResponse({ success: true })
    }
    return true
  }
)

// Check blocking state when script loads
checkBlockingState()

// Periodically check blocking state (in case of race conditions)
setInterval(checkBlockingState, 60000) // Every minute
