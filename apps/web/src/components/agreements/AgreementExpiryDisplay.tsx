/**
 * AgreementExpiryDisplay Component - Story 35.1
 *
 * Displays agreement expiry date prominently.
 * AC3: Expiry date shown prominently in agreement view
 * AC6: Child sees when agreement expires
 */

import { EXPIRY_MESSAGES, isExpiringSoon, getDaysUntilExpiry } from '@fledgely/shared'

export interface AgreementExpiryDisplayProps {
  /** The expiry date, or null for no-expiry agreements */
  expiryDate: Date | null
  /** Display variant - default or child-friendly */
  variant?: 'default' | 'child'
  /** Compact mode for inline display */
  compact?: boolean
  /** Show annual review reminder for no-expiry agreements */
  showAnnualReview?: boolean
  /** Annual review date for no-expiry agreements */
  annualReviewDate?: Date
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Displays the agreement expiry date with appropriate styling based on status.
 */
export function AgreementExpiryDisplay({
  expiryDate,
  variant = 'default',
  compact = false,
  showAnnualReview = false,
  annualReviewDate,
}: AgreementExpiryDisplayProps) {
  const daysRemaining = getDaysUntilExpiry(expiryDate)
  const expiringSoon = isExpiringSoon(expiryDate)
  const isExpired = daysRemaining !== null && daysRemaining < 0

  // Determine styling based on status
  const getStatusStyles = () => {
    if (isExpired) {
      return 'bg-red-50 border-red-200 text-red-800'
    }
    if (expiringSoon) {
      return 'bg-amber-50 border-amber-200 text-amber-800'
    }
    return 'bg-green-50 border-green-200 text-green-800'
  }

  // Handle no expiry date
  if (!expiryDate) {
    return (
      <div
        role="status"
        className={`rounded-lg border p-${compact ? '2' : '4'} bg-gray-50 border-gray-200`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <div>
            <p className="text-gray-700 font-medium">{EXPIRY_MESSAGES.display.noExpiry}</p>
            {showAnnualReview && (
              <p className="text-sm text-gray-500 mt-1">
                {EXPIRY_MESSAGES.annualReview}
                {annualReviewDate && ` - ${formatDate(annualReviewDate)}`}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Handle expired agreement
  if (isExpired) {
    return (
      <div
        role="alert"
        className={`rounded-lg border ${compact ? 'p-2' : 'p-4'} bg-red-50 border-red-200`}
      >
        <div className="flex items-center gap-2">
          <span className={compact ? 'text-base' : 'text-lg'}>⚠️</span>
          <div className={compact ? 'text-sm' : ''}>
            <p className="text-red-800 font-medium">{EXPIRY_MESSAGES.display.expired}</p>
            {!compact && (
              <p className="text-red-600 text-sm mt-1">Expired on {formatDate(expiryDate)}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Active agreement with expiry
  const daysText = EXPIRY_MESSAGES.display.daysRemaining(daysRemaining!)

  return (
    <div
      role="status"
      className={`rounded-lg border ${compact ? 'p-2 text-sm' : 'p-4'} ${getStatusStyles()}`}
    >
      <div className="flex items-center gap-2">
        <span className={compact ? 'text-base' : 'text-lg'}>📅</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {expiringSoon && !compact && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-900">
                {EXPIRY_MESSAGES.display.expiringSoon}
              </span>
            )}
          </div>
          <p className={`font-medium ${variant === 'child' ? 'text-lg' : ''}`}>
            {EXPIRY_MESSAGES.display.expiresOn} {formatDate(expiryDate)}
          </p>
          {!compact && (
            <p className={`text-sm mt-1 ${expiringSoon ? 'text-amber-700' : 'text-green-700'}`}>
              {daysText}
            </p>
          )}
          {compact && expiringSoon && (
            <span className="text-amber-700 text-xs ml-1">
              {EXPIRY_MESSAGES.display.expiringSoon}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
