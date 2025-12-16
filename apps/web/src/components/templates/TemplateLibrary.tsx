'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  type AgeGroup,
  type TemplateConcern,
  type AgreementTemplate,
  getAllTemplates,
  getTemplatesByAgeGroup,
  findTemplates,
  getTemplateCountsByAgeGroup,
} from '@fledgely/contracts'
import { AgeGroupTabs } from './AgeGroupTabs'
import { TemplateCard } from './TemplateCard'
import { TemplatePreviewDialog } from './TemplatePreviewDialog'
import { TemplateSearchInput } from './TemplateSearchInput'
import { ConcernFilterChips } from './ConcernFilterChips'

interface TemplateLibraryProps {
  onTemplateSelect?: (template: AgreementTemplate) => void
  selectedTemplateId?: string
  defaultAgeGroup?: AgeGroup
}

/**
 * Template Library Component
 *
 * Story 4.1: Template Library Structure - Task 4.1
 *
 * Main component for browsing and selecting agreement templates.
 * Provides age group tabs, search, concern filtering, and template preview.
 *
 * Features:
 * - Age group tab navigation (AC #1)
 * - Template variation display (AC #2)
 * - Preview summaries (AC #3)
 * - Search and filter by concerns (AC #4)
 * - Keyboard navigation (AC #5, NFR43)
 * - Fast loading (AC #6, NFR29)
 *
 * Accessibility features:
 * - Keyboard navigable (Tab, Enter, Arrow keys) per NFR43
 * - ARIA labels and roles for screen readers
 * - Focus indicators (NFR46)
 * - 44x44px touch targets (NFR49)
 * - 4.5:1 color contrast (NFR45)
 *
 * @example
 * ```tsx
 * <TemplateLibrary
 *   onTemplateSelect={(t) => handleSelect(t)}
 *   selectedTemplateId={currentTemplateId}
 *   defaultAgeGroup="8-10"
 * />
 * ```
 */
export function TemplateLibrary({
  onTemplateSelect,
  selectedTemplateId,
  defaultAgeGroup,
}: TemplateLibraryProps) {
  // State
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(defaultAgeGroup ?? null)
  const [selectedConcerns, setSelectedConcerns] = useState<TemplateConcern[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<AgreementTemplate | null>(null)

  // Get template counts for tabs
  const templateCounts = useMemo(() => getTemplateCountsByAgeGroup(), [])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return findTemplates({
      ageGroup: selectedAgeGroup ?? undefined,
      concerns: selectedConcerns.length > 0 ? selectedConcerns : undefined,
      query: searchQuery.trim() || undefined,
    })
  }, [selectedAgeGroup, selectedConcerns, searchQuery])

  // Handlers
  const handleAgeGroupChange = useCallback((ageGroup: AgeGroup | null) => {
    setSelectedAgeGroup(ageGroup)
  }, [])

  const handleConcernsChange = useCallback((concerns: TemplateConcern[]) => {
    setSelectedConcerns(concerns)
  }, [])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleTemplateClick = useCallback((template: AgreementTemplate) => {
    setPreviewTemplate(template)
  }, [])

  const handleTemplateSelect = useCallback((template: AgreementTemplate) => {
    onTemplateSelect?.(template)
  }, [onTemplateSelect])

  const handleClosePreview = useCallback(() => {
    setPreviewTemplate(null)
  }, [])

  // Check if any filters are active
  const hasActiveFilters = selectedAgeGroup !== null || selectedConcerns.length > 0 || searchQuery.trim() !== ''

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Template Library
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose a starting point for your family agreement
        </p>
      </div>

      {/* Age group tabs */}
      <AgeGroupTabs
        selectedAgeGroup={selectedAgeGroup}
        onAgeGroupChange={handleAgeGroupChange}
        templateCounts={templateCounts}
      />

      {/* Search and filter */}
      <div className="px-4 py-3 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <TemplateSearchInput
          value={searchQuery}
          onChange={handleSearchChange}
        />
        <ConcernFilterChips
          selectedConcerns={selectedConcerns}
          onConcernsChange={handleConcernsChange}
        />
      </div>

      {/* Results summary */}
      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
        {filteredTemplates.length === 0 ? (
          <span>No templates match your filters</span>
        ) : (
          <span>
            Showing {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            {hasActiveFilters && ' (filtered)'}
          </span>
        )}
      </div>

      {/* Template grid */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="region"
        aria-label="Template list"
      >
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No templates found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters or search terms.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAgeGroup(null)
                  setSelectedConcerns([])
                  setSearchQuery('')
                }}
                className="mt-4 inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleTemplateClick}
                isSelected={selectedTemplateId === template.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <TemplatePreviewDialog
        template={previewTemplate}
        isOpen={previewTemplate !== null}
        onClose={handleClosePreview}
        onSelect={handleTemplateSelect}
      />
    </div>
  )
}
