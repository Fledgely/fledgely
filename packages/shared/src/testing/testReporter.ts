/**
 * Allowlist Test Reporter
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 8
 *
 * Generates test reports for CI/CD integration and artifact inclusion.
 */

import type { TestSuiteResult, TestResult, TestCategory } from './allowlistTestHarness'

// ============================================================================
// Types
// ============================================================================

/**
 * Category summary for reporting
 */
export interface CategorySummary {
  /** Category name */
  category: TestCategory
  /** Total tests in category */
  total: number
  /** Passed tests */
  passed: number
  /** Failed tests */
  failed: number
  /** Pass rate (0-1) */
  passRate: number
}

/**
 * Full test report
 */
export interface TestReport {
  /** Report title */
  title: string
  /** Platform tested */
  platform: string
  /** Timestamp when generated */
  generatedAt: string
  /** Overall summary */
  summary: {
    total: number
    passed: number
    failed: number
    passRate: number
    criticalPassed: boolean
    deploymentAllowed: boolean
  }
  /** Per-category summaries */
  categories: CategorySummary[]
  /** All test results */
  tests: TestResult[]
  /** Total duration */
  durationMs: number
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Generate a full test report from test suite results
 *
 * @param result - Test suite result
 * @param title - Optional report title
 * @returns Complete test report
 */
export function generateTestReport(
  result: TestSuiteResult,
  title = 'Allowlist Test Report'
): TestReport {
  // Calculate per-category summaries
  const categoryMap = new Map<TestCategory, TestResult[]>()

  for (const test of result.results) {
    const existing = categoryMap.get(test.category) || []
    existing.push(test)
    categoryMap.set(test.category, existing)
  }

  const categories: CategorySummary[] = []
  for (const [category, tests] of categoryMap) {
    const passed = tests.filter((t) => t.passed).length
    categories.push({
      category,
      total: tests.length,
      passed,
      failed: tests.length - passed,
      passRate: tests.length > 0 ? passed / tests.length : 0,
    })
  }

  // Determine if deployment should be allowed
  const deploymentAllowed =
    result.allCriticalPassed && result.passRate >= 0.95

  return {
    title,
    platform: result.platform,
    generatedAt: new Date().toISOString(),
    summary: {
      total: result.totalTests,
      passed: result.passedTests,
      failed: result.failedTests,
      passRate: result.passRate,
      criticalPassed: result.allCriticalPassed,
      deploymentAllowed,
    },
    categories,
    tests: result.results,
    durationMs: result.totalDurationMs,
  }
}

/**
 * Generate JSON report for artifact storage
 *
 * @param report - Test report
 * @returns JSON string
 */
export function generateJsonReport(report: TestReport): string {
  return JSON.stringify(report, null, 2)
}

/**
 * Generate Markdown summary for PR comments
 *
 * @param report - Test report
 * @returns Markdown formatted string
 */
export function generateMarkdownReport(report: TestReport): string {
  const lines: string[] = []

  // Header
  lines.push(`# ${report.title}`)
  lines.push('')
  lines.push(`**Platform:** ${report.platform}`)
  lines.push(`**Generated:** ${report.generatedAt}`)
  lines.push(`**Duration:** ${report.durationMs}ms`)
  lines.push('')

  // Overall status badge
  const statusBadge = report.summary.deploymentAllowed
    ? '![Status](https://img.shields.io/badge/Status-PASS-green)'
    : '![Status](https://img.shields.io/badge/Status-FAIL-red)'
  lines.push(statusBadge)
  lines.push('')

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|-------|')
  lines.push(`| Total Tests | ${report.summary.total} |`)
  lines.push(`| Passed | ${report.summary.passed} |`)
  lines.push(`| Failed | ${report.summary.failed} |`)
  lines.push(`| Pass Rate | ${(report.summary.passRate * 100).toFixed(1)}% |`)
  lines.push(
    `| Critical Tests | ${report.summary.criticalPassed ? 'PASS' : 'FAIL'} |`
  )
  lines.push(
    `| Deployment Allowed | ${report.summary.deploymentAllowed ? 'YES' : 'NO'} |`
  )
  lines.push('')

  // Category breakdown
  lines.push('## Results by Category')
  lines.push('')
  lines.push('| Category | Total | Passed | Failed | Pass Rate |')
  lines.push('|----------|-------|--------|--------|-----------|')

  for (const cat of report.categories) {
    const passRateStr = `${(cat.passRate * 100).toFixed(1)}%`
    const indicator = cat.passRate === 1 ? '' : ' ⚠️'
    lines.push(
      `| ${cat.category} | ${cat.total} | ${cat.passed} | ${cat.failed} | ${passRateStr}${indicator} |`
    )
  }
  lines.push('')

  // Failed tests detail
  const failedTests = report.tests.filter((t) => !t.passed)
  if (failedTests.length > 0) {
    lines.push('## Failed Tests')
    lines.push('')
    for (const test of failedTests) {
      lines.push(`### ❌ ${test.name}`)
      lines.push('')
      lines.push(`- **Category:** ${test.category}`)
      lines.push(`- **Duration:** ${test.durationMs}ms`)
      if (test.message) {
        lines.push(`- **Message:** ${test.message}`)
      }
      lines.push('')
    }
  }

  // Deployment gate
  lines.push('## Deployment Gate')
  lines.push('')
  if (report.summary.deploymentAllowed) {
    lines.push(
      '✅ **All critical tests passed and pass rate meets threshold. Deployment may proceed.**'
    )
  } else {
    lines.push(
      '❌ **Deployment BLOCKED. Critical test failures or pass rate below 95%.**'
    )
    lines.push('')
    lines.push('Please fix the failing tests before deployment.')
  }

  return lines.join('\n')
}

/**
 * Generate a compact one-line summary
 *
 * @param report - Test report
 * @returns Single line summary
 */
export function generateOneLinerSummary(report: TestReport): string {
  const status = report.summary.deploymentAllowed ? 'PASS' : 'FAIL'
  return `[${report.platform}] ${status}: ${report.summary.passed}/${report.summary.total} tests (${(report.summary.passRate * 100).toFixed(1)}%)`
}

/**
 * Generate test results for CI/CD pipeline
 *
 * Returns an object suitable for GitHub Actions output
 *
 * @param report - Test report
 * @returns CI-friendly output object
 */
export function generateCIOutput(report: TestReport): {
  passed: boolean
  summary: string
  total: number
  failed: number
  critical_passed: boolean
} {
  return {
    passed: report.summary.deploymentAllowed,
    summary: generateOneLinerSummary(report),
    total: report.summary.total,
    failed: report.summary.failed,
    critical_passed: report.summary.criticalPassed,
  }
}
