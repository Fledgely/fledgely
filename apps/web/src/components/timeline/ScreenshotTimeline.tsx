'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/**
 * Screenshot entry in the timeline
 */
export interface ScreenshotEntry {
  id: string
  timestamp: Date
  type: 'screenshot'
  thumbnailUrl: string
  fullUrl: string
}

/**
 * Gap entry in the timeline
 *
 * CRITICAL (Story 7.8 - AC #6):
 * This type intentionally has NO 'reason' field.
 * Gap reasons (privacy gap vs crisis URL) must NEVER be exposed to parents.
 * From the parent's perspective, all gaps appear identical and unexplained.
 */
export interface GapEntry {
  id: string
  timestamp: Date
  type: 'gap'
  durationMs: number
  // NO reason field - zero-data-path compliance
}

/**
 * Union type for timeline entries
 */
export type TimelineEntry = ScreenshotEntry | GapEntry

/**
 * Props for ScreenshotTimeline component
 */
interface ScreenshotTimelineProps {
  /**
   * Timeline entries (screenshots and gaps)
   */
  entries: TimelineEntry[]
  /**
   * Whether timeline is loading
   */
  loading?: boolean
  /**
   * Callback when screenshot is clicked
   */
  onScreenshotClick?: (screenshot: ScreenshotEntry) => void
  /**
   * Optional CSS class name
   */
  className?: string
}

/**
 * Screenshot Timeline Component
 *
 * Story 7.8: Privacy Gaps Injection - Task 7
 *
 * Displays a timeline of screenshots and monitoring gaps.
 *
 * Critical Security Requirements (AC #3, AC #6):
 * - Gap entries show as "Monitoring paused" with NO special indicator
 * - Gap appearance is IDENTICAL whether from privacy gap or crisis visit
 * - There is NO way for parents to query the gap reason
 * - Zero-data-path compliance: gap reasons are never exposed
 *
 * Accessibility:
 * - Keyboard navigable
 * - ARIA attributes for screen readers
 * - High contrast for visibility
 *
 * @example
 * ```tsx
 * <ScreenshotTimeline
 *   entries={[
 *     { id: '1', timestamp: new Date(), type: 'screenshot', thumbnailUrl: '...', fullUrl: '...' },
 *     { id: '2', timestamp: new Date(), type: 'gap', durationMs: 600000 },
 *   ]}
 *   onScreenshotClick={(s) => setSelectedScreenshot(s)}
 * />
 * ```
 */
export function ScreenshotTimeline({
  entries,
  loading = false,
  onScreenshotClick,
  className,
}: ScreenshotTimelineProps) {
  /**
   * Sort entries by timestamp (newest first) and group by date
   */
  const groupedEntries = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )

    const groups: Map<string, TimelineEntry[]> = new Map()

    for (const entry of sorted) {
      const dateKey = entry.timestamp.toISOString().slice(0, 10) // YYYY-MM-DD
      const existing = groups.get(dateKey) || []
      groups.set(dateKey, [...existing, entry])
    }

    return groups
  }, [entries])

  if (loading) {
    return (
      <div
        data-testid="screenshot-timeline"
        className={cn('space-y-4', className)}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        {/* Skeleton entries */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            data-testid={`skeleton-${i}`}
            className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-24 w-full"
          />
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div
        data-testid="screenshot-timeline"
        className={cn(
          'flex flex-col items-center justify-center py-12 text-center',
          className
        )}
      >
        <svg
          className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400">
          No activity recorded yet
        </p>
      </div>
    )
  }

  return (
    <div
      data-testid="screenshot-timeline"
      className={cn('space-y-6', className)}
      role="list"
      aria-label="Activity timeline"
    >
      {Array.from(groupedEntries.entries()).map(([dateKey, dateEntries]) => (
        <div key={dateKey}>
          {/* Date header */}
          <h3
            data-testid={`date-header-${dateKey}`}
            className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 sticky top-0 bg-white dark:bg-gray-900 py-2"
          >
            {formatDateHeader(dateKey)}
          </h3>

          {/* Entries for this date */}
          <div className="space-y-3">
            {dateEntries.map((entry) =>
              entry.type === 'screenshot' ? (
                <ScreenshotItem
                  key={entry.id}
                  entry={entry}
                  onClick={onScreenshotClick}
                />
              ) : (
                <GapItem key={entry.id} entry={entry} />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Screenshot item in the timeline
 */
interface ScreenshotItemProps {
  entry: ScreenshotEntry
  onClick?: (entry: ScreenshotEntry) => void
}

function ScreenshotItem({ entry, onClick }: ScreenshotItemProps) {
  const handleClick = () => {
    onClick?.(entry)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(entry)
    }
  }

  return (
    <div
      data-testid={`timeline-entry-screenshot-${entry.id}`}
      role="listitem"
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800',
        onClick && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
      )}
    >
      {/* Thumbnail */}
      <div className="w-20 h-14 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        <img
          src={entry.thumbnailUrl}
          alt={`Screenshot at ${formatTime(entry.timestamp)}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Screenshot
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(entry.timestamp)}
        </p>
      </div>

      {/* View indicator */}
      {onClick && (
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      )}
    </div>
  )
}

/**
 * Gap item in the timeline
 *
 * CRITICAL (Story 7.8 - AC #3, AC #6):
 * - Displays as generic "Monitoring paused" with NO special marker
 * - NO indication of whether this was a privacy gap or crisis visit
 * - NO data attributes revealing gap type
 * - NO click action to show reason
 *
 * This ensures gap reasons are NEVER exposed to parents (zero-data-path).
 */
interface GapItemProps {
  entry: GapEntry
}

function GapItem({ entry }: GapItemProps) {
  const durationMinutes = Math.round(entry.durationMs / 60000)

  return (
    <div
      data-testid={`timeline-entry-gap-${entry.id}`}
      role="listitem"
      aria-label={`Monitoring paused for ${durationMinutes} minutes`}
      className="timeline-gap flex items-center gap-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
      // CRITICAL: NO data attributes revealing gap type/reason
    >
      {/* Gap icon - generic pause icon, NOT crisis/warning related */}
      <div className="w-20 h-14 rounded bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Details - generic text, NO reason */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Monitoring paused
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {durationMinutes} minutes · {formatTime(entry.timestamp)}
        </p>
      </div>

      {/* NO action button - cannot query reason */}
    </div>
  )
}

/**
 * Format date for header display
 */
function formatDateHeader(dateKey: string): string {
  const date = new Date(dateKey + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (dateKey === today.toISOString().slice(0, 10)) {
    return 'Today'
  } else if (dateKey === yesterday.toISOString().slice(0, 10)) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default ScreenshotTimeline
