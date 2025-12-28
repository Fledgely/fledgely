/**
 * Unit tests for Template Service.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC4, AC6
 */

import { describe, it, expect } from 'vitest'
import {
  getTemplates,
  getTemplatesByAgeGroup,
  filterTemplatesByCategories,
  filterTemplates,
  searchTemplates,
  getTemplateById,
  getTemplateCountByAgeGroup,
} from './templateService'

describe('templateService', () => {
  describe('getTemplates', () => {
    it('returns all templates', async () => {
      const templates = await getTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.length).toBe(11) // 11 templates in seed data
    })

    it('returns templates with required fields', async () => {
      const templates = await getTemplates()
      templates.forEach((t) => {
        expect(t.id).toBeDefined()
        expect(t.name).toBeDefined()
        expect(t.description).toBeDefined()
        expect(t.ageGroup).toBeDefined()
        expect(t.variation).toBeDefined()
        expect(t.categories).toBeDefined()
        expect(t.screenTimeLimits).toBeDefined()
        expect(t.monitoringLevel).toBeDefined()
        expect(t.keyRules).toBeDefined()
      })
    })
  })

  describe('getTemplatesByAgeGroup', () => {
    it('filters templates by age group 5-7', async () => {
      const templates = await getTemplatesByAgeGroup('5-7')
      expect(templates.length).toBe(2)
      templates.forEach((t) => {
        expect(t.ageGroup).toBe('5-7')
      })
    })

    it('filters templates by age group 8-10', async () => {
      const templates = await getTemplatesByAgeGroup('8-10')
      expect(templates.length).toBe(3)
      templates.forEach((t) => {
        expect(t.ageGroup).toBe('8-10')
      })
    })

    it('filters templates by age group 11-13', async () => {
      const templates = await getTemplatesByAgeGroup('11-13')
      expect(templates.length).toBe(3)
      templates.forEach((t) => {
        expect(t.ageGroup).toBe('11-13')
      })
    })

    it('filters templates by age group 14-16', async () => {
      const templates = await getTemplatesByAgeGroup('14-16')
      expect(templates.length).toBe(3)
      templates.forEach((t) => {
        expect(t.ageGroup).toBe('14-16')
      })
    })
  })

  describe('filterTemplatesByCategories', () => {
    it('returns all templates when no categories specified', async () => {
      const templates = await filterTemplatesByCategories([])
      expect(templates.length).toBe(11)
    })

    it('filters by gaming category', async () => {
      const templates = await filterTemplatesByCategories(['gaming'])
      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((t) => {
        expect(t.categories).toContain('gaming')
      })
    })

    it('filters by social_media category', async () => {
      const templates = await filterTemplatesByCategories(['social_media'])
      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((t) => {
        expect(t.categories).toContain('social_media')
      })
    })

    it('filters by homework category', async () => {
      const templates = await filterTemplatesByCategories(['homework'])
      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((t) => {
        expect(t.categories).toContain('homework')
      })
    })

    it('filters by multiple categories (OR logic)', async () => {
      const templates = await filterTemplatesByCategories(['gaming', 'social_media'])
      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((t) => {
        const hasGaming = t.categories.includes('gaming')
        const hasSocialMedia = t.categories.includes('social_media')
        expect(hasGaming || hasSocialMedia).toBe(true)
      })
    })
  })

  describe('filterTemplates', () => {
    it('filters by age group only', async () => {
      const templates = await filterTemplates({ ageGroup: '5-7' })
      expect(templates.length).toBe(2)
    })

    it('filters by categories only', async () => {
      const templates = await filterTemplates({ categories: ['gaming'] })
      expect(templates.length).toBeGreaterThan(0)
    })

    it('filters by search query only', async () => {
      const templates = await filterTemplates({ searchQuery: 'social' })
      expect(templates.length).toBeGreaterThan(0)
    })

    it('combines age group and categories filters', async () => {
      const templates = await filterTemplates({
        ageGroup: '11-13',
        categories: ['social_media'],
      })
      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((t) => {
        expect(t.ageGroup).toBe('11-13')
        expect(t.categories).toContain('social_media')
      })
    })

    it('combines all filter types', async () => {
      const templates = await filterTemplates({
        ageGroup: '11-13',
        categories: ['social_media'],
        searchQuery: 'teen',
      })
      templates.forEach((t) => {
        expect(t.ageGroup).toBe('11-13')
        expect(t.categories).toContain('social_media')
      })
    })

    it('returns empty array when no matches', async () => {
      const templates = await filterTemplates({
        searchQuery: 'nonexistent query xyz123',
      })
      expect(templates.length).toBe(0)
    })
  })

  describe('searchTemplates', () => {
    it('returns all templates for empty query', async () => {
      const templates = await searchTemplates('')
      expect(templates.length).toBe(11)
    })

    it('returns all templates for whitespace query', async () => {
      const templates = await searchTemplates('   ')
      expect(templates.length).toBe(11)
    })

    it('searches template names', async () => {
      const templates = await searchTemplates('Explorer')
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.some((t) => t.name.includes('Explorer'))).toBe(true)
    })

    it('searches template descriptions', async () => {
      const templates = await searchTemplates('supervision')
      expect(templates.length).toBeGreaterThan(0)
    })

    it('searches key rules', async () => {
      const templates = await searchTemplates('common areas')
      expect(templates.length).toBeGreaterThan(0)
    })

    it('search is case insensitive', async () => {
      const upperCase = await searchTemplates('EXPLORER')
      const lowerCase = await searchTemplates('explorer')
      expect(upperCase.length).toBe(lowerCase.length)
    })
  })

  describe('getTemplateById', () => {
    it('returns template for valid ID', async () => {
      const template = await getTemplateById('strict-5-7')
      expect(template).not.toBeNull()
      expect(template?.id).toBe('strict-5-7')
      expect(template?.name).toBe('Supervised Explorer')
    })

    it('returns null for invalid ID', async () => {
      const template = await getTemplateById('nonexistent-id')
      expect(template).toBeNull()
    })
  })

  describe('getTemplateCountByAgeGroup', () => {
    it('returns counts for all age groups', async () => {
      const counts = await getTemplateCountByAgeGroup()
      expect(counts['5-7']).toBe(2)
      expect(counts['8-10']).toBe(3)
      expect(counts['11-13']).toBe(3)
      expect(counts['14-16']).toBe(3)
    })

    it('total count matches all templates', async () => {
      const counts = await getTemplateCountByAgeGroup()
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
      const templates = await getTemplates()
      expect(total).toBe(templates.length)
    })
  })
})
