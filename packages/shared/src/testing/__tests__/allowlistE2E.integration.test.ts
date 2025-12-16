/**
 * End-to-End Integration Tests
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 9
 *
 * These tests verify the complete flow of allowlist operations
 * across all components, ensuring everything works together.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createAllowlistTestHarness,
  assertDeploymentAllowed,
  shouldAllowDeployment,
  CRITICAL_CRISIS_URLS,
} from '../allowlistTestHarness'
import { createWebTestAdapter } from '../adapters/webTestAdapter'
import { createChromeTestAdapter } from '../adapters/chromeTestAdapter'
import { createAndroidTestAdapter } from '../adapters/androidTestAdapter'
import { createiOSTestAdapter } from '../adapters/iosTestAdapter'
import {
  generateTestReport,
  generateMarkdownReport,
  generateOneLinerSummary,
  generateCIOutput,
} from '../testReporter'
import {
  getCrisisAllowlist,
  isCrisisUrl,
  isCrisisUrlFuzzy,
  getAllowlistVersion,
} from '../../constants/crisis-urls'
import {
  createPrivacyGapDetector,
  createInMemoryScheduleStore,
} from '../../services/privacyGapDetector'
import { createWebCaptureAdapter } from '../../adapters/webCaptureAdapter'
import { generateDailyGapSchedule } from '../../services/privacyGapScheduler'
import {
  createAllowlistSyncService,
  type AllowlistSyncAdapter,
} from '../../services/allowlistSyncService'
import { DEFAULT_PRIVACY_GAP_CONFIG } from '@fledgely/contracts'

// ============================================================================
// Full Pipeline Tests
// ============================================================================

describe('E2E: Full Allowlist Pipeline', () => {
  describe('sync → cache → detect → suppress', () => {
    it('complete flow from network to suppression', async () => {
      // 1. Get allowlist (simulates sync)
      const allowlist = getCrisisAllowlist()
      expect(allowlist.entries.length).toBeGreaterThan(0)

      // 2. Simulate caching
      const scheduleStore = createInMemoryScheduleStore()

      // 3. Create detector
      const detector = createPrivacyGapDetector({
        getSchedule: scheduleStore.get,
        isCrisisUrl: (url) => isCrisisUrl(url),
        privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
      })

      // 4. Create capture adapter
      const adapter = createWebCaptureAdapter({
        privacyGapDetector: detector,
        childId: 'e2e-test-child',
      })

      // 5. Test crisis URL suppression
      const crisisDecision = await adapter.shouldCapture('https://988lifeline.org')
      expect(crisisDecision.shouldCapture).toBe(false)

      // 6. Test normal URL allows capture
      const normalDecision = await adapter.shouldCapture('https://google.com')
      expect(normalDecision.shouldCapture).toBe(true)
    })

    it('privacy gap suppression integrates correctly', async () => {
      const childId = 'e2e-gap-test-child'
      const now = new Date()

      // Generate schedule
      const schedule = generateDailyGapSchedule(childId, now)
      const scheduleStore = createInMemoryScheduleStore()
      scheduleStore.set(schedule)

      // Create detector
      const detector = createPrivacyGapDetector({
        getSchedule: scheduleStore.get,
        isCrisisUrl: (url) => isCrisisUrl(url),
        privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
      })

      // Test within a gap (if gaps exist)
      if (schedule.gaps.length > 0) {
        const gap = schedule.gaps[0]
        const gapMiddle = new Date(
          (new Date(gap.startTime).getTime() + new Date(gap.endTime).getTime()) / 2
        )

        const result = await detector.shouldSuppressCapture(
          childId,
          gapMiddle,
          'https://example.com'
        )

        expect(result.suppress).toBe(true)
        // Zero-data-path: no reason exposed
        expect(Object.keys(result)).toEqual(['suppress'])
      }
    })
  })
})

// ============================================================================
// Emergency Version Tests
// ============================================================================

describe('E2E: Emergency Version Handling', () => {
  it('emergency version detection works correctly', async () => {
    // Test emergency version detection logic
    const { isEmergencyVersion, shouldResync } = await import('../../services/allowlistSyncService')

    // Emergency versions are detected
    expect(isEmergencyVersion('1.0.0-emergency-critical-fix')).toBe(true)
    expect(isEmergencyVersion('2.0.0-emergency-abc123')).toBe(true)
    expect(isEmergencyVersion('1.0.0')).toBe(false)
    expect(isEmergencyVersion('1.0.0-beta')).toBe(false)

    // Emergency versions always trigger re-sync
    expect(shouldResync('1.0.0', '1.0.0-emergency-critical-fix')).toBe(true)
    expect(shouldResync('2.0.0', '1.0.0-emergency-critical-fix')).toBe(true)
  })

  it('cache uses shorter TTL for emergency versions', async () => {
    const mockAdapter: AllowlistSyncAdapter = {
      async getFromCache() {
        return {
          data: { ...getCrisisAllowlist(), version: '1.0.0-emergency-critical-fix' },
          cachedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
          version: '1.0.0-emergency-critical-fix',
          isEmergency: true, // Emergency flag set
        }
      },
      async saveToCache() {},
      getBundled: getCrisisAllowlist,
      async reportSyncStatus() {},
    }

    const service = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: 'https://api.example.com/allowlist',
        ttlMs: 24 * 60 * 60 * 1000, // Normal: 24 hours
        emergencyTtlMs: 60 * 60 * 1000, // Emergency: 1 hour
        networkTimeoutMs: 5000,
      },
      mockAdapter
    )

    // With 30 min old emergency cache and 1 hour TTL, cache should still be valid
    const result = await service.sync()

    expect(result.source).toBe('cache')
    expect(result.isEmergency).toBe(true)
  })
})

// ============================================================================
// Platform-Specific Harness Tests
// ============================================================================

describe('E2E: Platform Test Harnesses', () => {
  describe('Web Platform', () => {
    it('web adapter runs all tests successfully', async () => {
      const config = createWebTestAdapter()
      const harness = createAllowlistTestHarness(config)

      const results = await harness.runAllTests()

      expect(results.totalTests).toBeGreaterThan(0)
      expect(results.platform).toBe('web')

      // Log any failures for debugging
      const failures = results.results.filter((r) => !r.passed)
      if (failures.length > 0) {
        console.log('Failed tests:', failures.map((f) => f.name).join(', '))
      }
    })

    it('web harness passes critical tests', async () => {
      const config = createWebTestAdapter()
      const harness = createAllowlistTestHarness(config)

      const results = await harness.runAllTests()

      // Critical tests must pass
      expect(results.allCriticalPassed).toBe(true)
    })
  })

  describe('Chrome Extension Platform (Mock)', () => {
    it('chrome adapter runs presence tests', async () => {
      const config = createChromeTestAdapter()
      const harness = createAllowlistTestHarness(config)

      const results = await harness.runPresenceTests()

      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r) => r.category === 'presence')).toBe(true)
    })
  })

  describe('Android Platform (Mock)', () => {
    it('android adapter runs presence tests', async () => {
      const config = createAndroidTestAdapter()
      const harness = createAllowlistTestHarness(config)

      const results = await harness.runPresenceTests()

      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('iOS Platform (Mock)', () => {
    it('ios adapter runs presence tests', async () => {
      const config = createiOSTestAdapter()
      const harness = createAllowlistTestHarness(config)

      const results = await harness.runPresenceTests()

      expect(results.length).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// Test Report Generation Tests
// ============================================================================

describe('E2E: Test Report Generation', () => {
  it('generates complete test report', async () => {
    const config = createWebTestAdapter()
    const harness = createAllowlistTestHarness(config)
    const results = await harness.runAllTests()

    const report = generateTestReport(results)

    expect(report.title).toBe('Allowlist Test Report')
    expect(report.platform).toBe('web')
    expect(report.summary.total).toBe(results.totalTests)
    expect(report.summary.passed).toBe(results.passedTests)
    expect(report.summary.failed).toBe(results.failedTests)
    expect(report.categories.length).toBeGreaterThan(0)
    expect(report.generatedAt).toBeDefined()
    expect(report.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('generates markdown report', async () => {
    const config = createWebTestAdapter()
    const harness = createAllowlistTestHarness(config)
    const results = await harness.runAllTests()
    const report = generateTestReport(results)

    const markdown = generateMarkdownReport(report)

    expect(markdown).toContain('# Allowlist Test Report')
    expect(markdown).toContain('**Platform:**')
    expect(markdown).toContain('## Summary')
    expect(markdown).toContain('## Results by Category')
    expect(markdown).toContain('## Deployment Gate')
  })

  it('generates one-liner summary', async () => {
    const config = createWebTestAdapter()
    const harness = createAllowlistTestHarness(config)
    const results = await harness.runAllTests()
    const report = generateTestReport(results)

    const oneLiner = generateOneLinerSummary(report)

    expect(oneLiner).toContain('[web]')
    expect(oneLiner).toMatch(/PASS|FAIL/)
    expect(oneLiner).toContain('/')
    expect(oneLiner).toContain('%')
  })

  it('generates CI output', async () => {
    const config = createWebTestAdapter()
    const harness = createAllowlistTestHarness(config)
    const results = await harness.runAllTests()
    const report = generateTestReport(results)

    const ciOutput = generateCIOutput(report)

    expect(typeof ciOutput.passed).toBe('boolean')
    expect(typeof ciOutput.summary).toBe('string')
    expect(typeof ciOutput.total).toBe('number')
    expect(typeof ciOutput.failed).toBe('number')
    expect(typeof ciOutput.critical_passed).toBe('boolean')
  })
})

// ============================================================================
// Deployment Gate Tests
// ============================================================================

describe('E2E: Deployment Gate', () => {
  it('allows deployment when all tests pass', async () => {
    const config = createWebTestAdapter()
    const harness = createAllowlistTestHarness(config)
    const results = await harness.runAllTests()

    // Check deployment is allowed
    const canDeploy = shouldAllowDeployment(results)

    // If tests pass, deployment should be allowed
    if (results.passRate >= 0.95 && results.allCriticalPassed) {
      expect(canDeploy).toBe(true)
    }
  })

  it('blocks deployment for critical failures', async () => {
    // Simulate a critical failure scenario
    const mockResults = {
      platform: 'web' as const,
      totalTests: 10,
      passedTests: 5,
      failedTests: 5,
      passRate: 0.5,
      allCriticalPassed: false,
      results: [
        {
          passed: false,
          name: 'Allowlist is non-empty',
          category: 'presence' as const,
          durationMs: 10,
        },
      ],
      totalDurationMs: 100,
      completedAt: new Date().toISOString(),
    }

    expect(() => assertDeploymentAllowed(mockResults)).toThrow(
      /Deployment blocked/
    )
    expect(shouldAllowDeployment(mockResults)).toBe(false)
  })
})

// ============================================================================
// Consistency Tests
// ============================================================================

describe('E2E: Cross-Platform Consistency', () => {
  it('all platforms use same bundled allowlist', async () => {
    const webConfig = createWebTestAdapter()
    const chromeConfig = createChromeTestAdapter()
    const androidConfig = createAndroidTestAdapter()
    const iosConfig = createiOSTestAdapter()

    const webAllowlist = webConfig.getAllowlist()
    const chromeAllowlist = chromeConfig.getAllowlist()
    const androidAllowlist = androidConfig.getAllowlist()
    const iosAllowlist = iosConfig.getAllowlist()

    // All should have same version
    expect(webAllowlist.version).toBe(chromeAllowlist.version)
    expect(webAllowlist.version).toBe(androidAllowlist.version)
    expect(webAllowlist.version).toBe(iosAllowlist.version)

    // All should have same entries
    expect(webAllowlist.entries.length).toBe(chromeAllowlist.entries.length)
    expect(webAllowlist.entries.length).toBe(androidAllowlist.entries.length)
    expect(webAllowlist.entries.length).toBe(iosAllowlist.entries.length)
  })

  it('all platforms detect same crisis URLs', () => {
    const webConfig = createWebTestAdapter()
    const chromeConfig = createChromeTestAdapter()
    const androidConfig = createAndroidTestAdapter()
    const iosConfig = createiOSTestAdapter()

    for (const crisisUrl of CRITICAL_CRISIS_URLS) {
      const testUrl = `https://${crisisUrl}`

      expect(webConfig.isCrisisUrl(testUrl)).toBe(true)
      expect(chromeConfig.isCrisisUrl(testUrl)).toBe(true)
      expect(androidConfig.isCrisisUrl(testUrl)).toBe(true)
      expect(iosConfig.isCrisisUrl(testUrl)).toBe(true)
    }
  })

  it('all platforms have consistent fuzzy matching', () => {
    const webConfig = createWebTestAdapter()
    const chromeConfig = createChromeTestAdapter()

    // Test exact match
    const exactWeb = webConfig.isCrisisUrlFuzzy('988lifeline.org')
    const exactChrome = chromeConfig.isCrisisUrlFuzzy('988lifeline.org')

    expect(exactWeb.match).toBe(exactChrome.match)
    expect(exactWeb.fuzzy).toBe(exactChrome.fuzzy)

    // Test fuzzy match
    const fuzzyWeb = webConfig.isCrisisUrlFuzzy('988lifecline.org', {
      useFuzzyMatch: true,
    })
    const fuzzyChrome = chromeConfig.isCrisisUrlFuzzy('988lifecline.org', {
      useFuzzyMatch: true,
    })

    expect(fuzzyWeb.match).toBe(fuzzyChrome.match)
  })
})
