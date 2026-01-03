/**
 * CaregiverExtensionNotification Component - Story 39.4 Task 6
 *
 * Displays notification to child when a caregiver grants extra screen time.
 * Shows caregiver name, extension amount, and new time balance.
 *
 * AC6: Child Notification
 * - Child receives notification when extension is granted
 * - Notification shows who granted and how much time
 * - Notification visible in child's dashboard
 * - Notification auto-dismisses after viewing
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useCallback } from 'react'

export interface CaregiverExtensionNotificationData {
  id: string
  type: 'caregiver_extension'
  caregiverUid: string
  caregiverName: string
  extensionMinutes: number
  newTimeBalanceMinutes: number
  message: string
  createdAt: Date
  read: boolean
}

export interface CaregiverExtensionNotificationProps {
  notification: CaregiverExtensionNotificationData
  onDismiss?: (notificationId: string) => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#dbeafe', // blue-100
    border: '1px solid #93c5fd', // blue-300
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
    color: '#1e40af', // blue-800
    margin: '0 0 4px 0',
  },
  message: {
    fontSize: '14px',
    color: '#1d4ed8', // blue-700
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
    color: '#1d4ed8',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  },
  time: {
    fontSize: '12px',
    color: '#60a5fa', // blue-400
    marginTop: '8px',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#2563eb', // blue-600
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
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

/** Format minutes as friendly time string */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${hours}h ${remainingMinutes}m`
}

export function CaregiverExtensionNotification({
  notification,
  onDismiss,
}: CaregiverExtensionNotificationProps) {
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss(notification.id)
    }
  }, [notification.id, onDismiss])

  return (
    <div
      data-testid="caregiver-extension-notification"
      data-notification-id={notification.id}
      style={styles.container}
      role="alert"
      aria-live="polite"
    >
      <span style={styles.icon} aria-hidden="true">
        ⏰
      </span>
      <div style={styles.content}>
        <h3 style={styles.title} data-testid="notification-title">
          Extra Time Granted!
        </h3>
        <p style={styles.message} data-testid="notification-message">
          {notification.caregiverName} gave you {formatMinutes(notification.extensionMinutes)} more
          screen time
        </p>
        <span style={styles.badge} data-testid="new-balance-badge">
          You now have {formatMinutes(notification.newTimeBalanceMinutes)}
        </span>
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

export default CaregiverExtensionNotification
