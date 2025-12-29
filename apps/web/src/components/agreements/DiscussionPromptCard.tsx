/**
 * Discussion Prompt Card Component.
 *
 * Story 5.4: Negotiation & Discussion Support - AC1, AC6
 *
 * Displays age-appropriate discussion prompts when a term is marked for discussion.
 * Prompts use 6th-grade reading level language (NFR65).
 */

'use client'

import { useMemo } from 'react'
import type { TermCategory } from '@fledgely/shared/contracts'

/**
 * Discussion prompts organized by category.
 * Written at 6th-grade reading level per NFR65.
 */
const DISCUSSION_PROMPTS: Record<TermCategory, string[]> = {
  time: [
    'How much screen time feels fair to you? Why?',
    'What would you do with extra screen time?',
    'When is the best time for screens? When should screens be off?',
  ],
  apps: [
    'What apps are most important to you? Why?',
    'Are there apps you feel you need for school or friends?',
    'What games or apps make you happiest?',
  ],
  monitoring: [
    'How do you feel about having this rule?',
    'What would make you feel trusted and safe?',
    'How can we make this rule work for everyone?',
  ],
  rewards: [
    'What reward would make you excited to follow the rules?',
    'What do you think is a fair reward for this?',
    'How should we celebrate when you reach your goals?',
  ],
  general: [
    'Tell me more about what you think.',
    'Why is this important to you?',
    'What would make this better for you?',
    'How can we work together on this?',
  ],
}

/**
 * Get opening prompt for a discussion.
 */
const OPENING_PROMPTS = [
  "Let's talk about this together!",
  'I want to hear your thoughts!',
  'Your ideas matter - share them with me!',
]

interface DiscussionPromptCardProps {
  /** Category of the term being discussed */
  category: TermCategory
  /** Child's name for personalization */
  childName: string
  /** Whether to show all prompts or just one */
  showAllPrompts?: boolean
  /** Called when a prompt is selected */
  onPromptSelect?: (prompt: string) => void
}

export function DiscussionPromptCard({
  category,
  childName,
  showAllPrompts = false,
  onPromptSelect,
}: DiscussionPromptCardProps) {
  const prompts = DISCUSSION_PROMPTS[category] || DISCUSSION_PROMPTS.general
  // Use useMemo to ensure deterministic rendering - only select once per mount
  const openingPrompt = useMemo(
    () => OPENING_PROMPTS[Math.floor(Math.random() * OPENING_PROMPTS.length)],
    []
  )
  const displayPrompts = showAllPrompts ? prompts : prompts.slice(0, 1)

  return (
    <div
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200"
      data-testid="discussion-prompt-card"
      role="region"
      aria-label={`Discussion prompts for ${childName}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden="true">
          💬
        </span>
        <h4 className="text-lg font-semibold text-blue-900" id="prompts-heading">
          {openingPrompt}
        </h4>
      </div>

      {/* Personalized intro */}
      <p className="text-sm text-blue-700 mb-4" aria-live="polite">
        {childName}, here are some questions to help you share your thoughts:
      </p>

      {/* Discussion prompts */}
      <div className="space-y-2" role="list" aria-labelledby="prompts-heading">
        {displayPrompts.map((prompt, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onPromptSelect?.(prompt)}
            className="
              w-full text-left p-3 bg-white rounded-lg border border-blue-100
              hover:border-blue-300 hover:bg-blue-50 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              min-h-[48px]
            "
            data-testid={`discussion-prompt-${index}`}
            aria-label={`Discussion question: ${prompt}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-blue-500 mt-0.5" aria-hidden="true">
                ?
              </span>
              <span className="text-gray-800 text-sm">{prompt}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Show more prompts toggle */}
      {!showAllPrompts && prompts.length > 1 && (
        <button
          type="button"
          onClick={() => onPromptSelect?.('')}
          className="
            mt-3 text-sm text-blue-600 hover:text-blue-800
            focus:outline-none focus:underline
            min-h-[44px] flex items-center
          "
          data-testid="show-more-prompts"
        >
          See more questions ({prompts.length - 1} more)
        </button>
      )}

      {/* Encouragement footer */}
      <div className="mt-4 pt-3 border-t border-blue-100">
        <p className="text-xs text-blue-600 flex items-center gap-2">
          <span aria-hidden="true">✨</span>
          <span>There are no wrong answers. Be honest about how you feel!</span>
        </p>
      </div>
    </div>
  )
}
