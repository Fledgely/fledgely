/**
 * Tests for useFilteredTemplates hook.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC3
 */

import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFilteredTemplates } from '../useFilteredTemplates'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

describe('useFilteredTemplates', () => {
  const createTemplate = (overrides: Partial<AgreementTemplate>): AgreementTemplate => ({
    id: `template-${Math.random()}`,
    name: 'Test Template',
    description: 'A test template',
    ageGroup: '8-10',
    variation: 'balanced',
    categories: ['general'],
    screenTimeLimits: { weekday: 120, weekend: 180 },
    monitoringLevel: 'medium',
    keyRules: ['Rule 1'],
    createdAt: new Date(),
    ...overrides,
  })

  const mockTemplates: AgreementTemplate[] = [
    createTemplate({ id: 'low-1', name: 'Low Monitoring', monitoringLevel: 'low' }),
    createTemplate({ id: 'medium-1', name: 'Medium Monitoring', monitoringLevel: 'medium' }),
    createTemplate({ id: 'high-1', name: 'High Monitoring', monitoringLevel: 'high' }),
    createTemplate({ id: 'low-2', name: 'Another Low', monitoringLevel: 'low' }),
    createTemplate({ id: 'high-2', name: 'Another High', monitoringLevel: 'high' }),
  ]

  describe('agreement_only mode', () => {
    it('should filter out high monitoring templates', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const templateNames = result.current.templates.map((t) => t.name)
      expect(templateNames).not.toContain('High Monitoring')
      expect(templateNames).not.toContain('Another High')
    })

    it('should keep low monitoring templates', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const templateNames = result.current.templates.map((t) => t.name)
      expect(templateNames).toContain('Low Monitoring')
      expect(templateNames).toContain('Another Low')
    })

    it('should keep medium monitoring templates', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const templateNames = result.current.templates.map((t) => t.name)
      expect(templateNames).toContain('Medium Monitoring')
    })

    it('should report correct filtered count', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      // 2 high monitoring templates filtered out
      expect(result.current.filteredCount).toBe(2)
    })

    it('should report high monitoring template as not available', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const highTemplate = mockTemplates.find((t) => t.monitoringLevel === 'high')!
      expect(result.current.isTemplateAvailable(highTemplate)).toBe(false)
    })

    it('should report low monitoring template as available', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const lowTemplate = mockTemplates.find((t) => t.monitoringLevel === 'low')!
      expect(result.current.isTemplateAvailable(lowTemplate)).toBe(true)
    })

    it('should report medium monitoring template as available', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const mediumTemplate = mockTemplates.find((t) => t.monitoringLevel === 'medium')!
      expect(result.current.isTemplateAvailable(mediumTemplate)).toBe(true)
    })
  })

  describe('full_monitoring mode', () => {
    it('should return all templates', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'full_monitoring', templates: mockTemplates })
      )

      expect(result.current.templates).toHaveLength(5)
    })

    it('should include high monitoring templates', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'full_monitoring', templates: mockTemplates })
      )

      const templateNames = result.current.templates.map((t) => t.name)
      expect(templateNames).toContain('High Monitoring')
      expect(templateNames).toContain('Another High')
    })

    it('should report zero filtered count', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'full_monitoring', templates: mockTemplates })
      )

      expect(result.current.filteredCount).toBe(0)
    })

    it('should report all templates as available', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'full_monitoring', templates: mockTemplates })
      )

      mockTemplates.forEach((template) => {
        expect(result.current.isTemplateAvailable(template)).toBe(true)
      })
    })
  })

  describe('empty templates', () => {
    it('should handle empty templates array', () => {
      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: [] })
      )

      expect(result.current.templates).toHaveLength(0)
      expect(result.current.filteredCount).toBe(0)
    })
  })

  describe('mode switching', () => {
    it('should update templates when mode changes', () => {
      const { result, rerender } = renderHook(
        ({ mode }) => useFilteredTemplates({ mode, templates: mockTemplates }),
        { initialProps: { mode: 'agreement_only' as const } }
      )

      expect(result.current.templates).toHaveLength(3)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.templates).toHaveLength(5)
    })

    it('should update filteredCount when mode changes', () => {
      const { result, rerender } = renderHook(
        ({ mode }) => useFilteredTemplates({ mode, templates: mockTemplates }),
        { initialProps: { mode: 'agreement_only' as const } }
      )

      expect(result.current.filteredCount).toBe(2)

      rerender({ mode: 'full_monitoring' })

      expect(result.current.filteredCount).toBe(0)
    })
  })

  describe('return value stability', () => {
    it('should return stable templates array for same inputs', () => {
      const { result, rerender } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const initialTemplates = result.current.templates
      rerender()

      expect(result.current.templates).toBe(initialTemplates)
    })

    it('should return stable isTemplateAvailable function for same mode', () => {
      const { result, rerender } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: mockTemplates })
      )

      const initialFn = result.current.isTemplateAvailable
      rerender()

      expect(result.current.isTemplateAvailable).toBe(initialFn)
    })
  })

  describe('all low monitoring only', () => {
    it('should not filter any templates when all are low', () => {
      const lowOnlyTemplates = [
        createTemplate({ id: 'low-1', monitoringLevel: 'low' }),
        createTemplate({ id: 'low-2', monitoringLevel: 'low' }),
      ]

      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: lowOnlyTemplates })
      )

      expect(result.current.templates).toHaveLength(2)
      expect(result.current.filteredCount).toBe(0)
    })
  })

  describe('all high monitoring only', () => {
    it('should filter all templates when all are high', () => {
      const highOnlyTemplates = [
        createTemplate({ id: 'high-1', monitoringLevel: 'high' }),
        createTemplate({ id: 'high-2', monitoringLevel: 'high' }),
      ]

      const { result } = renderHook(() =>
        useFilteredTemplates({ mode: 'agreement_only', templates: highOnlyTemplates })
      )

      expect(result.current.templates).toHaveLength(0)
      expect(result.current.filteredCount).toBe(2)
    })
  })
})
