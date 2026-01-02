/**
 * ProportionalityCheckPrompt Component - Story 38.4 Task 9
 *
 * Dashboard banner prompting user to complete the check.
 * AC1: Annual prompt triggered after 12+ months
 * AC2: Both parties prompted
 */

'use client'

import type { ProportionalityCheck } from '@fledgely/shared'

export type ViewerType = 'child' | 'parent'

export interface ProportionalityCheckPromptProps {
  check: ProportionalityCheck
  childName: string
  viewerType: ViewerType
  onStartCheck: () => void
  onDismiss?: () => void
}

/**
 * Calculate days until expiry.
 */
function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Format monitoring duration.
 */
function formatDuration(months: number): string {
  if (months < 12) {
    return `${months} months`
  }
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}`
  }
  return `${years} year${years > 1 ? 's' : ''} and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
}

export default function ProportionalityCheckPrompt({
  check,
  childName,
  viewerType,
  onStartCheck,
  onDismiss,
}: ProportionalityCheckPromptProps): JSX.Element {
  const isChild = viewerType === 'child'
  const daysUntilExpiry = getDaysUntilExpiry(check.expiresAt)
  const isUrgent = daysUntilExpiry <= 3

  // Calculate monitoring duration
  const monitoringStartMs = check.monitoringStartDate.getTime()
  const nowMs = Date.now()
  const monthsMonitored = Math.floor((nowMs - monitoringStartMs) / (1000 * 60 * 60 * 24 * 30))

  return (
    <div
      className={`rounded-lg p-4 ${
        isUrgent ? 'bg-orange-50 border-2 border-orange-200' : 'bg-blue-50 border border-blue-200'
      }`}
      role="region"
      aria-label="Annual proportionality check"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <span className="text-3xl" role="img" aria-hidden="true">
            📊
          </span>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {isChild ? 'Time for a Check-In!' : `Annual Monitoring Check for ${childName}`}
          </h3>

          <p className="text-gray-700 mt-1">
            {isChild
              ? "It's been a year since monitoring started. We'd like to know how you feel about things."
              : `It's been ${formatDuration(monthsMonitored)} since monitoring began. Let's check if the current setup is still appropriate.`}
          </p>

          {/* Expiry countdown */}
          <div className={`mt-2 text-sm ${isUrgent ? 'text-orange-700' : 'text-gray-600'}`}>
            {isUrgent ? (
              <span className="font-medium">
                ⏰ Only {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''} left to respond
              </span>
            ) : (
              <span>Respond within {daysUntilExpiry} days</span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={onStartCheck}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isUrgent
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Start Check-In
            </button>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Remind Me Later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
