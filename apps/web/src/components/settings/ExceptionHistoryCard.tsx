/**
 * ExceptionHistoryCard Component - Story 32.5 AC6
 *
 * Displays history of offline time exceptions for transparency.
 * Shows all exceptions logged with timestamp, visible to all family members.
 *
 * Features:
 * - Chronological list of exceptions (newest first)
 * - Exception type badges (pause, skip, work, homework)
 * - Who created/approved the exception
 * - Duration and status
 * - Child-friendly or parent view based on context
 */

'use client'

import type { OfflineException } from '@fledgely/shared'
import { OFFLINE_EXCEPTION_MESSAGES } from '@fledgely/shared'

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #f3f4f6',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    backgroundColor: '#eff6ff',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  content: {
    padding: '16px 24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '32px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  exceptionRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  exceptionRowLast: {
    borderBottom: 'none',
  },
  exceptionIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  exceptionContent: {
    flex: 1,
    minWidth: 0,
  },
  exceptionMessage: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  exceptionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: '#6b7280',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 500,
  },
  badgePause: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  badgeSkip: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  badgeWork: {
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
  },
  badgeHomework: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusCompleted: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '32px',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

const EXCEPTION_ICONS: Record<string, string> = {
  pause: '⏸️',
  skip: '⏭️',
  work: '💼',
  homework: '📚',
}

const EXCEPTION_COLORS: Record<string, React.CSSProperties> = {
  pause: { backgroundColor: '#fef3c7' },
  skip: { backgroundColor: '#dbeafe' },
  work: { backgroundColor: '#ede9fe' },
  homework: { backgroundColor: '#d1fae5' },
}

interface ExceptionHistoryCardProps {
  /** List of exceptions to display */
  exceptions: OfflineException[]
  /** Loading state */
  loading?: boolean
  /** Whether to use child-friendly language */
  isChildView?: boolean
  /** Maximum number of exceptions to show */
  limit?: number
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Get display message for an exception
 */
function getExceptionMessage(exception: OfflineException, isChildView: boolean): string {
  const name = exception.requestedByName || 'Parent'

  if (isChildView) {
    switch (exception.type) {
      case 'pause':
        return exception.status === 'active'
          ? OFFLINE_EXCEPTION_MESSAGES.childPauseMessage
          : `${name} resumed offline time`
      case 'skip':
        return OFFLINE_EXCEPTION_MESSAGES.childSkipMessage
      case 'work':
        return OFFLINE_EXCEPTION_MESSAGES.childWorkMessage(name)
      case 'homework':
        return exception.status === 'active'
          ? OFFLINE_EXCEPTION_MESSAGES.childHomeworkActive
          : 'Homework time ended'
      default:
        return 'Exception created'
    }
  }

  switch (exception.type) {
    case 'pause':
      return exception.status === 'active'
        ? OFFLINE_EXCEPTION_MESSAGES.pauseStarted(name)
        : OFFLINE_EXCEPTION_MESSAGES.pauseEnded(name)
    case 'skip':
      return OFFLINE_EXCEPTION_MESSAGES.skipActivated(name)
    case 'work':
      return OFFLINE_EXCEPTION_MESSAGES.workExceptionStarted(name)
    case 'homework':
      if (exception.approvedBy) {
        return `Homework approved for ${exception.requestedByName || 'child'}`
      }
      return OFFLINE_EXCEPTION_MESSAGES.homeworkRequested(name)
    default:
      return `${name} created an exception`
  }
}

/**
 * Get badge style based on exception type
 */
function getTypeBadgeStyle(type: string): React.CSSProperties {
  switch (type) {
    case 'pause':
      return styles.badgePause
    case 'skip':
      return styles.badgeSkip
    case 'work':
      return styles.badgeWork
    case 'homework':
      return styles.badgeHomework
    default:
      return styles.badgePause
  }
}

/**
 * Get status badge style
 */
function getStatusBadgeStyle(status: string): React.CSSProperties {
  switch (status) {
    case 'active':
      return styles.statusActive
    case 'completed':
      return styles.statusCompleted
    case 'cancelled':
      return styles.statusCancelled
    default:
      return styles.statusCompleted
  }
}

export function ExceptionHistoryCard({
  exceptions,
  loading = false,
  isChildView = false,
  limit = 10,
}: ExceptionHistoryCardProps) {
  const displayExceptions = exceptions.slice(0, limit)

  return (
    <div style={styles.card} data-testid="exception-history-card">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.icon}>📋</div>
          <div>
            <div style={styles.title}>
              {isChildView ? 'Exception History' : 'Offline Time Exceptions'}
            </div>
            <div style={styles.subtitle}>
              {isChildView
                ? 'Times when offline time was changed'
                : 'All exceptions are logged for transparency'}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner} />
          </div>
        ) : displayExceptions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>✅</div>
            <div style={styles.emptyText}>
              {isChildView
                ? 'No changes to offline time yet'
                : 'No exceptions have been created yet'}
            </div>
          </div>
        ) : (
          displayExceptions.map((exception, index) => (
            <div
              key={exception.id}
              style={{
                ...styles.exceptionRow,
                ...(index === displayExceptions.length - 1 ? styles.exceptionRowLast : {}),
              }}
              data-testid={`exception-row-${exception.id}`}
            >
              <div
                style={{
                  ...styles.exceptionIcon,
                  ...EXCEPTION_COLORS[exception.type],
                }}
              >
                {EXCEPTION_ICONS[exception.type] || '📝'}
              </div>

              <div style={styles.exceptionContent}>
                <div style={styles.exceptionMessage}>
                  {getExceptionMessage(exception, isChildView)}
                </div>
                <div style={styles.exceptionMeta}>
                  <span style={{ ...styles.badge, ...getTypeBadgeStyle(exception.type) }}>
                    {exception.type === 'pause'
                      ? 'Pause'
                      : exception.type === 'skip'
                        ? 'Skip'
                        : exception.type === 'work'
                          ? 'Work'
                          : exception.type === 'homework'
                            ? 'Homework'
                            : exception.type}
                  </span>
                  <span style={{ ...styles.badge, ...getStatusBadgeStyle(exception.status) }}>
                    {exception.status === 'active'
                      ? 'Active'
                      : exception.status === 'completed'
                        ? 'Ended'
                        : 'Cancelled'}
                  </span>
                  <span>{formatDate(exception.createdAt)}</span>
                  {exception.reason && <span>• {exception.reason}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ExceptionHistoryCard
