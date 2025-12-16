'use client'

import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Props for PrivacyGapsToggle component
 */
interface PrivacyGapsToggleProps {
  /**
   * Whether privacy gaps are currently enabled
   */
  enabled: boolean
  /**
   * Callback when toggle state changes
   */
  onToggle: (enabled: boolean) => void
  /**
   * Whether the toggle is disabled
   */
  disabled?: boolean
  /**
   * Whether a save operation is in progress
   */
  loading?: boolean
  /**
   * Optional CSS class name
   */
  className?: string
}

/**
 * Privacy Gaps Toggle Component
 *
 * Story 7.8: Privacy Gaps Injection - Task 6
 *
 * Allows parents to configure privacy gaps for their child's monitoring.
 * Privacy gaps are random monitoring pauses that protect child privacy
 * during sensitive browsing.
 *
 * Key behaviors:
 * - Enabled by default for all children (per DEFAULT_PRIVACY_GAP_CONFIG)
 * - Enabling is immediate (no confirmation needed)
 * - Disabling requires explicit confirmation explaining purpose
 * - Uses 6th-grade reading level (NFR65)
 *
 * Accessibility:
 * - 44x44px minimum touch targets (NFR49)
 * - Full keyboard support (NFR43)
 * - ARIA attributes for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <PrivacyGapsToggle
 *   enabled={privacyGapsEnabled}
 *   onToggle={(enabled) => updatePrivacyGaps(childId, enabled)}
 * />
 * ```
 */
export function PrivacyGapsToggle({
  enabled,
  onToggle,
  disabled = false,
  loading = false,
  className,
}: PrivacyGapsToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const isDisabled = disabled || loading

  /**
   * Handle toggle click
   * - Enabling: call onToggle immediately
   * - Disabling: show confirmation dialog first
   */
  const handleToggle = useCallback(() => {
    if (isDisabled) return

    if (enabled) {
      // Disabling requires confirmation
      setShowConfirmDialog(true)
    } else {
      // Enabling is immediate
      onToggle(true)
    }
  }, [enabled, isDisabled, onToggle])

  /**
   * Handle keyboard events for toggle
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleToggle()
      }
    },
    [handleToggle]
  )

  /**
   * Confirm disabling privacy gaps
   */
  const handleConfirmDisable = useCallback(() => {
    setShowConfirmDialog(false)
    onToggle(false)
  }, [onToggle])

  /**
   * Cancel disabling - keep privacy gaps enabled
   */
  const handleCancelDisable = useCallback(() => {
    setShowConfirmDialog(false)
  }, [])

  return (
    <>
      <div
        data-testid="privacy-gaps-toggle"
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
          className
        )}
      >
        {/* Header with toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            {/* Title */}
            <h3
              id="privacy-gaps-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              Privacy Pauses
            </h3>

            {/* Description - 6th grade reading level */}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Random monitoring pauses protect your child's privacy during sensitive browsing.
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <span
              className={cn(
                'text-sm font-medium',
                enabled
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {loading ? 'Saving...' : enabled ? 'Enabled' : 'Disabled'}
            </span>

            {/* Toggle button */}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Toggle privacy pauses"
              aria-describedby="privacy-gaps-title"
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onClick={handleToggle}
              onKeyDown={handleKeyDown}
              className={cn(
                // Base styles
                'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                // Minimum touch target (NFR49)
                'min-h-[44px] min-w-[44px] h-7 w-14',
                // State styles
                enabled
                  ? 'bg-green-600 dark:bg-green-500'
                  : 'bg-gray-200 dark:bg-gray-600',
                // Disabled styles
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* Toggle knob */}
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none inline-block h-6 w-6 transform rounded-full',
                  'bg-white shadow ring-0 transition duration-200 ease-in-out',
                  enabled ? 'translate-x-7' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>

        {/* Info box when enabled */}
        {enabled && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p className="text-sm text-green-700 dark:text-green-300">
                Privacy pauses happen a few times each day at random times.
                This is normal and helps protect your child's privacy.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog (AC #7 - 6.3) */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent
          role="alertdialog"
          aria-describedby="disable-privacy-gaps-description"
        >
          <DialogHeader>
            <DialogTitle>Disable Privacy Pauses?</DialogTitle>
            <DialogDescription id="disable-privacy-gaps-description">
              Privacy pauses help protect your child during sensitive browsing.
              Without them, every moment of device activity is captured.
            </DialogDescription>
          </DialogHeader>

          {/* Warning content */}
          <div className="py-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
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
                <div>
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Consider Keeping This Enabled
                  </h4>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    Random pauses give your child space for private moments.
                    Children who feel constantly watched may seek ways to hide
                    activity instead of being open with you.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelDisable}
            >
              Keep Enabled
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDisable}
            >
              Disable Privacy Pauses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PrivacyGapsToggle
