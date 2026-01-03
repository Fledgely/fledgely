/**
 * CaregiverRemovedNotification Component - Story 39.7 Task 1
 *
 * Displays notification to child when a caregiver is removed from the family.
 * Uses child-friendly language at 6th-grade reading level (NFR65).
 *
 * AC3: Child Notification
 * - Child notified: "Grandma is no longer a caregiver"
 * - Notification uses child-friendly language
 * - Notification appears in child's activity feed
 * - Dismissible after reading
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useCallback } from 'react'

export interface CaregiverRemovedNotificationData {
  id: string
  type: 'caregiver_removed'
  caregiverName: string
  message?: string
  createdAt: Date
  read: boolean
}

export interface CaregiverRemovedNotificationProps {
  notification: CaregiverRemovedNotificationData
  onDismiss?: (notificationId: string) => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f8fafc', // slate-50
    border: '1px solid #cbd5e1', // slate-300
    borderRadius: '12px',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '24px',
    lineHeight: 1,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#334155', // slate-700
    margin: '0 0 4px 0',
  },
  message: {
    fontSize: '14px',
    color: '#475569', // slate-600
    margin: 0,
    lineHeight: 1.5,
  },
  dismissButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#64748b', // slate-500
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  },
  time: {
    fontSize: '12px',
    color: '#94a3b8', // slate-400
    marginTop: '8px',
  },
}

/** Format relative time for display */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/**
 * Generate child-friendly message for caregiver removal.
 * Uses 6th-grade reading level per NFR65.
 */
function getChildFriendlyMessage(caregiverName: string): string {
  return `${caregiverName} is no longer a caregiver`
}

export function CaregiverRemovedNotification({
  notification,
  onDismiss,
}: CaregiverRemovedNotificationProps) {
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss(notification.id)
    }
  }, [notification.id, onDismiss])

  const displayMessage = notification.message || getChildFriendlyMessage(notification.caregiverName)

  return (
    <div
      data-testid="caregiver-removed-notification"
      data-notification-id={notification.id}
      style={styles.container}
      role="alert"
      aria-live="polite"
    >
      <span style={styles.icon} aria-hidden="true">
        👋
      </span>
      <div style={styles.content}>
        <h3 style={styles.title} data-testid="notification-title">
          Caregiver Update
        </h3>
        <p style={styles.message} data-testid="notification-message">
          {displayMessage}
        </p>
        <p style={styles.time} data-testid="notification-time">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          style={styles.dismissButton}
          data-testid="dismiss-button"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default CaregiverRemovedNotification
