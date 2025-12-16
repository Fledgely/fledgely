'use client'

import { useMemo, useState, useCallback } from 'react'
import {
  type AgeGroup,
  type TemplateConcern,
  type AgreementTemplate,
  getAllTemplates,
  getTemplatesByAgeGroup,
  findTemplates,
  getTemplateById,
  getTemplateCountsByAgeGroup,
  getTemplateCountsByConcern,
} from '@fledgely/contracts'

interface UseTemplateLibraryOptions {
  initialAgeGroup?: AgeGroup | null
  initialConcerns?: TemplateConcern[]
  initialQuery?: string
}

interface UseTemplateLibraryResult {
  // All templates (cached)
  allTemplates: AgreementTemplate[]
  // Filtered templates based on current filters
  filteredTemplates: AgreementTemplate[]
  // Template counts
  templateCountsByAgeGroup: Record<AgeGroup, number>
  templateCountsByConcern: Record<TemplateConcern, number>
  // Filter state
  selectedAgeGroup: AgeGroup | null
  selectedConcerns: TemplateConcern[]
  searchQuery: string
  // Filter actions
  setSelectedAgeGroup: (ageGroup: AgeGroup | null) => void
  setSelectedConcerns: (concerns: TemplateConcern[]) => void
  setSearchQuery: (query: string) => void
  clearAllFilters: () => void
  // Template lookup
  getTemplate: (id: string) => AgreementTemplate | undefined
  // Status
  hasActiveFilters: boolean
}

/**
 * Hook for accessing and filtering the template library
 *
 * Story 4.1: Template Library Structure - Task 6
 *
 * Templates are bundled in code (S3 strategy) for instant loading.
 * This hook provides a convenient interface for filtering and searching.
 *
 * @example
 * ```tsx
 * const {
 *   filteredTemplates,
 *   selectedAgeGroup,
 *   setSelectedAgeGroup,
 *   hasActiveFilters,
 * } = useTemplateLibrary({
 *   initialAgeGroup: '8-10',
 * })
 * ```
 */
export function useTemplateLibrary(options: UseTemplateLibraryOptions = {}): UseTemplateLibraryResult {
  const {
    initialAgeGroup = null,
    initialConcerns = [],
    initialQuery = '',
  } = options

  // Filter state
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(initialAgeGroup)
  const [selectedConcerns, setSelectedConcerns] = useState<TemplateConcern[]>(initialConcerns)
  const [searchQuery, setSearchQuery] = useState(initialQuery)

  // All templates (memoized since they're static)
  const allTemplates = useMemo(() => getAllTemplates(), [])

  // Template counts (memoized since they're static)
  const templateCountsByAgeGroup = useMemo(() => getTemplateCountsByAgeGroup(), [])
  const templateCountsByConcern = useMemo(() => getTemplateCountsByConcern(), [])

  // Filtered templates based on current filters
  const filteredTemplates = useMemo(() => {
    return findTemplates({
      ageGroup: selectedAgeGroup ?? undefined,
      concerns: selectedConcerns.length > 0 ? selectedConcerns : undefined,
      query: searchQuery.trim() || undefined,
    })
  }, [selectedAgeGroup, selectedConcerns, searchQuery])

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSelectedAgeGroup(null)
    setSelectedConcerns([])
    setSearchQuery('')
  }, [])

  // Template lookup
  const getTemplate = useCallback((id: string) => {
    return getTemplateById(id)
  }, [])

  // Check if any filters are active
  const hasActiveFilters = selectedAgeGroup !== null || selectedConcerns.length > 0 || searchQuery.trim() !== ''

  return {
    allTemplates,
    filteredTemplates,
    templateCountsByAgeGroup,
    templateCountsByConcern,
    selectedAgeGroup,
    selectedConcerns,
    searchQuery,
    setSelectedAgeGroup,
    setSelectedConcerns,
    setSearchQuery,
    clearAllFilters,
    getTemplate,
    hasActiveFilters,
  }
}
