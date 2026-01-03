'use client'

/**
 * LocationFeaturesNotification Component - Story 40.1
 *
 * Child-friendly notification when location features are enabled/disabled.
 *
 * Acceptance Criteria:
 * - AC3: Child Notification (child-friendly language)
 *
 * UI/UX Requirements:
 * - NFR65: 6th-grade reading level
 * - NFR43: Keyboard accessible
 * - NFR49: 44x44px minimum touch targets
 */

import { useState, useCallback } from 'react'

export type LocationNotificationType = 'location_features_enabled' | 'location_features_disabled'

export interface LocationFeaturesNotificationProps {
  /** Type of notification */
  type: LocationNotificationType
  /** When the notification was created */
  createdAt: Date
  /** Callback when notification is dismissed */
  onDismiss: () => void
  /** Whether dismiss is in progress */
  loading?: boolean
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  icon: {
    width: '40px',
    height: '40px',
    backgroundColor: '#dbeafe',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0,
  },
  iconDisabled: {
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  message: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: 0,
  },
  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px',
  },
  dismissButton: {
    minWidth: '44px',
    minHeight: '44px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  dismissButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}

export function LocationFeaturesNotification({
  type,
  createdAt,
  onDismiss,
  loading = false,
}: LocationFeaturesNotificationProps) {
  const [dismissed, setDismissed] = useState(false)

  const handleDismiss = useCallback(() => {
    if (!loading) {
      setDismissed(true)
      onDismiss()
    }
  }, [loading, onDismiss])

  // Format timestamp in child-friendly way
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Just now'
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    if (hours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const isEnabled = type === 'location_features_enabled'

  // Child-friendly message using 6th-grade reading level (NFR65)
  const title = isEnabled ? 'Location Features Are Now On' : 'Location Features Are Now Off'

  const message = isEnabled
    ? 'Your family turned on location features. This means your rules might change based on where you are (like at school or at home).'
    : 'Your family turned off location features. Your rules will stay the same no matter where you are.'

  if (dismissed) return null

  return (
    <div
      style={styles.container}
      role="article"
      aria-label={title}
      data-testid="location-features-notification"
    >
      <div style={styles.header}>
        <div
          style={{
            ...styles.icon,
            ...(isEnabled ? {} : styles.iconDisabled),
          }}
          aria-hidden="true"
        >
          {isEnabled ? '📍' : '📍'}
        </div>
        <div style={styles.content}>
          <h3 style={styles.title} data-testid="notification-title">
            {title}
          </h3>
          <p style={styles.message} data-testid="notification-message">
            {message}
          </p>
          <p style={styles.timestamp} data-testid="notification-timestamp">
            {formatTime(createdAt)}
          </p>
        </div>
      </div>
      <button
        style={{
          ...styles.dismissButton,
          ...(loading ? styles.dismissButtonDisabled : {}),
        }}
        onClick={handleDismiss}
        disabled={loading}
        data-testid="dismiss-button"
        aria-label="Got it, dismiss notification"
      >
        {loading ? 'Saving...' : 'Got It'}
      </button>
    </div>
  )
}

export default LocationFeaturesNotification
