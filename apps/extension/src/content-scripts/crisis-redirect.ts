/**
 * Crisis Redirect Content Script for Fledgely Chrome Extension
 *
 * This content script shows an optional interstitial when a child
 * searches for crisis-related terms (Story 7.6).
 *
 * CRITICAL PRIVACY RULES:
 * - Search query is NEVER stored or logged
 * - Interstitial display is NOT logged to parents
 * - Only category information is received (no search terms)
 *
 * DESIGN PRINCIPLES:
 * - Calming colors (purple/blue gradient)
 * - Non-alarming language
 * - Optional redirect (child can dismiss)
 * - 6th-grade reading level
 */

// Message types from background script
interface CrisisInterstitialMessage {
  type: 'SHOW_CRISIS_INTERSTITIAL'
  category: string
  resources: Array<{
    name: string
    domain: string
    phone?: string
    text?: string
    description: string
  }>
}

// State for preventing duplicate interstitials
let isInterstitialVisible = false
let interstitialDismissed = false

/**
 * Create the interstitial overlay element
 */
function createInterstitialElement(
  category: string,
  resources: CrisisInterstitialMessage['resources']
): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.id = 'fledgely-crisis-interstitial'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-labelledby', 'fledgely-crisis-title')
  overlay.setAttribute('aria-describedby', 'fledgely-crisis-description')

  // Build resource cards HTML
  const resourceCards = resources
    .map(
      (resource) => `
    <div class="fledgely-resource-card">
      <h3>${escapeHtml(resource.name)}</h3>
      <p class="fledgely-resource-desc">${escapeHtml(resource.description)}</p>
      <div class="fledgely-contact-methods">
        ${resource.phone ? `<a href="tel:${escapeHtml(resource.phone)}" class="fledgely-contact-btn fledgely-phone-btn">Call ${escapeHtml(resource.phone)}</a>` : ''}
        ${resource.text ? `<span class="fledgely-contact-info">${escapeHtml(resource.text)}</span>` : ''}
      </div>
      <a href="https://${escapeHtml(resource.domain)}"
         target="_blank"
         rel="noopener noreferrer"
         class="fledgely-visit-btn">
        Visit Website
      </a>
    </div>
  `
    )
    .join('')

  overlay.innerHTML = `
    <div class="fledgely-crisis-content">
      <div class="fledgely-crisis-header">
        <span class="fledgely-heart-icon">💙</span>
        <h1 id="fledgely-crisis-title">These resources can help</h1>
      </div>

      <p id="fledgely-crisis-description" class="fledgely-crisis-subtitle">
        You're not alone. Help is available 24/7, and your visit here is private.
      </p>

      <div class="fledgely-resources-container">
        ${resourceCards}
      </div>

      <div class="fledgely-actions">
        <button id="fledgely-continue-btn" class="fledgely-continue-btn">
          Continue to search results
        </button>
      </div>

      <p class="fledgely-privacy-note">
        <span class="fledgely-lock-icon">🔒</span>
        This page is private. Your parents will not see it.
      </p>
    </div>
  `

  return overlay
}

/**
 * Create and inject the CSS styles
 */
function createStyles(): HTMLStyleElement {
  const styles = document.createElement('style')
  styles.id = 'fledgely-crisis-styles'
  styles.textContent = `
    #fledgely-crisis-interstitial {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    }

    .fledgely-crisis-content {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 24px;
      padding: 40px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .fledgely-crisis-header {
      margin-bottom: 16px;
    }

    .fledgely-heart-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }

    #fledgely-crisis-title {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
      line-height: 1.3;
    }

    .fledgely-crisis-subtitle {
      font-size: 18px;
      color: #475569;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .fledgely-resources-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .fledgely-resource-card {
      background: #f8fafc;
      border-radius: 16px;
      padding: 20px;
      text-align: left;
      border: 1px solid #e2e8f0;
    }

    .fledgely-resource-card h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .fledgely-resource-desc {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 12px 0;
    }

    .fledgely-contact-methods {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }

    .fledgely-contact-btn {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: background-color 0.2s;
    }

    .fledgely-phone-btn {
      background: #22c55e;
      color: white;
    }

    .fledgely-phone-btn:hover {
      background: #16a34a;
    }

    .fledgely-contact-info {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background: #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #475569;
    }

    .fledgely-visit-btn {
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      background: #8b5cf6;
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      transition: background-color 0.2s;
    }

    .fledgely-visit-btn:hover {
      background: #7c3aed;
    }

    .fledgely-actions {
      margin-bottom: 16px;
    }

    .fledgely-continue-btn {
      background: transparent;
      border: 2px solid #94a3b8;
      color: #64748b;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      min-width: 44px;
      min-height: 44px;
    }

    .fledgely-continue-btn:hover {
      border-color: #64748b;
      color: #475569;
      background: #f1f5f9;
    }

    .fledgely-continue-btn:focus {
      outline: 2px solid #8b5cf6;
      outline-offset: 2px;
    }

    .fledgely-privacy-note {
      font-size: 14px;
      color: #22c55e;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .fledgely-lock-icon {
      font-size: 16px;
    }

    @media (max-width: 480px) {
      .fledgely-crisis-content {
        padding: 24px;
      }

      #fledgely-crisis-title {
        font-size: 24px;
      }

      .fledgely-crisis-subtitle {
        font-size: 16px;
      }

      .fledgely-resource-card {
        padding: 16px;
      }
    }
  `
  return styles
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Show the crisis interstitial overlay
 */
function showInterstitial(
  category: string,
  resources: CrisisInterstitialMessage['resources']
): void {
  // Don't show if already visible or previously dismissed
  if (isInterstitialVisible || interstitialDismissed) {
    return
  }

  isInterstitialVisible = true

  // Create and inject styles
  const styles = createStyles()
  document.head.appendChild(styles)

  // Create and inject overlay
  const overlay = createInterstitialElement(category, resources)
  document.body.appendChild(overlay)

  // Focus the continue button for accessibility
  const continueBtn = overlay.querySelector('#fledgely-continue-btn') as HTMLButtonElement
  if (continueBtn) {
    // Delay focus slightly to ensure element is in DOM
    setTimeout(() => continueBtn.focus(), 100)

    // Handle continue button click
    continueBtn.addEventListener('click', () => {
      dismissInterstitial(overlay, styles)
    })
  }

  // Handle keyboard escape
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      dismissInterstitial(overlay, styles)
      document.removeEventListener('keydown', handleKeydown)
    }
  }
  document.addEventListener('keydown', handleKeydown)

  // Prevent scrolling on body
  document.body.style.overflow = 'hidden'
}

/**
 * Dismiss the interstitial and restore normal page
 */
function dismissInterstitial(overlay: HTMLElement, styles: HTMLStyleElement): void {
  // Mark as dismissed to prevent re-showing
  interstitialDismissed = true
  isInterstitialVisible = false

  // Remove elements
  overlay.remove()
  styles.remove()

  // Restore scrolling
  document.body.style.overflow = ''
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener(
  (message: CrisisInterstitialMessage, _sender, sendResponse) => {
    if (message.type === 'SHOW_CRISIS_INTERSTITIAL') {
      showInterstitial(message.category, message.resources)
      sendResponse({ success: true })
    }
    return true // Keep message channel open for async response
  }
)

// Export for testing
export const _testExports = {
  createInterstitialElement,
  createStyles,
  escapeHtml,
  showInterstitial,
  dismissInterstitial,
  isInterstitialVisible: () => isInterstitialVisible,
  interstitialDismissed: () => interstitialDismissed,
  resetState: () => {
    isInterstitialVisible = false
    interstitialDismissed = false
  },
}
