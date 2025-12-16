'use client'

import { useMemo } from 'react'
import type { SessionVersion, VersionType } from '@fledgely/contracts'
import { VERSION_TYPE_LABELS, VERSION_TYPE_DESCRIPTIONS } from '@fledgely/contracts'

/**
 * Props for the VersionHistoryPanel component
 */
export interface VersionHistoryPanelProps {
  /** List of session versions to display */
  versions: SessionVersion[]
  /** Currently selected version ID */
  selectedVersionId?: string
  /** Callback when a version is selected for preview */
  onPreview: (version: SessionVersion) => void
  /** Callback when a version is selected for restore */
  onRestore: (version: SessionVersion) => void
  /** Whether the panel is loading */
  isLoading?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attribute for testing */
  'data-testid'?: string
}

/**
 * Get icon for version type
 */
function getVersionTypeIcon(type: VersionType): React.ReactNode {
  switch (type) {
    case 'initial_draft':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>
      )
    case 'child_contribution':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      )
    case 'negotiation_resolved':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
        </svg>
      )
    case 'manual_save':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      )
    case 'restored_from_version':
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
        </svg>
      )
  }
}

/**
 * Get color classes for version type
 */
function getVersionTypeColor(type: VersionType): string {
  switch (type) {
    case 'initial_draft':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    case 'child_contribution':
      return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
    case 'negotiation_resolved':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'manual_save':
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    case 'restored_from_version':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }
}

/**
 * Format timestamp for display
 */
function formatVersionTime(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get version summary (term count and contribution count)
 */
function getVersionSummary(version: SessionVersion): string {
  const termCount = version.snapshot.terms.length
  const contributionCount = version.snapshot.contributions.length

  const termText = termCount === 1 ? '1 term' : `${termCount} terms`
  const contributionText = contributionCount === 1 ? '1 change' : `${contributionCount} changes`

  return `${termText}, ${contributionText}`
}

/**
 * Loading skeleton for version history items
 */
function VersionHistoryItemSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 animate-pulse" aria-hidden="true">
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    </div>
  )
}

/**
 * Individual version history item
 */
interface VersionHistoryItemProps {
  version: SessionVersion
  isSelected: boolean
  isLatest: boolean
  onPreview: () => void
  onRestore: () => void
}

function VersionHistoryItem({
  version,
  isSelected,
  isLatest,
  onPreview,
  onRestore,
}: VersionHistoryItemProps) {
  const typeLabel = VERSION_TYPE_LABELS[version.versionType]
  const typeDescription = VERSION_TYPE_DESCRIPTIONS[version.versionType]
  const summary = getVersionSummary(version)
  const timeAgo = formatVersionTime(version.createdAt)
  const contributor = version.createdBy === 'parent' ? 'Parent' : 'Child'

  return (
    <div
      role="listitem"
      className={`
        relative flex items-start gap-3 p-3 border-b border-gray-200 dark:border-gray-700
        transition-colors duration-150
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
      `}
      data-testid={`version-item-${version.id}`}
    >
      {/* Timeline connector */}
      <div className="absolute left-7 top-14 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />

      {/* Version type icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10
          ${getVersionTypeColor(version.versionType)}
        `}
        aria-hidden="true"
      >
        {getVersionTypeIcon(version.versionType)}
      </div>

      {/* Version content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {version.label || typeLabel}
          </span>
          {isLatest && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
              Current
            </span>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{typeDescription}</p>

        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
          <span>{summary}</span>
          <span aria-hidden="true">·</span>
          <span>{contributor}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={version.createdAt}>{timeAgo}</time>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={onPreview}
            className="
              px-2 py-1 text-xs font-medium rounded
              text-blue-600 dark:text-blue-400
              hover:bg-blue-50 dark:hover:bg-blue-900/20
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
              min-w-[44px] min-h-[28px]
            "
            aria-label={`Preview version: ${typeLabel}`}
            data-testid={`preview-version-${version.id}`}
          >
            Preview
          </button>

          {!isLatest && (
            <button
              type="button"
              onClick={onRestore}
              className="
                px-2 py-1 text-xs font-medium rounded
                text-purple-600 dark:text-purple-400
                hover:bg-purple-50 dark:hover:bg-purple-900/20
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
                min-w-[44px] min-h-[28px]
              "
              aria-label={`Restore to version: ${typeLabel}`}
              data-testid={`restore-version-${version.id}`}
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * VersionHistoryPanel Component
 *
 * Story 5.7: Draft Saving & Version History - Task 4
 *
 * Displays a timeline of version history milestones:
 * - Initial draft creation
 * - Child contributions
 * - Negotiation resolutions
 * - Manual saves
 * - Restored versions
 *
 * @example
 * ```tsx
 * <VersionHistoryPanel
 *   versions={sessionVersions}
 *   selectedVersionId={currentVersion.id}
 *   onPreview={handlePreview}
 *   onRestore={handleRestore}
 * />
 * ```
 */
export function VersionHistoryPanel({
  versions,
  selectedVersionId,
  onPreview,
  onRestore,
  isLoading = false,
  className = '',
  'data-testid': dataTestId = 'version-history-panel',
}: VersionHistoryPanelProps) {
  // Sort versions by creation date (newest first)
  const sortedVersions = useMemo(() => {
    return [...versions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [versions])

  return (
    <aside
      className={`
        w-80 border-l border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-900 overflow-hidden flex flex-col
        ${className}
      `}
      aria-label="Version history"
      data-testid={dataTestId}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Version History
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          See all the changes you have made
        </p>
      </div>

      {/* Version list */}
      <div
        role="list"
        aria-label="Saved versions"
        className="flex-1 overflow-y-auto"
        data-testid={`${dataTestId}-list`}
      >
        {isLoading ? (
          // Loading skeletons
          <>
            <VersionHistoryItemSkeleton />
            <VersionHistoryItemSkeleton />
            <VersionHistoryItemSkeleton />
          </>
        ) : sortedVersions.length === 0 ? (
          // Empty state
          <div className="p-4 text-center" data-testid={`${dataTestId}-empty`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-400 dark:text-gray-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No versions saved yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Your changes will be saved automatically
            </p>
          </div>
        ) : (
          // Version list
          sortedVersions.map((version, index) => (
            <VersionHistoryItem
              key={version.id}
              version={version}
              isSelected={selectedVersionId === version.id}
              isLatest={index === 0}
              onPreview={() => onPreview(version)}
              onRestore={() => onRestore(version)}
            />
          ))
        )}
      </div>

      {/* Footer with keyboard hint */}
      {sortedVersions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center" aria-hidden="true">
            Use Tab and Enter to navigate
          </p>
        </div>
      )}
    </aside>
  )
}

export default VersionHistoryPanel
