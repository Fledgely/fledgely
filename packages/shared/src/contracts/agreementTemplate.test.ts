/**
 * Unit tests for Agreement Template schemas.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC3
 */

import { describe, it, expect } from 'vitest'
import {
  ageGroupSchema,
  templateVariationSchema,
  templateCategorySchema,
  monitoringLevelSchema,
  screenTimeLimitsSchema,
  agreementTemplateSchema,
} from './index'

describe('ageGroupSchema', () => {
  it('accepts valid age groups', () => {
    const validGroups = ['5-7', '8-10', '11-13', '14-16']

    validGroups.forEach((group) => {
      const result = ageGroupSchema.safeParse(group)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid age groups', () => {
    const invalidGroups = ['4-5', '17-18', 'child', '']

    invalidGroups.forEach((group) => {
      const result = ageGroupSchema.safeParse(group)
      expect(result.success).toBe(false)
    })
  })
})

describe('templateVariationSchema', () => {
  it('accepts valid variations', () => {
    const validVariations = ['strict', 'balanced', 'permissive']

    validVariations.forEach((variation) => {
      const result = templateVariationSchema.safeParse(variation)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid variations', () => {
    const result = templateVariationSchema.safeParse('relaxed')
    expect(result.success).toBe(false)
  })
})

describe('templateCategorySchema', () => {
  it('accepts valid categories', () => {
    const validCategories = ['gaming', 'social_media', 'homework', 'general']

    validCategories.forEach((category) => {
      const result = templateCategorySchema.safeParse(category)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid categories', () => {
    const result = templateCategorySchema.safeParse('entertainment')
    expect(result.success).toBe(false)
  })
})

describe('monitoringLevelSchema', () => {
  it('accepts valid monitoring levels', () => {
    const validLevels = ['high', 'medium', 'low']

    validLevels.forEach((level) => {
      const result = monitoringLevelSchema.safeParse(level)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid monitoring levels', () => {
    const result = monitoringLevelSchema.safeParse('none')
    expect(result.success).toBe(false)
  })
})

describe('screenTimeLimitsSchema', () => {
  it('accepts valid screen time limits', () => {
    const validLimits = { weekday: 120, weekend: 180 }
    const result = screenTimeLimitsSchema.safeParse(validLimits)
    expect(result.success).toBe(true)
  })

  it('accepts zero screen time', () => {
    const result = screenTimeLimitsSchema.safeParse({ weekday: 0, weekend: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts maximum screen time (480 minutes)', () => {
    const result = screenTimeLimitsSchema.safeParse({ weekday: 480, weekend: 480 })
    expect(result.success).toBe(true)
  })

  it('rejects negative screen time', () => {
    const result = screenTimeLimitsSchema.safeParse({ weekday: -60, weekend: 120 })
    expect(result.success).toBe(false)
  })

  it('rejects screen time over 480 minutes', () => {
    const result = screenTimeLimitsSchema.safeParse({ weekday: 500, weekend: 120 })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = screenTimeLimitsSchema.safeParse({ weekday: 120 })
    expect(result.success).toBe(false)
  })
})

describe('agreementTemplateSchema', () => {
  const validTemplate = {
    id: 'strict-5-7',
    name: 'Supervised Explorer',
    description: 'High supervision for young children just starting with devices',
    ageGroup: '5-7',
    variation: 'strict',
    categories: ['general'],
    screenTimeLimits: { weekday: 60, weekend: 90 },
    monitoringLevel: 'high',
    keyRules: ['Device only in common areas', 'Parent approves all apps'],
    createdAt: new Date('2024-01-01'),
  }

  it('validates a complete valid template', () => {
    const result = agreementTemplateSchema.safeParse(validTemplate)
    expect(result.success).toBe(true)
  })

  it('validates template with multiple categories', () => {
    const template = {
      ...validTemplate,
      categories: ['gaming', 'social_media', 'homework'],
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('validates template with maximum key rules (10)', () => {
    const template = {
      ...validTemplate,
      keyRules: Array(10).fill('Rule'),
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('rejects template with empty name', () => {
    const template = { ...validTemplate, name: '' }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with name over 100 characters', () => {
    const template = { ...validTemplate, name: 'x'.repeat(101) }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with description over 500 characters', () => {
    const template = { ...validTemplate, description: 'x'.repeat(501) }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with empty categories array', () => {
    const template = { ...validTemplate, categories: [] }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with empty key rules array', () => {
    const template = { ...validTemplate, keyRules: [] }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with more than 10 key rules', () => {
    const template = {
      ...validTemplate,
      keyRules: Array(11).fill('Rule'),
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with invalid age group', () => {
    const template = { ...validTemplate, ageGroup: '3-4' }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with invalid variation', () => {
    const template = { ...validTemplate, variation: 'relaxed' }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with invalid category', () => {
    const template = { ...validTemplate, categories: ['entertainment'] }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with invalid monitoring level', () => {
    const template = { ...validTemplate, monitoringLevel: 'none' }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('rejects template with missing required fields', () => {
    const template = {
      id: 'test',
      name: 'Test',
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(false)
  })

  it('validates all age groups', () => {
    const ageGroups = ['5-7', '8-10', '11-13', '14-16']

    ageGroups.forEach((ageGroup) => {
      const template = { ...validTemplate, ageGroup }
      const result = agreementTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    })
  })

  it('validates all variations', () => {
    const variations = ['strict', 'balanced', 'permissive']

    variations.forEach((variation) => {
      const template = { ...validTemplate, variation }
      const result = agreementTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    })
  })

  it('validates all monitoring levels', () => {
    const levels = ['high', 'medium', 'low']

    levels.forEach((monitoringLevel) => {
      const template = { ...validTemplate, monitoringLevel }
      const result = agreementTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    })
  })
})
