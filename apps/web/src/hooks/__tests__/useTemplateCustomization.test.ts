/**
 * Tests for useTemplateCustomization hook.
 *
 * Story 4.5: Template Customization Preview - AC1, AC2, AC5, AC6
 */

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateCustomization } from '../useTemplateCustomization'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

const mockTemplate: AgreementTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'A test template',
  ageGroup: '8-10',
  variation: 'balanced',
  screenTimeLimits: { weekday: 90, weekend: 150 },
  monitoringLevel: 'medium',
  keyRules: ['Rule 1', 'Rule 2', 'Rule 3'],
  createdAt: new Date('2024-01-01'),
}

describe('useTemplateCustomization', () => {
  beforeEach(() => {
    // Clear localStorage before each test to prevent draft pollution
    localStorage.clear()
  })
  describe('initialization', () => {
    it('should initialize with original template', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      expect(result.current.originalTemplate).toBe(mockTemplate)
      expect(result.current.isDirty).toBe(false)
    })

    it('should have empty modifications initially', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      expect(result.current.modifications).toEqual({})
      expect(result.current.customRules).toEqual([])
      expect(result.current.removedRuleIds.size).toBe(0)
    })

    it('should return current values from template', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      expect(result.current.currentValues.screenTimeLimits).toEqual({ weekday: 90, weekend: 150 })
      expect(result.current.currentValues.monitoringLevel).toBe('medium')
    })
  })

  describe('screen time modifications', () => {
    it('should update screen time limits', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setScreenTimeLimits({ weekday: 120, weekend: 180 })
      })

      expect(result.current.currentValues.screenTimeLimits).toEqual({ weekday: 120, weekend: 180 })
      expect(result.current.isDirty).toBe(true)
    })

    it('should mark screenTimeLimits as changed', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      expect(result.current.hasFieldChanged('screenTimeLimits')).toBe(false)

      act(() => {
        result.current.setScreenTimeLimits({ weekday: 120, weekend: 180 })
      })

      expect(result.current.hasFieldChanged('screenTimeLimits')).toBe(true)
    })
  })

  describe('bedtime modifications', () => {
    it('should update bedtime cutoff', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setBedtimeCutoff({ weekday: '21:00', weekend: '22:00' })
      })

      expect(result.current.currentValues.bedtimeCutoff).toEqual({
        weekday: '21:00',
        weekend: '22:00',
      })
      expect(result.current.isDirty).toBe(true)
    })

    it('should allow null bedtime (no limit)', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setBedtimeCutoff({ weekday: '21:00', weekend: '22:00' })
      })

      act(() => {
        result.current.setBedtimeCutoff(null)
      })

      expect(result.current.currentValues.bedtimeCutoff).toBeNull()
    })
  })

  describe('monitoring level modifications', () => {
    it('should update monitoring level', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setMonitoringLevel('high')
      })

      expect(result.current.currentValues.monitoringLevel).toBe('high')
      expect(result.current.isDirty).toBe(true)
    })
  })

  describe('custom rules', () => {
    it('should add custom rule', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.addCustomRule('New custom rule', 'behavior')
      })

      expect(result.current.customRules).toHaveLength(1)
      expect(result.current.customRules[0].text).toBe('New custom rule')
      expect(result.current.customRules[0].category).toBe('behavior')
      expect(result.current.customRules[0].isCustom).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })

    it('should remove custom rule', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.addCustomRule('Rule to remove', 'other')
      })

      const ruleId = result.current.customRules[0].id

      act(() => {
        result.current.removeCustomRule(ruleId)
      })

      expect(result.current.customRules).toHaveLength(0)
    })

    it('should not add empty rule', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.addCustomRule('', 'other')
      })

      expect(result.current.customRules).toHaveLength(0)
    })

    it('should not add rule with only whitespace', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.addCustomRule('   ', 'other')
      })

      expect(result.current.customRules).toHaveLength(0)
    })

    it('should track total rule count', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      // Initial: 3 template rules
      expect(result.current.totalRuleCount).toBe(3)

      // Add a custom rule
      act(() => {
        result.current.addCustomRule('Custom rule 1', 'other')
      })

      expect(result.current.totalRuleCount).toBe(4)

      // Remove a template rule
      act(() => {
        result.current.removeTemplateRule(0)
      })

      expect(result.current.totalRuleCount).toBe(3)
    })
  })

  describe('template rule removal', () => {
    it('should mark template rule as removed', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      expect(result.current.isTemplateRuleRemoved(0)).toBe(false)

      act(() => {
        result.current.removeTemplateRule(0)
      })

      expect(result.current.isTemplateRuleRemoved(0)).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })

    it('should restore removed template rule', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.removeTemplateRule(0)
      })

      act(() => {
        result.current.restoreTemplateRule(0)
      })

      expect(result.current.isTemplateRuleRemoved(0)).toBe(false)
    })
  })

  describe('rule limits (NFR60)', () => {
    it('should enforce maximum 100 rules', () => {
      const templateWithManyRules: AgreementTemplate = {
        ...mockTemplate,
        keyRules: Array.from({ length: 99 }, (_, i) => `Rule ${i + 1}`),
      }

      const { result } = renderHook(() => useTemplateCustomization(templateWithManyRules))

      expect(result.current.canAddMoreRules).toBe(true)

      act(() => {
        result.current.addCustomRule('Rule 100', 'other')
      })

      expect(result.current.canAddMoreRules).toBe(false)
      expect(result.current.totalRuleCount).toBe(100)

      // Try to add another rule
      let addResult: boolean = false
      act(() => {
        addResult = result.current.addCustomRule('Rule 101', 'other')
      })

      expect(addResult).toBe(false)
      expect(result.current.totalRuleCount).toBe(100)
    })
  })

  describe('revert to original', () => {
    it('should clear all modifications', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      // Make various modifications
      act(() => {
        result.current.setScreenTimeLimits({ weekday: 120, weekend: 180 })
        result.current.setMonitoringLevel('high')
        result.current.addCustomRule('Custom rule', 'other')
        result.current.removeTemplateRule(0)
      })

      expect(result.current.isDirty).toBe(true)

      // Revert
      act(() => {
        result.current.revertToOriginal()
      })

      expect(result.current.isDirty).toBe(false)
      expect(result.current.modifications).toEqual({})
      expect(result.current.customRules).toHaveLength(0)
      expect(result.current.removedRuleIds.size).toBe(0)
    })

    it('should restore original values', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setScreenTimeLimits({ weekday: 120, weekend: 180 })
      })

      act(() => {
        result.current.revertToOriginal()
      })

      expect(result.current.currentValues.screenTimeLimits).toEqual({ weekday: 90, weekend: 150 })
    })
  })

  describe('getCustomizationSummary', () => {
    it('should return complete summary', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setScreenTimeLimits({ weekday: 120, weekend: 180 })
        result.current.addCustomRule('Custom rule', 'behavior')
        result.current.removeTemplateRule(0)
      })

      const summary = result.current.getCustomizationSummary()

      expect(summary.templateId).toBe('test-template')
      expect(summary.templateName).toBe('Test Template')
      expect(summary.modifications.screenTimeLimits).toEqual({ weekday: 120, weekend: 180 })
      expect(summary.customRules).toHaveLength(1)
      expect(summary.removedRuleIds).toContain('template-0')
      expect(summary.isDirty).toBe(true)
      expect(summary.totalRuleCount).toBe(3) // 3 original - 1 removed + 1 custom
    })
  })

  describe('getOriginalValue', () => {
    it('should return original screen time limits', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setScreenTimeLimits({ weekday: 999, weekend: 999 })
      })

      expect(result.current.getOriginalValue('screenTimeLimits')).toEqual({
        weekday: 90,
        weekend: 150,
      })
    })

    it('should return original monitoring level', () => {
      const { result } = renderHook(() => useTemplateCustomization(mockTemplate))

      act(() => {
        result.current.setMonitoringLevel('high')
      })

      expect(result.current.getOriginalValue('monitoringLevel')).toBe('medium')
    })
  })
})
