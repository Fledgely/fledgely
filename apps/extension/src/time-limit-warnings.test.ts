/**
 * Tests for Time Limit Warning System
 *
 * Story 31.1: Countdown Warning System
 * Story 31.3: Education Content Exemption
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DEFAULT_WARNING_THRESHOLDS,
  DEFAULT_EDUCATION_EXEMPTION,
  CURATED_EDUCATION_DOMAINS,
  determineWarningLevel,
  getWarningMessage,
  getWarningTitle,
  isEducationDomain,
  isEducationCategory,
  type WarningLevel,
  type WarningThresholds,
  type EducationExemption,
} from './time-limit-warnings'

describe('Time Limit Warning System - Story 31.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DEFAULT_WARNING_THRESHOLDS', () => {
    it('has correct default values', () => {
      expect(DEFAULT_WARNING_THRESHOLDS.firstWarningMinutes).toBe(15)
      expect(DEFAULT_WARNING_THRESHOLDS.secondWarningMinutes).toBe(5)
      expect(DEFAULT_WARNING_THRESHOLDS.finalWarningMinutes).toBe(1)
      expect(DEFAULT_WARNING_THRESHOLDS.showCountdownBadge).toBe(true)
      expect(DEFAULT_WARNING_THRESHOLDS.showToastNotifications).toBe(true)
    })
  })

  describe('determineWarningLevel', () => {
    const thresholds: WarningThresholds = {
      firstWarningMinutes: 15,
      secondWarningMinutes: 5,
      finalWarningMinutes: 1,
      showCountdownBadge: true,
      showToastNotifications: true,
    }

    it('returns "none" for unlimited (null remaining)', () => {
      const result = determineWarningLevel(null, thresholds)
      expect(result).toBe('none')
    })

    it('returns "none" when more than 15 minutes remaining', () => {
      expect(determineWarningLevel(60, thresholds)).toBe('none')
      expect(determineWarningLevel(30, thresholds)).toBe('none')
      expect(determineWarningLevel(16, thresholds)).toBe('none')
    })

    it('returns "first" when 15 minutes or less remaining (AC1)', () => {
      expect(determineWarningLevel(15, thresholds)).toBe('first')
      expect(determineWarningLevel(14, thresholds)).toBe('first')
      expect(determineWarningLevel(10, thresholds)).toBe('first')
      expect(determineWarningLevel(6, thresholds)).toBe('first')
    })

    it('returns "second" when 5 minutes or less remaining (AC2)', () => {
      expect(determineWarningLevel(5, thresholds)).toBe('second')
      expect(determineWarningLevel(4, thresholds)).toBe('second')
      expect(determineWarningLevel(3, thresholds)).toBe('second')
      expect(determineWarningLevel(2, thresholds)).toBe('second')
    })

    it('returns "final" when 1 minute or less remaining (AC3)', () => {
      expect(determineWarningLevel(1, thresholds)).toBe('final')
      expect(determineWarningLevel(0.5, thresholds)).toBe('final')
    })

    it('returns "exceeded" when 0 or negative minutes remaining', () => {
      expect(determineWarningLevel(0, thresholds)).toBe('exceeded')
      expect(determineWarningLevel(-5, thresholds)).toBe('exceeded')
    })

    it('respects custom thresholds (AC6)', () => {
      const customThresholds: WarningThresholds = {
        firstWarningMinutes: 30,
        secondWarningMinutes: 10,
        finalWarningMinutes: 2,
        showCountdownBadge: true,
        showToastNotifications: true,
      }

      expect(determineWarningLevel(25, customThresholds)).toBe('first')
      expect(determineWarningLevel(8, customThresholds)).toBe('second')
      expect(determineWarningLevel(2, customThresholds)).toBe('final')
      expect(determineWarningLevel(31, customThresholds)).toBe('none')
    })
  })

  describe('getWarningMessage', () => {
    it('returns correct message for first warning (AC1)', () => {
      const message = getWarningMessage('first', 15)
      expect(message).toBe('15 minutes left')
    })

    it('returns correct message for second warning (AC2)', () => {
      const message = getWarningMessage('second', 5)
      expect(message).toBe('5 minutes left')
    })

    it('returns correct message for final warning with plural (AC3)', () => {
      const message = getWarningMessage('final', 2)
      expect(message).toBe('2 minutes - save your work')
    })

    it('returns correct message for final warning with singular', () => {
      const message = getWarningMessage('final', 1)
      expect(message).toBe('1 minute - save your work')
    })

    it('returns correct message for exceeded', () => {
      const message = getWarningMessage('exceeded', 0)
      expect(message).toBe('Screen time is up!')
    })

    it('returns empty string for none level', () => {
      const message = getWarningMessage('none', 60)
      expect(message).toBe('')
    })
  })

  describe('getWarningTitle', () => {
    it('returns correct titles for each level', () => {
      expect(getWarningTitle('first')).toBe('Screen Time Reminder')
      expect(getWarningTitle('second')).toBe('Screen Time Warning')
      expect(getWarningTitle('final')).toBe('Screen Time Almost Up')
      expect(getWarningTitle('exceeded')).toBe('Screen Time Limit Reached')
      expect(getWarningTitle('none')).toBe('Fledgely')
    })
  })

  describe('Warning progression', () => {
    const thresholds: WarningThresholds = DEFAULT_WARNING_THRESHOLDS

    it('progresses correctly from 60 minutes to 0', () => {
      const expected: Array<[number, WarningLevel]> = [
        [60, 'none'],
        [30, 'none'],
        [16, 'none'],
        [15, 'first'],
        [10, 'first'],
        [6, 'first'],
        [5, 'second'],
        [3, 'second'],
        [2, 'second'],
        [1, 'final'],
        [0.5, 'final'],
        [0, 'exceeded'],
      ]

      for (const [minutes, expectedLevel] of expected) {
        const result = determineWarningLevel(minutes, thresholds)
        expect(result).toBe(expectedLevel)
      }
    })
  })

  describe('Non-intrusive warnings (AC5)', () => {
    it('warning messages do not contain disruptive language', () => {
      const levels: WarningLevel[] = ['first', 'second', 'final']

      for (const level of levels) {
        const message = getWarningMessage(level, 5)
        // Should not contain alarming language
        expect(message).not.toMatch(/urgent/i)
        expect(message).not.toMatch(/immediately/i)
        expect(message).not.toMatch(/now!/i)
      }
    })

    it('titles are informative but not alarming', () => {
      const title = getWarningTitle('first')
      expect(title).not.toMatch(/urgent/i)
      expect(title).not.toMatch(/alert/i)
      expect(title).toBe('Screen Time Reminder')
    })
  })
})

describe('Education Content Exemption - Story 31.3', () => {
  describe('DEFAULT_EDUCATION_EXEMPTION', () => {
    it('has correct default values', () => {
      expect(DEFAULT_EDUCATION_EXEMPTION.enabled).toBe(false)
      expect(DEFAULT_EDUCATION_EXEMPTION.customDomains).toEqual([])
      expect(DEFAULT_EDUCATION_EXEMPTION.includeHomework).toBe(true)
      expect(DEFAULT_EDUCATION_EXEMPTION.showExemptNotification).toBe(true)
    })
  })

  describe('CURATED_EDUCATION_DOMAINS', () => {
    it('contains expected education domains', () => {
      expect(CURATED_EDUCATION_DOMAINS).toContain('khanacademy.org')
      expect(CURATED_EDUCATION_DOMAINS).toContain('wikipedia.org')
      expect(CURATED_EDUCATION_DOMAINS).toContain('coursera.org')
      expect(CURATED_EDUCATION_DOMAINS).toContain('duolingo.com')
    })

    it('has at least 10 curated domains', () => {
      expect(CURATED_EDUCATION_DOMAINS.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('isEducationDomain', () => {
    const enabledExemption: EducationExemption = {
      enabled: true,
      customDomains: [],
      includeHomework: true,
      showExemptNotification: true,
    }

    const disabledExemption: EducationExemption = {
      enabled: false,
      customDomains: [],
      includeHomework: true,
      showExemptNotification: true,
    }

    it('returns false when exemption is disabled (AC1)', () => {
      expect(isEducationDomain('khanacademy.org', disabledExemption)).toBe(false)
      expect(isEducationDomain('wikipedia.org', disabledExemption)).toBe(false)
    })

    it('matches curated education domains (AC2)', () => {
      expect(isEducationDomain('khanacademy.org', enabledExemption)).toBe(true)
      expect(isEducationDomain('wikipedia.org', enabledExemption)).toBe(true)
      expect(isEducationDomain('coursera.org', enabledExemption)).toBe(true)
      expect(isEducationDomain('duolingo.com', enabledExemption)).toBe(true)
    })

    it('matches subdomains of curated domains', () => {
      expect(isEducationDomain('www.khanacademy.org', enabledExemption)).toBe(true)
      expect(isEducationDomain('en.wikipedia.org', enabledExemption)).toBe(true)
      expect(isEducationDomain('learn.coursera.org', enabledExemption)).toBe(true)
    })

    it('matches .edu domains', () => {
      expect(isEducationDomain('stanford.edu', enabledExemption)).toBe(true)
      expect(isEducationDomain('www.mit.edu', enabledExemption)).toBe(true)
      expect(isEducationDomain('cs.berkeley.edu', enabledExemption)).toBe(true)
    })

    it('matches custom domains added by parent (AC3)', () => {
      const exemptionWithCustom: EducationExemption = {
        enabled: true,
        customDomains: ['myschool.com', 'homeworksite.net'],
        includeHomework: true,
        showExemptNotification: true,
      }

      expect(isEducationDomain('myschool.com', exemptionWithCustom)).toBe(true)
      expect(isEducationDomain('www.myschool.com', exemptionWithCustom)).toBe(true)
      expect(isEducationDomain('homeworksite.net', exemptionWithCustom)).toBe(true)
    })

    it('does not match non-education domains', () => {
      expect(isEducationDomain('youtube.com', enabledExemption)).toBe(false)
      expect(isEducationDomain('facebook.com', enabledExemption)).toBe(false)
      expect(isEducationDomain('reddit.com', enabledExemption)).toBe(false)
      expect(isEducationDomain('google.com', enabledExemption)).toBe(false)
    })

    it('is case insensitive', () => {
      expect(isEducationDomain('KhanAcademy.org', enabledExemption)).toBe(true)
      expect(isEducationDomain('WIKIPEDIA.ORG', enabledExemption)).toBe(true)
      expect(isEducationDomain('Stanford.EDU', enabledExemption)).toBe(true)
    })

    describe('security edge cases', () => {
      it('rejects empty domains', () => {
        expect(isEducationDomain('', enabledExemption)).toBe(false)
      })

      it('rejects whitespace-only domains', () => {
        expect(isEducationDomain('   ', enabledExemption)).toBe(false)
        expect(isEducationDomain('\n', enabledExemption)).toBe(false)
        expect(isEducationDomain('\t', enabledExemption)).toBe(false)
      })

      it('rejects overly long domains', () => {
        const longDomain = 'a'.repeat(300) + '.com'
        expect(isEducationDomain(longDomain, enabledExemption)).toBe(false)
      })

      it('handles empty strings in custom domains gracefully', () => {
        const exemptionWithEmpty: EducationExemption = {
          enabled: true,
          customDomains: ['', '   ', 'valid.com'],
          includeHomework: true,
          showExemptNotification: true,
        }
        // Empty strings should not match anything
        expect(isEducationDomain('youtube.com', exemptionWithEmpty)).toBe(false)
        // But valid custom domain should still work
        expect(isEducationDomain('valid.com', exemptionWithEmpty)).toBe(true)
      })

      it('handles invalid custom domains gracefully', () => {
        const exemptionWithInvalid: EducationExemption = {
          enabled: true,
          customDomains: ['nodot', 'a'.repeat(300), 'valid.edu'],
          includeHomework: true,
          showExemptNotification: true,
        }
        // Invalid domains should not cause errors
        expect(isEducationDomain('youtube.com', exemptionWithInvalid)).toBe(false)
        // Valid custom domain should still work
        expect(isEducationDomain('valid.edu', exemptionWithInvalid)).toBe(true)
      })

      it('does not match .edu.cn or other .edu substrings', () => {
        // .edu as TLD is exempt, but .edu.cn is not
        expect(isEducationDomain('stanford.edu', enabledExemption)).toBe(true)
        expect(isEducationDomain('some.edu.cn', enabledExemption)).toBe(false)
      })

      it('does not match partial domain names', () => {
        // Should not match "khanacademy.org.evil.com"
        expect(isEducationDomain('khanacademy.org.evil.com', enabledExemption)).toBe(false)
        // But should match "www.khanacademy.org"
        expect(isEducationDomain('www.khanacademy.org', enabledExemption)).toBe(true)
      })

      it('trims whitespace from input domains', () => {
        expect(isEducationDomain('  khanacademy.org  ', enabledExemption)).toBe(true)
        expect(isEducationDomain('\nwikipedia.org\t', enabledExemption)).toBe(true)
      })
    })
  })

  describe('isEducationCategory', () => {
    const enabledExemption: EducationExemption = {
      enabled: true,
      customDomains: [],
      includeHomework: true,
      showExemptNotification: true,
    }

    const disabledExemption: EducationExemption = {
      enabled: false,
      customDomains: [],
      includeHomework: true,
      showExemptNotification: true,
    }

    const noHomeworkExemption: EducationExemption = {
      enabled: true,
      customDomains: [],
      includeHomework: false,
      showExemptNotification: true,
    }

    it('returns false when exemption is disabled', () => {
      expect(isEducationCategory('Education', disabledExemption)).toBe(false)
      expect(isEducationCategory('Homework', disabledExemption)).toBe(false)
    })

    it('matches Education category (AC1)', () => {
      expect(isEducationCategory('Education', enabledExemption)).toBe(true)
      expect(isEducationCategory('education', enabledExemption)).toBe(true)
      expect(isEducationCategory('EDUCATION', enabledExemption)).toBe(true)
    })

    it('matches Homework category when includeHomework is true (AC1)', () => {
      expect(isEducationCategory('Homework', enabledExemption)).toBe(true)
      expect(isEducationCategory('homework', enabledExemption)).toBe(true)
    })

    it('does not match Homework when includeHomework is false', () => {
      expect(isEducationCategory('Homework', noHomeworkExemption)).toBe(false)
      expect(isEducationCategory('homework', noHomeworkExemption)).toBe(false)
    })

    it('does not match non-education categories', () => {
      expect(isEducationCategory('Entertainment', enabledExemption)).toBe(false)
      expect(isEducationCategory('Social', enabledExemption)).toBe(false)
      expect(isEducationCategory('Gaming', enabledExemption)).toBe(false)
      expect(isEducationCategory('Productivity', enabledExemption)).toBe(false)
    })

    it('Education category is always matched even when includeHomework is false', () => {
      expect(isEducationCategory('Education', noHomeworkExemption)).toBe(true)
    })
  })
})
