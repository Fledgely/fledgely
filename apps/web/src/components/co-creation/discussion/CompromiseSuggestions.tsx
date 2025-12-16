/**
 * CompromiseSuggestions Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 4
 *
 * Displays predefined compromise suggestions for common disagreement patterns.
 * Allows accepting suggestions to update term values.
 *
 * NFR42: Screen reader accessible
 * NFR43: Full keyboard navigation
 * NFR49: 44x44px touch targets
 */

import { forwardRef, useState, useId, useCallback } from 'react'
import type { TermType, SessionContributor } from '@fledgely/contracts'
import {
  getCompromiseSuggestions,
  hasCompromiseSuggestions,
  getCompromiseAcceptedAnnouncement,
  type CompromiseSuggestion,
} from './discussionUtils'

// ============================================
// TYPES
// ============================================

export interface CompromiseSuggestionsProps {
  /** The type of term being discussed */
  termType: TermType
  /** The current contributor */
  contributor: SessionContributor
  /** Callback when a suggestion is accepted */
  onAcceptSuggestion: (suggestion: CompromiseSuggestion, contributor: SessionContributor) => void
  /** ID of currently accepted suggestion (if any) */
  acceptedSuggestionId?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Custom className */
  className?: string
  /** Test ID */
  'data-testid'?: string
}

// ============================================
// SUGGESTION BUTTON COMPONENT
// ============================================

interface SuggestionButtonProps {
  suggestion: CompromiseSuggestion
  isAccepted: boolean
  onAccept: () => void
  disabled: boolean
  index: number
}

function SuggestionButton({
  suggestion,
  isAccepted,
  onAccept,
  disabled,
  index,
}: SuggestionButtonProps) {
  const baseClasses = `
    w-full text-left px-4 py-3 rounded-lg border-2 transition-all
    min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2
  `

  const acceptedClasses = `
    bg-green-50 border-green-400 text-green-800
    focus:ring-green-400
  `

  const defaultClasses = `
    bg-white border-gray-200 text-gray-700
    hover:bg-amber-50 hover:border-amber-300
    focus:ring-amber-400
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:bg-white disabled:hover:border-gray-200
  `

  return (
    <button
      type="button"
      onClick={onAccept}
      disabled={disabled || isAccepted}
      className={`${baseClasses} ${isAccepted ? acceptedClasses : defaultClasses}`}
      data-testid={`suggestion-${index}`}
      aria-pressed={isAccepted}
      aria-label={isAccepted
        ? `Accepted: ${suggestion.text}`
        : `Suggest: ${suggestion.text}`
      }
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span
            className="text-lg"
            aria-hidden="true"
          >
            {isAccepted ? '✓' : '💡'}
          </span>
          <span className="text-sm font-medium">
            {suggestion.text}
          </span>
        </span>
        {!isAccepted && !disabled && (
          <span
            className="text-xs text-amber-600 font-medium"
            aria-hidden="true"
          >
            Try it
          </span>
        )}
        {isAccepted && (
          <span
            className="text-xs text-green-600 font-medium"
            aria-hidden="true"
          >
            Accepted
          </span>
        )}
      </div>
    </button>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export const CompromiseSuggestions = forwardRef<HTMLDivElement, CompromiseSuggestionsProps>(
  function CompromiseSuggestions(
    {
      termType,
      contributor,
      onAcceptSuggestion,
      acceptedSuggestionId,
      disabled = false,
      className = '',
      'data-testid': testId = 'compromise-suggestions',
    },
    ref
  ) {
    const [announcementText, setAnnouncementText] = useState('')
    const titleId = useId()

    const suggestions = getCompromiseSuggestions(termType)
    const hasSuggestions = hasCompromiseSuggestions(termType)

    const handleAccept = useCallback((suggestion: CompromiseSuggestion) => {
      onAcceptSuggestion(suggestion, contributor)
      // Announce for screen readers
      const announcement = getCompromiseAcceptedAnnouncement(suggestion.text)
      setAnnouncementText(announcement)
      setTimeout(() => setAnnouncementText(''), 1000)
    }, [onAcceptSuggestion, contributor])

    // Don't render if no suggestions available
    if (!hasSuggestions) {
      return null
    }

    return (
      <div
        ref={ref}
        className={`compromise-suggestions ${className}`}
        data-testid={testId}
        role="region"
        aria-labelledby={titleId}
      >
        {/* Screen reader announcement */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="suggestions-announcement"
        >
          {announcementText}
        </div>

        {/* Header */}
        <h4
          id={titleId}
          className="text-sm font-medium text-gray-700 mb-3 flex items-center"
        >
          <span className="mr-2" aria-hidden="true">🤝</span>
          Try a compromise
        </h4>

        {/* Description */}
        <p
          className="text-xs text-gray-500 mb-3"
          data-testid="suggestions-description"
        >
          These ideas might help you find middle ground.
        </p>

        {/* Suggestions List */}
        <div
          className="space-y-2"
          role="group"
          aria-label="Compromise suggestions"
          data-testid="suggestions-list"
        >
          {suggestions.map((suggestion, index) => (
            <SuggestionButton
              key={suggestion.id}
              suggestion={suggestion}
              isAccepted={acceptedSuggestionId === suggestion.id}
              onAccept={() => handleAccept(suggestion)}
              disabled={disabled}
              index={index}
            />
          ))}
        </div>

        {/* Accepted indicator */}
        {acceptedSuggestionId && (
          <p
            className="text-xs text-green-600 mt-3 flex items-center"
            role="status"
            data-testid="accepted-status"
          >
            <span className="mr-1" aria-hidden="true">✓</span>
            Term value has been updated with your compromise
          </p>
        )}
      </div>
    )
  }
)

// ============================================
// EXPORTS
// ============================================

export type { CompromiseSuggestionsProps }
