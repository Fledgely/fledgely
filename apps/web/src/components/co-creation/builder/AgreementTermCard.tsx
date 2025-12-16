'use client'

import { useState, useCallback, forwardRef } from 'react'
import type { SessionTerm, SessionTermType, SessionTermStatus, SessionContributor } from '@fledgely/contracts'
import {
  getTermCategoryColors,
  getTermCardClasses,
  getTermCategoryIcon,
  getTermTypeLabel,
  getTermExplanation,
  getTermStatusStyle,
  getContributorStyle,
  formatTermContentPreview,
} from './termUtils'

/**
 * Props for the AgreementTermCard component
 */
export interface AgreementTermCardProps {
  /** The term to display */
  term: SessionTerm
  /** Whether the card is selected */
  isSelected?: boolean
  /** Whether the card is being dragged */
  isDragging?: boolean
  /** Whether drag is disabled */
  isDragDisabled?: boolean
  /** Callback when the card is clicked */
  onClick?: (term: SessionTerm) => void
  /** Callback when edit is requested */
  onEdit?: (term: SessionTerm) => void
  /** Callback when status change is requested */
  onStatusChange?: (term: SessionTerm, status: SessionTermStatus) => void
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * AgreementTermCard Component
 *
 * Story 5.2: Visual Agreement Builder - Task 1
 *
 * Visual card component for displaying agreement terms in the builder.
 * Features:
 * - Category-specific color coding (AC #5)
 * - Attribution indicator for parent/child suggestions (AC #4)
 * - Status indicator (accepted, discussion, removed)
 * - Child-friendly tooltip with explanation (AC #3)
 * - Accessible hover/focus states (NFR43, NFR46)
 * - 44x44px minimum touch target (NFR49)
 *
 * @example
 * ```tsx
 * <AgreementTermCard
 *   term={term}
 *   onClick={(t) => setSelectedTerm(t)}
 *   onEdit={(t) => openEditModal(t)}
 * />
 * ```
 */
export const AgreementTermCard = forwardRef<HTMLDivElement, AgreementTermCardProps>(
  function AgreementTermCard(
    {
      term,
      isSelected = false,
      isDragging = false,
      isDragDisabled = false,
      onClick,
      onEdit,
      onStatusChange,
      className = '',
      'data-testid': dataTestId,
    },
    ref
  ) {
    const [showTooltip, setShowTooltip] = useState(false)

    // Get styling configurations
    const categoryColors = getTermCategoryColors(term.type)
    const cardClasses = getTermCardClasses(term.type)
    const statusStyle = getTermStatusStyle(term.status)
    const contributorStyle = getContributorStyle(term.addedBy)
    const iconPath = getTermCategoryIcon(term.type)
    const typeLabel = getTermTypeLabel(term.type)
    const explanation = getTermExplanation(term.type)
    const contentPreview = formatTermContentPreview(term.type, term.content)

    // Handle click
    const handleClick = useCallback(() => {
      if (onClick) {
        onClick(term)
      }
    }, [onClick, term])

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (onClick) {
            onClick(term)
          }
        }
        if (event.key === 'e' && onEdit) {
          event.preventDefault()
          onEdit(term)
        }
      },
      [onClick, onEdit, term]
    )

    // Handle tooltip show
    const handleTooltipShow = useCallback(() => {
      setShowTooltip(true)
    }, [])

    // Handle tooltip hide
    const handleTooltipHide = useCallback(() => {
      setShowTooltip(false)
    }, [])

    // Build class names
    const containerClasses = [
      // Base styles
      'relative rounded-lg p-4 transition-all duration-200',
      // Category colors
      cardClasses,
      // Selection state
      isSelected ? 'ring-2 ring-primary ring-offset-2' : '',
      // Dragging state
      isDragging ? 'opacity-50 scale-105 shadow-lg z-10' : 'shadow-sm',
      // Removed state
      term.status === 'removed' ? 'opacity-60' : '',
      // Focus and hover
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
      // Touch target (NFR49)
      'min-h-[44px]',
      // Cursor
      onClick && !isDragDisabled ? 'cursor-pointer' : '',
      // Custom classes
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={containerClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleTooltipShow}
        onMouseLeave={handleTooltipHide}
        onFocus={handleTooltipShow}
        onBlur={handleTooltipHide}
        aria-selected={isSelected}
        aria-label={`${typeLabel}: ${contentPreview}. ${statusStyle.label}. ${contributorStyle.label}.`}
        aria-describedby={showTooltip ? `tooltip-${term.id}` : undefined}
        data-testid={dataTestId ?? `term-card-${term.id}`}
        data-term-type={term.type}
        data-term-status={term.status}
        data-term-contributor={term.addedBy}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          {/* Term Type Icon and Label */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Category Icon */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${categoryColors.bg} ${categoryColors.border} border`}
              aria-hidden="true"
            >
              <svg
                className={`w-4 h-4 ${categoryColors.icon}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d={iconPath} />
              </svg>
            </div>

            {/* Type Label */}
            <span className={`font-medium ${categoryColors.text} truncate`}>
              {typeLabel}
            </span>
          </div>

          {/* Status and Attribution Badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Attribution Badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contributorStyle.bg} ${contributorStyle.text} ${contributorStyle.border} border`}
              title={contributorStyle.label}
            >
              <span className="sr-only">{contributorStyle.label}</span>
              <span aria-hidden="true">{contributorStyle.icon}</span>
            </span>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border`}
            >
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Content Preview */}
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {contentPreview}
        </p>

        {/* Child-Friendly Tooltip */}
        {showTooltip && (
          <div
            id={`tooltip-${term.id}`}
            role="tooltip"
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-lg shadow-lg z-20 max-w-xs whitespace-normal"
          >
            <div className="text-center">
              <span className="font-medium">{typeLabel}</span>
              <p className="mt-1 text-gray-300 dark:text-gray-600 text-xs">
                {explanation}
              </p>
            </div>
            {/* Tooltip Arrow */}
            <div
              className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"
              aria-hidden="true"
            />
          </div>
        )}

        {/* Action Buttons (visible on hover/focus) */}
        {(onEdit || onStatusChange) && !isDragging && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(term)
                }}
                className="p-1.5 rounded-md bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={`Edit ${typeLabel}`}
              >
                <svg
                  className="w-4 h-4 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Drag Handle Indicator */}
        {!isDragDisabled && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r bg-gray-300 dark:bg-gray-600 opacity-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </div>
    )
  }
)

/**
 * Skeleton loader for AgreementTermCard
 * Used during loading states
 */
export function AgreementTermCardSkeleton() {
  return (
    <div
      className="relative rounded-lg p-4 bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-300 dark:border-gray-600 animate-pulse"
      data-testid="term-card-skeleton"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-6 bg-gray-300 dark:bg-gray-600 rounded-full" />
          <div className="h-5 w-16 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
      </div>
      <div className="h-4 w-3/4 bg-gray-300 dark:bg-gray-600 rounded" />
    </div>
  )
}

export default AgreementTermCard
