'use client'

/**
 * ChildScreenshotGallery Component - Story 19B.1
 *
 * Displays child's screenshots in a timeline-grouped gallery.
 * Uses child-friendly language at 6th-grade reading level.
 *
 * Task 3: Create ChildScreenshotGallery Component (AC: #2, #4, #5)
 * - 3.1 Create ChildScreenshotGallery.tsx in components/child/
 * - 3.2 Display thumbnails in responsive grid (3 cols desktop, 2 mobile)
 * - 3.3 Group by day with friendly headers ("Today", "Yesterday", date)
 * - 3.4 Add infinite scroll with loading indicator
 * - 3.5 Show empty state with friendly message
 * - 3.6 Use child-friendly language throughout
 */

import { useEffect, useRef, useCallback } from 'react'
import { ChildScreenshotCard } from './ChildScreenshotCard'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

/**
 * Props for ChildScreenshotGallery
 */
export interface ChildScreenshotGalleryProps {
  screenshots: ChildScreenshot[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  onLoadMore: () => void
  onSelectScreenshot: (screenshot: ChildScreenshot) => void
}

/**
 * Group screenshots by day for timeline display
 */
function groupByDay(screenshots: ChildScreenshot[]): Map<string, ChildScreenshot[]> {
  const grouped = new Map<string, ChildScreenshot[]>()

  // Sort by timestamp descending (most recent first)
  const sorted = [...screenshots].sort((a, b) => b.timestamp - a.timestamp)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const screenshot of sorted) {
    const date = new Date(screenshot.timestamp)
    const screenshotDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    let dayKey: string
    if (screenshotDay.getTime() === today.getTime()) {
      dayKey = 'Today'
    } else if (screenshotDay.getTime() === yesterday.getTime()) {
      dayKey = 'Yesterday'
    } else {
      dayKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    }

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, [])
    }
    grouped.get(dayKey)!.push(screenshot)
  }

  return grouped
}

/**
 * Styles using sky blue theme for child dashboard
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
  },
  header: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#0369a1', // sky-700
    margin: 0,
  },
  dayGroup: {
    marginBottom: '24px',
  },
  dayHeader: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0ea5e9', // sky-500
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    padding: '8px 0',
    marginBottom: '12px',
    borderBottom: '2px solid #bae6fd', // sky-200
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #bae6fd', // sky-200
    borderRadius: '50%',
    borderTopColor: '#0ea5e9', // sky-500
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '12px',
    color: '#0369a1', // sky-700
    fontSize: '0.875rem',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    backgroundColor: '#e0f2fe', // sky-100
    borderRadius: '12px',
    border: '2px dashed #7dd3fc', // sky-300
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 8px 0',
  },
  emptyMessage: {
    fontSize: '0.875rem',
    color: '#0369a1', // sky-700
    margin: 0,
    lineHeight: 1.5,
  },
  error: {
    textAlign: 'center' as const,
    padding: '24px',
    backgroundColor: '#fef2f2', // red-50
    borderRadius: '12px',
    border: '1px solid #fecaca', // red-200
  },
  errorText: {
    color: '#dc2626', // red-600
    margin: 0,
    fontSize: '0.875rem',
  },
  loadMoreTrigger: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px',
  },
  loadMoreSpinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #bae6fd',
    borderRadius: '50%',
    borderTopColor: '#0ea5e9',
    animation: 'spin 1s linear infinite',
  },
}

/**
 * ChildScreenshotGallery - Timeline-grouped screenshot gallery
 *
 * Uses child-friendly language at 6th-grade reading level.
 */
export function ChildScreenshotGallery({
  screenshots,
  loading,
  loadingMore,
  hasMore,
  error,
  onLoadMore,
  onSelectScreenshot,
}: ChildScreenshotGalleryProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
        onLoadMore()
      }
    },
    [hasMore, loadingMore, loading, onLoadMore]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    })

    observer.observe(element)

    return () => observer.disconnect()
  }, [handleObserver])

  // Group screenshots by day
  const groupedScreenshots = groupByDay(screenshots)

  return (
    <div style={styles.container} data-testid="child-screenshot-gallery">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={styles.header}>
        <h2 style={styles.title} data-testid="gallery-title">
          <span>📸</span>
          <span>Your Pictures</span>
        </h2>
        <p style={styles.subtitle}>These are pictures of what you were doing on your devices.</p>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={styles.loadingContainer} data-testid="gallery-loading">
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your pictures...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={styles.error} role="alert" data-testid="gallery-error">
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && screenshots.length === 0 && (
        <div style={styles.emptyState} data-testid="gallery-empty">
          <div style={styles.emptyIcon}>📷</div>
          <h3 style={styles.emptyTitle}>No pictures yet!</h3>
          <p style={styles.emptyMessage}>
            Once you start using your device, pictures will show up here. Check back later!
          </p>
        </div>
      )}

      {/* Screenshot timeline */}
      {!loading && !error && screenshots.length > 0 && (
        <div data-testid="gallery-timeline">
          {Array.from(groupedScreenshots.entries()).map(([dayLabel, dayScreenshots]) => (
            <div
              key={dayLabel}
              style={styles.dayGroup}
              data-testid={`day-group-${dayLabel.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div style={styles.dayHeader} data-testid="day-header">
                {dayLabel}
              </div>
              <div style={styles.grid}>
                {dayScreenshots.map((screenshot) => (
                  <ChildScreenshotCard
                    key={screenshot.id}
                    screenshot={screenshot}
                    onClick={() => onSelectScreenshot(screenshot)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && !loading && (
        <div ref={loadMoreRef} style={styles.loadMoreTrigger} data-testid="load-more-trigger">
          {loadingMore && <div style={styles.loadMoreSpinner} />}
        </div>
      )}
    </div>
  )
}
