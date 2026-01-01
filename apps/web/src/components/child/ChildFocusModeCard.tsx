'use client'

/**
 * ChildFocusModeCard Component - Story 33.5
 *
 * Child-friendly focus mode analytics display.
 * Shows the exact same data as parent dashboard (bilateral transparency).
 *
 * Acceptance Criteria:
 * - AC5: Positive framing & celebration
 * - AC6: Bilateral transparency (same data as parent)
 */

import {
  useFocusModeAnalytics,
  formatFocusDuration,
  getDayLabel,
  getTimeOfDayLabel,
} from '../../hooks/useFocusModeAnalytics'

interface ChildFocusModeCardProps {
  familyId: string | null
  childId: string | null
  onStartFocusMode?: () => void
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
    gap: '8px',
    marginBottom: '20px',
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
  statsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '20px',
  },
  statCard: {
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '12px',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#0ea5e9', // sky-500
    margin: 0,
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#0369a1', // sky-700
    margin: '4px 0 0 0',
  },
  statMessage: {
    fontSize: '0.75rem',
    color: '#0c4a6e', // sky-900
    margin: '8px 0 0 0',
    fontStyle: 'italic',
  },
  gridStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  smallStatCard: {
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '10px',
  },
  smallStatValue: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0ea5e9', // sky-500
    margin: 0,
  },
  smallStatLabel: {
    fontSize: '0.75rem',
    color: '#0369a1', // sky-700
    margin: '2px 0 0 0',
  },
  streakCard: {
    textAlign: 'center' as const,
    padding: '16px',
    backgroundColor: '#fef3c7', // amber-100
    borderRadius: '12px',
    marginBottom: '12px',
  },
  streakValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#92400e', // amber-800
    margin: 0,
  },
  streakLabel: {
    fontSize: '0.875rem',
    color: '#78350f', // amber-900
    margin: '4px 0 0 0',
  },
  peakTimesCard: {
    padding: '12px',
    backgroundColor: '#eff6ff', // blue-50
    borderRadius: '10px',
    marginBottom: '12px',
  },
  peakTimesTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1e40af', // blue-800
    margin: '0 0 4px 0',
  },
  peakTimesValue: {
    fontSize: '0.875rem',
    color: '#1e40af', // blue-800
    margin: 0,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px 16px',
    backgroundColor: '#f0fdf4', // green-50
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '2.5rem',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#166534', // green-800
    margin: '0 0 4px 0',
  },
  emptyMessage: {
    fontSize: '0.875rem',
    color: '#15803d', // green-700
    margin: '0 0 12px 0',
  },
  startButton: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#16a34a', // green-600
    color: '#ffffff',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
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
  completionBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '16px',
    marginTop: '8px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
}

/**
 * Get child-friendly encouragement message
 */
function getSessionMessage(count: number): string {
  if (count === 0) return "Let's start focusing!"
  if (count === 1) return 'Great first session!'
  if (count < 5) return 'Building great habits!'
  if (count < 10) return "You're on a roll!"
  return 'Amazing dedication!'
}

/**
 * Get completion badge styles based on rate
 */
function getCompletionBadgeStyles(rate: number): { bg: string; text: string; emoji: string } {
  if (rate >= 90) return { bg: '#dcfce7', text: '#166534', emoji: '🌟' }
  if (rate >= 70) return { bg: '#dcfce7', text: '#166534', emoji: '✨' }
  if (rate >= 50) return { bg: '#fef9c3', text: '#854d0e', emoji: '💪' }
  if (rate > 0) return { bg: '#dbeafe', text: '#1e40af', emoji: '🎯' }
  return { bg: '#f3f4f6', text: '#4b5563', emoji: '🎯' }
}

/**
 * Get completion message
 */
function getCompletionMessage(rate: number): string {
  if (rate >= 90) return 'Super focused!'
  if (rate >= 70) return 'Great job!'
  if (rate >= 50) return 'Keep going!'
  if (rate > 0) return 'Every session counts!'
  return 'Start focusing!'
}

/**
 * Main ChildFocusModeCard component
 */
