/**
 * Agreement Term Card Component.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC3, AC4, AC5
 *
 * Displays a single agreement term as a visual card with:
 * - Category color coding (AC5)
 * - Party attribution badge (AC4)
 * - Child-friendly explanation tooltip (AC3)
 * - 44px touch targets and focus indicators (NFR42)
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import type { AgreementTerm, TermCategory, ContributionParty } from '@fledgely/shared/contracts'

/**
 * Category styling configuration.
 * Accessible colors with not-color-alone indicators (AC5).
 */
const CATEGORY_STYLES: Record<
  TermCategory,
  { bg: string; border: string; icon: string; label: string }
> = {
  time: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', // Clock
    label: 'Time',
  },
  apps: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: 'M4 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z', // App grid
    label: 'Apps',
  },
  monitoring: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', // Eye
    label: 'Monitoring',
  },
  rewards: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', // Star
    label: 'Rewards',
  },
  general: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', // Document
    label: 'General',
  },
}

/**
 * Party styling configuration.
 */
const PARTY_STYLES: Record<ContributionParty, { bg: string; text: string; label: string }> = {
  parent: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    label: 'Parent',
  },
  child: {
    bg: 'bg-pink-100',
    text: 'text-pink-700',
    label: 'Child',
  },
}

interface AgreementTermCardProps {
  /** The agreement term to display */
  term: AgreementTerm
  /** Whether the card is selected */
  isSelected?: boolean
  /** Whether to show drag handle */
  showDragHandle?: boolean
  /** Called when the card is clicked */
  onClick?: () => void
  /** Called when edit is requested */
  onEdit?: () => void
  /** Called when delete is requested */
  onDelete?: () => void
  /** Additional class names */
  className?: string
  /** Test ID for testing */
  'data-testid'?: string
}

export function AgreementTermCard({
  term,
  isSelected = false,
  showDragHandle = true,
  onClick,
  onEdit,
  onDelete,
  className = '',
  'data-testid': testId,
}: AgreementTermCardProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const categoryStyle = CATEGORY_STYLES[term.category]
  const partyStyle = PARTY_STYLES[term.party]

  /**
   * Handle mouse enter for tooltip with delay.
   */
  const handleMouseEnter = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, 500)
  }

  /**
   * Handle mouse leave to hide tooltip.
   */
  const handleMouseLeave = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current)
    }
    setShowTooltip(false)
  }

  /**
   * Handle focus for keyboard accessibility.
   */
  const handleFocus = () => {
    setShowTooltip(true)
  }

  /**
   * Handle blur to hide tooltip.
   */
  const handleBlur = () => {
    setShowTooltip(false)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={cardRef}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        ${categoryStyle.bg} ${categoryStyle.border}
        ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${className}
      `}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-selected={isSelected}
      data-testid={testId}
    >
      {/* Card header with category and party */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          {showDragHandle && (
            <div
              className="w-6 h-10 flex items-center justify-center text-gray-400 cursor-grab active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
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
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </div>
          )}

          {/* Category badge */}
          <div
            className={`
              flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
              ${categoryStyle.bg} border ${categoryStyle.border}
            `}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={categoryStyle.icon}
              />
            </svg>
            <span>{categoryStyle.label}</span>
          </div>
        </div>

        {/* Party attribution badge */}
        <div
          className={`
            flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${partyStyle.bg} ${partyStyle.text}
          `}
          data-testid={`party-badge-${term.party}`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
          <span>{partyStyle.label}</span>
        </div>
      </div>

      {/* Term text */}
      <p className="text-gray-900 font-medium mb-2 pr-16" data-testid="term-text">
        {term.text}
      </p>

      {/* Action buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute top-4 right-4 flex gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Edit term"
              data-testid="edit-term"
            >
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-white/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Delete term"
              data-testid="delete-term"
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Child-friendly explanation tooltip (AC3) */}
      {showTooltip && term.explanation && (
        <div
          className="absolute z-10 left-0 right-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200"
          role="tooltip"
          data-testid="term-tooltip"
        >
          <p className="text-sm text-gray-600" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
            <span className="font-medium text-gray-900">What this means: </span>
            {term.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

export default AgreementTermCard
