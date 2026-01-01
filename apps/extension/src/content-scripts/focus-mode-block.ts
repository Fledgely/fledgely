/**
 * Focus Mode Block Content Script - Story 33.1 (AC2)
 *
 * Shows a child-friendly blocking overlay when focus mode is active
 * and the current site is a distraction.
 */

// Check if block overlay already exists
if (!document.getElementById('fledgely-focus-block')) {
  // Create the overlay
  const overlay = document.createElement('div')
  overlay.id = 'fledgely-focus-block'
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: white;
    text-align: center;
    padding: 20px;
  `

  // Create content
  overlay.innerHTML = `
    <div style="max-width: 400px;">
      <div style="font-size: 64px; margin-bottom: 24px;">🎯</div>
      <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
        Focus Mode Active
      </h1>
      <p style="font-size: 18px; margin: 0 0 24px 0; opacity: 0.9; line-height: 1.5;">
        You're doing great! This site is blocked while you're focusing.
      </p>
      <div style="
        background: rgba(255, 255, 255, 0.15);
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 24px;
      ">
        <p style="font-size: 16px; margin: 0; opacity: 0.9;">
          ✨ Stay focused and you'll reach your goals!
        </p>
      </div>
      <button id="fledgely-go-back" style="
        background: white;
        color: #7c3aed;
        border: none;
        border-radius: 12px;
        padding: 16px 32px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      ">
        Go Back
      </button>
      <p style="font-size: 14px; margin-top: 20px; opacity: 0.7;">
        You can end focus mode from your dashboard when you're ready.
      </p>
    </div>
  `

  // Add to document
  document.body.appendChild(overlay)

  // Handle go back button
  const goBackBtn = document.getElementById('fledgely-go-back')
  if (goBackBtn) {
    goBackBtn.addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back()
      } else {
        window.close()
      }
    })

    goBackBtn.addEventListener('mouseenter', () => {
      goBackBtn.style.transform = 'scale(1.05)'
    })

    goBackBtn.addEventListener('mouseleave', () => {
      goBackBtn.style.transform = 'scale(1)'
    })
  }

  // Prevent page interaction
  document.body.style.overflow = 'hidden'
}

// Listen for clear message
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CLEAR_FOCUS_MODE_BLOCK') {
    const overlay = document.getElementById('fledgely-focus-block')
    if (overlay) {
      overlay.remove()
      document.body.style.overflow = ''
    }
  }
})
