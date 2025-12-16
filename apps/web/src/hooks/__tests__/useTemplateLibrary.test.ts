import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTemplateLibrary } from '../useTemplateLibrary'
import { getAllTemplates, TEMPLATE_CONCERNS } from '@fledgely/contracts'

describe('useTemplateLibrary', () => {
  describe('initialization', () => {
    it('returns all templates by default', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      const allTemplates = getAllTemplates()
      expect(result.current.allTemplates).toHaveLength(allTemplates.length)
      expect(result.current.filteredTemplates).toHaveLength(allTemplates.length)
    })

    it('initializes with null selectedAgeGroup by default', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      expect(result.current.selectedAgeGroup).toBeNull()
    })

    it('initializes with empty selectedConcerns by default', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      expect(result.current.selectedConcerns).toEqual([])
    })

    it('initializes with empty searchQuery by default', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      expect(result.current.searchQuery).toBe('')
    })

    it('respects initialAgeGroup option', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialAgeGroup: '8-10' })
      )

      expect(result.current.selectedAgeGroup).toBe('8-10')
    })

    it('respects initialConcerns option', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialConcerns: ['gaming', 'social_media'] })
      )

      expect(result.current.selectedConcerns).toEqual(['gaming', 'social_media'])
    })

    it('respects initialQuery option', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialQuery: 'balanced' })
      )

      expect(result.current.searchQuery).toBe('balanced')
    })
  })

  describe('filtering by age group', () => {
    it('filters templates by selected age group', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSelectedAgeGroup('8-10')
      })

      expect(result.current.selectedAgeGroup).toBe('8-10')
      expect(result.current.filteredTemplates.every(t => t.ageGroup === '8-10')).toBe(true)
      expect(result.current.filteredTemplates.length).toBeGreaterThan(0)
    })

    it('shows all templates when age group is null', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialAgeGroup: '8-10' })
      )

      act(() => {
        result.current.setSelectedAgeGroup(null)
      })

      expect(result.current.filteredTemplates).toHaveLength(result.current.allTemplates.length)
    })
  })

  describe('filtering by concerns', () => {
    it('filters templates by selected concerns', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSelectedConcerns(['gaming'])
      })

      expect(result.current.selectedConcerns).toEqual(['gaming'])
      expect(result.current.filteredTemplates.every(t => t.concerns.includes('gaming'))).toBe(true)
    })

    it('filters by multiple concerns (OR logic)', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSelectedConcerns(['gaming', 'social_media'])
      })

      expect(result.current.filteredTemplates.every(t =>
        t.concerns.includes('gaming') || t.concerns.includes('social_media')
      )).toBe(true)
    })

    it('shows all templates when concerns array is empty', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialConcerns: ['gaming'] })
      )

      act(() => {
        result.current.setSelectedConcerns([])
      })

      expect(result.current.filteredTemplates).toHaveLength(result.current.allTemplates.length)
    })
  })

  describe('searching', () => {
    it('filters templates by search query', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSearchQuery('balanced')
      })

      expect(result.current.searchQuery).toBe('balanced')
      expect(result.current.filteredTemplates.every(t =>
        t.name.toLowerCase().includes('balanced') ||
        t.description.toLowerCase().includes('balanced')
      )).toBe(true)
    })

    it('trims whitespace from search query', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSearchQuery('  balanced  ')
      })

      // The stored query keeps whitespace, but filtering trims it
      expect(result.current.filteredTemplates.length).toBeGreaterThan(0)
    })

    it('shows all templates when search query is empty', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialQuery: 'balanced' })
      )

      act(() => {
        result.current.setSearchQuery('')
      })

      expect(result.current.filteredTemplates).toHaveLength(result.current.allTemplates.length)
    })
  })

  describe('combined filtering', () => {
    it('combines age group, concerns, and search filters', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSelectedAgeGroup('8-10')
        result.current.setSelectedConcerns(['gaming'])
        result.current.setSearchQuery('balanced')
      })

      expect(result.current.filteredTemplates.every(t =>
        t.ageGroup === '8-10' &&
        t.concerns.includes('gaming') &&
        (t.name.toLowerCase().includes('balanced') ||
         t.description.toLowerCase().includes('balanced'))
      )).toBe(true)
    })
  })

  describe('clearAllFilters', () => {
    it('resets all filters to defaults', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({
          initialAgeGroup: '8-10',
          initialConcerns: ['gaming'],
          initialQuery: 'balanced',
        })
      )

      act(() => {
        result.current.clearAllFilters()
      })

      expect(result.current.selectedAgeGroup).toBeNull()
      expect(result.current.selectedConcerns).toEqual([])
      expect(result.current.searchQuery).toBe('')
      expect(result.current.filteredTemplates).toHaveLength(result.current.allTemplates.length)
    })
  })

  describe('hasActiveFilters', () => {
    it('returns false when no filters are active', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('returns true when age group is selected', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialAgeGroup: '8-10' })
      )

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('returns true when concerns are selected', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialConcerns: ['gaming'] })
      )

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('returns true when search query is present', () => {
      const { result } = renderHook(() =>
        useTemplateLibrary({ initialQuery: 'balanced' })
      )

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('returns false for whitespace-only query', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      act(() => {
        result.current.setSearchQuery('   ')
      })

      expect(result.current.hasActiveFilters).toBe(false)
    })
  })

  describe('getTemplate', () => {
    it('returns template by id', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      const allTemplates = result.current.allTemplates
      const firstTemplate = allTemplates[0]

      const found = result.current.getTemplate(firstTemplate.id)

      expect(found).toEqual(firstTemplate)
    })

    it('returns undefined for non-existent id', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      const found = result.current.getTemplate('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('template counts', () => {
    it('provides counts by age group', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      expect(result.current.templateCountsByAgeGroup).toHaveProperty('5-7')
      expect(result.current.templateCountsByAgeGroup).toHaveProperty('8-10')
      expect(result.current.templateCountsByAgeGroup).toHaveProperty('11-13')
      expect(result.current.templateCountsByAgeGroup).toHaveProperty('14-16')
    })

    it('provides counts by concern', () => {
      const { result } = renderHook(() => useTemplateLibrary())

      for (const concern of TEMPLATE_CONCERNS) {
        expect(result.current.templateCountsByConcern).toHaveProperty(concern)
      }
    })
  })
})
