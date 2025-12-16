/**
 * Tests for useAgreementModeTerms Hook
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 3.6
 *
 * Tests for term and section filtering based on agreement mode.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { SessionTerm, TemplateSection } from '@fledgely/contracts'
import { useAgreementModeTerms, useFilteredSections } from '../useAgreementModeTerms'

// ============================================
// TEST DATA
// ============================================

const mockTerms: SessionTerm[] = [
  {
    id: 'term-1',
    type: 'screen_time',
    title: 'Daily Screen Time',
    description: '2 hours per day',
    status: 'pending',
    addedBy: 'parent',
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'term-2',
    type: 'bedtime',
    title: 'Bedtime',
    description: 'Devices off at 8pm',
    status: 'accepted',
    addedBy: 'parent',
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'term-3',
    type: 'monitoring',
    title: 'Activity Monitoring',
    description: 'Parents can see activity',
    status: 'pending',
    addedBy: 'parent',
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'term-4',
    type: 'rule',
    title: 'No Social Media',
    description: 'No social media apps',
    status: 'accepted',
    addedBy: 'child',
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'term-5',
    type: 'consequence',
    title: 'Screen Time Reduction',
    description: 'Lose 30 min screen time',
    status: 'pending',
    addedBy: 'parent',
    addedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'term-6',
    type: 'reward',
    title: 'Extra Screen Time',
    description: 'Earn 15 min extra',
    status: 'accepted',
    addedBy: 'child',
    addedAt: '2024-01-01T00:00:00Z',
  },
]

const mockSections: TemplateSection[] = [
  {
    id: 'section-1',
    type: 'screen_time',
    title: 'Screen Time Limits',
    description: 'How much screen time is allowed',
    required: true,
  },
  {
    id: 'section-2',
    type: 'monitoring_rules',
    title: 'Monitoring Settings',
    description: 'What monitoring is enabled',
    required: false,
  },
  {
    id: 'section-3',
    type: 'bedtime_schedule',
    title: 'Bedtime',
    description: 'When devices turn off',
    required: true,
  },
  {
    id: 'section-4',
    type: 'consequences',
    title: 'Consequences',
    description: 'What happens on rule violations',
    required: false,
  },
]

// ============================================
// useAgreementModeTerms TESTS
// ============================================

describe('useAgreementModeTerms', () => {
  describe('full mode', () => {
    it('returns all terms in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.visibleTerms).toHaveLength(6)
      expect(result.current.visibleTerms).toEqual(mockTerms)
    })

    it('allows monitoring terms in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.canAddMonitoringTerm).toBe(true)
    })

    it('has no filtered term types in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.filteredTermTypes).toHaveLength(0)
    })

    it('has all term types available in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.availableTermTypes).toContain('screen_time')
      expect(result.current.availableTermTypes).toContain('bedtime')
      expect(result.current.availableTermTypes).toContain('monitoring')
      expect(result.current.availableTermTypes).toContain('rule')
      expect(result.current.availableTermTypes).toContain('consequence')
      expect(result.current.availableTermTypes).toContain('reward')
    })

    it('returns correct mode label for full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.modeLabel).toBe('Full Agreement')
    })

    it('isAgreementOnlyMode is false in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.isAgreementOnlyMode).toBe(false)
    })

    it('has no hidden section types in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'full')
      )

      expect(result.current.hiddenSectionTypes).toHaveLength(0)
    })
  })

  describe('agreement_only mode', () => {
    it('filters out monitoring terms in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.visibleTerms).toHaveLength(5)
      expect(result.current.visibleTerms.find(t => t.type === 'monitoring')).toBeUndefined()
    })

    it('does not allow monitoring terms in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.canAddMonitoringTerm).toBe(false)
    })

    it('has monitoring as filtered term type in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.filteredTermTypes).toContain('monitoring')
    })

    it('excludes monitoring from available term types in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.availableTermTypes).not.toContain('monitoring')
      expect(result.current.availableTermTypes).toContain('screen_time')
      expect(result.current.availableTermTypes).toContain('bedtime')
      expect(result.current.availableTermTypes).toContain('rule')
    })

    it('returns correct mode label for agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.modeLabel).toBe('Agreement Only')
    })

    it('isAgreementOnlyMode is true in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.isAgreementOnlyMode).toBe(true)
    })

    it('has monitoring_rules as hidden section type in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms(mockTerms, 'agreement_only')
      )

      expect(result.current.hiddenSectionTypes).toContain('monitoring_rules')
    })
  })

  describe('helper functions', () => {
    it('filterTerms helper filters terms correctly', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms([], 'agreement_only')
      )

      const filtered = result.current.filterTerms(mockTerms)
      expect(filtered).toHaveLength(5)
      expect(filtered.find(t => t.type === 'monitoring')).toBeUndefined()
    })

    it('filterSections helper filters sections correctly', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms([], 'agreement_only')
      )

      const filtered = result.current.filterSections(mockSections)
      expect(filtered).toHaveLength(3)
      expect(filtered.find(s => s.type === 'monitoring_rules')).toBeUndefined()
    })

    it('isTermTypeAllowed returns correct values', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms([], 'agreement_only')
      )

      expect(result.current.isTermTypeAllowed('screen_time')).toBe(true)
      expect(result.current.isTermTypeAllowed('bedtime')).toBe(true)
      expect(result.current.isTermTypeAllowed('monitoring')).toBe(false)
      expect(result.current.isTermTypeAllowed('rule')).toBe(true)
    })

    it('isTermTypeAllowed allows all types in full mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms([], 'full')
      )

      expect(result.current.isTermTypeAllowed('screen_time')).toBe(true)
      expect(result.current.isTermTypeAllowed('monitoring')).toBe(true)
    })
  })

  describe('empty arrays', () => {
    it('handles empty terms array', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms([], 'full')
      )

      expect(result.current.visibleTerms).toHaveLength(0)
    })

    it('handles empty terms array in agreement_only mode', () => {
      const { result } = renderHook(() =>
        useAgreementModeTerms([], 'agreement_only')
      )

      expect(result.current.visibleTerms).toHaveLength(0)
      expect(result.current.canAddMonitoringTerm).toBe(false)
    })
  })

  describe('memoization', () => {
    it('returns stable helper functions', () => {
      const { result, rerender } = renderHook(
        ({ mode }) => useAgreementModeTerms(mockTerms, mode),
        { initialProps: { mode: 'full' as const } }
      )

      const initialFilterTerms = result.current.filterTerms
      const initialFilterSections = result.current.filterSections
      const initialIsTermTypeAllowed = result.current.isTermTypeAllowed

      // Rerender with same mode
      rerender({ mode: 'full' })

      // Functions should be stable (referentially equal)
      expect(result.current.filterTerms).toBe(initialFilterTerms)
      expect(result.current.filterSections).toBe(initialFilterSections)
      expect(result.current.isTermTypeAllowed).toBe(initialIsTermTypeAllowed)
    })
  })
})

// ============================================
// useFilteredSections TESTS
// ============================================

describe('useFilteredSections', () => {
  it('returns all sections in full mode', () => {
    const { result } = renderHook(() =>
      useFilteredSections(mockSections, 'full')
    )

    expect(result.current).toHaveLength(4)
  })

  it('filters monitoring_rules sections in agreement_only mode', () => {
    const { result } = renderHook(() =>
      useFilteredSections(mockSections, 'agreement_only')
    )

    expect(result.current).toHaveLength(3)
    expect(result.current.find(s => s.type === 'monitoring_rules')).toBeUndefined()
  })

  it('handles empty sections array', () => {
    const { result } = renderHook(() =>
      useFilteredSections([], 'agreement_only')
    )

    expect(result.current).toHaveLength(0)
  })

  it('works with custom section-like objects', () => {
    const customSections = [
      { id: '1', type: 'screen_time', name: 'Test' },
      { id: '2', type: 'monitoring_rules', name: 'Monitor' },
    ]

    const { result } = renderHook(() =>
      useFilteredSections(customSections, 'agreement_only')
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].type).toBe('screen_time')
  })
})
