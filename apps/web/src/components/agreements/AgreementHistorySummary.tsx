/**
 * AgreementHistorySummary Component - Story 34.6
 *
 * Displays a summary with growth and trust-building messaging.
 * AC4: "We've updated the agreement X times" summary
 * AC5: History demonstrates growth and trust-building
 */

import { getUpdateCountMessage, getGrowthMessage } from '@fledgely/shared'

export interface AgreementHistorySummaryProps {
  /** Total number of agreement versions */
  versionCount: number
}

/**
 * Check if version count is at a milestone (5, 10, 20+).
 */
function isMilestone(count: number): boolean {
  return count >= 5
}

/**
 * Get appropriate icon for the version count.
 */
function getIcon(count: number): string {
  if (count >= 5) {
    return '🌟'
  }
  return '🌱'
}

/**
 * Summary component showing update count and growth messaging.
 */
export function AgreementHistorySummary({ versionCount }: AgreementHistorySummaryProps) {
  // Calculate update count (excluding initial version)
  const updateCount = Math.max(0, versionCount - 1)
  const updateMessage = getUpdateCountMessage(updateCount)
  const growthMessage = getGrowthMessage(versionCount)
  const icon = getIcon(versionCount)
  const milestone = isMilestone(versionCount)

  return (
    <div
      className={`
        rounded-lg p-6
        ${
          milestone
            ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200'
            : 'bg-gradient-to-r from-green-50 to-blue-50 border border-green-200'
        }
      `}
      data-testid="agreement-history-summary"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-3xl">{icon}</div>

        {/* Content */}
        <div className="flex-1">
          {/* Update count heading (AC4) */}
          <h3 className="text-lg font-semibold text-gray-900">{updateMessage}</h3>

          {/* Growth message (AC5) */}
          <p className="mt-2 text-gray-700">{growthMessage}</p>
        </div>
      </div>
    </div>
  )
}
