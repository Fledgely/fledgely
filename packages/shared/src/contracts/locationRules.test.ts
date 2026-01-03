/**
 * Unit tests for Location Rule schemas.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC2: Per-Location Time Limits
 * - AC3: Per-Location Category Rules
 */

import { describe, it, expect } from 'vitest'
import {
  categoryOverrideValueSchema,
  categoryOverridesSchema,
  locationRuleSchema,
  setLocationRuleInputSchema,
  deleteLocationRuleInputSchema,
  effectiveLocationRuleSchema,
  type LocationRule,
  type SetLocationRuleInput,
  type EffectiveLocationRule,
} from './index'

describe('categoryOverrideValueSchema', () => {
  it('accepts valid override values', () => {
    const validValues = ['allowed', 'blocked']

    validValues.forEach((value) => {
      const result = categoryOverrideValueSchema.safeParse(value)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid override values', () => {
    const invalidValues = ['restricted', 'enabled', 'disabled', '']

    invalidValues.forEach((value) => {
      const result = categoryOverrideValueSchema.safeParse(value)
      expect(result.success).toBe(false)
    })
  })
})

describe('categoryOverridesSchema', () => {
  it('accepts empty overrides (use defaults)', () => {
    const result = categoryOverridesSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts single category override', () => {
    const overrides = {
      games: 'blocked',
    }

    const result = categoryOverridesSchema.safeParse(overrides)
    expect(result.success).toBe(true)
  })

  it('accepts multiple category overrides', () => {
    const overrides = {
      games: 'blocked',
      education: 'allowed',
      social: 'blocked',
    }

    const result = categoryOverridesSchema.safeParse(overrides)
    expect(result.success).toBe(true)
  })

  it('rejects invalid override values in record', () => {
    const overrides = {
      games: 'maybe',
    }

    const result = categoryOverridesSchema.safeParse(overrides)
    expect(result.success).toBe(false)
  })
})

describe('locationRuleSchema', () => {
  const validRule: LocationRule = {
    id: 'rule-123',
    zoneId: 'zone-456',
    familyId: 'family-789',
    childId: 'child-abc',
    dailyTimeLimitMinutes: 120,
    categoryOverrides: {},
    educationOnlyMode: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('validates a complete rule with all fields', () => {
    const result = locationRuleSchema.safeParse(validRule)
    expect(result.success).toBe(true)
  })

  it('validates rule with null time limit (use default) (AC2)', () => {
    const rule: LocationRule = {
      ...validRule,
      dailyTimeLimitMinutes: null,
    }

    const result = locationRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)
  })

  it('validates rule with category overrides (AC3)', () => {
    const rule: LocationRule = {
      ...validRule,
      categoryOverrides: {
        games: 'blocked',
        education: 'allowed',
      },
    }

    const result = locationRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)
  })

  it('validates rule with education-only mode (AC3)', () => {
    const rule: LocationRule = {
      ...validRule,
      educationOnlyMode: true,
    }

    const result = locationRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)
  })

  describe('time limit validation (AC2)', () => {
    it('accepts 0 minutes (no screen time)', () => {
      const rule = { ...validRule, dailyTimeLimitMinutes: 0 }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(true)
    })

    it('accepts maximum 1440 minutes (24 hours)', () => {
      const rule = { ...validRule, dailyTimeLimitMinutes: 1440 }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(true)
    })

    it('rejects negative time limit', () => {
      const rule = { ...validRule, dailyTimeLimitMinutes: -1 }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })

    it('rejects time limit over 1440 minutes', () => {
      const rule = { ...validRule, dailyTimeLimitMinutes: 1441 }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })
  })

  describe('required fields', () => {
    it('requires id to be a non-empty string', () => {
      const rule = { ...validRule, id: '' }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })

    it('requires zoneId to be a non-empty string', () => {
      const rule = { ...validRule, zoneId: '' }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })

    it('requires familyId to be a non-empty string', () => {
      const rule = { ...validRule, familyId: '' }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })

    it('requires childId to be a non-empty string', () => {
      const rule = { ...validRule, childId: '' }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })

    it('requires createdAt to be a date', () => {
      const rule = { ...validRule, createdAt: 'not-a-date' }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })

    it('requires updatedAt to be a date', () => {
      const rule = { ...validRule, updatedAt: 'not-a-date' }
      const result = locationRuleSchema.safeParse(rule)
      expect(result.success).toBe(false)
    })
  })
})

