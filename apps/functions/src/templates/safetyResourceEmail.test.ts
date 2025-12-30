/**
 * Safety Resource Email Template Tests
 *
 * Story 0.5.9: Domestic Abuse Resource Referral
 *
 * Tests verify:
 * - AC2: Comprehensive resource content (hotlines, planning, legal)
 * - AC4: Discreet subject line (no fledgely, escape, abuse)
 * - AC5: Error disclaimer included
 * - No branding or identifying information
 */

import { describe, it, expect } from 'vitest'
import {
  generateSafetyResourceEmailHtml,
  generateSafetyResourceEmailText,
  containsSensitiveWords,
  SAFETY_RESOURCES,
  SAFETY_RESOURCE_EMAIL_SUBJECT,
  ERROR_DISCLAIMER,
} from './safetyResourceEmail'

describe('Safety Resource Email Template', () => {
  describe('SAFETY_RESOURCE_EMAIL_SUBJECT', () => {
    it('does not contain fledgely', () => {
      expect(SAFETY_RESOURCE_EMAIL_SUBJECT.toLowerCase()).not.toContain('fledgely')
    })

    it('does not contain escape', () => {
      expect(SAFETY_RESOURCE_EMAIL_SUBJECT.toLowerCase()).not.toContain('escape')
    })

    it('does not contain abuse', () => {
      expect(SAFETY_RESOURCE_EMAIL_SUBJECT.toLowerCase()).not.toContain('abuse')
    })

    it('does not contain safety', () => {
      expect(SAFETY_RESOURCE_EMAIL_SUBJECT.toLowerCase()).not.toContain('safety')
    })

    it('is neutral and generic', () => {
      expect(SAFETY_RESOURCE_EMAIL_SUBJECT).toBe('Important Resources')
    })
  })

  describe('SAFETY_RESOURCES constant', () => {
    it('includes National Domestic Violence Hotline number', () => {
      const hotline = SAFETY_RESOURCES.hotlines.find((h) => h.number === '1-800-799-7233')
      expect(hotline).toBeDefined()
    })

    it('includes Crisis Text Line', () => {
      const hotline = SAFETY_RESOURCES.hotlines.find((h) => h.number.includes('741741'))
      expect(hotline).toBeDefined()
    })

    it('includes Childhelp National Hotline', () => {
      const hotline = SAFETY_RESOURCES.hotlines.find((h) => h.number === '1-800-422-4453')
      expect(hotline).toBeDefined()
      expect(hotline?.name).toBe('Childhelp National Hotline')
    })

    it('includes safety planning links', () => {
      expect(SAFETY_RESOURCES.safetyPlanningLinks.length).toBeGreaterThan(0)
      expect(
        SAFETY_RESOURCES.safetyPlanningLinks.some((l) => l.url.includes('thehotline.org'))
      ).toBe(true)
    })

    it('includes legal aid links', () => {
      expect(SAFETY_RESOURCES.legalAidLinks.length).toBeGreaterThan(0)
      expect(SAFETY_RESOURCES.legalAidLinks.some((l) => l.url.includes('lawhelp.org'))).toBe(true)
    })
  })

  describe('ERROR_DISCLAIMER', () => {
    it('contains the required disclaimer text', () => {
      expect(ERROR_DISCLAIMER).toBe('If this email was sent in error, you can safely ignore it.')
    })
  })

  describe('generateSafetyResourceEmailHtml', () => {
    const html = generateSafetyResourceEmailHtml()

    it('returns valid HTML', () => {
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<html')
      expect(html).toContain('</html>')
    })

    it('includes all hotline numbers', () => {
      expect(html).toContain('1-800-799-7233')
      expect(html).toContain('741741')
      expect(html).toContain('1-800-422-4453')
      expect(html).toContain('1-800-656-4673')
    })

    it('includes safety planning links', () => {
      expect(html).toContain('thehotline.org/plan-for-safety')
      expect(html).toContain('loveisrespect.org/personal-safety/safety-planning')
    })

    it('includes legal aid links', () => {
      expect(html).toContain('lawhelp.org')
      expect(html).toContain('lsc.gov')
    })

    it('includes error disclaimer', () => {
      expect(html).toContain(ERROR_DISCLAIMER)
    })

    it('does not contain fledgely', () => {
      expect(html.toLowerCase()).not.toContain('fledgely')
    })

    it('does not contain escape', () => {
      expect(html.toLowerCase()).not.toContain('escape')
    })

    it('does not contain forbidden words (fledgely, escape, victim, abuser)', () => {
      expect(containsSensitiveWords(html)).toBe(false)
    })

    it('has section headers for immediate help, safety planning, and legal help', () => {
      expect(html).toContain('Immediate Help')
      expect(html).toContain('Safety Planning')
      expect(html).toContain('Legal Help')
    })
  })

  describe('generateSafetyResourceEmailText', () => {
    const text = generateSafetyResourceEmailText()

    it('includes all hotline numbers', () => {
      expect(text).toContain('1-800-799-7233')
      expect(text).toContain('741741')
      expect(text).toContain('1-800-422-4453')
      expect(text).toContain('1-800-656-4673')
    })

    it('includes safety planning links', () => {
      expect(text).toContain('thehotline.org/plan-for-safety')
      expect(text).toContain('loveisrespect.org/personal-safety/safety-planning')
    })

    it('includes legal aid links', () => {
      expect(text).toContain('lawhelp.org')
      expect(text).toContain('lsc.gov')
    })

    it('includes error disclaimer', () => {
      expect(text).toContain(ERROR_DISCLAIMER)
    })

    it('does not contain fledgely', () => {
      expect(text.toLowerCase()).not.toContain('fledgely')
    })

    it('does not contain escape', () => {
      expect(text.toLowerCase()).not.toContain('escape')
    })

    it('does not contain forbidden words (fledgely, escape, victim, abuser)', () => {
      expect(containsSensitiveWords(text)).toBe(false)
    })

    it('has section headers for immediate help, safety planning, and legal help', () => {
      expect(text).toContain('IMMEDIATE HELP')
      expect(text).toContain('SAFETY PLANNING')
      expect(text).toContain('LEGAL HELP')
    })
  })

  describe('containsSensitiveWords', () => {
    it('returns true for content containing fledgely', () => {
      expect(containsSensitiveWords('Hello from fledgely')).toBe(true)
    })

    it('returns true for content containing escape', () => {
      expect(containsSensitiveWords('Your escape is complete')).toBe(true)
    })

    it('returns true for content containing escaped', () => {
      expect(containsSensitiveWords('You have escaped')).toBe(true)
    })

    it('returns true for content containing victim', () => {
      expect(containsSensitiveWords('victim support services')).toBe(true)
    })

    it('returns true for content containing abuser', () => {
      expect(containsSensitiveWords('protect from abuser')).toBe(true)
    })

    it('returns false for safe content with hotline names', () => {
      expect(containsSensitiveWords('Important Resources - Call 1-800-799-7233')).toBe(false)
    })

    it('returns false for content with abuse in hotline name', () => {
      // "abuse" is acceptable in hotline names like "National Child Abuse Hotline"
      expect(containsSensitiveWords('National Child Abuse Hotline: 1-800-422-4453')).toBe(false)
    })

    it('returns false for content with domestic violence hotline name', () => {
      // "domestic violence" is acceptable in hotline names
      expect(containsSensitiveWords('National Domestic Violence Hotline')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(containsSensitiveWords('FLEDGELY')).toBe(true)
      expect(containsSensitiveWords('Escape')).toBe(true)
      expect(containsSensitiveWords('VICTIM')).toBe(true)
    })
  })
})
