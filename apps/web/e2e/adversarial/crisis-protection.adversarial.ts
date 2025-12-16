/**
 * Crisis Protection Adversarial Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 6
 *
 * CRITICAL: These tests enforce INV-001 - Crisis URLs NEVER captured
 *
 * These are adversarial tests that verify the zero-data-path is
 * properly implemented and no crisis URL visit data can be captured.
 */

import { test, expect } from '@playwright/test'
// Note: E2E tests use relative imports as they run in a different context
// than the main app and don't have access to the @/ alias resolution
import {
  shouldBlockMonitoring,
  crisisGuard,
} from '../../src/services/crisisProtectionService'
import { getCrisisAllowlist, isCrisisUrl } from '@fledgely/shared'

/**
 * INV-001: Crisis URLs NEVER captured
 *
 * This is the architectural invariant that must NEVER be violated.
 * These tests verify that crisis URL visits produce absolutely ZERO
 * logged data across ALL monitoring systems.
 */
test.describe('INV-001: Crisis URLs NEVER captured', () => {
  test.describe('Zero-Data-Path Verification (AC: 1-5)', () => {
    test('visiting crisis URL blocks ALL monitoring', () => {
      const crisisUrl = 'https://988lifeline.org'

      // Verify URL is recognized as crisis URL
      expect(isCrisisUrl(crisisUrl)).toBe(true)

      // Verify all blocking functions return true
      expect(crisisGuard.shouldBlock(crisisUrl)).toBe(true)
      expect(crisisGuard.shouldBlockScreenshot(crisisUrl)).toBe(true)
      expect(crisisGuard.shouldBlockUrlLogging(crisisUrl)).toBe(true)
      expect(crisisGuard.shouldBlockTimeTracking(crisisUrl)).toBe(true)
      expect(crisisGuard.shouldBlockNotification(crisisUrl)).toBe(true)
      expect(crisisGuard.shouldBlockAnalytics(crisisUrl)).toBe(true)
    })

    test('all allowlisted URLs trigger zero-data-path', () => {
      const allowlist = getCrisisAllowlist()

      // Every entry in the allowlist must trigger protection
      for (const entry of allowlist.entries) {
        const url = `https://${entry.domain}`

        expect(isCrisisUrl(url)).toBe(true)
        expect(crisisGuard.shouldBlock(url)).toBe(true)

        // Also check aliases
        for (const alias of entry.aliases) {
          const aliasUrl = `https://${alias}`
          expect(isCrisisUrl(aliasUrl)).toBe(true)
          expect(crisisGuard.shouldBlock(aliasUrl)).toBe(true)
        }
      }
    })

    test('non-crisis URLs do NOT trigger zero-data-path', () => {
      const normalUrls = [
        'https://google.com',
        'https://youtube.com',
        'https://facebook.com',
        'https://twitter.com',
        'https://tiktok.com',
      ]

      for (const url of normalUrls) {
        expect(isCrisisUrl(url)).toBe(false)
        expect(crisisGuard.shouldBlock(url)).toBe(false)
      }
    })
  })

  test.describe('Synchronous Blocking (AC: 6)', () => {
    test('check is synchronous - not a promise', () => {
      const url = 'https://988lifeline.org'

      const result = shouldBlockMonitoring(url)

      // Must return boolean directly, NOT a promise
      expect(result).not.toBeInstanceOf(Promise)
      expect(typeof result).toBe('boolean')
    })

    test('check executes before capture could proceed', () => {
      // Simulate a monitoring flow
      const captureLog: string[] = []

      // The check MUST happen first
      const url = 'https://988lifeline.org'

      captureLog.push('check_started')
      const shouldBlock = crisisGuard.shouldBlock(url)
      captureLog.push(`check_completed:${shouldBlock}`)

      if (!shouldBlock) {
        captureLog.push('capture_attempted')
      }

      // Verify sequence
      expect(captureLog[0]).toBe('check_started')
      expect(captureLog[1]).toBe('check_completed:true')
      expect(captureLog).not.toContain('capture_attempted')
    })

    test('check completes within 10ms target', () => {
      const url = 'https://988lifeline.org'

      const start = performance.now()
      shouldBlockMonitoring(url)
      const duration = performance.now() - start

      // Target: <10ms
      expect(duration).toBeLessThan(10)
    })
  })

  test.describe('Specific Crisis Resources', () => {
    // Test critical US crisis resources
    const usCrisisResources = [
      '988lifeline.org',
      'suicidepreventionlifeline.org',
      'rainn.org',
      'thehotline.org',
      'thetrevorproject.org',
      'childhelp.org',
      'crisistextline.org',
    ]

    for (const domain of usCrisisResources) {
      test(`${domain} triggers zero-data-path`, () => {
        const url = `https://${domain}`
        expect(crisisGuard.shouldBlock(url)).toBe(true)
      })
    }

    // Test international resources
    const internationalResources = [
      'samaritans.org', // UK
      'papyrus-uk.org', // UK
      'crisisservicescanada.ca', // Canada
      'lifeline.org.au', // Australia
      'beyondblue.org.au', // Australia
    ]

    for (const domain of internationalResources) {
      test(`${domain} (international) triggers zero-data-path`, () => {
        const url = `https://${domain}`
        expect(crisisGuard.shouldBlock(url)).toBe(true)
      })
    }
  })

  test.describe('URL Variations', () => {
    test('subdomains trigger protection', () => {
      // Wildcards like *.988lifeline.org should be protected
      expect(crisisGuard.shouldBlock('https://chat.988lifeline.org')).toBe(true)
      expect(crisisGuard.shouldBlock('https://www.988lifeline.org')).toBe(true)
    })

    test('paths trigger protection', () => {
      expect(crisisGuard.shouldBlock('https://988lifeline.org/get-help')).toBe(
        true
      )
      expect(
        crisisGuard.shouldBlock('https://rainn.org/resources/about-sexual-assault')
      ).toBe(true)
    })

    test('query parameters trigger protection', () => {
      expect(
        crisisGuard.shouldBlock('https://988lifeline.org?source=app')
      ).toBe(true)
    })

    test('fragments trigger protection', () => {
      expect(
        crisisGuard.shouldBlock('https://988lifeline.org#resources')
      ).toBe(true)
    })
  })

  test.describe('Edge Cases and Attack Vectors', () => {
    test('handles null URL safely', () => {
      expect(shouldBlockMonitoring(null as unknown as string)).toBe(false)
    })

    test('handles undefined URL safely', () => {
      expect(shouldBlockMonitoring(undefined as unknown as string)).toBe(false)
    })

    test('handles empty string safely', () => {
      expect(shouldBlockMonitoring('')).toBe(false)
    })

    test('handles malformed URLs safely', () => {
      expect(shouldBlockMonitoring('not-a-url')).toBe(false)
      expect(shouldBlockMonitoring('://invalid')).toBe(false)
    })

    test('case sensitivity does not bypass protection', () => {
      // Domain matching should be case-insensitive
      expect(isCrisisUrl('https://988LIFELINE.ORG')).toBe(true)
      expect(isCrisisUrl('https://988Lifeline.Org')).toBe(true)
    })
  })

  test.describe('Allowlist Coverage Verification', () => {
    test('allowlist has minimum expected entries', () => {
      const allowlist = getCrisisAllowlist()

      // Should have at least 15 entries (we have 18)
      expect(allowlist.entries.length).toBeGreaterThanOrEqual(15)
    })

    test('allowlist covers all required categories', () => {
      const allowlist = getCrisisAllowlist()
      const categories = new Set(allowlist.entries.map((e) => e.category))

      expect(categories.has('suicide')).toBe(true)
      expect(categories.has('mental_health')).toBe(true)
      expect(categories.has('domestic_abuse')).toBe(true)
      expect(categories.has('sexual_assault')).toBe(true)
      expect(categories.has('child_abuse')).toBe(true)
      expect(categories.has('lgbtq_support')).toBe(true)
    })

    test('allowlist covers all required regions', () => {
      const allowlist = getCrisisAllowlist()
      const regions = new Set(allowlist.entries.map((e) => e.region))

      expect(regions.has('us')).toBe(true)
      expect(regions.has('uk')).toBe(true)
      expect(regions.has('canada')).toBe(true)
      expect(regions.has('australia')).toBe(true)
    })
  })
})

