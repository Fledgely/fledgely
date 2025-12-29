/**
 * Fledgely Chrome Extension - Screenshot Capture Module
 *
 * Handles screenshot capture using chrome.tabs.captureVisibleTab API.
 *
 * Story 10.1: Screenshot Capture Mechanism
 */

/**
 * Screenshot capture result with metadata
 */
export interface ScreenshotCapture {
  /** Base64 data URL of the captured image */
  dataUrl: string
  /** Timestamp when capture was taken */
  timestamp: number
  /** URL of the captured tab */
  url: string
  /** Title of the captured tab */
  title: string
  /** Time taken to capture in milliseconds */
  captureTimeMs: number
}

/**
 * Screenshot capture options
 */
export interface CaptureOptions {
  /** JPEG quality (1-100), default 80 */
  quality?: number
}

/**
 * Result of a capture attempt
 */
export type CaptureResult =
  | { success: true; capture: ScreenshotCapture }
  | { success: false; error: string; skipped?: boolean }

/**
 * URL schemes that cannot be captured
 * These are Chrome-restricted or internal pages
 */
const NON_CAPTURABLE_SCHEMES = [
  'chrome://',
  'chrome-extension://',
  'devtools://',
  'view-source://',
  'file://',
  'about:',
  'data:',
  'javascript:',
  'edge://',
  'brave://',
]

/**
 * Check if a URL can be captured
 */
function isCapturableUrl(url: string | undefined): boolean {
  if (!url) return false
  const urlLower = url.toLowerCase()
  return !NON_CAPTURABLE_SCHEMES.some((scheme) => urlLower.startsWith(scheme))
}

/**
 * Capture a screenshot of the currently visible tab
 *
 * @param options - Capture options (quality, etc.)
 * @returns Promise with capture result (success with data, or failure with error)
 */
export async function captureScreenshot(options: CaptureOptions = {}): Promise<CaptureResult> {
  const quality = options.quality ?? 80
  const startTime = performance.now()

  try {
    // Get the currently focused window
    const [currentWindow] = await chrome.windows.getAll({ windowTypes: ['normal'] })
    if (!currentWindow?.id) {
      return { success: false, error: 'No active window found' }
    }

    // Get the active tab in the focused window
    const [activeTab] = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id,
    })

    if (!activeTab) {
      return { success: false, error: 'No active tab found' }
    }

    // Check if the URL is capturable
    if (!isCapturableUrl(activeTab.url)) {
      const scheme = activeTab.url?.split(':')[0] || 'unknown'
      console.log(`[Fledgely] Skipping capture for non-capturable URL scheme: ${scheme}://`)
      return {
        success: false,
        error: `Non-capturable URL scheme: ${scheme}://`,
        skipped: true,
      }
    }

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(currentWindow.id, {
      format: 'jpeg',
      quality,
    })

    const captureTimeMs = performance.now() - startTime

    // Create capture result with metadata
    const capture: ScreenshotCapture = {
      dataUrl,
      timestamp: Date.now(),
      url: activeTab.url || '',
      title: activeTab.title || '',
      captureTimeMs,
    }

    console.log(
      `[Fledgely] Screenshot captured in ${captureTimeMs.toFixed(0)}ms ` +
        `(${Math.round(dataUrl.length / 1024)}KB)`
    )

    // Performance check - log warning if capture exceeds 500ms (NFR2)
    if (captureTimeMs > 500) {
      console.warn(`[Fledgely] Capture exceeded 500ms target: ${captureTimeMs.toFixed(0)}ms`)
    }

    return { success: true, capture }
  } catch (error) {
    const captureTimeMs = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown capture error'

    console.error(`[Fledgely] Screenshot capture failed (${captureTimeMs.toFixed(0)}ms):`, error)

    return { success: false, error: errorMessage }
  }
}

/**
 * Check if capture is currently possible
 * (Used for pre-flight checks)
 */
export async function canCapture(): Promise<boolean> {
  try {
    const [currentWindow] = await chrome.windows.getAll({ windowTypes: ['normal'] })
    if (!currentWindow?.id) return false

    const [activeTab] = await chrome.tabs.query({
      active: true,
      windowId: currentWindow.id,
    })

    return activeTab ? isCapturableUrl(activeTab.url) : false
  } catch {
    return false
  }
}