export function ChildFocusModeCard({
  familyId,
  childId,
  onStartFocusMode,
}: ChildFocusModeCardProps) {
  const { data, loading, error } = useFocusModeAnalytics({
    familyId,
    childId,
    enabled: !!familyId && !!childId,
  })

  return (
    <div style={styles.container} data-testid="child-focus-mode-card">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <span style={styles.icon} aria-hidden="true">
          🎯
        </span>
        <h3 style={styles.title}>Your Focus Mode</h3>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={styles.loadingContainer} data-testid="loading-state">
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading your focus stats...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={styles.emptyState} data-testid="error-state">
          <div style={styles.emptyIcon}>😅</div>
          <h4 style={styles.emptyTitle}>Oops!</h4>
          <p style={styles.emptyMessage}>We couldn&apos;t load your focus stats.</p>
        </div>
      )}

      {/* Empty state - same data as parent sees (AC6) */}
      {!loading && !error && (!data || data.weeklySessionCount === 0) && (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon}>🎯</div>
          <h4 style={styles.emptyTitle}>Ready to Focus?</h4>
          <p style={styles.emptyMessage}>
            Start using focus mode to see your stats here! You&apos;ll be able to track your
            sessions and see how you&apos;re doing.
          </p>
          {onStartFocusMode && (
            <button
              style={styles.startButton}
              onClick={onStartFocusMode}
              data-testid="start-focus-button"
            >
              Start Focus Session
            </button>
          )}
        </div>
      )}

      {/* Content when data exists - same data as parent (AC6) */}
      {!loading && !error && data && data.weeklySessionCount > 0 && (
        <>
          {/* Sessions this week */}
          <div style={styles.statCard} data-testid="sessions-stat">
            <p style={styles.statValue}>{data.weeklySessionCount}</p>
            <p style={styles.statLabel}>focus sessions this week</p>
            <p style={styles.statMessage}>{getSessionMessage(data.weeklySessionCount)}</p>
          </div>

          <div style={styles.statsSection}>
            {/* Grid stats - same data as parent (AC6) */}
            <div style={styles.gridStats}>
              <div style={styles.smallStatCard} data-testid="avg-duration-stat">
                <p style={styles.smallStatValue}>
                  {formatFocusDuration(data.weeklyAverageMinutes)}
                </p>
                <p style={styles.smallStatLabel}>avg per session</p>
              </div>
              <div style={styles.smallStatCard} data-testid="total-time-stat">
                <p style={styles.smallStatValue}>{formatFocusDuration(data.weeklyTotalMinutes)}</p>
                <p style={styles.smallStatLabel}>total this week</p>
              </div>
            </div>

            {/* Completion rate - positive framing (AC5) */}
            <div style={styles.smallStatCard} data-testid="completion-stat">
              <p style={styles.smallStatValue}>{data.weeklyCompletionRate}%</p>
              <p style={styles.smallStatLabel}>completed</p>
              {(() => {
                const badgeStyles = getCompletionBadgeStyles(data.weeklyCompletionRate)
                return (
                  <div
                    style={{
                      ...styles.completionBadge,
                      backgroundColor: badgeStyles.bg,
                      color: badgeStyles.text,
                    }}
                    data-testid="completion-badge"
                  >
                    <span aria-hidden="true">{badgeStyles.emoji}</span>
                    <span>{getCompletionMessage(data.weeklyCompletionRate)}</span>
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Streak - same data as parent (AC6) */}
          {data.currentStreak > 0 && (
            <div style={styles.streakCard} data-testid="streak-stat">
              <p style={styles.streakValue}>
                {data.currentStreak >= 7 ? '🔥' : '⚡'} {data.currentStreak} days
              </p>
              <p style={styles.streakLabel}>
                {data.currentStreak >= 7 ? 'Amazing streak!' : 'Keep it going!'}
              </p>
            </div>
          )}

          {/* Peak times - same data as parent (AC6) */}
          {(data.peakTimeOfDay || data.peakDays.length > 0) && (
            <div style={styles.peakTimesCard} data-testid="peak-times-stat">
              <p style={styles.peakTimesTitle}>🕐 Your Best Focus Times</p>
              {data.peakTimeOfDay && (
                <p style={styles.peakTimesValue}>{getTimeOfDayLabel(data.peakTimeOfDay)}</p>
              )}
              {data.peakDays.length > 0 && (
                <p style={{ ...styles.peakTimesValue, fontSize: '0.75rem', marginTop: '2px' }}>
                  Best days: {data.peakDays.map((d) => getDayLabel(d)).join(', ')}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
