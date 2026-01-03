/**
 * CaregiverActivityRow Component
 *
 * Story 39.6: Caregiver Action Logging - AC2
 *
 * Displays a single caregiver activity log entry showing:
 * - Who performed the action (caregiver name)
 * - What action was taken
 * - Who it affected (child name if applicable)
 * - When it happened
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import type { CaregiverAuditLog } from '@fledgely/shared'
import { formatActivityDescription } from '../../services/caregiverActivityService'

export interface CaregiverActivityRowProps {
  /** The activity log entry to display */
  log: CaregiverAuditLog
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    gap: '12px',
  },
  icon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  iconTimeExtension: {
    backgroundColor: '#dbeafe',
  },
  iconFlagViewed: {
    backgroundColor: '#fef3c7',
  },
  iconFlagReviewed: {
    backgroundColor: '#d1fae5',
  },
  iconPermission: {
    backgroundColor: '#e5e7eb',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    fontSize: '14px',
    color: '#1f2937',
    margin: 0,
    marginBottom: '2px',
  },
  meta: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  actionBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  badgeTimeExtension: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  badgeFlagViewed: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeFlagReviewed: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  badgePermission: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
}

/** Get icon for action type */
function getActionIcon(action: CaregiverAuditLog['action']): string {
  switch (action) {
    case 'time_extension':
      return '⏰'
    case 'flag_viewed':
      return '👁️'
    case 'flag_marked_reviewed':
      return '✅'
    case 'permission_change':
      return '🔐'
    default:
      return '📋'
  }
}

/** Get icon style for action type */
function getIconStyle(action: CaregiverAuditLog['action']): React.CSSProperties {
  switch (action) {
    case 'time_extension':
      return { ...styles.icon, ...styles.iconTimeExtension }
    case 'flag_viewed':
      return { ...styles.icon, ...styles.iconFlagViewed }
    case 'flag_marked_reviewed':
      return { ...styles.icon, ...styles.iconFlagReviewed }
    case 'permission_change':
      return { ...styles.icon, ...styles.iconPermission }
    default:
      return styles.icon
  }
}

/** Get badge label for action type */
function getActionBadgeLabel(action: CaregiverAuditLog['action']): string {
  switch (action) {
    case 'time_extension':
      return 'Time'
    case 'flag_viewed':
      return 'Viewed'
    case 'flag_marked_reviewed':
      return 'Reviewed'
    case 'permission_change':
      return 'Access'
    default:
      return 'Action'
  }
}

/** Get badge style for action type */
function getBadgeStyle(action: CaregiverAuditLog['action']): React.CSSProperties {
  switch (action) {
    case 'time_extension':
      return { ...styles.actionBadge, ...styles.badgeTimeExtension }
    case 'flag_viewed':
      return { ...styles.actionBadge, ...styles.badgeFlagViewed }
    case 'flag_marked_reviewed':
      return { ...styles.actionBadge, ...styles.badgeFlagReviewed }
    case 'permission_change':
      return { ...styles.actionBadge, ...styles.badgePermission }
    default:
      return styles.actionBadge
  }
}

/** Format relative time for display */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function CaregiverActivityRow({ log }: CaregiverActivityRowProps) {
  const description = formatActivityDescription(log)

  return (
    <div
      style={styles.row}
      data-testid="activity-row"
      data-log-id={log.id}
      data-action={log.action}
    >
      <div style={getIconStyle(log.action)} aria-hidden="true">
        {getActionIcon(log.action)}
      </div>
      <div style={styles.content}>
        <p style={styles.description}>{description}</p>
        <p style={styles.meta}>{formatRelativeTime(log.createdAt)}</p>
      </div>
      <span style={getBadgeStyle(log.action)} data-testid="action-badge">
        {getActionBadgeLabel(log.action)}
      </span>
    </div>
  )
}

export default CaregiverActivityRow
