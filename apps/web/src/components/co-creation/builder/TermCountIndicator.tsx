'use client'

import { useMemo } from 'react'

/**
 * Maximum number of terms allowed (NFR60)
 */
export const MAX_TERMS = 100

/**
 * Warning threshold (show warning when at or above this number)
 */
export const WARNING_THRESHOLD = 90

/**
 * Props for the TermCountIndicator component
 */
export interface TermCountIndicatorProps {
  /** Current number of terms */
  count: number
  /** Maximum allowed terms (defaults to 100 per NFR60) */
  maxTerms?: number
  /** Warning threshold (defaults to 90) */
  warningThreshold?: number
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Status level for the term count
 */
export type CountStatus = 'normal' | 'warning' | 'limit'

/**
 * Get the status level based on count
 */
export function getCountStatus(count: number, max: number, warningAt: number): CountStatus {
  if (count >= max) return 'limit'
  if (count >= warningAt) return 'warning'
  return 'normal'
}

/**
 * TermCountIndicator Component
 *
 * Story 5.2: Visual Agreement Builder - Task 5
 *
 * Displays the current term count and maximum allowed terms.
 * Provides visual feedback and accessibility announcements when
 * approaching or reaching the limit.
 *
 * Features:
 * - Shows X/100 count (NFR60)
 * - Warning state at 90+ terms
 * - Limit reached state at 100 terms
 * - aria-live announcements for state changes (NFR42)
 * - Child-friendly messaging (NFR65)
 *
 * @example
 * ```tsx
 * <TermCountIndicator count={terms.length} />
 * ```
 */
export function TermCountIndicator({
  count,
  maxTerms = MAX_TERMS,
  warningThreshold = WARNING_THRESHOLD,
  className = '',
  'data-testid': dataTestId,
}: TermCountIndicatorProps) {
  // Calculate status and styles
  const status = useMemo(
    () => getCountStatus(count, maxTerms, warningThreshold),
    [count, maxTerms, warningThreshold]
  )

  // Status-based styling
  const statusStyles: Record<CountStatus, { bg: string; text: string; border: string }> = {
    normal: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-200',
      border: 'border-yellow-400 dark:border-yellow-600',
    },
    limit: {
      bg: 'bg-red-100 dark:bg-red-900',
      text: 'text-red-800 dark:text-red-200',
      border: 'border-red-400 dark:border-red-600',
    },
  }

  const styles = statusStyles[status]

  // Progress percentage
  const percentage = Math.min((count / maxTerms) * 100, 100)

  // Status messages (child-friendly per NFR65)
  const statusMessages: Record<CountStatus, string> = {
    normal: '',
    warning: 'Getting close to the limit! You can add a few more.',
    limit: 'You have reached the maximum number of items. Remove some to add more.',
  }

  const message = statusMessages[status]

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid={dataTestId ?? 'term-count-indicator'}
      data-status={status}
    >
      {/* Count Badge */}
      <div className="flex items-center gap-3">
        <div
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${styles.bg} ${styles.text} ${styles.border}`}
        >
          <span className="tabular-nums">{count}</span>
          <span className="mx-1">/</span>
          <span className="tabular-nums">{maxTerms}</span>
        </div>

        {/* Icon indicator */}
        {status === 'warning' && (
          <svg
            className="w-5 h-5 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {status === 'limit' && (
          <svg
            className="w-5 h-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>

      {/* Progress Bar */}
      <div
        className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={maxTerms}
        aria-label={`${count} of ${maxTerms} terms used`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            status === 'limit'
              ? 'bg-red-500'
              : status === 'warning'
              ? 'bg-yellow-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status Message (announced by screen readers) */}
      {message && (
        <p
          className={`text-sm ${styles.text}`}
          aria-live="polite"
          data-testid="term-count-message"
        >
          {message}
        </p>
      )}
    </div>
  )
}

/**
 * Compact version for inline display
 */
export function TermCountBadge({
  count,
  maxTerms = MAX_TERMS,
  className = '',
  'data-testid': dataTestId,
}: Pick<TermCountIndicatorProps, 'count' | 'maxTerms' | 'className' | 'data-testid'>) {
  const status = getCountStatus(count, maxTerms, WARNING_THRESHOLD)

  const styles: Record<CountStatus, string> = {
    normal: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    limit: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]} ${className}`}
      data-testid={dataTestId ?? 'term-count-badge'}
      data-status={status}
    >
      {count}/{maxTerms}
    </span>
  )
}

/**
 * Hook to check if more terms can be added
 */
export function useCanAddTerm(count: number, maxTerms: number = MAX_TERMS): boolean {
  return count < maxTerms
}

/**
 * Get remaining term capacity
 */
export function getRemainingCapacity(count: number, maxTerms: number = MAX_TERMS): number {
  return Math.max(0, maxTerms - count)
}

export default TermCountIndicator
