/**
 * Active Agreement Card Component.
 *
 * Story 6.3: Agreement Activation - AC5
 *
 * Displays active agreement summary on dashboard with version and status.
 */

'use client'

import type { ActiveAgreement } from '@fledgely/shared/contracts'
import { formatDateShort } from '@/utils/formatDate'

interface ActiveAgreementCardProps {
  /** The active agreement to display */
  agreement: ActiveAgreement
  /** Whether this is for child view (simplified) */
  isChildView?: boolean
  /** Called when "View Full Agreement" is clicked */
  onViewFull?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Get term summary text with appropriate truncation.
 */
function getTermSummary(term: { text: string }, maxLength: number = 50): string {
  if (term.text.length <= maxLength) {
    return term.text
  }
  return term.text.substring(0, maxLength - 3) + '...'
}

export function ActiveAgreementCard({
  agreement,
  isChildView = false,
  onViewFull,
  className = '',
}: ActiveAgreementCardProps) {
  // Show first 3-5 terms as summary
  const summaryTerms = agreement.terms.slice(0, isChildView ? 3 : 5)
  const hasMoreTerms = agreement.terms.length > summaryTerms.length

  return (
    <article
      className={`rounded-xl border-2 border-green-200 bg-green-50 p-6 ${className}`}
      aria-labelledby="agreement-title"
      data-testid="active-agreement-card"
    >
      {/* Header with status badge */}
      <header className="mb-4 flex items-start justify-between">
        <div>
          <h2
            id="agreement-title"
            className="text-xl font-bold text-green-800"
            data-testid="agreement-title"
          >
            {isChildView ? 'Our Family Agreement' : 'Active Agreement'}
          </h2>
          <p className="mt-1 text-sm text-green-700" data-testid="agreement-version">
            Version {agreement.version}
          </p>
        </div>
        <span
          className="rounded-full bg-green-600 px-3 py-1 text-sm font-medium text-white"
          role="status"
          aria-label="Agreement status: Active"
          data-testid="status-badge"
        >
          Active
        </span>
      </header>

      {/* Activation date */}
      <p className="mb-4 text-sm text-green-700" data-testid="activation-date">
        {isChildView ? 'Started' : 'Activated'}: {formatDateShort(agreement.activatedAt)}
      </p>

      {/* Terms summary */}
      <section aria-labelledby="terms-heading" className="mb-4">
        <h3 id="terms-heading" className="mb-2 font-medium text-green-800">
          {isChildView ? 'What we agreed to:' : 'Key Terms:'}
        </h3>
        <ul className="space-y-2" aria-label="Agreement terms summary" data-testid="terms-list">
          {summaryTerms.map((term) => (
            <li key={term.id} className="flex items-start gap-2 text-gray-700">
              <span className="mt-1 text-green-600" aria-hidden="true">
                •
              </span>
              <span>{getTermSummary(term, isChildView ? 40 : 50)}</span>
            </li>
          ))}
          {hasMoreTerms && (
            <li className="text-sm text-green-600">
              +{agreement.terms.length - summaryTerms.length} more{' '}
              {agreement.terms.length - summaryTerms.length === 1 ? 'item' : 'items'}
            </li>
          )}
        </ul>
      </section>

      {/* View full agreement link */}
      {onViewFull && (
        <button
          type="button"
          onClick={onViewFull}
          className="
            w-full rounded-lg border-2 border-green-300 bg-white
            px-4 py-3 font-medium text-green-700
            transition-colors hover:bg-green-100
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            min-h-[44px]
          "
          data-testid="view-full-button"
        >
          View Full Agreement
        </button>
      )}
    </article>
  )
}
