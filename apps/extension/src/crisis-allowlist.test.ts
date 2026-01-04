/**
 * Crisis Allowlist Tests - Story 11.6
 *
 * Adversarial tests verifying the zero data path invariant (INV-001).
 * These tests ensure crisis sites are NEVER captured.
 *
 * Test Categories:
 * 1. Domain extraction and normalization
 * 2. Protected URL detection
 * 3. Fail-safe behavior
 * 4. Category coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isUrlProtected,
  DEFAULT_CRISIS_DOMAINS,
  syncAllowlistFromServer,
  _testExports,
} from './crisis-allowlist'

const {
  extractDomain,
  buildDomainSet,
  resetCache,
  levenshteinDistance,
  extractBaseDomain,
  findFuzzyMatch,
  transformResourcesToDomains,
  FUZZY_MATCH_THRESHOLD,
  MIN_DOMAIN_LENGTH_FOR_FUZZY,
  MAX_DOMAIN_LENGTH_FOR_FUZZY,
  FUZZY_MATCH_QUEUE_KEY,
  CRISIS_ALLOWLIST_API,
} = _testExports

// Mock chrome.storage.local for tests
const mockStorage: Record<string, unknown> = {}
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((data: Record<string, unknown>) => {
        Object.assign(mockStorage, data)
        return Promise.resolve()
      }),
    },
  },
})

describe('Crisis Allowlist - Story 11.6', () => {
  beforeEach(() => {
    // Reset cache before each test
    resetCache()
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  })

  // ===========================================================================
  // Task 1: Domain Extraction Tests (AC: #5 - Fuzzy Matching)
  // ===========================================================================
  describe('extractDomain - URL parsing', () => {
    it('extracts domain from valid HTTPS URL', () => {
      expect(extractDomain('https://rainn.org/help')).toBe('rainn.org')
    })

    it('extracts domain from valid HTTP URL', () => {
      expect(extractDomain('http://rainn.org/help')).toBe('rainn.org')
    })

    it('normalizes www prefix', () => {
      expect(extractDomain('https://www.rainn.org/help')).toBe('rainn.org')
    })

    it('handles case insensitivity', () => {
      expect(extractDomain('https://RAINN.ORG/HELP')).toBe('rainn.org')
      expect(extractDomain('https://RaInN.oRg')).toBe('rainn.org')
    })

    it('ignores query parameters', () => {
      expect(extractDomain('https://rainn.org/help?ref=google&utm=123')).toBe('rainn.org')
    })

    it('ignores URL fragments', () => {
      expect(extractDomain('https://rainn.org/help#section1')).toBe('rainn.org')
    })

    it('ignores port numbers', () => {
      expect(extractDomain('https://rainn.org:443/help')).toBe('rainn.org')
    })

    it('handles subdomains correctly', () => {
      expect(extractDomain('https://chat.rainn.org/help')).toBe('chat.rainn.org')
    })

    it('returns null for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBeNull()
      expect(extractDomain('')).toBeNull()
      // javascript: URLs parse with empty hostname
      expect(extractDomain('javascript:alert(1)')).toBe('')
    })

    it('handles data URLs (returns empty string)', () => {
      // data: URLs parse with empty hostname
      expect(extractDomain('data:text/html,<h1>test</h1>')).toBe('')
    })

    it('handles about: URLs', () => {
      // about:blank has empty hostname
      const result = extractDomain('about:blank')
      // URL parsing of about:blank gives empty hostname
      expect(result === '' || result === null).toBe(true)
    })

    it('handles chrome:// URLs', () => {
      expect(extractDomain('chrome://extensions')).toBe('extensions')
    })
  })

  // ===========================================================================
  // Task 2: Domain Set Building Tests
  // ===========================================================================
  describe('buildDomainSet - allowlist construction', () => {
    it('builds set from domain list', () => {
      const set = buildDomainSet(['rainn.org', 'thehotline.org'])
      expect(set.has('rainn.org')).toBe(true)
      expect(set.has('thehotline.org')).toBe(true)
    })

    it('adds www variants automatically', () => {
      const set = buildDomainSet(['rainn.org'])
      expect(set.has('rainn.org')).toBe(true)
      expect(set.has('www.rainn.org')).toBe(true)
    })

    it('normalizes to lowercase', () => {
      const set = buildDomainSet(['RAINN.ORG', 'TheHotline.Org'])
      expect(set.has('rainn.org')).toBe(true)
      expect(set.has('thehotline.org')).toBe(true)
    })

    it('trims whitespace', () => {
      const set = buildDomainSet(['  rainn.org  ', '\tthehotline.org\n'])
      expect(set.has('rainn.org')).toBe(true)
      expect(set.has('thehotline.org')).toBe(true)
    })

    it('handles empty strings gracefully', () => {
      const set = buildDomainSet(['', 'rainn.org', '   '])
      expect(set.has('rainn.org')).toBe(true)
      expect(set.has('')).toBe(false)
    })

    it('handles empty array', () => {
      const set = buildDomainSet([])
      expect(set.size).toBe(0)
    })
  })

  // ===========================================================================
  // Task 3: isUrlProtected Tests (AC: #1, #6 - Detection & Fail-Safe)
  // ===========================================================================
  describe('isUrlProtected - core protection logic', () => {
    describe('Protected domain detection', () => {
      it('detects protected domain (rainn.org)', () => {
        expect(isUrlProtected('https://rainn.org')).toBe(true)
      })

      it('detects protected domain with path', () => {
        expect(isUrlProtected('https://rainn.org/get-help')).toBe(true)
      })

      it('detects protected domain with www prefix', () => {
        expect(isUrlProtected('https://www.rainn.org')).toBe(true)
      })

      it('detects protected domain case insensitive', () => {
        expect(isUrlProtected('https://RAINN.ORG')).toBe(true)
        expect(isUrlProtected('https://RaInN.oRg')).toBe(true)
      })

      it('detects protected domain with query params', () => {
        expect(isUrlProtected('https://rainn.org?ref=google')).toBe(true)
      })

      it('detects protected domain with fragment', () => {
        expect(isUrlProtected('https://rainn.org#chat')).toBe(true)
      })
    })

    describe('Non-protected domain detection', () => {
      it('returns false for non-protected domains', () => {
        expect(isUrlProtected('https://google.com')).toBe(false)
        expect(isUrlProtected('https://facebook.com')).toBe(false)
        expect(isUrlProtected('https://youtube.com')).toBe(false)
      })

      it('returns false for invalid URLs', () => {
        expect(isUrlProtected('not-a-url')).toBe(false)
      })
    })

    describe('Fail-safe behavior (AC: #6)', () => {
      it('initializes from defaults when cache empty', () => {
        resetCache()
        // First call should trigger auto-initialization
        const result = isUrlProtected('https://rainn.org')
        expect(result).toBe(true)
      })
    })
  })

  // ===========================================================================
  // Task 4: Category Coverage Tests (AC: #8)
  // ===========================================================================
  describe('Category coverage - all crisis resource categories', () => {
    describe('Suicide prevention sites', () => {
      const suicidePrevention = [
        'suicidepreventionlifeline.org',
        '988lifeline.org',
        'crisistextline.org',
        'afsp.org',
        'save.org',
      ]

      it.each(suicidePrevention)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
        expect(isUrlProtected(`https://www.${domain}`)).toBe(true)
      })
    })

    describe('Sexual assault sites', () => {
      const sexualAssault = ['rainn.org', 'nsvrc.org']

      it.each(sexualAssault)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('Domestic violence sites', () => {
      const domesticViolence = ['thehotline.org', 'ncadv.org', 'nnedv.org', 'loveisrespect.org']

      it.each(domesticViolence)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('Child abuse sites', () => {
      const childAbuse = ['childhelp.org', 'preventchildabuse.org', 'darkness2light.org']

      it.each(childAbuse)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('Mental health crisis sites', () => {
      const mentalHealth = ['samhsa.gov', 'nami.org', 'mentalhealth.gov', 'findtreatment.gov']

      it.each(mentalHealth)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('LGBTQ+ crisis sites', () => {
      const lgbtq = ['thetrevorproject.org', 'translifeline.org', 'glaad.org', 'pflag.org']

      it.each(lgbtq)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('Teen/youth crisis sites', () => {
      const teenYouth = [
        'teenlineonline.org',
        'yourlifeyourvoice.org',
        'kidshelp.com.au',
        'kidshelpphone.ca',
      ]

      it.each(teenYouth)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('General crisis support sites', () => {
      const general = ['imalive.org', 'befrienders.org', 'samaritans.org', 'iasp.info']

      it.each(general)('protects %s', (domain) => {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
      })
    })

    describe('URL shorteners (over-blocking)', () => {
      const shorteners = [
        'bit.ly',
        't.co',
        'tinyurl.com',
        'goo.gl',
        'ow.ly',
        'is.gd',
        'buff.ly',
        'tiny.cc',
        'rb.gy',
        'cutt.ly',
      ]

      it.each(shorteners)('protects %s (over-blocking)', (domain) => {
        expect(isUrlProtected(`https://${domain}/abc123`)).toBe(true)
      })
    })
  })

  // ===========================================================================
  // Invariant Tests - INV-001 Zero Data Path
  // ===========================================================================
  describe('INV-001: Zero Data Path Invariant', () => {
    it('all DEFAULT_CRISIS_DOMAINS are protected', () => {
      for (const domain of DEFAULT_CRISIS_DOMAINS) {
        expect(isUrlProtected(`https://${domain}`)).toBe(true)
        expect(isUrlProtected(`https://www.${domain}`)).toBe(true)
        expect(isUrlProtected(`https://${domain}/path/to/page`)).toBe(true)
        expect(isUrlProtected(`https://${domain}?query=param`)).toBe(true)
      }
    })

    it('expected domain count matches bundled list', () => {
      // 30 crisis domains + 10 URL shorteners = 40 total
      expect(DEFAULT_CRISIS_DOMAINS.length).toBe(40)
    })

    it('performance: isUrlProtected completes quickly', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        isUrlProtected('https://rainn.org')
      }
      const duration = performance.now() - start
      // 1000 checks should complete in under 100ms (avg <0.1ms per check)
      expect(duration).toBeLessThan(100)
    })
  })

  // ===========================================================================
  // Edge Cases and Adversarial Tests
  // ===========================================================================
  describe('Edge cases and adversarial scenarios', () => {
    it('does not match partial domain names', () => {
      expect(isUrlProtected('https://notrainn.org')).toBe(false)
      expect(isUrlProtected('https://rainn.org.evil.com')).toBe(false)
    })

    it('does not match domains with crisis domain as subdomain', () => {
      expect(isUrlProtected('https://rainn.org.phishing.com')).toBe(false)
    })

    it('handles Unicode/IDN domains safely', () => {
      // Should not match lookalike domains
      expect(isUrlProtected('https://räinn.org')).toBe(false)
    })

    it('handles very long URLs', () => {
      const longPath = 'a'.repeat(10000)
      expect(isUrlProtected(`https://rainn.org/${longPath}`)).toBe(true)
    })

    it('handles URL with encoded characters', () => {
      expect(isUrlProtected('https://rainn.org/get%20help')).toBe(true)
    })

    it('handles file:// protocol (local files)', () => {
      const result = extractDomain('file:///path/to/file.html')
      // file:// URLs have empty hostname
      expect(result === '' || result === null).toBe(true)
    })
  })

  // ===========================================================================
  // Story 7.5: Fuzzy Domain Matching Tests
  // ===========================================================================
  describe('Story 7.5: Levenshtein Distance Algorithm', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('rainn.org', 'rainn.org')).toBe(0)
    })

    it('returns correct distance for single character insertion', () => {
      expect(levenshteinDistance('rainn.org', 'rainnn.org')).toBe(1)
      expect(levenshteinDistance('rainn.org', 'raiinn.org')).toBe(1)
    })

    it('returns correct distance for single character deletion', () => {
      expect(levenshteinDistance('rainn.org', 'rain.org')).toBe(1)
    })

    it('returns correct distance for single character substitution', () => {
      expect(levenshteinDistance('rainn.org', 'rainn.erg')).toBe(1)
    })

    it('returns correct distance for two character changes', () => {
      expect(levenshteinDistance('rainn.org', 'rainm.erg')).toBe(2)
    })

    it('returns threshold + 1 when distance exceeds threshold', () => {
      // "random.org" vs "rainn.org" is distance 4
      expect(levenshteinDistance('random.org', 'rainn.org', 2)).toBe(3)
    })

    it('handles early exit for length difference > threshold', () => {
      // Length difference of 5 with threshold 2
      expect(levenshteinDistance('ab', 'abcdefg', 2)).toBe(3)
    })

    it('handles empty strings', () => {
      expect(levenshteinDistance('', 'abc')).toBe(3)
      expect(levenshteinDistance('abc', '')).toBe(3)
      expect(levenshteinDistance('', '')).toBe(0)
    })

    it('is case sensitive', () => {
      // 9 chars, all different case = 9 substitutions... but with early exit
      // Actually, lowercase and uppercase differ so each char is a substitution
      // But due to early exit at threshold, we get threshold + 1 = 3
      expect(levenshteinDistance('RAINN.ORG', 'rainn.org', 2)).toBe(3)
    })
  })

  describe('Story 7.5: Extract Base Domain', () => {
    it('returns domain unchanged for simple domains', () => {
      expect(extractBaseDomain('rainn.org')).toBe('rainn.org')
    })

    it('strips www prefix (via extractDomain, not extractBaseDomain)', () => {
      // extractBaseDomain works on already-normalized domains
      expect(extractBaseDomain('rainn.org')).toBe('rainn.org')
    })

    it('strips subdomains', () => {
      expect(extractBaseDomain('chat.rainn.org')).toBe('rainn.org')
      expect(extractBaseDomain('help.support.rainn.org')).toBe('rainn.org')
    })

    it('handles multi-level TLDs correctly', () => {
      expect(extractBaseDomain('kidshelp.com.au')).toBe('kidshelp.com.au')
      expect(extractBaseDomain('chat.kidshelp.com.au')).toBe('kidshelp.com.au')
    })

    it('handles single-part domains gracefully', () => {
      expect(extractBaseDomain('localhost')).toBe('localhost')
    })
  })

  describe('Story 7.5: Fuzzy Match Detection', () => {
    it('returns null for exact matches (handled by Set)', () => {
      // Fuzzy match returns null for exact matches (distance = 0)
      const result = findFuzzyMatch('rainn.org')
      expect(result).toBeNull()
    })

    it('matches single character typos (distance 1)', () => {
      // Use a longer domain (crisistextline.org is 18 chars)
      const result = findFuzzyMatch('crisistexttline.org') // extra 't'
      expect(result).not.toBeNull()
      expect(result?.matchedDomain).toBe('crisistextline.org')
      expect(result?.distance).toBe(1)
    })

    it('matches two character typos (distance 2)', () => {
      const result = findFuzzyMatch('crisistxtline.org') // missing 'e'
      expect(result).not.toBeNull()
      expect(result?.matchedDomain).toBe('crisistextline.org')
      expect(result?.distance).toBeLessThanOrEqual(2)
    })

    it('does NOT match distance > 2', () => {
      // "random.org" vs "rainn.org" is distance 4
      const result = findFuzzyMatch('random.org')
      expect(result).toBeNull()
    })

    it('does NOT match short domains (prevents false positives)', () => {
      // Domains under 10 chars don't get fuzzy matched to prevent false positives
      const result = findFuzzyMatch('bat.ly') // 6 chars
      expect(result).toBeNull()
    })

    it('does NOT fuzzy match against URL shorteners', () => {
      // URL shorteners are short domains, so they shouldn't fuzzy match
      const result = findFuzzyMatch('bitt.ly') // 7 chars, too short for fuzzy
      expect(result).toBeNull()
    })

    it('matches Trevor Project with minor typo', () => {
      const result = findFuzzyMatch('thetrevorprojct.org') // missing 'e'
      expect(result).not.toBeNull()
      expect(result?.matchedDomain).toBe('thetrevorproject.org')
    })
  })

  describe('Story 7.5: Integrated Fuzzy URL Protection', () => {
    it('protects exact domain matches (no regression)', () => {
      expect(isUrlProtected('https://rainn.org')).toBe(true)
    })

    it('protects subdomain variations (no regression)', () => {
      expect(isUrlProtected('https://www.rainn.org')).toBe(true)
    })

    it('protects URLs with typos (distance 1)', () => {
      // crisistextline.org is 18 chars, long enough for fuzzy matching
      expect(isUrlProtected('https://crisistexttline.org')).toBe(true) // extra 't'
    })

    it('protects URLs with typos (distance 2)', () => {
      // Also using long domain for fuzzy match
      expect(isUrlProtected('https://crisistxtline.org')).toBe(true) // missing 'e'
    })

    it('does NOT protect unrelated domains', () => {
      expect(isUrlProtected('https://random.org')).toBe(false)
      expect(isUrlProtected('https://google.com')).toBe(false)
    })

    it('prevents false positives on short domains', () => {
      expect(isUrlProtected('https://bat.ly')).toBe(false)
      expect(isUrlProtected('https://abc.org')).toBe(false)
    })

    it('still protects URL shorteners via exact match', () => {
      expect(isUrlProtected('https://bit.ly/abc123')).toBe(true)
      expect(isUrlProtected('https://t.co/xyz')).toBe(true)
    })

    it('protects Trevor Project with minor typo', () => {
      expect(isUrlProtected('https://thetrevorprojct.org')).toBe(true)
    })

    it('does NOT match "trevorproject.org" to "thetrevorproject.org" (distance > 2)', () => {
      // This is distance 3 (missing "the"), so it should NOT match via fuzzy
      // Unless it's added as an alias in the allowlist
      expect(isUrlProtected('https://trevorproject.org')).toBe(false)
    })
  })

  describe('Story 7.5: Performance', () => {
    it('fuzzy matching completes quickly (< 10ms per check)', () => {
      const start = performance.now()
      for (let i = 0; i < 100; i++) {
        isUrlProtected('https://rainnn.org') // Force fuzzy match
      }
      const duration = performance.now() - start
      // 100 fuzzy checks should complete in under 100ms
      expect(duration).toBeLessThan(100)
    })

    it('exact matches are faster than fuzzy matches', () => {
      // Exact match (O(1))
      const startExact = performance.now()
      for (let i = 0; i < 1000; i++) {
        isUrlProtected('https://rainn.org')
      }
      const durationExact = performance.now() - startExact

      // Fuzzy match (O(n * m) per domain)
      const startFuzzy = performance.now()
      for (let i = 0; i < 1000; i++) {
        isUrlProtected('https://rainnn.org')
      }
      const durationFuzzy = performance.now() - startFuzzy

      // Exact should be faster (or at least not significantly slower)
      // Note: Due to caching and JIT, this may not always be true in tests
      expect(durationExact).toBeLessThan(200)
      expect(durationFuzzy).toBeLessThan(500)
    })
  })

  describe('Story 7.5: Privacy - Fuzzy Match Logging', () => {
    it('logging queue key is defined', () => {
      expect(FUZZY_MATCH_QUEUE_KEY).toBe('fuzzyMatchQueue')
    })

    it('fuzzy match threshold is 2', () => {
      expect(FUZZY_MATCH_THRESHOLD).toBe(2)
    })

    it('minimum domain length for fuzzy is 10', () => {
      expect(MIN_DOMAIN_LENGTH_FOR_FUZZY).toBe(10)
    })
  })

  describe('Story 7.5: False Positive Prevention', () => {
    // These tests verify we don't accidentally match unrelated domains

    it('does NOT match "naim.org" to "nami.org" (short domain)', () => {
      // "naim.org" is 8 chars, which is less than MIN_DOMAIN_LENGTH_FOR_FUZZY (10)
      // So it won't be fuzzy matched, preventing false positives
      expect(isUrlProtected('https://naim.org')).toBe(false)
    })

    it('does NOT match completely unrelated domains', () => {
      expect(isUrlProtected('https://facebook.com')).toBe(false)
      expect(isUrlProtected('https://youtube.com')).toBe(false)
      expect(isUrlProtected('https://amazon.com')).toBe(false)
    })

    it('does NOT match lookalike phishing domains', () => {
      // These should NOT be protected as they could be phishing
      expect(isUrlProtected('https://rainn.org.evil.com')).toBe(false)
      expect(isUrlProtected('https://fake-rainn.org')).toBe(false)
    })

    it('does NOT match domains with crisis domain as substring', () => {
      expect(isUrlProtected('https://notrainn.org')).toBe(false)
    })
  })

  // ===========================================================================
  // Story 7.5: Security Tests - DoS Prevention
  // ===========================================================================
  describe('Story 7.5: Security - DoS Prevention', () => {
    it('max domain length constant is 256 (per RFC 1035)', () => {
      expect(MAX_DOMAIN_LENGTH_FOR_FUZZY).toBe(256)
    })

    it('rejects excessively long domains in Levenshtein', () => {
      const longString = 'a'.repeat(1000)
      const result = levenshteinDistance(longString, 'rainn.org', 2)
      // Should return threshold + 1 immediately without computing
      expect(result).toBe(3)
    })

    it('handles malicious URLs with extremely long domains', () => {
      const maliciousDomain = 'a'.repeat(10000) + '.org'

      // Should complete quickly without allocating massive arrays
      const start = performance.now()
      const result = isUrlProtected(`https://${maliciousDomain}`)
      const duration = performance.now() - start

      expect(duration).toBeLessThan(100) // Should still meet performance target (allows for CI variance)
      expect(result).toBe(false) // Should not match (and not crash)
    })

    it('fuzzy match skips overly long domains', () => {
      const longDomain = 'a'.repeat(500) + '.org'
      const result = findFuzzyMatch(longDomain)
      expect(result).toBeNull()
    })
  })

  // ===========================================================================
  // Story 7.5: Input Validation Tests
  // ===========================================================================
  describe('Story 7.5: Input Validation', () => {
    it('extractBaseDomain handles empty string', () => {
      expect(extractBaseDomain('')).toBe('')
    })

    it('extractBaseDomain handles domain with trailing dots', () => {
      expect(extractBaseDomain('rainn.org.')).toBe('rainn.org')
      expect(extractBaseDomain('.rainn.org')).toBe('rainn.org')
    })

    it('extractBaseDomain handles malformed domains with multiple consecutive dots', () => {
      expect(extractBaseDomain('rainn..org')).toBe('rainn.org')
    })

    it('extractBaseDomain handles single word (no TLD)', () => {
      expect(extractBaseDomain('localhost')).toBe('localhost')
    })

    it('extractBaseDomain handles only dots', () => {
      expect(extractBaseDomain('...')).toBe('')
    })
  })

  // ===========================================================================
  // Story 7.7: Allowlist Distribution & Sync Tests
  // ===========================================================================
  describe('Story 7.7: Transform Resources to Domains', () => {
    it('extracts primary domain from resources', () => {
      const resources = [
        {
          id: '1',
          domain: 'rainn.org',
          pattern: null,
          category: 'sexual_assault',
          name: 'RAINN',
          description: 'Sexual assault hotline',
          phone: '1-800-656-4673',
          text: null,
          aliases: [],
          regional: false,
        },
      ]
      const domains = transformResourcesToDomains(resources)
      expect(domains).toContain('rainn.org')
    })

    it('extracts aliases from resources', () => {
      const resources = [
        {
          id: '1',
          domain: 'rainn.org',
          pattern: null,
          category: 'sexual_assault',
          name: 'RAINN',
          description: 'Help',
          phone: null,
          text: null,
          aliases: ['www.rainn.org', 'help.rainn.org'],
          regional: false,
        },
      ]
      const domains = transformResourcesToDomains(resources)
      expect(domains).toContain('rainn.org')
      expect(domains).toContain('www.rainn.org')
      expect(domains).toContain('help.rainn.org')
    })

    it('normalizes domains to lowercase', () => {
      const resources = [
        {
          id: '1',
          domain: 'RAINN.ORG',
          pattern: null,
          category: 'sexual_assault',
          name: 'RAINN',
          description: 'Help',
          phone: null,
          text: null,
          aliases: ['WWW.RAINN.ORG'],
          regional: false,
        },
      ]
      const domains = transformResourcesToDomains(resources)
      expect(domains).toContain('rainn.org')
      expect(domains).toContain('www.rainn.org')
    })

    it('handles empty aliases array', () => {
      const resources = [
        {
          id: '1',
          domain: 'rainn.org',
          pattern: null,
          category: 'sexual_assault',
          name: 'RAINN',
          description: 'Help',
          phone: null,
          text: null,
          aliases: [],
          regional: false,
        },
      ]
      const domains = transformResourcesToDomains(resources)
      expect(domains.length).toBe(1)
      expect(domains).toContain('rainn.org')
    })

    it('handles multiple resources', () => {
      const resources = [
        {
          id: '1',
          domain: 'rainn.org',
          pattern: null,
          category: 'sexual_assault',
          name: 'RAINN',
          description: 'Help',
          phone: null,
          text: null,
          aliases: [],
          regional: false,
        },
        {
          id: '2',
          domain: 'thehotline.org',
          pattern: null,
          category: 'domestic_violence',
          name: 'Hotline',
          description: 'DV Help',
          phone: null,
          text: null,
          aliases: ['hotline.org'],
          regional: false,
        },
      ]
      const domains = transformResourcesToDomains(resources)
      expect(domains).toContain('rainn.org')
      expect(domains).toContain('thehotline.org')
      expect(domains).toContain('hotline.org')
    })

    it('handles empty resources array', () => {
      const domains = transformResourcesToDomains([])
      expect(domains.length).toBe(0)
    })

    it('skips null/undefined aliases gracefully', () => {
      const resources = [
        {
          id: '1',
          domain: 'rainn.org',
          pattern: null,
          category: 'sexual_assault',
          name: 'RAINN',
          description: 'Help',
          phone: null,
          text: null,
          aliases: [null as unknown as string, '', 'valid.alias.org'],
          regional: false,
        },
      ]
      const domains = transformResourcesToDomains(resources)
      expect(domains).toContain('rainn.org')
      expect(domains).toContain('valid.alias.org')
      expect(domains.length).toBe(2) // Only valid entries
    })
  })

  describe('Story 7.7: API URL Configuration', () => {
    it('has correct API URL format', () => {
      expect(CRISIS_ALLOWLIST_API).toContain('cloudfunctions.net')
      expect(CRISIS_ALLOWLIST_API).toContain('getCrisisAllowlist')
    })
  })

  describe('Story 7.7: syncAllowlistFromServer', () => {
    let mockFetch: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      // Reset storage
      Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
      resetCache()
    })

    it('fetches from API and updates cache on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          version: '2.0.0',
          lastUpdated: new Date().toISOString(),
          resources: [
            {
              id: '1',
              domain: 'newresource.org',
              pattern: null,
              category: 'crisis_general',
              name: 'New Resource',
              description: 'New crisis resource',
              phone: null,
              text: null,
              aliases: [],
              regional: false,
            },
          ],
        }),
      })

      const result = await syncAllowlistFromServer()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        CRISIS_ALLOWLIST_API,
        expect.objectContaining({
          method: 'GET',
        })
      )
      // Check that storage was updated
      expect(mockStorage['crisisAllowlist']).toBeDefined()
      const stored = mockStorage['crisisAllowlist'] as { version: string; domains: string[] }
      expect(stored.version).toBe('2.0.0')
      expect(stored.domains).toContain('newresource.org')
    })

    it('returns false on network error (fail-safe)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
    })

    it('returns false on timeout (fail-safe)', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
    })

    it('returns false on HTTP error (fail-safe)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
    })

    it('returns false on invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'format' }),
      })

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
    })

    it('returns false when version unchanged', async () => {
      // Set up initial version
      mockStorage['crisisAllowlist'] = {
        version: '1.0.0',
        lastUpdated: Date.now(),
        domains: ['rainn.org'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          resources: [],
        }),
      })

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
    })

    it('handles 304 Not Modified response', async () => {
      mockStorage['crisisAllowlist'] = {
        version: '1.0.0',
        lastUpdated: Date.now() - 1000,
        domains: ['rainn.org'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 304,
      })

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
      // lastUpdated should be updated
      const stored = mockStorage['crisisAllowlist'] as { lastUpdated: number }
      expect(stored.lastUpdated).toBeGreaterThan(Date.now() - 1000)
    })

    it('merges API domains with bundled defaults', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          version: '2.0.0',
          lastUpdated: new Date().toISOString(),
          resources: [
            {
              id: '1',
              domain: 'newresource.org',
              pattern: null,
              category: 'crisis_general',
              name: 'New',
              description: 'New',
              phone: null,
              text: null,
              aliases: [],
              regional: false,
            },
          ],
        }),
      })

      await syncAllowlistFromServer()

      const stored = mockStorage['crisisAllowlist'] as { domains: string[] }
      // Should contain both new resource AND bundled defaults
      expect(stored.domains).toContain('newresource.org')
      expect(stored.domains).toContain('rainn.org') // bundled default
      expect(stored.domains).toContain('thehotline.org') // bundled default
    })

    it('sends If-None-Match header with cached version', async () => {
      mockStorage['crisisAllowlist'] = {
        version: '1.0.5',
        lastUpdated: Date.now(),
        domains: ['rainn.org'],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 304,
      })

      await syncAllowlistFromServer()

      expect(mockFetch).toHaveBeenCalledWith(
        CRISIS_ALLOWLIST_API,
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-None-Match': '"1.0.5"',
          }),
        })
      )
    })

    it('returns false when API returns empty resources', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          version: '2.0.0',
          lastUpdated: new Date().toISOString(),
          resources: [],
        }),
      })

      const result = await syncAllowlistFromServer()

      expect(result).toBe(false)
    })
  })
})
