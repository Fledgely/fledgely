/**
 * Adult Pattern Detection Contract Tests
 *
 * Story 8.10: Adult Pattern Detection
 *
 * Tests for adult pattern detection schemas and helper functions.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  WORK_APP_DOMAINS,
  FINANCIAL_SITE_DOMAINS,
  ADULT_PATTERN_THRESHOLD,
  MINIMUM_ANALYSIS_DAYS,
  PATTERN_EXPLANATION_COOLDOWN_DAYS,
  adultPatternSignalSchema,
  respondToAdultPatternInputSchema,
  generateAdultPatternFlagId,
  calculateCooldownExpiry,
  matchesDomain,
  isWorkAppUrl,
  isFinancialSiteUrl,
  calculateOverallConfidence,
  validateAdultPatternResponse,
  type AdultPatternSignal,
} from './adultPatternDetection'

describe('adultPatternDetection contracts (Story 8.10)', () => {
  describe('Constants', () => {
    it('has ADULT_PATTERN_THRESHOLD of 65', () => {
      expect(ADULT_PATTERN_THRESHOLD).toBe(65)
    })

    it('has MINIMUM_ANALYSIS_DAYS of 7', () => {
      expect(MINIMUM_ANALYSIS_DAYS).toBe(7)
    })

    it('has PATTERN_EXPLANATION_COOLDOWN_DAYS of 90', () => {
      expect(PATTERN_EXPLANATION_COOLDOWN_DAYS).toBe(90)
    })

    it('has work app domains defined', () => {
      expect(WORK_APP_DOMAINS.length).toBeGreaterThan(20)
      expect(WORK_APP_DOMAINS).toContain('slack.com')
      expect(WORK_APP_DOMAINS).toContain('linkedin.com')
      // Note: github.com excluded to prevent false positives with student programmers
      expect(WORK_APP_DOMAINS).not.toContain('github.com')
    })

    it('has financial site domains defined', () => {
      expect(FINANCIAL_SITE_DOMAINS.length).toBeGreaterThan(20)
      expect(FINANCIAL_SITE_DOMAINS).toContain('chase.com')
      expect(FINANCIAL_SITE_DOMAINS).toContain('fidelity.com')
      expect(FINANCIAL_SITE_DOMAINS).toContain('robinhood.com')
    })
  })

  describe('matchesDomain', () => {
    it('matches exact domain', () => {
      expect(matchesDomain('https://slack.com/channel', WORK_APP_DOMAINS)).toBe(true)
    })

    it('matches subdomain', () => {
      expect(matchesDomain('https://app.slack.com/channel', WORK_APP_DOMAINS)).toBe(true)
    })

    it('returns false for non-matching domain', () => {
      expect(matchesDomain('https://example.com', WORK_APP_DOMAINS)).toBe(false)
    })

    it('handles invalid URL gracefully', () => {
      expect(matchesDomain('not-a-url', WORK_APP_DOMAINS)).toBe(false)
    })

    it('handles empty URL', () => {
      expect(matchesDomain('', WORK_APP_DOMAINS)).toBe(false)
    })
  })

  describe('isWorkAppUrl', () => {
    it('returns true for slack.com', () => {
      expect(isWorkAppUrl('https://slack.com/messages')).toBe(true)
    })

    it('returns true for linkedin.com', () => {
      expect(isWorkAppUrl('https://www.linkedin.com/feed')).toBe(true)
    })

    it('returns false for github.com (excluded - used by students)', () => {
      expect(isWorkAppUrl('https://github.com/user/repo')).toBe(false)
    })

    it('returns false for youtube.com', () => {
      expect(isWorkAppUrl('https://youtube.com/watch')).toBe(false)
    })

    it('returns false for instagram.com', () => {
      expect(isWorkAppUrl('https://instagram.com')).toBe(false)
    })
  })

  describe('isFinancialSiteUrl', () => {
    it('returns true for chase.com', () => {
      expect(isFinancialSiteUrl('https://secure.chase.com/account')).toBe(true)
    })

    it('returns true for fidelity.com', () => {
      expect(isFinancialSiteUrl('https://www.fidelity.com/portfolio')).toBe(true)
    })

    it('returns true for robinhood.com', () => {
      expect(isFinancialSiteUrl('https://robinhood.com/stocks')).toBe(true)
    })

    it('returns false for amazon.com', () => {
      expect(isFinancialSiteUrl('https://amazon.com')).toBe(false)
    })

    it('returns true for turbotax', () => {
      expect(isFinancialSiteUrl('https://turbotax.intuit.com/taxes')).toBe(true)
    })
  })

  describe('calculateOverallConfidence', () => {
    it('returns 0 for empty signals array', () => {
      expect(calculateOverallConfidence([])).toBe(0)
    })

    it('calculates weighted average correctly', () => {
      const signals: AdultPatternSignal[] = [
        {
          signalType: 'work_apps',
          confidence: 100,
          instanceCount: 10,
          description: 'test',
          triggers: [],
        },
        {
          signalType: 'financial_sites',
          confidence: 0,
          instanceCount: 0,
          description: 'test',
          triggers: [],
        },
        {
          signalType: 'adult_schedule',
          confidence: 0,
          instanceCount: 0,
          description: 'test',
          triggers: [],
        },
        {
          signalType: 'communication_patterns',
          confidence: 0,
          instanceCount: 0,
          description: 'test',
          triggers: [],
        },
      ]

      // work_apps = 0.30 weight, so 100 * 0.30 / 1.0 = 30
      const result = calculateOverallConfidence(signals)
      expect(result).toBe(30)
    })

    it('calculates correctly with multiple signals', () => {
      const signals: AdultPatternSignal[] = [
        {
          signalType: 'work_apps',
          confidence: 80,
          instanceCount: 5,
          description: 'test',
          triggers: [],
        },
        {
          signalType: 'financial_sites',
          confidence: 90,
          instanceCount: 3,
          description: 'test',
          triggers: [],
        },
        {
          signalType: 'adult_schedule',
          confidence: 70,
          instanceCount: 2,
          description: 'test',
          triggers: [],
        },
        {
          signalType: 'communication_patterns',
          confidence: 50,
          instanceCount: 1,
          description: 'test',
          triggers: [],
        },
      ]

      // Weighted: (80*0.30 + 90*0.35 + 70*0.25 + 50*0.10) / 1.0
      // = (24 + 31.5 + 17.5 + 5) / 1.0 = 78
      const result = calculateOverallConfidence(signals)
      expect(result).toBe(78)
    })
  })

  describe('generateAdultPatternFlagId', () => {
    it('generates unique IDs', () => {
      const id1 = generateAdultPatternFlagId('child-123', Date.now())
      const id2 = generateAdultPatternFlagId('child-123', Date.now())

      expect(id1).not.toBe(id2) // Random suffix makes them different
    })

    it('includes child ID in flag ID', () => {
      const id = generateAdultPatternFlagId('child-abc', 12345)

      expect(id).toContain('child-abc')
    })

    it('starts with apf_ prefix', () => {
      const id = generateAdultPatternFlagId('child-123', Date.now())

      expect(id.startsWith('apf_')).toBe(true)
    })
  })

  describe('calculateCooldownExpiry', () => {
    it('returns timestamp 90 days in the future', () => {
      const now = Date.now()
      const expiry = calculateCooldownExpiry(now)

      const diffDays = (expiry - now) / (24 * 60 * 60 * 1000)
      expect(diffDays).toBe(90)
    })
  })

  describe('validateAdultPatternResponse', () => {
    it('returns null for valid confirm_adult response', () => {
      const error = validateAdultPatternResponse({
        flagId: 'flag-123',
        response: 'confirm_adult',
      })

      expect(error).toBeNull()
    })

    it('returns null for valid explain_pattern with explanation', () => {
      const error = validateAdultPatternResponse({
        flagId: 'flag-123',
        response: 'explain_pattern',
        explanation: 'My teen has an internship',
      })

      expect(error).toBeNull()
    })

    it('returns error for explain_pattern without explanation', () => {
      const error = validateAdultPatternResponse({
        flagId: 'flag-123',
        response: 'explain_pattern',
      })

      expect(error).toBe('Explanation is required when selecting "explain_pattern"')
    })
  })

  describe('Schema validation', () => {
    describe('adultPatternSignalSchema', () => {
      it('validates valid signal', () => {
        const signal = {
          signalType: 'work_apps',
          confidence: 75,
          instanceCount: 10,
          description: 'Detected 10 work app visits',
          triggers: ['slack.com', 'github.com'],
        }

        const result = adultPatternSignalSchema.safeParse(signal)
        expect(result.success).toBe(true)
      })

      it('rejects invalid signal type', () => {
        const signal = {
          signalType: 'invalid_type',
          confidence: 75,
          instanceCount: 10,
          description: 'test',
          triggers: [],
        }

        const result = adultPatternSignalSchema.safeParse(signal)
        expect(result.success).toBe(false)
      })

      it('rejects confidence over 100', () => {
        const signal = {
          signalType: 'work_apps',
          confidence: 101,
          instanceCount: 10,
          description: 'test',
          triggers: [],
        }

        const result = adultPatternSignalSchema.safeParse(signal)
        expect(result.success).toBe(false)
      })

      it('rejects negative confidence', () => {
        const signal = {
          signalType: 'work_apps',
          confidence: -1,
          instanceCount: 10,
          description: 'test',
          triggers: [],
        }

        const result = adultPatternSignalSchema.safeParse(signal)
        expect(result.success).toBe(false)
      })
    })

    describe('respondToAdultPatternInputSchema', () => {
      it('validates confirm_adult response', () => {
        const input = {
          flagId: 'flag-123',
          response: 'confirm_adult',
        }

        const result = respondToAdultPatternInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it('validates explain_pattern with explanation', () => {
        const input = {
          flagId: 'flag-123',
          response: 'explain_pattern',
          explanation: 'My teen has a part-time job at a bank',
        }

        const result = respondToAdultPatternInputSchema.safeParse(input)
        expect(result.success).toBe(true)
      })

      it('rejects empty flagId', () => {
        const input = {
          flagId: '',
          response: 'confirm_adult',
        }

        const result = respondToAdultPatternInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it('rejects explanation under 10 characters', () => {
        const input = {
          flagId: 'flag-123',
          response: 'explain_pattern',
          explanation: 'short',
        }

        const result = respondToAdultPatternInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })

      it('rejects explanation over 500 characters', () => {
        const input = {
          flagId: 'flag-123',
          response: 'explain_pattern',
          explanation: 'a'.repeat(501),
        }

        const result = respondToAdultPatternInputSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })
})
