/**
 * Web Platform Test Adapter
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 6.1
 *
 * Test adapter for the web platform using the actual shared library functions.
 */

import type { AllowlistTestHarnessConfig } from '../allowlistTestHarness'
import {
  getCrisisAllowlist,
  isCrisisUrl,
  isCrisisUrlFuzzy,
} from '../../constants/crisis-urls'
import {
  createPrivacyGapDetector,
  createInMemoryScheduleStore,
} from '../../services/privacyGapDetector'
import { createWebCaptureAdapter } from '../../adapters/webCaptureAdapter'
import { DEFAULT_PRIVACY_GAP_CONFIG } from '@fledgely/contracts'

/**
 * Create a test adapter for the web platform
 *
 * This adapter uses the actual @fledgely/shared functions,
 * making it suitable for integration testing.
 *
 * @returns Configuration for the test harness
 */
export function createWebTestAdapter(): AllowlistTestHarnessConfig {
  // Create schedule store for detector
  const scheduleStore = createInMemoryScheduleStore()

  // Create privacy gap detector with real crisis URL function
  const detector = createPrivacyGapDetector({
    getSchedule: scheduleStore.get,
    isCrisisUrl: (url) => isCrisisUrl(url),
    privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
  })

  // Create capture adapter
  const captureAdapter = createWebCaptureAdapter({
    privacyGapDetector: detector,
    childId: 'test-child-web',
  })

  return {
    platform: 'web',
    getAllowlist: getCrisisAllowlist,
    isCrisisUrl,
    isCrisisUrlFuzzy,
    shouldSuppressCapture: (childId, timestamp, url) =>
      detector.shouldSuppressCapture(childId, timestamp, url),
    captureAdapter,
    getBundledAllowlist: getCrisisAllowlist,
    // Web platform uses in-memory or localStorage cache
    getCachedAllowlist: async () => {
      // In a real implementation, this would check localStorage
      // For testing, we return null to simulate no cache
      return null
    },
  }
}
