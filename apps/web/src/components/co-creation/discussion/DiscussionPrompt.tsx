/**
 * DiscussionPrompt Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 2
 *
 * Displays child-friendly prompts to facilitate discussion when a term
 * is marked as "needs discussion".
 *
 * NFR42: Screen reader accessible
 * NFR65: All prompts at 6th-grade reading level
 */

import { forwardRef, useId } from 'react'
import type { SessionTermType, SessionContributor } from '@fledgely/contracts'
import { getDiscussionPrompt, getDiscussionPrompts } from './discussionUtils'

// ============================================
// TYPES
// ============================================

export interface DiscussionPromptProps {
  /** The type of term being discussed */
  termType: SessionTermType
  /** The current contributor viewing the prompt */
  contributor: SessionContributor
  /** Whether to show prompts for both parties */
  showBoth?: boolean
  /** Custom className for styling */
  className?: string
  /** Test ID for testing */
  'data-testid'?: string
}

// ============================================
// PROMPT ICONS
// ============================================

const PROMPT_ICONS: Record<SessionTermType, string> = {
  screen_time: '📱',
  bedtime: '🌙',
  monitoring: '👀',
  rule: '📋',
  consequence: '⚖️',
  reward: '🎁',
}

// ============================================
// COMPONENT
// ============================================

/**
 * DiscussionPrompt displays context-specific prompts to help families
 * discuss disagreements about agreement terms.
 */
export const DiscussionPrompt = forwardRef<HTMLDivElement, DiscussionPromptProps>(
  function DiscussionPrompt(
    {
      termType,
      contributor,
      showBoth = false,
      className = '',
      'data-testid': testId = 'discussion-prompt',
    },
    ref
  ) {
    const labelId = useId()
    const prompts = getDiscussionPrompts(termType)
    const singlePrompt = getDiscussionPrompt(termType, contributor)
    const icon = PROMPT_ICONS[termType] ?? '💬'

    if (showBoth) {
      return (
        <div
          ref={ref}
          className={`discussion-prompt-container ${className}`}
          data-testid={testId}
          role="region"
          aria-labelledby={labelId}
        >
          <h4
            id={labelId}
            className="text-sm font-medium text-gray-700 mb-3"
            data-testid="discussion-prompt-title"
          >
            <span className="mr-2" aria-hidden="true">{icon}</span>
            Questions to discuss
          </h4>

          <div className="space-y-3">
            {/* Child Prompt */}
            <div
              className="discussion-prompt discussion-prompt--child bg-pink-50 rounded-lg p-3 border border-pink-200"
              data-testid="discussion-prompt-child"
              role="note"
              aria-label="Question for child"
            >
              <span
                className="inline-block text-xs font-medium text-pink-700 bg-pink-100 px-2 py-0.5 rounded mb-1"
                aria-hidden="true"
              >
                For You
              </span>
              <p className="text-sm text-pink-900">
                {prompts.child}
              </p>
            </div>

            {/* Parent Prompt */}
            <div
              className="discussion-prompt discussion-prompt--parent bg-blue-50 rounded-lg p-3 border border-blue-200"
              data-testid="discussion-prompt-parent"
              role="note"
              aria-label="Question for parent"
            >
              <span
                className="inline-block text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded mb-1"
                aria-hidden="true"
              >
                For Parent
              </span>
              <p className="text-sm text-blue-900">
                {prompts.parent}
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Single prompt view for current contributor
    const isChild = contributor === 'child'
    const bgColor = isChild ? 'bg-pink-50' : 'bg-blue-50'
    const borderColor = isChild ? 'border-pink-200' : 'border-blue-200'
    const textColor = isChild ? 'text-pink-900' : 'text-blue-900'

    return (
      <div
        ref={ref}
        className={`discussion-prompt ${bgColor} rounded-lg p-4 border ${borderColor} ${className}`}
        data-testid={testId}
        role="note"
        aria-label={`Discussion prompt: ${singlePrompt}`}
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span
            className="text-2xl flex-shrink-0"
            aria-hidden="true"
            data-testid="discussion-prompt-icon"
          >
            {icon}
          </span>
          <div>
            <p
              className={`text-base ${textColor} font-medium`}
              data-testid="discussion-prompt-text"
            >
              {singlePrompt}
            </p>
            <p
              className="text-xs text-gray-500 mt-1"
              aria-hidden="true"
            >
              Take a moment to share your thoughts
            </p>
          </div>
        </div>
      </div>
    )
  }
)

