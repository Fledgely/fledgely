/**
 * Template Library Tests
 *
 * Story 4.1: Template Library Structure - Task 2.9
 *
 * Tests for:
 * - Template data validation
 * - Helper functions (getAllTemplates, getTemplatesByAgeGroup, filterTemplatesByConcern)
 * - Search and filter functionality
 */

import { describe, it, expect } from 'vitest'
import {
  ALL_TEMPLATES,
  TEMPLATES_BY_AGE_GROUP,
  getAllTemplates,
  getTemplatesByAgeGroup,
  filterTemplatesByConcern,
  filterTemplatesByVariation,
  searchTemplates,
  getTemplateById,
  findTemplates,
  getTemplateCountsByAgeGroup,
  getTemplateCountsByConcern,
  validateAllTemplates,
  ages5to7Templates,
  ages8to10Templates,
  ages11to13Templates,
  ages14to16Templates,
} from './index'
import { agreementTemplateSchema } from '../../agreement-template.schema'
import type { AgeGroup, TemplateConcern, TemplateVariation } from '../../agreement-template.schema'

// ============================================
// TEMPLATE VALIDATION TESTS
// ============================================

describe('Template Data Validation', () => {
  describe('ALL_TEMPLATES', () => {
    it('should contain exactly 12 templates (4 age groups × 3 variations)', () => {
      expect(ALL_TEMPLATES).toHaveLength(12)
    })

    it('should have unique IDs for all templates', () => {
      const ids = ALL_TEMPLATES.map((t) => t.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have all templates pass schema validation', () => {
      for (const template of ALL_TEMPLATES) {
        const result = agreementTemplateSchema.safeParse(template)
        expect(result.success).toBe(true)
        if (!result.success) {
          console.error(`Template ${template.id} failed validation:`, result.error.message)
        }
      }
    })

    it('should have 3 templates per age group', () => {
      const ageGroups: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']
      for (const ageGroup of ageGroups) {
        const count = ALL_TEMPLATES.filter((t) => t.ageGroup === ageGroup).length
        expect(count).toBe(3)
      }
    })

    it('should have one of each variation per age group', () => {
      const ageGroups: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']
      const variations: TemplateVariation[] = ['strict', 'balanced', 'permissive']

      for (const ageGroup of ageGroups) {
        const ageTemplates = ALL_TEMPLATES.filter((t) => t.ageGroup === ageGroup)
        for (const variation of variations) {
          const count = ageTemplates.filter((t) => t.variation === variation).length
          expect(count).toBe(1)
        }
      }
    })
  })

  describe('Individual age group templates', () => {
    it('ages5to7Templates should have 3 templates', () => {
      expect(ages5to7Templates).toHaveLength(3)
    })

    it('ages8to10Templates should have 3 templates', () => {
      expect(ages8to10Templates).toHaveLength(3)
    })

    it('ages11to13Templates should have 3 templates', () => {
      expect(ages11to13Templates).toHaveLength(3)
    })

    it('ages14to16Templates should have 3 templates', () => {
      expect(ages14to16Templates).toHaveLength(3)
    })
  })

  describe('Template content requirements', () => {
    it('should have all templates include at least one section', () => {
      for (const template of ALL_TEMPLATES) {
        expect(template.sections.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should have all templates include at least one concern', () => {
      for (const template of ALL_TEMPLATES) {
        expect(template.concerns.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should have all templates include at least one key rule in summary', () => {
      for (const template of ALL_TEMPLATES) {
        expect(template.summary.keyRules.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should have all templates with non-empty name', () => {
      for (const template of ALL_TEMPLATES) {
        expect(template.name.trim().length).toBeGreaterThan(0)
      }
    })

    it('should have all templates with non-empty description', () => {
      for (const template of ALL_TEMPLATES) {
        expect(template.description.trim().length).toBeGreaterThan(0)
      }
    })

    it('should have all section defaultValues be non-empty', () => {
      for (const template of ALL_TEMPLATES) {
        for (const section of template.sections) {
          expect(section.defaultValue.trim().length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Template section types', () => {
    const expectedSectionTypes = [
      'terms',
      'screen_time',
      'monitoring_rules',
      'bedtime_schedule',
      'app_restrictions',
      'content_filters',
      'consequences',
      'rewards',
    ]

    it('should have all templates include all 8 standard section types', () => {
      for (const template of ALL_TEMPLATES) {
        const sectionTypes = template.sections.map((s) => s.type)
        for (const expectedType of expectedSectionTypes) {
          expect(sectionTypes).toContain(expectedType)
        }
      }
    })

    it('should have sections in consistent order', () => {
      for (const template of ALL_TEMPLATES) {
        const orders = template.sections.map((s) => s.order)
        // Check orders are sequential starting from 0
        for (let i = 0; i < orders.length; i++) {
          expect(orders).toContain(i)
        }
      }
    })
  })
})

// ============================================
// HELPER FUNCTION TESTS
// ============================================

describe('getAllTemplates', () => {
  it('should return all templates', () => {
    const templates = getAllTemplates()
    expect(templates).toHaveLength(12)
  })

  it('should return a new array (not the original)', () => {
    const templates1 = getAllTemplates()
    const templates2 = getAllTemplates()
    expect(templates1).not.toBe(templates2)
    expect(templates1).toEqual(templates2)
  })
})

describe('getTemplatesByAgeGroup', () => {
  it('should return 3 templates for age group 5-7', () => {
    const templates = getTemplatesByAgeGroup('5-7')
    expect(templates).toHaveLength(3)
    templates.forEach((t) => expect(t.ageGroup).toBe('5-7'))
  })

  it('should return 3 templates for age group 8-10', () => {
    const templates = getTemplatesByAgeGroup('8-10')
    expect(templates).toHaveLength(3)
    templates.forEach((t) => expect(t.ageGroup).toBe('8-10'))
  })

  it('should return 3 templates for age group 11-13', () => {
    const templates = getTemplatesByAgeGroup('11-13')
    expect(templates).toHaveLength(3)
    templates.forEach((t) => expect(t.ageGroup).toBe('11-13'))
  })

  it('should return 3 templates for age group 14-16', () => {
    const templates = getTemplatesByAgeGroup('14-16')
    expect(templates).toHaveLength(3)
    templates.forEach((t) => expect(t.ageGroup).toBe('14-16'))
  })

  it('should return a new array (not the original)', () => {
    const templates1 = getTemplatesByAgeGroup('5-7')
    const templates2 = getTemplatesByAgeGroup('5-7')
    expect(templates1).not.toBe(templates2)
    expect(templates1).toEqual(templates2)
  })
})

describe('filterTemplatesByConcern', () => {
  it('should return templates matching a single concern', () => {
    const templates = filterTemplatesByConcern(['gaming'])
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      expect(t.concerns).toContain('gaming')
    })
  })

  it('should return templates matching any of multiple concerns (OR logic)', () => {
    const templates = filterTemplatesByConcern(['gaming', 'social_media'])
    expect(templates.length).toBeGreaterThan(0)
    templates.forEach((t) => {
      const hasGaming = t.concerns.includes('gaming')
      const hasSocialMedia = t.concerns.includes('social_media')
      expect(hasGaming || hasSocialMedia).toBe(true)
    })
  })

  it('should return all templates when empty concerns array is provided', () => {
    const templates = filterTemplatesByConcern([])
    expect(templates).toHaveLength(12)
  })

  it('should filter from provided templates array', () => {
    const ageTemplates = getTemplatesByAgeGroup('11-13')
    const filtered = filterTemplatesByConcern(['social_media'], ageTemplates)
    expect(filtered.length).toBeLessThanOrEqual(ageTemplates.length)
    filtered.forEach((t) => {
      expect(t.ageGroup).toBe('11-13')
      expect(t.concerns).toContain('social_media')
    })
  })

  it('should return all templates that include screen_time', () => {
    const templates = filterTemplatesByConcern(['screen_time'])
    // Screen time should be in most templates
    expect(templates.length).toBeGreaterThanOrEqual(6)
  })

  it('should return all templates that include safety', () => {
    const templates = filterTemplatesByConcern(['safety'])
    // Safety should be in all templates
    expect(templates.length).toBeGreaterThanOrEqual(6)
  })
})

describe('filterTemplatesByVariation', () => {
  it('should return all strict templates', () => {
    const templates = filterTemplatesByVariation('strict')
    expect(templates).toHaveLength(4) // One per age group
    templates.forEach((t) => expect(t.variation).toBe('strict'))
  })

  it('should return all balanced templates', () => {
    const templates = filterTemplatesByVariation('balanced')
    expect(templates).toHaveLength(4)
    templates.forEach((t) => expect(t.variation).toBe('balanced'))
  })

  it('should return all permissive templates', () => {
    const templates = filterTemplatesByVariation('permissive')
    expect(templates).toHaveLength(4)
    templates.forEach((t) => expect(t.variation).toBe('permissive'))
  })

  it('should filter from provided templates array', () => {
    const ageTemplates = getTemplatesByAgeGroup('8-10')
    const filtered = filterTemplatesByVariation('balanced', ageTemplates)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].variation).toBe('balanced')
    expect(filtered[0].ageGroup).toBe('8-10')
  })
})

describe('searchTemplates', () => {
  it('should find templates by name (case-insensitive)', () => {
    const results = searchTemplates('strict')
    expect(results.length).toBeGreaterThanOrEqual(4)
    results.forEach((t) => {
      expect(t.name.toLowerCase()).toContain('strict')
    })
  })

  it('should find templates by description', () => {
    const results = searchTemplates('trust')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((t) => {
      const matches =
        t.name.toLowerCase().includes('trust') || t.description.toLowerCase().includes('trust')
      expect(matches).toBe(true)
    })
  })

  it('should return all templates for empty query', () => {
    const results = searchTemplates('')
    expect(results).toHaveLength(12)
  })

  it('should return all templates for whitespace-only query', () => {
    const results = searchTemplates('   ')
    expect(results).toHaveLength(12)
  })

  it('should search within provided templates array', () => {
    const ageTemplates = getTemplatesByAgeGroup('14-16')
    const results = searchTemplates('balanced', ageTemplates)
    expect(results.length).toBeGreaterThanOrEqual(1)
    results.forEach((t) => {
      expect(t.ageGroup).toBe('14-16')
    })
  })

  it('should return empty array for no matches', () => {
    const results = searchTemplates('xyznonexistent123')
    expect(results).toHaveLength(0)
  })
})

describe('getTemplateById', () => {
  it('should find a template by its ID', () => {
    const firstTemplate = ALL_TEMPLATES[0]
    const found = getTemplateById(firstTemplate.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(firstTemplate.id)
    expect(found?.name).toBe(firstTemplate.name)
  })

  it('should return undefined for non-existent ID', () => {
    const found = getTemplateById('00000000-0000-0000-0000-000000000000')
    expect(found).toBeUndefined()
  })

  it('should return undefined for invalid ID format', () => {
    const found = getTemplateById('invalid-id')
    expect(found).toBeUndefined()
  })
})

describe('findTemplates (advanced search)', () => {
  it('should filter by age group only', () => {
    const results = findTemplates({ ageGroup: '11-13' })
    expect(results).toHaveLength(3)
    results.forEach((t) => expect(t.ageGroup).toBe('11-13'))
  })

  it('should filter by variation only', () => {
    const results = findTemplates({ variation: 'balanced' })
    expect(results).toHaveLength(4)
    results.forEach((t) => expect(t.variation).toBe('balanced'))
  })

  it('should filter by concerns only', () => {
    const results = findTemplates({ concerns: ['gaming'] })
    results.forEach((t) => expect(t.concerns).toContain('gaming'))
  })

  it('should filter by query only', () => {
    const results = findTemplates({ query: 'early' })
    expect(results.length).toBeGreaterThan(0)
    results.forEach((t) => {
      const matches =
        t.name.toLowerCase().includes('early') || t.description.toLowerCase().includes('early')
      expect(matches).toBe(true)
    })
  })

  it('should combine multiple filters', () => {
    const results = findTemplates({
      ageGroup: '11-13',
      variation: 'balanced',
    })
    expect(results).toHaveLength(1)
    expect(results[0].ageGroup).toBe('11-13')
    expect(results[0].variation).toBe('balanced')
  })

  it('should combine all filters', () => {
    const results = findTemplates({
      ageGroup: '11-13',
      variation: 'balanced',
      concerns: ['social_media'],
      query: 'balanced',
    })
    expect(results.length).toBeLessThanOrEqual(1)
    results.forEach((t) => {
      expect(t.ageGroup).toBe('11-13')
      expect(t.variation).toBe('balanced')
      expect(t.concerns).toContain('social_media')
    })
  })

  it('should return all templates when no filters provided', () => {
    const results = findTemplates({})
    expect(results).toHaveLength(12)
  })

  it('should return empty array when filters have no matches', () => {
    const results = findTemplates({
      ageGroup: '5-7',
      query: 'xyznonexistent123',
    })
    expect(results).toHaveLength(0)
  })
})

describe('getTemplateCountsByAgeGroup', () => {
  it('should return correct counts for all age groups', () => {
    const counts = getTemplateCountsByAgeGroup()
    expect(counts['5-7']).toBe(3)
    expect(counts['8-10']).toBe(3)
    expect(counts['11-13']).toBe(3)
    expect(counts['14-16']).toBe(3)
  })

  it('should have total equal to ALL_TEMPLATES length', () => {
    const counts = getTemplateCountsByAgeGroup()
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    expect(total).toBe(ALL_TEMPLATES.length)
  })
})

describe('getTemplateCountsByConcern', () => {
  it('should return counts for all concerns', () => {
    const counts = getTemplateCountsByConcern()
    expect(typeof counts.gaming).toBe('number')
    expect(typeof counts.social_media).toBe('number')
    expect(typeof counts.homework).toBe('number')
    expect(typeof counts.screen_time).toBe('number')
    expect(typeof counts.safety).toBe('number')
  })

  it('should have screen_time in most templates', () => {
    const counts = getTemplateCountsByConcern()
    expect(counts.screen_time).toBeGreaterThanOrEqual(6)
  })

  it('should have safety in most templates', () => {
    const counts = getTemplateCountsByConcern()
    expect(counts.safety).toBeGreaterThanOrEqual(6)
  })
})

describe('validateAllTemplates', () => {
  it('should report all templates as valid', () => {
    const result = validateAllTemplates()
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should report correct total count', () => {
    const result = validateAllTemplates()
    expect(result.totalCount).toBe(12)
  })
})

// ============================================
// TEMPLATES_BY_AGE_GROUP TESTS
// ============================================

describe('TEMPLATES_BY_AGE_GROUP', () => {
  it('should have entries for all 4 age groups', () => {
    expect(Object.keys(TEMPLATES_BY_AGE_GROUP)).toHaveLength(4)
    expect(TEMPLATES_BY_AGE_GROUP['5-7']).toBeDefined()
    expect(TEMPLATES_BY_AGE_GROUP['8-10']).toBeDefined()
    expect(TEMPLATES_BY_AGE_GROUP['11-13']).toBeDefined()
    expect(TEMPLATES_BY_AGE_GROUP['14-16']).toBeDefined()
  })

  it('should have 3 templates per age group', () => {
    expect(TEMPLATES_BY_AGE_GROUP['5-7']).toHaveLength(3)
    expect(TEMPLATES_BY_AGE_GROUP['8-10']).toHaveLength(3)
    expect(TEMPLATES_BY_AGE_GROUP['11-13']).toHaveLength(3)
    expect(TEMPLATES_BY_AGE_GROUP['14-16']).toHaveLength(3)
  })
})

// ============================================
// NFR COMPLIANCE TESTS
// ============================================

describe('NFR65: 6th-grade reading level compliance', () => {
  it('should have descriptions under 500 characters', () => {
    for (const template of ALL_TEMPLATES) {
      expect(template.description.length).toBeLessThanOrEqual(500)
    }
  })

  it('should have section titles under 100 characters', () => {
    for (const template of ALL_TEMPLATES) {
      for (const section of template.sections) {
        expect(section.title.length).toBeLessThanOrEqual(100)
      }
    }
  })

  it('should have key rules under 200 characters each', () => {
    for (const template of ALL_TEMPLATES) {
      for (const rule of template.summary.keyRules) {
        expect(rule.length).toBeLessThanOrEqual(200)
      }
    }
  })

  it('should have section default values under 5000 characters', () => {
    for (const template of ALL_TEMPLATES) {
      for (const section of template.sections) {
        expect(section.defaultValue.length).toBeLessThanOrEqual(5000)
      }
    }
  })
})

describe('Template age-appropriateness', () => {
  it('younger age groups should have comprehensive monitoring by default', () => {
    const youngTemplates = [...ages5to7Templates, ...ages8to10Templates]
    const strictYoung = youngTemplates.filter((t) => t.variation === 'strict')
    strictYoung.forEach((t) => {
      expect(t.summary.monitoringLevel).toBe('comprehensive')
    })
  })

  it('older age groups should have lighter monitoring options', () => {
    const olderPermissive = ages14to16Templates.find((t) => t.variation === 'permissive')
    expect(olderPermissive?.summary.monitoringLevel).toBe('light')
  })
})
