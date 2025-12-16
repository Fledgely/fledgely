/**
 * Fuzzy Domain Matching Integration Tests
 *
 * Story 7.5: Fuzzy Domain Matching - Task 9
 *
 * End-to-end integration tests for the fuzzy matching system.
 * Tests against the real allowlist data.
 */

import { describe, it, expect } from 'vitest'
import {
  isCrisisUrl,
  isCrisisUrlFuzzy,
  getCrisisAllowlist,
  fuzzyDomainMatch,
  levenshteinDistance,
  MAX_LEVENSHTEIN_DISTANCE,
  MIN_DOMAIN_LENGTH,
  MIN_LENGTH_RATIO,
} from '../index'
import type { CrisisUrlEntry } from '../schema'

describe('Fuzzy Matching Integration Tests', () => {
  /**
   * 9.2: Test common typo scenarios
   */
  describe('Common Typo Scenarios (AC: 3)', () => {
    const allowlist = getCrisisAllowlist()

    it('matches 988lifline.org to 988lifeline.org (missing "e")', () => {
      const result = isCrisisUrlFuzzy('988lifline.org')

      expect(result.match).toBe(true)
      expect(result.fuzzy).toBe(true)
      expect(result.entry?.domain).toBe('988lifeline.org')
      expect(result.distance).toBe(1)
    })

    it('matches crisistxtline.org to crisistextline.org (missing "e")', () => {
      const result = isCrisisUrlFuzzy('crisistxtline.org')

      expect(result.match).toBe(true)
      expect(result.fuzzy).toBe(true)
      expect(result.entry?.domain).toBe('crisistextline.org')
      expect(result.distance).toBe(1)
    })

    it('matches exact domains without fuzzy', () => {
      const result = isCrisisUrlFuzzy('988lifeline.org')

      expect(result.match).toBe(true)
      expect(result.fuzzy).toBe(false)
      expect(result.entry?.domain).toBe('988lifeline.org')
    })

    it('matches aliases exactly without fuzzy', () => {
      const result = isCrisisUrlFuzzy('suicidepreventionlifeline.org')

      expect(result.match).toBe(true)
      expect(result.fuzzy).toBe(false)
    })

    it('handles URL with https:// prefix', () => {
      const result = isCrisisUrlFuzzy('https://988lifline.org')

      expect(result.match).toBe(true)
    })

    it('handles URL with www prefix', () => {
      const result = isCrisisUrlFuzzy('www.988lifline.org')

      expect(result.match).toBe(true)
    })

    it('handles URL with path', () => {
      const result = isCrisisUrlFuzzy('https://988lifline.org/get-help')

      expect(result.match).toBe(true)
    })
  })

  /**
   * 9.3: False positive prevention
   */
  describe('False Positive Prevention (AC: 5)', () => {
    it('google.com should NOT match any crisis domain', () => {
      const result = isCrisisUrlFuzzy('google.com')

      expect(result.match).toBe(false)
      expect(result.fuzzy).toBe(false)
    })

    it('facebook.com should NOT match any crisis domain', () => {
      const result = isCrisisUrlFuzzy('facebook.com')

      expect(result.match).toBe(false)
    })

    it('youtube.com should NOT match any crisis domain', () => {
      const result = isCrisisUrlFuzzy('youtube.com')

      expect(result.match).toBe(false)
    })

    it('amazon.com should NOT match any crisis domain', () => {
      const result = isCrisisUrlFuzzy('amazon.com')

      expect(result.match).toBe(false)
    })

    it('twitter.com should NOT match any crisis domain', () => {
      const result = isCrisisUrlFuzzy('twitter.com')

      expect(result.match).toBe(false)
    })

    it('random.org should NOT match any crisis domain', () => {
      const result = isCrisisUrlFuzzy('random.org')

      expect(result.match).toBe(false)
    })

    it('thetrevoproject.com (wrong TLD) should NOT match .org domain', () => {
      const result = isCrisisUrlFuzzy('thetrevorproject.com')

      expect(result.match).toBe(false)
    })

    it('988lifeline.com (wrong TLD) should NOT match .org domain', () => {
      const result = isCrisisUrlFuzzy('988lifeline.com')

      expect(result.match).toBe(false)
    })

    it('very short domains should NOT fuzzy match', () => {
      const result = isCrisisUrlFuzzy('988.org')

      expect(result.match).toBe(false)
    })

    it('completely different long domains should NOT match', () => {
      const result = isCrisisUrlFuzzy('sometotallyunrelatedwebsite.org')

      expect(result.match).toBe(false)
    })
  })

  /**
   * 9.4: Subdomain handling
   */
  describe('Subdomain Handling (AC: 2)', () => {
    it('matches help.988lifeline.org via wildcard pattern', () => {
      // First check exact match works for subdomains
      expect(isCrisisUrl('help.988lifeline.org')).toBe(true)
    })

    it('matches chat.988lifeline.org via wildcard pattern', () => {
      expect(isCrisisUrl('chat.988lifeline.org')).toBe(true)
    })

    it('matches deeply nested subdomains', () => {
      expect(isCrisisUrl('a.b.c.988lifeline.org')).toBe(true)
    })

    it('does NOT fuzzy match typo in subdomain (only base domain)', () => {
      // The fuzzy matching focuses on the main domain, not subdomains
      // This is intentional - subdomains are matched via wildcards
      const result = isCrisisUrlFuzzy('hlep.988lifeline.org')

      // This should match because of the *.988lifeline.org wildcard
      // The subdomain "hlep" is just passed through, wildcard matches any subdomain
      expect(result.match).toBe(true)
    })
  })

  /**
   * 9.5: Performance testing
   */
  describe('Performance (< 10ms overhead)', () => {
    const allowlist = getCrisisAllowlist()
    const iterations = 100

    it('exact URL check completes quickly', () => {
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        isCrisisUrl('https://988lifeline.org')
      }

      const duration = performance.now() - start
      const avgMs = duration / iterations

      expect(avgMs).toBeLessThan(1) // Sub-millisecond for exact
    })

    it('fuzzy URL check completes within threshold', () => {
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        isCrisisUrlFuzzy('https://988lifline.org')
      }

      const duration = performance.now() - start
      const avgMs = duration / iterations

      // Should be < 10ms per check
      expect(avgMs).toBeLessThan(10)
    })

    it('non-matching domains complete quickly', () => {
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        isCrisisUrlFuzzy('https://google.com')
      }

      const duration = performance.now() - start
      const avgMs = duration / iterations

      expect(avgMs).toBeLessThan(10)
    })

    it('fuzzyDomainMatch with full allowlist is performant', () => {
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        fuzzyDomainMatch('988lifline.org', allowlist.entries)
      }

      const duration = performance.now() - start
      const avgMs = duration / iterations

      expect(avgMs).toBeLessThan(10)
    })
  })

  /**
   * Constants validation
   */
  describe('Constants Configuration', () => {
    it('MAX_LEVENSHTEIN_DISTANCE is 2', () => {
      expect(MAX_LEVENSHTEIN_DISTANCE).toBe(2)
    })

    it('MIN_DOMAIN_LENGTH is 5', () => {
      expect(MIN_DOMAIN_LENGTH).toBe(5)
    })

    it('MIN_LENGTH_RATIO is 0.7', () => {
      expect(MIN_LENGTH_RATIO).toBe(0.7)
    })
  })

  /**
   * Algorithm correctness
   */
  describe('Levenshtein Algorithm Correctness', () => {
    it('calculates distance correctly for insertions', () => {
      expect(levenshteinDistance('cat', 'cats')).toBe(1)
      expect(levenshteinDistance('cat', 'catch')).toBe(2)
    })

    it('calculates distance correctly for deletions', () => {
      expect(levenshteinDistance('cats', 'cat')).toBe(1)
      expect(levenshteinDistance('catch', 'cat')).toBe(2)
    })

    it('calculates distance correctly for substitutions', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1)
      expect(levenshteinDistance('cat', 'dog')).toBe(3)
    })

    it('calculates classic examples correctly', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
    })

    it('handles edge cases', () => {
      expect(levenshteinDistance('', '')).toBe(0)
      expect(levenshteinDistance('', 'abc')).toBe(3)
      expect(levenshteinDistance('abc', '')).toBe(3)
      expect(levenshteinDistance('same', 'same')).toBe(0)
    })
  })

  /**
   * End-to-end integration with real allowlist
   */
  describe('Real Allowlist Integration', () => {
    it('all allowlist entries can be matched exactly', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        expect(isCrisisUrl(entry.domain)).toBe(true)
      }
    })

    it('all allowlist aliases can be matched exactly', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        for (const alias of entry.aliases) {
          expect(isCrisisUrl(alias)).toBe(true)
        }
      }
    })

    it('isCrisisUrlFuzzy returns correct entry for all domains', () => {
      const allowlist = getCrisisAllowlist()

      for (const entry of allowlist.entries) {
        const result = isCrisisUrlFuzzy(entry.domain)
        expect(result.match).toBe(true)
        expect(result.fuzzy).toBe(false)
        expect(result.entry?.id).toBe(entry.id)
      }
    })
  })
})
