/**
 * Child Agreement View Component.
 *
 * Story 5.8: Child Agreement Viewing - AC1, AC2, AC3, AC4
 *
 * Read-only view of the child's active agreement with child-friendly
 * formatting, category organization, and contribution highlighting.
 */

'use client'

import type { AgreementTerm, TermCategory } from '@fledgely/shared/contracts'
import { AskQuestionButton } from './AskQuestionButton'
import { StatusSummary } from './StatusSummary'

/**
 * Category display configuration with friendly labels and icons.
 * Designed for 6th-grade reading level (NFR65).
 */
const CATEGORY_CONFIG: Record<
  TermCategory,
  { label: string; emoji: string; bgColor: string; borderColor: string }
> = {
  time: {
    label: 'Screen Time',
    emoji: '📺',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  apps: {
    label: 'Apps & Games',
    emoji: '🎮',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  monitoring: {
    label: 'Rules',
    emoji: '📋',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  rewards: {
    label: 'Rewards',
    emoji: '🌟',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  general: {
    label: 'Other',
    emoji: '💡',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
}

interface ChildAgreementViewProps {
  /** Agreement terms to display */
  terms: AgreementTerm[]
  /** Child's name for personalization */
  childName: string
  /** Agreement title */
  agreementTitle: string
  /** Date the agreement was signed */
  signedAt: Date
  /** Screen time used today (minutes) */
  screenTimeUsed?: number
  /** Daily screen time limit (minutes) */
  screenTimeLimit?: number
  /** Callback when child asks a question about a term */
  onAskQuestion: (termId: string, termText: string) => void
  /** Whether a question is being sent */
  isQuestionLoading?: boolean
  /** ID of term that had question sent */
  questionSentTermId?: string | null
  /** Callback to refresh status data */
  onRefreshStatus?: () => void
  /** Whether status is refreshing */
  isStatusRefreshing?: boolean
  /** Additional CSS classes */
  className?: string
}

export function ChildAgreementView({
  terms,
  childName,
  agreementTitle,
  signedAt,
  screenTimeUsed,
  screenTimeLimit,
  onAskQuestion,
  isQuestionLoading = false,
  questionSentTermId = null,
  onRefreshStatus,
  isStatusRefreshing = false,
  className = '',
}: ChildAgreementViewProps) {
  /**
   * Group terms by category for organized display.
   */
  const termsByCategory = terms.reduce(
    (acc, term) => {
      if (!acc[term.category]) {
        acc[term.category] = []
      }
      acc[term.category].push(term)
      return acc
    },
    {} as Record<TermCategory, AgreementTerm[]>
  )

  /**
   * Format the signed date in a child-friendly way.
   */
  const formatSignedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Empty state
  if (terms.length === 0) {
    return (
      <main
        role="main"
        aria-label="Your agreement"
        className={`max-w-2xl mx-auto p-4 ${className}`}
        data-testid="child-agreement-view"
      >
        <div className="text-center py-12" data-testid="empty-state">
          <span className="text-6xl mb-4 block" aria-hidden="true">
            📋
          </span>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">No Rules Yet</h1>
          <p className="text-gray-500">
            You do not have any rules in your agreement yet. Ask your parent to help you create one!
          </p>
        </div>
      </main>
    )
  }

  return (
    <main
      role="main"
      aria-label="Your agreement"
      className={`max-w-2xl mx-auto p-4 ${className}`}
      data-testid="child-agreement-view"
    >
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{agreementTitle}</h1>
        <p className="text-gray-600" data-testid="signed-date">
          Signed on {formatSignedDate(signedAt)}
        </p>
        <p className="text-sm text-gray-500 mt-1">Hi {childName}! Here are your rules.</p>
      </header>

      {/* Status Summary (if screen time tracking enabled) */}
      {screenTimeUsed !== undefined && screenTimeLimit !== undefined && (
        <StatusSummary
          screenTimeUsed={screenTimeUsed}
          screenTimeLimit={screenTimeLimit}
          childName={childName}
          onRefresh={onRefreshStatus}
          isRefreshing={isStatusRefreshing}
          className="mb-6"
        />
      )}

      {/* Terms grouped by category */}
      <div className="space-y-6">
        {Object.entries(termsByCategory).map(([category, categoryTerms]) => {
          const config = CATEGORY_CONFIG[category as TermCategory]
          return (
            <section
              key={category}
              className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4`}
              data-testid={`category-section-${category}`}
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
                <span className="text-2xl" aria-hidden="true">
                  {config.emoji}
                </span>
                {config.label}
              </h2>

              <div className="space-y-3">
                {categoryTerms
                  .sort((a, b) => a.order - b.order)
                  .map((term) => (
                    <TermCard
                      key={term.id}
                      term={term}
                      childName={childName}
                      onAskQuestion={onAskQuestion}
                      isQuestionLoading={isQuestionLoading && questionSentTermId === term.id}
                      hasQuestionSent={questionSentTermId === term.id && !isQuestionLoading}
                    />
                  ))}
              </div>
            </section>
          )
        })}
      </div>

      {/* Footer note */}
      <footer className="mt-8 text-center text-sm text-gray-500">
        <p>Have a question about any rule? Click the button to ask your parent!</p>
      </footer>
    </main>
  )
}

/**
 * Individual term card with contribution highlighting.
 */
interface TermCardProps {
  term: AgreementTerm
  childName: string
  onAskQuestion: (termId: string, termText: string) => void
  isQuestionLoading?: boolean
  hasQuestionSent?: boolean
}

function TermCard({
  term,
  childName: _childName,
  onAskQuestion,
  isQuestionLoading = false,
  hasQuestionSent = false,
}: TermCardProps) {
  const isChildContribution = term.party === 'child'

  return (
    <div
      className={`rounded-lg p-4 border-l-4 bg-white ${
        isChildContribution ? 'border-pink-400' : 'border-blue-400'
      }`}
      data-testid={`term-card-${term.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Contribution badge */}
          {isChildContribution && (
            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-pink-100 text-pink-700 rounded-full mb-2">
              My idea
            </span>
          )}

          {/* Term text */}
          <p className="text-base text-gray-800 font-medium">{term.text}</p>

          {/* Explanation */}
          {term.explanation && (
            <p className="text-sm text-gray-600 mt-2 italic">{term.explanation}</p>
          )}
        </div>

        {/* Question button */}
        <AskQuestionButton
          termId={term.id}
          termText={term.text}
          onAskQuestion={onAskQuestion}
          isLoading={isQuestionLoading}
          hasSent={hasQuestionSent}
        />
      </div>
    </div>
  )
}
