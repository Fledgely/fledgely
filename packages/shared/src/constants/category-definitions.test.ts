/**
 * Category Definitions Tests
 *
 * Story 20.2: Basic Category Taxonomy - AC3, AC4, AC5
 */

import { describe, it, expect } from 'vitest'
import {
  TAXONOMY_VERSION,
  LOW_CONFIDENCE_THRESHOLD,
  CATEGORY_DEFINITIONS,
  getCategoryDefinition,
  getCategoryDescription,
  getCategoryExamples,
  getAllCategoryDefinitions,
  buildCategoryDefinitionsForPrompt,
} from './category-definitions'
import { CATEGORY_VALUES, type Category } from '../contracts'

describe('Category Definitions', () => {
  describe('TAXONOMY_VERSION', () => {
    it('has valid version format', () => {
      expect(TAXONOMY_VERSION).toMatch(/^\d+\.\d+$/)
    })

    it('is version 1.0', () => {
      expect(TAXONOMY_VERSION).toBe('1.0')
    })
  })

  describe('LOW_CONFIDENCE_THRESHOLD', () => {
    it('has reasonable threshold value', () => {
      expect(LOW_CONFIDENCE_THRESHOLD).toBeGreaterThan(0)
      expect(LOW_CONFIDENCE_THRESHOLD).toBeLessThan(50)
    })

    it('is set to 30', () => {
      expect(LOW_CONFIDENCE_THRESHOLD).toBe(30)
    })
  })

  describe('CATEGORY_DEFINITIONS', () => {
    it('has definition for every category value', () => {
      for (const category of CATEGORY_VALUES) {
        expect(CATEGORY_DEFINITIONS[category]).toBeDefined()
      }
    })

    it('has 10 category definitions', () => {
      expect(Object.keys(CATEGORY_DEFINITIONS).length).toBe(10)
    })

    describe('each category definition', () => {
      for (const category of CATEGORY_VALUES) {
        describe(`${category}`, () => {
          const def = CATEGORY_DEFINITIONS[category]

          it('has required fields', () => {
            expect(def.category).toBe(category)
            expect(def.displayName).toBeTruthy()
            expect(def.description).toBeTruthy()
            expect(def.examples).toBeInstanceOf(Array)
            expect(def.edgeCases).toBeInstanceOf(Array)
            expect(def.keywords).toBeInstanceOf(Array)
            expect(def.color).toBeTruthy()
            expect(def.icon).toBeTruthy()
          })

          it('has at least 3 examples', () => {
            expect(def.examples.length).toBeGreaterThanOrEqual(3)
          })

          it('has at least 1 edge case', () => {
            expect(def.edgeCases.length).toBeGreaterThanOrEqual(1)
          })

          it('has at least 3 keywords', () => {
            expect(def.keywords.length).toBeGreaterThanOrEqual(3)
          })

          it('has family-friendly description (no negative words)', () => {
            const negativeWords = ['bad', 'wrong', 'dangerous', 'harmful', 'inappropriate']
            const lowerDesc = def.description.toLowerCase()
            for (const word of negativeWords) {
              expect(lowerDesc).not.toContain(word)
            }
          })

          it('has valid Tailwind color class', () => {
            const validColors = [
              'blue',
              'green',
              'pink',
              'purple',
              'red',
              'cyan',
              'orange',
              'yellow',
              'slate',
              'gray',
            ]
            expect(validColors).toContain(def.color)
          })
        })
      }
    })

    it('includes required categories per AC2', () => {
      const requiredCategories: Category[] = [
        'Homework',
        'Educational',
        'Social Media',
        'Gaming',
        'Entertainment',
        'Communication',
        'Creative',
        'Shopping',
        'News',
        'Other',
      ]

      for (const category of requiredCategories) {
        expect(CATEGORY_DEFINITIONS[category]).toBeDefined()
      }
    })
  })

  describe('getCategoryDefinition', () => {
    it('returns definition for valid category', () => {
      const def = getCategoryDefinition('Gaming')
      expect(def.category).toBe('Gaming')
      expect(def.description).toBeTruthy()
    })

    it('returns definition for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const def = getCategoryDefinition(category)
        expect(def.category).toBe(category)
      }
    })
  })

  describe('getCategoryDescription', () => {
    it('returns description for valid category', () => {
      const desc = getCategoryDescription('Homework')
      expect(desc).toContain('Academic')
    })

    it('returns description for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const desc = getCategoryDescription(category)
        expect(desc.length).toBeGreaterThan(10)
      }
    })
  })

  describe('getCategoryExamples', () => {
    it('returns examples array for valid category', () => {
      const examples = getCategoryExamples('Gaming')
      expect(examples).toBeInstanceOf(Array)
      expect(examples.length).toBeGreaterThan(0)
      expect(examples).toContain('Minecraft')
    })

    it('returns examples for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const examples = getCategoryExamples(category)
        expect(examples).toBeInstanceOf(Array)
        expect(examples.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('getAllCategoryDefinitions', () => {
    it('returns array of all definitions', () => {
      const defs = getAllCategoryDefinitions()
      expect(defs).toBeInstanceOf(Array)
      expect(defs.length).toBe(10)
    })

    it('includes all category values', () => {
      const defs = getAllCategoryDefinitions()
      const categories = defs.map((d) => d.category)

      for (const category of CATEGORY_VALUES) {
        expect(categories).toContain(category)
      }
    })
  })

  describe('buildCategoryDefinitionsForPrompt', () => {
    it('returns non-empty string', () => {
      const prompt = buildCategoryDefinitionsForPrompt()
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('includes all category names', () => {
      const prompt = buildCategoryDefinitionsForPrompt()

      for (const category of CATEGORY_VALUES) {
        expect(prompt).toContain(category)
      }
    })

    it('includes descriptions', () => {
      const prompt = buildCategoryDefinitionsForPrompt()
      expect(prompt).toContain('Academic')
      expect(prompt).toContain('Video games')
      expect(prompt).toContain('Social networking')
    })

    it('includes examples', () => {
      const prompt = buildCategoryDefinitionsForPrompt()
      expect(prompt).toContain('Examples:')
    })

    it('formats as list with dashes', () => {
      const prompt = buildCategoryDefinitionsForPrompt()
      expect(prompt).toContain('- Homework:')
      expect(prompt).toContain('- Gaming:')
    })

    it('limits examples to first 4 per category', () => {
      const prompt = buildCategoryDefinitionsForPrompt()
      // Homework has 6 examples, should only show first 4
      const homeworkExamples = CATEGORY_DEFINITIONS.Homework.examples
      // First 4 should be present
      for (let i = 0; i < 4 && i < homeworkExamples.length; i++) {
        expect(prompt).toContain(homeworkExamples[i])
      }
      // 5th and 6th should not be present if they exist
      if (homeworkExamples.length > 4) {
        expect(prompt).not.toContain(homeworkExamples[4])
      }
    })

    it('uses correct format: "- Category: Description" followed by "  Examples:"', () => {
      const prompt = buildCategoryDefinitionsForPrompt()
      // Check format pattern: category line followed by indented examples line
      expect(prompt).toMatch(/- Homework: .*\n\s+Examples:/)
      expect(prompt).toMatch(/- Gaming: .*\n\s+Examples:/)
    })
  })
})
