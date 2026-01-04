'use client'

/**
 * BreachBanner Component
 *
 * Story 51.6: Breach Notification - AC3
 *
 * Dismissible banner shown on login when a user is affected by a breach.
 * Part of multi-channel notification (email + in-app).
 *
 * Requirements:
 * - AC3: In-app banner shown on login
 */

import { useState, useEffect, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import {
  AffectedDataTypeLabels,
  type AffectedDataTypeValue,
  type BreachSeverityValue,
  getSeverityColor,
} from '@fledgely/shared'

interface BreachNotificationData {
  notificationId: string
  incidentId: string
  incidentTitle: string
  severity: BreachSeverityValue
  affectedDataTypes: AffectedDataTypeValue[]
  occurredAt: number
  bannerDismissed: boolean
}

interface GetUserBreachNotificationsResponse {
  notifications: BreachNotificationData[]
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: 'relative' as const,
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '16px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  content: {
    flex: 1,
  },
  icon: {
    fontSize: '20px',
    marginRight: '8px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: '14px',
    margin: 0,
    marginBottom: '12px',
    opacity: 0.9,
  },
  dataList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '12px',
  },
  dataTag: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  learnMoreButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid currentColor',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    transition: 'all 0.15s ease',
  },
  dismissButton: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    padding: '4px 8px',
    fontSize: '12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transition: 'background-color 0.15s ease',
  },
  severityBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: '8px',
    textTransform: 'uppercase' as const,
  },
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface BreachBannerItemProps {
  notification: BreachNotificationData
  onDismiss: (notificationId: string) => void
}

function BreachBannerItem({ notification, onDismiss }: BreachBannerItemProps) {
  const severityColors = getSeverityColor(notification.severity)

  const bannerStyle: React.CSSProperties = {
    ...styles.banner,
    backgroundColor: severityColors.bg,
    color: severityColors.text,
    border: `1px solid ${severityColors.border}`,
  }

  return (
    <div style={bannerStyle} role="alert" aria-live="polite">
      <button
        type="button"
        style={{
          ...styles.dismissButton,
          color: severityColors.text,
        }}
        onClick={() => onDismiss(notification.notificationId)}
        aria-label="Dismiss this notification"
      >
        Dismiss
      </button>

      <div style={styles.header}>
        <div style={styles.content}>
          <h3 style={styles.title}>
            <span style={styles.icon} aria-hidden="true">
              &#9888;
            </span>
            Security Notice
            <span
              style={{
                ...styles.severityBadge,
                backgroundColor: severityColors.border,
                color: severityColors.text,
              }}
            >
              {notification.severity}
            </span>
          </h3>
          <p style={styles.subtitle}>
            <strong>{notification.incidentTitle}</strong>
            {' - '}
            {formatDate(notification.occurredAt)}
          </p>

          <div style={styles.dataList}>
            <span style={{ fontSize: '13px', marginRight: '4px' }}>Affected data:</span>
            {notification.affectedDataTypes.map((type) => (
              <span key={type} style={styles.dataTag}>
                {AffectedDataTypeLabels[type] || type}
              </span>
            ))}
          </div>

          <p style={{ fontSize: '13px', margin: 0 }}>
            Please check your email for detailed information and recommended actions.
          </p>
        </div>
      </div>
    </div>
  )
}

export interface BreachBannerProps {
  /** Optional callback when a notification is dismissed */
  onDismiss?: (notificationId: string) => void
}

export function BreachBanner({ onDismiss }: BreachBannerProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<BreachNotificationData[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      setLoading(false)
      return
    }

    try {
      const functions = getFirebaseFunctions()
      const getUserBreachNotificationsFn = httpsCallable<
        Record<string, never>,
        GetUserBreachNotificationsResponse
      >(functions, 'getUserBreachNotifications')

      const result = await getUserBreachNotificationsFn({})
      const undismissed = result.data.notifications.filter((n) => !n.bannerDismissed)
      setNotifications(undismissed)
    } catch (err) {
      console.error('[Breach Banner] Failed to fetch notifications', err)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleDismiss = useCallback(
    async (notificationId: string) => {
      try {
        const functions = getFirebaseFunctions()
        const dismissBreachBannerFn = httpsCallable<
          { notificationId: string },
          { success: boolean }
        >(functions, 'dismissBreachBanner')

        await dismissBreachBannerFn({ notificationId })

        // Remove from local state
        setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId))

        onDismiss?.(notificationId)
      } catch (err) {
        console.error('[Breach Banner] Failed to dismiss notification', err)
      }
    },
    [onDismiss]
  )

  if (loading || notifications.length === 0) {
    return null
  }

  return (
    <div>
      {notifications.map((notification) => (
        <BreachBannerItem
          key={notification.notificationId}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}
    </div>
  )
}

export default BreachBanner
