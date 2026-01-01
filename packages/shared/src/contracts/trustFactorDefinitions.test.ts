/**
 * Trust Factor Definitions Tests - Story 36.1
 *
 * Tests for trust factor definitions with point values and categories.
 * AC5: Factors breakdown: which behaviors contributed
 */

import { describe, it, expect } from 'vitest'
import {
  TRUST_FACTOR_DEFINITIONS,
  getFactorDefinition,
  getFactorsByCategory,
  calculateFactorPoints,
  type TrustFactorDefinition,
} from './trustFactorDefinitions'
import type { TrustFactor } from './trustScore'

describe('Trust Factor Definitions Constants - Story 36.1', () => {
  describe('TRUST_FACTOR_DEFINITIONS', () => {
    it('should define time-limit-compliance as positive', () => {
      const factor = TRUST_FACTOR_DEFINITIONS.find((f) => f.type === 'time-limit-compliance')
      expect(factor).toBeDefined()
      expect(factor?.category).toBe('positive')
      expect(factor?.basePoints).toBeGreaterThan(0)
    })

    it('should define focus-mode-usage as positive', () => {
      const factor = TRUST_FACTOR_DEFINITIONS.find((f) => f.type === 'focus-mode-usage')
      expect(factor).toBeDefined()
      expect(factor?.category).toBe('positive')
      expect(factor?.basePoints).toBeGreaterThan(0)
    })

    it('should define no-bypass-attempts as positive', () => {
      const factor = TRUST_FACTOR_DEFINITIONS.find((f) => f.type === 'no-bypass-attempts')
      expect(factor).toBeDefined()
      expect(factor?.category).toBe('positive')
      expect(factor?.basePoints).toBeGreaterThan(0)
    })

    it('should define normal-app-usage as neutral', () => {
      const factor = TRUST_FACTOR_DEFINITIONS.find((f) => f.type === 'normal-app-usage')
      expect(factor).toBeDefined()
      expect(factor?.category).toBe('neutral')
      expect(factor?.basePoints).toBe(0)
    })

    it('should define bypass-attempt as concerning', () => {
      const factor = TRUST_FACTOR_DEFINITIONS.find((f) => f.type === 'bypass-attempt')
      expect(factor).toBeDefined()
      expect(factor?.category).toBe('concerning')
      expect(factor?.basePoints).toBeLessThan(0)
    })

    it('should define monitoring-disabled as concerning', () => {
      const factor = TRUST_FACTOR_DEFINITIONS.find((f) => f.type === 'monitoring-disabled')
      expect(factor).toBeDefined()
      expect(factor?.category).toBe('concerning')
      expect(factor?.basePoints).toBeLessThan(0)
    })

    it('should have descriptions for all factors', () => {
      TRUST_FACTOR_DEFINITIONS.forEach((factor) => {
        expect(factor.description).toBeTruthy()
        expect(factor.description.length).toBeGreaterThan(0)
      })
    })

    it('should have 6 defined factors', () => {
      expect(TRUST_FACTOR_DEFINITIONS.length).toBe(6)
    })
  })
})

describe('getFactorDefinition - Story 36.1', () => {
  it('should return definition for valid type', () => {
    const definition = getFactorDefinition('time-limit-compliance')
    expect(definition).not.toBeNull()
    expect(definition?.type).toBe('time-limit-compliance')
  })

  it('should return null for unknown type', () => {
    const definition = getFactorDefinition('unknown-type' as any)
    expect(definition).toBeNull()
  })

  it('should return correct points for time-limit-compliance', () => {
    const definition = getFactorDefinition('time-limit-compliance')
    expect(definition?.basePoints).toBe(5)
  })

  it('should return correct points for focus-mode-usage', () => {
    const definition = getFactorDefinition('focus-mode-usage')
    expect(definition?.basePoints).toBe(3)
  })

  it('should return correct points for no-bypass-attempts', () => {
    const definition = getFactorDefinition('no-bypass-attempts')
    expect(definition?.basePoints).toBe(2)
  })

  it('should return correct points for normal-app-usage', () => {
    const definition = getFactorDefinition('normal-app-usage')
    expect(definition?.basePoints).toBe(0)
  })

  it('should return correct points for bypass-attempt', () => {
    const definition = getFactorDefinition('bypass-attempt')
    expect(definition?.basePoints).toBe(-5)
  })

  it('should return correct points for monitoring-disabled', () => {
    const definition = getFactorDefinition('monitoring-disabled')
    expect(definition?.basePoints).toBe(-3)
  })
})

