/**
 * Crisis Search Keywords Unit Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 1
 *
 * Tests for crisis search keyword detection.
 */

import { describe, it, expect } from 'vitest'
import {
  CRISIS_SEARCH_CATEGORIES,
  CRISIS_SEARCH_KEYWORDS,
  CRISIS_SEARCH_PHRASES,
  isCrisisSearchQuery,
  getResourcesForCategory,
  type CrisisSearchCategory,
  type CrisisSearchMatch,
} from '../keywords'

describe('Crisis Search Keywords', () => {
  describe('CRISIS_SEARCH_CATEGORIES', () => {
    it('has suicide category', () => {
      expect(CRISIS_SEARCH_CATEGORIES.suicide).toBeDefined()
      expect(CRISIS_SEARCH_CATEGORIES.suicide.keywords).toBeDefined()
      expect(CRISIS_SEARCH_CATEGORIES.suicide.phrases).toBeDefined()
      expect(CRISIS_SEARCH_CATEGORIES.suicide.resources).toBeDefined()
    })

    it('has self_harm category', () => {
      expect(CRISIS_SEARCH_CATEGORIES.self_harm).toBeDefined()
      expect(CRISIS_SEARCH_CATEGORIES.self_harm.keywords.length).toBeGreaterThan(0)
    })

    it('has abuse category', () => {
      expect(CRISIS_SEARCH_CATEGORIES.abuse).toBeDefined()
      expect(CRISIS_SEARCH_CATEGORIES.abuse.keywords.length).toBeGreaterThan(0)
    })

    it('has help category', () => {
      expect(CRISIS_SEARCH_CATEGORIES.help).toBeDefined()
      expect(CRISIS_SEARCH_CATEGORIES.help.keywords.length).toBeGreaterThan(0)
    })
  })

  describe('CRISIS_SEARCH_KEYWORDS', () => {
    it('is a flat array of all keywords', () => {
      expect(Array.isArray(CRISIS_SEARCH_KEYWORDS)).toBe(true)
      expect(CRISIS_SEARCH_KEYWORDS.length).toBeGreaterThan(10)
    })

    it('includes suicide keywords', () => {
      expect(CRISIS_SEARCH_KEYWORDS).toContain('suicide')
      expect(CRISIS_SEARCH_KEYWORDS).toContain('suicidal')
    })

    it('includes self-harm keywords', () => {
      expect(CRISIS_SEARCH_KEYWORDS).toContain('self harm')
      expect(CRISIS_SEARCH_KEYWORDS).toContain('cutting')
    })

    it('includes abuse keywords', () => {
      expect(CRISIS_SEARCH_KEYWORDS).toContain('abuse')
      expect(CRISIS_SEARCH_KEYWORDS).toContain('domestic violence')
    })

    it('includes help keywords', () => {
      expect(CRISIS_SEARCH_KEYWORDS).toContain('need help')
      expect(CRISIS_SEARCH_KEYWORDS).toContain('crisis')
    })
  })

  describe('CRISIS_SEARCH_PHRASES', () => {
    it('is a flat array of all phrases', () => {
      expect(Array.isArray(CRISIS_SEARCH_PHRASES)).toBe(true)
      expect(CRISIS_SEARCH_PHRASES.length).toBeGreaterThan(5)
    })

    it('includes suicide phrases', () => {
      expect(CRISIS_SEARCH_PHRASES).toContain('how to kill myself')
      expect(CRISIS_SEARCH_PHRASES).toContain('want to die')
    })

    it('includes self-harm phrases', () => {
      expect(CRISIS_SEARCH_PHRASES).toContain('ways to hurt myself')
    })
  })

  describe('isCrisisSearchQuery', () => {
    describe('phrase matches (high confidence)', () => {
      it('matches "how to kill myself"', () => {
        const result = isCrisisSearchQuery('how to kill myself')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('suicide')
        expect(result?.confidence).toBe('high')
        expect(result?.matchedPattern).toBe('how to kill myself')
      })

      it('matches "i want to die"', () => {
        const result = isCrisisSearchQuery('i want to die')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('suicide')
        expect(result?.confidence).toBe('high')
      })

      it('matches phrases within longer queries', () => {
        const result = isCrisisSearchQuery('reddit how to kill myself methods')
        expect(result).not.toBeNull()
        expect(result?.confidence).toBe('high')
      })

      it('is case-insensitive for phrases', () => {
        const result = isCrisisSearchQuery('HOW TO KILL MYSELF')
        expect(result).not.toBeNull()
        expect(result?.confidence).toBe('high')
      })
    })

    describe('keyword matches (medium confidence)', () => {
      it('matches "suicide"', () => {
        const result = isCrisisSearchQuery('suicide')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('suicide')
        expect(result?.confidence).toBe('medium')
        expect(result?.matchedPattern).toBe('suicide')
      })

      it('matches "suicidal thoughts"', () => {
        const result = isCrisisSearchQuery('suicidal thoughts')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('suicide')
      })

      it('matches "cutting" for self-harm', () => {
        const result = isCrisisSearchQuery('cutting')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('self_harm')
      })

      it('matches "abuse"', () => {
        const result = isCrisisSearchQuery('abuse')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('abuse')
      })

      it('matches "i need help"', () => {
        const result = isCrisisSearchQuery('i need help')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('help')
      })

      it('is case-insensitive for keywords', () => {
        const result = isCrisisSearchQuery('SUICIDE PREVENTION')
        expect(result).not.toBeNull()
      })
    })

    describe('non-matches', () => {
      it('returns null for unrelated queries', () => {
        expect(isCrisisSearchQuery('how to make a cake')).toBeNull()
        expect(isCrisisSearchQuery('best video games 2024')).toBeNull()
        expect(isCrisisSearchQuery('minecraft tutorial')).toBeNull()
      })

      it('returns null for empty query', () => {
        expect(isCrisisSearchQuery('')).toBeNull()
      })

      it('returns null for whitespace-only query', () => {
        expect(isCrisisSearchQuery('   ')).toBeNull()
      })
    })

    describe('category prioritization', () => {
      it('prioritizes phrases over keywords', () => {
        // "how to kill myself" is a phrase, should match with high confidence
        const result = isCrisisSearchQuery('how to kill myself suicide')
        expect(result?.confidence).toBe('high')
      })

      it('returns the first matching category when multiple match', () => {
        // Query contains both suicide and help keywords
        const result = isCrisisSearchQuery('suicide help')
        expect(result).not.toBeNull()
        // Should match suicide first as it appears first in query
      })
    })

    describe('edge cases', () => {
      it('handles query with special characters', () => {
        const result = isCrisisSearchQuery('how to kill myself??!!')
        expect(result).not.toBeNull()
      })

      it('handles query with numbers', () => {
        const result = isCrisisSearchQuery('suicide hotline 988')
        expect(result).not.toBeNull()
        expect(result?.category).toBe('suicide')
      })

      it('handles query with extra whitespace', () => {
        const result = isCrisisSearchQuery('  suicide   ')
        expect(result).not.toBeNull()
      })
    })
  })

  describe('getResourcesForCategory', () => {
    it('returns resources for suicide category', () => {
      const resources = getResourcesForCategory('suicide')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources).toContain('988lifeline.org')
    })

    it('returns resources for self_harm category', () => {
      const resources = getResourcesForCategory('self_harm')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources).toContain('crisistextline.org')
    })

    it('returns resources for abuse category', () => {
      const resources = getResourcesForCategory('abuse')
      expect(resources.length).toBeGreaterThan(0)
      expect(resources).toContain('rainn.org')
    })

    it('returns resources for help category', () => {
      const resources = getResourcesForCategory('help')
      expect(resources.length).toBeGreaterThan(0)
    })

    it('returns empty array for unknown category', () => {
      const resources = getResourcesForCategory('unknown' as CrisisSearchCategory)
      expect(resources).toEqual([])
    })
  })
})
