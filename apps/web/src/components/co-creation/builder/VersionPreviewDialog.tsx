'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { SessionVersion, SessionTerm, VersionType } from '@fledgely/contracts'
import { VERSION_TYPE_LABELS } from '@fledgely/contracts'
import { TERM_TYPE_LABELS } from './termUtils'

/**
 * Props for the VersionPreviewDialog component
 */
export interface VersionPreviewDialogProps {
  /** Version to preview */
  version: SessionVersion | null
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Callback when restore is requested */
  onRestore: (version: SessionVersion) => void
  /** Whether restore is in progress */
  isRestoring?: boolean
  /** Current terms for comparison (optional) */
  currentTerms?: SessionTerm[]
  /** Data attribute for testing */
  'data-testid'?: string
}

/**
 * Format timestamp for display
 */
function formatVersionDate(createdAt: string): string {
  const date = new Date(createdAt)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get version type icon
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
 * Get version type color classes
 */
function getVersionTypeColor(type: VersionType): string {
  switch (type) {
    case 'initial_draft':
      return 'text-blue-600 dark:text-blue-400'
    case 'child_contribution':
      return 'text-pink-600 dark:text-pink-400'
    case 'negotiation_resolved':
      return 'text-green-600 dark:text-green-400'
    case 'manual_save':
      return 'text-gray-600 dark:text-gray-400'
    case 'restored_from_version':
      return 'text-purple-600 dark:text-purple-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

/**
 * Format term content for preview
 */
function formatTermContent(term: SessionTerm): string {
  const content = term.content
  if (!content || typeof content !== 'object') return 'No details'

  const parts: string[] = []

  // Screen time
  if ('weekdayMinutes' in content) {
    parts.push(`${content.weekdayMinutes} min on weekdays`)
  }
  if ('weekendMinutes' in content) {
    parts.push(`${content.weekendMinutes} min on weekends`)
  }

  // Bedtime
  if ('time' in content) {
    parts.push(`Bedtime: ${content.time}`)
  }

  // Homework
  if ('duration' in content) {
    parts.push(`${content.duration} min`)
  }

  // Chores
  if ('tasks' in content && Array.isArray(content.tasks)) {
    parts.push(`${content.tasks.length} task(s)`)
  }

  // Allowance
  if ('amount' in content) {
    parts.push(`$${content.amount}`)
  }

  // Custom
  if ('description' in content) {
    parts.push(String(content.description).substring(0, 50))
  }

  return parts.length > 0 ? parts.join(', ') : 'Agreement term'
}

/**
 * Term preview card
 */
interface TermPreviewCardProps {
  term: SessionTerm
  isNew?: boolean
  isRemoved?: boolean
}

function TermPreviewCard({ term, isNew, isRemoved }: TermPreviewCardProps) {
  const typeLabel = TERM_TYPE_LABELS[term.type] || term.type
  const contributor = term.addedBy === 'parent' ? 'Parent' : 'Child'

  return (
    <div
      className={`
        p-3 rounded-lg border
        ${isNew ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
        ${isRemoved ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60' : ''}
        ${!isNew && !isRemoved ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{typeLabel}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {contributor}
          {isNew && <span className="ml-1 text-green-600 dark:text-green-400">(New)</span>}
          {isRemoved && <span className="ml-1 text-red-600 dark:text-red-400">(Removed)</span>}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">{formatTermContent(term)}</p>
    </div>
  )
}

/**
 * VersionPreviewDialog Component
 *
 * Story 5.7: Draft Saving & Version History - Task 5
 *
 * Modal dialog for previewing version snapshots:
 * - Read-only view of terms
 * - Version type and timestamp
 * - Restore button with confirmation
 * - Accessible keyboard navigation
 *
 * @example
 * ```tsx
 * <VersionPreviewDialog
 *   version={selectedVersion}
 *   isOpen={isPreviewOpen}
 *   onClose={() => setIsPreviewOpen(false)}
 *   onRestore={handleRestore}
 * />
 * ```
 */
export function VersionPreviewDialog({
  version,
  isOpen,
  onClose,
  onRestore,
  isRestoring = false,
  currentTerms,
  'data-testid': dataTestId = 'version-preview-dialog',
}: VersionPreviewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown)

      // Focus close button on open
      closeButtonRef.current?.focus()

      // Prevent body scroll
      document.body.style.overflow = 'hidden'

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, handleKeyDown])

  // Handle restore click
  const handleRestore = useCallback(() => {
    if (version && !isRestoring) {
      onRestore(version)
    }
  }, [version, isRestoring, onRestore])

  // Don't render if not open or no version
  if (!isOpen || !version) return null

  const typeLabel = VERSION_TYPE_LABELS[version.versionType]
  const formattedDate = formatVersionDate(version.createdAt)
  const termCount = version.snapshot.terms.length

  // Determine which terms are new/removed compared to current
  const currentTermIds = new Set(currentTerms?.map((t) => t.id) || [])
  const snapshotTermIds = new Set(version.snapshot.terms.map((t) => t.id))

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-preview-title"
      data-testid={dataTestId}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        data-testid={`${dataTestId}-backdrop`}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden"
          data-testid={`${dataTestId}-content`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className={getVersionTypeColor(version.versionType)}>
                {getVersionTypeIcon(version.versionType)}
              </span>
              <div>
                <h2
                  id="version-preview-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  {version.label || typeLabel}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="
                p-2 rounded-full
                text-gray-400 hover:text-gray-500 dark:hover:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800
                focus:outline-none focus:ring-2 focus:ring-blue-500
                min-w-[44px] min-h-[44px]
              "
              aria-label="Close preview"
              data-testid={`${dataTestId}-close`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Version info */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Created by</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {version.createdBy === 'parent' ? 'Parent' : 'Child'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Terms</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{termCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600 dark:text-gray-400">Mode</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {version.snapshot.agreementMode === 'agreement_only' ? 'Agreement Only' : 'Full Agreement'}
                </span>
              </div>
            </div>

            {/* Terms list */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agreement Terms
              </h3>

              {version.snapshot.terms.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No terms in this version
                </p>
              ) : (
                <div className="space-y-2" role="list" aria-label="Version terms">
                  {version.snapshot.terms.map((term) => {
                    const isNew = currentTerms && !currentTermIds.has(term.id)
                    const isInSnapshot = snapshotTermIds.has(term.id)
                    return (
                      <div key={term.id} role="listitem">
                        <TermPreviewCard term={term} isNew={isNew && isInSnapshot} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              className="
                px-4 py-2 rounded-lg
                text-gray-700 dark:text-gray-300
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-600
                hover:bg-gray-50 dark:hover:bg-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                min-h-[44px]
              "
              data-testid={`${dataTestId}-cancel`}
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="
                px-4 py-2 rounded-lg
                text-white
                bg-purple-600 hover:bg-purple-700
                disabled:bg-purple-400 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                min-h-[44px]
                flex items-center gap-2
              "
              aria-label={isRestoring ? 'Restoring this version...' : 'Restore this version'}
              data-testid={`${dataTestId}-restore`}
            >
              {isRestoring ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Restoring...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Restore This Version
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VersionPreviewDialog
