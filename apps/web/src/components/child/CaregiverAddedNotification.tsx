/**
 * CaregiverAddedNotification Component - Story 39.1 Task 5
 *
 * Displays notification to child when a new caregiver joins the family.
 * Shows caregiver name and relationship in friendly language.
 *
 * AC4: Child Notification
 * - Child receives notification about new caregiver
 * - Notification uses relationship: "Grandma has been added as a caregiver"
 * - Notification visible in child's dashboard
 * - Notification auto-dismisses after viewing
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useCallback } from 'react'
import type { CaregiverRelationship } from '@fledgely/shared/contracts'

export interface CaregiverAddedNotificationData {
  id: string
  type: 'caregiver_added'
  caregiverUid: string
  caregiverName: string
  caregiverRelationship: CaregiverRelationship
  customRelationship: string | null
  message: string
  createdAt: Date
  read: boolean
}

export interface CaregiverAddedNotificationProps {
  notification: CaregiverAddedNotificationData
  onDismiss?: (notificationId: string) => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f0fdf4', // green-50
    border: '1px solid #86efac', // green-300
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
    color: '#166534', // green-800
    margin: '0 0 4px 0',
  },
  message: {
    fontSize: '14px',
    color: '#15803d', // green-700
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
    color: '#15803d',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  },
  time: {
    fontSize: '12px',
    color: '#4ade80', // green-400
    marginTop: '8px',
  },
}

/** Format relationship for display */
function formatRelationship(
  relationship: CaregiverRelationship,
  customRelationship: string | null
): string {
  if (relationship === 'other' && customRelationship) {
    return customRelationship
  }
  const labels: Record<CaregiverRelationship, string> = {
    grandparent: 'Grandparent',
    aunt_uncle: 'Aunt/Uncle',
    babysitter: 'Babysitter',
    other: customRelationship || 'Caregiver',
  }
  return labels[relationship] || 'Caregiver'
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

export function CaregiverAddedNotification({
  notification,
  onDismiss,
}: CaregiverAddedNotificationProps) {
  const handleDismiss = useCallback(() => {
    if (onDismiss) {
      onDismiss(notification.id)
    }
  }, [notification.id, onDismiss])

  const relationshipLabel = formatRelationship(
    notification.caregiverRelationship,
    notification.customRelationship
  )

  return (
    <div
      data-testid="caregiver-added-notification"
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
          New Caregiver Added
        </h3>
        <p style={styles.message} data-testid="notification-message">
          {notification.caregiverName} ({relationshipLabel}) can now see your status
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

export default CaregiverAddedNotification
