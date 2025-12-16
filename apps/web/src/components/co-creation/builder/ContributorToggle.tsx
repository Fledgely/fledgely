'use client'

import { useCallback } from 'react'
import type { SessionContributor } from '@fledgely/contracts'

/**
 * Props for the ContributorToggle component
 */
export interface ContributorToggleProps {
  /** Currently selected contributor */
  currentContributor: SessionContributor
  /** Callback when contributor changes */
  onContributorChange: (contributor: SessionContributor) => void
  /** Whether the toggle is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * ContributorToggle Component
 *
 * Story 5.3: Child Contribution Capture - Task 1
 *
 * Visual toggle to switch between parent and child contributor modes.
 * Features:
 * - Clear visual indication of current contributor
 * - Child-friendly label "Who's adding this?"
 * - 48x48px touch targets for child mode (NFR49)
 * - Full keyboard accessibility (NFR43)
 * - ARIA labels for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <ContributorToggle
 *   currentContributor={contributor}
 *   onContributorChange={setContributor}
 * />
 * ```
 */
export function ContributorToggle({
  currentContributor,
  onContributorChange,
  disabled = false,
  className = '',
  'data-testid': dataTestId,
}: ContributorToggleProps) {
  /**
   * Handle contributor selection
   */
  const handleSelect = useCallback(
    (contributor: SessionContributor) => {
      if (contributor !== currentContributor && !disabled) {
        onContributorChange(contributor)
      }
    },
    [currentContributor, disabled, onContributorChange]
  )

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback(
    (contributor: SessionContributor) => (event: React.KeyboardEvent) => {
      if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
        event.preventDefault()
        if (contributor !== currentContributor) {
          onContributorChange(contributor)
        }
      }
    },
    [currentContributor, disabled, onContributorChange]
  )

  const isParentSelected = currentContributor === 'parent'
  const isChildSelected = currentContributor === 'child'

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid={dataTestId ?? 'contributor-toggle'}
    >
      {/* Child-friendly label */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Who's adding this?
      </span>

      {/* Toggle group */}
      <div
        role="group"
        aria-label="Select who is adding this term"
        className="flex gap-2"
      >
        {/* Parent button */}
        <button
          type="button"
          onClick={() => handleSelect('parent')}
          onKeyDown={handleKeyDown('parent')}
          disabled={disabled}
          aria-pressed={isParentSelected}
          aria-label="Parent is adding this term"
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            min-h-[48px] min-w-[48px]
            font-medium transition-all
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            ${
              isParentSelected
                ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border-2 border-indigo-400 dark:border-indigo-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          data-testid="contributor-parent"
        >
          {/* Parent icon */}
          <span
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${
                isParentSelected
                  ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
            data-testid="parent-icon"
            aria-hidden="true"
          >
            P
          </span>
          <span>Parent</span>
        </button>

        {/* Child button */}
        <button
          type="button"
          onClick={() => handleSelect('child')}
          onKeyDown={handleKeyDown('child')}
          disabled={disabled}
          aria-pressed={isChildSelected}
          aria-label="Child is adding this term"
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            min-h-[48px] min-w-[48px]
            font-medium transition-all
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            ${
              isChildSelected
                ? 'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 border-2 border-pink-400 dark:border-pink-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          data-testid="contributor-child"
        >
          {/* Child icon */}
          <span
            className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${
                isChildSelected
                  ? 'bg-pink-200 dark:bg-pink-800 text-pink-700 dark:text-pink-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }
            `}
            data-testid="child-icon"
            aria-hidden="true"
          >
            C
          </span>
          <span>Child</span>
        </button>
      </div>
    </div>
  )
}

export default ContributorToggle
