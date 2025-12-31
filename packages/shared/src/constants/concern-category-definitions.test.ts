/**
 * Concern Category Definitions Tests
 *
 * Story 21.1: Concerning Content Categories - AC2, AC4
 *
 * Tests for concern category definitions, severity guidance, and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  CONCERN_TAXONOMY_VERSION,
  MIN_CONCERN_CONFIDENCE,
  CONCERN_CATEGORY_DEFINITIONS,
  getConcernCategoryDefinition,
  getAllConcernCategoryDefinitions,
  getSeverityGuidance,
  buildConcernDefinitionsForPrompt,
} from './concern-category-definitions'
import { CONCERN_CATEGORY_VALUES, type ConcernCategory } from '../contracts'

describe('Concern Category Definitions (Story 21.1)', () => {
  describe('CONCERN_TAXONOMY_VERSION', () => {
    it('has a valid version format', () => {
      expect(CONCERN_TAXONOMY_VERSION).toMatch(/^\d+\.\d+$/)
    })

    it('starts at version 1.0', () => {
      expect(CONCERN_TAXONOMY_VERSION).toBe('1.0')
    })
  })

  describe('MIN_CONCERN_CONFIDENCE', () => {
    it('is set to 30 to match LOW_CONFIDENCE_THRESHOLD', () => {
      expect(MIN_CONCERN_CONFIDENCE).toBe(30)
    })

    it('is a valid percentage threshold', () => {
      expect(MIN_CONCERN_CONFIDENCE).toBeGreaterThan(0)
      expect(MIN_CONCERN_CONFIDENCE).toBeLessThanOrEqual(100)
    })
  })

  describe('CONCERN_CATEGORY_DEFINITIONS', () => {
    it('has definitions for all concern categories (AC2)', () => {
      for (const category of CONCERN_CATEGORY_VALUES) {
        expect(CONCERN_CATEGORY_DEFINITIONS[category]).toBeDefined()
        expect(CONCERN_CATEGORY_DEFINITIONS[category].category).toBe(category)
      }
    })

    it('has exactly 6 concern categories', () => {
      expect(Object.keys(CONCERN_CATEGORY_DEFINITIONS)).toHaveLength(6)
    })

    describe('Violence definition', () => {
      const def = CONCERN_CATEGORY_DEFINITIONS['Violence']

      it('has correct structure', () => {
        expect(def.category).toBe('Violence')
        expect(def.displayName).toBe('Violence')
        expect(def.description).toContain('physical harm')
      })

      it('has severity guidance (AC4)', () => {
        expect(def.severityGuidance.low).toBeDefined()
        expect(def.severityGuidance.medium).toBeDefined()
        expect(def.severityGuidance.high).toBeDefined()
      })

      it('low severity includes fantasy/game violence', () => {
        expect(def.severityGuidance.low.examples).toContain('Minecraft combat')
      })

      it('high severity includes weapons', () => {
        expect(
          def.severityGuidance.high.examples.some((e) => e.toLowerCase().includes('weapon'))
        ).toBe(true)
      })
    })

    describe('Adult Content definition', () => {
      const def = CONCERN_CATEGORY_DEFINITIONS['Adult Content']

      it('has correct structure', () => {
        expect(def.category).toBe('Adult Content')
        expect(def.description).toContain('explicit')
      })

      it('has progressive severity levels', () => {
        expect(def.severityGuidance.low.description).toContain('Suggestive')
        expect(def.severityGuidance.medium.description).toContain('nudity')
        expect(def.severityGuidance.high.description).toContain('Explicit')
      })
    })

    describe('Bullying definition', () => {
      const def = CONCERN_CATEGORY_DEFINITIONS['Bullying']

      it('has correct structure', () => {
        expect(def.category).toBe('Bullying')
        expect(def.description).toContain('Harassment')
      })

      it('includes cyberbullying indicators', () => {
        expect(def.triggers.some((t) => t.toLowerCase().includes('insult'))).toBe(true)
      })

      it('high severity includes threats', () => {
        expect(
          def.severityGuidance.high.examples.some((e) => e.toLowerCase().includes('threat'))
        ).toBe(true)
      })
    })

    describe('Self-Harm Indicators definition', () => {
      const def = CONCERN_CATEGORY_DEFINITIONS['Self-Harm Indicators']

      it('has correct structure', () => {
        expect(def.category).toBe('Self-Harm Indicators')
        expect(def.description).toContain('self-injury')
      })

      it('includes crisis resources in triggers', () => {
        expect(def.triggers.some((t) => t.toLowerCase().includes('crisis'))).toBe(true)
      })

      it('low severity includes general sad content', () => {
        expect(def.severityGuidance.low.description).toContain('sad')
      })

      it('high severity includes active crisis', () => {
        expect(def.severityGuidance.high.description).toContain('crisis')
      })
    })

    describe('Explicit Language definition', () => {
      const def = CONCERN_CATEGORY_DEFINITIONS['Explicit Language']

      it('has correct structure', () => {
        expect(def.category).toBe('Explicit Language')
        expect(def.description).toContain('Profanity')
      })

      it('includes hate speech in high severity', () => {
        expect(
          def.severityGuidance.high.examples.some((e) => e.toLowerCase().includes('hate speech'))
        ).toBe(true)
      })
    })

    describe('Unknown Contacts definition', () => {
      const def = CONCERN_CATEGORY_DEFINITIONS['Unknown Contacts']

      it('has correct structure', () => {
        expect(def.category).toBe('Unknown Contacts')
        expect(def.description).toContain('stranger')
      })

      it('includes personal info requests in triggers', () => {
        expect(def.triggers.some((t) => t.toLowerCase().includes('personal information'))).toBe(
          true
        )
      })

      it('high severity includes grooming indicators', () => {
        expect(
          def.severityGuidance.high.examples.some((e) => e.toLowerCase().includes('grooming'))
        ).toBe(true)
      })
    })

    it('all definitions have required fields', () => {
      for (const category of CONCERN_CATEGORY_VALUES) {
        const def = CONCERN_CATEGORY_DEFINITIONS[category]
        expect(def.category).toBeDefined()
        expect(def.displayName).toBeDefined()
        expect(def.description).toBeDefined()
        expect(def.triggers).toBeDefined()
        expect(def.triggers.length).toBeGreaterThan(0)
        expect(def.severityGuidance).toBeDefined()
        expect(def.indicators).toBeDefined()
        expect(def.color).toBeDefined()
        expect(def.icon).toBeDefined()
      }
    })

    it('all definitions have all three severity levels (AC4)', () => {
      for (const category of CONCERN_CATEGORY_VALUES) {
        const def = CONCERN_CATEGORY_DEFINITIONS[category]
        expect(def.severityGuidance.low.level).toBe('low')
        expect(def.severityGuidance.medium.level).toBe('medium')
        expect(def.severityGuidance.high.level).toBe('high')
        expect(def.severityGuidance.low.examples.length).toBeGreaterThan(0)
        expect(def.severityGuidance.medium.examples.length).toBeGreaterThan(0)
        expect(def.severityGuidance.high.examples.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getConcernCategoryDefinition', () => {
    it('returns definition for valid category', () => {
      const def = getConcernCategoryDefinition('Violence')
      expect(def).toBeDefined()
      expect(def?.category).toBe('Violence')
    })

    it('returns undefined for invalid category', () => {
      const def = getConcernCategoryDefinition('Gaming' as ConcernCategory)
      expect(def).toBeUndefined()
    })

    it('returns correct definition for each category', () => {
      for (const category of CONCERN_CATEGORY_VALUES) {
        const def = getConcernCategoryDefinition(category)
        expect(def?.category).toBe(category)
      }
    })
  })

  describe('getAllConcernCategoryDefinitions', () => {
    it('returns array of all definitions', () => {
      const defs = getAllConcernCategoryDefinitions()
      expect(defs).toHaveLength(6)
    })

    it('returns definitions in CONCERN_CATEGORY_VALUES order', () => {
      const defs = getAllConcernCategoryDefinitions()
      for (let i = 0; i < CONCERN_CATEGORY_VALUES.length; i++) {
        expect(defs[i].category).toBe(CONCERN_CATEGORY_VALUES[i])
      }
    })

    it('all definitions are valid ConcernCategoryDefinition', () => {
      const defs = getAllConcernCategoryDefinitions()
      for (const def of defs) {
        expect(def.category).toBeDefined()
        expect(def.severityGuidance).toBeDefined()
      }
    })
  })

  describe('getSeverityGuidance', () => {
    it('returns correct guidance for valid category and severity', () => {
      const guidance = getSeverityGuidance('Violence', 'high')
      expect(guidance).toBeDefined()
      expect(guidance?.level).toBe('high')
    })

    it('returns guidance for all severity levels', () => {
      for (const severity of ['low', 'medium', 'high'] as const) {
        const guidance = getSeverityGuidance('Bullying', severity)
        expect(guidance?.level).toBe(severity)
      }
    })

    it('returns undefined for invalid category', () => {
      const guidance = getSeverityGuidance('Gaming' as ConcernCategory, 'low')
      expect(guidance).toBeUndefined()
    })

    it('guidance has description and examples', () => {
      const guidance = getSeverityGuidance('Self-Harm Indicators', 'medium')
      expect(guidance?.description).toBeDefined()
      expect(guidance?.examples).toBeDefined()
      expect(guidance?.examples.length).toBeGreaterThan(0)
    })
  })

  describe('buildConcernDefinitionsForPrompt', () => {
    it('returns non-empty string', () => {
      const prompt = buildConcernDefinitionsForPrompt()
      expect(prompt.length).toBeGreaterThan(0)
    })

    it('includes all concern categories', () => {
      const prompt = buildConcernDefinitionsForPrompt()
      for (const category of CONCERN_CATEGORY_VALUES) {
        expect(prompt).toContain(category)
      }
    })

    it('includes severity levels', () => {
      const prompt = buildConcernDefinitionsForPrompt()
      expect(prompt).toContain('LOW')
      expect(prompt).toContain('MEDIUM')
      expect(prompt).toContain('HIGH')
    })

    it('includes descriptions', () => {
      const prompt = buildConcernDefinitionsForPrompt()
      expect(prompt).toContain('Violence')
      expect(prompt).toContain('physical harm')
    })

    it('formats correctly for AI prompt', () => {
      const prompt = buildConcernDefinitionsForPrompt()
      expect(prompt).toContain('Concern Categories to Detect')
      expect(prompt).toContain('Triggers:')
      expect(prompt).toContain('Severity Levels:')
    })
  })
})
