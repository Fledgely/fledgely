/**
 * Family Offline Time Block Content Script for Fledgely Chrome Extension
 *
 * Story 32.3: Family Offline Time Enforcement
 *
 * This content script shows a family-friendly blocking overlay during
 * scheduled family offline time. Different from time-limit-block.ts:
 *
 * Key differences:
 * - Family-focused messaging: "It's family offline time!"
 * - Emphasis on togetherness, not limits
 * - Countdown to END of offline period (not remaining usage)
 * - No "request more time" - this is scheduled family time
 * - Green/calming colors (family bonding theme)
 *
 * DESIGN PRINCIPLES:
 * - Warm, welcoming, family-focused
 * - Suggests family activities
 * - Shows countdown to end
 * - Non-punitive language
 */

// Message types from background script
interface FamilyOfflineBlockMessage {
  type: 'SHOW_FAMILY_OFFLINE_BLOCK'
  minutesUntilEnd: number | null
  // Story 32.5: Exception info for overlay display
  exception?: {
    type: 'pause' | 'skip' | 'work' | 'homework'
    requestedByName?: string
  } | null
}

interface FamilyOfflineUnblockMessage {
  type: 'HIDE_FAMILY_OFFLINE_BLOCK'
}

// State
let isOverlayVisible = false
let countdownInterval: ReturnType<typeof setInterval> | null = null

/**
 * Get overlay content based on exception type
 * Story 32.5 AC4: Show exception status in blocking overlay
 */
function getOverlayContent(exception?: FamilyOfflineBlockMessage['exception']): {
  icon: string
  title: string
  message: string
  showActivities: boolean
  activitiesContent: string
  countdownLabel: string
  footerMessage: string
  bgGradient: string
} {
  // Default family offline content
  const defaultContent = {
    icon: '👨‍👩‍👧‍👦',
    title: "It's Family Offline Time!",
    message:
      'Time to connect with your family - screens off, together time on!<br>This is your special time to be present with each other.',
    showActivities: true,
    activitiesContent: `
      <h3>Family activity ideas:</h3>
      <ul>
        <li><span class="emoji">🎲</span> Play a board game together</li>
        <li><span class="emoji">🍽️</span> Help prepare or enjoy dinner</li>
        <li><span class="emoji">📖</span> Read stories together</li>
        <li><span class="emoji">🚶</span> Take a family walk</li>
        <li><span class="emoji">💬</span> Share stories from your day</li>
        <li><span class="emoji">🎨</span> Create something together</li>
      </ul>
    `,
    countdownLabel: 'Family time ends in',
    footerMessage: 'Quality time together makes families stronger',
    bgGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
  }

  if (!exception) {
    return defaultContent
  }

  // Story 32.5 AC4: Homework exception - education sites only
  if (exception.type === 'homework') {
    return {
      icon: '📚',
      title: 'Homework Mode Active',
      message:
        "You're in homework mode! This site isn't for schoolwork.<br>Try visiting an education website like Khan Academy or Wikipedia.",
      showActivities: true,
      activitiesContent: `
        <h3>Try these education sites:</h3>
        <ul>
          <li><span class="emoji">🎓</span> Khan Academy for lessons</li>
          <li><span class="emoji">📖</span> Wikipedia for research</li>
          <li><span class="emoji">📝</span> Google Docs for writing</li>
          <li><span class="emoji">🔢</span> Mathway for math help</li>
          <li><span class="emoji">🌍</span> Duolingo for languages</li>
        </ul>
      `,
      countdownLabel: 'Homework time ends in',
      footerMessage: 'Focus on your studies - you can do it! 📖',
      bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    }
  }

  // Story 32.5 AC3: Work exception - whitelisted work sites only
  if (exception.type === 'work') {
    const parentName = exception.requestedByName || 'A parent'
    return {
      icon: '💼',
      title: `${parentName} is Working`,
      message:
        "This site isn't on the work list during family offline time.<br>Non-work browsing is blocked right now.",
      showActivities: false,
      activitiesContent: '',
      countdownLabel: 'Work exception ends in',
      footerMessage: 'Work exception is active',
      bgGradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)',
    }
  }

  return defaultContent
}

/**
 * Create the family offline overlay element
 * Story 32.5: Now supports exception-specific messaging
 */
