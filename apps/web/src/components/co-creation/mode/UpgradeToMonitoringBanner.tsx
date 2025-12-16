'use client'

import { useState, useCallback } from 'react'
import {
  AGREEMENT_MODE_DESCRIPTIONS,
  AGREEMENT_MODE_FEATURES,
} from '@fledgely/contracts'

/**
 * Props for the UpgradeToMonitoringBanner component
 */
export interface UpgradeToMonitoringBannerProps {
  /** Current session or agreement ID */
  sessionId?: string
  /** Callback when upgrade is requested */
  onUpgrade?: () => void
  /** Callback when user dismisses the banner */
  onDismiss?: () => void
  /** Whether an upgrade is currently in progress */
  isUpgrading?: boolean
  /** Whether to show the compact version */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * UpgradeToMonitoringBanner Component
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 6
 *
 * Displays an informational banner that allows families with Agreement Only
 * agreements to upgrade to full monitoring if they choose to later.
 *
 * Features:
 * - Clear explanation of what changes with upgrade (AC #5)
 * - Preserves existing terms (information only - actual upgrade logic handled by parent)
 * - Child-friendly language (NFR65)
 * - Accessible design (NFR42, NFR43, NFR49)
 *
 * @example
 * ```tsx
 * <UpgradeToMonitoringBanner
 *   sessionId="session-123"
 *   onUpgrade={handleUpgrade}
 *   onDismiss={handleDismiss}
 * />
 * ```
 */
export function UpgradeToMonitoringBanner({
  sessionId,
  onUpgrade,
  onDismiss,
  isUpgrading = false,
  compact = false,
  className = '',
}: UpgradeToMonitoringBannerProps) {
  const [showDetails, setShowDetails] = useState(false)

  const handleToggleDetails = useCallback(() => {
    setShowDetails((prev) => !prev)
  }, [])

  const handleUpgradeClick = useCallback(() => {
    onUpgrade?.()
  }, [onUpgrade])

  const handleDismissClick = useCallback(() => {
    onDismiss?.()
  }, [onDismiss])

  // Features that will be added with upgrade
  const addedFeatures = AGREEMENT_MODE_FEATURES.full.included.filter(
    (feature) => !AGREEMENT_MODE_FEATURES.agreement_only.included.includes(feature)
  )

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg ${className}`}
        role="region"
        aria-label="Upgrade to full monitoring option"
        data-testid="upgrade-banner-compact"
      >
        {/* Icon */}
        <svg
          className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>

        <span className="text-sm text-purple-800 dark:text-purple-200 flex-1">
          Want to add device monitoring?
        </span>

        <button
          type="button"
          onClick={handleUpgradeClick}
          disabled={isUpgrading}
          className="text-sm font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Learn about upgrading to full monitoring"
        >
          {isUpgrading ? 'Upgrading...' : 'Learn More'}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-6 ${className}`}
      role="region"
      aria-labelledby="upgrade-banner-title"
      data-testid="upgrade-banner"
    >
      {/* Header with dismiss button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {/* Shield icon */}
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>

          <div>
            <h3
              id="upgrade-banner-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Ready to Add Monitoring?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can upgrade your agreement to include device monitoring anytime.
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={handleDismissClick}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Dismiss upgrade banner"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Benefits preview */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {AGREEMENT_MODE_DESCRIPTIONS.full}
        </p>

        {/* What gets added */}
        <button
          type="button"
          onClick={handleToggleDetails}
          className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
          aria-expanded={showDetails}
          aria-controls="upgrade-details"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          What gets added?
        </button>

        {showDetails && (
          <div
            id="upgrade-details"
            className="mt-3 pl-6 border-l-2 border-purple-200 dark:border-purple-700"
          >
            <ul className="space-y-2">
              {addedFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <svg
                    className="w-4 h-4 text-purple-500 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Good news:</strong> All your existing rules and agreements stay the same.
                Monitoring is just an extra tool to help everyone keep their promises.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleUpgradeClick}
          disabled={isUpgrading}
          className="flex-1 min-h-[44px] px-4 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-describedby="upgrade-description"
        >
          {isUpgrading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Upgrading...
            </span>
          ) : (
            'Upgrade to Full Agreement'
          )}
        </button>

        {onDismiss && (
          <button
            type="button"
            onClick={handleDismissClick}
            className="min-h-[44px] px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
          >
            Maybe Later
          </button>
        )}
      </div>

      <p
        id="upgrade-description"
        className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center"
      >
        You can always upgrade later from your family settings.
      </p>
    </div>
  )
}

export default UpgradeToMonitoringBanner
