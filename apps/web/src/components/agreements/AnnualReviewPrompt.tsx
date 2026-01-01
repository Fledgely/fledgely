/**
 * AnnualReviewPrompt Component - Story 35.6
 *
 * Component for displaying annual review prompt.
 * AC2: Prompt includes "Your child has grown"
 * AC3: Suggestions based on age
 * AC4: Optional family meeting reminder
 * AC6: Celebrates healthy relationship
 */

import { ANNUAL_REVIEW_MESSAGES, getAgeBasedSuggestions } from '@fledgely/shared'

/**
 * Props for AnnualReviewPrompt component.
 */
export interface AnnualReviewPromptProps {
  /** Child's name */
  childName: string
  /** Child's current age */
  childAge: number
  /** Years since agreement created */
  yearsSinceCreation: number
  /** Callback when starting review */
  onStartReview: () => void
  /** Callback when dismissing */
  onDismiss: () => void
  /** Optional callback for scheduling meeting */
  onScheduleMeeting?: () => void
}

/**
 * Annual review prompt component.
 * Uses celebratory, non-urgent tone.
 */
export function AnnualReviewPrompt({
  childName,
  childAge,
  yearsSinceCreation,
  onStartReview,
  onDismiss,
  onScheduleMeeting,
}: AnnualReviewPromptProps) {
  const ageSuggestions = getAgeBasedSuggestions(childAge)
  const yearText = yearsSinceCreation === 1 ? '1 year' : `${yearsSinceCreation} years`

  return (
    <article
      role="article"
      data-testid="annual-review-prompt"
      className="bg-blue-50 border border-blue-200 rounded-lg p-6"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {/* Celebration icon */}
          <svg
            className="h-8 w-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
        <div className="ml-4 flex-1">
          {/* Celebration message (AC6) */}
          <h3 className="text-lg font-medium text-blue-800">
            {yearText} of building trust together!
          </h3>

          {/* Title */}
          <p className="mt-2 text-blue-700">{ANNUAL_REVIEW_MESSAGES.PROMPT_TITLE}</p>

          {/* Growth reminder (AC2) */}
          <p className="mt-2 text-blue-600">
            {childName} has grown - {ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER.toLowerCase()}
          </p>

          {/* Age-based suggestions (AC3) */}
          {ageSuggestions.length > 0 && (
            <div className="mt-4 bg-white bg-opacity-50 rounded p-3">
              <p className="text-sm font-medium text-blue-700">Suggestions for {childName}:</p>
              <ul className="mt-2 space-y-1">
                {ageSuggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-blue-600 flex items-center">
                    <span className="mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStartReview}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Start Review
            </button>

            {/* Family meeting option (AC4) */}
            {onScheduleMeeting && (
              <button
                type="button"
                onClick={onScheduleMeeting}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200"
              >
                Schedule Family Meeting
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 text-blue-600 hover:text-blue-800"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