describe('setLocationRuleInputSchema', () => {
  const validInput: SetLocationRuleInput = {
    familyId: 'family-789',
    zoneId: 'zone-456',
    childId: 'child-abc',
  }

  it('validates input with required fields only', () => {
    const result = setLocationRuleInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('validates input with time limit override', () => {
    const input = {
      ...validInput,
      dailyTimeLimitMinutes: 180,
    }

    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with null time limit (use default)', () => {
    const input = {
      ...validInput,
      dailyTimeLimitMinutes: null,
    }

    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with category overrides', () => {
    const input = {
      ...validInput,
      categoryOverrides: {
        games: 'blocked' as const,
      },
    }

    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with education-only mode', () => {
    const input = {
      ...validInput,
      educationOnlyMode: true,
    }

    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates input with all optional fields', () => {
    const input = {
      ...validInput,
      dailyTimeLimitMinutes: 120,
      categoryOverrides: { games: 'blocked' as const },
      educationOnlyMode: true,
    }

    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty familyId', () => {
    const input = { ...validInput, familyId: '' }
    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty zoneId', () => {
    const input = { ...validInput, zoneId: '' }
    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty childId', () => {
    const input = { ...validInput, childId: '' }
    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects time limit out of range', () => {
    const input = { ...validInput, dailyTimeLimitMinutes: 2000 }
    const result = setLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('deleteLocationRuleInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      familyId: 'family-789',
      ruleId: 'rule-123',
    }

    const result = deleteLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty familyId', () => {
    const input = {
      familyId: '',
      ruleId: 'rule-123',
    }

    const result = deleteLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects empty ruleId', () => {
    const input = {
      familyId: 'family-789',
      ruleId: '',
    }

    const result = deleteLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects missing ruleId', () => {
    const input = { familyId: 'family-789' }
    const result = deleteLocationRuleInputSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('effectiveLocationRuleSchema', () => {
  const validEffectiveRule: EffectiveLocationRule = {
    zoneId: 'zone-456',
    zoneName: "Mom's House",
    zoneType: 'home_1',
    effectiveTimeLimitMinutes: 120,
    educationOnlyMode: false,
    isTimeLimitOverride: true,
  }

  it('validates a complete effective rule', () => {
    const result = effectiveLocationRuleSchema.safeParse(validEffectiveRule)
    expect(result.success).toBe(true)
  })

  it('validates effective rule for school zone', () => {
    const schoolRule: EffectiveLocationRule = {
      ...validEffectiveRule,
      zoneType: 'school',
      zoneName: 'Lincoln Elementary',
      educationOnlyMode: true,
    }

    const result = effectiveLocationRuleSchema.safeParse(schoolRule)
    expect(result.success).toBe(true)
  })

  it('validates effective rule with no override (using defaults)', () => {
    const defaultRule: EffectiveLocationRule = {
      ...validEffectiveRule,
      isTimeLimitOverride: false,
    }

    const result = effectiveLocationRuleSchema.safeParse(defaultRule)
    expect(result.success).toBe(true)
  })

  it('accepts all zone types', () => {
    const zoneTypes = ['home_1', 'home_2', 'school', 'other'] as const

    zoneTypes.forEach((type) => {
      const rule = { ...validEffectiveRule, zoneType: type }
      const result = effectiveLocationRuleSchema.safeParse(rule)
      expect(result.success).toBe(true)
    })
  })

  it('rejects invalid zone type', () => {
    const rule = { ...validEffectiveRule, zoneType: 'invalid' }
    const result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })

  it('requires zoneId to be non-empty', () => {
    const rule = { ...validEffectiveRule, zoneId: '' }
    const result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })

  it('requires zoneName to be non-empty', () => {
    const rule = { ...validEffectiveRule, zoneName: '' }
    const result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })

  it('validates time limit bounds', () => {
    // Valid minimum
    let rule = { ...validEffectiveRule, effectiveTimeLimitMinutes: 0 }
    let result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)

    // Valid maximum
    rule = { ...validEffectiveRule, effectiveTimeLimitMinutes: 1440 }
    result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(true)

    // Invalid (too high)
    rule = { ...validEffectiveRule, effectiveTimeLimitMinutes: 1441 }
    result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)

    // Invalid (negative)
    rule = { ...validEffectiveRule, effectiveTimeLimitMinutes: -1 }
    result = effectiveLocationRuleSchema.safeParse(rule)
    expect(result.success).toBe(false)
  })
})
