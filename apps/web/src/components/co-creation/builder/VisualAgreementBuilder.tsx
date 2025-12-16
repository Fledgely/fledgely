'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SessionTerm, SessionTermType, SessionTermStatus, SessionContributor, AgreementMode } from '@fledgely/contracts'
import { AGREEMENT_MODE_LABELS } from '@fledgely/contracts'
import { TermDropZone } from './TermDropZone'
import { TermCountIndicator, MAX_TERMS, useCanAddTerm } from './TermCountIndicator'
import { getTermTypeLabel, getTermCategoryColors } from './termUtils'
import { useAgreementModeTerms } from '../../../hooks/useAgreementModeTerms'

/**
 * Category section for grouping terms
 */
interface TermCategory {
  type: SessionTermType
  label: string
  terms: SessionTerm[]
}

/**
 * Props for the VisualAgreementBuilder component
 */
export interface VisualAgreementBuilderProps {
  /** Array of terms in the agreement */
  terms: SessionTerm[]
  /** Current contributor (parent or child) */
  currentContributor: SessionContributor
  /** Agreement mode - determines which term types are available */
  agreementMode?: AgreementMode
  /** Callback when terms are reordered */
  onTermsReorder?: (terms: SessionTerm[]) => void
  /** Callback when a term reorder happens (for recording contribution) */
  onTermReorder?: (termId: string, oldIndex: number, newIndex: number) => void
  /** Callback when a term is selected */
  onTermSelect?: (term: SessionTerm | null) => void
  /** Callback when edit is requested for a term */
  onTermEdit?: (term: SessionTerm) => void
  /** Callback when status change is requested */
  onTermStatusChange?: (term: SessionTerm, status: SessionTermStatus) => void
  /** Callback when add term is requested */
  onAddTerm?: (type?: SessionTermType) => void
  /** Currently selected term ID */
  selectedTermId?: string
  /** Whether editing is disabled */
  isReadOnly?: boolean
  /** Whether to group terms by category */
  groupByCategory?: boolean
  /** Layout mode */
  layout?: 'list' | 'grid'
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Group terms by category type
 */
function groupTermsByCategory(terms: SessionTerm[]): TermCategory[] {
  const categoryOrder: SessionTermType[] = [
    'screen_time',
    'bedtime',
    'monitoring',
    'rule',
    'consequence',
    'reward',
  ]

  const groups = new Map<SessionTermType, SessionTerm[]>()

  // Initialize groups in order
  categoryOrder.forEach((type) => {
    groups.set(type, [])
  })

  // Group terms
  terms.forEach((term) => {
    const group = groups.get(term.type) ?? []
    group.push(term)
    groups.set(term.type, group)
  })

  // Convert to array, only include non-empty categories
  return categoryOrder
    .filter((type) => (groups.get(type)?.length ?? 0) > 0)
    .map((type) => ({
      type,
      label: getTermTypeLabel(type),
      terms: groups.get(type) ?? [],
    }))
}

/**
 * VisualAgreementBuilder Component
 *
 * Story 5.2: Visual Agreement Builder - Task 6
 *
 * Main component for building agreements visually using drag-and-drop
 * term cards. Supports grouping by category, term count limits, and
 * provides an accessible interface for parent-child collaboration.
 *
 * Features:
 * - Visual card interface (AC #1)
 * - Drag-and-drop reordering (AC #2)
 * - Category grouping with section headers (AC #5)
 * - Term count indicator (NFR60)
 * - Empty state with helpful prompt
 * - Screen-sharing-friendly layout
 * - Keyboard accessible (NFR43)
 *
 * @example
 * ```tsx
 * <VisualAgreementBuilder
 *   terms={sessionTerms}
 *   currentContributor="parent"
 *   onTermsReorder={handleReorder}
 *   onAddTerm={handleAddTerm}
 * />
 * ```
 */
export function VisualAgreementBuilder({
  terms,
  currentContributor,
  agreementMode = 'full',
  onTermsReorder,
  onTermReorder,
  onTermSelect,
  onTermEdit,
  onTermStatusChange,
  onAddTerm,
  selectedTermId,
  isReadOnly = false,
  groupByCategory = true,
  layout = 'list',
  className = '',
  'data-testid': dataTestId,
}: VisualAgreementBuilderProps) {
  // Use agreement mode hook for term filtering
  const {
    visibleTerms,
    canAddMonitoringTerm,
    modeLabel,
    isAgreementOnlyMode,
    isTermTypeAllowed,
  } = useAgreementModeTerms(terms, agreementMode)

  // Check if we can add more terms
  const canAddTerm = useCanAddTerm(visibleTerms.length)

  // Group terms by category if enabled (using filtered terms)
  const categories = useMemo(() => {
    if (groupByCategory) {
      return groupTermsByCategory(visibleTerms)
    }
    return null
  }, [visibleTerms, groupByCategory])

  // Handle term click
  const handleTermClick = useCallback(
    (term: SessionTerm) => {
      onTermSelect?.(term)
    },
    [onTermSelect]
  )

  // Handle add term button click
  const handleAddTermClick = useCallback(
    (type?: SessionTermType) => {
      // Don't allow adding if term limit reached
      if (!canAddTerm) return

      // If a specific type is requested, check if it's allowed in current mode
      if (type && !isTermTypeAllowed(type)) return

      onAddTerm?.(type)
    },
    [canAddTerm, onAddTerm, isTermTypeAllowed]
  )

  // Handle keyboard shortcut for deselect
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && selectedTermId) {
        onTermSelect?.(null)
      }
    },
    [selectedTermId, onTermSelect]
  )

  // Empty state
  if (terms.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[300px] p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg ${className}`}
        data-testid={dataTestId ?? 'visual-agreement-builder'}
        data-empty="true"
        onKeyDown={handleKeyDown}
      >
        <div className="text-center max-w-md">
          {/* Empty state icon */}
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
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

          {/* Empty state message (child-friendly per NFR65) */}
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Let's build your agreement together!
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Start by adding rules about using technology. Both parents and kids can suggest ideas.
          </p>

          {/* Add term button */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => handleAddTermClick()}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] min-w-[44px]"
              aria-label="Add first term to agreement"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Your First Term
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-6 ${className}`}
      data-testid={dataTestId ?? 'visual-agreement-builder'}
      data-term-count={terms.length}
      onKeyDown={handleKeyDown}
    >
      {/* Header with mode badge, count and add button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Mode badge */}
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isAgreementOnlyMode
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
            }`}
            data-testid="agreement-mode-badge"
          >
            {isAgreementOnlyMode ? (
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
            {modeLabel}
          </span>

          <TermCountIndicator count={visibleTerms.length} />
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => handleAddTermClick()}
            disabled={!canAddTerm}
            className={`inline-flex items-center px-4 py-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] min-w-[44px] transition-colors ${
              canAddTerm
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
            }`}
            aria-label={canAddTerm ? 'Add new term' : 'Maximum terms reached'}
            aria-disabled={!canAddTerm}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Term
          </button>
        )}
      </div>

      {/* Terms display */}
      {groupByCategory && categories ? (
        // Grouped by category
        <div className="space-y-8">
          {categories.map((category) => (
            <CategorySection
              key={category.type}
              category={category}
              selectedTermId={selectedTermId}
              isReadOnly={isReadOnly}
              onTermClick={handleTermClick}
              onTermEdit={onTermEdit}
              onTermStatusChange={onTermStatusChange}
              onReorder={onTermsReorder}
              onTermReorder={onTermReorder}
              // Only show Add button if term limit not reached AND term type is allowed in current mode
              onAddTerm={
                canAddTerm && isTermTypeAllowed(category.type)
                  ? () => handleAddTermClick(category.type)
                  : undefined
              }
            />
          ))}
        </div>
      ) : (
        // Flat list
        <TermDropZone
          terms={visibleTerms}
          selectedTermId={selectedTermId}
          isDragDisabled={isReadOnly}
          onReorder={onTermsReorder}
          onTermReorder={onTermReorder}
          onTermClick={handleTermClick}
          onTermEdit={isReadOnly ? undefined : onTermEdit}
          onTermStatusChange={isReadOnly ? undefined : onTermStatusChange}
        />
      )}
    </div>
  )
}

/**
 * Category section component for grouped display
 */
interface CategorySectionProps {
  category: TermCategory
  selectedTermId?: string
  isReadOnly?: boolean
  onTermClick?: (term: SessionTerm) => void
  onTermEdit?: (term: SessionTerm) => void
  onTermStatusChange?: (term: SessionTerm, status: SessionTermStatus) => void
  onReorder?: (terms: SessionTerm[]) => void
  onTermReorder?: (termId: string, oldIndex: number, newIndex: number) => void
  onAddTerm?: () => void
}

function CategorySection({
  category,
  selectedTermId,
  isReadOnly = false,
  onTermClick,
  onTermEdit,
  onTermStatusChange,
  onReorder,
  onTermReorder,
  onAddTerm,
}: CategorySectionProps) {
  const colors = getTermCategoryColors(category.type)

  return (
    <section
      aria-labelledby={`category-${category.type}`}
      data-testid={`category-section-${category.type}`}
    >
      {/* Category header */}
      <div className="flex items-center justify-between mb-3">
        <h3
          id={`category-${category.type}`}
          className={`text-sm font-semibold ${colors.text} flex items-center gap-2`}
        >
          <span
            className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}
            aria-hidden="true"
          />
          {category.label}
          <span className="text-gray-400 dark:text-gray-500 font-normal">
            ({category.terms.length})
          </span>
        </h3>

        {onAddTerm && (
          <button
            type="button"
            onClick={onAddTerm}
            className={`text-sm ${colors.text} hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1`}
            aria-label={`Add ${category.label} term`}
          >
            + Add {category.label}
          </button>
        )}
      </div>

      {/* Terms in this category */}
      <TermDropZone
        terms={category.terms}
        selectedTermId={selectedTermId}
        isDragDisabled={isReadOnly}
        onReorder={onReorder}
        onTermReorder={onTermReorder}
        onTermClick={onTermClick}
        onTermEdit={isReadOnly ? undefined : onTermEdit}
        onTermStatusChange={isReadOnly ? undefined : onTermStatusChange}
        data-testid={`term-drop-zone-${category.type}`}
      />
    </section>
  )
}

export default VisualAgreementBuilder
