'use client'

/**
 * ChildScreenTimeCard Component - Story 29.5
 *
 * Child-friendly screen time display for the child dashboard.
 * Uses encouraging language and visual progress indicators.
 *
 * Acceptance Criteria:
 * - AC1: Today's total time shown (same data parent sees)
 * - AC2: Friendly visualization (bar chart, category breakdown)
 * - AC3: Child-appropriate language: "You've used 2 hours today"
 * - AC4: Comparison to limits: "1 hour left for gaming"
 * - AC5: Historical view: "This week vs last week"
 * - AC6: Encourages self-awareness without shame
 */

import { useMemo, useState } from 'react'
import type { CategoryTimeEntry, ScreenTimeCategory } from '@fledgely/shared'
import {
  useChildScreenTime,
  formatDuration,
  getCategoryColor,
  getCategoryLabel,
  type DailyScreenTime,
} from '../../hooks/useChildScreenTime'

interface ChildScreenTimeCardProps {
  familyId: string | null
  childId: string | null
  /** Optional category limits in minutes (e.g., { gaming: 60, social_media: 30 }) */
  categoryLimits?: Partial<Record<ScreenTimeCategory, number>>
  /** Optional daily total limit in minutes */
  dailyLimit?: number
  onHelpClick?: () => void
}

/**
 * Styles using sky blue theme for child dashboard
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.1)',
    border: '1px solid #e0f2fe', // sky-100
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    fontSize: '1.5rem',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: 0,
  },
  helpLink: {
    fontSize: '0.75rem',
    color: '#0369a1', // sky-700
    textDecoration: 'underline',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    outline: 'none',
  },
  helpLinkFocus: {
    outline: '2px solid #0ea5e9', // sky-500
    outlineOffset: '2px',
  },
  todaySection: {
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '12px',
    marginBottom: '20px',
  },
  todayValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#0ea5e9', // sky-500
    margin: 0,
    lineHeight: 1.2,
  },
  todayLabel: {
    fontSize: '0.875rem',
    color: '#0369a1', // sky-700
    margin: '8px 0 0 0',
  },
  limitBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '16px',
    marginTop: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  limitBadgeUnder: {
    backgroundColor: '#d1fae5', // green-100
    color: '#065f46', // green-800 - WCAG AA 7.2:1
    border: '1px solid #86efac', // green-300
  },
  limitBadgeNear: {
    backgroundColor: '#fef3c7', // amber-100
    color: '#78350f', // amber-900 - WCAG AA 8.6:1 (was amber-800)
    border: '1px solid #fcd34d', // amber-300
  },
  limitBadgeOver: {
    backgroundColor: '#fee2e2', // red-100
    color: '#7f1d1d', // red-900 - WCAG AA 9.4:1 (was red-800)
    border: '1px solid #fca5a5', // red-300
  },
  section: {
    marginBottom: '20px',
  },
  sectionLast: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 12px 0',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  categoryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
    flexShrink: 0,
  },
  categoryLabel: {
    width: '100px',
    fontSize: '0.8125rem',
    color: '#374151', // gray-700
    flexShrink: 0,
  },
  categoryBar: {
    flex: 1,
    height: '10px',
    backgroundColor: '#e5e7eb', // gray-200
    borderRadius: '5px',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  categoryFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  categoryTime: {
    width: '70px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#0369a1', // sky-700
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  categoryRemaining: {
    fontSize: '0.6875rem',
    color: '#047857', // green-700 - WCAG AA 4.5:1 (was green-600)
    marginLeft: '4px',
  },
  weeklySection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  dayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dayLabel: {
    width: '36px',
    fontSize: '0.75rem',
    color: '#6b7280', // gray-500
  },
  dayBar: {
    flex: 1,
    height: '16px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '4px',
    overflow: 'hidden',
    display: 'flex',
  },
  dayTime: {
    width: '50px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b7280', // gray-500
    textAlign: 'right' as const,
  },
  weekComparison: {
    marginTop: '12px',
    padding: '10px 14px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '8px',
    fontSize: '0.8125rem',
    color: '#0c4a6e', // sky-900 - WCAG AA 7.5:1 (was sky-700)
    textAlign: 'center' as const,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
  },
  spinner: {
    width: '24px',
    height: '24px',
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
    padding: '24px 16px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '2rem',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: '0 0 4px 0',
  },
  emptyMessage: {
    fontSize: '0.75rem',
    color: '#0c4a6e', // sky-900 - WCAG AA 7.5:1 (was sky-700)
    margin: 0,
  },
}

/**
 * Get encouragement message based on screen time usage
 */