describe('getFactorsByCategory - Story 36.1', () => {
  describe('positive factors', () => {
    it('should return all positive factors', () => {
      const positiveFactors = getFactorsByCategory('positive')
      expect(positiveFactors.length).toBe(3)
    })

    it('should include time-limit-compliance', () => {
      const positiveFactors = getFactorsByCategory('positive')
      expect(positiveFactors.some((f) => f.type === 'time-limit-compliance')).toBe(true)
    })

    it('should include focus-mode-usage', () => {
      const positiveFactors = getFactorsByCategory('positive')
      expect(positiveFactors.some((f) => f.type === 'focus-mode-usage')).toBe(true)
    })

    it('should include no-bypass-attempts', () => {
      const positiveFactors = getFactorsByCategory('positive')
      expect(positiveFactors.some((f) => f.type === 'no-bypass-attempts')).toBe(true)
    })
  })

  describe('neutral factors', () => {
    it('should return all neutral factors', () => {
      const neutralFactors = getFactorsByCategory('neutral')
      expect(neutralFactors.length).toBe(1)
    })

    it('should include normal-app-usage', () => {
      const neutralFactors = getFactorsByCategory('neutral')
      expect(neutralFactors.some((f) => f.type === 'normal-app-usage')).toBe(true)
    })
  })

  describe('concerning factors', () => {
    it('should return all concerning factors', () => {
      const concerningFactors = getFactorsByCategory('concerning')
      expect(concerningFactors.length).toBe(2)
    })

    it('should include bypass-attempt', () => {
      const concerningFactors = getFactorsByCategory('concerning')
      expect(concerningFactors.some((f) => f.type === 'bypass-attempt')).toBe(true)
    })

    it('should include monitoring-disabled', () => {
      const concerningFactors = getFactorsByCategory('concerning')
      expect(concerningFactors.some((f) => f.type === 'monitoring-disabled')).toBe(true)
    })
  })
})

describe('calculateFactorPoints - Story 36.1', () => {
  const createFactor = (value: number): TrustFactor => ({
    type: 'time-limit-compliance',
    category: 'positive',
    value,
    description: 'Test',
    occurredAt: new Date(),
  })

  it('should return 0 for empty array', () => {
    expect(calculateFactorPoints([])).toBe(0)
  })

  it('should sum positive points', () => {
    const factors = [createFactor(5), createFactor(3), createFactor(2)]
    expect(calculateFactorPoints(factors)).toBe(10)
  })

  it('should sum negative points', () => {
    const factors = [createFactor(-5), createFactor(-3)]
    expect(calculateFactorPoints(factors)).toBe(-8)
  })

  it('should handle mixed positive and negative', () => {
    const factors = [createFactor(5), createFactor(-3), createFactor(2)]
    expect(calculateFactorPoints(factors)).toBe(4)
  })

  it('should handle zero values', () => {
    const factors = [createFactor(5), createFactor(0), createFactor(2)]
    expect(calculateFactorPoints(factors)).toBe(7)
  })

  it('should handle single factor', () => {
    expect(calculateFactorPoints([createFactor(5)])).toBe(5)
  })

  it('should handle many factors', () => {
    const factors = Array.from({ length: 10 }, (_, i) => createFactor(i + 1))
    expect(calculateFactorPoints(factors)).toBe(55) // 1+2+3+...+10
  })
})

describe('TrustFactorDefinition type - Story 36.1', () => {
  it('should have correct structure', () => {
    const definition: TrustFactorDefinition = {
      type: 'time-limit-compliance',
      category: 'positive',
      basePoints: 5,
      description: 'Following time limits',
    }
    expect(definition.type).toBe('time-limit-compliance')
    expect(definition.category).toBe('positive')
    expect(definition.basePoints).toBe(5)
    expect(definition.description).toBe('Following time limits')
  })
})
