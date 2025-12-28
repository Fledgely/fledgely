/**
 * TanStack Query hooks for agreement templates.
 *
 * Story 4.1: Template Library Structure - AC4, AC6
 *
 * Provides React hooks for fetching and filtering templates
 * with caching and loading states.
 */

import { useQuery } from '@tanstack/react-query'
import type { AgeGroup, TemplateCategory } from '@fledgely/shared/contracts'
import {
  getTemplates,
  getTemplatesByAgeGroup,
  filterTemplates,
  searchTemplates,
  getTemplateById,
  type TemplateFilters,
} from '../services/templateService'

/**
 * Fetch all templates.
 *
 * @returns Query result with all templates
 */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
    staleTime: 5 * 60 * 1000, // Templates rarely change - 5 min stale time
  })
}

/**
 * Fetch templates filtered by age group.
 *
 * @param ageGroup - Age group to filter by
 * @returns Query result with filtered templates
 */
export function useTemplatesByAgeGroup(ageGroup: AgeGroup | null) {
  return useQuery({
    queryKey: ['templates', 'ageGroup', ageGroup],
    queryFn: () => (ageGroup ? getTemplatesByAgeGroup(ageGroup) : getTemplates()),
    staleTime: 5 * 60 * 1000,
    enabled: true,
  })
}

/**
 * Fetch templates with filters.
 *
 * @param filters - Filter options
 * @returns Query result with filtered templates
 */
export function useFilteredTemplates(filters: TemplateFilters) {
  return useQuery({
    queryKey: ['templates', 'filtered', filters],
    queryFn: () => filterTemplates(filters),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Search templates by query string.
 *
 * @param query - Search query
 * @param enabled - Whether to enable the query
 * @returns Query result with matching templates
 */
export function useTemplateSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['templates', 'search', query],
    queryFn: () => searchTemplates(query),
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

/**
 * Fetch a single template by ID.
 *
 * @param id - Template ID
 * @returns Query result with template or null
 */
export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => (id ? getTemplateById(id) : Promise.resolve(null)),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  })
}

/**
 * Combined filter state for template library.
 */
export interface TemplateLibraryFilters {
  ageGroup: AgeGroup | null
  categories: TemplateCategory[]
  searchQuery: string
}

/**
 * Hook for template library with combined filters.
 *
 * @param filters - Combined filter state
 * @returns Query result with filtered templates
 */
export function useTemplateLibrary(filters: TemplateLibraryFilters) {
  const templateFilters: TemplateFilters = {
    ageGroup: filters.ageGroup ?? undefined,
    categories: filters.categories.length > 0 ? filters.categories : undefined,
    searchQuery: filters.searchQuery || undefined,
  }

  return useQuery({
    queryKey: ['templates', 'library', templateFilters],
    queryFn: () => filterTemplates(templateFilters),
    staleTime: 5 * 60 * 1000,
  })
}
