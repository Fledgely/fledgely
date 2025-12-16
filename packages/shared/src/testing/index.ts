/**
 * @fledgely/shared/testing
 *
 * Story 7.9: Cross-Platform Allowlist Testing
 *
 * Testing utilities for verifying crisis allowlist behavior across all platforms.
 *
 * ## Usage
 *
 * @example Basic Test Harness
 * ```typescript
 * import {
 *   createAllowlistTestHarness,
 *   createWebTestAdapter,
 *   assertDeploymentAllowed,
 * } from '@fledgely/shared/testing'
 *
 * // Create platform-specific test harness
 * const config = createWebTestAdapter()
 * const harness = createAllowlistTestHarness(config)
 *
 * // Run all tests
 * const results = await harness.runAllTests()
 *
 * // Block deployment if tests fail
 * assertDeploymentAllowed(results)
 * ```
 *
 * @example CI/CD Integration
 * ```typescript
 * import {
 *   createAllowlistTestHarness,
 *   createWebTestAdapter,
 *   generateTestReport,
 *   generateJsonReport,
 *   generateMarkdownReport,
 * } from '@fledgely/shared/testing'
 *
 * // Run tests
 * const harness = createAllowlistTestHarness(createWebTestAdapter())
 * const results = await harness.runAllTests()
 *
 * // Generate reports for CI
 * const report = generateTestReport(results)
 * console.log(generateMarkdownReport(report)) // For PR comments
 * fs.writeFileSync('allowlist-tests.json', generateJsonReport(report)) // For artifacts
 * ```
 */

// Test Harness
export {
  createAllowlistTestHarness,
  assertDeploymentAllowed,
  shouldAllowDeployment,
  CRITICAL_CRISIS_URLS,
  FUZZY_TEST_CASES,
  NON_CRISIS_URLS,
  type AllowlistTestHarness,
  type AllowlistTestHarnessConfig,
  type TestResult,
  type TestSuiteResult,
  type TestCategory,
  type TestPlatform,
} from './allowlistTestHarness'

// Test Reporter
export {
  generateTestReport,
  generateJsonReport,
  generateMarkdownReport,
  generateOneLinerSummary,
  generateCIOutput,
  type TestReport,
  type CategorySummary,
} from './testReporter'

// Platform Adapters
export { createWebTestAdapter } from './adapters/webTestAdapter'
export { createChromeTestAdapter } from './adapters/chromeTestAdapter'
export { createAndroidTestAdapter } from './adapters/androidTestAdapter'
export { createiOSTestAdapter } from './adapters/iosTestAdapter'
