/**
 * Compromise Suggestion Card Component.
 *
 * Story 5.4: Negotiation & Discussion Support - AC2
 *
 * Suggests compromise options for terms under discussion.
 * Suggestions are age-appropriate and practical.
 */

'use client'

import { useState } from 'react'
import type { TermCategory } from '@fledgely/shared/contracts'

/**
 * Compromise suggestion type.
 */
export interface CompromiseSuggestion {
  id: string
  text: string
  description: string
}

/**
 * Predefined compromise suggestions by category.
 * These serve as starting points for discussion.
 */
const COMPROMISE_SUGGESTIONS: Record<TermCategory, CompromiseSuggestion[]> = {
  time: [
    {
      id: 'time-1',
      text: 'Start with shorter time and earn more',
      description: 'Begin with less screen time. If rules are followed, add extra time each week.',
    },
    {
      id: 'time-2',
      text: 'Different times on different days',
      description: 'Less screen time on school days, more on weekends.',
    },
    {
      id: 'time-3',
      text: 'Flexible time with a weekly limit',
      description: 'Choose when to use screen time, but total for the week is set.',
    },
  ],
  apps: [
    {
      id: 'apps-1',
      text: 'Try the app for a trial period',
      description: 'Use the app for 2 weeks. Then decide together if it works.',
    },
    {
      id: 'apps-2',
      text: 'Use app at certain times only',
      description: 'The app is okay during specific times, like after homework.',
    },
    {
      id: 'apps-3',
      text: 'Learn about the app together',
      description: 'Parent and child explore the app together to understand it.',
    },
  ],
  monitoring: [
    {
      id: 'monitoring-1',
      text: 'Trust trial - show responsibility first',
      description: 'Follow rules for 2 weeks. Then discuss having less monitoring.',
    },
    {
      id: 'monitoring-2',
      text: 'Weekly check-ins instead of daily',
      description: 'Talk about screen time once a week instead of every day.',
    },
    {
      id: 'monitoring-3',
      text: 'Child-initiated sharing',
      description: 'Child chooses what to share and when. No checking without asking.',
    },
  ],
  rewards: [
    {
      id: 'rewards-1',
      text: 'Pick from a list of rewards',
      description: 'Create a list of rewards together. Child picks one when earned.',
    },
    {
      id: 'rewards-2',
      text: 'Points system for earning rewards',
      description: 'Earn points for following rules. Save up for bigger rewards.',
    },
    {
      id: 'rewards-3',
      text: 'Non-screen rewards too',
      description: 'Mix screen rewards with other fun things like outings or activities.',
    },
  ],
  general: [
    {
      id: 'general-1',
      text: 'Try it for a week, then revisit',
      description: 'Test the rule for one week. Then talk about what worked.',
    },
    {
      id: 'general-2',
      text: 'Meet in the middle',
      description: 'Find an option halfway between what each person wants.',
    },
    {
      id: 'general-3',
      text: 'Write down both ideas',
      description: 'Keep both suggestions and pick which to try first.',
    },
  ],
}

interface CompromiseSuggestionCardProps {
  /** Category of the term being discussed */
  category: TermCategory
  /** Original term text for context */
  originalTerm?: string
  /** Called when a compromise is selected */
  onSelectCompromise: (suggestion: CompromiseSuggestion) => void
  /** Called when user wants to write their own */
  onWriteOwn?: () => void
}

export function CompromiseSuggestionCard({
  category,
  originalTerm,
  onSelectCompromise,
  onWriteOwn,
}: CompromiseSuggestionCardProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const suggestions = COMPROMISE_SUGGESTIONS[category] || COMPROMISE_SUGGESTIONS.general

  return (
    <div
      className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200"
      data-testid="compromise-suggestion-card"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden="true">
          🤝
        </span>
        <h4 className="text-lg font-semibold text-green-900">Ideas for a Compromise</h4>
      </div>

      {/* Context */}
      {originalTerm && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-green-100">
          <p className="text-xs text-green-600 mb-1">Discussing:</p>
          <p className="text-sm text-gray-800">{originalTerm}</p>
        </div>
      )}

      {/* Suggestions */}
      <div className="space-y-2" role="list" aria-label="Compromise suggestions">
        {suggestions.map((suggestion) => {
          const isExpanded = expandedId === suggestion.id

          return (
            <div
              key={suggestion.id}
              className="bg-white rounded-lg border border-green-100 overflow-hidden"
              data-testid={`compromise-suggestion-${suggestion.id}`}
            >
              {/* Suggestion header */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                className="
                  w-full text-left p-3 flex items-center justify-between
                  hover:bg-green-50 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset
                  min-h-[48px]
                "
                aria-expanded={isExpanded}
                aria-controls={`suggestion-details-${suggestion.id}`}
              >
                <span className="text-sm font-medium text-gray-800">{suggestion.text}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div id={`suggestion-details-${suggestion.id}`} className="px-3 pb-3 space-y-3">
                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                  <button
                    type="button"
                    onClick={() => onSelectCompromise(suggestion)}
                    className="
                      w-full px-4 py-2 bg-green-600 text-white text-sm font-medium
                      rounded-lg hover:bg-green-700 transition-colors
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                      min-h-[44px]
                    "
                    data-testid={`select-compromise-${suggestion.id}`}
                  >
                    Use This Idea
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Write your own option */}
      {onWriteOwn && (
        <button
          type="button"
          onClick={onWriteOwn}
          className="
            mt-4 w-full px-4 py-3 border-2 border-dashed border-green-300
            text-green-700 text-sm font-medium rounded-lg
            hover:bg-green-50 hover:border-green-400 transition-colors
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            min-h-[48px]
          "
          data-testid="write-own-compromise"
        >
          <div className="flex items-center justify-center gap-2">
            <span aria-hidden="true">✏️</span>
            <span>Write Your Own Compromise</span>
          </div>
        </button>
      )}

      {/* Encouragement footer */}
      <div className="mt-4 pt-3 border-t border-green-100">
        <p className="text-xs text-green-600 flex items-center gap-2">
          <span aria-hidden="true">💡</span>
          <span>A good compromise means everyone gives a little and gets a little!</span>
        </p>
      </div>
    </div>
  )
}
