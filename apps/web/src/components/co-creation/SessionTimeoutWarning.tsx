'use client'

import { useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Play, Save } from 'lucide-react'

/**
 * Props for SessionTimeoutWarning component
 */
export interface SessionTimeoutWarningProps {
  /** Whether the warning dialog should be shown */
  show: boolean
  /** Formatted time remaining (e.g., "4:30") */
  remainingFormatted: string
  /** Time remaining in milliseconds */
  remainingMs: number
  /** Called when user wants to continue the session */
  onContinue: () => void
  /** Called when user wants to save progress and exit */
  onSaveAndExit: () => void
  /** Whether the save operation is in progress */
  isSaving?: boolean
}

/**
 * Session Timeout Warning Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 6
 * Acceptance Criteria #6: 30-minute inactivity timeout warning
 *
 * Displays a warning dialog when a co-creation session is approaching
 * its 30-minute inactivity timeout. Provides options to:
 * - Continue the session (resets activity timer)
 * - Save progress and exit (pauses the session)
 *
 * The warning appears 5 minutes before timeout (at 25 minutes of inactivity).
 *
 * Accessibility features:
 * - Focus trapped within dialog when open
 * - Escape key continues the session (safest default)
 * - Proper ARIA roles and labels
 * - 44x44px touch targets (NFR49)
 * - High contrast for readability
 * - Screen reader announcements for time updates
 *
 * Screen sharing considerations:
 * - Large, readable typography
 * - Clear visual hierarchy
 * - Prominent countdown display
 *
 * @example
 * ```tsx
 * <SessionTimeoutWarning
 *   show={timeoutWarning.show}
 *   remainingFormatted={timeoutWarning.remainingFormatted}
 *   remainingMs={timeoutWarning.remainingMs}
 *   onContinue={markActivity}
 *   onSaveAndExit={pauseSession}
 * />
 * ```
 */
export function SessionTimeoutWarning({
  show,
  remainingFormatted,
  remainingMs,
  onContinue,
  onSaveAndExit,
  isSaving = false,
}: SessionTimeoutWarningProps) {
  /**
   * Calculate urgency level based on remaining time
   * - normal: > 2 minutes
   * - warning: 1-2 minutes
   * - critical: < 1 minute
   */
  const getUrgencyLevel = useCallback(() => {
    if (remainingMs < 60 * 1000) return 'critical'
    if (remainingMs < 2 * 60 * 1000) return 'warning'
    return 'normal'
  }, [remainingMs])

  const urgencyLevel = getUrgencyLevel()

  /**
   * Get urgency-based styling for the countdown
   */
  const getCountdownStyles = useCallback(() => {
    switch (urgencyLevel) {
      case 'critical':
        return 'text-destructive animate-pulse'
      case 'warning':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-foreground'
    }
  }, [urgencyLevel])

  /**
   * Handle dialog close - default to continuing the session
   * This is the safest action as it preserves the session
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onContinue()
      }
    },
    [onContinue]
  )

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    if (!show) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Enter continues the session (primary action)
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        onContinue()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [show, onContinue])

  return (
    <Dialog open={show} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          e.preventDefault()
          onContinue()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock
              className={`h-6 w-6 ${urgencyLevel === 'critical' ? 'text-destructive' : 'text-muted-foreground'}`}
              aria-hidden="true"
            />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription className="text-base">
            Your co-creation session will time out due to inactivity.
          </DialogDescription>
        </DialogHeader>

        {/* Countdown Display */}
        <div
          className="flex flex-col items-center justify-center py-6"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-sm text-muted-foreground mb-2">Time remaining:</p>
          <p
            className={`text-5xl font-bold tabular-nums ${getCountdownStyles()}`}
            aria-label={`${remainingFormatted} remaining`}
          >
            {remainingFormatted}
          </p>
          {urgencyLevel === 'critical' && (
            <p className="text-sm text-destructive mt-2 font-medium">
              Session will expire soon!
            </p>
          )}
        </div>

        {/* Action Description */}
        <div className="text-sm text-muted-foreground space-y-2 px-1">
          <p>
            <strong>Continue Session:</strong> Keep working on your agreement.
            Any activity will reset the timer.
          </p>
          <p>
            <strong>Save & Exit:</strong> Your progress will be saved.
            You can resume this session later.
          </p>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="min-h-[44px] min-w-[44px] gap-2"
            aria-describedby="save-exit-description"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isSaving ? 'Saving...' : 'Save & Exit'}
          </Button>
          <span id="save-exit-description" className="sr-only">
            Save your progress and pause the session for later
          </span>

          <Button
            type="button"
            onClick={onContinue}
            className="min-h-[44px] min-w-[44px] gap-2"
            autoFocus
            aria-describedby="continue-description"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Continue Session
          </Button>
          <span id="continue-description" className="sr-only">
            Continue working on your agreement. Activity will reset the timeout timer.
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
