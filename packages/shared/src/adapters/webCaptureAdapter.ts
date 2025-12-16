/**
 * Web Capture Adapter
 *
 * Story 7.8: Privacy Gaps Injection - Task 8.1
 *
 * Platform-specific adapter for web-based screenshot capture that integrates
 * privacy gap checking before each capture.
 *
 * This adapter provides:
 * - Pre-capture privacy gap check
 * - Crisis URL detection integration
 * - Zero-data-path compliance (no reason logging)
 *
 * NOTE: This is designed for web-based monitoring (Epic 11+).
 * The actual capture implementation will be platform-specific.
 */

import type { PrivacyGapDetector } from '../services/privacyGapDetector'

/**
 * Capture decision result
 *
 * CRITICAL: Only contains 'shouldCapture' - NO reason field.
 * This maintains zero-data-path compliance.
 */
export interface CaptureDecision {
  /**
   * Whether to proceed with capture
   */
  shouldCapture: boolean
}

/**
 * Web capture adapter configuration
 */
export interface WebCaptureAdapterConfig {
  /**
   * Privacy gap detector for checking suppression
   */
  privacyGapDetector: PrivacyGapDetector

  /**
   * Child ID for the monitored profile
   */
  childId: string
}

/**
 * Web capture adapter interface
 */
export interface WebCaptureAdapter {
  /**
   * Check if capture should proceed for the given URL
   *
   * @param url - Current page URL
   * @returns Capture decision with NO reason (zero-data-path)
   */
  shouldCapture(url: string): Promise<CaptureDecision>

  /**
   * Update the child ID for the adapter
   */
  setChildId(childId: string): void
}

/**
 * Create a web capture adapter
 *
 * This adapter wraps the privacy gap detector to provide a simple
 * capture decision interface for platform implementations.
 *
 * @example
 * ```typescript
 * // In monitoring code
 * import { createWebCaptureAdapter, createPrivacyGapDetector } from '@fledgely/shared'
 *
 * const detector = createPrivacyGapDetector({
 *   getSchedule: async (childId, date) => getScheduleFromStorage(childId, date),
 *   isCrisisUrl: (url) => checkCrisisUrl(url),
 *   privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
 * })
 *
 * const captureAdapter = createWebCaptureAdapter({
 *   privacyGapDetector: detector,
 *   childId: 'child-123',
 * })
 *
 * // Before each capture
 * const decision = await captureAdapter.shouldCapture(currentUrl)
 * if (decision.shouldCapture) {
 *   await takeScreenshot()
 * }
 * // If !shouldCapture, silently skip - NO logging of reason
 * ```
 */
export function createWebCaptureAdapter(
  config: WebCaptureAdapterConfig
): WebCaptureAdapter {
  let { childId } = config
  const { privacyGapDetector } = config

  return {
    async shouldCapture(url: string): Promise<CaptureDecision> {
      const timestamp = new Date()

      // Check privacy gap detector (includes crisis URL check)
      const result = await privacyGapDetector.shouldSuppressCapture(
        childId,
        timestamp,
        url
      )

      // Invert suppress to shouldCapture
      // CRITICAL: NO reason is passed through - zero-data-path compliance
      return {
        shouldCapture: !result.suppress,
      }
    },

    setChildId(newChildId: string): void {
      childId = newChildId
    },
  }
}

/**
 * Documentation for Platform Adapter Integration
 *
 * ## Chrome Extension Integration (Epic 11)
 *
 * See `chromeExtensionAdapter.ts` for allowlist sync adapter.
 *
 * For capture integration:
 *
 * ```typescript
 * // background.ts (service worker)
 * import { createWebCaptureAdapter, createPrivacyGapDetector } from '@fledgely/shared'
 *
 * // Initialize once
 * const captureAdapter = createWebCaptureAdapter({
 *   privacyGapDetector: createPrivacyGapDetector({
 *     getSchedule: async (childId, date) => {
 *       // Fetch from IndexedDB or chrome.storage
 *       const key = `gap-schedule-${childId}-${date.toISOString().slice(0, 10)}`
 *       const result = await chrome.storage.local.get(key)
 *       return result[key] || null
 *     },
 *     isCrisisUrl: (url) => isCrisisUrl(url), // From @fledgely/shared
 *     privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
 *   }),
 *   childId: currentChildId,
 * })
 *
 * // In capture interval handler
 * async function captureIfAllowed() {
 *   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
 *   if (!tab?.url) return
 *
 *   const decision = await captureAdapter.shouldCapture(tab.url)
 *
 *   if (decision.shouldCapture) {
 *     const screenshot = await chrome.tabs.captureVisibleTab()
 *     await uploadScreenshot(screenshot)
 *   }
 *   // CRITICAL: If !shouldCapture, do nothing - NO logging of why
 * }
 * ```
 *
 * ## Android Agent Integration (Epic 15)
 *
 * The Android agent will need a native adapter implementation, but can use
 * the same core logic from @fledgely/shared via a React Native bridge or
 * direct Kotlin/Java implementation.
 *
 * Key integration points:
 * 1. Implement `PrivacyGapDetectorConfig.getSchedule` using Room/SQLite
 * 2. Bundle crisis URL patterns in app assets
 * 3. Call `shouldSuppressCapture()` before each screenshot
 * 4. NEVER log suppression reason
 *
 * Example native bridge:
 *
 * ```kotlin
 * // PrivacyGapBridge.kt
 * @ReactModule(name = "PrivacyGapBridge")
 * class PrivacyGapBridge : ReactContextBaseJavaModule {
 *
 *     @ReactMethod
 *     fun shouldCapture(url: String, promise: Promise) {
 *         // Call shared library via JNI or JS bridge
 *         val decision = privacyGapDetector.shouldSuppressCapture(childId, Date(), url)
 *         promise.resolve(!decision.suppress)
 *     }
 * }
 * ```
 *
 * ## iOS Integration (Epic 43)
 *
 * iOS Screen Time integration requires Apple MDM approval and has limited
 * screenshot capabilities. The privacy gap logic still applies:
 *
 * 1. Content filter should check `isCrisisUrl()` before logging
 * 2. Privacy gaps should pause any activity logging
 * 3. Web content categories use the same crisis allowlist
 *
 * Implementation typically via:
 * - NetworkExtension for content filtering
 * - DeviceActivity for screen time monitoring
 * - FamilyControls for parental controls
 *
 * All implementations MUST:
 * - Check privacy gap schedule before logging any activity
 * - NEVER expose gap reason to user-facing interfaces
 * - Use zero-data-path for crisis URL detection
 */
export const PLATFORM_ADAPTER_DOCS = `
See JSDoc above for platform adapter integration documentation.
`
