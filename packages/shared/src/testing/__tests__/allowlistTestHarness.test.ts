/**
 * Allowlist Test Harness Tests
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 1.6
 *
 * Tests for the test harness itself
 */

import { describe, it, expect, vi } from 'vitest'
import {
  createAllowlistTestHarness,
  assertDeploymentAllowed,
  shouldAllowDeployment,
  CRITICAL_CRISIS_URLS,
  FUZZY_TEST_CASES,
  NON_CRISIS_URLS,
  type TestSuiteResult,
} from '../allowlistTestHarness'
import type { CrisisAllowlist, CrisisUrlEntry } from '../../constants/crisis-urls'

// ============================================================================
// Test Data
// ============================================================================

const mockEntry: CrisisUrlEntry = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  domain: '988lifeline.org',
  category: 'suicide',
  region: 'us',
  name: '988 Suicide & Crisis Lifeline',
  description: 'National suicide prevention lifeline',
  aliases: ['suicidepreventionlifeline.org'],
  wildcardPatterns: ['*.988lifeline.org'],
  contactMethods: ['phone', 'text', 'chat'],
  phoneNumber: '988',
  textNumber: '988',
}

const createMockAllowlist = (): CrisisAllowlist => ({
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  entries: [
    mockEntry,
    {
      ...mockEntry,
      domain: 'rainn.org',
      category: 'abuse',
      name: 'RAINN',
      description: 'Sexual assault hotline',
      aliases: [],
      wildcardPatterns: ['*.rainn.org'],
    },
    {
      ...mockEntry,
      domain: 'thetrevorproject.org', // Updated: was 'thetrevoproject.org'
      category: 'lgbtq',
      name: 'The Trevor Project',
      description: 'LGBTQ+ youth crisis support',
      aliases: ['thetrevoproject.org'], // Alias for typo
      wildcardPatterns: [],
    },
    {
      ...mockEntry,
      domain: 'crisistextline.org',
      category: 'crisis',
      name: 'Crisis Text Line',
      description: 'Text-based crisis support',
      aliases: [],
      wildcardPatterns: [],
    },
    {
      ...mockEntry,
      domain: 'thehotline.org', // Updated: was 'ndvh.org'
      category: 'domestic-violence',
      name: 'National DV Hotline',
      description: 'Domestic violence support',
      aliases: ['ndvh.org'], // Alias
      wildcardPatterns: [],
    },
    {
      ...mockEntry,
      domain: 'childhelp.org',
      category: 'child-abuse',
      name: 'Childhelp',
      description: 'Child abuse prevention',
      aliases: [],
      wildcardPatterns: [],
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      ...mockEntry,
      domain: `crisis-resource-${i}.org`,
      name: `Crisis Resource ${i}`,
    })),
  ],
})

// ============================================================================
// Tests
// ============================================================================