function createFamilyOfflineOverlay(
  minutesUntilEnd: number | null,
  exception?: FamilyOfflineBlockMessage['exception']
): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.id = 'fledgely-family-offline'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-labelledby', 'fledgely-family-title')

  const content = getOverlayContent(exception)

  overlay.innerHTML = `
    <style>
      #fledgely-family-offline {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: ${content.bgGradient} !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: white !important;
        text-align: center !important;
        animation: fledgely-family-fade-in 0.5s ease-out !important;
        overflow: auto !important;
      }

      @keyframes fledgely-family-fade-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }

      .fledgely-family-container {
        max-width: 520px !important;
        padding: 40px 24px !important;
      }

      .fledgely-family-icon {
        font-size: 72px !important;
        margin-bottom: 24px !important;
        animation: fledgely-family-bounce 2s ease-in-out infinite !important;
      }

      @keyframes fledgely-family-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      .fledgely-family-title {
        font-size: 36px !important;
        font-weight: 700 !important;
        margin-bottom: 16px !important;
        line-height: 1.2 !important;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      }

      .fledgely-family-message {
        font-size: 18px !important;
        opacity: 0.95 !important;
        margin-bottom: 32px !important;
        line-height: 1.6 !important;
      }

      .fledgely-family-activities {
        background: rgba(255, 255, 255, 0.15) !important;
        border-radius: 20px !important;
        padding: 28px !important;
        margin-bottom: 32px !important;
        backdrop-filter: blur(10px) !important;
      }

      .fledgely-family-activities h3 {
        font-size: 20px !important;
        font-weight: 600 !important;
        margin-bottom: 20px !important;
      }

      .fledgely-family-activities ul {
        list-style: none !important;
        padding: 0 !important;
        margin: 0 !important;
        text-align: left !important;
      }

      .fledgely-family-activities li {
        padding: 10px 0 !important;
        font-size: 17px !important;
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      }

      .fledgely-family-activities li:last-child {
        border-bottom: none !important;
      }

      .fledgely-family-activities li span.emoji {
        font-size: 24px !important;
        width: 32px !important;
        text-align: center !important;
      }

      .fledgely-family-countdown {
        background: rgba(255, 255, 255, 0.2) !important;
        border-radius: 16px !important;
        padding: 20px 32px !important;
        font-size: 18px !important;
        font-weight: 500 !important;
        display: inline-block !important;
      }

      .fledgely-family-countdown-time {
        font-size: 28px !important;
        font-weight: 700 !important;
        margin-left: 8px !important;
      }

      .fledgely-family-footer {
        margin-top: 32px !important;
        font-size: 14px !important;
        opacity: 0.7 !important;
      }

      .fledgely-family-heart {
        animation: fledgely-heart-pulse 1.5s ease-in-out infinite !important;
        display: inline-block !important;
      }

      @keyframes fledgely-heart-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
    </style>

    <div class="fledgely-family-container">
      <div class="fledgely-family-icon">${content.icon}</div>

      <h1 id="fledgely-family-title" class="fledgely-family-title">
        ${content.title}
      </h1>

      <p class="fledgely-family-message">
        ${content.message}
      </p>

      ${
        content.showActivities
          ? `<div class="fledgely-family-activities">${content.activitiesContent}</div>`
          : ''
      }

      <div class="fledgely-family-countdown" id="fledgely-countdown-container">
        ${content.countdownLabel}
        <span class="fledgely-family-countdown-time" id="fledgely-countdown-time">
          ${formatCountdown(minutesUntilEnd)}
        </span>
      </div>

      <p class="fledgely-family-footer">
        <span class="fledgely-family-heart">❤️</span>
        ${content.footerMessage}
        <span class="fledgely-family-heart">❤️</span>
      </p>
    </div>
  `

  return overlay
}

/**
 * Format countdown time for display
 */
function formatCountdown(minutesRemaining: number | null): string {
  if (minutesRemaining === null || minutesRemaining <= 0) {
    return 'soon'
  }

  if (minutesRemaining >= 60) {
    const hours = Math.floor(minutesRemaining / 60)
    const mins = minutesRemaining % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return `${minutesRemaining}m`
}

/**
 * Update countdown display
 */
function updateCountdown(): void {
  const countdownEl = document.getElementById('fledgely-countdown-time')
  if (!countdownEl) return

  // Request current state from background
  chrome.runtime.sendMessage({ type: 'GET_OFFLINE_STATE' }, (response) => {
    if (chrome.runtime.lastError) return

    if (response?.minutesUntilEnd !== undefined) {
      countdownEl.textContent = formatCountdown(response.minutesUntilEnd)
    }
  })
}

/**
 * Show the family offline overlay
 * Story 32.5: Now accepts exception info for appropriate messaging
 */
function showFamilyOfflineOverlay(
  minutesUntilEnd: number | null,
  exception?: FamilyOfflineBlockMessage['exception']
): void {
  if (isOverlayVisible) return

  // Remove any existing overlay
  const existing = document.getElementById('fledgely-family-offline')
  if (existing) {
    existing.remove()
  }

  const overlay = createFamilyOfflineOverlay(minutesUntilEnd, exception)
  document.body.appendChild(overlay)
  isOverlayVisible = true

  // Start countdown update interval
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
  countdownInterval = setInterval(updateCountdown, 60000) // Every minute

  console.log('[Fledgely] Family offline overlay shown', exception ? `(${exception.type})` : '')
}

/**
 * Hide the family offline overlay
 */
function hideFamilyOfflineOverlay(): void {
  const overlay = document.getElementById('fledgely-family-offline')
  if (overlay) {
    overlay.remove()
    isOverlayVisible = false

    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    console.log('[Fledgely] Family offline overlay hidden')
  }
}

/**
 * Check with background script if we should be blocking
 */
async function checkOfflineBlockingState(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_OFFLINE_STATE' })

    if (response?.isBlocked) {
      showFamilyOfflineOverlay(response.minutesUntilEnd)
    } else {
      hideFamilyOfflineOverlay()
    }
  } catch (error) {
    console.log('[Fledgely] Could not check offline blocking state:', error)
  }
}

/**
 * Listen for messages from background script
 * Story 32.5: Now handles exception info for appropriate messaging
 */
chrome.runtime.onMessage.addListener(
  (message: FamilyOfflineBlockMessage | FamilyOfflineUnblockMessage, _sender, sendResponse) => {
    if (message.type === 'SHOW_FAMILY_OFFLINE_BLOCK') {
      const blockMessage = message as FamilyOfflineBlockMessage
      showFamilyOfflineOverlay(blockMessage.minutesUntilEnd, blockMessage.exception)
      sendResponse({ success: true })
    } else if (message.type === 'HIDE_FAMILY_OFFLINE_BLOCK') {
      hideFamilyOfflineOverlay()
      sendResponse({ success: true })
    }
    return true
  }
)

// Check blocking state when script loads
checkOfflineBlockingState()

// Periodically check blocking state
setInterval(checkOfflineBlockingState, 60000) // Every minute
