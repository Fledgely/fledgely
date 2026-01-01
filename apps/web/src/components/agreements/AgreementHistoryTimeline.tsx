/**
 * AgreementHistoryTimeline Component - Story 34.6
 *
 * Displays a timeline of agreement versions with dates.
 * AC1: Timeline shows all versions with dates
 * AC2: Each change shows who proposed, who accepted, what changed
 * AC4: "We've updated the agreement X times" summary
 */

import { HISTORY_MESSAGES, getUpdateCountMessage, type AgreementVersion } from '@fledgely/shared'

export interface AgreementHistoryTimelineProps {
  /** List of agreement versions to display */
  versions: AgreementVersion[]
  /** Currently selected version ID */
  selectedVersionId?: string
  /** Callback when a version is selected */
  onVersionSelect?: (version: AgreementVersion) => void
}

/**
 * Format a date for display in the timeline.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Timeline component showing all agreement versions with dates.
 */
export function AgreementHistoryTimeline({
  versions,
  selectedVersionId,
  onVersionSelect,
}: AgreementHistoryTimelineProps) {
  // Calculate update count (excluding initial version)
  const updateCount = Math.max(0, versions.length - 1)
  const updateMessage = getUpdateCountMessage(updateCount)

  if (versions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {HISTORY_MESSAGES.timeline.header}
        </h2>
        <p className="text-gray-500 text-center py-8">{HISTORY_MESSAGES.timeline.emptyState}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{HISTORY_MESSAGES.timeline.header}</h2>
        <p className="text-gray-600 text-sm mt-1">{HISTORY_MESSAGES.timeline.subheader}</p>
        <p className="text-blue-600 font-medium mt-2">{updateMessage}</p>
      </div>

      {/* Timeline */}
      <ul className="space-y-4" role="list">
        {versions.map((version) => {
          const isSelected = version.id === selectedVersionId
          const isInitial = version.versionNumber === 1

          return (
            <li
              key={version.id}
              className={`
                relative pl-6 border-l-2 transition-colors
                ${isSelected ? 'border-blue-500' : 'border-gray-200'}
              `}
              role="listitem"
            >
              {/* Timeline dot */}
              <div
                className={`
                  absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2
                  ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}
                `}
              />

              {/* Version card */}
              <button
                type="button"
                onClick={() => onVersionSelect?.(version)}
                className={`
                  w-full text-left p-4 rounded-lg border transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                `}
              >
                {/* Version header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    Version {version.versionNumber}
                    {isInitial && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        Initial
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-gray-500">{formatDate(version.createdAt)}</span>
                </div>

                {/* Proposer and accepter info (AC2) */}
                <div className="text-sm text-gray-600 mb-2">
                  <span>
                    {HISTORY_MESSAGES.version.proposedBy}{' '}
                    <span className="font-medium">{version.proposerName}</span>
                  </span>
                  <span className="mx-2">•</span>
                  <span>
                    {HISTORY_MESSAGES.version.acceptedBy}{' '}
                    <span className="font-medium">{version.accepterName}</span>
                  </span>
                </div>

                {/* Changes summary (AC2) */}
                {version.changes.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {HISTORY_MESSAGES.version.changesLabel}
                    </p>
                    <ul className="space-y-1">
                      {version.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="text-sm text-gray-700">
                          <span className="font-medium">{change.fieldLabel}</span>
                          {change.previousValue && change.newValue && (
                            <span className="text-gray-500">
                              : {change.previousValue} → {change.newValue}
                            </span>
                          )}
                          {!change.previousValue && change.newValue && (
                            <span className="text-green-600">: {change.newValue} (new)</span>
                          )}
                          {change.previousValue && !change.newValue && (
                            <span className="text-red-600"> (removed)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Version note */}
                {version.note && (
                  <p className="mt-2 text-sm text-gray-500 italic">&quot;{version.note}&quot;</p>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
