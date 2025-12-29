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
import { isUrlProtected, DEFAULT_CRISIS_DOMAINS, _testExports } from './crisis-allowlist'

const { extractDomain, buildDomainSet, resetCache } = _testExports

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
})
