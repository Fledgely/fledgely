'use client'

import type { SessionContributor } from '@fledgely/contracts'
import { getContributorStyle } from '../builder/termUtils'

/**
 * Props for the ScrollProgress component
 */
export interface ScrollProgressProps {
  /** Parent's scroll completion percentage (0-100) */
  parentProgress: number
  /** Child's scroll completion percentage (0-100) */
  childProgress: number
  /** Whether parent has completed scrolling */
  parentComplete: boolean
  /** Whether child has completed scrolling */
  childComplete: boolean
  /** Current active contributor being tracked */
  activeContributor?: SessionContributor
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * ProgressBar Component
 * Individual progress bar for a contributor
 */
interface ProgressBarProps {
  contributor: SessionContributor
  progress: number
  isComplete: boolean
  isActive: boolean
}

function ProgressBar({ contributor, progress, isComplete, isActive }: ProgressBarProps) {
  const style = getContributorStyle(contributor)
  const label = contributor === 'parent' ? 'Parent' : 'Child'

  // Calculate bar color based on completion
  const barColor = isComplete
    ? 'bg-green-500 dark:bg-green-400'
    : isActive
      ? style.bg.replace('bg-', 'bg-')
      : 'bg-gray-300 dark:bg-gray-600'

  return (
    <div className="flex items-center gap-3" data-testid={`progress-${contributor}`}>
      {/* Contributor badge */}
      <span
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${style.bg} ${style.text} ${style.border} border`}
        aria-label={`${label} progress`}
      >
        {style.icon}
      </span>

      {/* Progress container */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isComplete ? (
              <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                Done
              </span>
            ) : (
              `${progress}%`
            )}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} scroll progress: ${progress}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * ScrollProgress Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 5
 *
 * Displays scroll progress for both parent and child.
 * Implements anti-TLDR tracking per AC #5.
 *
 * Features:
 * - Visual progress indicator (percentage scrolled) (AC #5)
 * - Track progress for both parties
 * - Show completion status
 * - Accessible progress bars
 *
 * @example
 * ```tsx
 * <ScrollProgress
 *   parentProgress={75}
 *   childProgress={100}
 *   parentComplete={false}
 *   childComplete={true}
 *   activeContributor="parent"
 * />
 * ```
 */
export function ScrollProgress({
  parentProgress,
  childProgress,
  parentComplete,
  childComplete,
  activeContributor,
  className = '',
  'data-testid': dataTestId = 'scroll-progress',
}: ScrollProgressProps) {
  const bothComplete = parentComplete && childComplete

  return (
    <div
      className={`p-4 rounded-lg border ${
        bothComplete
          ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
      } ${className}`}
      data-testid={dataTestId}
      role="region"
      aria-label="Scroll progress tracking"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Reading Progress
        </h4>
        {bothComplete ? (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            Ready to Sign
          </span>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Both must read the agreement
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {bothComplete
          ? 'You both read through the agreement. You can now continue to sign.'
          : 'Please scroll through the entire agreement before signing.'}
      </p>

      {/* Progress bars */}
      <div className="space-y-3">
        <ProgressBar
          contributor="parent"
          progress={parentProgress}
          isComplete={parentComplete}
          isActive={activeContributor === 'parent'}
        />
        <ProgressBar
          contributor="child"
          progress={childProgress}
          isComplete={childComplete}
          isActive={activeContributor === 'child'}
        />
      </div>

      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {bothComplete
          ? 'Both parent and child have read the agreement. Ready to continue.'
          : `Parent: ${parentComplete ? 'complete' : `${parentProgress}% read`}. Child: ${childComplete ? 'complete' : `${childProgress}% read`}.`}
      </div>
    </div>
  )
}

export default ScrollProgress
