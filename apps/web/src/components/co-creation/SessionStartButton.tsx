'use client'

import { useCallback } from 'react'

type SessionStartState = 'idle' | 'loading' | 'success' | 'error'

interface SessionStartButtonProps {
  onStart: () => void
  state?: SessionStartState
  errorMessage?: string
  disabled?: boolean
}

/**
 * Session Start Button Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 4.3
 *
 * A prominent button for starting the co-creation session.
 * Includes loading, success, and error states with appropriate
 * visual feedback.
 *
 * Design considerations:
 * - 44x44px minimum touch target (NFR49)
 * - Clear visual states for accessibility
 * - Large enough for screen sharing (AC #5)
 * - 4.5:1 contrast ratio (NFR45)
 *
 * @example
 * ```tsx
 * <SessionStartButton
 *   onStart={() => handleStartSession()}
 *   state={isLoading ? 'loading' : 'idle'}
 * />
 * ```
 */
export function SessionStartButton({
  onStart,
  state = 'idle',
  errorMessage,
  disabled = false,
}: SessionStartButtonProps) {
  const handleClick = useCallback(() => {
    // Allow clicking in idle or error state (to retry)
    if ((state === 'idle' || state === 'error') && !disabled) {
      onStart()
    }
  }, [state, disabled, onStart])

  const isDisabled = disabled || state === 'loading' || state === 'success'

  // Determine button content based on state
  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <span className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Creating Session...</span>
          </span>
        )
      case 'success':
        return (
          <span className="flex items-center justify-center gap-3">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Session Started!</span>
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center justify-center gap-3">
            <svg
              className="h-6 w-6"
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
            <span>Try Again</span>
          </span>
        )
      default:
        return (
          <span className="flex items-center justify-center gap-3">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Start Building Together</span>
          </span>
        )
    }
  }

  // Determine button styles based on state
  const getButtonStyles = () => {
    const baseStyles = 'w-full min-h-[56px] px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2'

    switch (state) {
      case 'loading':
        return `${baseStyles} bg-blue-500 text-white cursor-wait`
      case 'success':
        return `${baseStyles} bg-green-600 text-white`
      case 'error':
        return `${baseStyles} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`
      default:
        return `${baseStyles} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`
    }
  }

  return (
    <div className="w-full max-w-md">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={getButtonStyles()}
        aria-busy={state === 'loading'}
        aria-describedby={errorMessage ? 'start-error' : undefined}
      >
        {renderContent()}
      </button>

      {/* Error message */}
      {state === 'error' && errorMessage && (
        <p
          id="start-error"
          className="mt-3 text-center text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}