function getEncouragementMessage(
  todayMinutes: number,
  dailyLimit?: number,
  _weeklyAverage?: number
): string {
  if (dailyLimit) {
    const percentage = (todayMinutes / dailyLimit) * 100
    if (percentage < 50) {
      return "You're doing great! Plenty of time left today."
    } else if (percentage < 80) {
      return 'Nice balance! Keep it up.'
    } else if (percentage < 100) {
      return 'Almost at your daily goal. Time to take a break soon?'
    } else {
      return "You've reached your screen time for today."
    }
  }

  // No limit set - give general encouragement
  if (todayMinutes < 60) {
    return 'Just getting started today!'
  } else if (todayMinutes < 120) {
    return 'Nice work staying balanced!'
  } else if (todayMinutes < 180) {
    return 'Remember to take breaks!'
  } else {
    return 'Consider doing something offline for a bit!'
  }
}

/**
 * Get short day name from date string
 */
function getDayName(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } catch {
    return dateStr.slice(-2)
  }
}

/**
 * Category order for consistent display
 */
const CATEGORY_ORDER: ScreenTimeCategory[] = [
  'education',
  'productivity',
  'entertainment',
  'social_media',
  'gaming',
  'communication',
  'news',
  'shopping',
  'other',
]

/**
 * Category row with remaining time if limit is set
 */
function CategoryRow({
  entry,
  totalMinutes,
  limit,
}: {
  entry: CategoryTimeEntry
  totalMinutes: number
  limit?: number
}) {
  const percentage = totalMinutes > 0 ? (entry.minutes / totalMinutes) * 100 : 0
  const remaining = limit ? Math.max(0, limit - entry.minutes) : undefined
  const isOverLimit = limit !== undefined && entry.minutes > limit

  return (
    <div style={styles.categoryRow} data-testid={`category-row-${entry.category}`}>
      <div
        style={{
          ...styles.categoryDot,
          backgroundColor: getCategoryColor(entry.category),
        }}
        aria-hidden="true"
      />
      <span style={styles.categoryLabel}>{getCategoryLabel(entry.category)}</span>
      <div
        style={styles.categoryBar}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${getCategoryLabel(entry.category)}: ${formatDuration(entry.minutes)}`}
      >
        <div
          style={{
            ...styles.categoryFill,
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: getCategoryColor(entry.category),
          }}
        />
      </div>
      <div style={styles.categoryTime}>
        {formatDuration(entry.minutes)}
        {remaining !== undefined && !isOverLimit && (
          <span style={styles.categoryRemaining}>({formatDuration(remaining)} left)</span>
        )}
      </div>
    </div>
  )
}

/**
 * Weekly chart with stacked categories and accessibility support
 */
function WeeklyChart({
  weeklyData,
  maxMinutes,
}: {
  weeklyData: DailyScreenTime[]
  maxMinutes: number
}) {
  return (
    <div
      style={styles.weeklySection}
      data-testid="weekly-chart"
      role="table"
      aria-label="Weekly screen time breakdown by day"
    >
      {weeklyData.map((day) => {
        const barWidth = maxMinutes > 0 ? Math.min((day.totalMinutes / maxMinutes) * 100, 100) : 0
        const dayLabel = getDayName(day.date)

        // Build accessible description of category breakdown
        const categoryBreakdown = CATEGORY_ORDER.map((category) => {
          const catEntry = day.categories.find((c) => c.category === category)
          return catEntry && catEntry.minutes > 0
            ? `${getCategoryLabel(category)}: ${formatDuration(catEntry.minutes)}`
            : null
        })
          .filter(Boolean)
          .join(', ')

        const ariaLabel = `${dayLabel}: ${formatDuration(day.totalMinutes)} total${
          categoryBreakdown ? `. ${categoryBreakdown}` : ''
        }`

        return (
          <div key={day.date} style={styles.dayRow} data-testid={`day-row-${day.date}`} role="row">
            <span style={styles.dayLabel} role="rowheader">
              {dayLabel}
            </span>
            <div style={styles.dayBar} role="cell" aria-label={ariaLabel}>
              <div
                style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  display: 'flex',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  transition: 'width 0.4s ease-out',
                }}
              >
                {CATEGORY_ORDER.map((category) => {
                  const catEntry = day.categories.find((c) => c.category === category)
                  if (!catEntry || catEntry.minutes === 0) return null
                  const segmentWidth =
                    day.totalMinutes > 0 ? (catEntry.minutes / day.totalMinutes) * 100 : 0
                  return (
                    <div
                      key={category}
                      style={{
                        width: `${segmentWidth}%`,
                        height: '100%',
                        backgroundColor: getCategoryColor(category),
                        minWidth: catEntry.minutes > 0 ? '2px' : 0,
                      }}
                      title={`${getCategoryLabel(category)}: ${formatDuration(catEntry.minutes)}`}
                      aria-hidden="true"
                    />
                  )
                })}
              </div>
            </div>
            <span style={styles.dayTime} role="cell">
              {formatDuration(day.totalMinutes)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Week comparison message - uses concrete time durations (child-friendly)
 */
function WeekComparison({
  thisWeekAvg,
  lastWeekAvg,
}: {
  thisWeekAvg: number
  lastWeekAvg: number
}) {
  if (lastWeekAvg === 0) {
    return (
      <div style={styles.weekComparison} data-testid="week-comparison">
        This is your first week being tracked!
      </div>
    )
  }

  const diff = thisWeekAvg - lastWeekAvg
  const minutesDiff = Math.abs(Math.round(diff))

  let message: string
  if (Math.abs(diff) < 10) {
    message = 'About the same as last week - nice consistency!'
  } else if (diff < 0) {
    // Child-friendly: concrete time durations instead of percentages
    message = `You used ${formatDuration(minutesDiff)} less screen time than last week!`
  } else {
    message = `You used ${formatDuration(minutesDiff)} more screen time than last week.`
  }

  return (
    <div style={styles.weekComparison} data-testid="week-comparison">
      {message}
    </div>
  )
}

/**
 * ChildScreenTimeCard - Child-friendly screen time display
 */
export function ChildScreenTimeCard({
  familyId,
  childId,
  categoryLimits,
  dailyLimit,
  onHelpClick,
}: ChildScreenTimeCardProps) {
  const [helpLinkFocused, setHelpLinkFocused] = useState(false)

  const { data, loading, error } = useChildScreenTime({
    familyId,
    childId,
    enabled: !!familyId && !!childId,
  })

  // Calculate last week's average (we'd need historical data for this)
  // For now, we use the weekly average as a proxy
  const lastWeekAvg = useMemo(() => {
    if (!data || data.weeklyData.length < 7) return 0
    // Use the first half of data as "last week" approximation
    const olderDays = data.weeklyData.slice(0, Math.floor(data.weeklyData.length / 2))
    if (olderDays.length === 0) return 0
    return Math.round(olderDays.reduce((sum, d) => sum + d.totalMinutes, 0) / olderDays.length)
  }, [data])

  // Sort categories by minutes descending
  const sortedCategories = useMemo(() => {
    if (!data || !data.todayCategories) return []
    return [...data.todayCategories].sort((a, b) => b.minutes - a.minutes)
  }, [data])

  // Calculate max minutes for chart scaling
  const maxMinutes = useMemo(() => {
    if (!data || !data.weeklyData) return 60
    return Math.max(...data.weeklyData.map((d) => d.totalMinutes), 60)
  }, [data])

  return (
    <div style={styles.container} data-testid="child-screen-time-card">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <span style={styles.icon} aria-hidden="true">
            &#x23F1;
          </span>
          <h3 style={styles.title}>Your Screen Time</h3>
        </div>
        <button
          style={{
            ...styles.helpLink,
            ...(helpLinkFocused ? styles.helpLinkFocus : {}),
          }}
          onClick={onHelpClick}
          onFocus={() => setHelpLinkFocused(true)}
          onBlur={() => setHelpLinkFocused(false)}
          data-testid="help-link"
          aria-label="Learn about your screen time"
        >
          What is this?
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={styles.loadingContainer} data-testid="loading-state">
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Getting your screen time...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={styles.emptyState} data-testid="error-state">
          <div style={styles.emptyIcon}>&#x26A0;</div>
          <h4 style={styles.emptyTitle}>Oops!</h4>
          <p style={styles.emptyMessage}>We couldn&apos;t load your screen time right now.</p>
        </div>
      )}

      {/* Empty state */}
      {!loading &&
        !error &&
        (!data || (data.todayMinutes === 0 && data.weeklyData.length === 0)) && (
          <div style={styles.emptyState} data-testid="empty-state">
            <div style={styles.emptyIcon}>&#x1F4F1;</div>
            <h4 style={styles.emptyTitle}>No screen time yet!</h4>
            <p style={styles.emptyMessage}>
              When you use your devices, your screen time will show up here.
            </p>
          </div>
        )}

      {/* Content when data exists */}
      {!loading && !error && data && (data.todayMinutes > 0 || data.weeklyData.length > 0) && (
        <>
          {/* Today's total */}
          <div style={styles.todaySection} data-testid="today-section">
            <p style={styles.todayValue}>{formatDuration(data.todayMinutes)}</p>
            <p style={styles.todayLabel}>You&apos;ve used today</p>

            {/* Limit badge */}
            {dailyLimit && (
              <div
                style={{
                  ...styles.limitBadge,
                  ...(data.todayMinutes > dailyLimit
                    ? styles.limitBadgeOver
                    : data.todayMinutes > dailyLimit * 0.9
                      ? styles.limitBadgeNear
                      : styles.limitBadgeUnder),
                }}
                data-testid="limit-badge"
              >
                {data.todayMinutes > dailyLimit
                  ? `${formatDuration(data.todayMinutes - dailyLimit)} over your daily goal`
                  : `${formatDuration(dailyLimit - data.todayMinutes)} left today`}
              </div>
            )}

            {/* Encouragement message */}
            <p
              style={{
                ...styles.todayLabel,
                marginTop: '12px',
                fontStyle: 'italic',
              }}
              data-testid="encouragement-message"
            >
              {getEncouragementMessage(data.todayMinutes, dailyLimit, data.weeklyAverage)}
            </p>
          </div>

          {/* Category breakdown */}
          {sortedCategories.length > 0 && (
            <div style={styles.section} data-testid="category-section">
              <h4 style={styles.sectionTitle}>What You&apos;ve Been Doing</h4>
              <div style={styles.categoryList}>
                {sortedCategories.slice(0, 5).map((entry) => (
                  <CategoryRow
                    key={entry.category}
                    entry={entry}
                    totalMinutes={data.todayMinutes}
                    limit={categoryLimits?.[entry.category]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Weekly chart */}
          {data.weeklyData.length > 0 && (
            <div style={{ ...styles.section, ...styles.sectionLast }} data-testid="weekly-section">
              <h4 style={styles.sectionTitle}>This Week</h4>
              <WeeklyChart weeklyData={data.weeklyData} maxMinutes={maxMinutes} />
              <WeekComparison thisWeekAvg={data.weeklyAverage} lastWeekAvg={lastWeekAvg} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
