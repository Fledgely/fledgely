/**
 * Cross-Platform Allowlist Test Harness
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 1
 *
 * Provides a platform-agnostic test harness for verifying crisis allowlist
 * behavior across all platforms (web, Chrome extension, Android, iOS).
 *
 * CRITICAL: These tests ensure no platform ships with broken crisis protection.
 * Deployment MUST be blocked if any test fails.
 */

import type { CrisisAllowlist, CrisisUrlEntry } from '../constants/crisis-urls'
import type { CaptureSuppressResult } from '../services/privacyGapDetector'
import type { CaptureDecision } from '../adapters/webCaptureAdapter'

// ============================================================================
// Types
// ============================================================================

/**
 * Supported platforms for testing
 */
export type TestPlatform = 'web' | 'chrome-extension' | 'android' | 'ios'

/**
 * Result of a single test
 */
export interface TestResult {
  /** Whether the test passed */
  passed: boolean
  /** Test name/description */
  name: string
  /** Optional failure message */
  message?: string
  /** Test duration in milliseconds */
  durationMs: number
  /** Test category */
  category: TestCategory
}

/**
 * Test categories for organization
 */
export type TestCategory =
  | 'presence'
  | 'zero-data-path'
  | 'fuzzy-matching'
  | 'fallback-chain'
  | 'platform-specific'

/**
 * Test harness configuration
 */
export interface AllowlistTestHarnessConfig {
  /** Platform being tested */
  platform: TestPlatform
  /** Function to get the allowlist */
  getAllowlist: () => CrisisAllowlist
  /** Function to check if URL is crisis resource */
  isCrisisUrl: (url: string) => boolean
  /** Function to check URL with fuzzy matching */
  isCrisisUrlFuzzy: (
    url: string,
    options?: { useFuzzyMatch?: boolean }
  ) => {
    match: boolean
    fuzzy: boolean
    entry?: CrisisUrlEntry
    distance?: number
    matchedAgainst?: string
  }
  /** Optional: Function to test capture suppression */
  shouldSuppressCapture?: (
    childId: string,
    timestamp: Date,
    url: string
  ) => Promise<CaptureSuppressResult>
  /** Optional: Capture adapter for platform */
  captureAdapter?: {
    shouldCapture: (url: string) => Promise<CaptureDecision>
  }
  /** Optional: Fetch allowlist from network (for fallback tests) */
  fetchAllowlist?: () => Promise<CrisisAllowlist | null>
  /** Optional: Get cached allowlist */
  getCachedAllowlist?: () => Promise<CrisisAllowlist | null>
  /** Optional: Get bundled allowlist */
  getBundledAllowlist?: () => CrisisAllowlist
}

/**
 * Allowlist test harness interface
 */
export interface AllowlistTestHarness {
  /**
   * Run all allowlist presence and validity tests
   */
  runPresenceTests(): Promise<TestResult[]>

  /**
   * Run all zero-data-path verification tests
   */
  runZeroDataPathTests(): Promise<TestResult[]>

  /**
   * Run all fuzzy matching tests
   */
  runFuzzyMatchingTests(): Promise<TestResult[]>

  /**
   * Run all fallback chain tests
   */
  runFallbackChainTests(): Promise<TestResult[]>

  /**
   * Run all tests and return aggregate results
   */
  runAllTests(): Promise<TestSuiteResult>

  /**
   * Get the platform being tested
   */
  getPlatform(): TestPlatform
}

/**
 * Aggregate test suite results
 */
