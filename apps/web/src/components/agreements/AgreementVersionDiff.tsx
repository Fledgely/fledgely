/**
 * AgreementVersionDiff Component - Story 34.6
 *
 * Displays a diff view comparing two agreement versions.
 * AC3: Diff view available for any two versions
 */

import { HISTORY_MESSAGES, type AgreementVersion } from '@fledgely/shared'
import { computeVersionDiff, formatDiffForDisplay, hasChanges } from '../../utils/agreementDiff'

export interface AgreementVersionDiffProps {
  /** The older version to compare from */
  fromVersion: AgreementVersion | null
  /** The newer version to compare to */
  toVersion: AgreementVersion | null
  /** Optional callback to swap versions */
  onSwap?: () => void
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
 * Component for comparing two agreement versions side-by-side.
 */
export function AgreementVersionDiff({
  fromVersion,
  toVersion,
  onSwap,
}: AgreementVersionDiffProps) {
  // Handle missing versions
  if (!fromVersion || !toVersion) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{HISTORY_MESSAGES.diff.header}</h2>
        <p className="text-gray-500 text-center py-8">{HISTORY_MESSAGES.diff.selectVersions}</p>
      </div>
    )
  }

  // Compute the diff
  const diff = computeVersionDiff(fromVersion, toVersion)
  const hasNoChanges = !hasChanges(diff)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{HISTORY_MESSAGES.diff.header}</h2>
        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            aria-label="Swap versions"
          >
            <span>↔</span> Swap
          </button>
        )}
      </div>

      {/* Version comparison header */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-center flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {HISTORY_MESSAGES.diff.previous}
          </p>
          <p className="font-medium text-gray-900">Version {fromVersion.versionNumber}</p>
          <p className="text-sm text-gray-500">{formatDate(fromVersion.createdAt)}</p>
        </div>
        <div className="px-4">
          <span className="text-gray-400 text-2xl">→</span>
        </div>
        <div className="text-center flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {HISTORY_MESSAGES.diff.current}
          </p>
          <p className="font-medium text-gray-900">Version {toVersion.versionNumber}</p>
          <p className="text-sm text-gray-500">{formatDate(toVersion.createdAt)}</p>
        </div>
      </div>

      {/* No changes message */}
      {hasNoChanges && (
        <p className="text-gray-500 text-center py-8">{HISTORY_MESSAGES.diff.noChanges}</p>
      )}

      {/* Diff entries */}
      {!hasNoChanges && (
        <ul className="space-y-2">
          {diff.entries.map((entry, index) => {
            const formatted = formatDiffForDisplay(entry)

            return (
              <li key={index} className={`p-3 rounded-lg ${formatted.colorClass}`} role="listitem">
                <div className="flex items-start gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${formatted.colorClass}`}
                  >
                    {formatted.icon}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entry.fieldLabel}</p>
                    {entry.type === 'modified' && (
                      <div className="mt-1 text-sm">
                        <span className="text-gray-500">{entry.previousValue}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-gray-900 font-medium">{entry.newValue}</span>
                      </div>
                    )}
                    {entry.type === 'added' && (
                      <p className="mt-1 text-sm text-green-700">{entry.newValue}</p>
                    )}
                    {entry.type === 'removed' && (
                      <p className="mt-1 text-sm text-red-700 line-through">
                        {entry.previousValue}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
