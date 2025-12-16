'use client'

import type { ReactNode } from 'react'

/**
 * Props for the ChildModeWrapper component
 */
export interface ChildModeWrapperProps {
  /** Child content to wrap */
  children: ReactNode
  /** Whether child mode is currently active */
  isActive?: boolean
  /** Name of the child for personalization */
  childName?: string
  /** Callback when close button is clicked */
  onClose?: () => void
  /** Whether to show help hints */
  showHints?: boolean
  /** Number of contributions made */
  contributionCount?: number
  /** Whether to show celebration for contributions */
  showCelebration?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * ChildModeWrapper Component
 *
 * Story 5.3: Child Contribution Capture - Task 8
 *
 * Integration component that wraps child mode UI with:
 * - Child-friendly styling (pink/purple gradient)
 * - Welcome header with personalization
 * - Help hints for guidance
 * - Contribution progress indicator
 * - Celebration messages
 * - Accessible region labeling
 *
 * @example
 * ```tsx
 * <ChildModeWrapper
 *   isActive={isChildMode}
 *   childName="Alex"
 *   onClose={handleSwitchToParent}
 *   showHints={showHelp}
 *   contributionCount={2}
 * >
 *   <ChildAddTermForm ... />
 * </ChildModeWrapper>
 * ```
 */
export function ChildModeWrapper({
  children,
  isActive = false,
  childName,
  onClose,
  showHints = false,
  contributionCount,
  showCelebration = false,
  className = '',
  'data-testid': dataTestId,
}: ChildModeWrapperProps) {
  const displayName = childName || 'kiddo'

  return (
    <div
      role={isActive ? 'region' : undefined}
      aria-label={isActive ? "Child's turn to add ideas" : undefined}
      aria-live="polite"
      className={`
        relative rounded-2xl transition-all duration-300
        ${
          isActive
            ? 'bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 border-2 border-pink-200 dark:border-pink-800 child-mode-active p-4'
            : 'bg-transparent'
        }
        ${className}
      `}
      data-testid={dataTestId ?? 'child-mode-wrapper'}
    >
      {/* Header - only shown when active */}
      {isActive && (
        <div
          className="flex items-center justify-between mb-4"
          data-testid="child-mode-header"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              🎨
            </span>
            <div>
              <h3 className="font-bold text-lg text-pink-800 dark:text-pink-200">
                It's your turn, {displayName}!
              </h3>
              <p className="text-sm text-pink-600 dark:text-pink-300">
                Share your ideas!
              </p>
            </div>
          </div>

          {/* Close button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Switch back to parent mode"
              className="
                flex items-center gap-2 px-3 py-2 rounded-lg
                bg-white/50 dark:bg-gray-800/50
                text-pink-700 dark:text-pink-300
                hover:bg-white/80 dark:hover:bg-gray-800/80
                focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400
                transition-colors
              "
              data-testid="close-child-mode"
            >
              <span>Done</span>
              <span aria-hidden="true">✓</span>
            </button>
          )}
        </div>
      )}

      {/* Help hint */}
      {isActive && showHints && (
        <div
          className="mb-4 p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg text-sm text-pink-700 dark:text-pink-300"
          data-testid="child-mode-hint"
        >
          <span className="mr-2" aria-hidden="true">
            💡
          </span>
          Tap a button or tell us what you want to add!
        </div>
      )}

      {/* Contribution progress */}
      {isActive && contributionCount !== undefined && contributionCount > 0 && (
        <div className="mb-4 flex items-center gap-2" data-testid="contribution-count">
          <span className="text-lg" aria-hidden="true">
            ⭐
          </span>
          <span className="text-pink-700 dark:text-pink-300 font-medium">
            {contributionCount} idea{contributionCount !== 1 ? 's' : ''} added!
          </span>
        </div>
      )}

      {/* Celebration message */}
      {isActive && showCelebration && contributionCount === 1 && (
        <div
          className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg text-center animate-bounce"
          data-testid="celebration-message"
        >
          <span className="text-2xl mr-2" aria-hidden="true">
            🎉
          </span>
          <span className="font-bold text-yellow-800 dark:text-yellow-200">
            Great job! Your first idea!
          </span>
        </div>
      )}

      {/* Main content */}
      <div className={isActive ? 'pt-2' : ''}>{children}</div>
    </div>
  )
}

export default ChildModeWrapper
