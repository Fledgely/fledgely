'use client'

/**
 * ChildScreenshotGallery Component - Story 19B.1 & 19B.2
 *
 * Displays child's screenshots in a timeline-grouped gallery.
 * Uses child-friendly language at 6th-grade reading level.
 *
 * Story 19B.1 - Original implementation
 * Story 19B.2 - Enhanced with:
 * - Time-of-day sections (AC: #1)
 * - Day headers with counts (AC: #2)
 * - Gap indicators (AC: #3)
 * - Date navigation (AC: #4)
 * - View toggle (AC: #5)
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ChildScreenshotCard } from './ChildScreenshotCard'
import { TimeOfDaySection } from './TimeOfDaySection'
import { TimelineGap } from './TimelineGap'
import { ViewToggle, type ViewMode } from './ViewToggle'
import { DatePickerModal } from './DatePickerModal'
import {
  groupByTimeOfDay,
  detectGaps,
  getDayLabel,
  isToday,
  getDateKey,
  type TimeOfDayGroup,
  type GapInfo,
} from './timelineUtils'
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
 * Screenshots grouped by day
 */
interface DayGroup {
  dateKey: string
  label: string
  isToday: boolean
  screenshots: ChildScreenshot[]
  timeOfDayGroups: TimeOfDayGroup[]
  gaps: GapInfo[]
}

/**
 * Group screenshots by day with time-of-day sub-grouping
 */
function groupByDayWithTimeSections(screenshots: ChildScreenshot[]): DayGroup[] {
  const dayMap = new Map<string, ChildScreenshot[]>()

  // Sort by timestamp descending (most recent first)
  const sorted = [...screenshots].sort((a, b) => b.timestamp - a.timestamp)

  // Group by date key
  for (const screenshot of sorted) {
    const dateKey = getDateKey(screenshot.timestamp)
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, [])
    }
    dayMap.get(dateKey)!.push(screenshot)
  }

  // Convert to DayGroup array with time-of-day sections
  const result: DayGroup[] = []

  for (const [dateKey, dayScreenshots] of dayMap.entries()) {
    const firstTimestamp = dayScreenshots[0].timestamp
    const date = new Date(firstTimestamp)

    result.push({
      dateKey,
      label: getDayLabel(date),
      isToday: isToday(date),
      screenshots: dayScreenshots,
      timeOfDayGroups: groupByTimeOfDay(dayScreenshots),
      gaps: detectGaps(dayScreenshots),
    })
  }

  return result
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
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#0369a1', // sky-700
    margin: 0,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  calendarButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#e0f2fe', // sky-100
    color: '#0369a1', // sky-700
    cursor: 'pointer',
    fontSize: '1rem',
  },
  dayGroup: {
    marginBottom: '24px',
  },
  dayHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    marginBottom: '12px',
    borderBottom: '2px solid #bae6fd', // sky-200
  },
  dayLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0ea5e9', // sky-500
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: 0,
  },
  dayLabelToday: {
    color: '#0369a1', // sky-700
    backgroundColor: '#e0f2fe', // sky-100
    padding: '4px 12px',
    borderRadius: '16px',
  },
  dayCount: {
    fontSize: '0.75rem',
    color: '#64748b', // slate-500
    backgroundColor: '#f1f5f9', // slate-100
    padding: '4px 8px',
    borderRadius: '12px',
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
  // AC5: Preserve view preference during session using sessionStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('child-gallery-view-mode')
      if (saved === 'grid' || saved === 'timeline') {
        return saved
      }
    }
    return 'grid'
  })
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

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

  // Group screenshots by day with time sections
  const dayGroups = useMemo(() => groupByDayWithTimeSections(screenshots), [screenshots])

  // Get set of dates that have screenshots for calendar highlighting
  const datesWithScreenshots = useMemo(() => {
    const dates = new Set<string>()
    for (const screenshot of screenshots) {
      dates.add(getDateKey(screenshot.timestamp))
    }
    return dates
  }, [screenshots])

  // Handle date selection from calendar
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
    // Scroll to the date if it exists
    const dateKey = getDateKey(date.getTime())
    const element = document.querySelector(`[data-date-key="${dateKey}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

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
        <div style={styles.headerRow}>
          <div style={styles.titleSection}>
            <h2 style={styles.title} data-testid="gallery-title">
              <span>📸</span>
              <span>Your Pictures</span>
            </h2>
            <p style={styles.subtitle}>
              These are pictures of what you were doing on your devices.
            </p>
          </div>
          <div style={styles.controls}>
            <button
              style={styles.calendarButton}
              onClick={() => setIsDatePickerOpen(true)}
              aria-label="Pick a date"
              data-testid="calendar-button"
            >
              📅
            </button>
            <ViewToggle
              currentView={viewMode}
              onViewChange={(mode) => {
                setViewMode(mode)
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('child-gallery-view-mode', mode)
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Date picker modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={handleDateSelect}
        datesWithScreenshots={datesWithScreenshots}
        selectedDate={selectedDate}
      />

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
          {dayGroups.map((dayGroup) => (
            <div
              key={dayGroup.dateKey}
              style={styles.dayGroup}
              data-testid={`day-group-${dayGroup.dateKey}`}
              data-date-key={dayGroup.dateKey}
            >
              {/* Day header with count */}
              <div style={styles.dayHeader} data-testid="day-header">
                <span
                  style={{
                    ...styles.dayLabel,
                    ...(dayGroup.isToday ? styles.dayLabelToday : {}),
                  }}
                  data-testid="day-label"
                >
                  {dayGroup.label}
                </span>
                <span style={styles.dayCount} data-testid="day-count">
                  {dayGroup.screenshots.length}{' '}
                  {dayGroup.screenshots.length === 1 ? 'picture' : 'pictures'}
                </span>
              </div>

              {/* Timeline view: show time-of-day sections and gaps */}
              {viewMode === 'timeline' && (
                <>
                  {dayGroup.timeOfDayGroups.map((timeGroup, index) => (
                    <div key={timeGroup.timeOfDay}>
                      <TimeOfDaySection group={timeGroup} onSelectScreenshot={onSelectScreenshot} />
                      {/* Show gap after this section if applicable */}
                      {dayGroup.gaps
                        .filter((gap) => {
                          // Show gap if it falls between current and next time section
                          const nextGroup = dayGroup.timeOfDayGroups[index + 1]
                          if (!nextGroup) return false
                          const currentEndTime = Math.min(
                            ...timeGroup.screenshots.map((s) => s.timestamp)
                          )
                          const nextStartTime = Math.max(
                            ...nextGroup.screenshots.map((s) => s.timestamp)
                          )
                          return gap.startTime >= currentEndTime && gap.endTime <= nextStartTime
                        })
                        .map((gap) => (
                          <TimelineGap key={gap.id} gap={gap} />
                        ))}
                    </div>
                  ))}
                </>
              )}

              {/* Grid view: simple grid layout */}
              {viewMode === 'grid' && (
                <div style={styles.grid}>
                  {dayGroup.screenshots.map((screenshot) => (
                    <ChildScreenshotCard
                      key={screenshot.id}
                      screenshot={screenshot}
                      onClick={() => onSelectScreenshot(screenshot)}
                    />
                  ))}
                </div>
              )}
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
