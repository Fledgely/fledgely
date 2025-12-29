/**
 * Term Reaction Bar Component.
 *
 * Story 5.3: Child Contribution Capture - AC2, AC4
 *
 * Allows children (and parents) to react to agreement terms.
 * Reactions: agree, question, discuss, and emoji reactions.
 */

'use client'

import { useState } from 'react'
import type { TermReaction, TermReactionType, ContributionParty } from '@fledgely/shared/contracts'

/**
 * Reaction button configuration.
 */
const REACTION_BUTTONS: {
  type: TermReactionType
  icon: string
  label: string
  activeColor: string
}[] = [
  { type: 'agree', icon: '✓', label: 'I agree', activeColor: 'bg-green-100 text-green-700' },
  {
    type: 'question',
    icon: '?',
    label: 'I have a question',
    activeColor: 'bg-yellow-100 text-yellow-700',
  },
  {
    type: 'discuss',
    icon: '💬',
    label: 'Let\u0027s discuss',
    activeColor: 'bg-blue-100 text-blue-700',
  },
  { type: 'love', icon: '❤️', label: 'Love it!', activeColor: 'bg-pink-100 text-pink-700' },
  {
    type: 'think',
    icon: '🤔',
    label: 'Need to think',
    activeColor: 'bg-purple-100 text-purple-700',
  },
]

/**
 * Quick emoji options for expressive reactions.
 */
const EMOJI_OPTIONS = ['👍', '👎', '😊', '😢', '🎉', '💪', '🙏', '✨']

interface TermReactionBarProps {
  /** ID of the term being reacted to */
  termId: string
  /** Current reactions for this term */
  reactions: TermReaction[]
  /** Who is currently reacting */
  currentParty: ContributionParty
  /** Called when a reaction is added/toggled */
  onReact: (type: TermReactionType, emoji?: string) => void
  /** Whether to show the emoji picker */
  showEmojiPicker?: boolean
  /** Size variant for different contexts */
  size?: 'small' | 'medium'
}

export function TermReactionBar({
  termId: _termId,
  reactions,
  currentParty,
  onReact,
  showEmojiPicker = true,
  size = 'medium',
}: TermReactionBarProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)

  /**
   * Check if the current party has a specific reaction.
   */
  const hasReaction = (type: TermReactionType): boolean => {
    return reactions.some((r) => r.party === currentParty && r.type === type)
  }

  /**
   * Get count of reactions by type.
   */
  const getReactionCount = (type: TermReactionType): number => {
    return reactions.filter((r) => r.type === type).length
  }

  /**
   * Handle reaction button click.
   */
  const handleReactionClick = (type: TermReactionType) => {
    onReact(type)
  }

  /**
   * Handle emoji selection.
   */
  const handleEmojiSelect = (emoji: string) => {
    onReact('love', emoji)
    setIsEmojiPickerOpen(false)
  }

  const buttonSize = size === 'small' ? 'min-h-[44px] min-w-[44px]' : 'min-h-[48px] min-w-[48px]'
  const textSize = size === 'small' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="term-reaction-bar">
      {/* Reaction buttons */}
      {REACTION_BUTTONS.map((button) => {
        const isActive = hasReaction(button.type)
        const count = getReactionCount(button.type)

        return (
          <button
            key={button.type}
            type="button"
            onClick={() => handleReactionClick(button.type)}
            className={`
              ${buttonSize} px-3 py-2 rounded-full flex items-center gap-1.5
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary
              ${isActive ? button.activeColor : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            `}
            aria-pressed={isActive}
            aria-label={button.label}
            data-testid={`reaction-${button.type}`}
          >
            <span className="text-lg" aria-hidden="true">
              {button.icon}
            </span>
            {count > 0 && <span className={`font-medium ${textSize}`}>{count}</span>}
          </button>
        )
      })}

      {/* Emoji picker toggle */}
      {showEmojiPicker && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            className={`
              ${buttonSize} px-3 py-2 rounded-full flex items-center justify-center
              bg-gray-100 text-gray-600 hover:bg-gray-200
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary
            `}
            aria-label="Add emoji reaction"
            aria-expanded={isEmojiPickerOpen}
            data-testid="emoji-picker-toggle"
          >
            <span className="text-lg" aria-hidden="true">
              😊
            </span>
          </button>

          {/* Emoji picker dropdown */}
          {isEmojiPickerOpen && (
            <div
              className="absolute z-20 mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
              role="listbox"
              aria-label="Select an emoji"
              data-testid="emoji-picker"
            >
              <div className="grid grid-cols-4 gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiSelect(emoji)}
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xl rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    role="option"
                    aria-label={`React with ${emoji}`}
                    data-testid={`emoji-option-${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TermReactionBar
