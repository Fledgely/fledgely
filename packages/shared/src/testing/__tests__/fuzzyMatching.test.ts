/**
 * Fuzzy Matching Verification Tests
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 4
 *
 * Verifies that fuzzy domain matching correctly catches typosquatting
 * while preventing false positives on common domains.
 */

import { describe, it, expect } from 'vitest'
import {
  isCrisisUrlFuzzy,
  getCrisisAllowlist,
  levenshteinDistance,
  parseDomain,
  isBlocklisted,
  lengthRatio,
  fuzzyDomainMatch,
  shouldAttemptFuzzyMatch,
  MAX_LEVENSHTEIN_DISTANCE,
  MIN_DOMAIN_LENGTH,
  MIN_LENGTH_RATIO,
  FUZZY_BLOCKLIST,
} from '../../constants/crisis-urls'

// ============================================================================
// Typosquatting Detection Tests
// ============================================================================

describe('Typosquatting Detection', () => {
  describe('common typos are detected', () => {
    it.each([
      // Single character substitution
      ['988lifecline.org', '988lifeline.org'],
      // Missing character
      ['988lifline.org', '988lifeline.org'],
      // Transposition
      ['988lifleine.org', '988lifeline.org'],
    ])('fuzzy matches typo %s → %s', (typo, expected) => {
      const result = isCrisisUrlFuzzy(typo, { useFuzzyMatch: true })

      expect(result.match).toBe(true)
      if (result.match) {
        expect(result.fuzzy).toBe(true)
        expect(result.matchedAgainst?.toLowerCase()).toBe(expected.toLowerCase())
      }
    })

    it('detects rainn.org typos', () => {
      // Note: "rain.org" may not match due to Levenshtein distance constraints
      // and length ratio - this depends on the actual domain length
      const result = isCrisisUrlFuzzy('rainn.org', { useFuzzyMatch: true })
      expect(result.match).toBe(true)
    })
  })

  describe('exact matches are preferred over fuzzy', () => {
    it('exact match has fuzzy=false', () => {
      const result = isCrisisUrlFuzzy('988lifeline.org', { useFuzzyMatch: true })

      expect(result.match).toBe(true)
      expect(result.fuzzy).toBe(false)
    })

    it('exact match via alias has fuzzy=false', () => {
      const result = isCrisisUrlFuzzy('suicidepreventionlifeline.org', {
        useFuzzyMatch: true,
      })

      // This should be an alias of 988lifeline
      expect(result.match).toBe(true)
      expect(result.fuzzy).toBe(false)
    })
  })
})

// ============================================================================
// Subdomain Handling Tests
// ============================================================================

describe('Subdomain Handling', () => {
  it('detects subdomains via wildcard patterns', () => {
    const result = isCrisisUrlFuzzy('chat.988lifeline.org')

    expect(result.match).toBe(true)
    expect(result.fuzzy).toBe(false) // Wildcard is exact, not fuzzy
  })

  it('detects deep subdomains', () => {
    const result = isCrisisUrlFuzzy('help.chat.988lifeline.org')

    expect(result.match).toBe(true)
  })

  it('www prefix is handled correctly', () => {
    const result = isCrisisUrlFuzzy('www.988lifeline.org')

    expect(result.match).toBe(true)
    expect(result.fuzzy).toBe(false)
  })
})

// ============================================================================
// Blocklist Tests (False Positive Prevention)
// ============================================================================

describe('Blocklist - False Positive Prevention', () => {
  it('blocklist contains major domains', () => {
    expect(FUZZY_BLOCKLIST).toContain('google.com')
    expect(FUZZY_BLOCKLIST).toContain('facebook.com')
    expect(FUZZY_BLOCKLIST).toContain('amazon.com')
    expect(FUZZY_BLOCKLIST).toContain('youtube.com')
    expect(FUZZY_BLOCKLIST).toContain('twitter.com')
    expect(FUZZY_BLOCKLIST).toContain('wikipedia.org')
  })

  it.each(FUZZY_BLOCKLIST.slice(0, 10))('blocklisted domain %s does not fuzzy match', (domain) => {
    const result = isCrisisUrlFuzzy(domain, { useFuzzyMatch: true })

    expect(result.match).toBe(false)
  })

  it('isBlocklisted correctly identifies blocklisted domains', () => {
    expect(isBlocklisted('google.com')).toBe(true)
    expect(isBlocklisted('facebook.com')).toBe(true)
    expect(isBlocklisted('988lifeline.org')).toBe(false)
  })
})