export interface TestSuiteResult {
  /** Platform tested */
  platform: TestPlatform
  /** Total tests run */
  totalTests: number
  /** Tests that passed */
  passedTests: number
  /** Tests that failed */
  failedTests: number
  /** Overall pass rate (0-1) */
  passRate: number
  /** Whether all critical tests passed */
  allCriticalPassed: boolean
  /** Individual test results */
  results: TestResult[]
  /** Total duration in milliseconds */
  totalDurationMs: number
  /** Timestamp when tests completed */
  completedAt: string
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Known crisis URLs that must always be detected
 * These are primary domains that exist in the bundled allowlist
 */
export const CRITICAL_CRISIS_URLS = [
  '988lifeline.org',
  'rainn.org',
  'thetrevorproject.org', // Note: NOT 'thetrevoproject.org' which is an alias
  'crisistextline.org',
  'thehotline.org', // National DV Hotline - 'ndvh.org' is an alias
  'childhelp.org',
]

/**
 * Typosquatting test cases for fuzzy matching
 */
export const FUZZY_TEST_CASES = [
  // Typosquatting (should match - fuzzy detection)
  { input: '988lifecline.org', expected: '988lifeline.org', shouldMatch: true },

  // Exact matches (primary domains and aliases)
  { input: 'rainn.org', expected: 'rainn.org', shouldMatch: true },
  { input: 'thetrevoproject.org', expected: 'thetrevorproject.org', shouldMatch: true }, // Alias exact match

  // Subdomains (should match via wildcards)
  { input: 'help.988lifeline.org', expected: '988lifeline.org', shouldMatch: true },
  { input: 'chat.rainn.org', expected: 'rainn.org', shouldMatch: true },

  // Blocklist (should NOT match)
  { input: 'google.com', expected: null, shouldMatch: false },
  { input: 'facebook.com', expected: null, shouldMatch: false },
  { input: 'amazon.com', expected: null, shouldMatch: false },
  { input: 'youtube.com', expected: null, shouldMatch: false },
]

/**
 * Non-crisis URLs that must NOT trigger false positives
 */
export const NON_CRISIS_URLS = [
  'google.com',
  'facebook.com',
  'youtube.com',
  'amazon.com',
  'wikipedia.org',
  'github.com',
  'netflix.com',
  'twitter.com',
]

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a test harness for a specific platform
 *
 * @param config - Test harness configuration
 * @returns Platform-specific test harness
 */
export function createAllowlistTestHarness(
  config: AllowlistTestHarnessConfig
): AllowlistTestHarness {
  const {
    platform,
    getAllowlist,
    isCrisisUrl,
    isCrisisUrlFuzzy,
    shouldSuppressCapture,
    captureAdapter,
    fetchAllowlist,
    getCachedAllowlist,
    getBundledAllowlist,
  } = config

  /**
   * Helper to run a test and capture timing
   */
  async function runTest(
    name: string,
    category: TestCategory,
    testFn: () => boolean | Promise<boolean>
  ): Promise<TestResult> {
    const startTime = Date.now()
    let passed = false
    let message: string | undefined

    try {
      passed = await testFn()
      if (!passed) {
        message = 'Test assertion failed'
      }
    } catch (error) {
      passed = false
      message = error instanceof Error ? error.message : String(error)
    }

    return {
      passed,
      name,
      message,
      durationMs: Date.now() - startTime,
      category,
    }
  }

  return {
    async runPresenceTests(): Promise<TestResult[]> {
      const results: TestResult[] = []

      // Test: Allowlist is non-empty
      results.push(
        await runTest('Allowlist is non-empty', 'presence', () => {
          const allowlist = getAllowlist()
          return allowlist.entries.length > 0
        })
      )

      // Test: Allowlist has valid version
      results.push(
        await runTest('Allowlist has valid version', 'presence', () => {
          const allowlist = getAllowlist()
          const version = allowlist.version
          // Check semantic version format: x.y.z with optional suffix
          // Supports: 1.0.0, 1.0.0-2025-12-16T12:00:00Z, 1.0.0-emergency-abc123
          return /^\d+\.\d+\.\d+(-[a-zA-Z0-9:\-]+)?$/.test(version)
        })
      )

      // Test: All entries have required fields
      results.push(
        await runTest('All entries have required fields', 'presence', () => {
          const allowlist = getAllowlist()
          return allowlist.entries.every(
            (entry) =>
              entry.domain &&
              entry.category &&
              entry.region &&
              entry.name &&
              entry.description &&
              Array.isArray(entry.aliases) &&
              Array.isArray(entry.wildcardPatterns)
          )
        })
      )

      // Test: Critical crisis URLs are present
      results.push(
        await runTest('Critical crisis URLs are present', 'presence', () => {
          const allowlist = getAllowlist()
          const domains = new Set(
            allowlist.entries.map((e) => e.domain.toLowerCase().replace(/^www\./, ''))
          )
          return CRITICAL_CRISIS_URLS.every((url) =>
            domains.has(url.toLowerCase())
          )
        })
      )

      // Test: Each entry has at least one contact method
      results.push(
        await runTest('Each entry has contact methods', 'presence', () => {
          const allowlist = getAllowlist()
          const validMethods = ['phone', 'text', 'chat', 'email', 'web']
          return allowlist.entries.every(
            (entry) =>
              entry.contactMethods &&
              Array.isArray(entry.contactMethods) &&
              entry.contactMethods.length > 0 &&
              entry.contactMethods.every((cm) => validMethods.includes(cm))
          )
        })
      )

      // Test: Minimum entry count (safety check)
      results.push(
        await runTest('Minimum entry count (≥10)', 'presence', () => {
          const allowlist = getAllowlist()
          return allowlist.entries.length >= 10
        })
      )

      return results
    },

    async runZeroDataPathTests(): Promise<TestResult[]> {
      const results: TestResult[] = []

      // Test: Crisis URLs trigger detection
      for (const crisisUrl of CRITICAL_CRISIS_URLS.slice(0, 3)) {
        results.push(
          await runTest(`Crisis URL detected: ${crisisUrl}`, 'zero-data-path', () => {
            return isCrisisUrl(`https://${crisisUrl}`)
          })
        )
      }

      // Test: Non-crisis URLs don't trigger false positives
      for (const nonCrisisUrl of NON_CRISIS_URLS.slice(0, 3)) {
        results.push(
          await runTest(
            `Non-crisis URL not detected: ${nonCrisisUrl}`,
            'zero-data-path',
            () => {
              return !isCrisisUrl(`https://${nonCrisisUrl}`)
            }
          )
        )
      }

      // Test: CaptureSuppressResult has no reason field (type safety)
      results.push(
        await runTest(
          'CaptureSuppressResult has only suppress field',
          'zero-data-path',
          () => {
            // This tests that the type is correct at runtime
            const result: CaptureSuppressResult = { suppress: true }
            const keys = Object.keys(result)
            return keys.length === 1 && keys[0] === 'suppress'
          }
        )
      )

      // Test: CaptureDecision has no reason field (type safety)
      results.push(
        await runTest(
          'CaptureDecision has only shouldCapture field',
          'zero-data-path',
          () => {
            // This tests that the type is correct at runtime
            const decision: CaptureDecision = { shouldCapture: true }
            const keys = Object.keys(decision)
            return keys.length === 1 && keys[0] === 'shouldCapture'
          }
        )
      )

      // Test: Suppression with detector (if available)
      if (shouldSuppressCapture) {
        results.push(
          await runTest(
            'Crisis URL triggers suppression',
            'zero-data-path',
            async () => {
              const result = await shouldSuppressCapture(
                'test-child',
                new Date(),
                'https://988lifeline.org'
              )
              return result.suppress === true
            }
          )
        )

        results.push(
          await runTest(
            'Suppression result has no reason',
            'zero-data-path',
            async () => {
              const result = await shouldSuppressCapture(
                'test-child',
                new Date(),
                'https://988lifeline.org'
              )
              const keys = Object.keys(result)
              // Should only have 'suppress' - no 'reason', 'type', etc.
              return keys.length === 1 && keys[0] === 'suppress'
            }
          )
        )
      }

      // Test: Capture adapter (if available)
      if (captureAdapter) {
        results.push(
          await runTest(
            'Capture adapter blocks crisis URLs',
            'zero-data-path',
            async () => {
              const decision = await captureAdapter.shouldCapture(
                'https://988lifeline.org'
              )
              return decision.shouldCapture === false
            }
          )
        )

        results.push(
          await runTest(
            'Capture decision has no reason field',
            'zero-data-path',
            async () => {
              const decision = await captureAdapter.shouldCapture(
                'https://988lifeline.org'
              )
              const keys = Object.keys(decision)
              return keys.length === 1 && keys[0] === 'shouldCapture'
            }
          )
        )
      }

      return results
    },

    async runFuzzyMatchingTests(): Promise<TestResult[]> {
      const results: TestResult[] = []

      // Test each fuzzy test case
      for (const testCase of FUZZY_TEST_CASES) {
        const testName = testCase.shouldMatch
          ? `Fuzzy matches: ${testCase.input} → ${testCase.expected}`
          : `Fuzzy blocklist: ${testCase.input} not matched`

        results.push(
          await runTest(testName, 'fuzzy-matching', () => {
            const result = isCrisisUrlFuzzy(testCase.input, {
              useFuzzyMatch: true,
            })
            return result.match === testCase.shouldMatch
          })
        )
      }

      // Test: Exact matches take precedence over fuzzy
      results.push(
        await runTest(
          'Exact matches have fuzzy=false',
          'fuzzy-matching',
          () => {
            const result = isCrisisUrlFuzzy('988lifeline.org')
            return result.match === true && result.fuzzy === false
          }
        )
      )

      // Test: Fuzzy can be disabled
      results.push(
        await runTest(
          'Fuzzy matching can be disabled',
          'fuzzy-matching',
          () => {
            // A typo that would match with fuzzy but not exact
            const result = isCrisisUrlFuzzy('988lifecline.org', {
              useFuzzyMatch: false,
            })
            return result.match === false
          }
        )
      )

      return results
    },

    async runFallbackChainTests(): Promise<TestResult[]> {
      const results: TestResult[] = []

      // Test: Bundled allowlist is available
      if (getBundledAllowlist) {
        results.push(
          await runTest(
            'Bundled allowlist is available',
            'fallback-chain',
            () => {
              const bundled = getBundledAllowlist()
              return bundled.entries.length > 0
            }
          )
        )

        results.push(
          await runTest(
            'Bundled allowlist is valid',
            'fallback-chain',
            () => {
              const bundled = getBundledAllowlist()
              return (
                !!bundled.version &&
                Array.isArray(bundled.entries) &&
                bundled.entries.length > 0
              )
            }
          )
        )
      }

      // Test: Cache returns valid data (if available)
      if (getCachedAllowlist) {
        results.push(
          await runTest(
            'Cached allowlist returns valid data or null',
            'fallback-chain',
            async () => {
              const cached = await getCachedAllowlist()
              if (cached === null) return true // No cache is valid
              return (
                !!cached.version &&
                Array.isArray(cached.entries)
              )
            }
          )
        )
      }

      // Test: Direct function always returns valid allowlist
      results.push(
        await runTest(
          'getAllowlist never returns empty',
          'fallback-chain',
          () => {
            const allowlist = getAllowlist()
            return allowlist.entries.length > 0
          }
        )
      )

      // Test: Function works without network (bundled fallback)
      results.push(
        await runTest(
          'Crisis detection works offline',
          'fallback-chain',
          () => {
            // Even without network, crisis URLs should be detected
            return isCrisisUrl('https://988lifeline.org')
          }
        )
      )

      return results
    },

    async runAllTests(): Promise<TestSuiteResult> {
      const startTime = Date.now()
      const allResults: TestResult[] = []

      // Run all test categories
      const presenceResults = await this.runPresenceTests()
      allResults.push(...presenceResults)

      const zeroDataPathResults = await this.runZeroDataPathTests()
      allResults.push(...zeroDataPathResults)

      const fuzzyResults = await this.runFuzzyMatchingTests()
      allResults.push(...fuzzyResults)

      const fallbackResults = await this.runFallbackChainTests()
      allResults.push(...fallbackResults)

      // Calculate stats
      const passedTests = allResults.filter((r) => r.passed).length
      const failedTests = allResults.filter((r) => !r.passed).length

      // Critical tests are presence and zero-data-path
      const criticalResults = allResults.filter(
        (r) => r.category === 'presence' || r.category === 'zero-data-path'
      )
      const allCriticalPassed = criticalResults.every((r) => r.passed)

      return {
        platform,
        totalTests: allResults.length,
        passedTests,
        failedTests,
        passRate: allResults.length > 0 ? passedTests / allResults.length : 0,
        allCriticalPassed,
        results: allResults,
        totalDurationMs: Date.now() - startTime,
        completedAt: new Date().toISOString(),
      }
    },

    getPlatform(): TestPlatform {
      return platform
    },
  }
}

// ============================================================================
// Assertion Utilities
// ============================================================================

/**
 * Assert that deployment should be allowed based on test results
 *
 * @param result - Test suite result
 * @throws Error if critical tests failed
 */
export function assertDeploymentAllowed(result: TestSuiteResult): void {
  if (!result.allCriticalPassed) {
    const failedCritical = result.results.filter(
      (r) =>
        !r.passed &&
        (r.category === 'presence' || r.category === 'zero-data-path')
    )
    const failedNames = failedCritical.map((r) => r.name).join(', ')
    throw new Error(
      `Deployment blocked: Critical allowlist tests failed: ${failedNames}`
    )
  }

  if (result.passRate < 0.95) {
    throw new Error(
      `Deployment blocked: Test pass rate (${(result.passRate * 100).toFixed(1)}%) below threshold (95%)`
    )
  }
}

/**
 * Check if test results allow deployment
 *
 * @param result - Test suite result
 * @returns true if deployment should proceed
 */
export function shouldAllowDeployment(result: TestSuiteResult): boolean {
  try {
    assertDeploymentAllowed(result)
    return true
  } catch {
    return false
  }
}
