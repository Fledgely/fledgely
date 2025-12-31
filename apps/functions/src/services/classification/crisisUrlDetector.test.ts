/**
 * Crisis URL Detector Tests
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC3
 *
 * Tests for crisis URL detection and distress content identification.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import { isCrisisUrl, isDistressContent, calculateReleasableAfter } from './crisisUrlDetector'

describe('crisisUrlDetector (Story 21.2)', () => {
  describe('isCrisisUrl', () => {
    describe('suicide prevention resources', () => {
      it('detects 988lifeline.org', () => {
        expect(isCrisisUrl('https://988lifeline.org')).toBe(true)
        expect(isCrisisUrl('https://988lifeline.org/chat')).toBe(true)
        expect(isCrisisUrl('https://www.988lifeline.org')).toBe(true)
      })

      it('detects afsp.org', () => {
        expect(isCrisisUrl('https://afsp.org')).toBe(true)
        expect(isCrisisUrl('https://www.afsp.org/resources')).toBe(true)
      })

      it('detects imalive.org', () => {
        expect(isCrisisUrl('https://imalive.org')).toBe(true)
      })
    })

    describe('crisis general resources', () => {
      it('detects crisistextline.org', () => {
        expect(isCrisisUrl('https://crisistextline.org')).toBe(true)
        expect(isCrisisUrl('https://www.crisistextline.org/text-us')).toBe(true)
      })

      it('detects samhsa.gov', () => {
        expect(isCrisisUrl('https://samhsa.gov')).toBe(true)
        expect(isCrisisUrl('https://www.samhsa.gov/find-help')).toBe(true)
      })
    })

    describe('domestic violence resources', () => {
      it('detects thehotline.org', () => {
        expect(isCrisisUrl('https://thehotline.org')).toBe(true)
        expect(isCrisisUrl('https://www.thehotline.org/get-help')).toBe(true)
      })

      it('detects loveisrespect.org', () => {
        expect(isCrisisUrl('https://loveisrespect.org')).toBe(true)
      })
    })

    describe('LGBTQ+ resources', () => {
      it('detects thetrevorproject.org', () => {
        expect(isCrisisUrl('https://thetrevorproject.org')).toBe(true)
        expect(isCrisisUrl('https://www.thetrevorproject.org/get-help')).toBe(true)
      })

      it('detects translifeline.org', () => {
        expect(isCrisisUrl('https://translifeline.org')).toBe(true)
      })
    })

    describe('child abuse resources', () => {
      it('detects childhelp.org', () => {
        expect(isCrisisUrl('https://childhelp.org')).toBe(true)
      })

      it('detects stopitnow.org', () => {
        expect(isCrisisUrl('https://stopitnow.org')).toBe(true)
      })
    })

    describe('sexual assault resources', () => {
      it('detects rainn.org', () => {
        expect(isCrisisUrl('https://rainn.org')).toBe(true)
        expect(isCrisisUrl('https://www.rainn.org/get-help')).toBe(true)
      })
    })

    describe('mental health resources', () => {
      it('detects nami.org', () => {
        expect(isCrisisUrl('https://nami.org')).toBe(true)
      })

      it('detects mhanational.org', () => {
        expect(isCrisisUrl('https://mhanational.org')).toBe(true)
      })
    })

    describe('subdomain handling', () => {
      it('matches subdomains of protected domains', () => {
        expect(isCrisisUrl('https://chat.988lifeline.org')).toBe(true)
        expect(isCrisisUrl('https://help.crisistextline.org')).toBe(true)
        expect(isCrisisUrl('https://resources.thehotline.org/page')).toBe(true)
      })

      it('matches deeply nested subdomains', () => {
        expect(isCrisisUrl('https://en.m.988lifeline.org/page')).toBe(true)
      })
    })

    describe('URL format variations', () => {
      it('handles URLs with paths', () => {
        expect(isCrisisUrl('https://988lifeline.org/chat/start')).toBe(true)
      })

      it('handles URLs with query strings', () => {
        expect(isCrisisUrl('https://988lifeline.org/help?lang=en')).toBe(true)
      })

      it('handles URLs with ports', () => {
        expect(isCrisisUrl('https://988lifeline.org:443/chat')).toBe(true)
      })

      it('handles http protocol', () => {
        expect(isCrisisUrl('http://988lifeline.org')).toBe(true)
      })

      it('handles uppercase in domain', () => {
        expect(isCrisisUrl('https://988LIFELINE.ORG')).toBe(true)
        expect(isCrisisUrl('https://WWW.RAINN.ORG')).toBe(true)
      })
    })

    describe('non-crisis URLs', () => {
      it('rejects normal websites', () => {
        expect(isCrisisUrl('https://google.com')).toBe(false)
        expect(isCrisisUrl('https://youtube.com/watch?v=123')).toBe(false)
        expect(isCrisisUrl('https://instagram.com')).toBe(false)
      })

      it('rejects similar but non-protected domains', () => {
        expect(isCrisisUrl('https://988lifeline.com')).toBe(false) // .com not .org
        expect(isCrisisUrl('https://fake988lifeline.org')).toBe(false)
        expect(isCrisisUrl('https://rainn.com')).toBe(false)
      })

      it('rejects domains containing protected domain names', () => {
        expect(isCrisisUrl('https://not-988lifeline.org')).toBe(false)
        expect(isCrisisUrl('https://988lifeline.org.fake.com')).toBe(false)
      })
    })

    describe('invalid inputs', () => {
      it('returns false for empty string', () => {
        expect(isCrisisUrl('')).toBe(false)
      })

      it('returns false for null/undefined', () => {
        expect(isCrisisUrl(null as unknown as string)).toBe(false)
        expect(isCrisisUrl(undefined as unknown as string)).toBe(false)
      })

      it('returns false for invalid URLs', () => {
        expect(isCrisisUrl('not-a-url')).toBe(false)
        expect(isCrisisUrl('ftp://988lifeline.org')).toBe(false) // No ftp support
        expect(isCrisisUrl('://missing-protocol.com')).toBe(false)
      })

      it('returns false for non-string inputs', () => {
        expect(isCrisisUrl(123 as unknown as string)).toBe(false)
        expect(isCrisisUrl({} as unknown as string)).toBe(false)
      })
    })
  })

  describe('isDistressContent', () => {
    it('returns true for Self-Harm Indicators', () => {
      expect(isDistressContent([{ category: 'Self-Harm Indicators', severity: 'high' }])).toBe(true)
    })

    it('returns true when Self-Harm Indicators is among multiple concerns', () => {
      expect(
        isDistressContent([
          { category: 'Explicit Language', severity: 'low' },
          { category: 'Self-Harm Indicators', severity: 'medium' },
          { category: 'Violence', severity: 'low' },
        ])
      ).toBe(true)
    })

    it('returns false for non-distress concerns', () => {
      expect(isDistressContent([{ category: 'Violence', severity: 'low' }])).toBe(false)
      expect(isDistressContent([{ category: 'Explicit Language', severity: 'medium' }])).toBe(false)
      expect(isDistressContent([{ category: 'Bullying', severity: 'high' }])).toBe(false)
    })

    it('returns false for empty array', () => {
      expect(isDistressContent([])).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(isDistressContent(null as unknown as Array<{ category: string }>)).toBe(false)
      expect(isDistressContent(undefined as unknown as Array<{ category: string }>)).toBe(false)
    })

    it('handles concerns without severity', () => {
      expect(isDistressContent([{ category: 'Self-Harm Indicators' }])).toBe(true)
    })
  })

  describe('calculateReleasableAfter', () => {
    it('returns timestamp 48 hours in the future', () => {
      const now = Date.now()
      const result = calculateReleasableAfter(now)
      const fortyEightHoursMs = 48 * 60 * 60 * 1000

      expect(result).toBe(now + fortyEightHoursMs)
    })

    it('calculates correctly for any timestamp', () => {
      const timestamp = 1704067200000 // Jan 1, 2024 00:00:00 UTC
      const result = calculateReleasableAfter(timestamp)
      const expected = 1704240000000 // Jan 3, 2024 00:00:00 UTC

      expect(result).toBe(expected)
    })
  })
})
