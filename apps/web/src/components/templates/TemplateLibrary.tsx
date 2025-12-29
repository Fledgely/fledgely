/**
 * Template Library Component.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC4, AC5
 * Story 4.3: Template Preview & Selection - AC1, AC3, AC4
 * Story 4.6: Template Accessibility - AC2, AC4
 *
 * Displays browsable template collection organized by age group.
 * Includes filtering by categories and search functionality.
 * Supports preview modal and comparison mode.
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import type { AgreementTemplate, AgeGroup, TemplateCategory } from '@fledgely/shared/contracts'
import { useTemplateLibrary, type TemplateLibraryFilters } from '../../hooks/useTemplates'
import { useTemplateComparison } from '../../hooks/useTemplateSelection'
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  TEMPLATE_CATEGORIES,
  CATEGORY_LABELS,
} from '../../data/templates'
import { TemplateCard } from './TemplateCard'
import { TemplatePreviewModal } from './TemplatePreviewModal'
import { TemplateComparison } from './TemplateComparison'

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

  // Story 4.3: Preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<AgreementTemplate | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Story 4.3: Comparison mode state
  const [showCompareMode, setShowCompareMode] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const {
    comparisonTemplates,
    toggleComparison,
    clearComparison,
    isInComparison,
    canAddMore,
    canCompare,
  } = useTemplateComparison()

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

  // Story 4.3: Handle opening preview modal
  const handleOpenPreview = useCallback((template: AgreementTemplate) => {
    setPreviewTemplate(template)
    setIsPreviewOpen(true)
  }, [])

  // Story 4.3: Handle closing preview modal
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false)
    setPreviewTemplate(null)
  }, [])

  // Story 4.3: Handle template selection from preview
  const handleSelectFromPreview = useCallback(
    (template: AgreementTemplate) => {
      onSelectTemplate?.(template)
    },
    [onSelectTemplate]
  )

  // Story 4.3: Toggle compare mode
  const handleToggleCompareMode = useCallback(() => {
    setShowCompareMode((prev) => {
      if (prev) {
        clearComparison()
      }
      return !prev
    })
  }, [clearComparison])

  // Story 4.3: Open comparison view
  const handleOpenComparison = useCallback(() => {
    if (canCompare) {
      setShowComparison(true)
    }
  }, [canCompare])

  // Story 4.3: Close comparison view
  const handleCloseComparison = useCallback(() => {
    setShowComparison(false)
  }, [])

  return (
    <main aria-label="Template Library" className="space-y-6">
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

      {/* Story 4.6: Navigation landmark for filters (AC2) */}
      <nav aria-label="Template filters">
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

        {/* Category filters and compare mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                min-h-[44px] min-w-[60px]
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

          {/* Story 4.3: Compare mode toggle */}
          <button
            type="button"
            onClick={handleToggleCompareMode}
            aria-pressed={showCompareMode}
            className={`
            px-4 py-2 text-sm font-medium rounded-lg border transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            min-h-[44px]
            ${
              showCompareMode
                ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }
          `}
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              {showCompareMode ? 'Exit Compare' : 'Compare Templates'}
            </span>
          </button>
        </div>
      </nav>

      {/* Story 4.3: Compare selected button */}
      {showCompareMode && comparisonTemplates.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <span className="text-sm text-indigo-700">
            {comparisonTemplates.length} template{comparisonTemplates.length === 1 ? '' : 's'}{' '}
            selected
            {!canAddMore && ' (maximum 3)'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearComparison}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 min-h-[44px]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleOpenComparison}
              disabled={!canCompare}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px]
                ${
                  canCompare
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Compare Selected
            </button>
          </div>
        </div>
      )}

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

      {/* Story 4.6: Template grid section landmark (AC2) */}
      {!isLoading && !error && templates && templates.length > 0 && (
        <section aria-label="Template results">
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
                  onSelect={handleOpenPreview}
                  isSelected={selectedTemplateId === template.id}
                  showCompare={showCompareMode}
                  isInComparison={isInComparison(template.id)}
                  onCompareToggle={toggleComparison}
                  canAddToComparison={canAddMore}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Story 4.3: Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        onSelect={handleSelectFromPreview}
      />

      {/* Story 4.3: Comparison View */}
      {showComparison && (
        <TemplateComparison
          templates={comparisonTemplates}
          onClose={handleCloseComparison}
          onSelect={handleSelectFromPreview}
        />
      )}
    </main>
  )
}

export default TemplateLibrary
