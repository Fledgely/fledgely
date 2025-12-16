/**
 * Allowlist Presence & Parse Tests
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 2
 *
 * Verifies that the bundled allowlist is present, valid, and parseable.
 * These are CRITICAL tests - deployment MUST be blocked if they fail.
 */

import { describe, it, expect } from 'vitest'
import {
  getCrisisAllowlist,
  getAllowlistVersion,
  getParsedAllowlistVersion,
  getAllCategories,
  getAllRegions,
  getCrisisResourceCount,
} from '../../constants/crisis-urls'
import { crisisUrlEntrySchema, crisisAllowlistSchema } from '../../constants/crisis-urls/schema'
import { CRITICAL_CRISIS_URLS } from '../allowlistTestHarness'

// ============================================================================
// Presence Tests
// ============================================================================

describe('Allowlist Presence Tests', () => {
  describe('allowlist is available', () => {
    it('getCrisisAllowlist returns non-empty allowlist', () => {
      const allowlist = getCrisisAllowlist()

      expect(allowlist).toBeDefined()
      expect(allowlist.entries).toBeDefined()
      expect(Array.isArray(allowlist.entries)).toBe(true)
      expect(allowlist.entries.length).toBeGreaterThan(0)
    })

    it('allowlist has minimum required entries (≥10)', () => {
      const allowlist = getCrisisAllowlist()

      // Safety check: we must have a reasonable number of crisis resources
      expect(allowlist.entries.length).toBeGreaterThanOrEqual(10)
    })

    it('getCrisisResourceCount returns positive number', () => {
      const count = getCrisisResourceCount()

      expect(count).toBeGreaterThan(0)
    })
  })

  describe('version is valid', () => {
    it('getAllowlistVersion returns valid version string', () => {
      const version = getAllowlistVersion()

      expect(version).toBeDefined()
      expect(typeof version).toBe('string')
      expect(version.length).toBeGreaterThan(0)
    })

    it('version follows semantic versioning format', () => {
      const version = getAllowlistVersion()

      // Should match: 1.0.0, 1.0.0-2025-12-16T12:00:00Z, or 1.0.0-emergency-abc123
      const semanticVersionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9:\-]+)?$/
      expect(version).toMatch(semanticVersionRegex)
    })

    it('getParsedAllowlistVersion returns valid parsed version', () => {
      const parsed = getParsedAllowlistVersion()

      expect(parsed).toBeDefined()
      expect(parsed!.major).toBeGreaterThanOrEqual(0)
      expect(parsed!.minor).toBeGreaterThanOrEqual(0)
      expect(parsed!.patch).toBeGreaterThanOrEqual(0)
      // timestamp should be a Date object
      expect(parsed!.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('allowlist has valid lastUpdated', () => {
    it('lastUpdated is a valid ISO date string', () => {
      const allowlist = getCrisisAllowlist()

      expect(allowlist.lastUpdated).toBeDefined()
      const date = new Date(allowlist.lastUpdated)
      expect(date.toString()).not.toBe('Invalid Date')
    })

    it('lastUpdated is not in the future', () => {
      const allowlist = getCrisisAllowlist()
      const lastUpdated = new Date(allowlist.lastUpdated)
      const now = new Date()

      // Allow 1 minute tolerance for timing issues
      const tolerance = 60 * 1000
      expect(lastUpdated.getTime()).toBeLessThanOrEqual(now.getTime() + tolerance)
    })
  })
})

// ============================================================================
// Parse Tests
// ============================================================================

describe('Allowlist Parse Tests', () => {
  describe('allowlist validates against schema', () => {
    it('full allowlist passes schema validation', () => {
      const allowlist = getCrisisAllowlist()

      const result = crisisAllowlistSchema.safeParse(allowlist)
      expect(result.success).toBe(true)
    })

    it('each entry passes entry schema validation', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        const result = crisisUrlEntrySchema.safeParse(entry)
        expect(result.success).toBe(
          true,
          `Entry ${entry.domain} failed validation: ${result.success ? '' : result.error?.message}`
        )
      }
    })
  })

  describe('all entries have required fields', () => {
    it('every entry has domain', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(entry.domain).toBeDefined()
        expect(typeof entry.domain).toBe('string')
        expect(entry.domain.length).toBeGreaterThan(0)
      }
    })

    it('every entry has category', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(entry.category).toBeDefined()
        expect(typeof entry.category).toBe('string')
        expect(entry.category.length).toBeGreaterThan(0)
      }
    })

    it('every entry has region', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(entry.region).toBeDefined()
        expect(typeof entry.region).toBe('string')
        expect(entry.region.length).toBeGreaterThan(0)
      }
    })

    it('every entry has name and description', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(entry.name).toBeDefined()
        expect(entry.name.length).toBeGreaterThan(0)
        expect(entry.description).toBeDefined()
        expect(entry.description.length).toBeGreaterThan(0)
      }
    })

    it('every entry has aliases array', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(Array.isArray(entry.aliases)).toBe(true)
      }
    })

    it('every entry has wildcardPatterns array', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(Array.isArray(entry.wildcardPatterns)).toBe(true)
      }
    })

    it('every entry has at least one contact method', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(entry.contactMethods).toBeDefined()
        expect(Array.isArray(entry.contactMethods)).toBe(true)
        expect(entry.contactMethods.length).toBeGreaterThan(
          0,
          `Entry ${entry.domain} has no contact methods`
        )
      }
    })

    it('every contact method is a valid type', () => {
      const allowlist = getCrisisAllowlist()
      const validMethods = ['phone', 'text', 'chat', 'email', 'web']

      for (const entry of allowlist.entries) {
        for (const method of entry.contactMethods) {
          expect(validMethods).toContain(method)
        }
      }
    })
  })

  describe('categories and regions are valid', () => {
    it('getAllCategories returns non-empty array', () => {
      const categories = getAllCategories()

      expect(categories.length).toBeGreaterThan(0)
    })

    it('getAllRegions returns non-empty array', () => {
      const regions = getAllRegions()

      expect(regions.length).toBeGreaterThan(0)
    })

    it('all entries have known categories', () => {
      const allowlist = getCrisisAllowlist()
      const categories = getAllCategories()

      for (const entry of allowlist.entries) {
        expect(categories).toContain(entry.category)
      }
    })
  })
})

