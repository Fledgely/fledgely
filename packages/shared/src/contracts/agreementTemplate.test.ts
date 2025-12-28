/**
 * Unit tests for Agreement Template schemas.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC3
 * Story 4.2: Age-Appropriate Template Content - AC5, AC6
 */

import { describe, it, expect } from 'vitest'
import {
  ageGroupSchema,
  templateVariationSchema,
  templateCategorySchema,
  monitoringLevelSchema,
  screenTimeLimitsSchema,
  agreementTemplateSchema,
  autonomyMilestoneSchema,
  simpleRuleSchema,
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

  // Story 4.2: Age-appropriate content tests
  it('validates template with autonomy milestones (for 14-16)', () => {
    const template = {
      ...validTemplate,
      ageGroup: '14-16',
      autonomyMilestones: [
        {
          milestone: 'Maintain grades above B average for one semester',
          reward: 'Extended screen time on weekends',
          description: 'Demonstrates responsibility with school work',
        },
        {
          milestone: 'No concerning flags for 3 months',
          reward: 'Reduced monitoring frequency',
        },
      ],
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('validates template with simple rules (for 5-7)', () => {
    const template = {
      ...validTemplate,
      ageGroup: '5-7',
      simpleRules: [
        { text: 'Use tablet in living room', isAllowed: true },
        { text: 'Stay on approved apps', isAllowed: true },
        { text: 'Download new apps without asking', isAllowed: false },
      ],
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('validates template with rule examples', () => {
    const template = {
      ...validTemplate,
      ruleExamples: {
        '0': 'Like how you play with toys in the living room with Mom and Dad',
        '1': 'Ask before you open any new games on your tablet',
      },
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('validates template with all optional age-appropriate fields', () => {
    const template = {
      ...validTemplate,
      ageGroup: '14-16',
      autonomyMilestones: [{ milestone: 'Complete driving practice', reward: 'Later curfew' }],
      simpleRules: [], // Empty is allowed
      ruleExamples: { '0': 'Example for first rule' },
    }
    const result = agreementTemplateSchema.safeParse(template)
    expect(result.success).toBe(true)
  })

  it('validates template without any optional age-appropriate fields', () => {
    // Original template without new fields should still work
    const result = agreementTemplateSchema.safeParse(validTemplate)
    expect(result.success).toBe(true)
  })
})

describe('autonomyMilestoneSchema (Story 4.2)', () => {
  it('accepts valid milestone with all fields', () => {
    const milestone = {
      milestone: 'Maintain grades above B average',
      reward: 'Extended screen time',
      description: 'Shows academic responsibility',
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(true)
  })

  it('accepts valid milestone without optional description', () => {
    const milestone = {
      milestone: 'No concerning flags for 3 months',
      reward: 'Reduced monitoring frequency',
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(true)
  })

  it('rejects milestone with empty milestone text', () => {
    const milestone = {
      milestone: '',
      reward: 'Some reward',
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(false)
  })

  it('rejects milestone with empty reward text', () => {
    const milestone = {
      milestone: 'Some milestone',
      reward: '',
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(false)
  })

  it('rejects milestone with milestone text over 100 chars', () => {
    const milestone = {
      milestone: 'x'.repeat(101),
      reward: 'Some reward',
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(false)
  })

  it('rejects milestone with reward text over 200 chars', () => {
    const milestone = {
      milestone: 'Some milestone',
      reward: 'x'.repeat(201),
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(false)
  })

  it('rejects milestone with description over 300 chars', () => {
    const milestone = {
      milestone: 'Some milestone',
      reward: 'Some reward',
      description: 'x'.repeat(301),
    }
    const result = autonomyMilestoneSchema.safeParse(milestone)
    expect(result.success).toBe(false)
  })
})

describe('simpleRuleSchema (Story 4.2)', () => {
  it('accepts valid simple rule with isAllowed true', () => {
    const rule = {
      text: 'Use tablet in living room',
      isAllowed: true,
    }
    const result = simpleRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)
  })

  it('accepts valid simple rule with isAllowed false', () => {
    const rule = {
      text: 'Download apps without asking',
      isAllowed: false,
    }
    const result = simpleRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)
  })

  it('rejects simple rule with empty text', () => {
    const rule = {
      text: '',
      isAllowed: true,
    }
    const result = simpleRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })

  it('rejects simple rule with text over 100 chars', () => {
    const rule = {
      text: 'x'.repeat(101),
      isAllowed: true,
    }
    const result = simpleRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })

  it('rejects simple rule with missing isAllowed', () => {
    const rule = {
      text: 'Some rule',
    }
    const result = simpleRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })

  it('rejects simple rule with non-boolean isAllowed', () => {
    const rule = {
      text: 'Some rule',
      isAllowed: 'yes',
    }
    const result = simpleRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })
})
