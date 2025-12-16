/**
 * Chrome Extension Test Adapter (Mock)
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 6.2
 *
 * Mock test adapter for Chrome extension platform.
 * This will be fully implemented in Epic 11 (Chromebook Extension).
 *
 * For now, it provides a mock implementation that uses the shared
 * library functions, allowing tests to be written before the
 * actual Chrome extension is implemented.
 */

import type { AllowlistTestHarnessConfig } from '../allowlistTestHarness'
import {
  getCrisisAllowlist,
  isCrisisUrl,
  isCrisisUrlFuzzy,
} from '../../constants/crisis-urls'

/**
 * Create a mock test adapter for Chrome extension platform
 *
 * This adapter simulates Chrome extension behavior using shared library functions.
 * The actual implementation will use chrome.storage.local for caching.
 *
 * @returns Configuration for the test harness
 *
 * @example Chrome Extension Integration (Epic 11)
 * ```typescript
 * // In actual Chrome extension test file
 * import { createChromeTestAdapter } from '@fledgely/shared/testing'
 *
 * const config = createChromeTestAdapter()
 * const harness = createAllowlistTestHarness({
 *   ...config,
 *   // Override with actual chrome.storage implementation
 *   getCachedAllowlist: async () => {
 *     const result = await chrome.storage.local.get('crisis_allowlist')
 *     return result.crisis_allowlist || null
 *   },
 * })
 *
 * const results = await harness.runAllTests()
 * ```
 */
export function createChromeTestAdapter(): AllowlistTestHarnessConfig {
  return {
    platform: 'chrome-extension',
    getAllowlist: getCrisisAllowlist,
    isCrisisUrl,
    isCrisisUrlFuzzy,
    getBundledAllowlist: getCrisisAllowlist,
    // Mock chrome.storage.local cache
    getCachedAllowlist: async () => {
      // In actual implementation:
      // const result = await chrome.storage.local.get('crisis_allowlist')
      // return result.crisis_allowlist ? {
      //   allowlist: result.crisis_allowlist,
      //   cachedAt: result.cached_at,
      //   etag: result.etag,
      // } : null
      return null
    },
    // Chrome extension doesn't have direct capture - it's handled by content scripts
    // shouldSuppressCapture and captureAdapter would be implemented in Epic 11
  }
}

/**
 * Documentation for Chrome Extension Integration
 *
 * When implementing Epic 11 (Chromebook Extension), the test adapter
 * should be updated to:
 *
 * 1. Use chrome.storage.local for caching:
 *    ```typescript
 *    getCachedAllowlist: async () => {
 *      const result = await chrome.storage.local.get([
 *        'crisis_allowlist',
 *        'cached_at',
 *        'etag',
 *      ])
 *      if (!result.crisis_allowlist) return null
 *      return {
 *        allowlist: result.crisis_allowlist,
 *        cachedAt: result.cached_at,
 *        etag: result.etag,
 *      }
 *    }
 *    ```
 *
 * 2. Implement shouldSuppressCapture using service worker:
 *    ```typescript
 *    shouldSuppressCapture: async (childId, timestamp, url) => {
 *      // Send message to background script
 *      const result = await chrome.runtime.sendMessage({
 *        type: 'SHOULD_SUPPRESS_CAPTURE',
 *        childId,
 *        timestamp: timestamp.toISOString(),
 *        url,
 *      })
 *      return result
 *    }
 *    ```
 *
 * 3. Test with actual chrome.* API mocks:
 *    ```typescript
 *    // In test file
 *    vi.mock('chrome', () => ({
 *      storage: {
 *        local: {
 *          get: vi.fn(),
 *          set: vi.fn(),
 *        },
 *      },
 *      runtime: {
 *        sendMessage: vi.fn(),
 *      },
 *    }))
 *    ```
 */
export const CHROME_EXTENSION_INTEGRATION_DOCS = `
See JSDoc above for Chrome extension integration documentation.
`