describe('allowlistTestHarness', () => {
  describe('createAllowlistTestHarness', () => {
    it('creates harness for web platform', () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: () => ({ match: false, fuzzy: false }),
      })

      expect(harness.getPlatform()).toBe('web')
    })

    it('creates harness for chrome-extension platform', () => {
      const harness = createAllowlistTestHarness({
        platform: 'chrome-extension',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: () => ({ match: false, fuzzy: false }),
      })

      expect(harness.getPlatform()).toBe('chrome-extension')
    })
  })

  describe('runPresenceTests', () => {
    it('passes when allowlist is valid', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: () => ({ match: false, fuzzy: false }),
      })

      const results = await harness.runPresenceTests()

      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r) => r.category === 'presence')).toBe(true)
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it('fails when allowlist is empty', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: () => ({
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          entries: [],
        }),
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: () => ({ match: false, fuzzy: false }),
      })

      const results = await harness.runPresenceTests()

      const emptyTest = results.find((r) => r.name.includes('non-empty'))
      expect(emptyTest?.passed).toBe(false)
    })

    it('fails when version is invalid', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: () => ({
          version: 'invalid',
          lastUpdated: new Date().toISOString(),
          entries: [mockEntry],
        }),
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: () => ({ match: false, fuzzy: false }),
      })

      const results = await harness.runPresenceTests()

      const versionTest = results.find((r) => r.name.includes('valid version'))
      expect(versionTest?.passed).toBe(false)
    })
  })

  describe('runZeroDataPathTests', () => {
    it('passes when crisis URLs are detected', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: (url) => url.includes('988lifeline.org'),
        isCrisisUrlFuzzy: () => ({ match: true, fuzzy: false }),
      })

      const results = await harness.runZeroDataPathTests()

      expect(results.length).toBeGreaterThan(0)
      const crisisDetectedTest = results.find((r) =>
        r.name.includes('988lifeline.org')
      )
      expect(crisisDetectedTest?.passed).toBe(true)
    })

    it('fails when non-crisis URLs trigger false positives', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => true, // Everything matches - bug!
        isCrisisUrlFuzzy: () => ({ match: true, fuzzy: false }),
      })

      const results = await harness.runZeroDataPathTests()

      const falsePositiveTest = results.find((r) =>
        r.name.includes('google.com')
      )
      expect(falsePositiveTest?.passed).toBe(false)
    })

    it('tests suppression has no reason field', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => true,
        isCrisisUrlFuzzy: () => ({ match: true, fuzzy: false }),
      })

      const results = await harness.runZeroDataPathTests()

      const suppressTest = results.find((r) =>
        r.name.includes('CaptureSuppressResult')
      )
      expect(suppressTest?.passed).toBe(true)
    })
  })

  describe('runFuzzyMatchingTests', () => {
    it('tests fuzzy matching cases', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: (url, options) => {
          // Mock fuzzy logic
          if (url === '988lifecline.org' && options?.useFuzzyMatch) {
            return { match: true, fuzzy: true }
          }
          if (url === 'google.com') {
            return { match: false, fuzzy: false }
          }
          if (url === '988lifeline.org') {
            return { match: true, fuzzy: false }
          }
          return { match: false, fuzzy: false }
        },
      })

      const results = await harness.runFuzzyMatchingTests()

      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r) => r.category === 'fuzzy-matching')).toBe(true)
    })

    it('tests blocklist prevents false positives', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: () => false,
        isCrisisUrlFuzzy: (url) => {
          // Blocklisted domains should not match
          if (['google.com', 'facebook.com', 'amazon.com'].includes(url)) {
            return { match: false, fuzzy: false }
          }
          return { match: false, fuzzy: false }
        },
      })

      const results = await harness.runFuzzyMatchingTests()

      const blocklistTests = results.filter((r) =>
        r.name.includes('blocklist')
      )
      expect(blocklistTests.every((r) => r.passed)).toBe(true)
    })
  })

  describe('runFallbackChainTests', () => {
    it('tests offline detection works', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: (url) => url.includes('988lifeline.org'),
        isCrisisUrlFuzzy: () => ({ match: true, fuzzy: false }),
        getBundledAllowlist: createMockAllowlist,
      })

      const results = await harness.runFallbackChainTests()

      expect(results.length).toBeGreaterThan(0)
      const offlineTest = results.find((r) =>
        r.name.includes('offline')
      )
      expect(offlineTest?.passed).toBe(true)
    })
  })

  describe('runAllTests', () => {
    it('runs all test categories', async () => {
      const harness = createAllowlistTestHarness({
        platform: 'web',
        getAllowlist: createMockAllowlist,
        isCrisisUrl: (url) =>
          url.includes('988lifeline.org') ||
          url.includes('rainn.org') ||
          url.includes('thetrevoproject.org'),
        isCrisisUrlFuzzy: (url, options) => {
          if (
            url.includes('988lifeline.org') ||
            url.includes('rainn.org') ||
            url.includes('thetrevoproject.org')
          ) {
            return { match: true, fuzzy: false }
          }
          if (url === '988lifecline.org' && options?.useFuzzyMatch) {
            return { match: true, fuzzy: true }
          }
          return { match: false, fuzzy: false }
        },
        getBundledAllowlist: createMockAllowlist,
      })

      const result = await harness.runAllTests()

      expect(result.platform).toBe('web')
      expect(result.totalTests).toBeGreaterThan(0)
      expect(result.results.length).toBe(result.totalTests)
      expect(result.passedTests + result.failedTests).toBe(result.totalTests)
      expect(result.completedAt).toBeDefined()
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)

      // Check all categories are present
      const categories = new Set(result.results.map((r) => r.category))
      expect(categories.has('presence')).toBe(true)
      expect(categories.has('zero-data-path')).toBe(true)
      expect(categories.has('fuzzy-matching')).toBe(true)
      expect(categories.has('fallback-chain')).toBe(true)
    })
  })
})

