/**
 * Template Library Component.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC4, AC5
 *
 * Displays browsable template collection organized by age group.
 * Includes filtering by categories and search functionality.
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { AgreementTemplate, AgeGroup, TemplateCategory } from '@fledgely/shared/contracts'
import { useTemplateLibrary, type TemplateLibraryFilters } from '../../hooks/useTemplates'
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
} from '../../data/templates'
import { TemplateCard } from './TemplateCard'

interface TemplateLibraryProps {
  onSelectTemplate?: (template: AgreementTemplate) => void
  selectedTemplateId?: string
  initialAgeGroup?: AgeGroup
}

/**
 * Debounce hook for search input.
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function TemplateLibrary({
  onSelectTemplate,
  selectedTemplateId,
  initialAgeGroup,
}: TemplateLibraryProps) {
  // Filter state
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(initialAgeGroup ?? null)
  const [selectedCategories, setSelectedCategories] = useState<TemplateCategory[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Debounce search to avoid excessive queries
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Build filters object
  const filters: TemplateLibraryFilters = useMemo(
    () => ({
      ageGroup: selectedAgeGroup,
      categories: selectedCategories,
      searchQuery: debouncedSearch,
    }),
    [selectedAgeGroup, selectedCategories, debouncedSearch]
  )

  // Fetch templates with filters
  const { data: templates, isLoading, error } = useTemplateLibrary(filters)

  // Handle age group tab selection
  const handleAgeGroupChange = useCallback((ageGroup: AgeGroup | null) => {
    setSelectedAgeGroup(ageGroup)
  }, [])

  // Handle category toggle
  const handleCategoryToggle = useCallback((category: TemplateCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }, [])

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedAgeGroup(null)
    setSelectedCategories([])
    setSearchQuery('')
  }, [])

  // Check if any filters are active
  const hasActiveFilters = selectedAgeGroup || selectedCategories.length > 0 || searchQuery

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <label htmlFor="template-search" className="sr-only">
          Search templates
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            id="template-search"
            type="text"
            placeholder="Search templates by name, description, or rules..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Clear search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Age group tabs */}
      <div
        role="tablist"
        aria-label="Filter templates by age group"
        className="border-b border-gray-200"
      >
        <div className="flex flex-wrap gap-1">
          <button
            role="tab"
            type="button"
            aria-selected={selectedAgeGroup === null}
            onClick={() => handleAgeGroupChange(null)}
            className={`
              px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              min-h-[44px]
              ${
                selectedAgeGroup === null
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            All Ages
          </button>
          {AGE_GROUPS.map((ageGroup) => (
            <button
              key={ageGroup}
              role="tab"
              type="button"
              aria-selected={selectedAgeGroup === ageGroup}
              onClick={() => handleAgeGroupChange(ageGroup)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                min-h-[44px]
                ${
                  selectedAgeGroup === ageGroup
                    ? 'bg-primary text-white border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {AGE_GROUP_LABELS[ageGroup]}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {TEMPLATE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => handleCategoryToggle(category)}
            aria-pressed={selectedCategories.includes(category)}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-full border transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              min-h-[44px]
              ${
                selectedCategories.includes(category)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }
            `}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 underline min-h-[44px]"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-3 text-gray-500">
            <svg
              className="w-6 h-6 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading templates...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700" role="alert">
          <p className="font-medium">Error loading templates</p>
          <p className="text-sm mt-1">{error.message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && templates?.length === 0 && (
        <div className="text-center py-12" aria-live="polite">
          <svg
            className="mx-auto w-12 h-12 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No templates found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters or search query.'
              : 'No templates are available at this time.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 text-primary hover:text-primary/80 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Template grid */}
      {!isLoading && !error && templates && templates.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-4" aria-live="polite">
            {templates.length} template{templates.length === 1 ? '' : 's'} found
          </p>
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            role="list"
            aria-label="Available templates"
          >
            {templates.map((template) => (
              <div key={template.id} role="listitem">
                <TemplateCard
                  template={template}
                  onSelect={onSelectTemplate}
                  isSelected={selectedTemplateId === template.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplateLibrary
