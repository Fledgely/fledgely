/**
 * Version History Panel Component.
 *
 * Story 5.7: Draft Saving & Version History - AC3, AC4
 *
 * Displays a timeline of agreement versions with the ability
 * to preview and restore previous versions.
 */

import type { AgreementVersion, VersionType } from '@fledgely/shared/contracts'

interface VersionHistoryPanelProps {
  /** List of versions to display */
  versions: AgreementVersion[]
  /** Currently selected version ID */
  selectedVersionId: string | null
  /** Callback when version is selected */
  onSelectVersion: (versionId: string) => void
  /** Callback when restore is requested */
  onRestoreVersion: (versionId: string) => void
  /** Whether restore is in progress */
  isRestoring?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Icon and color configuration for version types.
 */
const VERSION_TYPE_CONFIG: Record<VersionType, { icon: string; color: string; label: string }> = {
  initial_draft: {
    icon: '📄',
    color: 'border-blue-400 bg-blue-50',
    label: 'Initial Draft',
  },
  child_additions: {
    icon: '👧',
    color: 'border-pink-400 bg-pink-50',
    label: 'Child Additions',
  },
  negotiation_complete: {
    icon: '🤝',
    color: 'border-green-400 bg-green-50',
    label: 'Negotiation Complete',
  },
  manual_save: {
    icon: '💾',
    color: 'border-gray-400 bg-gray-50',
    label: 'Manual Save',
  },
  auto_save: {
    icon: '↻',
    color: 'border-gray-300 bg-gray-50',
    label: 'Auto Save',
  },
}

/**
 * Format a date for display.
 */
function formatDate(date: Date): string {
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Single version item in the timeline.
 */
function VersionItem({
  version,
  isSelected,
  isLatest,
  onSelect,
  onRestore,
  isRestoring,
}: {
  version: AgreementVersion
  isSelected: boolean
  isLatest: boolean
  onSelect: () => void
  onRestore: () => void
  isRestoring: boolean
}) {
  const config = VERSION_TYPE_CONFIG[version.type]

  return (
    <div
      className={`
        relative pl-8 pb-6 border-l-2
        ${isSelected ? 'border-blue-500' : 'border-gray-200'}
      `}
      data-testid={`version-item-${version.id}`}
    >
      {/* Timeline dot */}
      <div
        className={`
          absolute left-0 -translate-x-1/2 w-8 h-8 rounded-full
          flex items-center justify-center border-2
          ${config.color}
        `}
        aria-hidden="true"
      >
        <span className="text-sm">{config.icon}</span>
      </div>

      {/* Content */}
      <div className="ml-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <span className="font-medium text-gray-900">{config.label}</span>
            {isLatest && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Current
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{formatDate(version.createdAt)}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-2">{version.description}</p>

        {/* Terms count */}
        <p className="text-xs text-gray-400 mb-2">
          {version.termsSnapshot.length} term{version.termsSnapshot.length === 1 ? '' : 's'}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelect}
            className={`
              text-sm px-3 py-1 rounded min-h-[32px]
              ${
                isSelected
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            aria-pressed={isSelected}
            data-testid={`preview-version-${version.id}`}
          >
            {isSelected ? 'Previewing' : 'Preview'}
          </button>

          {!isLatest && (
            <button
              type="button"
              onClick={onRestore}
              disabled={isRestoring}
              className="text-sm px-3 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 min-h-[32px] disabled:opacity-50"
              data-testid={`restore-version-${version.id}`}
            >
              {isRestoring ? 'Restoring...' : 'Restore'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * VersionHistoryPanel displays a timeline of agreement versions
 * with preview and restore capabilities.
 */
export function VersionHistoryPanel({
  versions,
  selectedVersionId,
  onSelectVersion,
  onRestoreVersion,
  isRestoring = false,
  className = '',
}: VersionHistoryPanelProps) {
  // Sort versions in reverse chronological order (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  if (versions.length === 0) {
    return (
      <div
        className={`p-6 text-center text-gray-500 ${className}`}
        data-testid="version-history-empty"
      >
        <p>No version history yet.</p>
        <p className="text-sm mt-1">Versions will appear as you work on your agreement.</p>
      </div>
    )
  }

  return (
    <div
      className={`p-4 ${className}`}
      role="region"
      aria-label="Version history"
      data-testid="version-history-panel"
    >
      <h3 className="font-semibold text-gray-900 mb-4">Version History</h3>

      <div className="relative">
        {sortedVersions.map((version, index) => (
          <VersionItem
            key={version.id}
            version={version}
            isSelected={selectedVersionId === version.id}
            isLatest={index === 0}
            onSelect={() => onSelectVersion(version.id)}
            onRestore={() => onRestoreVersion(version.id)}
            isRestoring={isRestoring}
          />
        ))}
      </div>
    </div>
  )
}