describe('assertDeploymentAllowed', () => {
  it('passes when all critical tests pass', () => {
    const result: TestSuiteResult = {
      platform: 'web',
      totalTests: 10,
      passedTests: 10,
      failedTests: 0,
      passRate: 1,
      allCriticalPassed: true,
      results: [],
      totalDurationMs: 100,
      completedAt: new Date().toISOString(),
    }

    expect(() => assertDeploymentAllowed(result)).not.toThrow()
  })

  it('throws when critical tests fail', () => {
    const result: TestSuiteResult = {
      platform: 'web',
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      passRate: 0.8,
      allCriticalPassed: false,
      results: [
        {
          passed: false,
          name: 'Critical test',
          category: 'presence',
          durationMs: 10,
        },
      ],
      totalDurationMs: 100,
      completedAt: new Date().toISOString(),
    }

    expect(() => assertDeploymentAllowed(result)).toThrow(
      /Deployment blocked.*Critical/
    )
  })

  it('throws when pass rate is below threshold', () => {
    const result: TestSuiteResult = {
      platform: 'web',
      totalTests: 100,
      passedTests: 90,
      failedTests: 10,
      passRate: 0.9,
      allCriticalPassed: true,
      results: [],
      totalDurationMs: 100,
      completedAt: new Date().toISOString(),
    }

    expect(() => assertDeploymentAllowed(result)).toThrow(
      /pass rate.*below threshold/
    )
  })
})

describe('shouldAllowDeployment', () => {
  it('returns true when deployment is allowed', () => {
    const result: TestSuiteResult = {
      platform: 'web',
      totalTests: 10,
      passedTests: 10,
      failedTests: 0,
      passRate: 1,
      allCriticalPassed: true,
      results: [],
      totalDurationMs: 100,
      completedAt: new Date().toISOString(),
    }

    expect(shouldAllowDeployment(result)).toBe(true)
  })

  it('returns false when deployment is blocked', () => {
    const result: TestSuiteResult = {
      platform: 'web',
      totalTests: 10,
      passedTests: 5,
      failedTests: 5,
      passRate: 0.5,
      allCriticalPassed: false,
      results: [],
      totalDurationMs: 100,
      completedAt: new Date().toISOString(),
    }

    expect(shouldAllowDeployment(result)).toBe(false)
  })
})

describe('test constants', () => {
  it('exports critical crisis URLs', () => {
    expect(CRITICAL_CRISIS_URLS.length).toBeGreaterThan(0)
    expect(CRITICAL_CRISIS_URLS).toContain('988lifeline.org')
    expect(CRITICAL_CRISIS_URLS).toContain('rainn.org')
  })

  it('exports fuzzy test cases', () => {
    expect(FUZZY_TEST_CASES.length).toBeGreaterThan(0)
    const matchingCases = FUZZY_TEST_CASES.filter((c) => c.shouldMatch)
    const blocklistCases = FUZZY_TEST_CASES.filter((c) => !c.shouldMatch)
    expect(matchingCases.length).toBeGreaterThan(0)
    expect(blocklistCases.length).toBeGreaterThan(0)
  })

  it('exports non-crisis URLs for false positive testing', () => {
    expect(NON_CRISIS_URLS.length).toBeGreaterThan(0)
    expect(NON_CRISIS_URLS).toContain('google.com')
    expect(NON_CRISIS_URLS).toContain('facebook.com')
  })
})
