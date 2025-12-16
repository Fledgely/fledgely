'use client'

import { useCallback } from 'react'
import {
  type TemplateConcern,
  TEMPLATE_CONCERNS,
  TEMPLATE_CONCERN_LABELS,
} from '@fledgely/contracts'

interface ConcernFilterChipsProps {
  selectedConcerns: TemplateConcern[]
  onConcernsChange: (concerns: TemplateConcern[]) => void
}

/**
 * Concern Filter Chips Component
 *
 * Story 4.1: Template Library Structure - Task 5.2
 *
 * Provides chip-based filtering for templates by concern/topic.
 * Supports multi-select with toggle behavior.
 *
 * Accessibility features:
 * - ARIA checkbox pattern for multi-select
 * - Keyboard navigable (Tab, Space/Enter) per NFR43
 * - Focus indicators (NFR46)
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 color contrast (NFR45)
 *
 * @example
 * ```tsx
 * <ConcernFilterChips
 *   selectedConcerns={['gaming', 'social_media']}
 *   onConcernsChange={setSelectedConcerns}
 * />
 * ```
 */
export function ConcernFilterChips({
  selectedConcerns,
  onConcernsChange,
}: ConcernFilterChipsProps) {
  // Toggle concern selection
  const handleToggle = useCallback(
    (concern: TemplateConcern) => {
      const isSelected = selectedConcerns.includes(concern)
      if (isSelected) {
        onConcernsChange(selectedConcerns.filter((c) => c !== concern))
      } else {
        onConcernsChange([...selectedConcerns, concern])
      }
    },
    [selectedConcerns, onConcernsChange]
  )

  // Handle keyboard interaction
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, concern: TemplateConcern) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleToggle(concern)
      }
    },
    [handleToggle]
  )

  // Clear all selections
  const handleClearAll = useCallback(() => {
    onConcernsChange([])
  }, [onConcernsChange])

  const isSelected = (concern: TemplateConcern): boolean => {
    return selectedConcerns.includes(concern)
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
          id="concern-filter-label"
        >
          Filter by topic
        </span>
        {selectedConcerns.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none focus:underline"
            aria-label="Clear all topic filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Chip container */}
      <div
        role="group"
        aria-labelledby="concern-filter-label"
        className="flex flex-wrap gap-2"
      >
        {TEMPLATE_CONCERNS.map((concern) => {
          const selected = isSelected(concern)
          return (
            <button
              key={concern}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => handleToggle(concern)}
              onKeyDown={(e) => handleKeyDown(e, concern)}
              className={`
                inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
                min-h-[44px] transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${
                  selected
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-2 border-blue-500'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {/* Check icon for selected state */}
              {selected && (
                <svg
                  className="w-4 h-4 mr-1.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {TEMPLATE_CONCERN_LABELS[concern]}
            </button>
          )
        })}
      </div>

      {/* Selection summary for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectedConcerns.length === 0
          ? 'No topics selected'
          : `${selectedConcerns.length} topic${selectedConcerns.length !== 1 ? 's' : ''} selected: ${selectedConcerns.map((c) => TEMPLATE_CONCERN_LABELS[c]).join(', ')}`}
      </div>
    </div>
  )
}
