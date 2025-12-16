'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Child-friendly term type for simplified selection
 */
type ChildTermType = 'rule' | 'reward' | 'other'

/**
 * Form data submitted by the child
 */
export interface ChildTermFormData {
  type: 'rule' | 'reward'
  content: { text: string; emoji?: string }
}

/**
 * Props for the ChildAddTermForm component
 */
export interface ChildAddTermFormProps {
  /** Callback when form is submitted */
  onSubmit: (data: ChildTermFormData) => void
  /** Callback when form is cancelled */
  onCancel: () => void
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * Type option configuration
 */
interface TypeOption {
  type: ChildTermType
  label: string
  selectedBg: string
  selectedText: string
}

/**
 * Child-friendly emoji options for quick expression
 */
const QUICK_EMOJIS = ['😊', '🎮', '📱', '⏰', '🛏️', '📚', '⭐', '❤️']

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'rule',
    label: 'A rule I want',
    selectedBg: 'bg-green-100 dark:bg-green-900',
    selectedText: 'text-green-800 dark:text-green-200',
  },
  {
    type: 'reward',
    label: 'A reward I want',
    selectedBg: 'bg-emerald-100 dark:bg-emerald-900',
    selectedText: 'text-emerald-800 dark:text-emerald-200',
  },
  {
    type: 'other',
    label: 'Something else',
    selectedBg: 'bg-blue-100 dark:bg-blue-900',
    selectedText: 'text-blue-800 dark:text-blue-200',
  },
]

/**
 * ChildAddTermForm Component
 *
 * Story 5.3: Child Contribution Capture - Task 2
 *
 * A simplified, child-friendly form for adding terms to agreements.
 * Features:
 * - Large, clear type options (rule, reward, something else)
 * - Child-friendly language at 4th-grade level
 * - 48x48px touch targets (NFR49)
 * - Large text input for readability
 * - Emoji picker integration
 * - Full keyboard accessibility (NFR43)
 * - ARIA labels for screen readers (NFR42)
 *
 * @example
 * ```tsx
 * <ChildAddTermForm
 *   onSubmit={(data) => console.log('Submitted:', data)}
 *   onCancel={() => console.log('Cancelled')}
 * />
 * ```
 */
export function ChildAddTermForm({
  onSubmit,
  onCancel,
  className = '',
  'data-testid': dataTestId,
}: ChildAddTermFormProps) {
  const [selectedType, setSelectedType] = useState<ChildTermType | null>(null)
  const [text, setText] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>()
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)

  /**
   * Handle emoji picker open/close
   */
  const toggleEmojiPicker = useCallback(() => {
    setIsEmojiPickerOpen((prev) => !prev)
  }, [])

  /**
   * Handle emoji selection from picker
   */
  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedEmoji(emoji)
    setIsEmojiPickerOpen(false)
    emojiButtonRef.current?.focus()
  }, [])

  /**
   * Close emoji picker on escape or click outside
   */
  useEffect(() => {
    if (!isEmojiPickerOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEmojiPickerOpen(false)
        emojiButtonRef.current?.focus()
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setIsEmojiPickerOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEmojiPickerOpen])

  /**
   * Handle type selection
   */
  const handleTypeSelect = useCallback((type: ChildTermType) => {
    setSelectedType(type)
  }, [])

  /**
   * Handle keyboard interaction on type options
   */
  const handleTypeKeyDown = useCallback(
    (type: ChildTermType) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        setSelectedType(type)
      }
    },
    []
  )

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      if (!selectedType || !text.trim()) return

      // Map "other" to "rule" for submission
      const submissionType: 'rule' | 'reward' =
        selectedType === 'other' ? 'rule' : selectedType

      onSubmit({
        type: submissionType,
        content: {
          text: text.trim(),
          ...(selectedEmoji && { emoji: selectedEmoji }),
        },
      })
    },
    [selectedType, text, selectedEmoji, onSubmit]
  )

  const isSubmitDisabled = !text.trim()

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-6 ${className}`}
      data-testid={dataTestId ?? 'child-add-term-form'}
      role="form"
      aria-label="Add something to the agreement"
    >
      {/* Child-friendly prompt */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          I want to say...
        </h2>
      </div>

      {/* Type selection */}
      <div className="flex flex-col gap-3">
        {TYPE_OPTIONS.map((option) => {
          const isSelected = selectedType === option.type
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => handleTypeSelect(option.type)}
              onKeyDown={handleTypeKeyDown(option.type)}
              aria-pressed={isSelected}
              aria-label={`Select ${option.label}`}
              className={`
                flex items-center justify-center px-4 py-3 rounded-xl
                min-h-[48px] min-w-[48px]
                font-medium text-lg transition-all
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                ${
                  isSelected
                    ? `${option.selectedBg} ${option.selectedText} border-2 border-current`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
              data-testid={`type-option-${option.type}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Text input section - shown after type selection */}
      {selectedType && (
        <div className="flex flex-col gap-4">
          {/* Text input with emoji button */}
          <div className="relative">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type what you want to add..."
              aria-label="Enter your idea"
              className={`
                w-full px-4 py-3 rounded-xl
                text-lg font-medium
                bg-white dark:bg-gray-900
                border-2 border-gray-300 dark:border-gray-600
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50
              `}
              data-testid="child-text-input"
            />
            {/* Emoji picker button */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={toggleEmojiPicker}
              aria-label="Pick an emoji"
              aria-expanded={isEmojiPickerOpen}
              aria-haspopup="menu"
              className={`
                absolute right-2 top-1/2 -translate-y-1/2
                w-10 h-10 rounded-lg
                flex items-center justify-center
                bg-gray-100 dark:bg-gray-800
                hover:bg-gray-200 dark:hover:bg-gray-700
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                text-xl
              `}
              data-testid="emoji-picker-button"
            >
              {selectedEmoji || '😊'}
            </button>

            {/* Emoji picker popup */}
            {isEmojiPickerOpen && (
              <div
                ref={emojiPickerRef}
                role="menu"
                aria-label="Select an emoji"
                className="absolute right-0 top-full mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                data-testid="emoji-picker-popup"
              >
                <div className="flex flex-wrap gap-2 max-w-[200px]">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      role="menuitem"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={`
                        w-10 h-10 rounded-lg text-2xl
                        flex items-center justify-center
                        hover:bg-gray-100 dark:hover:bg-gray-800
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
                        ${selectedEmoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : ''}
                      `}
                      data-testid={`emoji-option-${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className={`
                flex-1 px-4 py-3 rounded-xl
                min-h-[48px]
                font-medium text-lg
                bg-gray-100 dark:bg-gray-800
                text-gray-700 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-700
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                transition-colors
              `}
              data-testid="cancel-button"
            >
              Never mind
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`
                flex-1 px-4 py-3 rounded-xl
                min-h-[48px]
                font-medium text-lg
                bg-primary text-white
                hover:bg-primary-dark
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              `}
              data-testid="submit-button"
            >
              I'm done!
            </button>
          </div>
        </div>
      )}

      {/* Cancel button shown before type selection too */}
      {!selectedType && (
        <button
          type="button"
          onClick={onCancel}
          className={`
            px-4 py-3 rounded-xl
            min-h-[48px]
            font-medium text-lg
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-gray-300
            hover:bg-gray-200 dark:hover:bg-gray-700
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-colors
          `}
          data-testid="cancel-button"
        >
          Never mind
        </button>
      )}
    </form>
  )
}

export default ChildAddTermForm
