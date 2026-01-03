/**
 * ChildCaregiverActivityView Component
 *
 * Story 39.6: Caregiver Action Logging - AC4
 *
 * Child transparency view showing what caregivers have done.
 * Uses child-friendly language at 6th-grade reading level (NFR65).
 *
 * Shows children what their caregivers did on their behalf:
 * - Extended screen time
 * - Looked at flagged items
 * - Marked things as reviewed
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useEffect, useState } from 'react'
import type { CaregiverAuditLog } from '@fledgely/shared'
import {
  getActivityForChild,
  formatActivityForChild,
} from '../../services/caregiverActivityService'

export interface ChildCaregiverActivityViewProps {
  /** Family ID */
  familyId: string
  /** Child UID to show activity for */
  childUid: string
  /** Maximum number of entries to show (default: 10) */
  limit?: number
  /** Show loading state */
  loading?: boolean
  /** Error message to display */
  error?: string | null
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '2px 0 0 0',
  },
  list: {
    padding: 0,
    margin: 0,
    listStyle: 'none',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #f3f4f6',
    gap: '12px',
  },
  rowLast: {
    borderBottom: 'none',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
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
    lineHeight: 1.4,
  },
  time: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '4px 0 0 0',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    maxWidth: '280px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  loadingContainer: {
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  errorContainer: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    fontSize: '14px',
    margin: '16px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
}

/** Get icon for action type */
function getActionIcon(action: CaregiverAuditLog['action']): string {
  switch (action) {
    case 'time_extension':
      return '⏰'
    case 'flag_viewed':
      return '👀'
    case 'flag_marked_reviewed':
      return '✅'
    case 'permission_change':
      return '🔑'
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

/** Format time in child-friendly way */
function formatTimeForChild(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function ChildCaregiverActivityView({
  familyId,
  childUid,
  limit = 10,
  loading: externalLoading = false,
  error: externalError = null,
}: ChildCaregiverActivityViewProps) {
  const [logs, setLogs] = useState<CaregiverAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getActivityForChild(familyId, childUid, limit)
        setLogs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load activity')
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [familyId, childUid, limit])

  const isLoading = loading || externalLoading
  const displayError = error || externalError

  return (
    <div style={styles.container} data-testid="child-activity-view">
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon} aria-hidden="true">
          👥
        </span>
        <div style={styles.headerContent}>
          <h3 style={styles.title}>What Your Caregivers Did</h3>
          <p style={styles.subtitle}>See what helpers did for you</p>
        </div>
      </div>

      {/* Error State */}
      {displayError && (
        <div style={styles.errorContainer} role="alert" data-testid="error-message">
          {displayError}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={styles.loadingContainer} data-testid="loading-state">
          <p style={styles.loadingText}>Loading...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !displayError && logs.length === 0 && (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon} aria-hidden="true">
            🌟
          </div>
          <h4 style={styles.emptyTitle}>Nothing yet!</h4>
          <p style={styles.emptyText}>
            When your caregivers do things to help you, you will see them here.
          </p>
        </div>
      )}

      {/* Activity List */}
      {!isLoading && !displayError && logs.length > 0 && (
        <ul style={styles.list} data-testid="activity-list">
          {logs.map((log, index) => {
            const isLast = index === logs.length - 1
            const rowStyle = isLast ? { ...styles.row, ...styles.rowLast } : styles.row

            return (
              <li key={log.id} style={rowStyle} data-testid="activity-item">
                <div style={getIconStyle(log.action)} aria-hidden="true">
                  {getActionIcon(log.action)}
                </div>
                <div style={styles.content}>
                  <p style={styles.description}>{formatActivityForChild(log)}</p>
                  <p style={styles.time}>{formatTimeForChild(log.createdAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ChildCaregiverActivityView
