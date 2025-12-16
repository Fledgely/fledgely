'use client'

import { type AgreementStatus, getAgreementStatusLabel } from '@fledgely/contracts'

/**
 * Agreement summary data for display
 */
export interface AgreementSummary {
  /** Agreement ID */
  id: string
  /** Agreement lifecycle status */
  status: AgreementStatus
  /** Version number (e.g., "1.0") */
  version: string
  /** When agreement was activated (ISO string) */
  activatedAt?: string
  /** Number of terms/rules in the agreement */
  termsCount: number
  /** Names of parties who signed */
  signedBy: string[]
}

/**
 * Props for ActiveAgreementCard component
 */
export interface ActiveAgreementCardProps {
  /** Agreement data to display */
  agreement: AgreementSummary
  /** Callback when View Details is clicked */
  onViewDetails: (id: string) => void
  /** Callback when Request Change is clicked */
  onRequestChange: (id: string) => void
}

/**
 * Get status badge color based on agreement status
 */
function getStatusBadgeColor(status: AgreementStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'pending_signatures':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    case 'archived':
    case 'superseded':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  }
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'Not set'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Active Agreement Card Component
 *
 * Story 6.3: Agreement Activation - Task 5
 *
 * Displays an active agreement summary on the family dashboard.
 * Shows key agreement information with actions to view details
 * or request changes.
 *
 * Accessibility features:
 * - 44x44px minimum touch targets (NFR49)
 * - ARIA labels for all elements (NFR42)
 * - Color contrast 4.5:1 minimum (NFR45)
 * - Proper heading structure for screen readers
 *
 * @example
 * ```tsx
 * <ActiveAgreementCard
 *   agreement={agreementData}
 *   onViewDetails={(id) => router.push(`/agreement/${id}`)}
 *   onRequestChange={(id) => router.push(`/agreement/${id}/change`)}
 * />
 * ```
 */
export function ActiveAgreementCard({
  agreement,
  onViewDetails,
  onRequestChange,
}: ActiveAgreementCardProps) {
  const handleViewDetails = () => {
    onViewDetails(agreement.id)
  }

  const handleRequestChange = () => {
    onRequestChange(agreement.id)
  }

  const isActive = agreement.status === 'active'
  const isPending = agreement.status === 'pending_signatures'

  return (
    <div
      className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm"
      role="article"
      aria-label={`Family Agreement version ${agreement.version}`}
    >
      {/* Header with title and status badge */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Family Agreement
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Version {agreement.version}
            {agreement.activatedAt && isActive && (
              <> &bull; Active since {formatDate(agreement.activatedAt)}</>
            )}
          </p>
        </div>
        <span
          className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            ${getStatusBadgeColor(agreement.status)}
          `}
          aria-label={`Status: ${getAgreementStatusLabel(agreement.status)}`}
        >
          {getAgreementStatusLabel(agreement.status)}
        </span>
      </div>

      {/* Agreement summary */}
      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {agreement.termsCount} rules agreed upon
        </p>
        {isActive && (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Signed by all parties
          </p>
        )}
        {isPending && (
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Waiting for signatures
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleViewDetails}
          className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label={`View full agreement version ${agreement.version}`}
        >
          View Agreement
        </button>
        {isActive && (
          <button
            onClick={handleRequestChange}
            className="min-h-[44px] px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            aria-label="Request changes to this agreement"
          >
            Request Change
          </button>
        )}
      </div>
    </div>
  )
}

export default ActiveAgreementCard
