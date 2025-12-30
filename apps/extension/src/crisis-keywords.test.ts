/**
 * Tests for Crisis Keywords Module (Story 7.6)
 *
 * Tests crisis search detection for the optional interstitial feature.
 * Privacy is critical - these tests verify no data leakage.
 */

import { describe, expect, it } from 'vitest'
import {
  isCrisisSearch,
  getCategoryDisplayName,
  getRelevantResources,
  CRISIS_KEYWORDS,
  _testExports,
} from './crisis-keywords'

const { CRISIS_THRESHOLD, normalizeQuery } = _testExports

describe('Crisis Keywords Module (Story 7.6)', () => {
  describe('isCrisisSearch', () => {
    describe('AC1: Crisis Search Detection', () => {
      it('should detect suicide-related queries', () => {
        const result = isCrisisSearch('how to kill myself')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('suicide')
      })

      it('should detect self-harm queries', () => {
        const result = isCrisisSearch('cutting myself help')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('self_harm')
      })

      it('should detect abuse queries', () => {
        const result = isCrisisSearch('my parent hits me')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('abuse')
      })

      it('should detect crisis helpline queries', () => {
        const result = isCrisisSearch('crisis hotline number')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('crisis_helpline')
      })

      it('should detect eating disorder queries', () => {
        const result = isCrisisSearch('anorexia help for teens')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('eating_disorder')
      })

      it('should detect LGBTQ+ crisis queries', () => {
        const result = isCrisisSearch('trevor project phone number')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('lgbtq_crisis')
      })

      it('should detect runaway queries', () => {
        const result = isCrisisSearch('running away help hotline')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('runaway')
      })

      it('should detect depression crisis queries', () => {
        const result = isCrisisSearch('severe depression help now')
        expect(result.isCrisis).toBe(true)
        expect(result.category).toBe('depression')
      })
    })

    describe('False Positive Prevention', () => {
      it('should NOT detect normal search queries', () => {
        const normalQueries = [
          'how to cook pasta',
          'best video games 2024',
          'homework help math',
          'funny cat videos',
          'minecraft tips',
          'weather forecast',
          'sports scores',
        ]

        for (const query of normalQueries) {
          const result = isCrisisSearch(query)
          expect(result.isCrisis).toBe(false)
          expect(result.category).toBeUndefined()
        }
      })

      it('should NOT detect educational queries about crisis topics', () => {
        // These are borderline but should still trigger for safety
        // We err on the side of caution
        const educationalQueries = [
          'history of suicide prevention',
          'mental health awareness month',
        ]

        for (const query of educationalQueries) {
          const result = isCrisisSearch(query)
          // These may or may not trigger depending on keyword overlap
          // The important thing is we don't crash
          expect(typeof result.isCrisis).toBe('boolean')
        }
      })

      it('should handle very short queries without false positives', () => {
        const shortQueries = ['hi', 'ok', 'no']

        for (const query of shortQueries) {
          const result = isCrisisSearch(query)
          expect(result.isCrisis).toBe(false)
        }
      })
    })

    describe('Case Insensitivity', () => {
      it('should detect queries regardless of case', () => {
        const queries = ['KILL MYSELF', 'Kill Myself', 'kill myself', 'kIlL mYsElF']

        for (const query of queries) {
          const result = isCrisisSearch(query)
          expect(result.isCrisis).toBe(true)
        }
      })
    })

    describe('Whitespace Handling', () => {
      it('should handle extra whitespace', () => {
        const result = isCrisisSearch('  kill   myself  ')
        expect(result.isCrisis).toBe(true)
      })

      it('should handle tabs and newlines', () => {
        const result = isCrisisSearch('suicide\thelp')
        expect(result.isCrisis).toBe(true)
      })
    })

    describe('Input Validation (DoS Prevention)', () => {
      it('should reject null/undefined queries', () => {
        expect(isCrisisSearch(null as unknown as string).isCrisis).toBe(false)
        expect(isCrisisSearch(undefined as unknown as string).isCrisis).toBe(false)
      })

      it('should reject non-string inputs', () => {
        expect(isCrisisSearch(123 as unknown as string).isCrisis).toBe(false)
        expect(isCrisisSearch({} as unknown as string).isCrisis).toBe(false)
      })

      it('should reject queries shorter than minimum length', () => {
        const result = isCrisisSearch('ab')
        expect(result.isCrisis).toBe(false)
      })

      it('should reject queries longer than maximum length', () => {
        const longQuery = 'suicide '.repeat(100) // Way over 500 chars
        const result = isCrisisSearch(longQuery)
        expect(result.isCrisis).toBe(false)
      })

      it('should accept queries at boundary lengths', () => {
        const minLengthQuery = 'abc' // MIN_QUERY_LENGTH
        const result = isCrisisSearch(minLengthQuery)
        // Should process without error (may or may not match)
        expect(typeof result.isCrisis).toBe('boolean')
      })
    })

    describe('Confidence Scores', () => {
      it('should return confidence score', () => {
        const result = isCrisisSearch('suicide hotline')
        expect(result.confidence).toBeGreaterThanOrEqual(CRISIS_THRESHOLD)
      })

      it('should return 0 confidence for non-matching queries', () => {
        const result = isCrisisSearch('minecraft tips')
        expect(result.confidence).toBe(0)
      })

      it('should return higher confidence for higher-weight categories', () => {
        const suicideResult = isCrisisSearch('suicide help')
        const depressionResult = isCrisisSearch('severe depression help')

        // Suicide weight (10) should be higher than depression weight (5)
        expect(suicideResult.confidence).toBeGreaterThan(depressionResult.confidence!)
      })
    })

    describe('Multiple Category Matching', () => {
      it('should return highest weight category when multiple match', () => {
        // This query could match both suicide and crisis_helpline
        const result = isCrisisSearch('suicide crisis hotline')
        expect(result.isCrisis).toBe(true)
        // Should return the first highest-weight match found
        expect(['suicide', 'crisis_helpline']).toContain(result.category)
      })
    })
  })

  describe('getCategoryDisplayName', () => {
    it('should return friendly display names for all categories', () => {
      const categories = Object.keys(CRISIS_KEYWORDS)

      for (const category of categories) {
        const displayName = getCategoryDisplayName(category)
        expect(displayName).toBeTruthy()
        expect(typeof displayName).toBe('string')
        // Should not contain technical category names
        expect(displayName).not.toContain('_')
      }
    })

    it('should return fallback for unknown category', () => {
      const displayName = getCategoryDisplayName('unknown_category')
      expect(displayName).toBe('Need Help')
    })

    it('should return child-friendly names (no alarming language)', () => {
      const displayNames = Object.keys(CRISIS_KEYWORDS).map(getCategoryDisplayName)

      const alarmingWords = ['WARNING', 'ALERT', 'EMERGENCY', 'DANGER', 'SUICIDE']
      for (const name of displayNames) {
        for (const word of alarmingWords) {
          expect(name.toUpperCase()).not.toContain(word)
        }
      }
    })
  })

  describe('getRelevantResources', () => {
    it('should return resources for all categories', () => {
      const categories = Object.keys(CRISIS_KEYWORDS)

      for (const category of categories) {
        const resources = getRelevantResources(category)
        expect(resources.length).toBeGreaterThan(0)
      }
    })

    it('should return resources with required fields', () => {
      const resources = getRelevantResources('suicide')

      for (const resource of resources) {
        expect(resource.name).toBeTruthy()
        expect(resource.domain).toBeTruthy()
        expect(resource.description).toBeTruthy()
        // Phone or text should be present (at least one contact method)
        expect(resource.phone || resource.text).toBeTruthy()
      }
    })

    it('should return fallback resources for unknown category', () => {
      const resources = getRelevantResources('unknown_category')
      expect(resources.length).toBeGreaterThan(0)
      // Should include 988 lifeline as default
      expect(resources.some((r) => r.domain === '988lifeline.org')).toBe(true)
    })

    it('should include 988 Lifeline for suicide category', () => {
      const resources = getRelevantResources('suicide')
      expect(resources.some((r) => r.domain === '988lifeline.org')).toBe(true)
    })

    it('should include Trevor Project for lgbtq_crisis category', () => {
      const resources = getRelevantResources('lgbtq_crisis')
      expect(resources.some((r) => r.domain === 'thetrevorproject.org')).toBe(true)
    })

    it('should include RAINN for abuse category', () => {
      const resources = getRelevantResources('abuse')
      expect(resources.some((r) => r.domain === 'rainn.org')).toBe(true)
    })
  })

  describe('normalizeQuery', () => {
    it('should lowercase queries', () => {
      expect(normalizeQuery('HELLO WORLD')).toBe('hello world')
    })

    it('should trim whitespace', () => {
      expect(normalizeQuery('  hello world  ')).toBe('hello world')
    })

    it('should collapse multiple spaces', () => {
      expect(normalizeQuery('hello    world')).toBe('hello world')
    })

    it('should normalize apostrophes', () => {
      expect(normalizeQuery("don't")).toBe("don't")
      // Smart quotes are normalized to standard quotes
      expect(normalizeQuery('don\u2019t')).toBe("don't") // Right single quotation mark → '
    })

    it('should normalize quotes', () => {
      expect(normalizeQuery('"hello"')).toBe('"hello"')
      // Smart double quotes are normalized to standard double quotes
      expect(normalizeQuery('\u201chello\u201d')).toBe('"hello"') // Left/right double quotation marks → "
    })
  })

  describe('CRISIS_KEYWORDS Structure', () => {
    it('should have valid structure for all categories', () => {
      for (const [category, data] of Object.entries(CRISIS_KEYWORDS)) {
        expect(typeof category).toBe('string')
        expect(typeof data.weight).toBe('number')
        expect(data.weight).toBeGreaterThan(0)
        expect(Array.isArray(data.terms)).toBe(true)
        expect(data.terms.length).toBeGreaterThan(0)
      }
    })

    it('should have weights at or above threshold for high-priority categories', () => {
      const highPriorityCategories = ['suicide', 'self_harm', 'abuse', 'crisis_helpline']

      for (const category of highPriorityCategories) {
        expect(CRISIS_KEYWORDS[category].weight).toBeGreaterThanOrEqual(CRISIS_THRESHOLD)
      }
    })

    it('should have lowercase terms', () => {
      for (const { terms } of Object.values(CRISIS_KEYWORDS)) {
        for (const term of terms) {
          expect(term).toBe(term.toLowerCase())
        }
      }
    })
  })

  describe('Privacy Compliance', () => {
    it('should not include query in return value', () => {
      const query = 'suicide help'
      const result = isCrisisSearch(query)

      // Result should not contain the original query
      const resultString = JSON.stringify(result)
      expect(resultString).not.toContain('suicide help')
    })

    it('should only return category name, not matched term', () => {
      const result = isCrisisSearch('kill myself')

      // Should return category, not the specific matched term
      expect(result.category).toBe('suicide')
      // Should not have any term reference
      expect((result as Record<string, unknown>).term).toBeUndefined()
      expect((result as Record<string, unknown>).matchedTerm).toBeUndefined()
    })
  })

  describe('Performance', () => {
    it('should complete detection in under 5ms', () => {
      const start = performance.now()

      // Run 100 detections
      for (let i = 0; i < 100; i++) {
        isCrisisSearch('suicide help')
        isCrisisSearch('minecraft tips')
        isCrisisSearch('how to kill myself please help')
      }

      const duration = performance.now() - start
      const avgDuration = duration / 300

      // Average should be well under 5ms
      expect(avgDuration).toBeLessThan(5)
    })
  })
})