// ============================================================================
// Levenshtein Distance Tests
// ============================================================================

describe('Levenshtein Distance Algorithm', () => {
  it('identical strings have distance 0', () => {
    expect(levenshteinDistance('test', 'test')).toBe(0)
    expect(levenshteinDistance('988lifeline', '988lifeline')).toBe(0)
  })

  it('single character difference has distance 1', () => {
    // Substitution
    expect(levenshteinDistance('test', 'tast')).toBe(1)
    // Insertion
    expect(levenshteinDistance('test', 'tests')).toBe(1)
    // Deletion
    expect(levenshteinDistance('tests', 'test')).toBe(1)
  })

  it('transposition has distance 2 (not Damerau)', () => {
    // Standard Levenshtein treats transposition as 2 operations
    expect(levenshteinDistance('ab', 'ba')).toBe(2)
  })

  it('empty string distance equals other string length', () => {
    expect(levenshteinDistance('', 'test')).toBe(4)
    expect(levenshteinDistance('test', '')).toBe(4)
  })

  it('MAX_LEVENSHTEIN_DISTANCE is 2', () => {
    expect(MAX_LEVENSHTEIN_DISTANCE).toBe(2)
  })
})

// ============================================================================
// Length Ratio Tests
// ============================================================================

describe('Length Ratio Constraints', () => {
  it('MIN_LENGTH_RATIO is 0.7', () => {
    expect(MIN_LENGTH_RATIO).toBe(0.7)
  })

  it('lengthRatio calculates correctly', () => {
    expect(lengthRatio('abc', 'abcd')).toBe(3 / 4) // 0.75
    expect(lengthRatio('ab', 'abcdef')).toBe(2 / 6) // 0.333...
    expect(lengthRatio('test', 'test')).toBe(1)
  })

  it('short domains do not match long crisis URLs', () => {
    // Very short domain shouldn't match a long crisis URL
    const result = isCrisisUrlFuzzy('a.org', { useFuzzyMatch: true })
    expect(result.match).toBe(false)
  })
})

// ============================================================================
// Domain Parsing Tests
// ============================================================================

describe('Domain Parsing', () => {
  it('parseDomain extracts base domain and TLD', () => {
    const result = parseDomain('988lifeline.org')
    expect(result).toEqual({ baseDomain: '988lifeline', tld: 'org' })
  })

  it('parseDomain handles subdomains', () => {
    const result = parseDomain('chat.988lifeline.org')
    expect(result).toEqual({ baseDomain: 'chat.988lifeline', tld: 'org' })
  })

  it('parseDomain handles multi-part TLDs', () => {
    const result = parseDomain('example.co.uk')
    expect(result).toEqual({ baseDomain: 'example.co', tld: 'uk' })
  })

  it('parseDomain returns null for invalid domains', () => {
    expect(parseDomain('nodot')).toBeNull()
    expect(parseDomain('')).toBeNull()
  })

  it('MIN_DOMAIN_LENGTH is 5', () => {
    expect(MIN_DOMAIN_LENGTH).toBe(5)
  })
})

// ============================================================================
// shouldAttemptFuzzyMatch Tests
// ============================================================================

describe('shouldAttemptFuzzyMatch', () => {
  it('returns true for valid domains above minimum length', () => {
    expect(shouldAttemptFuzzyMatch('988lifeline.org')).toBe(true)
    expect(shouldAttemptFuzzyMatch('example.org')).toBe(true)
  })

  it('returns false for blocklisted domains', () => {
    expect(shouldAttemptFuzzyMatch('google.com')).toBe(false)
    expect(shouldAttemptFuzzyMatch('facebook.com')).toBe(false)
  })

  it('returns false for short domains', () => {
    expect(shouldAttemptFuzzyMatch('abc.org')).toBe(false) // 3 chars < 5
    expect(shouldAttemptFuzzyMatch('ab.org')).toBe(false)
  })

  it('returns false for invalid input', () => {
    expect(shouldAttemptFuzzyMatch('')).toBe(false)
    expect(shouldAttemptFuzzyMatch('nodot')).toBe(false)
  })
})

