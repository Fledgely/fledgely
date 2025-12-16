'use client'

import { useCallback } from 'react'

interface ChildPresencePromptProps {
  childName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

/**
 * Child Presence Prompt Component
 *
 * Story 5.1: Co-Creation Session Initiation - Task 4.2
 *
 * Prompts the parent to confirm the child is present before
 * starting the co-creation session. This ensures the family
 * activity is done together as intended (AC #1).
 *
 * Design considerations:
 * - Large, readable text for screen sharing (AC #5)
 * - 44x44px touch targets (NFR49)
 * - High contrast colors for readability
 * - Simple, friendly messaging at 6th grade level (NFR65)
 *
 * @example
 * ```tsx
 * <ChildPresencePrompt
 *   childName="Alex"
 *   onConfirm={() => startSession()}
 *   onCancel={() => goBack()}
 * />
 * ```
 */
export function ChildPresencePrompt({
  childName,
  onConfirm,
  onCancel,
  isLoading = false,
}: ChildPresencePromptProps) {
  const handleConfirm = useCallback(() => {
    if (!isLoading) {
      onConfirm()
    }
  }, [isLoading, onConfirm])

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onCancel()
    }
  }, [isLoading, onCancel])

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center"
      role="dialog"
      aria-labelledby="presence-title"
      aria-describedby="presence-description"
    >
      {/* Icon */}
      <div
        className="w-24 h-24 mb-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          className="w-12 h-12 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      {/* Title - Large for screen sharing */}
      <h2
        id="presence-title"
        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4"
      >
        Time to Sit Together
      </h2>

      {/* Description */}
      <p
        id="presence-description"
        className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-md"
      >
        Before we start, make sure <span className="font-semibold text-gray-900 dark:text-gray-100">{childName}</span> is with you.
        This agreement works best when you create it together.
      </p>

      {/* Checklist */}
      <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-left max-w-md w-full">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Quick checklist:
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{childName} is sitting next to you</span>
          </li>
          <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>You both can see the screen</span>
          </li>
          <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>You have 15-30 minutes available</span>
          </li>
        </ul>
      </div>

      {/* Action buttons - 44x44px min touch targets */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className="flex-1 min-h-[44px] px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Go back to previous step"
        >
          Not Yet
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isLoading}
          className="flex-1 min-h-[44px] px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Confirm ${childName} is present and start session`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
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
              Starting...
            </span>
          ) : (
            "We're Ready!"
          )}
        </button>
      </div>
    </div>
  )
}