// ============================================================================
// Critical Crisis URLs Tests
// ============================================================================

describe('Critical Crisis URLs', () => {
  it('all critical crisis URLs are present in allowlist', () => {
    const allowlist = getCrisisAllowlist()
    const domains = new Set(
      allowlist.entries.map((e) => e.domain.toLowerCase().replace(/^www\./, ''))
    )

    // Also collect aliases
    for (const entry of allowlist.entries) {
      for (const alias of entry.aliases) {
        domains.add(alias.toLowerCase().replace(/^www\./, ''))
      }
    }

    for (const criticalUrl of CRITICAL_CRISIS_URLS) {
      const normalized = criticalUrl.toLowerCase().replace(/^www\./, '')
      expect(domains.has(normalized)).toBe(
        true,
        `Critical URL ${criticalUrl} is missing from allowlist`
      )
    }
  })

  it('988lifeline.org has correct contact info', () => {
    const allowlist = getCrisisAllowlist()
    const entry = allowlist.entries.find(
      (e) => e.domain.toLowerCase() === '988lifeline.org'
    )

    expect(entry).toBeDefined()
    expect(entry!.contactMethods).toContain('phone')
    expect(entry!.phoneNumber).toBe('988')
  })

  it('all critical URLs have phone or text contact method', () => {
    const allowlist = getCrisisAllowlist()

    for (const criticalUrl of CRITICAL_CRISIS_URLS) {
      const normalized = criticalUrl.toLowerCase().replace(/^www\./, '')
      const entry = allowlist.entries.find(
        (e) =>
          e.domain.toLowerCase().replace(/^www\./, '') === normalized ||
          e.aliases.some(
            (a) => a.toLowerCase().replace(/^www\./, '') === normalized
          )
      )

      if (entry) {
        // Should have phone or text as contact method
        const hasQuickContact =
          entry.contactMethods.includes('phone') ||
          entry.contactMethods.includes('text')
        expect(hasQuickContact).toBe(
          true,
          `Critical URL ${criticalUrl} should have phone or text contact`
        )
      }
    }
  })
})

// ============================================================================
// Domain Format Tests
// ============================================================================

describe('Domain Format Tests', () => {
  it('domains are properly formatted (no protocol)', () => {
    const allowlist = getCrisisAllowlist()

    for (const entry of allowlist.entries) {
      expect(entry.domain).not.toMatch(/^https?:\/\//)
      expect(entry.domain).not.toMatch(/^\/\//)
    }
  })

  it('domains have valid TLDs', () => {
    const allowlist = getCrisisAllowlist()
    const validTlds = ['org', 'com', 'net', 'gov', 'edu', 'co', 'io', 'us', 'uk', 'ca', 'au', 'tv']

    for (const entry of allowlist.entries) {
      const parts = entry.domain.split('.')
      const tld = parts[parts.length - 1].toLowerCase()
      expect(validTlds).toContain(tld)
    }
  })

  it('wildcard patterns start with *.', () => {
    const allowlist = getCrisisAllowlist()

    for (const entry of allowlist.entries) {
      for (const pattern of entry.wildcardPatterns) {
        expect(pattern.startsWith('*.')).toBe(
          true,
          `Wildcard pattern ${pattern} should start with *.`
        )
      }
    }
  })

  it('no duplicate domains in allowlist', () => {
    const allowlist = getCrisisAllowlist()
    const domains = allowlist.entries.map((e) =>
      e.domain.toLowerCase().replace(/^www\./, '')
    )
    const uniqueDomains = new Set(domains)

    expect(domains.length).toBe(uniqueDomains.size)
  })
})
