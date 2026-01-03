/**
 * CaregiverSummaryCard Component
 *
 * Story 39.6: Caregiver Action Logging - AC3
 *
 * Displays a summary of caregiver activity in a card format:
 * "Grandma: 2 time extensions, 1 flag viewed"
 *
 * Shows:
 * - Caregiver name
 * - Action counts by type
 * - Last active time
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import type { CaregiverActivitySummary } from '@fledgely/shared'
import { formatActivitySummary } from '../../services/caregiverActivityService'

export interface CaregiverSummaryCardProps {
  /** The caregiver activity summary to display */
  summary: CaregiverActivitySummary
  /** Optional click handler for the card */
  onClick?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'default',
  },
  cardClickable: {
    cursor: 'pointer',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1d4ed8',
    flexShrink: 0,
  },
  nameContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  lastActive: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: 0,
  },
  summaryText: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.4,
  },
  statsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '10px',
  },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    padding: '3px 6px',
    borderRadius: '4px',
  },
  statIcon: {
    fontSize: '10px',
  },
  statTimeExtension: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  statFlagViewed: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statFlagReviewed: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statPermission: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  noActivity: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
    fontStyle: 'italic',
  },
}

/** Get initials from caregiver name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Format relative time for last active */
function formatLastActive(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Active now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function CaregiverSummaryCard({ summary, onClick }: CaregiverSummaryCardProps) {
  const hasActivity = summary.totalActions > 0
  const cardStyle = onClick ? { ...styles.card, ...styles.cardClickable } : styles.card

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      data-testid="caregiver-summary-card"
      data-caregiver-uid={summary.caregiverUid}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {/* Header with avatar and name */}
      <div style={styles.header}>
        <div style={styles.avatar} aria-hidden="true">
          {getInitials(summary.caregiverName)}
        </div>
        <div style={styles.nameContainer}>
          <p style={styles.name}>{summary.caregiverName}</p>
          {hasActivity && <p style={styles.lastActive}>{formatLastActive(summary.lastActiveAt)}</p>}
        </div>
      </div>

      {/* Activity summary or no activity message */}
      {hasActivity ? (
        <>
          <p style={styles.summaryText} data-testid="summary-text">
            {formatActivitySummary(summary).replace(`${summary.caregiverName}: `, '')}
          </p>

          {/* Stats badges */}
          <div style={styles.statsGrid} data-testid="stats-grid">
            {summary.actionCounts.time_extension > 0 && (
              <span
                style={{ ...styles.statBadge, ...styles.statTimeExtension }}
                data-testid="stat-time-extension"
              >
                <span style={styles.statIcon}>⏰</span>
                {summary.actionCounts.time_extension}
              </span>
            )}
            {summary.actionCounts.flag_viewed > 0 && (
              <span
                style={{ ...styles.statBadge, ...styles.statFlagViewed }}
                data-testid="stat-flag-viewed"
              >
                <span style={styles.statIcon}>👁️</span>
                {summary.actionCounts.flag_viewed}
              </span>
            )}
            {summary.actionCounts.flag_marked_reviewed > 0 && (
              <span
                style={{ ...styles.statBadge, ...styles.statFlagReviewed }}
                data-testid="stat-flag-reviewed"
              >
                <span style={styles.statIcon}>✅</span>
                {summary.actionCounts.flag_marked_reviewed}
              </span>
            )}
            {summary.actionCounts.permission_change > 0 && (
              <span
                style={{ ...styles.statBadge, ...styles.statPermission }}
                data-testid="stat-permission"
              >
                <span style={styles.statIcon}>🔐</span>
                {summary.actionCounts.permission_change}
              </span>
            )}
          </div>
        </>
      ) : (
        <p style={styles.noActivity}>No recent activity</p>
      )}
    </div>
  )
}

export default CaregiverSummaryCard
