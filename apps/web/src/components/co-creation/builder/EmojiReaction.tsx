'use client'

import { useCallback } from 'react'

/**
 * Props for the EmojiReaction component
 */
export interface EmojiReactionProps {
  /** Callback when an emoji is selected */
  onSelect: (emoji: string) => void
  /** Currently selected emoji value */
  value?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Emoji option configuration
 */
interface EmojiOption {
  emoji: string
  label: string
  testId: string
}

/**
 * Child-friendly emoji options for reactions
 */
const EMOJI_OPTIONS: EmojiOption[] = [
  { emoji: '👍', label: 'Thumbs up - I like it!', testId: 'emoji-thumbs-up' },
  { emoji: '❤️', label: 'Heart - I love it!', testId: 'emoji-heart' },
  { emoji: '⭐', label: 'Star - This is great!', testId: 'emoji-star' },
  { emoji: '🤔', label: 'Thinking - I am not sure', testId: 'emoji-thinking' },
  { emoji: '👎', label: 'Thumbs down - I do not like it', testId: 'emoji-thumbs-down' },
]

/**
 * EmojiReaction Component
 *
 * Story 5.3: Child Contribution Capture - Task 4
 *
 * A child-friendly emoji selection component for quick reactions.
 * Features:
 * - Large, tappable emoji buttons
 * - Clear visual feedback on selection
 * - Child-friendly labels and descriptions
 * - 48x48px touch targets (NFR49)
 * - Full keyboard accessibility (NFR43)
 * - ARIA labels for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <EmojiReaction
 *   onSelect={(emoji) => setReaction(emoji)}
 *   value={selectedEmoji}
 * />
 * ```
 */
export function EmojiReaction({
  onSelect,
  value,
  disabled = false,
  className = '',
  'data-testid': dataTestId,
}: EmojiReactionProps) {
  /**
   * Handle emoji selection
   */
  const handleSelect = useCallback(
    (emoji: string) => {
      if (disabled) return
      onSelect(emoji)
    },
    [disabled, onSelect]
  )

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback(
    (emoji: string) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleSelect(emoji)
      }
    },
    [handleSelect]
  )

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      data-testid={dataTestId ?? 'emoji-reaction'}
    >
      {/* Child-friendly label */}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        How do you feel about this?
      </span>

      {/* Emoji buttons */}
      <div
        role="group"
        aria-label="Select your reaction"
        className="flex flex-wrap gap-3"
      >
        {EMOJI_OPTIONS.map((option) => {
          const isSelected = value === option.emoji
          return (
            <button
              key={option.emoji}
              type="button"
              onClick={() => handleSelect(option.emoji)}
              onKeyDown={handleKeyDown(option.emoji)}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={option.label}
              className={`
                flex items-center justify-center
                w-12 h-12 rounded-xl
                text-3xl transition-all
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                ${
                  isSelected
                    ? 'bg-primary/20 ring-2 ring-primary scale-110'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              data-testid={option.testId}
            >
              {option.emoji}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default EmojiReaction
