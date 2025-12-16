'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Feedback type options
 */
export type FeedbackType = 'positive' | 'negative' | 'neutral'

/**
 * Props for the ChildFeedbackButton component
 */
export interface ChildFeedbackButtonProps {
  /** ID of the term this feedback is for */
  termId: string
  /** Callback when feedback is provided */
  onFeedback: (termId: string, feedback: FeedbackType) => void
  /** Current feedback value if already set */
  currentFeedback?: FeedbackType
  /** Whether the button is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Feedback option configuration
 */
interface FeedbackOption {
  type: FeedbackType
  emoji: string
  label: string
  testId: string
  color: string
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    type: 'positive',
    emoji: '👍',
    label: 'I like it!',
    testId: 'feedback-yes',
    color: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800',
  },
  {
    type: 'neutral',
    emoji: '🤔',
    label: 'Not sure',
    testId: 'feedback-maybe',
    color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800',
  },
  {
    type: 'negative',
    emoji: '👎',
    label: "I don't like it",
    testId: 'feedback-no',
    color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800',
  },
]

/**
 * ChildFeedbackButton Component
 *
 * Story 5.3: Child Contribution Capture - Task 5
 *
 * Allows children to provide simple feedback on parent-added terms.
 * Features:
 * - Simple yes/no/maybe options with emojis
 * - Visual indicator of current feedback
 * - Child-friendly language
 * - 48x48px touch targets (NFR49)
 * - Full keyboard accessibility (NFR43)
 * - ARIA labels for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <ChildFeedbackButton
 *   termId="term-123"
 *   onFeedback={(termId, feedback) => handleFeedback(termId, feedback)}
 *   currentFeedback="positive"
 * />
 * ```
 */
export function ChildFeedbackButton({
  termId,
  onFeedback,
  currentFeedback,
  disabled = false,
  className = '',
  'data-testid': dataTestId,
}: ChildFeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  /**
   * Toggle the feedback options panel
   */
  const toggleOptions = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev)
    }
  }, [disabled])

  /**
   * Close the panel
   */
  const closePanel = useCallback(() => {
    setIsOpen(false)
    buttonRef.current?.focus()
  }, [])

  /**
   * Handle escape key to close panel
   */
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closePanel()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        closePanel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, closePanel])

  /**
   * Handle feedback selection
   */
  const handleFeedback = useCallback(
    (type: FeedbackType) => {
      onFeedback(termId, type)
      setIsOpen(false)
    },
    [termId, onFeedback]
  )

  /**
   * Handle keyboard interaction on feedback options
   */
  const handleKeyDown = useCallback(
    (type: FeedbackType) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleFeedback(type)
      }
    },
    [handleFeedback]
  )

  /**
   * Get display for current feedback
   */
  const getCurrentFeedbackDisplay = () => {
    if (!currentFeedback) return null
    const option = FEEDBACK_OPTIONS.find((o) => o.type === currentFeedback)
    if (!option) return null

    const colorMap = {
      positive: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
      neutral: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
      negative: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${colorMap[currentFeedback]}`}
        data-testid={`current-feedback-${currentFeedback}`}
      >
        <span>{option.emoji}</span>
        <span>{option.label}</span>
      </span>
    )
  }

  return (
    <div className={`relative inline-flex flex-col gap-2 ${className}`}>
      {/* Child-friendly label */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        What do you think?
      </span>

      {/* Main toggle button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOptions}
        disabled={disabled}
        aria-label={isOpen ? 'Close feedback options' : 'Give your feedback'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`
          flex items-center gap-2 px-4 py-2 rounded-xl
          min-h-[48px]
          font-medium transition-all
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
          ${
            isOpen
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        data-testid={dataTestId ?? 'child-feedback-button'}
      >
        {currentFeedback ? (
          getCurrentFeedbackDisplay()
        ) : (
          <>
            <span className="text-xl">💭</span>
            <span>Tell me!</span>
          </>
        )}
      </button>

      {/* Feedback options panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Feedback options"
          className="flex flex-col gap-2 p-3 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
          data-testid="feedback-options"
        >
          {FEEDBACK_OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              role="menuitem"
              onClick={() => handleFeedback(option.type)}
              onKeyDown={handleKeyDown(option.type)}
              aria-label={option.label}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                min-h-[48px]
                font-medium transition-all
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                ${option.color}
              `}
              data-testid={option.testId}
            >
              <span className="text-2xl">{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChildFeedbackButton
