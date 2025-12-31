'use client'

/**
 * ChildActivitySummary Component - Story 19B.4
 *
 * Displays activity summary for child dashboard.
 * Uses child-friendly language at 6th-grade reading level.
 *
 * AC: #1 - Total screenshots today/week
 * AC: #2 - Most captured apps
 * AC: #3 - Time distribution
 * AC: #4 - Child-friendly language
 * AC: #5 - Real-time updates (via parent hook)
 * AC: #6 - Help link
 */

import { useMemo, useState } from 'react'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'
import {
  calculateActivitySummary,
  getPercentage,
  TIME_OF_DAY_DISPLAY,
  type TimeDistribution,
} from './activityUtils'

/**
 * Props for ChildActivitySummary
 */
export interface ChildActivitySummaryProps {
  screenshots: ChildScreenshot[]
  loading: boolean
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0ea5e9', // sky-500
    margin: 0,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#0369a1', // sky-700
    margin: '4px 0 0 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
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
  appList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  appItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '8px',
    padding: '10px 14px',
  },
  appDomain: {
    fontSize: '0.875rem',
    color: '#0c4a6e', // sky-900
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '180px',
  },
  appCount: {
    fontSize: '0.75rem',
    color: '#0ea5e9', // sky-500
    fontWeight: 600,
    backgroundColor: '#e0f2fe', // sky-100
    padding: '4px 8px',
    borderRadius: '12px',
    minWidth: '50px',
    textAlign: 'center' as const,
  },
  timeDistribution: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  timeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  timeIcon: {
    fontSize: '1.125rem',
    width: '24px',
    textAlign: 'center' as const,
  },
  timeLabel: {
    fontSize: '0.75rem',
    color: '#64748b', // slate-500
    width: '70px',
  },
  timeBarContainer: {
    flex: 1,
    height: '12px',
    backgroundColor: '#f1f5f9', // slate-100
    borderRadius: '6px',
    overflow: 'hidden',
  },
  timeBar: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  timePercent: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b', // slate-500
    width: '36px',
    textAlign: 'right' as const,
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
    color: '#0369a1', // sky-700
    margin: 0,
  },
  noAppsMessage: {
    fontSize: '0.875rem',
    color: '#64748b', // slate-500
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '12px',
  },
}

/**
 * Time distribution bar component
 */
interface TimeDistributionBarProps {
  timeOfDay: keyof TimeDistribution
  count: number
  total: number
}

function TimeDistributionBar({ timeOfDay, count, total }: TimeDistributionBarProps) {
  if (timeOfDay === 'total') return null

  const config = TIME_OF_DAY_DISPLAY[timeOfDay]
  const percentage = getPercentage(count, total)

  return (
    <div style={styles.timeRow} data-testid={`time-row-${timeOfDay}`}>
      <span style={styles.timeIcon} aria-hidden="true">
        {config.icon}
      </span>
      <span style={styles.timeLabel}>{config.label}</span>
      <div
        style={styles.timeBarContainer}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${config.label}: ${percentage}%`}
      >
        <div
          style={{
            ...styles.timeBar,
            width: `${percentage}%`,
            backgroundColor: config.color,
          }}
          data-testid={`time-bar-${timeOfDay}`}
        />
      </div>
      <span style={styles.timePercent}>{percentage}%</span>
    </div>
  )
}

/**
 * ChildActivitySummary - Activity summary for child dashboard
 *
 * Uses child-friendly language at 6th-grade reading level.
 */
export function ChildActivitySummary({
  screenshots,
  loading,
  onHelpClick,
}: ChildActivitySummaryProps) {
  // Track focus state for help link styling
  const [helpLinkFocused, setHelpLinkFocused] = useState(false)

  // Calculate activity summary from screenshots
  const summary = useMemo(() => calculateActivitySummary(screenshots), [screenshots])

  return (
    <div style={styles.container} data-testid="child-activity-summary">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header with title and help link */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <span style={styles.icon} aria-hidden="true">
            📊
          </span>
          <h3 style={styles.title}>Your Day in Review</h3>
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
          aria-label="Learn why you see this activity summary"
        >
          Why am I seeing this?
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={styles.loadingContainer} data-testid="summary-loading">
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Getting your activity...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && screenshots.length === 0 && (
        <div style={styles.emptyState} data-testid="summary-empty">
          <div style={styles.emptyIcon}>📷</div>
          <h4 style={styles.emptyTitle}>No activity yet!</h4>
          <p style={styles.emptyMessage}>
            When you use your device, your activity will show up here.
          </p>
        </div>
      )}

      {/* Activity content */}
      {!loading && screenshots.length > 0 && (
        <>
          {/* Stats grid - today and week counts */}
          <div style={styles.statsGrid} data-testid="stats-grid">
            <div style={styles.statCard} data-testid="stat-today">
              <p style={styles.statValue}>{summary.todayCount}</p>
              <p style={styles.statLabel}>Screenshots today</p>
            </div>
            <div style={styles.statCard} data-testid="stat-week">
              <p style={styles.statValue}>{summary.weekCount}</p>
              <p style={styles.statLabel}>Screenshots this week</p>
            </div>
          </div>

          {/* Top apps section */}
          <div style={styles.section} data-testid="top-apps-section">
            <h4 style={styles.sectionTitle}>Most Visited Sites</h4>
            {summary.topApps.length > 0 ? (
              <div style={styles.appList}>
                {summary.topApps.map((app, index) => (
                  <div key={app.domain} style={styles.appItem} data-testid={`app-item-${index}`}>
                    <p style={styles.appDomain}>{app.domain}</p>
                    <span style={styles.appCount}>
                      {app.count} {app.count === 1 ? 'time' : 'times'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={styles.noAppsMessage} data-testid="no-apps-message">
                No sites recorded yet
              </p>
            )}
          </div>

          {/* Time distribution section */}
          <div
            style={{ ...styles.section, ...styles.sectionLast }}
            data-testid="time-distribution-section"
          >
            <h4 style={styles.sectionTitle}>When You Were Online</h4>
            <div style={styles.timeDistribution}>
              <TimeDistributionBar
                timeOfDay="morning"
                count={summary.timeDistribution.morning}
                total={summary.timeDistribution.total}
              />
              <TimeDistributionBar
                timeOfDay="afternoon"
                count={summary.timeDistribution.afternoon}
                total={summary.timeDistribution.total}
              />
              <TimeDistributionBar
                timeOfDay="evening"
                count={summary.timeDistribution.evening}
                total={summary.timeDistribution.total}
              />
              <TimeDistributionBar
                timeOfDay="night"
                count={summary.timeDistribution.night}
                total={summary.timeDistribution.total}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
