/**
 * Unit tests for getTemplateLibrary Cloud Functions
 *
 * Story 4.1: Template Library Structure - Task 3.7
 *
 * AC #1: Templates organized by age groups (5-7, 8-10, 11-13, 14-16)
 * AC #4: Parent can search/filter templates by specific concerns
 * AC #6: Templates load within 1 second (bundled data, no DB query)
 *
 * NOTE: These tests verify the Cloud Function input validation and response patterns.
 * The core template filtering logic is tested in:
 * - packages/contracts/src/data/templates/templates.test.ts
 */

import { describe, it, expect } from 'vitest'

import {
  searchTemplatesInputSchema,
  getAllTemplates,
  getTemplatesByAgeGroup,
  filterTemplatesByConcern,
  searchTemplates,
  findTemplates,
  type AgeGroup,
  type TemplateConcern,
} from '@fledgely/contracts'

describe('getTemplateLibrary Cloud Function', () => {
  describe('searchTemplatesInputSchema validation', () => {
    it('validates correct input with all fields', () => {
      const input = {
        query: 'strict',
        ageGroup: '5-7',
        concerns: ['gaming', 'safety'],
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates input with only query', () => {
      const input = {
        query: 'balanced',
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates input with query and age group', () => {
      const input = {
        query: 'teen',
        ageGroup: '14-16',
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates input with query and concerns', () => {
      const input = {
        query: 'monitoring',
        concerns: ['screen_time', 'social_media'],
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects empty query string', () => {
      const input = {
        query: '',
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects query over 100 characters', () => {
      const input = {
        query: 'a'.repeat(101),
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid age group', () => {
      const input = {
        query: 'test',
        ageGroup: 'invalid-age',
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid concern', () => {
      const input = {
        query: 'test',
        concerns: ['invalid-concern'],
      }

      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('accepts empty concerns array as optional filter', () => {
      const input = {
        query: 'test',
        concerns: [],
      }

      // Empty concerns array is valid (optional filter)
      // The function treats it as "no concern filter"
      const result = searchTemplatesInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('Template data validation', () => {
    it('returns all templates when no filters applied', () => {
      const templates = getAllTemplates()
      expect(templates).toHaveLength(12)
    })

    it('returns 3 templates per age group', () => {
      const ageGroups: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']
      for (const ageGroup of ageGroups) {
        const templates = getTemplatesByAgeGroup(ageGroup)
        expect(templates).toHaveLength(3)
        templates.forEach((t) => expect(t.ageGroup).toBe(ageGroup))
      }
    })

    it('filters templates by concern', () => {
      const gamingTemplates = filterTemplatesByConcern(['gaming'])
      expect(gamingTemplates.length).toBeGreaterThan(0)
      gamingTemplates.forEach((t) => {
        expect(t.concerns).toContain('gaming')
      })
    })

    it('searches templates by name', () => {
      const results = searchTemplates('strict')
      expect(results.length).toBeGreaterThanOrEqual(4)
      results.forEach((t) => {
        expect(t.name.toLowerCase()).toContain('strict')
      })
    })

    it('searches templates by description', () => {
      const results = searchTemplates('trust')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Combined filtering with findTemplates', () => {
    it('filters by age group only', () => {
      const results = findTemplates({ ageGroup: '11-13' })
      expect(results).toHaveLength(3)
      results.forEach((t) => expect(t.ageGroup).toBe('11-13'))
    })

    it('filters by concerns only', () => {
      const results = findTemplates({ concerns: ['social_media'] })
      expect(results.length).toBeGreaterThan(0)
      results.forEach((t) => expect(t.concerns).toContain('social_media'))
    })

    it('filters by query only', () => {
      const results = findTemplates({ query: 'balanced' })
      expect(results.length).toBeGreaterThan(0)
    })

    it('combines age group and concerns', () => {
      const results = findTemplates({
        ageGroup: '11-13',
        concerns: ['social_media'],
      })
      expect(results.length).toBeLessThanOrEqual(3)
      results.forEach((t) => {
        expect(t.ageGroup).toBe('11-13')
        expect(t.concerns).toContain('social_media')
      })
    })

    it('combines age group and query', () => {
      const results = findTemplates({
        ageGroup: '14-16',
        query: 'balanced',
      })
      results.forEach((t) => {
        expect(t.ageGroup).toBe('14-16')
      })
    })

    it('combines all filters', () => {
      const results = findTemplates({
        ageGroup: '11-13',
        concerns: ['safety'],
        query: 'trust',
      })
      results.forEach((t) => {
        expect(t.ageGroup).toBe('11-13')
        expect(t.concerns).toContain('safety')
      })
    })

    it('returns empty array when no matches', () => {
      const results = findTemplates({
        query: 'xyznonexistent123',
      })
      expect(results).toHaveLength(0)
    })
  })

  describe('Age group validation', () => {
    const validAgeGroups: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']

    it('accepts all valid age groups', () => {
      for (const ageGroup of validAgeGroups) {
        const templates = getTemplatesByAgeGroup(ageGroup)
        expect(templates).toHaveLength(3)
      }
    })
  })

  describe('Concern validation', () => {
    const validConcerns: TemplateConcern[] = [
      'gaming',
      'social_media',
      'homework',
      'screen_time',
      'safety',
    ]

    it('accepts all valid concerns', () => {
      for (const concern of validConcerns) {
        const templates = filterTemplatesByConcern([concern])
        expect(templates.length).toBeGreaterThan(0)
        templates.forEach((t) => expect(t.concerns).toContain(concern))
      }
    })

    it('handles multiple concerns with OR logic', () => {
      const templates = filterTemplatesByConcern(['gaming', 'social_media'])
      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((t) => {
        const hasGaming = t.concerns.includes('gaming')
        const hasSocialMedia = t.concerns.includes('social_media')
        expect(hasGaming || hasSocialMedia).toBe(true)
      })
    })
  })

  describe('Performance characteristics', () => {
    it('returns all templates quickly (< 10ms)', () => {
      const start = Date.now()
      const templates = getAllTemplates()
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10)
      expect(templates).toHaveLength(12)
    })

    it('filters by age group quickly (< 10ms)', () => {
      const start = Date.now()
      const templates = getTemplatesByAgeGroup('11-13')
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10)
      expect(templates).toHaveLength(3)
    })

    it('searches templates quickly (< 10ms)', () => {
      const start = Date.now()
      const templates = searchTemplates('balanced')
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10)
      expect(templates.length).toBeGreaterThan(0)
    })

    it('combined filtering is quick (< 10ms)', () => {
      const start = Date.now()
      const templates = findTemplates({
        ageGroup: '8-10',
        concerns: ['gaming'],
        query: 'rules',
      })
      const elapsed = Date.now() - start
      expect(elapsed).toBeLessThan(10)
    })
  })

  describe('Response structure', () => {
    it('templates have all required fields', () => {
      const templates = getAllTemplates()
      templates.forEach((t) => {
        expect(t.id).toBeDefined()
        expect(t.name).toBeDefined()
        expect(t.description).toBeDefined()
        expect(t.ageGroup).toBeDefined()
        expect(t.variation).toBeDefined()
        expect(t.concerns).toBeDefined()
        expect(t.summary).toBeDefined()
        expect(t.sections).toBeDefined()
        expect(t.createdAt).toBeDefined()
        expect(t.updatedAt).toBeDefined()
      })
    })

    it('template summaries have required fields', () => {
      const templates = getAllTemplates()
      templates.forEach((t) => {
        expect(t.summary.screenTimeLimit).toBeDefined()
        expect(t.summary.monitoringLevel).toBeDefined()
        expect(t.summary.keyRules).toBeDefined()
        expect(Array.isArray(t.summary.keyRules)).toBe(true)
      })
    })

    it('template sections have required fields', () => {
      const templates = getAllTemplates()
      templates.forEach((t) => {
        t.sections.forEach((s) => {
          expect(s.id).toBeDefined()
          expect(s.type).toBeDefined()
          expect(s.title).toBeDefined()
          expect(s.description).toBeDefined()
          expect(s.defaultValue).toBeDefined()
          expect(typeof s.customizable).toBe('boolean')
          expect(typeof s.order).toBe('number')
        })
      })
    })
  })
})