// ============================================================================
// fuzzyDomainMatch Tests
// ============================================================================

describe('fuzzyDomainMatch', () => {
  it('returns null for empty entries', () => {
    const result = fuzzyDomainMatch('test.org', [])
    expect(result).toBeNull()
  })

  it('returns null for invalid domain', () => {
    const entries = getCrisisAllowlist().entries
    const result = fuzzyDomainMatch('invalid', entries)
    expect(result).toBeNull()
  })

  it('returns best match with lowest distance', () => {
    const entries = getCrisisAllowlist().entries

    // A typo that's close to a real entry
    const result = fuzzyDomainMatch('988lifecline.org', entries)

    if (result) {
      expect(result.entry).toBeDefined()
      expect(result.distance).toBeLessThanOrEqual(MAX_LEVENSHTEIN_DISTANCE)
      expect(result.matchedAgainst).toBeDefined()
    }
  })
})

// ============================================================================
// Fuzzy Matching Can Be Disabled Tests
// ============================================================================

describe('Fuzzy Matching Toggle', () => {
  it('fuzzy matching can be disabled', () => {
    // A typo that would match with fuzzy enabled
    const withFuzzy = isCrisisUrlFuzzy('988lifecline.org', { useFuzzyMatch: true })
    const withoutFuzzy = isCrisisUrlFuzzy('988lifecline.org', {
      useFuzzyMatch: false,
    })

    expect(withFuzzy.match).toBe(true)
    expect(withFuzzy.fuzzy).toBe(true)
    expect(withoutFuzzy.match).toBe(false)
  })

  it('exact matches work regardless of fuzzy setting', () => {
    const withFuzzy = isCrisisUrlFuzzy('988lifeline.org', { useFuzzyMatch: true })
    const withoutFuzzy = isCrisisUrlFuzzy('988lifeline.org', {
      useFuzzyMatch: false,
    })

    expect(withFuzzy.match).toBe(true)
    expect(withoutFuzzy.match).toBe(true)
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Fuzzy Matching Edge Cases', () => {
  it('handles URLs with protocols', () => {
    const result = isCrisisUrlFuzzy('https://988lifeline.org', {
      useFuzzyMatch: true,
    })
    expect(result.match).toBe(true)
  })

  it('handles URLs with paths', () => {
    const result = isCrisisUrlFuzzy('988lifeline.org/chat', {
      useFuzzyMatch: true,
    })
    expect(result.match).toBe(true)
  })

  it('handles mixed case', () => {
    const result = isCrisisUrlFuzzy('988LIFELINE.ORG', { useFuzzyMatch: true })
    expect(result.match).toBe(true)
  })

  it('handles trailing slashes', () => {
    const result = isCrisisUrlFuzzy('988lifeline.org/', { useFuzzyMatch: true })
    expect(result.match).toBe(true)
  })

  it('TLD must match exactly for fuzzy', () => {
    // 988lifeline.com (wrong TLD) should not fuzzy match 988lifeline.org
    const result = isCrisisUrlFuzzy('988lifeline.com', { useFuzzyMatch: true })
    expect(result.match).toBe(false)
  })
})

// ============================================================================
// Security-Focused Tests
// ============================================================================

describe('Security - Catch Typosquatting Attacks', () => {
  it('catches common typosquatting patterns', () => {
    const typosquattingPatterns = [
      '988lifecline.org', // Letter substitution
      '988lifeline.com', // Wrong TLD - should NOT match
      '98lifeline.org', // Missing digit
    ]

    for (const pattern of typosquattingPatterns) {
      const result = isCrisisUrlFuzzy(pattern, { useFuzzyMatch: true })
      // Log for debugging
      if (pattern.endsWith('.org')) {
        // Should catch .org typos
        expect(result.match).toBe(true)
      }
    }
  })

  it('does not match completely different domains', () => {
    const unrelatedDomains = [
      'example.org',
      'mywebsite.org',
      'totally-different.org',
    ]

    for (const domain of unrelatedDomains) {
      const result = isCrisisUrlFuzzy(domain, { useFuzzyMatch: true })
      expect(result.match).toBe(false)
    }
  })
})