/**
 * Guard Integration Tests
 *
 * Verify guards are correctly integrated with monitoring flows.
 */
test.describe('Guard Integration', () => {
  test('crisisGuard is properly exported', () => {
    expect(crisisGuard).toBeDefined()
    expect(typeof crisisGuard.shouldBlock).toBe('function')
    expect(typeof crisisGuard.shouldBlockScreenshot).toBe('function')
    expect(typeof crisisGuard.shouldBlockUrlLogging).toBe('function')
    expect(typeof crisisGuard.shouldBlockTimeTracking).toBe('function')
    expect(typeof crisisGuard.shouldBlockNotification).toBe('function')
    expect(typeof crisisGuard.shouldBlockAnalytics).toBe('function')
  })

  test('all guard methods are synchronous', () => {
    const url = 'https://988lifeline.org'

    const results = [
      crisisGuard.shouldBlock(url),
      crisisGuard.shouldBlockScreenshot(url),
      crisisGuard.shouldBlockUrlLogging(url),
      crisisGuard.shouldBlockTimeTracking(url),
      crisisGuard.shouldBlockNotification(url),
      crisisGuard.shouldBlockAnalytics(url),
    ]

    for (const result of results) {
      expect(result).not.toBeInstanceOf(Promise)
      expect(typeof result).toBe('boolean')
    }
  })
})
